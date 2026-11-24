import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { copy } from '../../src/client/copy.mjs';

// Exercise the authored JSX without depending on a running DSH or generated artifacts.
const output = await build({
  entryPoints: [fileURLToPath(new URL('../../src/client/index.jsx', import.meta.url))],
  bundle: true, platform: 'node', format: 'cjs', write: false, jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'react-dom'], logLevel: 'silent',
});
const authored = { exports: {} };
new Function('require', 'module', 'exports', output.outputFiles[0].text)(createRequire(import.meta.url), authored, authored.exports);
const { MonitorPanel, Task, WorkspaceHoverContent, CommandCatalog, ManagedRuns, StopButton, StopFeedback, apply, ID, KIND } = authored.exports;

test('panel renders the no-workspace state in either language without scanning', () => {
  let scans = 0;
  const scan = () => { scans += 1; };
  const zh = renderToStaticMarkup(React.createElement(MonitorPanel, { scan, language: 'zh' }));
  const en = renderToStaticMarkup(React.createElement(MonitorPanel, { scan, language: 'en' }));
  assert.match(zh, /选择一个项目/);
  assert.match(en, /Choose a workspace/);
  assert.equal(scans, 0);
  assert.doesNotMatch(zh, /data-dwm-refresh/);
});

test('command and child process text is escaped and no-port tasks remain visible', () => {
  const task = { id: 'test', pid: 123, runtime: 'node', command: '</code><script>bad()</script>', cwd: '/project', match: 'cwd', ports: [], processes: [{ pid: 123, ppid: 1, command: '<img src=x onerror=bad()>' }] };
  const html = renderToStaticMarkup(React.createElement(Task, { task, expanded: true, toggle() {}, text: copy.en, onCopy() {} }));
  assert.match(html, /No listening ports/);
  assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>|<img /);
  assert.match(html, /aria-expanded="true"/);
});

test('IPv6 details are displayed as copyable endpoints without localhost navigation', () => {
  const task = { id: 'tcp', pid: 123, command: 'node app.js', cwd: '/project', ports: [{ protocol: 'tcp', address: '::', port: 5173 }], processes: [] };
  const html = renderToStaticMarkup(React.createElement(Task, { task, expanded: true, toggle() {}, text: copy.en, onCopy() {} }));
  assert.match(html, /\[::\]:5173/);
  assert.doesNotMatch(html, /href=/);
});

test('plugin registers an addressable sidebar tab and routes scans through DSH Connection', async () => {
  let definition;
  let options;
  let component;
  const registrations = [];
  const calls = [];
  const ctx = {
    effect: register => register(),
    sidebarRightTabs: { register: value => { definition = value; return () => {}; } },
    slots: {
      inject: (_name, register) => { register(); return () => {}; },
      register: (value, view) => { registrations.push({ options: value, component: view }); return () => {}; },
    },
    connection: { rpc: { call: (...args) => { calls.push(args); return Promise.resolve({ ok: true, value: { tasks: [], workspacePath: '/project' } }); } } },
  };
  apply(ctx);
  ({ options, component } = registrations.find(entry => entry.options.name === 'sidebar.right.pane.tab'));
  assert.equal(definition.id, ID);
  assert.equal(definition.kind, KIND);
  assert.equal(definition.guide[0].id, 'running-tasks');
  assert.equal(options.name, 'sidebar.right.pane.tab');
  assert.equal(options.key, ID);
  assert.equal(typeof component, 'function');
  const request = { sessionId: 'session-1', includeInfrastructure: false };
  const controller = new AbortController();
  const first = options.inject();
  assert.equal(first.scan, options.inject().scan, 'scan callback stays stable across injected props');
  await first.scan(request, controller.signal);
  assert.deepEqual(calls, [['/api', 'workspace-monitor/scan', request, controller.signal]]);
  const overlay = registrations.find(entry => entry.options.name === 'shell.overlay');
  assert.equal(overlay.options.id, `${ID}-hover`);
  await overlay.options.inject().scan({ workspaceId: 'workspace-2', includeInfrastructure: false }, controller.signal);
  assert.deepEqual(calls[1], ['/api', 'workspace-monitor/scan', { workspaceId: 'workspace-2', includeInfrastructure: false }, controller.signal]);
  assert.equal(first.actions, options.inject().actions, 'action callbacks stay stable across injected props');
  for (const endpoint of ['commands', 'run', 'stop', 'output']) {
    await first.actions[endpoint]({ workspaceId: 'workspace-2' }, controller.signal);
    assert.deepEqual(calls.at(-1), ['/api', `workspace-monitor/${endpoint}`, { workspaceId: 'workspace-2' }, controller.signal]);
  }
});

test('a changed sidebar tab API does not unregister the panel and hover preview', () => {
  const names = [];
  const failures = [];
  const original = console.error;
  console.error = (...args) => failures.push(args);
  try {
    apply({
      effect: register => register(),
      sidebarRightTabs: { register: () => { throw new Error('tab API changed'); } },
      slots: {
        inject: (_name, register) => { register(); return () => {}; },
        register: value => { names.push(value.name); return () => {}; },
      },
      connection: { rpc: { call: () => Promise.resolve({ ok: true, value: {} }) } },
    });
  } finally {
    console.error = original;
  }
  assert.deepEqual(names, ['sidebar.right.pane.tab', 'shell.overlay']);
  assert.equal(failures.length, 1);
  assert.match(String(failures[0][0]), /sidebar tab API/);
});

test('workspace preview limits commands, keeps full titles and shows remaining tasks', () => {
  const tasks = Array.from({ length: 7 }, (_, index) => ({ id: `task-${index}`, pid: 100 + index, command: `/usr/bin/node /project/server-${index}.mjs`, ports: index === 0 ? [{ protocol: 'tcp', address: '::', port: 5173 }] : [] }));
  const state = { target: { title: 'Demo', path: '/project' }, status: 'ready', snapshot: { tasks, warnings: [] } };
  const html = renderToStaticMarkup(React.createElement(WorkspaceHoverContent, { state, language: 'en', headingId: 'hover-title' }));
  assert.equal((html.match(/data-dwm-hover-task/g) || []).length, 5);
  assert.match(html, /node \.\/server-0\.mjs<\/code>/);
  assert.match(html, /title="\/usr\/bin\/node \/project\/server-0\.mjs(?:\r?\n|&#10;|&#xA;)PID 100"/);
  assert.match(html, /5173/);
  assert.match(html, /\+2 more tasks/);
  assert.match(html, /dwm-hover-no-port">—/);
  assert.doesNotMatch(html, /href=/);
});

test('workspace preview has loading, empty and retry states without rendering server error details', () => {
  const target = { title: 'Demo', path: '/project' };
  const loading = renderToStaticMarkup(React.createElement(WorkspaceHoverContent, { state: { target, status: 'loading' }, language: 'zh' }));
  assert.match(loading, /正在读取运行任务/);
  const empty = renderToStaticMarkup(React.createElement(WorkspaceHoverContent, { state: { target, status: 'ready', snapshot: { tasks: [] } }, language: 'en' }));
  assert.match(empty, /No running tasks found/);
  const failed = renderToStaticMarkup(React.createElement(WorkspaceHoverContent, { state: { target, status: 'error', error: new Error('internal detail') }, language: 'en', onRetry() {} }));
  assert.match(failed, /Try again/);
  assert.doesNotMatch(failed, /internal detail/);
});

test('compact preview offers one Stop per active run but omits run history and scan warnings', () => {
  const active = { id: 'run-dev', runId: 'run-dev', commandId: 'root:dev', label: 'npm run dev', command: 'npm run dev', status: 'running', startedAt: 2000 };
  const failed = { id: 'run-broken', runId: 'run-broken', commandId: 'root:broken', label: 'npm run broken', command: 'npm run broken', status: 'failed', exitCode: 19, startedAt: 1000 };
  const execution = {
    state: {
      commandStatus: 'ready', operations: {}, capabilities: {}, warnings: [], runs: [],
      commands: [
        { id: 'root:dev', label: 'dev', script: 'dev', relativeDirectory: '.', command: 'npm run dev', definition: 'node server.mjs', canRun: true },
        { id: 'root:check', label: 'check', script: 'check', relativeDirectory: '.', command: 'npm run check', definition: 'node check.mjs', canRun: true },
      ],
    },
    manager: { run() {}, stop() {}, commands() {} },
  };
  const render = tasks => renderToStaticMarkup(React.createElement(WorkspaceHoverContent, {
    state: { target: { title: 'Demo', path: '/project' }, status: 'ready', snapshot: { tasks, runs: [active, failed], warnings: ['Some process details could not be read.'] } },
    execution, language: 'en',
  }));
  const scanned = render([{ id: 'task-dev', runId: 'run-dev', pid: 123, command: 'node /project/server.mjs', canStop: true, ports: [{ protocol: 'tcp', address: '127.0.0.1', port: 5173 }] }]);
  const pending = render([]);
  for (const html of [scanned, pending]) {
    assert.equal((html.match(/data-dwm-stop=/g) || []).length, 1, 'an active run has exactly one Stop control');
    assert.match(html, /aria-label="Run command: check"/, 'other runnable scripts remain available');
    assert.doesNotMatch(html, /Failed · Exit 19/, 'run history stays out of the hover preview');
    assert.doesNotMatch(html, /Some process details/, 'scan warnings stay out of the hover preview');
  }
  assert.match(scanned, /5173/);
  assert.doesNotMatch(scanned, /data-dwm-command-id="root:dev"/, 'a scanned run uses its task row instead of a duplicate catalog row');
  assert.match(pending, /data-dwm-command-id="root:dev"/, 'a run still awaiting OS discovery stays controllable through its command row');
});

test('workspace hover groups deeper processes under the managed script and keeps their ports', () => {
  const active = { id: 'run-dev', runId: 'run-dev', commandId: 'root:dev', command: 'npm run dev', status: 'running', pid: 123 };
  const execution = { state: { runs: [], operations: {}, commands: [], commandStatus: 'ready' }, manager: { stop() {} } };
  const tasks = [
    { id: 'task-dev', runId: 'run-dev', pid: 123, pids: [123, 124], command: '/bin/sh -c npm run dev', processes: [{ pid: 123, ppid: 10, command: '/bin/sh -c npm run dev' }, { pid: 124, ppid: 123, command: 'npm run dev' }], ports: [] },
    { id: 'task-vite', pid: 125, pids: [125], command: 'node /project/node_modules/vite/bin/vite.js', processes: [{ pid: 125, ppid: 124, command: 'node /project/node_modules/vite/bin/vite.js' }], ports: [{ protocol: 'tcp', address: '127.0.0.1', port: 5173 }] },
    { id: 'task-other', pid: 500, pids: [500], command: 'node /project/worker.js', processes: [{ pid: 500, ppid: 1, command: 'node /project/worker.js' }], ports: [] },
  ];
  const html = renderToStaticMarkup(React.createElement(WorkspaceHoverContent, {
    state: { target: { title: 'Demo', path: '/project' }, status: 'ready', snapshot: { tasks, runs: [active], warnings: [] } },
    execution, language: 'zh',
  }));

  assert.equal((html.match(/data-dwm-hover-task/g) || []).length, 2, 'the descendant scanner row is collapsed into the managed run');
  assert.match(html, /npm run dev/);
  assert.match(html, /显示 2 条子进程命令/);
  assert.match(html, /vite\/bin\/vite\.js/);
  assert.match(html, /5173/, 'ports from collapsed descendants remain visible');
  assert.match(html, /worker\.js/, 'independent workspace processes remain visible');
});

test('stop controls respect server ownership decisions and remain separate from task expansion buttons', () => {
  const denied = renderToStaticMarkup(React.createElement(StopButton, { task: { id: 'weak', command: 'node app.js', canStop: false, stopReason: 'weak command-only ownership' }, onStop() {} }));
  assert.match(denied, /disabled=""/); assert.match(denied, /weak command-only ownership/);
  const task = { id: 'task', pid: 12, command: 'node app.js', cwd: '/project', ports: [], canStop: true };
  const html = renderToStaticMarkup(React.createElement(Task, { task, expanded: true, toggle() {}, text: copy.en, onCopy() {}, onStop() {} }));
  assert.match(html, /aria-label="Stop task: node app.js"/);
  assert.equal([...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)].some(match => match[1].includes('<button')), false);
  const stopping = renderToStaticMarkup(React.createElement(StopButton, { task, operation: { result: { status: 'stopping' } }, onStop() {}, language: 'zh' }));
  assert.match(stopping, /停止中/); assert.match(stopping, /disabled=""/);
});

test('script catalog shows nested package scripts and definitions with explicit Run buttons', () => {
  const state = { commandStatus: 'ready', commands: [{ id: 'frontend:dev', label: 'frontend dev', script: 'dev', packageName: 'frontend', relativeDirectory: 'apps/frontend', directory: '/project/apps/frontend', command: 'npm run dev', definition: 'vite --host <script>', canRun: true }], operations: {}, capabilities: {}, warnings: [] };
  const html = renderToStaticMarkup(React.createElement(CommandCatalog, { state, onRun() {}, language: 'en' }));
  assert.match(html, /apps\/frontend/); assert.match(html, /npm run dev/); assert.match(html, /vite --host &lt;script&gt;/);
  assert.match(html, /aria-label="Run command: frontend dev"/); assert.doesNotMatch(html, /<input/);
  const blocked = renderToStaticMarkup(React.createElement(CommandCatalog, { state: { ...state, capabilities: { canRun: false } }, onRun() {} }));
  assert.match(blocked, /disabled=""/); assert.match(blocked, /Running commands is unavailable/);
});

test('managed immediate exits show failure and exit code; compact views omit logs', () => {
  const run = { id: 'r1', runId: 'r1', label: 'npm run broken', status: 'failed', exitCode: 19, startedAt: 1 };
  const full = renderToStaticMarkup(React.createElement(ManagedRuns, { runs: [run], operations: {}, language: 'en' }));
  assert.match(full, /Failed · Exit 19/); assert.match(full, /Output/);
  const compact = renderToStaticMarkup(React.createElement(ManagedRuns, { runs: [run], operations: {}, language: 'zh', compact: true }));
  assert.match(compact, /失败 · 退出码 19/); assert.doesNotMatch(compact, /输出日志/);
});

test('partial stop feedback never claims the entire task has stopped', () => {
  const html = renderToStaticMarkup(React.createElement(StopFeedback, { operation: { result: { status: 'partial' } }, language: 'zh' }));
  assert.match(html, /部分进程仍在运行/); assert.doesNotMatch(html, /已停止/);
});
