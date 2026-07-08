import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { stopWorkspaceTask, createIdentityReader } from '../../src/process-control/index.mjs';
import { scanWorkspace } from '../../src/monitor/index.mjs';

async function workspace(t) {
  const temporary = await mkdtemp(join(tmpdir(), 'dsh-stop-test-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const root = join(temporary, 'project');
  await mkdir(root);
  return { root: await realpath(root), temporary };
}

function fixture(root, overrides = {}) {
  const pid = 91001;
  const entry = { pid, ppid: 1, uid: 501, startedAt: 100000, identity: '501:100000', command: 'node server.mjs', cwd: root };
  const task = {
    id: 'darwin:91001:100000', pid, pids: [pid], startedAt: entry.startedAt,
    command: entry.command, cwd: root, match: 'cwd', processes: [entry],
    ...overrides,
  };
  const living = new Map(task.processes.map(value => [value.pid, { ...value }]));
  const sent = [];
  const calls = [];
  const dependencies = {
    workspacePath: root, taskId: task.id, platform: 'darwin', currentUid: 501, protectedPids: [], waitMs: 0,
    scanWorkspace: async options => { calls.push(options); return { tasks: [task] }; },
    readIdentity: async target => living.has(target) ? { ...living.get(target) } : null,
    sendSignal: (target, signal) => { sent.push({ pid: target, signal }); living.delete(target); },
  };
  return { task, entry, living, sent, calls, dependencies };
}

const code = expected => error => error?.code === `workspace-monitor/${expected}`;

test('exact task ids are fresh-scanned before stopping; no PID parsing or cached snapshot is trusted', async t => {
  const { root } = await workspace(t);
  const f = fixture(root);
  const result = await stopWorkspaceTask(f.dependencies);
  assert.equal(result.status, 'stopped');
  assert.deepEqual(f.sent, [{ pid: f.task.pid, signal: 'SIGTERM' }]);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].workspacePath, root);
  assert.equal(f.calls[0].includeInfrastructure, true);
  assert.deepEqual(result.stoppedPids, [f.task.pid]);
});

test('a disappeared or replaced task identity is already finished and signals nothing', async t => {
  const { root } = await workspace(t);
  const f = fixture(root);
  f.dependencies.taskId = 'darwin:91001:older-start';
  const result = await stopWorkspaceTask(f.dependencies);
  assert.equal(result.status, 'already-finished');
  assert.deepEqual(f.sent, []);
});

test('invalid task ids, PID-like numbers, and relative directories are rejected', async t => {
  const { root } = await workspace(t);
  const f = fixture(root);
  for (const taskId of [91001, null, '', ' ', 'x'.repeat(257), 'x\n']) {
    await assert.rejects(stopWorkspaceTask({ ...f.dependencies, taskId }), code('bad-request'));
  }
  await assert.rejects(stopWorkspaceTask({ ...f.dependencies, workspacePath: './project' }), code('bad-request'));
  assert.equal(f.calls.length, 0);
  assert.deepEqual(f.sent, []);
});

test('command-only project matches and infrastructure tasks cannot be stopped', async t => {
  const { root } = await workspace(t);
  for (const change of [{ match: 'command' }, { match: 'descendant' }, { infrastructure: true }, { command: 'node /opt/tsserver.js' }]) {
    const f = fixture(root, change);
    await assert.rejects(stopWorkspaceTask(f.dependencies), code('unsafe-task'));
    assert.deepEqual(f.sent, []);
  }
});

test('host PID, ancestors, PID 1, negative PIDs and unverifiable owner starts are protected', async t => {
  const { root } = await workspace(t);
  for (const pid of [process.pid, process.ppid, 1, -1]) {
    const f = fixture(root);
    Object.assign(f.task, { pid, pids: [pid] });
    f.task.processes = [{ ...f.entry, pid }];
    f.living.clear(); f.living.set(pid, { ...f.entry, pid });
    await assert.rejects(stopWorkspaceTask(f.dependencies), code('unsafe-task'));
    assert.deepEqual(f.sent, []);
  }
  const missing = fixture(root, { startedAt: undefined });
  await assert.rejects(stopWorkspaceTask(missing.dependencies), code('unsafe-task'));
  const ancestor = fixture(root);
  ancestor.dependencies.protectedPids = [ancestor.task.pid];
  await assert.rejects(stopWorkspaceTask(ancestor.dependencies), code('unsafe-task'));
  assert.deepEqual(ancestor.sent, []);
});

test('PID reuse before preflight is refused without signalling the replacement', async t => {
  const { root } = await workspace(t);
  const f = fixture(root);
  f.living.set(f.task.pid, { ...f.entry, startedAt: 200000, identity: '501:200000' });
  await assert.rejects(stopWorkspaceTask(f.dependencies), code('identity-changed'));
  assert.deepEqual(f.sent, []);
});

test('PID reuse after preflight is rechecked immediately before each signal', async t => {
  const { root } = await workspace(t);
  const f = fixture(root);
  let reads = 0;
  f.dependencies.readIdentity = async () => ++reads === 1 ? { ...f.entry } : { ...f.entry, startedAt: 200000, identity: '501:200000' };
  const result = await stopWorkspaceTask(f.dependencies);
  assert.equal(result.status, 'partial');
  assert.equal(result.skipped[0].reason, 'identity-changed');
  assert.deepEqual(f.sent, []);
});

test('a changed Linux start-tick identity is refused even if the displayed start time is unchanged', async t => {
  const { root } = await workspace(t);
  const f = fixture(root);
  let reads = 0;
  f.dependencies.platform = 'linux';
  f.dependencies.readIdentity = async () => ({ ...f.entry, identity: ++reads === 1 ? '1001' : '1002' });
  const result = await stopWorkspaceTask(f.dependencies);
  assert.equal(result.status, 'partial');
  assert.deepEqual(f.sent, []);
});

test('changed cwd, different uid, and an interactive parent shell are refused', async t => {
  const { root, temporary } = await workspace(t);
  const outside = join(temporary, 'other');
  await mkdir(outside);
  for (const change of [{ cwd: outside }, { uid: 502 }, { command: '/bin/zsh' }]) {
    const f = fixture(root);
    f.living.set(f.task.pid, { ...f.entry, ...change });
    await assert.rejects(stopWorkspaceTask(f.dependencies), error => code('unsafe-task')(error) || code('identity-changed')(error));
    assert.deepEqual(f.sent, []);
  }
});

test('only verified task members receive TERM, children first, with no process-group or forced kill', async t => {
  const { root, temporary } = await workspace(t);
  const outside = join(temporary, 'other');
  await mkdir(outside);
  const parent = { pid: 91001, ppid: 1, uid: 501, startedAt: 100000, identity: '100', command: 'npm run dev', cwd: root };
  const wrapper = { pid: 91002, ppid: 91001, uid: 501, startedAt: 100001, identity: '101', command: 'sh -c node server.mjs', cwd: root };
  const child = { pid: 91003, ppid: 91002, uid: 501, startedAt: 100002, identity: '102', command: 'node server.mjs', cwd: root };
  const crossProject = { pid: 91004, ppid: 91001, uid: 501, startedAt: 100003, identity: '103', command: 'node other.mjs', cwd: outside };
  const f = fixture(root, { command: parent.command, processes: [parent, wrapper, child, crossProject], pids: [91001, 91002, 91003, 91004] });
  const result = await stopWorkspaceTask(f.dependencies);
  assert.equal(result.status, 'partial');
  assert.deepEqual(f.sent.map(value => value.pid), [91003, 91002, 91001]);
  assert.ok(f.sent.every(value => value.pid > 1 && value.signal === 'SIGTERM'));
  assert.deepEqual(result.skipped, [{ pid: crossProject.pid, reason: 'outside-workspace' }]);
  assert.ok(f.living.has(crossProject.pid));
});

test('an uncooperative process remains stopping without automatic SIGKILL', async t => {
  const { root } = await workspace(t);
  const f = fixture(root);
  f.dependencies.sendSignal = (pid, signal) => f.sent.push({ pid, signal });
  const result = await stopWorkspaceTask(f.dependencies);
  assert.equal(result.status, 'stopping');
  assert.deepEqual(result.remainingPids, [f.task.pid]);
  assert.deepEqual(f.sent, [{ pid: f.task.pid, signal: 'SIGTERM' }]);
});

test('a process that changes its title during graceful shutdown is still stopping', async t => {
  const { root } = await workspace(t);
  const f = fixture(root);
  f.dependencies.sendSignal = (pid, signal) => {
    f.sent.push({ pid, signal });
    f.living.set(pid, { ...f.entry, command: 'node shutting-down' });
  };
  const result = await stopWorkspaceTask(f.dependencies);
  assert.equal(result.status, 'stopping');
  assert.deepEqual(result.remainingPids, [f.task.pid]);
});

test('permission failures return partial; raw OS errors never enter the result', async t => {
  const { root } = await workspace(t);
  const f = fixture(root);
  f.dependencies.sendSignal = () => { throw Object.assign(new Error('secret-token=do-not-leak'), { code: 'EPERM' }); };
  const result = await stopWorkspaceTask(f.dependencies);
  assert.equal(result.status, 'partial');
  assert.deepEqual(result.skipped, [{ pid: f.task.pid, reason: 'permission-denied' }]);
  assert.equal(JSON.stringify(result).includes('do-not-leak'), false);
});

test('Windows control is explicitly unsupported and performs no process work', async t => {
  const { root } = await workspace(t);
  const f = fixture(root);
  await assert.rejects(stopWorkspaceTask({ ...f.dependencies, platform: 'win32' }), code('unsupported'));
  assert.equal(f.calls.length, 0);
  assert.deepEqual(f.sent, []);
});

test('cancellation before a destructive action signals nothing', async t => {
  const { root } = await workspace(t);
  const f = fixture(root);
  const controller = new AbortController();
  f.dependencies.signal = controller.signal;
  f.dependencies.readIdentity = async () => { controller.abort(); return { ...f.entry }; };
  await assert.rejects(stopWorkspaceTask(f.dependencies), { name: 'AbortError' });
  assert.deepEqual(f.sent, []);
});

test('cancellation during the final identity read cannot still send TERM', async t => {
  const { root } = await workspace(t);
  const f = fixture(root);
  const controller = new AbortController();
  let reads = 0;
  f.dependencies.signal = controller.signal;
  f.dependencies.readIdentity = async () => {
    if (++reads === 2) controller.abort();
    return { ...f.entry };
  };
  await assert.rejects(stopWorkspaceTask(f.dependencies), { name: 'AbortError' });
  assert.deepEqual(f.sent, []);
});

test('the real identity reader and stopper terminate only a temporary child service', { skip: !['linux', 'darwin'].includes(process.platform), timeout: 15000 }, async t => {
  const { root } = await workspace(t);
  const child = spawn(process.execPath, ['-e', "require('node:net').createServer().listen(0,'127.0.0.1',()=>console.log('ready'))"], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let exited = false;
  child.once('exit', () => { exited = true; });
  t.after(async () => {
    if (!exited) {
      child.kill('SIGKILL');
      await once(child, 'exit').catch(() => {});
    }
  });
  const ready = await Promise.race([
    once(child.stdout, 'data').then(([chunk]) => String(chunk)),
    once(child, 'exit').then(() => { throw new Error('Temporary service exited before readiness'); }),
  ]);
  assert.match(ready, /ready/);
  const identity = await createIdentityReader() (child.pid);
  assert.equal(identity.pid, child.pid);
  assert.equal(identity.uid, process.getuid());
  assert.equal(identity.cwd, root);
  const snapshot = await scanWorkspace({ workspacePath: root });
  const task = snapshot.tasks.find(value => value.pids.includes(child.pid));
  assert.ok(task, 'The temporary service must be observable as a workspace task');
  const result = await stopWorkspaceTask({ workspacePath: root, taskId: task.id, waitMs: 1000 });
  assert.equal(result.status, 'stopped');
  assert.deepEqual(result.signalledPids, [child.pid]);
  assert.equal(result.remainingPids.length, 0);
});
