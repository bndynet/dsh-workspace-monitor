import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const require = createRequire(import.meta.url);

test('the prebuilt browser artifact loads through the real DSH factory protocol', async () => {
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  const code = await readFile(new URL('lib/client.js', root), 'utf8');
  let registered;
  vm.runInNewContext(code, { window: { __ModuleLoader__: { load(entry) { registered = entry; } } } });
  assert.equal(registered.id, pkg.name);
  const imports = [];
  const client = registered.factory(id => {
    imports.push(id);
    assert.ok(['react', 'react/jsx-runtime', 'react-dom'].includes(id), `Unexpected browser dependency: ${id}`);
    return require(id);
  });
  assert.equal(typeof client.apply, 'function');
  assert.ok(client.inject.includes('connection'));
  assert.ok(imports.includes('react'), 'React must be supplied by the Host module table');
  assert.equal(pkg.dsh.client.platform, 'web');
  assert.equal(pkg.exports['./client'], './lib/client.js');
});

test('the prebuilt Host entry imports without development dependencies', async () => {
  const host = await import('../../lib/index.js');
  assert.equal(typeof host.apply, 'function');
  assert.deepEqual(host.inject, ['connection', 'sessions', 'sessionPersistence', 'jobs', 'workspaceRegistry']);
});
