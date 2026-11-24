import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Contract checks against a real DSH installation. They catch a release that
// removes a service, slot, module id, or the compatibility range itself, so a
// broken upgrade fails `npm test` instead of silently dropping the plugin.
// Without a local DSH they skip; `npm run check:dsh` requires one and fails.

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const requireDsh = process.env.DSH_COMPAT_REQUIRED === '1';
const skipWithoutDsh = 'No DSH installation found; set DSH_INSTALL_DIR or install dsh to run the live surface check.';

function dshManifestAt(dir) {
  const file = join(dir, 'package.json');
  if (!existsSync(file)) return undefined;
  try {
    const manifest = JSON.parse(readFileSync(file, 'utf8'));
    return manifest.name === '@deepseek-ai/dsh' ? { dir, manifest } : undefined;
  } catch {
    return undefined;
  }
}

function dshFromPath() {
  try {
    const lookup = process.platform === 'win32' ? 'where' : 'which';
    const found = execFileSync(lookup, ['dsh'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split(/\r?\n/).map(line => line.trim()).find(Boolean);
    if (!found) return undefined;
    let dir = dirname(realpathSync(found));
    for (let depth = 0; depth < 6; depth += 1) {
      const candidate = dshManifestAt(dir);
      if (candidate) return candidate;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch { /* dsh is not on PATH */ }
  return undefined;
}

function locateDsh() {
  const explicit = [
    process.env.DSH_INSTALL_DIR && resolve(process.env.DSH_INSTALL_DIR),
    process.env.DSH_PACKAGE_JSON && dirname(resolve(process.env.DSH_PACKAGE_JSON)),
    join(root, 'node_modules/@deepseek-ai/dsh'),
  ].filter(Boolean);
  for (const dir of explicit) {
    const found = dshManifestAt(dir);
    if (found) return found;
  }
  return dshFromPath();
}

const dsh = locateDsh();

/** Load one shipped package's source text for a surface assertion. */
function source(dshDir, packageName, relativePath) {
  const file = join(dshDir, 'node_modules', ...packageName.split('/'), relativePath);
  assert.ok(existsSync(file), `${packageName} no longer ships ${relativePath}; the DSH API this plugin uses may have moved.`);
  return readFileSync(file, 'utf8');
}

function surfaceTest(name, check) {
  test(name, async t => {
    if (!dsh) {
      if (requireDsh) assert.fail(`${skipWithoutDsh} (npm run check:dsh requires it)`);
      return t.skip(skipWithoutDsh);
    }
    await check(t, dsh);
  });
}

surfaceTest('the declared DSH range accepts the installed release through DSH\'s own check', async (_t, found) => {
  const appBoot = await import(pathToFileURL(join(found.dir, 'node_modules/@deepseek-ai/dsh-app-boot/lib/index.js')).href);
  const runtimeVersion = appBoot.getDshRuntimeVersion();
  assert.equal(runtimeVersion, found.manifest.version, 'App-boot and dsh package versions disagree; the profile may mix installations.');
  const issue = appBoot.evaluatePluginCompatibility(pkg, {}, runtimeVersion);
  assert.equal(issue, undefined,
    `engines.dsh "${pkg.engines.dsh}" rejects DSH ${runtimeVersion}. Verify this release with "npm run check:dsh", then widen the range and docs/COMPATIBILITY.md.`);
});

test('engines.dsh stays a bounded range instead of one exact version', () => {
  const range = pkg.engines?.dsh;
  assert.equal(typeof range, 'string');
  assert.match(range, /^\s*>=/, 'engines.dsh must keep a lower bound so older supported releases keep working.');
  assert.match(range, /<(?!=)/, 'engines.dsh must keep an upper bound so an unverified major/minor line is not claimed.');
});

surfaceTest('every injected Web client module still resolves with its client entry', async (_t, found) => {
  for (const id of pkg.dsh.client.inject) {
    const dir = join(found.dir, 'node_modules', ...id.split('/'));
    assert.ok(existsSync(join(dir, 'package.json')), `${id} is no longer installed with DSH.`);
    const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    const client = manifest.exports?.['./client'];
    assert.ok(client !== undefined, `${id} no longer exports ./client; update dsh.client.inject.`);
    const target = typeof client === 'string' ? client : client.browser ?? client.default;
    assert.ok(typeof target === 'string' && existsSync(join(dir, target)), `${id} ./client does not resolve to a bundled file.`);
  }
});

surfaceTest('Host services used by the plugin still exist', async (_t, found) => {
  const services = [
    ['connection', '@deepseek-ai/dsh-client-connection', 'src/rpc-host.ts', /super\(ctx,\s*'connection'\)/],
    ['sessions', '@deepseek-ai/dsh-session', 'src/index.ts', /super\(ctx,\s*'sessions'\)/],
    ['sessionPersistence', '@deepseek-ai/dsh-session-persistence', 'src/index.ts', /super\(ctx,\s*'sessionPersistence'\)/],
    ['jobs', '@deepseek-ai/dsh-jobs', 'src/index.ts', /super\(ctx,\s*'jobs'\)/],
    ['workspaceRegistry', '@deepseek-ai/dsh-workspace', 'src/index.ts', /super\(ctx,\s*'workspaceRegistry'\)/],
  ];
  for (const [name, packageName, file, pattern] of services) {
    assert.match(source(found.dir, packageName, file), pattern, `Host service "${name}" changed; update inject and the scan scope lookup.`);
  }
  const host = source(found.dir, '@deepseek-ai/dsh-client-connection', 'src/rpc-host.ts');
  assert.match(host, /fetchRoutes|registerFetchRoute/, 'connection.fetch route registration changed; update createFetchHandler and apply.');
});

surfaceTest('Client services and slots used by the plugin still exist', async (_t, found) => {
  assert.match(source(found.dir, '@deepseek-ai/dsh-client-ui-renderer', 'src/client/registry.ts'), /super\(ctx,\s*'slots'\)/, 'The slots service changed.');
  assert.match(source(found.dir, '@deepseek-ai/dsh-client-ui-sidebar-right', 'src/client/index.ts'), /provide\('sidebarRightTabs'/, 'The sidebarRightTabs service changed.');
  assert.match(source(found.dir, '@deepseek-ai/dsh-client-ui-workspace', 'src/client/navigation.ts'), /super\(ctx,\s*'uiWorkspace'\)/, 'The uiWorkspace service changed.');
  assert.match(source(found.dir, '@deepseek-ai/dsh-client-connection', 'src/client/index.ts'), /provide\('connection'/, 'The client connection service changed.');
  assert.match(source(found.dir, '@deepseek-ai/dsh-client-ui-layout', 'src/client/index.ts'), /'shell\.overlay'/, 'The shell.overlay slot changed.');
  assert.match(source(found.dir, '@deepseek-ai/dsh-client-ui-sidebar-right', 'src/client/index.ts'), /'sidebar\.right\.pane\.tab'/, 'The sidebar.right.pane.tab slot changed.');
});
