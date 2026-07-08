import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createTaskRunner, discoverCommands } from '../../src/actions/index.mjs';

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function until(check, timeout = 7000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { const value = await check(); if (value) return value; await sleep(25); }
  throw new Error('Timed out waiting for the isolated managed fixture.');
}

async function fixture(t, options = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'dsh-monitor-runner-'));
  const runner = createTaskRunner({ stopGraceMs: 300, ...options });
  t.after(async () => { await runner.dispose(); await rm(root, { recursive: true, force: true }); });
  const definition = file => `${JSON.stringify(process.execPath)} ${file}`;
  const manifest = {
    name: 'isolated-test-project', scripts: {
      serve: definition('server.mjs'), stay: definition('stay.mjs'), another: definition('stay.mjs'),
      done: definition('done.mjs'), fail: definition('fail.mjs'), logs: definition('logs.mjs'),
    },
  };
  await writeFile(path.join(root, 'package.json'), JSON.stringify(manifest));
  await writeFile(path.join(root, 'server.mjs'), `import net from 'node:net'; const s=net.createServer(); s.listen(0,'127.0.0.1',()=>console.log('MONITOR_READY '+s.address().port));`);
  await writeFile(path.join(root, 'stay.mjs'), `console.log('MONITOR_STAY_READY'); setInterval(()=>{},1000);`);
  await writeFile(path.join(root, 'done.mjs'), `console.log('MONITOR_COMPLETED');`);
  await writeFile(path.join(root, 'fail.mjs'), `console.error('MONITOR_FAILED'); process.exit(3);`);
  await writeFile(path.join(root, 'logs.mjs'), `for(let i=0;i<1000;i++)console.log('old-output-line-'+i);process.stdout.write('--token=fixture-token-');setTimeout(()=>{console.log('split');console.log('env-value '+process.env.DSH_MONITOR_TEST_SECRET);console.log('MONITOR_NEWEST_LINE');},20);`);
  const catalog = await discoverCommands({ workspacePath: root });
  return { root, runner, manifest, commands: Object.fromEntries(catalog.commands.map(command => [command.script, command])) };
}

test('managed npm service survives HTTP cancellation and can be stopped', { timeout: 15000, skip: !['linux', 'darwin'].includes(process.platform) }, async t => {
  const { root, runner, commands } = await fixture(t);
  const controller = new AbortController();
  const run = await runner.run({ workspacePath: root, commandId: commands.serve.id, signal: controller.signal });
  assert.ok(run.pid > 0);
  assert.equal(run.status, 'running');
  controller.abort();
  const port = await until(async () => {
    const output = await runner.output({ workspacePath: root, runId: run.runId });
    return Number(output.output.match(/MONITOR_READY (\d+)/)?.[1]) || false;
  });
  assert.ok(port > 0);
  assert.equal((await runner.list(root))[0].status, 'running');
  const stopped = await runner.stopManaged({ workspacePath: root, runId: run.runId });
  assert.equal(stopped.status, 'stopped');
  await until(() => new Promise(resolve => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.once('connect', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => resolve(true));
  }));
});

test('concurrent starts of one declared command return the same managed run', { timeout: 15000, skip: !['linux', 'darwin'].includes(process.platform) }, async t => {
  const { root, runner, commands } = await fixture(t);
  const [first, second] = await Promise.all([
    runner.run({ workspacePath: root, commandId: commands.stay.id }),
    runner.run({ workspacePath: root, commandId: commands.stay.id }),
  ]);
  assert.equal(first.runId, second.runId);
  assert.ok(first.existing || second.existing);
  assert.equal((await runner.list(root)).length, 1);
});

test('stale command IDs and arbitrary commands are refused without execution', async t => {
  const { root, runner, commands, manifest } = await fixture(t);
  manifest.scripts.stay = 'node changed.mjs';
  await writeFile(path.join(root, 'package.json'), JSON.stringify(manifest));
  await assert.rejects(runner.run({ workspacePath: root, commandId: commands.stay.id }), { code: 'workspace-monitor/command-not-found' });
  await assert.rejects(runner.run({ workspacePath: root, commandId: 'echo arbitrary' }), { code: 'workspace-monitor/command-not-found' });
  assert.deepEqual(await runner.list(root), []);
});

test('completed and failed scripts settle with their real exit codes', { timeout: 15000, skip: !['linux', 'darwin'].includes(process.platform) }, async t => {
  const { root, runner, commands } = await fixture(t);
  const completed = await runner.run({ workspacePath: root, commandId: commands.done.id });
  const failed = await runner.run({ workspacePath: root, commandId: commands.fail.id });
  const settled = await until(async () => {
    const rows = await runner.list(root);
    return rows.every(row => ['completed', 'failed'].includes(row.status)) ? rows : false;
  });
  assert.equal(settled.find(row => row.runId === completed.runId).exitCode, 0);
  assert.equal(settled.find(row => row.runId === failed.runId).exitCode, 3);
  const output = await runner.output({ workspacePath: root, runId: completed.runId });
  assert.ok(output.output.includes('MONITOR_COMPLETED'));
});

test('logs use a bounded ring and redact secrets split over output chunks', { timeout: 15000, skip: !['linux', 'darwin'].includes(process.platform) }, async t => {
  const secret = 'fixture-private-environment-value';
  const { root, runner, commands } = await fixture(t, { maxOutputBytes: 2048, environment: { ...process.env, DSH_MONITOR_TEST_SECRET: secret } });
  const run = await runner.run({ workspacePath: root, commandId: commands.logs.id });
  const output = await until(async () => {
    const value = await runner.output({ workspacePath: root, runId: run.runId });
    return value.output.includes('MONITOR_NEWEST_LINE') ? value : false;
  });
  assert.ok(Buffer.byteLength(output.output) <= 2048);
  assert.equal(output.truncated, true);
  assert.equal(output.output.includes('fixture-token-split'), false);
  assert.equal(output.output.includes(secret), false);
  assert.ok(output.output.includes('[redacted]'));
});

test('overflow keeps discarding a split sensitive line until that stream reaches a newline', { timeout: 15000, skip: !['linux', 'darwin'].includes(process.platform) }, async t => {
  const { root, runner, commands } = await fixture(t, { maxOutputBytes: 1024 });
  await writeFile(path.join(root, 'logs.mjs'), `process.stdout.write('x'.repeat(2048)+'--token=');setTimeout(()=>{console.error('unrelated stderr line');setTimeout(()=>{console.log('fixture-private-token-tail');console.log('MONITOR_AFTER_DROPPED_LINE');},20);},20);`);
  const run = await runner.run({ workspacePath: root, commandId: commands.logs.id });
  const output = await until(async () => {
    const value = await runner.output({ workspacePath: root, runId: run.runId });
    return value.output.includes('MONITOR_AFTER_DROPPED_LINE') ? value : false;
  });
  assert.equal(output.truncated, true);
  assert.equal(output.output.includes('fixture-private-token-tail'), false);
  assert.ok(output.output.includes('unrelated stderr line'));
});

test('concurrency is capped and dispose terminates only this runner’s active tasks', { timeout: 15000, skip: !['linux', 'darwin'].includes(process.platform) }, async t => {
  const { root, runner, commands } = await fixture(t, { maxConcurrentRuns: 2 });
  await runner.run({ workspacePath: root, commandId: commands.stay.id });
  await runner.run({ workspacePath: root, commandId: commands.another.id });
  await assert.rejects(runner.run({ workspacePath: root, commandId: commands.done.id }), { code: 'workspace-monitor/too-many-runs' });
  await runner.dispose();
  assert.ok((await runner.list(root)).every(row => row.status === 'stopped'));
  await assert.rejects(runner.run({ workspacePath: root, commandId: commands.done.id }), { code: 'workspace-monitor/runner-unavailable' });
});

test('a missing manager fails cleanly without implicit installation', { timeout: 10000, skip: !['linux', 'darwin'].includes(process.platform) }, async t => {
  const { root, runner, commands } = await fixture(t, {
    spawnProcess: (_manager, args, options) => spawn('dsh-monitor-missing-fixture-manager', args, options),
  });
  await assert.rejects(runner.run({ workspacePath: root, commandId: commands.stay.id }), { code: 'workspace-monitor/manager-not-found' });
  const [failed] = await runner.list(root);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.pid, undefined);
});

test('run identity is workspace scoped for output and stop operations', { timeout: 15000, skip: !['linux', 'darwin'].includes(process.platform) }, async t => {
  const { root, runner, commands } = await fixture(t);
  const other = await mkdtemp(path.join(tmpdir(), 'dsh-monitor-other-project-'));
  t.after(() => rm(other, { recursive: true, force: true }));
  const run = await runner.run({ workspacePath: root, commandId: commands.stay.id });
  await assert.rejects(runner.output({ workspacePath: other, runId: run.runId }), { code: 'workspace-monitor/run-not-found' });
  await assert.rejects(runner.stopManaged({ workspacePath: other, runId: run.runId }), { code: 'workspace-monitor/run-not-found' });
  assert.equal((await runner.list(root))[0].status, 'running');
});

test('a pre-cancelled launch never spawns a task', async t => {
  const { root, runner, commands } = await fixture(t);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(runner.run({ workspacePath: root, commandId: commands.stay.id, signal: controller.signal }), { name: 'AbortError' });
  assert.deepEqual(await runner.list(root), []);
});
