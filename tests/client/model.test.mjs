import test from 'node:test';
import assert from 'node:assert/strict';
import { displayPath, filterTasks, formatElapsed, portAddress, runningJobs, scanValue } from '../../src/client/model.mjs';

test('workspace label supports POSIX, Windows, and filesystem roots', () => {
  assert.equal(displayPath('/home/me/app/'), 'app');
  assert.equal(displayPath('C:\\repos\\my-app\\'), 'my-app');
  assert.equal(displayPath('/'), '/');
});

test('task filters search commands, child processes, ports and PIDs with all terms required', () => {
  const tasks = [
    { pid: 100, command: 'npm run dev', runtime: 'node', cwd: '/repo/frontend', pids: [100, 102], ports: [{ protocol: 'tcp', address: '::1', port: 5173 }], processes: [{ command: 'node /repo/node_modules/vite/bin/vite.js' }] },
    { pid: 200, command: 'java -jar backend.jar', cwd: '/repo/backend', ports: [] },
  ];
  assert.deepEqual(filterTasks(tasks, '  VITE 5173 '), [tasks[0]]);
  assert.deepEqual(filterTasks(tasks, '102'), [tasks[0]]);
  assert.deepEqual(filterTasks(tasks, 'backend 5173'), []);
  assert.equal(filterTasks(tasks, ''), tasks);
});

test('endpoint formatting brackets IPv6 without duplicating existing brackets', () => {
  assert.equal(portAddress({ address: '::1', port: 8080 }), '[::1]:8080');
  assert.equal(portAddress({ address: '[::]', port: 8080 }), '[::]:8080');
  assert.equal(portAddress({ address: '127.0.0.1', port: 8080 }), '127.0.0.1:8080');
  assert.equal(portAddress({ port: 8080 }), '*:8080');
});

test('uptime tolerates missing timestamps and clock skew', () => {
  assert.equal(formatElapsed(undefined, 100_000), '—');
  assert.equal(formatElapsed(110_000, 100_000), '0s');
  assert.equal(formatElapsed(1000, 126_000), '2m 5s');
  assert.equal(formatElapsed(1000, 7_321_000), '2h 2m');
  assert.equal(formatElapsed(1000, 90_001_000), '1d 1h');
});

test('scan responses use the official RPC result envelope and retain structured failures', () => {
  const value = { workspacePath: '/repo', tasks: [], scannedAt: Date.now() };
  assert.deepEqual(scanValue({ ok: true, value }), { ...value, warnings: [] });
  assert.deepEqual(scanValue(value), { ...value, warnings: [] });
  assert.throws(() => scanValue({ ok: false, error: { code: 'monitor/forbidden', message: 'Owner access required.', details: {} } }), error => error.code === 'monitor/forbidden' && error.message === 'Owner access required.');
  assert.throws(() => scanValue({ workspacePath: '/repo' }), /invalid response/);
});

test('completed jobs stay out of the running view and filtering retains stopping jobs', () => {
  const jobs = [{ id: 'bash-1', label: 'npm run dev', status: 'running' }, { id: 'bash-2', label: 'java -jar app.jar', status: 'stopping' }, { id: 'bash-3', label: 'npm test', status: 'completed' }];
  assert.deepEqual(runningJobs(jobs), jobs.slice(0, 2));
  assert.deepEqual(runningJobs(jobs, 'JAVA'), [jobs[1]]);
});
