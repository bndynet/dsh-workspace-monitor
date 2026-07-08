import test from 'node:test';
import assert from 'node:assert/strict';
import { createExecutionManager, filterCommands, isActiveRun, mergeRuns, rpcValue, stopRequest, unlistedRuns } from '../../src/client/execution-model.mjs';

const deferred = () => { let resolve; let reject; const promise = new Promise((accept, refuse) => { resolve = accept; reject = refuse; }); return { promise, resolve, reject }; };
const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
const run = (extra = {}) => ({ id: 'run-1', runId: 'run-1', commandId: 'root:dev', label: 'dev', command: 'npm run dev', cwd: '/app', status: 'running', startedAt: 1000, ...extra });

test('command discovery sends only Workspace identity and ignores an aborted old catalog', async () => {
  const pending = []; const states = [];
  const manager = createExecutionManager({ actions: { commands: (request, signal) => { const result = deferred(); pending.push({ request, signal, ...result }); return result.promise; } }, onChange: state => states.push(state) });
  manager.setIdentity({ workspaceId: 'a', path: '/untrusted' });
  manager.setIdentity({ workspaceId: 'b' });
  assert.deepEqual(pending[0].request, { workspaceId: 'a' });
  assert.equal(pending[0].signal.aborted, true);
  pending[0].resolve({ commands: [{ id: 'a:secret' }] });
  pending[1].resolve({ ok: true, value: { commands: [{ id: 'b:dev' }], warnings: [] } });
  await settle();
  assert.equal(manager.getState().contextKey, 'workspace:b');
  assert.deepEqual(manager.getState().commands, [{ id: 'b:dev' }]);
  assert.equal(states.some(state => state.contextKey === 'workspace:b' && state.commands?.[0]?.id === 'a:secret'), false);
  manager.dispose();
});

test('double Run clicks share one request and preserve a returned failed run with its exit code', async () => {
  const result = deferred(); const calls = []; const changed = [];
  const manager = createExecutionManager({ actions: { run: (request, signal) => { calls.push({ request, signal }); return result.promise; } }, onChange() {}, onChanged: value => changed.push(value) });
  manager.setIdentity({ sessionId: 's1' });
  const first = manager.run('root:dev'); const second = manager.run('root:dev');
  assert.equal(first, second);
  assert.equal(manager.getState().operations['run:root:dev'].pending, true);
  await settle(); assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].request, { sessionId: 's1', commandId: 'root:dev' });
  result.resolve({ ok: true, value: run({ status: 'failed', exitCode: 17, finishedAt: 1100 }) });
  await first;
  assert.equal(manager.getState().runs[0].exitCode, 17);
  assert.equal(manager.getState().runs[0].status, 'failed');
  assert.equal(manager.getState().operations['run:root:dev'].pending, false);
  assert.equal(changed.length, 1);
  manager.dispose();
});

test('leaving a hover does not abort submitted execution or paint its result into another Workspace', async () => {
  const result = deferred(); let signal; const changed = [];
  const manager = createExecutionManager({ actions: { run: (_request, requestSignal) => { signal = requestSignal; return result.promise; } }, onChange() {}, onChanged: value => changed.push(value) });
  manager.setIdentity({ workspaceId: 'a' });
  const launch = manager.run('root:dev'); await settle();
  manager.setIdentity(null);
  assert.equal(signal.aborted, false, 'closing the hover only cancels read requests');
  manager.setIdentity({ workspaceId: 'b' });
  result.resolve({ ok: true, value: run() }); await launch;
  assert.equal(manager.getState().contextKey, 'workspace:b');
  assert.deepEqual(manager.getState().runs, []);
  assert.deepEqual(changed, []);
  manager.dispose();
});

test('stop addresses a managed run or system task by stable identity and suppresses double clicks', async () => {
  const result = deferred(); const calls = [];
  const manager = createExecutionManager({ actions: { stop: request => { calls.push(request); return result.promise; } }, onChange() {} });
  manager.setIdentity({ workspaceId: 'a' });
  const first = manager.stop({ id: 'process-12', runId: 'run-1', command: 'not sent', pid: 12 });
  const second = manager.stop({ id: 'process-12', runId: 'run-1' });
  assert.equal(first, second); await settle();
  assert.deepEqual(calls, [{ workspaceId: 'a', runId: 'run-1' }]);
  result.resolve({ status: 'stopping', taskId: 'process-12' }); await first;
  assert.equal(manager.getState().operations['stop:run-1'].result.status, 'stopping');
  assert.deepEqual(stopRequest({ id: 'process-13' }), { taskId: 'process-13' });
  manager.dispose();
});

test('structured action failures clear pending state and allow an explicit retry', async () => {
  let attempts = 0;
  const manager = createExecutionManager({ actions: { run: () => ++attempts === 1 ? { ok: false, error: { code: 'workspace-monitor/no-command', message: 'Script changed.', details: {} } } : { ok: true, value: run() } }, onChange() {} });
  manager.setIdentity({ workspaceId: 'a' }); await manager.run('root:dev');
  assert.equal(manager.getState().operations['run:root:dev'].error.code, 'workspace-monitor/no-command');
  assert.equal(manager.getState().operations['run:root:dev'].pending, false);
  await manager.run('root:dev');
  assert.equal(attempts, 2);
  assert.equal(manager.getState().operations['run:root:dev'].error, null);
  manager.dispose();
});

test('run projections avoid duplicates and cannot regress a stopped run to running', () => {
  const stopped = run({ status: 'stopped', finishedAt: 2000 });
  assert.equal(mergeRuns([run()], [stopped])[0].status, 'stopped');
  assert.equal(mergeRuns([run({ status: 'failed', exitCode: 3 })], [run()])[0].status, 'failed');
  assert.deepEqual(unlistedRuns([run()], [{ id: 'p1', runId: 'run-1' }]), []);
  assert.deepEqual(unlistedRuns([stopped], [{ id: 'p1', runId: 'run-1' }]), [stopped]);
  assert.equal(isActiveRun({ status: 'stopping' }), true);
});

test('command filters include nested project paths and definitions without offering arbitrary command input', () => {
  const commands = [{ id: 'a', script: 'dev', relativeDirectory: 'apps/frontend', definition: 'vite --host' }, { id: 'b', script: 'test', relativeDirectory: '.', definition: 'node --test' }];
  assert.deepEqual(filterCommands(commands, 'frontend vite'), [commands[0]]);
  assert.deepEqual(filterCommands(commands, 'frontend test'), []);
  assert.deepEqual(filterCommands(commands, ''), commands);
});

test('plugin unload aborts UI requests and ignores their late results', async () => {
  const result = deferred(); let signal; let changes = 0;
  const manager = createExecutionManager({ actions: { run: (_request, value) => { signal = value; return result.promise; } }, onChange() { changes += 1; } });
  manager.setIdentity({ workspaceId: 'a' }); const request = manager.run('root:dev'); await settle();
  manager.dispose(); const before = changes;
  assert.equal(signal.aborted, true);
  result.resolve(run()); await request;
  assert.equal(changes, before);
  assert.throws(() => rpcValue({ ok: false, error: { message: 'denied', code: 'forbidden' } }), /denied/);
});
