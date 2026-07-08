import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdir, readFile, readlink, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

const MAX_OUTPUT = 8 * 1024 * 1024;
const SECRET_OPTION = '(?:password|passwd|pwd|token|access[-_]?token|auth[-_]?token|api[-_]?key|secret|client[-_]?secret|authorization|credential)';
const asArray = value => value == null ? [] : Array.isArray(value) ? value : [value];
const abortCheck = signal => signal?.throwIfAborted();
const safeNumber = value => Number.isSafeInteger(Number(value)) ? Number(value) : undefined;

/** Process arguments can contain credentials. Never read process environments. */
export function redactCommand(command = '') {
  return String(command)
    .replace(/(\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:)[^\s@]+(@)/gi, '$1[redacted]$2')
    .replace(/(\bBearer\s+)[A-Za-z0-9._~+\/-]+=*/gi, '$1[redacted]')
    // argv renderers may quote a whole option ("--token=a b"), rather than
    // just its value (--token="a b"). Mask the entire quoted option value.
    .replace(/(["'])([^"'\n]*)\1/g, (whole, quote, body) => quote + body.replace(new RegExp(`((?:--?|\\b)${SECRET_OPTION}(?:\\s*[=:]\\s*|\\s+)).+$`, 'i'), '$1[redacted]') + quote)
    .replace(/((?:--?|\b)(?:password|passwd|pwd|token|access[-_]?token|auth[-_]?token|api[-_]?key|secret|client[-_]?secret|authorization|credential)(?:\s*[=:]\s*|\s+))((?:"[^"\n]*"|'[^'\n]*'|[^\s"']+))/gi, '$1[redacted]')
    .replace(/(\b(?:[A-Z][A-Z0-9_]*_)?(?:TOKEN|PASSWORD|PASSWD|SECRET|API_KEY|ACCESS_KEY|PRIVATE_KEY)\s*=\s*)(?:"[^"\n]*"|'[^'\n]*'|[^\s"']+)/gi, '$1[redacted]')
    .slice(0, 8192);
}

function execute(file, args, { signal, timeout = 5000, allowEmpty = false } = {}) {
  abortCheck(signal);
  return new Promise((resolve, reject) => {
    execFile(file, args, {
      encoding: 'utf8', maxBuffer: MAX_OUTPUT, timeout, signal,
      windowsHide: true, env: { ...process.env, LC_ALL: 'C', LANG: 'C' },
    }, (error, stdout = '') => {
      if (!error || (allowEmpty && error.code === 1 && !stdout.trim())) resolve(stdout);
      else reject(error);
    });
  });
}

function commandName(command) {
  const first = String(command || '').match(/^\s*(?:"([^"]+)"|'([^']+)'|(\S+))/);
  return path.win32.basename((first?.[1] || first?.[2] || first?.[3] || '').replace(/\\/g, '/')).toLowerCase();
}

function isShell(command) {
  return /^(?:-?(?:ba|z|da|fi|k)?sh|cmd(?:\.exe)?|pwsh(?:\.exe)?|powershell(?:\.exe)?)$/.test(commandName(command));
}

function isShellWrapper(command) {
  return isShell(command) && /(?:^|\s)(?:-[a-z]*c|\/c|-(?:command|file))(?:\s|$)/i.test(command);
}

function isLauncher(command) {
  return /^(?:npm|npx|pnpm|yarn|corepack|mvn|mvnw|gradle|gradlew)(?:\.cmd|\.exe)?$/.test(commandName(command)) ||
    /(?:^|[\s/\\])(?:npm-cli\.js|npx-cli\.js|pnpm\.c?js|yarn\.c?js|mvnw|gradlew)(?:[\s"']|$)/i.test(command) ||
    /(?:org\.codehaus\.plexus\.classworlds\.launcher|org\.gradle\.wrapper\.GradleWrapperMain|org\.gradle\.launcher\.GradleMain)/.test(command);
}

export function isInfrastructureProcess(command) {
  const name = commandName(command);
  if (isShell(command) && !isShellWrapper(command)) return true;
  if (/^(?:ps|lsof|ss|getconf|launchd|systemd|login|sshd|ssh-agent|Code Helper.*|Electron|codex|dsh)(?:\.exe)?$/i.test(name)) return true;
  return /(?:^|[\s/\\])(?:dsh(?:\.m?js)?|dsh-cli|tsserver(?:library)?\.js|typingsInstaller\.js|typescript-language-server|vscode-[^\s]*language[^\s]*|pylsp|pyright-langserver|gopls|rust-analyzer|jdtls)(?:[\s/\\"']|$)/i.test(command) ||
    /(?:@deepseek-ai[\/\\]dsh(?:[\/\\]|\s|$)|org\.eclipse\.jdt\.ls|org\.gradle\.launcher\.daemon\.bootstrap\.GradleDaemon|--(?:type|ms-enable-electron-run-as-node)=)/i.test(command);
}

function runtimeFor(command) {
  const name = commandName(command);
  if (isLauncher(command) && /npm|npx|pnpm|yarn|corepack/i.test(command)) return 'Node.js';
  if (/^(?:node|nodejs)(?:\.exe)?$/.test(name)) return 'Node.js';
  if (/^(?:bun|deno)(?:\.exe)?$/.test(name)) return name.replace(/\.exe$/, '');
  if (/^(?:java|javaw|mvn|mvnw|gradle|gradlew)(?:\.exe|\.cmd)?$/.test(name) || /GradleWrapperMain|classworlds/.test(command)) return 'Java';
  if (/^(?:python[\d.]*|pypy[\d.]*|uv|uvicorn|gunicorn|celery)(?:\.exe)?$/.test(name)) return 'Python';
  if (/^(?:dotnet)(?:\.exe)?$/.test(name)) return '.NET';
  if (/^(?:go)(?:\.exe)?$/.test(name)) return 'Go';
  if (/^(?:cargo|rustc)(?:\.exe)?$/.test(name)) return 'Rust';
  if (/^(?:ruby|rails|bundle)(?:\.exe)?$/.test(name)) return 'Ruby';
  if (/^(?:php|php-fpm)(?:\.exe)?$/.test(name)) return 'PHP';
  return isShell(command) ? 'Shell' : (name || 'Process');
}

export function parsePs(output) {
  const rows = [];
  for (const line of String(output).split('\n')) {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\w{3}\s+\w{3}\s+\d{1,2}\s+\d\d:\d\d:\d\d\s+\d{4})\s+(.+)$/);
    if (!match) continue;
    const startedAt = Date.parse(match[4]);
    rows.push({ pid: Number(match[1]), ppid: Number(match[2]), uid: Number(match[3]), command: match[5],
      ...(Number.isFinite(startedAt) ? { startedAt } : {}) });
  }
  return rows;
}

function parseEndpoint(value) {
  const address = String(value).replace(/\s+\((?:LISTEN|CLOSED|BOUND)\)$/, '');
  if (address.includes('->')) return undefined;
  const match = address.match(/^(.*):(\d+)$/);
  if (!match) return undefined;
  const port = Number(match[2]);
  if (port < 1 || port > 65535) return undefined;
  return { address: match[1].replace(/^\[|\]$/g, ''), port };
}

/** Parse lsof -F0pfnPT (NUL-separated machine fields), also accepting -F lines. */
export function parseLsof(output) {
  const cwd = new Map();
  const ports = new Map();
  let pid, file;
  const flush = () => {
    if (!pid || !file) return;
    if (file.fd === 'cwd' && file.name) cwd.set(pid, file.name);
    if (!['TCP', 'UDP'].includes(file.protocol)) return;
    if (file.protocol === 'TCP' && file.state && file.state !== 'LISTEN') return;
    const endpoint = parseEndpoint(file.name);
    if (endpoint) {
      const list = ports.get(pid) || [];
      list.push({ protocol: file.protocol.toLowerCase(), ...endpoint });
      ports.set(pid, list);
    }
  };
  const fields = String(output).includes('\0') ? String(output).split('\0') : String(output).split('\n');
  for (let field of fields) {
    field = field.replace(/^\n+/, '');
    if (!field) continue;
    const key = field[0], value = field.slice(1).replace(/\n$/, '');
    if (key === 'p') { flush(); pid = Number(value); file = undefined; }
    else if (key === 'f') { flush(); file = { fd: value }; }
    else if (file && key === 'n') file.name = value;
    else if (file && key === 'P') file.protocol = value;
    else if (file && key === 'T' && value.startsWith('ST=')) file.state = value.slice(3);
  }
  flush();
  return { cwd, ports };
}

function normalize(value, platform = process.platform) {
  const api = platform === 'win32' ? path.win32 : path.posix;
  const normalized = api.normalize(value).replace(/[\\/]+$/, '') || api.parse(value).root;
  return platform === 'win32' ? normalized.toLowerCase() : normalized;
}

export function pathBelongsToWorkspace(candidate, workspacePath, platform = process.platform) {
  if (!candidate || !workspacePath) return false;
  const api = platform === 'win32' ? path.win32 : path.posix;
  if (!api.isAbsolute(candidate)) return false;
  const relative = api.relative(normalize(workspacePath, platform), normalize(candidate, platform));
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${api.sep}`) && !api.isAbsolute(relative));
}

function commandReferencesWorkspace(command, workspacePath, platform) {
  const root = normalize(workspacePath, platform);
  const text = platform === 'win32' ? String(command).toLowerCase().replace(/\//g, '\\') : String(command);
  const escaped = root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[\\s"'=])${escaped}(?=$|[\\s"'${platform === 'win32' ? '\\\\' : '/'}])`).test(text);
}

function uniquePorts(ports) {
  const unique = new Map();
  for (const port of ports) {
    if (!['tcp', 'udp'].includes(port.protocol) || !Number.isInteger(port.port) || port.port < 1 || port.port > 65535) continue;
    unique.set(`${port.protocol}:${port.address}:${port.port}`, port);
  }
  return [...unique.values()].sort((a, b) => a.port - b.port || a.protocol.localeCompare(b.protocol) || a.address.localeCompare(b.address));
}

/** Pure grouping step: interactive shells never swallow separate launched tasks. */
export function buildTasks(processes, { workspacePath, platform = process.platform, includeInfrastructure = false, excludePids = [] } = {}) {
  const excluded = new Set(excludePids);
  const byPid = new Map(processes.filter(p => Number.isInteger(p.pid) && p.pid > 0).map(p => [p.pid, p]));
  const matched = new Map();
  for (const p of byPid.values()) {
    if (excluded.has(p.pid) || !p.command?.trim()) continue;
    if (pathBelongsToWorkspace(p.cwd, workspacePath, platform)) matched.set(p.pid, 'cwd');
    else if (commandReferencesWorkspace(p.command, workspacePath, platform)) matched.set(p.pid, 'command');
  }
  // Parent ownership is useful when a child exposes no readable cwd, but an explicit
  // cwd outside the project is not silently treated as proof of project ownership.
  let changed = true;
  for (let round = 0; changed && round < 64; round++) {
    changed = false;
    for (const p of byPid.values()) {
      if (matched.has(p.pid) || excluded.has(p.pid) || p.cwd || !matched.has(p.ppid) || !p.command?.trim()) continue;
      const parent = byPid.get(p.ppid);
      if (parent && isShell(parent.command) && !isShellWrapper(parent.command)) continue;
      matched.set(p.pid, 'descendant'); changed = true;
    }
  }
  const children = new Map();
  for (const p of byPid.values()) if (matched.has(p.pid)) children.set(p.ppid, (children.get(p.ppid) || 0) + 1);
  const groups = new Map();
  for (const pid of matched.keys()) {
    const p = byPid.get(pid);
    if (!includeInfrastructure && isInfrastructureProcess(p.command)) continue;
    let owner = p;
    const visited = new Set([pid]);
    while (matched.has(owner.ppid) && !visited.has(owner.ppid)) {
      const parent = byPid.get(owner.ppid);
      if (!parent || excluded.has(parent.pid)) break;
      if (!(isLauncher(parent.command) || (isShellWrapper(parent.command) && children.get(parent.pid) === 1))) break;
      if (!includeInfrastructure && isInfrastructureProcess(parent.command)) break;
      visited.add(parent.pid); owner = parent;
    }
    const group = groups.get(owner.pid) || { owner, processes: [] };
    group.processes.push(p); groups.set(owner.pid, group);
  }
  return [...groups.values()].map(({ owner, processes: members }) => {
    // An intermediate wrapper may also be matched and grouped independently earlier.
    const ordered = [...new Map([owner, ...members].map(p => [p.pid, p])).values()].sort((a, b) => (a.pid === owner.pid ? -1 : b.pid === owner.pid ? 1 : a.pid - b.pid));
    const identity = owner.startedAt ?? owner.identity ?? createHash('sha256').update(owner.command).digest('hex').slice(0, 12);
    const meaningful = ordered.find(p => (p.ports || []).length) || ordered.find(p => !isLauncher(p.command) && !isShell(p.command)) || owner;
    return {
      id: `${platform}:${owner.pid}:${identity}`, pid: owner.pid, pids: ordered.map(p => p.pid),
      command: redactCommand(owner.command), cwd: owner.cwd || meaningful.cwd || '',
      ...(owner.startedAt != null ? { startedAt: owner.startedAt } : {}),
      runtime: runtimeFor(meaningful.command), source: 'system', match: matched.get(owner.pid),
      ports: uniquePorts(ordered.flatMap(p => p.ports || [])),
      processes: ordered.map(p => ({ pid: p.pid, ppid: p.ppid, command: redactCommand(p.command), ...(p.cwd ? { cwd: p.cwd } : {}), ...(p.startedAt != null ? { startedAt: p.startedAt } : {}) })),
      ...(isInfrastructureProcess(owner.command) ? { infrastructure: true } : {}),
    };
  }).sort((a, b) => Number(b.ports.length > 0) - Number(a.ports.length > 0) || (a.startedAt || 0) - (b.startedAt || 0) || a.pid - b.pid);
}

async function concurrentMap(values, concurrency, fn) {
  const output = new Array(values.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (next < values.length) { const i = next++; output[i] = await fn(values[i]); }
  }));
  return output;
}

function ipv4(hex) {
  return hex.match(/../g).reverse().map(value => parseInt(value, 16)).join('.');
}

function ipv6(hex) {
  const normal = hex.match(/.{8}/g).map(part => part.match(/../g).reverse().join('')).join('');
  return normal.match(/.{4}/g).map(value => parseInt(value, 16).toString(16)).join(':');
}

export function parseProcNet(output, protocol = 'tcp', family = 4) {
  const rows = new Map();
  for (const line of String(output).trim().split('\n').slice(1)) {
    const fields = line.trim().split(/\s+/);
    if (fields.length < 10 || (protocol === 'tcp' && fields[3] !== '0A')) continue;
    // UDP has no LISTEN state. A connected client's remote port is nonzero;
    // only report unconnected bound endpoints as service candidates.
    if (protocol === 'udp' && !/^0+:0+$/.test(fields[2])) continue;
    const [addressHex, portHex] = fields[1].split(':');
    if (!addressHex || !portHex || addressHex.length !== (family === 6 ? 32 : 8)) continue;
    const port = parseInt(portHex, 16);
    if (port < 1 || port > 65535) continue;
    rows.set(fields[9], { protocol, address: family === 6 ? ipv6(addressHex) : ipv4(addressHex), port });
  }
  return rows;
}

export function parseProcStat(text, { bootTime = 0, clockTicks = 100 } = {}) {
  const closing = text.lastIndexOf(')');
  if (closing < 0) throw new Error('Invalid process stat');
  const pid = Number(text.slice(0, text.indexOf(' ')));
  const fields = text.slice(closing + 2).trim().split(/\s+/);
  const ticks = Number(fields[19]);
  return { pid, ppid: Number(fields[1]), identity: `${ticks}`, ...(bootTime && Number.isFinite(ticks) ? { startedAt: Math.round(bootTime * 1000 + ticks * 1000 / clockTicks) } : {}) };
}

async function collectLinux(workspacePath, { signal, includeInfrastructure }) {
  abortCheck(signal);
  const warnings = [];
  let denied = 0;
  const [entries, systemStat, ticks] = await Promise.all([
    readdir('/proc'), readFile('/proc/stat', 'utf8'),
    execute('getconf', ['CLK_TCK'], { signal }).catch(() => '100'),
  ]);
  const bootTime = Number(systemStat.match(/^btime\s+(\d+)/m)?.[1]) || 0;
  const clockTicks = Number(ticks.trim()) || 100;
  const uid = process.getuid?.();
  const processes = (await concurrentMap(entries.filter(v => /^\d+$/.test(v)), 32, async entry => {
    abortCheck(signal);
    try {
      const base = `/proc/${entry}`;
      const meta = await stat(base);
      if (uid != null && meta.uid !== uid) return undefined;
      const [statText, cmdline, cwd] = await Promise.all([
        readFile(`${base}/stat`, 'utf8'), readFile(`${base}/cmdline`, 'utf8'),
        readlink(`${base}/cwd`).catch(error => { if (error.code === 'EACCES' || error.code === 'EPERM') denied++; return undefined; }),
      ]);
      const initial = parseProcStat(statText, { bootTime, clockTicks });
      const latest = parseProcStat(await readFile(`${base}/stat`, 'utf8'));
      if (initial.identity !== latest.identity) return undefined;
      const args = cmdline.split('\0').filter(Boolean);
      const command = args.map(arg => /\s/.test(arg) ? JSON.stringify(arg) : arg).join(' ');
      return { ...initial, command, ...(cwd ? { cwd } : {}), ports: [] };
    } catch (error) {
      if (error.code === 'EACCES' || error.code === 'EPERM') denied++;
      return undefined;
    }
  })).filter(Boolean);
  abortCheck(signal);
  const targetPids = new Set(buildTasks(processes, { workspacePath, includeInfrastructure, excludePids: [process.pid], platform: 'linux' }).flatMap(t => t.pids));
  const inodes = new Map();
  for (const [name, protocol, family] of [['tcp', 'tcp', 4], ['tcp6', 'tcp', 6], ['udp', 'udp', 4], ['udp6', 'udp', 6]]) {
    try { for (const [inode, endpoint] of parseProcNet(await readFile(`/proc/net/${name}`, 'utf8'), protocol, family)) inodes.set(inode, endpoint); }
    catch (error) { if (error.code !== 'ENOENT') warnings.push(`Could not read ${name} endpoints (${error.code || 'unavailable'}).`); }
  }
  await concurrentMap(processes.filter(p => targetPids.has(p.pid)), 16, async p => {
    abortCheck(signal);
    try {
      const descriptors = await readdir(`/proc/${p.pid}/fd`);
      const links = await concurrentMap(descriptors, 16, fd => readlink(`/proc/${p.pid}/fd/${fd}`).catch(() => ''));
      const current = parseProcStat(await readFile(`/proc/${p.pid}/stat`, 'utf8'));
      if (current.identity !== p.identity) return;
      p.ports = uniquePorts(links.flatMap(link => { const endpoint = inodes.get(link.match(/^socket:\[(\d+)\]$/)?.[1]); return endpoint ? [endpoint] : []; }));
    } catch (error) { if (error.code === 'EACCES' || error.code === 'EPERM') denied++; }
  });
  if (denied) warnings.push(`Some process details could not be read (${denied} permission-denied reads).`);
  return { processes, warnings };
}

async function collectMac({ signal }) {
  const warnings = [];
  const uid = String(process.getuid?.() ?? '');
  const userFilter = uid ? ['-a', '-u', uid] : [];
  const results = await Promise.allSettled([
    execute('ps', ['-ww', '-U', uid, '-o', 'pid=,ppid=,uid=,lstart=,command='], { signal }),
    execute('lsof', ['-nP', ...userFilter, '-d', 'cwd', '-F0pfn'], { signal, allowEmpty: true }),
    execute('lsof', ['-nP', ...userFilter, '-iTCP', '-sTCP:LISTEN', '-F0pfnPT'], { signal, allowEmpty: true }),
    execute('lsof', ['-nP', ...userFilter, '-iUDP', '-F0pfnP'], { signal, allowEmpty: true }),
  ]);
  abortCheck(signal);
  if (results[0].status === 'rejected') throw new Error('Process listing failed. Ensure ps is available.');
  const parsed = results.slice(1).map((result, index) => {
    if (result.status === 'fulfilled') return parseLsof(result.value);
    warnings.push(`${['Working directories', 'TCP listening ports', 'UDP endpoints'][index]} could not be read. Ensure lsof is available and permitted.`);
    return { cwd: new Map(), ports: new Map() };
  });
  const processes = parsePs(results[0].value).map(p => ({ ...p, cwd: parsed[0].cwd.get(p.pid), ports: uniquePorts(parsed.flatMap(result => result.ports.get(p.pid) || [])) }));
  return { processes, warnings };
}

export function parseWindowsSnapshot(input) {
  const value = typeof input === 'string' ? JSON.parse(input.replace(/^\uFEFF/, '')) : input;
  const ports = new Map();
  for (const [key, protocol] of [['tcp', 'tcp'], ['udp', 'udp']]) for (const endpoint of asArray(value[key])) {
    const pid = safeNumber(endpoint.OwningProcess), port = safeNumber(endpoint.LocalPort);
    if (!pid || !port) continue;
    const list = ports.get(pid) || [];
    list.push({ protocol, address: String(endpoint.LocalAddress || '*'), port }); ports.set(pid, list);
  }
  return asArray(value.processes).flatMap(p => {
    const pid = safeNumber(p.ProcessId), ppid = safeNumber(p.ParentProcessId);
    if (!pid || ppid == null || !p.CommandLine) return [];
    const startedAt = typeof p.CreationDate === 'number' ? p.CreationDate : Date.parse(p.CreationDate);
    return [{ pid, ppid, command: String(p.CommandLine), ...(p.WorkingDirectory ? { cwd: String(p.WorkingDirectory) } : {}), ...(Number.isFinite(startedAt) ? { startedAt } : {}), ports: uniquePorts(ports.get(pid) || []) }];
  });
}

async function collectWindows({ signal }) {
  // Win32_Process exposes command lines, but not a reliable working directory.
  // Keep project attribution conservative instead of inventing a cwd.
  const script = `$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[System.Text.Encoding]::UTF8; $me=[System.Security.Principal.WindowsIdentity]::GetCurrent().Name; $procs=@(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine } | ForEach-Object { $p=$_; try { $o=Invoke-CimMethod -InputObject $p -MethodName GetOwner -ErrorAction Stop; if (($o.Domain+'\\'+$o.User) -eq $me) { [pscustomobject]@{ProcessId=$p.ProcessId;ParentProcessId=$p.ParentProcessId;CommandLine=$p.CommandLine;CreationDate=$p.CreationDate.ToUniversalTime().ToString('o')} } } catch {} }); $tcp=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,OwningProcess); $udp=@(Get-NetUDPEndpoint -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,OwningProcess); @{processes=$procs;tcp=$tcp;udp=$udp} | ConvertTo-Json -Depth 5 -Compress`;
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  const stdout = await execute('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], { signal, timeout: 12000 });
  return { processes: parseWindowsSnapshot(stdout), warnings: ['Windows discovery uses absolute project paths in command lines and parent relationships; working directories are not available. Commands with only relative project paths may be missing.'] };
}

/** Read-only scan. snapshot is a deterministic adapter seam used by tests/embedders. */
export async function scanWorkspace({ workspacePath, platform = process.platform, signal, includeInfrastructure = false, snapshot } = {}) {
  if (typeof workspacePath !== 'string' || !workspacePath.trim()) throw new TypeError('workspacePath must be an absolute directory path.');
  const api = platform === 'win32' ? path.win32 : path.posix;
  if (!api.isAbsolute(workspacePath)) throw new TypeError('workspacePath must be an absolute directory path.');
  abortCheck(signal);
  const canonical = snapshot ? normalize(workspacePath, platform) : await realpath(workspacePath);
  if (!snapshot && !(await stat(canonical)).isDirectory()) throw new TypeError('workspacePath must point to a directory.');
  const scanSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000);
  let result;
  if (snapshot) result = { processes: snapshot.processes || snapshot, warnings: snapshot.warnings || [] };
  else if (platform === 'linux') result = await collectLinux(canonical, { signal: scanSignal, includeInfrastructure });
  else if (platform === 'darwin') result = await collectMac({ signal: scanSignal });
  else if (platform === 'win32') result = await collectWindows({ signal: scanSignal });
  else throw new Error(`Process discovery is not supported on platform ${platform}.`);
  abortCheck(scanSignal);
  return {
    workspacePath: canonical, scannedAt: Date.now(),
    tasks: buildTasks(result.processes, { workspacePath: canonical, platform, includeInfrastructure, excludePids: [process.pid] }),
    warnings: [...new Set(result.warnings)],
  };
}
