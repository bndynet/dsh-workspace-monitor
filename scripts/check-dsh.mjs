import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Require a real DSH installation: the compatibility suite fails instead of
// skipping, so a release check can never pass by doing nothing.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync(process.execPath, ['--test', 'tests/compat/dsh-surface.test.mjs'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, DSH_COMPAT_REQUIRED: '1' },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
