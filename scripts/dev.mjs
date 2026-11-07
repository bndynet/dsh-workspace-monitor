import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const home = resolve(process.env.DSH_DEV_HOME || resolve(root, '.dsh-dev'));
const passthrough = process.argv.slice(2);
const has = name => passthrough.some(argument => argument === name || argument.startsWith(`${name}=`));

// Isolate the development profile so this checkout never touches the daily DSH home.
// Extra CLI arguments still win, e.g. `npm run dev -- --port 3082`.
const args = ['web'];
if (!has('--port')) args.push('--port', '3081');
if (!has('--no-open')) args.push('--no-open');
args.push(...passthrough);

console.log(`[dev] DSH_HOME=${home}`);
const child = spawn(process.env.DSH_BIN || 'dsh', args, {
  stdio: 'inherit',
  env: { ...process.env, DSH_HOME: home },
  shell: process.platform === 'win32',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { if (!child.killed) child.kill(signal); });
}

child.once('error', error => {
  console.error(`[dev] Could not start dsh: ${error.message}`);
  process.exitCode = 1;
});

child.once('exit', (code, signal) => {
  process.exitCode = signal ? (signal === 'SIGINT' ? 130 : 1) : code ?? 1;
});
