import { execFile } from 'node:child_process';
import { readFile, readlink, realpath, stat } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { scanWorkspace as systemScan, parsePs, parseProcStat, parseLsof, pathBelongsToWorkspace, isInfrastructureProcess, redactCommand } from '../monitor/index.mjs';

const activeStops = new Set();
const GONE = new Set(['ENOENT', 'ESRCH']);

/** Stable, sanitized failures for Host adapters; OS command lines never escape. */
export class ProcessControlError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ProcessControlError';
    this.code = `workspace-monitor/${code}`;
  }
}

const refused = (code, message) => { throw new ProcessControlError(code, message); };
const checkAbort = signal => signal?.throwIfAborted();
const positivePid = pid => Number.isSafeInteger(pid) && pid > 1;
const sameStart = (a, b) => Number.isFinite(a) && Number.isFinite(b) && a === b;

function run(file, args, { signal, allowEmpty = false } = {}) {
  checkAbort(signal);
  return new Promise((resolve, reject) => {
    execFile(file, args, {
      encoding: 'utf8', timeout: 4000, maxBuffer: 1024 * 1024, signal,
      env: { ...process.env, LC_ALL: 'C', LANG: 'C' },
    }, (error, stdout = '') => {
      if (!error || allowEmpty && error.code === 1 && !stdout.trim()) resolve(stdout);
      else reject(error);
    });
  });
}

function currentMacProcess(output) {
  const row = parsePs(output)[0];
  if (!row) return null;
  const stateAndCommand = row.command.match(/^(\S+)\s+(.+)$/);
  if (!stateAndCommand) return null;
  return { ...row, state: stateAndCommand[1], command: stateAndCommand[2] };
}

/**
 * Read one PID twice around cwd/argv inspection. This avoids carrying a PID's
 * old metadata into a signal. process.kill is still a PID API, not a pidfd API;
 * revalidation cannot make the final read-and-signal interval atomic.
 */
export function createIdentityReader({ platform = process.platform } = {}) {
  let linuxClock;
  async function clock(signal) {
    if (!linuxClock) {
      const [systemStat, ticks] = await Promise.all([
        readFile('/proc/stat', { encoding: 'utf8', signal }),
        run('getconf', ['CLK_TCK'], { signal }),
      ]);
      const bootTime = Number(systemStat.match(/^btime\s+(\d+)/m)?.[1]);
      const clockTicks = Number(ticks.trim());
      if (!(bootTime > 0) || !(clockTicks > 0)) throw new Error('Process clock unavailable');
      linuxClock = { bootTime, clockTicks };
    }
    return linuxClock;
  }
  return async function readIdentity(pid, { signal } = {}) {
    if (!positivePid(pid)) return null;
    checkAbort(signal);
    try {
      if (platform === 'linux') {
        const timing = await clock(signal);
        const base = `/proc/${pid}`;
        const [firstText, metadata, argv, directory] = await Promise.all([
          readFile(`${base}/stat`, { encoding: 'utf8', signal }),
          stat(base),
          readFile(`${base}/cmdline`, { encoding: 'utf8', signal }),
          readlink(`${base}/cwd`),
        ]);
        const first = parseProcStat(firstText, timing);
        const cwd = await realpath(directory);
        const secondText = await readFile(`${base}/stat`, { encoding: 'utf8', signal });
        const second = parseProcStat(secondText, timing);
        if (first.identity !== second.identity || first.pid !== second.pid) return null;
        const state = secondText.slice(secondText.lastIndexOf(')') + 2).trim().split(/\s+/, 1)[0];
        if (state === 'Z' || state === 'X') return null;
        return {
          ...second, uid: metadata.uid, state, cwd,
          command: argv.split('\0').filter(Boolean).map(arg => /\s/.test(arg) ? JSON.stringify(arg) : arg).join(' '),
        };
      }
      if (platform === 'darwin') {
        const args = ['-ww', '-p', String(pid), '-o', 'pid=,ppid=,uid=,lstart=,state=,command='];
        const first = currentMacProcess(await run('ps', args, { signal, allowEmpty: true }));
        if (!first || /^[ZX]/.test(first.state)) return null;
        const directories = parseLsof(await run('lsof', ['-nP', '-a', '-p', String(pid), '-d', 'cwd', '-F0pfn'], { signal, allowEmpty: true })).cwd;
        const rawCwd = directories.get(pid);
        const cwd = rawCwd ? await realpath(rawCwd) : undefined;
        const second = currentMacProcess(await run('ps', args, { signal, allowEmpty: true }));
        if (!second || /^[ZX]/.test(second.state)) return null;
        if (!sameStart(first.startedAt, second.startedAt) || first.uid !== second.uid || first.command !== second.command) return null;
        return { ...second, cwd, identity: `${second.uid}:${second.startedAt}` };
      }
      refused('unsupported', 'Stopping externally started tasks is supported on Linux and macOS only.');
    } catch (error) {
      checkAbort(signal);
      if (GONE.has(error?.code)) return null;
      throw error;
    }
  };
}

async function protectedAncestors(readIdentity, signal) {
  const protectedPids = new Set([1, process.pid, process.ppid]);
  let next = process.ppid;
  for (let depth = 0; positivePid(next) && depth < 64; depth++) {
    checkAbort(signal);
    let entry;
    try { entry = await readIdentity(next, { signal }); }
    catch { break; }
    if (!entry || !positivePid(entry.ppid) || protectedPids.has(entry.ppid)) break;
    protectedPids.add(entry.ppid);
    next = entry.ppid;
  }
  return protectedPids;
}

function sameBirthIdentity(expected, actual) {
  return actual && expected.pid === actual.pid && expected.uid === actual.uid
    && sameStart(expected.startedAt, actual.startedAt)
    && expected.identity === actual.identity;
}

function sameIdentity(expected, actual) {
  return sameBirthIdentity(expected, actual)
    && expected.command === actual.command && expected.cwd === actual.cwd;
}

function evidenceProblem(expected, actual, { workspacePath, platform, currentUid, protectedPids }) {
  if (!actual) return 'already-finished';
  if (!positivePid(actual.pid) || expected.pid !== actual.pid || protectedPids.has(actual.pid)) return 'protected';
  if (!sameStart(expected.startedAt, actual.startedAt)) return 'identity-changed';
  if (!Number.isInteger(actual.uid) || actual.uid !== currentUid) return 'different-user';
  if (!actual.command || isInfrastructureProcess(actual.command)) return 'infrastructure';
  if (redactCommand(actual.command) !== expected.command) return 'identity-changed';
  if (!actual.cwd || !pathBelongsToWorkspace(actual.cwd, workspacePath, platform)) return 'outside-workspace';
  return null;
}

function childrenFirst(entries) {
  const byPid = new Map(entries.map(entry => [entry.pid, entry]));
  const depth = entry => {
    let result = 0, current = entry;
    const seen = new Set([entry.pid]);
    while (byPid.has(current.ppid) && !seen.has(current.ppid)) {
      seen.add(current.ppid); current = byPid.get(current.ppid); result++;
    }
    return result;
  };
  return [...entries].sort((a, b) => depth(b) - depth(a));
}

/**
 * Stop a fresh, exact task identity. Only individual positive PIDs from its
 * current process set receive SIGTERM; no process-group signals or SIGKILL.
 */
export async function stopWorkspaceTask({
  workspacePath, taskId, signal, scanWorkspace = systemScan,
  platform = process.platform, readIdentity = createIdentityReader({ platform }),
  sendSignal = (pid, value) => process.kill(pid, value),
  currentUid = process.getuid?.(), protectedPids: offeredProtectedPids,
  waitMs = 600, pollMs = 75, sleep = delay, now = Date.now,
} = {}) {
  checkAbort(signal);
  if (platform !== 'linux' && platform !== 'darwin') refused('unsupported', 'Stopping externally started tasks is supported on Linux and macOS only.');
  if (typeof taskId !== 'string' || !taskId || taskId.length > 256 || taskId.trim() !== taskId || /[\x00-\x1f]/.test(taskId)
    || typeof workspacePath !== 'string' || !isAbsolute(workspacePath)) {
    refused('bad-request', 'A workspace and exact task identity are required.');
  }
  if (!Number.isInteger(currentUid) || currentUid < 0) refused('unsupported', 'The current process owner could not be verified.');
  let canonical;
  try {
    canonical = await realpath(workspacePath);
    if (!(await stat(canonical)).isDirectory()) throw new Error('Not a directory');
  } catch { refused('workspace-unavailable', 'The workspace directory is unavailable.'); }
  checkAbort(signal);
  const lockKey = JSON.stringify([canonical, taskId]);
  if (activeStops.has(lockKey)) refused('busy', 'This task is already being stopped.');
  activeStops.add(lockKey);
  try {
    const snapshot = await scanWorkspace({ workspacePath: canonical, platform, signal, includeInfrastructure: true });
    checkAbort(signal);
    const task = snapshot.tasks?.find(item => item.id === taskId);
    const result = { taskId, workspacePath: canonical, signal: 'SIGTERM', signalledPids: [], remainingPids: [], stoppedPids: [], skipped: [] };
    if (!task) return { ...result, status: 'already-finished' };
    if (task.match !== 'cwd' || task.infrastructure || isInfrastructureProcess(task.command)) {
      refused('unsafe-task', 'This task cannot be safely associated with the workspace for stopping.');
    }
    const expected = new Map((task.processes || []).map(entry => [entry.pid, entry]));
    const owner = expected.get(task.pid);
    const pids = [...new Set(task.pids || [])];
    if (!positivePid(task.pid) || !owner || !sameStart(task.startedAt, owner.startedAt)
      || !pids.includes(task.pid) || pids.length > 256 || pids.some(pid => !positivePid(pid) || !expected.has(pid))) {
      refused('unsafe-task', 'The task process identities could not be verified.');
    }
    const protectedPids = offeredProtectedPids ? new Set([1, process.pid, process.ppid, ...offeredProtectedPids]) : await protectedAncestors(readIdentity, signal);
    if (pids.some(pid => protectedPids.has(pid))) refused('unsafe-task', 'The DSH host and its parent processes cannot be stopped.');
    const policy = { workspacePath: canonical, platform, currentUid, protectedPids };
    const prepared = [];
    for (const pid of pids) {
      checkAbort(signal);
      const record = expected.get(pid);
      let identity, problem;
      try { identity = await readIdentity(pid, { signal }); }
      catch { checkAbort(signal); problem = 'unverifiable'; }
      problem ??= evidenceProblem(record, identity, policy);
      if (problem) {
        if (pid === task.pid) {
          if (problem === 'already-finished') return { ...result, status: 'already-finished' };
          refused(problem === 'identity-changed' ? 'identity-changed' : 'unsafe-task', 'The task identity or workspace ownership changed. Refresh the task list.');
        }
        result.skipped.push({ pid, reason: problem });
      } else prepared.push({ record, identity });
    }
    const ordered = childrenFirst(prepared.map(item => item.identity));
    const preparedByPid = new Map(prepared.map(item => [item.identity.pid, item]));
    for (const identity of ordered) {
      checkAbort(signal);
      const { record } = preparedByPid.get(identity.pid);
      let latest, problem;
      try { latest = await readIdentity(identity.pid, { signal }); }
      catch { checkAbort(signal); problem = 'unverifiable'; }
      checkAbort(signal);
      problem ??= evidenceProblem(record, latest, policy);
      if (!problem && !sameIdentity(identity, latest)) problem = 'identity-changed';
      if (problem) { result.skipped.push({ pid: identity.pid, reason: problem }); continue; }
      // No awaited work between the final identity comparison and the PID signal.
      try {
        sendSignal(identity.pid, 'SIGTERM');
        result.signalledPids.push(identity.pid);
      } catch (error) {
        if (!GONE.has(error?.code)) result.skipped.push({ pid: identity.pid, reason: error?.code === 'EPERM' ? 'permission-denied' : 'signal-failed' });
      }
    }
    const deadline = now() + Math.max(0, Math.min(Number.isFinite(waitMs) ? waitMs : 600, 2000));
    do {
      result.remainingPids = [];
      for (const pid of result.signalledPids) {
        checkAbort(signal);
        try {
          const current = await readIdentity(pid, { signal });
          // A service may change its title or cwd while handling TERM. It is
          // still alive until its birth identity disappears, regardless of argv.
          if (sameBirthIdentity(preparedByPid.get(pid).identity, current)) result.remainingPids.push(pid);
        } catch { checkAbort(signal); result.remainingPids.push(pid); }
      }
      if (!result.remainingPids.length || now() >= deadline) break;
      await sleep(Math.min(Math.max(10, pollMs), Math.max(0, deadline - now())), undefined, { signal });
    } while (true);
    result.stoppedPids = result.signalledPids.filter(pid => !result.remainingPids.includes(pid));
    const denied = result.skipped.some(item => item.reason !== 'already-finished');
    return { ...result, status: denied ? 'partial' : result.remainingPids.length ? 'stopping' : result.signalledPids.length ? 'stopped' : 'already-finished' };
  } catch (error) {
    if (error instanceof ProcessControlError) throw error;
    checkAbort(signal);
    refused('stop-failed', 'Unable to verify or stop this task. Refresh the task list and try again.');
  } finally { activeStops.delete(lockKey); }
}
