import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { StringDecoder } from 'node:string_decoder';
import { redactCommand } from '../monitor/index.mjs';
import { ActionError, canonicalWorkspace, contained, discoverCommands } from './catalog.mjs';

const ACTIVE = new Set(['running', 'stopping']);
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function view(entry) {
  return {
    id: entry.runId, runId: entry.runId, commandId: entry.command.id,
    label: entry.command.label, command: entry.command.command,
    definition: entry.command.definition, cwd: entry.command.directory,
    workspacePath: entry.workspacePath, pid: entry.child.pid,
    pids: entry.child.pid ? [entry.child.pid] : [], source: 'managed',
    status: entry.status, startedAt: entry.startedAt,
    ...(entry.finishedAt ? { finishedAt: entry.finishedAt } : {}),
    ...(entry.exitCode !== undefined ? { exitCode: entry.exitCode } : {}),
    ...(entry.exitSignal ? { signal: entry.exitSignal } : {}),
  };
}

function append(entry, chunk, cap, source = 'system') {
  let bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  if (entry.discardUntilNewline.has(source)) {
    const newline = bytes.indexOf(10);
    if (newline === -1) return;
    entry.discardUntilNewline.delete(source);
    bytes = bytes.subarray(newline + 1);
  }
  entry.buffer = Buffer.concat([entry.buffer, bytes]);
  if (entry.buffer.length > cap) {
    const tail = entry.buffer.subarray(entry.buffer.length - cap);
    const newline = tail.indexOf(10);
    // Dropping a partial first line avoids exposing the tail of a redacted token.
    entry.buffer = newline === -1 ? Buffer.alloc(0) : tail.subarray(newline + 1);
    // A secret's label can have been discarded while its value arrives in a
    // later chunk. Do not resume this stream in the middle of the dropped line.
    // Track stdout and stderr separately so a newline on the other cannot reset it.
    if (newline === -1) entry.discardUntilNewline.add(source);
    entry.truncated = true;
  }
}

function environmentSecrets(environment) {
  return Object.entries(environment).filter(([key, value]) => /(?:^|_)(?:TOKEN|PASSWORD|PASSWD|SECRET|API_KEY|PRIVATE_KEY|ACCESS_KEY)(?:_|$)/i.test(key) && typeof value === 'string' && value.length >= 6).map(([, value]) => value).sort((a, b) => b.length - a.length);
}

function outputView(entry, secrets, cap) {
  let output = entry.buffer.toString('utf8').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
  for (const secret of secrets) output = output.split(secret).join('[redacted]');
  output = output.split('\n').map(line => redactCommand(line)).join('\n');
  const bytes = Buffer.from(output);
  const clipped = bytes.length > cap;
  if (clipped) output = bytes.subarray(bytes.length - cap).toString('utf8');
  return { ...view(entry), output, truncated: entry.truncated || clipped };
}

async function linuxIdentity(pid) {
  try {
    const text = await readFile(`/proc/${pid}/stat`, 'utf8');
    const fields = text.slice(text.lastIndexOf(')') + 2).trim().split(/\s+/);
    return { pgrp: Number(fields[2]), start: fields[19] };
  } catch { return undefined; }
}

/** Owns only processes started by this plugin; scanner-discovered processes use a separate control path. */
export function createTaskRunner({
  maxConcurrentRuns = 8, maxOutputBytes = 65536, stopGraceMs = 1500,
  discover = discoverCommands, spawnProcess = spawn, now = Date.now,
  platform = process.platform, environment = process.env,
} = {}) {
  const entries = new Map();
  const secrets = environmentSecrets(environment);
  const cap = Math.max(1024, Math.min(65536, Number(maxOutputBytes) || 65536));
  const maxRuns = Math.max(1, Math.min(8, Number(maxConcurrentRuns) || 8));
  let disposed = false;

  async function resolveRun(workspacePath, runId) {
    if (typeof runId !== 'string') throw new ActionError('run-not-found', 'The selected run is unavailable.');
    const root = await canonicalWorkspace(workspacePath);
    const entry = entries.get(runId);
    if (!entry || entry.workspacePath !== root) throw new ActionError('run-not-found', 'The selected run is unavailable in this workspace.');
    return entry;
  }

  async function identityMatches(entry) {
    if (entry.exitObserved || entry.child.exitCode !== null || entry.child.signalCode !== null || !entry.child.pid) return false;
    if (platform === 'linux') {
      const current = await linuxIdentity(entry.child.pid);
      return !entry.exitObserved && entry.child.exitCode === null && entry.child.signalCode === null
        && !!entry.identity && current?.start === entry.identity.start && current?.pgrp === entry.child.pid;
    }
    // A live ChildProcess is retained, never a persisted numeric process id.
    // The exit event permanently revokes permission to signal its process group.
    return !entry.exitObserved;
  }

  async function stopEntry(entry) {
    await entry.ready;
    if (!ACTIVE.has(entry.status) || !(await identityMatches(entry))) return view(entry);
    entry.stopRequested = true; entry.status = 'stopping';
    try { process.kill(-entry.child.pid, 'SIGTERM'); }
    catch (error) { if (error.code !== 'ESRCH') throw new ActionError('stop-failed', 'The managed task could not be stopped.'); }
    await Promise.race([entry.done, sleep(stopGraceMs)]);
    if (!entry.exitObserved && await identityMatches(entry)) {
      try { process.kill(-entry.child.pid, 'SIGKILL'); }
      catch (error) { if (error.code !== 'ESRCH') throw new ActionError('stop-failed', 'The managed task could not be stopped.'); }
      await Promise.race([entry.done, sleep(1000)]);
    }
    return view(entry);
  }

  return {
    async run({ workspacePath, commandId, signal } = {}) {
      if (disposed) throw new ActionError('runner-unavailable', 'The task runner is unavailable.');
      if (!['linux', 'darwin'].includes(platform)) throw new ActionError('unsupported-platform', 'Managed script execution currently supports Linux and macOS.');
      if (typeof commandId !== 'string' || !/^script-[a-f0-9]{32}$/.test(commandId)) throw new ActionError('command-not-found', 'Refresh the command list and select a declared script.');
      signal?.throwIfAborted();
      const root = await canonicalWorkspace(workspacePath);
      const catalog = await discover({ workspacePath: root, signal });
      signal?.throwIfAborted();
      if (disposed) throw new ActionError('runner-unavailable', 'The task runner is unavailable.');
      const command = catalog.commands.find(candidate => candidate.id === commandId);
      if (!command) throw new ActionError('command-not-found', 'This command changed or is unavailable. Refresh the command list.');
      if (!['npm', 'pnpm', 'yarn', 'bun'].includes(command.manager) || !contained(root, command.directory)) throw new ActionError('invalid-command', 'The command is outside this workspace.');
      const existing = [...entries.values()].find(entry => entry.workspacePath === root && entry.command.id === commandId && ACTIVE.has(entry.status));
      if (existing) { await existing.ready; return { ...view(existing), existing: true }; }
      if ([...entries.values()].filter(entry => ACTIVE.has(entry.status)).length >= maxRuns) throw new ActionError('too-many-runs', `At most ${maxRuns} managed tasks can run at once.`);
      // This synchronous insertion makes duplicate admission atomic across concurrent requests.
      const child = spawnProcess(command.manager, ['run', command.script], {
        cwd: command.directory, shell: false, detached: true, windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...environment, COREPACK_ENABLE_NETWORK: '0', COREPACK_ENABLE_DOWNLOAD_PROMPT: '0' },
      });
      const entry = {
        runId: `run-${randomUUID()}`, workspacePath: root, command, child,
        startedAt: now(), status: 'running', buffer: Buffer.alloc(0), truncated: false, discardUntilNewline: new Set(),
        exitObserved: false, stopRequested: false,
      };
      entries.set(entry.runId, entry);
      let settle;
      entry.done = new Promise(resolve => { settle = resolve; });
      for (const [source, stream] of [['stdout', child.stdout], ['stderr', child.stderr]]) {
        if (!stream) continue;
        const decoder = new StringDecoder('utf8');
        stream.on('data', chunk => append(entry, decoder.write(chunk), cap, source));
        stream.on('end', () => { const last = decoder.end(); if (last) append(entry, last, cap, source); });
        stream.on('error', () => append(entry, '\nSome process output could not be read.\n', cap));
      }
      child.once('exit', (code, exitSignal) => {
        entry.exitObserved = true; entry.exitCode = code; entry.exitSignal = exitSignal;
        entry.finishedAt = now(); entry.status = entry.stopRequested ? 'stopped' : code === 0 ? 'completed' : 'failed';
        settle();
      });
      entry.ready = new Promise((resolve, reject) => {
        child.once('spawn', async () => {
          if (platform === 'linux') entry.identity = await linuxIdentity(child.pid);
          resolve();
        });
        child.once('error', error => {
          entry.exitObserved = true; entry.status = 'failed'; entry.finishedAt = now();
          append(entry, 'The package manager could not be started.\n', cap);
          settle();
          reject(new ActionError(error.code === 'ENOENT' ? 'manager-not-found' : 'launch-failed', error.code === 'ENOENT' ? `${command.manager} is not installed on the DSH host. Install it explicitly and retry.` : 'The script could not be started.'));
        });
      });
      // Keep completed runs bounded, retaining active tasks and their output.
      for (const [id, item] of entries) if (entries.size > 100 && !ACTIVE.has(item.status)) entries.delete(id);
      // Accepted jobs deliberately have no HTTP AbortSignal attached to their lifetime.
      await entry.ready;
      await new Promise(resolve => setImmediate(resolve));
      return view(entry);
    },

    async list(workspacePath) {
      const root = await canonicalWorkspace(workspacePath);
      return [...entries.values()].filter(entry => entry.workspacePath === root).map(view).sort((a, b) => b.startedAt - a.startedAt);
    },

    async output({ workspacePath, runId } = {}) {
      return outputView(await resolveRun(workspacePath, runId), secrets, cap);
    },

    async stopManaged({ workspacePath, runId } = {}) {
      return stopEntry(await resolveRun(workspacePath, runId));
    },

    async dispose() {
      disposed = true;
      await Promise.allSettled([...entries.values()].filter(entry => ACTIVE.has(entry.status)).map(stopEntry));
    },
  };
}
