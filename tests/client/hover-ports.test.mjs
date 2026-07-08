import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const output = await build({
  entryPoints: [fileURLToPath(new URL('../../src/client/hover.jsx', import.meta.url))],
  bundle: true, platform: 'node', format: 'cjs', write: false, jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'react-dom'], logLevel: 'silent',
});
const authored = { exports: {} };
new Function('require', 'module', 'exports', output.outputFiles[0].text)(createRequire(import.meta.url), authored, authored.exports);
const { HoverTaskPorts, WorkspaceHoverContent } = authored.exports;
const ports = Array.from({ length: 30 }, (_, index) => ({ protocol: index < 4 || index % 2 ? 'udp' : 'tcp', address: index === 12 ? '2001:db8::12' : '127.0.0.1', port: 40000 + index }));

test('collapsed endpoint disclosure presents four chips and an accessible +N control', () => {
  const html = renderToStaticMarkup(React.createElement(HoverTaskPorts, { ports, expanded: false, onToggle() {}, controlsId: 'ports-a' }));
  assert.equal((html.match(/class="dwm-hover-port"/g) || []).length, 4);
  assert.match(html, />\+26<\/button>/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-controls="ports-a"/);
  assert.match(html, /aria-label="Show 26 more endpoints"/);
  assert.match(html, /id="ports-a"[^>]*hidden=""/);
});

test('expanded endpoints include every protocol and full address with a collapse control', () => {
  const html = renderToStaticMarkup(React.createElement(HoverTaskPorts, { ports, expanded: true, onToggle() {}, controlsId: 'ports-b', language: 'zh' }));
  assert.equal((html.match(/class="dwm-hover-endpoint"/g) || []).length, 30);
  assert.equal((html.match(/class="dwm-hover-port"/g) || []).length, 0, 'expanded output does not repeat the compact chips');
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /aria-controls="ports-b"/);
  assert.match(html, /aria-label="收起端口列表"/);
  assert.match(html, />收起<\/button>/);
  assert.doesNotMatch(html, /id="ports-b"[^>]*hidden=/);
  assert.match(html, />TCP<\/span> \[2001:db8::12\]:40012/);
  assert.match(html, />UDP<\/span> 127\.0\.0\.1:40029/);
  for (const port of ports) assert.ok(html.includes(String(port.port)), `missing endpoint ${port.port}`);
});

test('each task owns a distinct endpoint disclosure while Stop controls remain enabled', () => {
  const execution = { state: { commands: [], commandStatus: 'ready', operations: {}, runs: [], capabilities: {}, warnings: [] }, manager: { stop() {}, run() {}, commands() {} } };
  const task = { pid: 123, command: `/usr/bin/node ${'long-command-'.repeat(20)}`, canStop: true, ports };
  const state = { target: { workspaceId: 'workspace-a', title: 'Demo', path: '/project' }, status: 'ready', snapshot: { tasks: [{ ...task, id: 'task-a' }, { ...task, id: 'task-b', pid: 124 }], warnings: [] } };
  const html = renderToStaticMarkup(React.createElement(WorkspaceHoverContent, { state, execution, language: 'en' }));
  const targets = [...html.matchAll(/aria-controls="([^"]+)"/g)].map(match => match[1]);
  assert.equal(targets.length, 2);
  assert.equal(new Set(targets).size, 2, 'two tasks must not share an expanded region');
  for (const target of targets) assert.ok(html.includes(`id="${target}"`));
  const stops = [...html.matchAll(/<button\b[^>]*data-dwm-stop[^>]*>/g)].map(match => match[0]);
  assert.equal(stops.length, 2);
  assert.equal(stops.some(button => button.includes('disabled=')), false);
});
