import { createHash } from 'node:crypto';
import { opendir, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { redactCommand } from '../monitor/index.mjs';

const IGNORED = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'target', '.nuxt', 'coverage', '.turbo', '.cache', 'vendor', '.venv', 'venv', '__pycache__', 'out', '.output', '.svelte-kit', '.idea', '.vscode', '.yarn', '.pnpm-store', '.dsh']);
const LOCKS = [['pnpm-lock.yaml', 'pnpm'], ['yarn.lock', 'yarn'], ['bun.lock', 'bun'], ['bun.lockb', 'bun'], ['package-lock.json', 'npm'], ['npm-shrinkwrap.json', 'npm']];
const SCRIPT_NAME = /^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,127}$/;

export class ActionError extends Error {
  constructor(code, message) { super(message); this.name = 'WorkspaceActionError'; this.code = `workspace-monitor/${code}`; }
}

export function contained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

export async function canonicalWorkspace(workspacePath) {
  if (typeof workspacePath !== 'string' || !path.isAbsolute(workspacePath)) throw new ActionError('invalid-workspace', 'Select an absolute workspace directory.');
  try {
    const canonical = await realpath(workspacePath);
    if (!(await stat(canonical)).isDirectory()) throw new Error('not-directory');
    return canonical;
  } catch { throw new ActionError('workspace-unavailable', 'The workspace directory is unavailable.'); }
}

function chooseManager(pkg, names, inherited, warnings, relative) {
  if (pkg?.packageManager !== undefined) {
    const manager = typeof pkg.packageManager === 'string' ? pkg.packageManager.match(/^(npm|pnpm|yarn|bun)(?:@|$)/)?.[1] : undefined;
    if (manager) return manager;
    warnings.push(`Unsupported packageManager in ${relative || '.'}/package.json; its scripts are omitted.`);
    return undefined;
  }
  return LOCKS.find(([name]) => names.has(name))?.[1] || inherited || 'npm';
}

/** Read package manifests only. Discovery never invokes a script or package manager. */
export async function discoverCommands({ workspacePath, signal, maxDirectories = 1000, maxDepth = 8, maxPackages = 300, maxCommands = 1000 } = {}) {
  const root = await canonicalWorkspace(workspacePath);
  signal?.throwIfAborted();
  const commands = [], warnings = [];
  const queue = [{ directory: root, depth: 0, manager: 'npm' }];
  let visited = 0, packages = 0;
  const deadline = Date.now() + 5000;
  while (queue.length && visited < maxDirectories && commands.length < maxCommands && packages < maxPackages && Date.now() < deadline) {
    signal?.throwIfAborted();
    const item = queue.shift();
    const relative = path.relative(root, item.directory).split(path.sep).join('/');
    let directory;
    try {
      const physical = await realpath(item.directory);
      if (!contained(root, physical)) { warnings.push(`Skipped directory outside workspace: ${relative}`); continue; }
      directory = await opendir(item.directory);
    } catch { warnings.push(`Could not inspect directory: ${relative || '.'}`); continue; }
    visited++;
    const names = new Set(), children = [];
    let entries = 0;
    for await (const entry of directory) {
      signal?.throwIfAborted();
      if (++entries > 4000) { warnings.push(`Directory entry limit reached: ${relative || '.'}`); break; }
      names.add(entry.name);
      if (entry.isDirectory() && !IGNORED.has(entry.name)) children.push(entry.name);
    }
    let pkg;
    if (names.has('package.json')) {
      packages++;
      try {
        const manifest = await realpath(path.join(item.directory, 'package.json'));
        if (!contained(root, manifest)) throw new Error('outside-workspace');
        const info = await stat(manifest);
        if (!info.isFile() || info.size > 1024 * 1024) throw new Error('invalid-size');
        pkg = JSON.parse(await readFile(manifest, { encoding: 'utf8', signal }));
        if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) throw new Error('invalid-manifest');
      } catch (error) {
        signal?.throwIfAborted();
        warnings.push(`Could not read a valid package.json: ${relative || '.'}`);
      }
    }
    const manager = chooseManager(pkg, names, item.manager, warnings, relative);
    if (manager && pkg?.scripts && typeof pkg.scripts === 'object' && !Array.isArray(pkg.scripts)) {
      for (const [script, definition] of Object.entries(pkg.scripts).sort(([a], [b]) => a.localeCompare(b))) {
        if (commands.length >= maxCommands) break;
        if (typeof definition !== 'string' || !definition.trim()) continue;
        if (!SCRIPT_NAME.test(script)) { warnings.push(`A script with an unsupported name was omitted from ${relative || '.'}/package.json.`); continue; }
        const packageName = typeof pkg.name === 'string' ? pkg.name.slice(0, 256) : path.basename(item.directory);
        const id = 'script-' + createHash('sha256').update(JSON.stringify([root, relative, manager, script, definition])).digest('hex').slice(0, 32);
        commands.push({
          id, label: `${packageName}: ${script}`, script, packageName,
          relativeDirectory: relative || '.', directory: item.directory, manager,
          command: `${manager} run ${script}`, definition: redactCommand(definition),
        });
      }
    }
    if (item.depth < maxDepth) {
      for (const child of children.sort()) {
        if (queue.length + visited >= maxDirectories) { warnings.push('Workspace directory scan limit reached; some subprojects may be omitted.'); break; }
        queue.push({ directory: path.join(item.directory, child), depth: item.depth + 1, manager: manager || item.manager });
      }
    } else if (children.length) warnings.push(`Directory depth limit reached: ${relative || '.'}`);
  }
  signal?.throwIfAborted();
  if (queue.length || packages >= maxPackages || commands.length >= maxCommands || Date.now() >= deadline) warnings.push('Command discovery reached its scan limit; some scripts may be omitted.');
  return { commands, warnings: [...new Set(warnings)] };
}
