import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';
import {
  buildTasks, parseLsof, parsePs, parseProcNet, parseProcStat,
  parseWindowsSnapshot, pathBelongsToWorkspace, redactCommand, scanWorkspace,
} from '../../src/monitor/index.mjs';

const project = '/work/project';
const processRow = (pid, ppid, command, extra = {}) => ({ pid, ppid, command, cwd: project, startedAt: 100000 + pid, ports: [], ...extra });
const taskOptions = { workspacePath: project, platform: 'linux' };

test('path attribution respects directory boundaries and dot segments', () => {
  assert.equal(pathBelongsToWorkspace('/work/project/api', project, 'linux'), true);
  assert.equal(pathBelongsToWorkspace('/work/project-other', project, 'linux'), false);
  assert.equal(pathBelongsToWorkspace('/work/project/../other', project, 'linux'), false);
  assert.equal(pathBelongsToWorkspace('api', project, 'linux'), false);
  assert.equal(pathBelongsToWorkspace('/anything', '/', 'linux'), true);
});

test('Windows path attribution normalizes separators and case', () => {
  assert.equal(pathBelongsToWorkspace('C:\\Projects\\App\\api', 'c:/projects/app', 'win32'), true);
  assert.equal(pathBelongsToWorkspace('C:\\Projects\\Application', 'c:/projects/app', 'win32'), false);
});

test('process grouping joins npm → shell → runtime with all actual ports', () => {
  const rows = [
    processRow(20, 1, 'npm run dev'),
    processRow(21, 20, 'sh -c vite'),
    processRow(22, 21, 'node /work/project/node_modules/vite/bin/vite.js', {
      ports: [{ protocol: 'tcp', address: '127.0.0.1', port: 5173 }, { protocol: 'tcp', address: '127.0.0.1', port: 5173 }],
    }),
  ];
  const tasks = buildTasks(rows, taskOptions);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].pid, 20);
  assert.deepEqual(tasks[0].pids, [20, 21, 22]);
  assert.equal(tasks[0].runtime, 'Node.js');
  assert.equal(tasks[0].ports.length, 1);
  assert.equal(tasks[0].command, 'npm run dev');
});

test('an interactive shell does not merge independent app tasks', () => {
  const rows = [
    processRow(10, 1, '/bin/zsh'),
    processRow(11, 10, 'node server.js'),
    processRow(12, 10, 'java -jar app.jar'),
  ];
  const tasks = buildTasks(rows, taskOptions);
  assert.deepEqual(tasks.map(t => t.pid), [11, 12]);
});

test('a shell launching independent background commands is not a single task', () => {
  const rows = [processRow(10, 1, 'sh -c "node a.js & node b.js & wait"'), processRow(11, 10, 'node a.js'), processRow(12, 10, 'node b.js')];
  const tasks = buildTasks(rows, taskOptions);
  assert.ok(tasks.some(t => t.pid === 11));
  assert.ok(tasks.some(t => t.pid === 12));
  assert.ok(!tasks.find(t => t.pid === 10)?.pids.includes(11));
});

test('long-running tasks without ports remain visible', () => {
  const [task] = buildTasks([processRow(30, 1, 'node node_modules/typescript/bin/tsc --watch')], taskOptions);
  assert.deepEqual(task.ports, []);
  assert.equal(task.match, 'cwd');
});

test('infrastructure filters are optional and own host PID is always excluded', () => {
  const rows = [processRow(10, 1, '/bin/zsh'), processRow(11, 1, 'node /opt/tsserver.js'), processRow(12, 1, 'node /opt/@deepseek-ai/dsh/bin/dsh.js'), processRow(13, 1, 'python worker.py')];
  assert.deepEqual(buildTasks(rows, taskOptions).map(t => t.pid), [13]);
  assert.equal(buildTasks(rows, { ...taskOptions, includeInfrastructure: true, excludePids: [13] }).length, 3);
});

test('a child with no cwd inherits evidence from a non-interactive parent', () => {
  const tasks = buildTasks([processRow(10, 1, 'npm run dev'), processRow(11, 10, 'node server.js', { cwd: undefined })], taskOptions);
  assert.equal(tasks.length, 1);
  assert.deepEqual(tasks[0].pids, [10, 11]);
});

test('explicitly different cwd does not inherit project ownership', () => {
  const tasks = buildTasks([processRow(10, 1, 'npm run dev'), processRow(11, 10, 'node server.js', { cwd: '/work/other' })], taskOptions);
  assert.deepEqual(tasks.flatMap(t => t.pids), [10]);
});

test('command-path matching requires a complete absolute workspace path', () => {
  const rows = [
    processRow(1, 0, 'java -jar /work/project/server/app.jar', { cwd: '/tmp' }),
    processRow(2, 0, 'java -jar /work/project-other/app.jar', { cwd: '/tmp' }),
    processRow(3, 0, 'node --dir=/work/project', { cwd: undefined }),
  ];
  const tasks = buildTasks(rows, taskOptions);
  assert.deepEqual(tasks.map(t => t.pid), [1, 3]);
  assert.ok(tasks.every(t => t.match === 'command'));
});

test('command-path matching supports Windows quoting and case', () => {
  const [task] = buildTasks([{ pid: 1, ppid: 0, command: '"C:\\Program Files\\Java\\java.exe" -jar "C:\\Projects\\My App\\app.jar"' }], { workspacePath: 'c:\\projects\\my app', platform: 'win32' });
  assert.equal(task?.match, 'command');
  assert.equal(task?.runtime, 'Java');
});

test('PID reuse changes task identity', () => {
  const first = buildTasks([processRow(10, 1, 'node server.js')], taskOptions)[0];
  const next = buildTasks([processRow(10, 1, 'node server.js', { startedAt: 999999 })], taskOptions)[0];
  assert.notEqual(first.id, next.id);
});

test('all exposed command fields redact common credential forms', () => {
  const command = 'node server.js --token abc123 --password="a b" -Dspring.datasource.password=s3cret API_KEY=sk-supersecret --header "Authorization: Bearer a.b.secret" --url postgres://user:db-password@host/db';
  const [task] = buildTasks([processRow(1, 0, command)], taskOptions);
  for (const output of [redactCommand(command), task.command, task.processes[0].command]) {
    for (const secret of ['abc123', 'a b', 's3cret', 'sk-supersecret', 'a.b.secret', 'db-password']) assert.equal(output.includes(secret), false, `${secret} was exposed`);
    assert.ok(output.includes('[redacted]'));
  }
});

test('redaction handles options quoted as entire argv values', () => {
  const command = 'node server.js "--password=space secret" "API_KEY=another secret" --token=single';
  const output = redactCommand(command);
  assert.equal(output.includes('space secret'), false);
  assert.equal(output.includes('another secret'), false);
  assert.equal(output.includes('single'), false);
  assert.equal(output, 'node server.js "--password=[redacted]" "API_KEY=[redacted]" --token=[redacted]');
});

test('ps parser keeps commands with spaces and stable process start dates', () => {
  const rows = parsePs(' 321  22  501 Tue Nov 17 09:05:03 2026 /usr/bin/java -jar my app.jar\n bad row');
  assert.equal(rows.length, 1);
  assert.deepEqual({ pid: rows[0].pid, ppid: rows[0].ppid, uid: rows[0].uid }, { pid: 321, ppid: 22, uid: 501 });
  assert.equal(rows[0].command, '/usr/bin/java -jar my app.jar');
  assert.equal(typeof rows[0].startedAt, 'number');
});

test('lsof parser handles NUL fields, cwd spaces and IPv4/IPv6 ports', () => {
  const parsed = parseLsof('p50\0fcwd\0n/work/my project\0\np50\0f21\0PTCP\0n127.0.0.1:5173\0TST=LISTEN\0f22\0PTCP\0n[::1]:8080\0TST=LISTEN\0f23\0PUDP\0n*:5353\0');
  assert.equal(parsed.cwd.get(50), '/work/my project');
  assert.deepEqual(parsed.ports.get(50), [
    { protocol: 'tcp', address: '127.0.0.1', port: 5173 },
    { protocol: 'tcp', address: '::1', port: 8080 },
    { protocol: 'udp', address: '*', port: 5353 },
  ]);
});

test('lsof parser excludes TCP client connections and non-listening TCP', () => {
  const parsed = parseLsof('p50\nf1\nPTCP\nn127.0.0.1:1234->127.0.0.1:80\nTST=ESTABLISHED\nf2\nPTCP\nn127.0.0.1:1235\nTST=CLOSE_WAIT\n');
  assert.equal(parsed.ports.size, 0);
});

test('Linux proc socket parsing includes TCP listeners and omits connections', () => {
  const header = 'sl local_address rem_address st tx_queue rx tr retr uid timeout inode';
  const listener = '0: 0100007F:1F90 00000000:0000 0A 00000000:00000000 00:00000000 00000000 1000 0 123';
  const client = '1: 0100007F:C000 0100007F:1F90 01 00000000:00000000 00:00000000 00000000 1000 0 124';
  const parsed = parseProcNet([header, listener, client].join('\n'));
  assert.deepEqual([...parsed], [['123', { protocol: 'tcp', address: '127.0.0.1', port: 8080 }]]);
});

test('Linux IPv6 proc addresses decode native 32-bit byte ordering', () => {
  const parsed = parseProcNet('header\n0: 00000000000000000000000001000000:0035 00000000000000000000000000000000:0000 07 0:0 00:0 0 1000 0 999', 'udp', 6);
  assert.deepEqual(parsed.get('999'), { protocol: 'udp', address: '0:0:0:0:0:0:0:1', port: 53 });
});

test('Linux UDP service discovery omits connected client endpoints', () => {
  const bound = '0: 0100007F:1F90 00000000:0000 07 0:0 00:0 0 1000 0 100';
  const connected = '1: 0100007F:C000 08080808:0035 01 0:0 00:0 0 1000 0 101';
  const parsed = parseProcNet(`header\n${bound}\n${connected}`, 'udp', 4);
  assert.deepEqual([...parsed.keys()], ['100']);
});

test('Linux stat parser handles process names containing parentheses', () => {
  const fields = ['S', '7', ...Array(17).fill('0'), '250'];
  const parsed = parseProcStat(`99 (a (strange) name) ${fields.join(' ')}`, { bootTime: 1000, clockTicks: 100 });
  assert.deepEqual(parsed, { pid: 99, ppid: 7, identity: '250', startedAt: 1002500 });
});

test('Windows JSON snapshot accepts singleton WMI records and deduplicates ports', () => {
  const rows = parseWindowsSnapshot({
    processes: { ProcessId: 22, ParentProcessId: 1, CommandLine: 'java -jar C:\\app\\api.jar', CreationDate: '2026-11-18T01:00:00.000Z' },
    tcp: [{ OwningProcess: 22, LocalAddress: '::', LocalPort: 8080 }, { OwningProcess: 22, LocalAddress: '::', LocalPort: 8080 }],
    udp: { OwningProcess: 22, LocalAddress: '0.0.0.0', LocalPort: 5353 },
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].cwd, undefined);
  assert.equal(rows[0].ports.length, 2);
  assert.equal(rows[0].startedAt, Date.parse('2026-11-18T01:00:00.000Z'));
});

test('scan validates paths, preserves warnings and obeys cancellation', async () => {
  await assert.rejects(scanWorkspace({ workspacePath: 'relative' }), /absolute/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(scanWorkspace({ workspacePath: project, signal: controller.signal, snapshot: [] }), { name: 'AbortError' });
  const result = await scanWorkspace({ workspacePath: project, snapshot: { processes: [processRow(99, 1, 'java -jar app.jar')], warnings: ['partial'] } });
  assert.equal(result.tasks[0].pid, 99);
  assert.deepEqual(result.warnings, ['partial']);
  assert.equal(typeof result.scannedAt, 'number');
});

test('native scanner discovers an isolated TCP/UDP server and a portless worker', { skip: !['darwin', 'linux'].includes(process.platform), timeout: 25000 }, async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'dsh-workspace-monitor-'));
  const children = [];
  t.after(async () => {
    await Promise.all(children.map(async child => { if (child.exitCode == null) { child.kill(); await once(child, 'exit').catch(() => {}); } }));
    await rm(directory, { recursive: true, force: true });
  });
  const serverScript = `const net=require('node:net'),dgram=require('node:dgram'); const server=net.createServer(); const udp=dgram.createSocket('udp4'); const failed=e=>{process.send({error:e.code},()=>process.exit(1))};server.on('error',failed);udp.on('error',failed); server.listen(0,'127.0.0.1',()=>udp.bind(0,'127.0.0.1',()=>process.send({tcp:server.address().port,udp:udp.address().port})));`;
  const server = spawn(process.execPath, ['-e', serverScript], { cwd: directory, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] }); children.push(server);
  const worker = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000); process.send({ready:true});'], { cwd: directory, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] }); children.push(worker);
  const [[ports]] = await Promise.all([once(server, 'message', { signal: AbortSignal.timeout(5000) }), once(worker, 'message', { signal: AbortSignal.timeout(5000) })]);
  assert.equal(ports.error, undefined, `Local TCP/UDP fixture failed: ${ports.error}`);
  const snapshot = await scanWorkspace({ workspacePath: directory });
  const serverTask = snapshot.tasks.find(task => task.pids.includes(server.pid));
  const workerTask = snapshot.tasks.find(task => task.pids.includes(worker.pid));
  assert.ok(serverTask, 'isolated server is discoverable by cwd');
  assert.ok(serverTask.ports.some(port => port.protocol === 'tcp' && port.port === ports.tcp));
  assert.ok(serverTask.ports.some(port => port.protocol === 'udp' && port.port === ports.udp));
  assert.ok(workerTask, 'portless worker remains visible');
  assert.equal(workerTask.ports.length, 0);
  assert.equal(snapshot.tasks.some(task => task.pids.includes(process.pid)), false);
});
