import test from 'node:test';
import assert from 'node:assert/strict';
import { compactWorkspaceCommand, createHoverDismissal, createWorkspaceHover, isNativeWorkspaceHover, placeWorkspaceHover, suppressNativeWorkspaceHover, workspaceTarget, WORKSPACE_LIST_SELECTOR, WORKSPACE_ROW_SELECTOR } from '../../src/client/hover-model.mjs';

function clock() {
  let now = 0;
  let serial = 0;
  const scheduled = new Map();
  return {
    setTimer(callback, delay) { const id = ++serial; scheduled.set(id, { at: now + delay, callback }); return id; },
    clearTimer(id) { scheduled.delete(id); },
    advance(duration) {
      const end = now + duration;
      while (true) {
        const next = [...scheduled.entries()].filter(([, value]) => value.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        scheduled.delete(next[0]); now = next[1].at; next[1].callback();
      }
      now = end;
    },
  };
}
const deferred = () => { let resolve; let reject; const promise = new Promise((accept, refuse) => { resolve = accept; reject = refuse; }); return { promise, resolve, reject }; };
const target = (id = 'a') => ({ workspaceId: id, title: `Workspace ${id}`, path: `/project/${id}`, row: { isConnected: true } });
const snapshot = (id = 'a') => ({ workspacePath: `/project/${id}`, tasks: [], warnings: [], scannedAt: 1000 });
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };

test('workspace preview opens after dwell, survives entry into the popover, and closes after grace', async () => {
  const time = clock();
  const calls = [];
  const hover = createWorkspaceHover({ ...time, scan: (request, signal) => { calls.push({ request, signal }); return Promise.resolve(snapshot()); }, onChange() {} });
  hover.enter(target());
  time.advance(349); assert.equal(calls.length, 0);
  time.advance(1); await settle();
  assert.deepEqual(calls[0].request, { workspaceId: 'a', includeInfrastructure: false });
  assert.equal(hover.getState().status, 'ready');
  hover.leave(); time.advance(179); hover.keep(); time.advance(1000);
  assert.equal(hover.getState().status, 'ready');
  hover.leave(); time.advance(180);
  assert.equal(hover.getState(), null);
  assert.equal(calls[0].signal.aborted, true);
  hover.dispose();
});

test('quick re-entry before opening restarts its cancelled dwell timer', () => {
  const time = clock(); let scans = 0;
  const hover = createWorkspaceHover({ ...time, scan: () => { scans += 1; return Promise.resolve(snapshot()); }, onChange() {} });
  const row = target();
  hover.enter(row); time.advance(200); hover.leave(); time.advance(50); hover.enter(row);
  time.advance(349); assert.equal(scans, 0);
  time.advance(1); assert.equal(scans, 1);
  hover.dispose();
});

test('switching Workspace cancels the old request and never reveals its late result', async () => {
  const time = clock(); const pending = []; const changes = [];
  const hover = createWorkspaceHover({ ...time, scan: (request, signal) => { const next = deferred(); pending.push({ ...next, request, signal }); return next.promise; }, onChange: value => changes.push(value) });
  hover.enter(target('a')); time.advance(350);
  hover.enter(target('b'));
  assert.equal(pending[0].signal.aborted, true);
  assert.equal(hover.getState(), null);
  time.advance(350);
  pending[0].resolve(snapshot('a')); await settle();
  assert.equal(hover.getState().target.workspaceId, 'b');
  assert.equal(hover.getState().status, 'loading');
  pending[1].resolve(snapshot('b')); await settle();
  assert.equal(hover.getState().snapshot.workspacePath, '/project/b');
  assert.equal(changes.some(state => state?.status === 'ready' && state.target.workspaceId === 'a'), false);
  hover.dispose();
});

test('a Run/Stop click that blurs its disabled button never dismisses the preview', () => {
  const popover = { kind: 'popover' };
  const outside = { kind: 'outside' };
  const boundary = createHoverDismissal(node => node === popover);
  boundary.pointerEnter();
  assert.equal(boundary.pointerInside, true);
  assert.equal(boundary.focusOut(popover, null), 'keep', 'a disabled control blurs with no relatedTarget');
  assert.equal(boundary.focusOut(popover, outside), 'keep', 'focus cannot close a preview the pointer is still inside');
  assert.equal(boundary.pointerOut(popover, outside), 'leave');
  assert.equal(boundary.pointerInside, false);
  assert.equal(boundary.focusOut(popover, outside), 'leave', 'leaving the preview with focus still inside closes it');
  assert.equal(boundary.focusOut(popover, null), null, 'a stale blur must not cancel the pointer-leave timer');
  assert.equal(boundary.focusOut(outside, outside), null, 'focus outside the preview is ignored');
  assert.equal(boundary.pointerOut(popover, popover), 'keep', 'moving between controls keeps it open');
  assert.equal(boundary.pointerInside, true);
  boundary.pointerExit();
  assert.equal(boundary.pointerInside, false);
  assert.equal(boundary.focusOut(popover, null), null, 'a blur after pointer exit does not cancel the timer');
});

test('Escape dismissal suppresses reopening and the native card until the pointer leaves that row', async () => {
  const time = clock(); let scans = 0;
  const hover = createWorkspaceHover({ ...time, scan: () => { scans += 1; return Promise.resolve(snapshot()); }, onChange() {} });
  const row = target();
  hover.enter(row); time.advance(350); await settle(); hover.dismiss();
  assert.equal(hover.getState(), null);
  assert.equal(hover.getSuppressedTarget(), row);
  assert.equal(hover.getAnchorTarget(), row);
  hover.enter(row); time.advance(2000); assert.equal(scans, 1);
  hover.leave(); time.advance(180); assert.equal(hover.getSuppressedTarget(), null);
  hover.enter(row); time.advance(350); assert.equal(scans, 2);
  hover.dispose();
});

test('preview retries failures on demand and never polls a successful scan', async () => {
  const time = clock(); let scans = 0;
  const hover = createWorkspaceHover({ ...time, scan: () => { scans += 1; return scans === 1 ? Promise.reject(new Error('unavailable')) : Promise.resolve(snapshot()); }, onChange() {} });
  hover.enter(target()); time.advance(350); await settle();
  assert.equal(hover.getState().status, 'error');
  hover.retry(); await settle(); assert.equal(hover.getState().status, 'ready');
  time.advance(100000); assert.equal(scans, 2);
  hover.dispose();
});

test('managed-run refresh skips a slow scan instead of aborting or overlapping it', async () => {
  const time = clock(); const pending = [];
  const hover = createWorkspaceHover({ ...time, scan: (_request, signal) => { const result = deferred(); pending.push({ ...result, signal }); return result.promise; }, onChange() {} });
  hover.enter(target()); time.advance(350);
  hover.refresh({ skipIfBusy: true }); hover.refresh({ skipIfBusy: true });
  assert.equal(pending.length, 1);
  assert.equal(pending[0].signal.aborted, false);
  pending[0].resolve(snapshot()); await settle();
  hover.refresh({ skipIfBusy: true }); hover.refresh({ skipIfBusy: true });
  assert.equal(pending.length, 2);
  assert.equal(pending[1].signal.aborted, false);
  assert.equal(hover.getState().status, 'ready', 'background refresh retains the visible snapshot');
  pending[1].resolve(snapshot()); await settle(); hover.dispose();
});

test('an action refresh still supersedes an old scan so stop results cannot remain stale', async () => {
  const time = clock(); const pending = [];
  const hover = createWorkspaceHover({ ...time, scan: (_request, signal) => { const result = deferred(); pending.push({ ...result, signal }); return result.promise; }, onChange() {} });
  hover.enter(target()); time.advance(350);
  hover.refresh();
  assert.equal(pending.length, 2);
  assert.equal(pending[0].signal.aborted, true);
  pending[1].resolve({ ...snapshot(), tasks: [] }); await settle();
  pending[0].resolve({ ...snapshot(), tasks: [{ id: 'already-stopped' }] }); await settle();
  assert.deepEqual(hover.getState().snapshot.tasks, []);
  hover.dispose();
});

test('unload cancels pending timers and requests without publishing their late results', async () => {
  const time = clock(); const pending = deferred(); const changes = []; let signal;
  const hover = createWorkspaceHover({ ...time, scan: (_request, value) => { signal = value; return pending.promise; }, onChange: state => changes.push(state) });
  hover.enter(target()); time.advance(350); hover.dispose();
  const count = changes.length;
  assert.equal(signal.aborted, true);
  pending.resolve(snapshot()); await settle(); time.advance(10000);
  assert.equal(changes.length, count);
  const never = createWorkspaceHover({ ...time, scan: () => assert.fail('disposed dwell must not scan'), onChange() {} });
  never.enter(target()); never.dispose(); time.advance(1000);
});

test('only verified Workspace rows in the sidebar can produce a scan target', () => {
  const workspaces = [{ workspaceId: 'a', title: 'App', path: '/project/a' }];
  const row = { getAttribute: () => 'workspace:a', closest: selector => selector === WORKSPACE_LIST_SELECTOR ? {} : null };
  const node = { closest: selector => selector === WORKSPACE_ROW_SELECTOR ? row : null };
  assert.deepEqual(workspaceTarget(node, workspaces), { row, workspaceId: 'a', title: 'App', path: '/project/a' });
  assert.equal(workspaceTarget(node, []), null);
  row.getAttribute = () => 'workspace:ungrouped'; assert.equal(workspaceTarget(node, workspaces), null);
  row.getAttribute = () => 'workspace:a'; row.closest = () => null; assert.equal(workspaceTarget(node, workspaces), null);
});

test('popover placement fits right, left and narrow viewports', () => {
  const right = placeWorkspaceHover({ left: 10, right: 250, top: 100, bottom: 134 }, { width: 1200, height: 800 }, 220);
  assert.equal(right.left, 258); assert.equal(right.top, 100); assert.equal(right.width, 344);
  const left = placeWorkspaceHover({ left: 850, right: 1100, top: 700, bottom: 734 }, { width: 1200, height: 800 }, 220);
  assert.equal(left.left, 498); assert.equal(left.top, 570);
  const narrow = placeWorkspaceHover({ left: 10, right: 250, top: 100, bottom: 134 }, { width: 320, height: 500 }, 220);
  assert.equal(narrow.width, 300); assert.equal(narrow.left, 10); assert.equal(narrow.top, 142);
});

test('very tall expanded endpoints stay capped inside a small viewport', () => {
  const placement = placeWorkspaceHover({ left: 10, right: 250, top: 50, bottom: 84 }, { width: 320, height: 200 }, 5000);
  assert.equal(placement.maxHeight, 180);
  assert.ok(placement.top >= 10);
  assert.ok(placement.top + placement.maxHeight <= 190);
  assert.ok(placement.left >= 10);
  assert.ok(placement.left + placement.width <= 310);
});

test('command display shortens the executable and exact workspace path without changing sibling paths', () => {
  assert.equal(compactWorkspaceCommand('/usr/local/bin/node /projects/app/server.mjs', '/projects/app'), 'node ./server.mjs');
  assert.equal(compactWorkspaceCommand('java -jar "/projects/my app/app.jar"', '/projects/my app'), 'java -jar "./app.jar"');
  assert.equal(compactWorkspaceCommand('/usr/bin/node /projects/app-other/server.mjs', '/projects/app'), 'node /projects/app-other/server.mjs');
  assert.equal(compactWorkspaceCommand('"C:\\Program Files\\nodejs\\node.exe" "C:\\project\\server.mjs"', 'C:\\project'), 'node.exe "./server.mjs"');
  assert.equal(compactWorkspaceCommand('npm run dev', '/projects/app'), 'npm run dev');
});

function nativeCard(path, { fade = '100ms', role = 'button' } = {}) {
  const attrs = new Map([['role', role], ['aria-label', `Copy: ${path}`]]);
  return {
    style: { getPropertyValue: name => name === '--dsh-hover-preview-fade' ? fade : '' },
    getAttribute: name => attrs.has(name) ? attrs.get(name) : null,
    setAttribute: (name, value) => attrs.set(name, value), removeAttribute: name => attrs.delete(name),
  };
}

test('native hover suppression affects only the matching path and restores only its own markers', () => {
  const match = nativeCard('/project/a'); const other = nativeCard('/project/b'); const unrelated = nativeCard('/project/a', { fade: '' });
  const cards = [match, other, unrelated]; let observer; let disconnected = false;
  class Observer {
    constructor(callback) { this.callback = callback; observer = this; }
    observe(node, options) { assert.equal(node, document.body); assert.deepEqual(options, { childList: true }); }
    disconnect() { disconnected = true; }
  }
  const document = { body: {}, querySelectorAll: selector => { assert.equal(selector, 'body > span > div[role="button"][aria-label][style]'); return cards; } };
  const clean = suppressNativeWorkspaceHover(document, '/project/a', Observer);
  assert.equal(match.getAttribute('data-dwm-native-workspace-hover'), 'active');
  assert.equal(other.getAttribute('data-dwm-native-workspace-hover'), null);
  assert.equal(unrelated.getAttribute('data-dwm-native-workspace-hover'), null);
  const late = nativeCard('/project/a'); cards.push(late); observer.callback();
  assert.equal(late.getAttribute('data-dwm-native-workspace-hover'), 'active');
  late.setAttribute('data-dwm-native-workspace-hover', 'new-owner');
  clean();
  assert.equal(disconnected, true);
  assert.equal(match.getAttribute('data-dwm-native-workspace-hover'), null);
  assert.equal(late.getAttribute('data-dwm-native-workspace-hover'), 'new-owner');
  assert.equal(isNativeWorkspaceHover(match, '/project'), false);
});
