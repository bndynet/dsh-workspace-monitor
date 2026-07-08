import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { discoverCommands } from '../../src/actions/index.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'dsh-monitor-catalog-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const pkg = async (relative, value) => {
    const directory = path.join(root, relative);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'package.json'), JSON.stringify(value));
  };
  return { root, pkg };
}

test('discovery lists root and subproject scripts without executing them', async t => {
  const { root, pkg } = await fixture(t);
  const marker = path.join(root, 'should-not-exist');
  await pkg('', { name: 'workspace', packageManager: 'pnpm@10.0.0', scripts: { dev: `node -e "require('fs').writeFileSync('${marker}','bad')"` } });
  await pkg('apps/web', { name: 'web', scripts: { dev: 'vite', build: 'vite build' } });
  await pkg('node_modules/hidden', { scripts: { hidden: 'should-not-run' } });
  await pkg('dist/hidden', { scripts: { hidden: 'should-not-run' } });
  await pkg('target/hidden', { scripts: { hidden: 'should-not-run' } });
  const result = await discoverCommands({ workspacePath: root });
  assert.equal(result.commands.length, 3);
  assert.ok(result.commands.every(command => command.manager === 'pnpm'));
  assert.deepEqual(result.commands.map(command => command.relativeDirectory), ['.', 'apps/web', 'apps/web']);
  assert.match(result.commands[0].id, /^script-[a-f0-9]{32}$/);
  await assert.rejects(readFile(marker), { code: 'ENOENT' });
});

test('packageManager and local lock files select the proper explicit manager', async t => {
  const { root, pkg } = await fixture(t);
  await pkg('', { scripts: { dev: 'node app.js' } });
  await writeFile(path.join(root, 'yarn.lock'), '');
  await pkg('apps/api', { scripts: { dev: 'node api.js' } });
  await writeFile(path.join(root, 'apps/api', 'bun.lock'), '');
  await pkg('apps/ui', { packageManager: 'npm@10.0.0', scripts: { dev: 'vite' } });
  await writeFile(path.join(root, 'apps/ui', 'pnpm-lock.yaml'), '');
  const result = await discoverCommands({ workspacePath: root });
  assert.deepEqual(Object.fromEntries(result.commands.map(command => [command.relativeDirectory, command.manager])), { '.': 'yarn', 'apps/api': 'bun', 'apps/ui': 'npm' });
});

test('definition, manager and directory are bound into opaque command identities', async t => {
  const { root, pkg } = await fixture(t);
  await pkg('', { scripts: { dev: 'node original.js' } });
  const first = (await discoverCommands({ workspacePath: root })).commands[0];
  assert.equal((await discoverCommands({ workspacePath: root })).commands[0].id, first.id);
  await pkg('', { scripts: { dev: 'node changed.js' } });
  const changed = (await discoverCommands({ workspacePath: root })).commands[0];
  assert.notEqual(changed.id, first.id);
  await pkg('', { packageManager: 'pnpm@10', scripts: { dev: 'node changed.js' } });
  assert.notEqual((await discoverCommands({ workspacePath: root })).commands[0].id, changed.id);
});

test('discovery skips symlinked directories and manifests outside the workspace', async t => {
  const { root, pkg } = await fixture(t);
  const outside = await mkdtemp(path.join(tmpdir(), 'dsh-monitor-catalog-outside-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await writeFile(path.join(outside, 'package.json'), JSON.stringify({ scripts: { escaped: 'node evil.js' } }));
  await symlink(outside, path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  await pkg('app', { scripts: { allowed: 'node app.js' } });
  await mkdir(path.join(root, 'manifest-link'));
  await symlink(path.join(outside, 'package.json'), path.join(root, 'manifest-link', 'package.json'));
  const result = await discoverCommands({ workspacePath: root });
  assert.deepEqual(result.commands.map(command => command.script), ['allowed']);
  assert.ok(result.warnings.some(warning => warning.includes('manifest-link')));
});

test('large-repository bounds are visible and prevent unrestricted traversal', async t => {
  const { root, pkg } = await fixture(t);
  for (const name of ['a', 'b', 'c', 'd']) await pkg(`apps/${name}`, { scripts: { dev: 'node app.js' } });
  const result = await discoverCommands({ workspacePath: root, maxDirectories: 2 });
  assert.equal(result.commands.length, 0);
  assert.ok(result.warnings.some(warning => /limit/.test(warning)));
});

test('invalid and unsupported manifests do not become executable commands', async t => {
  const { root, pkg } = await fixture(t);
  await pkg('', { scripts: { safe: 'node app.js', '--bad-flag': 'echo bad', 'name with spaces': 'echo bad', invalid: 42 } });
  await pkg('unsupported', { packageManager: 'custom-tool@1', scripts: { dev: 'echo no' } });
  await mkdir(path.join(root, 'malformed'));
  await writeFile(path.join(root, 'malformed/package.json'), '{ malformed');
  const result = await discoverCommands({ workspacePath: root });
  assert.deepEqual(result.commands.map(command => command.script), ['safe']);
  assert.ok(result.warnings.length >= 3);
});

test('catalog definitions redact credentials and cancellation prevents discovery', async t => {
  const { root, pkg } = await fixture(t);
  await pkg('', { scripts: { dev: 'node app.js --token=fixture-private-token' } });
  const result = await discoverCommands({ workspacePath: root });
  assert.equal(JSON.stringify(result).includes('fixture-private-token'), false);
  assert.ok(result.commands[0].definition.includes('[redacted]'));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(discoverCommands({ workspacePath: root, signal: controller.signal }), { name: 'AbortError' });
});
