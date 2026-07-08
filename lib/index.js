// src/host/index.mjs
import { hostname as systemHostname } from "node:os";

// src/monitor/index.mjs
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, readlink, realpath, stat } from "node:fs/promises";
import path from "node:path";
var MAX_OUTPUT = 8 * 1024 * 1024;
var SECRET_OPTION = "(?:password|passwd|pwd|token|access[-_]?token|auth[-_]?token|api[-_]?key|secret|client[-_]?secret|authorization|credential)";
var asArray = (value) => value == null ? [] : Array.isArray(value) ? value : [value];
var abortCheck = (signal) => signal?.throwIfAborted();
var safeNumber = (value) => Number.isSafeInteger(Number(value)) ? Number(value) : void 0;
function redactCommand(command = "") {
  return String(command).replace(/(\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:)[^\s@]+(@)/gi, "$1[redacted]$2").replace(/(\bBearer\s+)[A-Za-z0-9._~+\/-]+=*/gi, "$1[redacted]").replace(/(["'])([^"'\n]*)\1/g, (whole, quote, body) => quote + body.replace(new RegExp(`((?:--?|\\b)${SECRET_OPTION}(?:\\s*[=:]\\s*|\\s+)).+$`, "i"), "$1[redacted]") + quote).replace(/((?:--?|\b)(?:password|passwd|pwd|token|access[-_]?token|auth[-_]?token|api[-_]?key|secret|client[-_]?secret|authorization|credential)(?:\s*[=:]\s*|\s+))((?:"[^"\n]*"|'[^'\n]*'|[^\s"']+))/gi, "$1[redacted]").replace(/(\b(?:[A-Z][A-Z0-9_]*_)?(?:TOKEN|PASSWORD|PASSWD|SECRET|API_KEY|ACCESS_KEY|PRIVATE_KEY)\s*=\s*)(?:"[^"\n]*"|'[^'\n]*'|[^\s"']+)/gi, "$1[redacted]").slice(0, 8192);
}
function execute(file, args, { signal, timeout = 5e3, allowEmpty = false } = {}) {
  abortCheck(signal);
  return new Promise((resolve, reject) => {
    execFile(file, args, {
      encoding: "utf8",
      maxBuffer: MAX_OUTPUT,
      timeout,
      signal,
      windowsHide: true,
      env: { ...process.env, LC_ALL: "C", LANG: "C" }
    }, (error, stdout = "") => {
      if (!error || allowEmpty && error.code === 1 && !stdout.trim()) resolve(stdout);
      else reject(error);
    });
  });
}
function commandName(command) {
  const first = String(command || "").match(/^\s*(?:"([^"]+)"|'([^']+)'|(\S+))/);
  return path.win32.basename((first?.[1] || first?.[2] || first?.[3] || "").replace(/\\/g, "/")).toLowerCase();
}
function isShell(command) {
  return /^(?:-?(?:ba|z|da|fi|k)?sh|cmd(?:\.exe)?|pwsh(?:\.exe)?|powershell(?:\.exe)?)$/.test(commandName(command));
}
function isShellWrapper(command) {
  return isShell(command) && /(?:^|\s)(?:-[a-z]*c|\/c|-(?:command|file))(?:\s|$)/i.test(command);
}
function isLauncher(command) {
  return /^(?:npm|npx|pnpm|yarn|corepack|mvn|mvnw|gradle|gradlew)(?:\.cmd|\.exe)?$/.test(commandName(command)) || /(?:^|[\s/\\])(?:npm-cli\.js|npx-cli\.js|pnpm\.c?js|yarn\.c?js|mvnw|gradlew)(?:[\s"']|$)/i.test(command) || /(?:org\.codehaus\.plexus\.classworlds\.launcher|org\.gradle\.wrapper\.GradleWrapperMain|org\.gradle\.launcher\.GradleMain)/.test(command);
}
function isInfrastructureProcess(command) {
  const name2 = commandName(command);
  if (isShell(command) && !isShellWrapper(command)) return true;
  if (/^(?:ps|lsof|ss|getconf|launchd|systemd|login|sshd|ssh-agent|Code Helper.*|Electron|codex|dsh)(?:\.exe)?$/i.test(name2)) return true;
  return /(?:^|[\s/\\])(?:dsh(?:\.m?js)?|dsh-cli|tsserver(?:library)?\.js|typingsInstaller\.js|typescript-language-server|vscode-[^\s]*language[^\s]*|pylsp|pyright-langserver|gopls|rust-analyzer|jdtls)(?:[\s/\\"']|$)/i.test(command) || /(?:@deepseek-ai[\/\\]dsh(?:[\/\\]|\s|$)|org\.eclipse\.jdt\.ls|org\.gradle\.launcher\.daemon\.bootstrap\.GradleDaemon|--(?:type|ms-enable-electron-run-as-node)=)/i.test(command);
}
function runtimeFor(command) {
  const name2 = commandName(command);
  if (isLauncher(command) && /npm|npx|pnpm|yarn|corepack/i.test(command)) return "Node.js";
  if (/^(?:node|nodejs)(?:\.exe)?$/.test(name2)) return "Node.js";
  if (/^(?:bun|deno)(?:\.exe)?$/.test(name2)) return name2.replace(/\.exe$/, "");
  if (/^(?:java|javaw|mvn|mvnw|gradle|gradlew)(?:\.exe|\.cmd)?$/.test(name2) || /GradleWrapperMain|classworlds/.test(command)) return "Java";
  if (/^(?:python[\d.]*|pypy[\d.]*|uv|uvicorn|gunicorn|celery)(?:\.exe)?$/.test(name2)) return "Python";
  if (/^(?:dotnet)(?:\.exe)?$/.test(name2)) return ".NET";
  if (/^(?:go)(?:\.exe)?$/.test(name2)) return "Go";
  if (/^(?:cargo|rustc)(?:\.exe)?$/.test(name2)) return "Rust";
  if (/^(?:ruby|rails|bundle)(?:\.exe)?$/.test(name2)) return "Ruby";
  if (/^(?:php|php-fpm)(?:\.exe)?$/.test(name2)) return "PHP";
  return isShell(command) ? "Shell" : name2 || "Process";
}
function parsePs(output) {
  const rows = [];
  for (const line of String(output).split("\n")) {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\w{3}\s+\w{3}\s+\d{1,2}\s+\d\d:\d\d:\d\d\s+\d{4})\s+(.+)$/);
    if (!match) continue;
    const startedAt = Date.parse(match[4]);
    rows.push({
      pid: Number(match[1]),
      ppid: Number(match[2]),
      uid: Number(match[3]),
      command: match[5],
      ...Number.isFinite(startedAt) ? { startedAt } : {}
    });
  }
  return rows;
}
function parseEndpoint(value) {
  const address = String(value).replace(/\s+\((?:LISTEN|CLOSED|BOUND)\)$/, "");
  if (address.includes("->")) return void 0;
  const match = address.match(/^(.*):(\d+)$/);
  if (!match) return void 0;
  const port = Number(match[2]);
  if (port < 1 || port > 65535) return void 0;
  return { address: match[1].replace(/^\[|\]$/g, ""), port };
}
function parseLsof(output) {
  const cwd = /* @__PURE__ */ new Map();
  const ports = /* @__PURE__ */ new Map();
  let pid, file;
  const flush = () => {
    if (!pid || !file) return;
    if (file.fd === "cwd" && file.name) cwd.set(pid, file.name);
    if (!["TCP", "UDP"].includes(file.protocol)) return;
    if (file.protocol === "TCP" && file.state && file.state !== "LISTEN") return;
    const endpoint = parseEndpoint(file.name);
    if (endpoint) {
      const list = ports.get(pid) || [];
      list.push({ protocol: file.protocol.toLowerCase(), ...endpoint });
      ports.set(pid, list);
    }
  };
  const fields = String(output).includes("\0") ? String(output).split("\0") : String(output).split("\n");
  for (let field of fields) {
    field = field.replace(/^\n+/, "");
    if (!field) continue;
    const key = field[0], value = field.slice(1).replace(/\n$/, "");
    if (key === "p") {
      flush();
      pid = Number(value);
      file = void 0;
    } else if (key === "f") {
      flush();
      file = { fd: value };
    } else if (file && key === "n") file.name = value;
    else if (file && key === "P") file.protocol = value;
    else if (file && key === "T" && value.startsWith("ST=")) file.state = value.slice(3);
  }
  flush();
  return { cwd, ports };
}
function normalize(value, platform = process.platform) {
  const api = platform === "win32" ? path.win32 : path.posix;
  const normalized = api.normalize(value).replace(/[\\/]+$/, "") || api.parse(value).root;
  return platform === "win32" ? normalized.toLowerCase() : normalized;
}
function pathBelongsToWorkspace(candidate, workspacePath, platform = process.platform) {
  if (!candidate || !workspacePath) return false;
  const api = platform === "win32" ? path.win32 : path.posix;
  if (!api.isAbsolute(candidate)) return false;
  const relative = api.relative(normalize(workspacePath, platform), normalize(candidate, platform));
  return relative === "" || relative !== ".." && !relative.startsWith(`..${api.sep}`) && !api.isAbsolute(relative);
}
function commandReferencesWorkspace(command, workspacePath, platform) {
  const root = normalize(workspacePath, platform);
  const text = platform === "win32" ? String(command).toLowerCase().replace(/\//g, "\\") : String(command);
  const escaped = root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[\\s"'=])${escaped}(?=$|[\\s"'${platform === "win32" ? "\\\\" : "/"}])`).test(text);
}
function uniquePorts(ports) {
  const unique = /* @__PURE__ */ new Map();
  for (const port of ports) {
    if (!["tcp", "udp"].includes(port.protocol) || !Number.isInteger(port.port) || port.port < 1 || port.port > 65535) continue;
    unique.set(`${port.protocol}:${port.address}:${port.port}`, port);
  }
  return [...unique.values()].sort((a, b) => a.port - b.port || a.protocol.localeCompare(b.protocol) || a.address.localeCompare(b.address));
}
function buildTasks(processes, { workspacePath, platform = process.platform, includeInfrastructure = false, excludePids = [] } = {}) {
  const excluded = new Set(excludePids);
  const byPid = new Map(processes.filter((p) => Number.isInteger(p.pid) && p.pid > 0).map((p) => [p.pid, p]));
  const matched = /* @__PURE__ */ new Map();
  for (const p of byPid.values()) {
    if (excluded.has(p.pid) || !p.command?.trim()) continue;
    if (pathBelongsToWorkspace(p.cwd, workspacePath, platform)) matched.set(p.pid, "cwd");
    else if (commandReferencesWorkspace(p.command, workspacePath, platform)) matched.set(p.pid, "command");
  }
  let changed = true;
  for (let round = 0; changed && round < 64; round++) {
    changed = false;
    for (const p of byPid.values()) {
      if (matched.has(p.pid) || excluded.has(p.pid) || p.cwd || !matched.has(p.ppid) || !p.command?.trim()) continue;
      const parent = byPid.get(p.ppid);
      if (parent && isShell(parent.command) && !isShellWrapper(parent.command)) continue;
      matched.set(p.pid, "descendant");
      changed = true;
    }
  }
  const children = /* @__PURE__ */ new Map();
  for (const p of byPid.values()) if (matched.has(p.pid)) children.set(p.ppid, (children.get(p.ppid) || 0) + 1);
  const groups = /* @__PURE__ */ new Map();
  for (const pid of matched.keys()) {
    const p = byPid.get(pid);
    if (!includeInfrastructure && isInfrastructureProcess(p.command)) continue;
    let owner = p;
    const visited = /* @__PURE__ */ new Set([pid]);
    while (matched.has(owner.ppid) && !visited.has(owner.ppid)) {
      const parent = byPid.get(owner.ppid);
      if (!parent || excluded.has(parent.pid)) break;
      if (!(isLauncher(parent.command) || isShellWrapper(parent.command) && children.get(parent.pid) === 1)) break;
      if (!includeInfrastructure && isInfrastructureProcess(parent.command)) break;
      visited.add(parent.pid);
      owner = parent;
    }
    const group = groups.get(owner.pid) || { owner, processes: [] };
    group.processes.push(p);
    groups.set(owner.pid, group);
  }
  return [...groups.values()].map(({ owner, processes: members }) => {
    const ordered = [...new Map([owner, ...members].map((p) => [p.pid, p])).values()].sort((a, b) => a.pid === owner.pid ? -1 : b.pid === owner.pid ? 1 : a.pid - b.pid);
    const identity = owner.startedAt ?? owner.identity ?? createHash("sha256").update(owner.command).digest("hex").slice(0, 12);
    const meaningful = ordered.find((p) => (p.ports || []).length) || ordered.find((p) => !isLauncher(p.command) && !isShell(p.command)) || owner;
    return {
      id: `${platform}:${owner.pid}:${identity}`,
      pid: owner.pid,
      pids: ordered.map((p) => p.pid),
      command: redactCommand(owner.command),
      cwd: owner.cwd || meaningful.cwd || "",
      ...owner.startedAt != null ? { startedAt: owner.startedAt } : {},
      runtime: runtimeFor(meaningful.command),
      source: "system",
      match: matched.get(owner.pid),
      ports: uniquePorts(ordered.flatMap((p) => p.ports || [])),
      processes: ordered.map((p) => ({ pid: p.pid, ppid: p.ppid, command: redactCommand(p.command), ...p.cwd ? { cwd: p.cwd } : {}, ...p.startedAt != null ? { startedAt: p.startedAt } : {} })),
      ...isInfrastructureProcess(owner.command) ? { infrastructure: true } : {}
    };
  }).sort((a, b) => Number(b.ports.length > 0) - Number(a.ports.length > 0) || (a.startedAt || 0) - (b.startedAt || 0) || a.pid - b.pid);
}
async function concurrentMap(values, concurrency, fn) {
  const output = new Array(values.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (next < values.length) {
      const i = next++;
      output[i] = await fn(values[i]);
    }
  }));
  return output;
}
function ipv4(hex) {
  return hex.match(/../g).reverse().map((value) => parseInt(value, 16)).join(".");
}
function ipv6(hex) {
  const normal = hex.match(/.{8}/g).map((part) => part.match(/../g).reverse().join("")).join("");
  return normal.match(/.{4}/g).map((value) => parseInt(value, 16).toString(16)).join(":");
}
function parseProcNet(output, protocol = "tcp", family = 4) {
  const rows = /* @__PURE__ */ new Map();
  for (const line of String(output).trim().split("\n").slice(1)) {
    const fields = line.trim().split(/\s+/);
    if (fields.length < 10 || protocol === "tcp" && fields[3] !== "0A") continue;
    if (protocol === "udp" && !/^0+:0+$/.test(fields[2])) continue;
    const [addressHex, portHex] = fields[1].split(":");
    if (!addressHex || !portHex || addressHex.length !== (family === 6 ? 32 : 8)) continue;
    const port = parseInt(portHex, 16);
    if (port < 1 || port > 65535) continue;
    rows.set(fields[9], { protocol, address: family === 6 ? ipv6(addressHex) : ipv4(addressHex), port });
  }
  return rows;
}
function parseProcStat(text, { bootTime = 0, clockTicks = 100 } = {}) {
  const closing = text.lastIndexOf(")");
  if (closing < 0) throw new Error("Invalid process stat");
  const pid = Number(text.slice(0, text.indexOf(" ")));
  const fields = text.slice(closing + 2).trim().split(/\s+/);
  const ticks = Number(fields[19]);
  return { pid, ppid: Number(fields[1]), identity: `${ticks}`, ...bootTime && Number.isFinite(ticks) ? { startedAt: Math.round(bootTime * 1e3 + ticks * 1e3 / clockTicks) } : {} };
}
async function collectLinux(workspacePath, { signal, includeInfrastructure }) {
  abortCheck(signal);
  const warnings = [];
  let denied = 0;
  const [entries, systemStat, ticks] = await Promise.all([
    readdir("/proc"),
    readFile("/proc/stat", "utf8"),
    execute("getconf", ["CLK_TCK"], { signal }).catch(() => "100")
  ]);
  const bootTime = Number(systemStat.match(/^btime\s+(\d+)/m)?.[1]) || 0;
  const clockTicks = Number(ticks.trim()) || 100;
  const uid = process.getuid?.();
  const processes = (await concurrentMap(entries.filter((v) => /^\d+$/.test(v)), 32, async (entry) => {
    abortCheck(signal);
    try {
      const base = `/proc/${entry}`;
      const meta = await stat(base);
      if (uid != null && meta.uid !== uid) return void 0;
      const [statText, cmdline, cwd] = await Promise.all([
        readFile(`${base}/stat`, "utf8"),
        readFile(`${base}/cmdline`, "utf8"),
        readlink(`${base}/cwd`).catch((error) => {
          if (error.code === "EACCES" || error.code === "EPERM") denied++;
          return void 0;
        })
      ]);
      const initial = parseProcStat(statText, { bootTime, clockTicks });
      const latest = parseProcStat(await readFile(`${base}/stat`, "utf8"));
      if (initial.identity !== latest.identity) return void 0;
      const args = cmdline.split("\0").filter(Boolean);
      const command = args.map((arg) => /\s/.test(arg) ? JSON.stringify(arg) : arg).join(" ");
      return { ...initial, command, ...cwd ? { cwd } : {}, ports: [] };
    } catch (error) {
      if (error.code === "EACCES" || error.code === "EPERM") denied++;
      return void 0;
    }
  })).filter(Boolean);
  abortCheck(signal);
  const targetPids = new Set(buildTasks(processes, { workspacePath, includeInfrastructure, excludePids: [process.pid], platform: "linux" }).flatMap((t) => t.pids));
  const inodes = /* @__PURE__ */ new Map();
  for (const [name2, protocol, family] of [["tcp", "tcp", 4], ["tcp6", "tcp", 6], ["udp", "udp", 4], ["udp6", "udp", 6]]) {
    try {
      for (const [inode, endpoint] of parseProcNet(await readFile(`/proc/net/${name2}`, "utf8"), protocol, family)) inodes.set(inode, endpoint);
    } catch (error) {
      if (error.code !== "ENOENT") warnings.push(`Could not read ${name2} endpoints (${error.code || "unavailable"}).`);
    }
  }
  await concurrentMap(processes.filter((p) => targetPids.has(p.pid)), 16, async (p) => {
    abortCheck(signal);
    try {
      const descriptors = await readdir(`/proc/${p.pid}/fd`);
      const links = await concurrentMap(descriptors, 16, (fd) => readlink(`/proc/${p.pid}/fd/${fd}`).catch(() => ""));
      const current = parseProcStat(await readFile(`/proc/${p.pid}/stat`, "utf8"));
      if (current.identity !== p.identity) return;
      p.ports = uniquePorts(links.flatMap((link) => {
        const endpoint = inodes.get(link.match(/^socket:\[(\d+)\]$/)?.[1]);
        return endpoint ? [endpoint] : [];
      }));
    } catch (error) {
      if (error.code === "EACCES" || error.code === "EPERM") denied++;
    }
  });
  if (denied) warnings.push(`Some process details could not be read (${denied} permission-denied reads).`);
  return { processes, warnings };
}
async function collectMac({ signal }) {
  const warnings = [];
  const uid = String(process.getuid?.() ?? "");
  const userFilter = uid ? ["-a", "-u", uid] : [];
  const results = await Promise.allSettled([
    execute("ps", ["-ww", "-U", uid, "-o", "pid=,ppid=,uid=,lstart=,command="], { signal }),
    execute("lsof", ["-nP", ...userFilter, "-d", "cwd", "-F0pfn"], { signal, allowEmpty: true }),
    execute("lsof", ["-nP", ...userFilter, "-iTCP", "-sTCP:LISTEN", "-F0pfnPT"], { signal, allowEmpty: true }),
    execute("lsof", ["-nP", ...userFilter, "-iUDP", "-F0pfnP"], { signal, allowEmpty: true })
  ]);
  abortCheck(signal);
  if (results[0].status === "rejected") throw new Error("Process listing failed. Ensure ps is available.");
  const parsed = results.slice(1).map((result, index) => {
    if (result.status === "fulfilled") return parseLsof(result.value);
    warnings.push(`${["Working directories", "TCP listening ports", "UDP endpoints"][index]} could not be read. Ensure lsof is available and permitted.`);
    return { cwd: /* @__PURE__ */ new Map(), ports: /* @__PURE__ */ new Map() };
  });
  const processes = parsePs(results[0].value).map((p) => ({ ...p, cwd: parsed[0].cwd.get(p.pid), ports: uniquePorts(parsed.flatMap((result) => result.ports.get(p.pid) || [])) }));
  return { processes, warnings };
}
function parseWindowsSnapshot(input) {
  const value = typeof input === "string" ? JSON.parse(input.replace(/^\uFEFF/, "")) : input;
  const ports = /* @__PURE__ */ new Map();
  for (const [key, protocol] of [["tcp", "tcp"], ["udp", "udp"]]) for (const endpoint of asArray(value[key])) {
    const pid = safeNumber(endpoint.OwningProcess), port = safeNumber(endpoint.LocalPort);
    if (!pid || !port) continue;
    const list = ports.get(pid) || [];
    list.push({ protocol, address: String(endpoint.LocalAddress || "*"), port });
    ports.set(pid, list);
  }
  return asArray(value.processes).flatMap((p) => {
    const pid = safeNumber(p.ProcessId), ppid = safeNumber(p.ParentProcessId);
    if (!pid || ppid == null || !p.CommandLine) return [];
    const startedAt = typeof p.CreationDate === "number" ? p.CreationDate : Date.parse(p.CreationDate);
    return [{ pid, ppid, command: String(p.CommandLine), ...p.WorkingDirectory ? { cwd: String(p.WorkingDirectory) } : {}, ...Number.isFinite(startedAt) ? { startedAt } : {}, ports: uniquePorts(ports.get(pid) || []) }];
  });
}
async function collectWindows({ signal }) {
  const script = `$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[System.Text.Encoding]::UTF8; $me=[System.Security.Principal.WindowsIdentity]::GetCurrent().Name; $procs=@(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine } | ForEach-Object { $p=$_; try { $o=Invoke-CimMethod -InputObject $p -MethodName GetOwner -ErrorAction Stop; if (($o.Domain+'\\'+$o.User) -eq $me) { [pscustomobject]@{ProcessId=$p.ProcessId;ParentProcessId=$p.ParentProcessId;CommandLine=$p.CommandLine;CreationDate=$p.CreationDate.ToUniversalTime().ToString('o')} } } catch {} }); $tcp=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,OwningProcess); $udp=@(Get-NetUDPEndpoint -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,OwningProcess); @{processes=$procs;tcp=$tcp;udp=$udp} | ConvertTo-Json -Depth 5 -Compress`;
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  const stdout = await execute("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded], { signal, timeout: 12e3 });
  return { processes: parseWindowsSnapshot(stdout), warnings: ["Windows discovery uses absolute project paths in command lines and parent relationships; working directories are not available. Commands with only relative project paths may be missing."] };
}
async function scanWorkspace({ workspacePath, platform = process.platform, signal, includeInfrastructure = false, snapshot } = {}) {
  if (typeof workspacePath !== "string" || !workspacePath.trim()) throw new TypeError("workspacePath must be an absolute directory path.");
  const api = platform === "win32" ? path.win32 : path.posix;
  if (!api.isAbsolute(workspacePath)) throw new TypeError("workspacePath must be an absolute directory path.");
  abortCheck(signal);
  const canonical = snapshot ? normalize(workspacePath, platform) : await realpath(workspacePath);
  if (!snapshot && !(await stat(canonical)).isDirectory()) throw new TypeError("workspacePath must point to a directory.");
  const scanSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(15e3)]) : AbortSignal.timeout(15e3);
  let result;
  if (snapshot) result = { processes: snapshot.processes || snapshot, warnings: snapshot.warnings || [] };
  else if (platform === "linux") result = await collectLinux(canonical, { signal: scanSignal, includeInfrastructure });
  else if (platform === "darwin") result = await collectMac({ signal: scanSignal });
  else if (platform === "win32") result = await collectWindows({ signal: scanSignal });
  else throw new Error(`Process discovery is not supported on platform ${platform}.`);
  abortCheck(scanSignal);
  return {
    workspacePath: canonical,
    scannedAt: Date.now(),
    tasks: buildTasks(result.processes, { workspacePath: canonical, platform, includeInfrastructure, excludePids: [process.pid] }),
    warnings: [...new Set(result.warnings)]
  };
}

// src/actions/catalog.mjs
import { createHash as createHash2 } from "node:crypto";
import { opendir, readFile as readFile2, realpath as realpath2, stat as stat2 } from "node:fs/promises";
import path2 from "node:path";
var IGNORED = /* @__PURE__ */ new Set(["node_modules", ".git", "dist", "build", ".next", "target", ".nuxt", "coverage", ".turbo", ".cache", "vendor", ".venv", "venv", "__pycache__", "out", ".output", ".svelte-kit", ".idea", ".vscode", ".yarn", ".pnpm-store", ".dsh"]);
var LOCKS = [["pnpm-lock.yaml", "pnpm"], ["yarn.lock", "yarn"], ["bun.lock", "bun"], ["bun.lockb", "bun"], ["package-lock.json", "npm"], ["npm-shrinkwrap.json", "npm"]];
var SCRIPT_NAME = /^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,127}$/;
var ActionError = class extends Error {
  constructor(code, message) {
    super(message);
    this.name = "WorkspaceActionError";
    this.code = `workspace-monitor/${code}`;
  }
};
function contained(root, candidate) {
  const relative = path2.relative(root, candidate);
  return relative === "" || relative !== ".." && !relative.startsWith(`..${path2.sep}`) && !path2.isAbsolute(relative);
}
async function canonicalWorkspace(workspacePath) {
  if (typeof workspacePath !== "string" || !path2.isAbsolute(workspacePath)) throw new ActionError("invalid-workspace", "Select an absolute workspace directory.");
  try {
    const canonical = await realpath2(workspacePath);
    if (!(await stat2(canonical)).isDirectory()) throw new Error("not-directory");
    return canonical;
  } catch {
    throw new ActionError("workspace-unavailable", "The workspace directory is unavailable.");
  }
}
function chooseManager(pkg, names, inherited, warnings, relative) {
  if (pkg?.packageManager !== void 0) {
    const manager = typeof pkg.packageManager === "string" ? pkg.packageManager.match(/^(npm|pnpm|yarn|bun)(?:@|$)/)?.[1] : void 0;
    if (manager) return manager;
    warnings.push(`Unsupported packageManager in ${relative || "."}/package.json; its scripts are omitted.`);
    return void 0;
  }
  return LOCKS.find(([name2]) => names.has(name2))?.[1] || inherited || "npm";
}
async function discoverCommands({ workspacePath, signal, maxDirectories = 1e3, maxDepth = 8, maxPackages = 300, maxCommands = 1e3 } = {}) {
  const root = await canonicalWorkspace(workspacePath);
  signal?.throwIfAborted();
  const commands = [], warnings = [];
  const queue = [{ directory: root, depth: 0, manager: "npm" }];
  let visited = 0, packages = 0;
  const deadline = Date.now() + 5e3;
  while (queue.length && visited < maxDirectories && commands.length < maxCommands && packages < maxPackages && Date.now() < deadline) {
    signal?.throwIfAborted();
    const item = queue.shift();
    const relative = path2.relative(root, item.directory).split(path2.sep).join("/");
    let directory;
    try {
      const physical = await realpath2(item.directory);
      if (!contained(root, physical)) {
        warnings.push(`Skipped directory outside workspace: ${relative}`);
        continue;
      }
      directory = await opendir(item.directory);
    } catch {
      warnings.push(`Could not inspect directory: ${relative || "."}`);
      continue;
    }
    visited++;
    const names = /* @__PURE__ */ new Set(), children = [];
    let entries = 0;
    for await (const entry of directory) {
      signal?.throwIfAborted();
      if (++entries > 4e3) {
        warnings.push(`Directory entry limit reached: ${relative || "."}`);
        break;
      }
      names.add(entry.name);
      if (entry.isDirectory() && !IGNORED.has(entry.name)) children.push(entry.name);
    }
    let pkg;
    if (names.has("package.json")) {
      packages++;
      try {
        const manifest = await realpath2(path2.join(item.directory, "package.json"));
        if (!contained(root, manifest)) throw new Error("outside-workspace");
        const info = await stat2(manifest);
        if (!info.isFile() || info.size > 1024 * 1024) throw new Error("invalid-size");
        pkg = JSON.parse(await readFile2(manifest, { encoding: "utf8", signal }));
        if (!pkg || typeof pkg !== "object" || Array.isArray(pkg)) throw new Error("invalid-manifest");
      } catch (error) {
        signal?.throwIfAborted();
        warnings.push(`Could not read a valid package.json: ${relative || "."}`);
      }
    }
    const manager = chooseManager(pkg, names, item.manager, warnings, relative);
    if (manager && pkg?.scripts && typeof pkg.scripts === "object" && !Array.isArray(pkg.scripts)) {
      for (const [script, definition] of Object.entries(pkg.scripts).sort(([a], [b]) => a.localeCompare(b))) {
        if (commands.length >= maxCommands) break;
        if (typeof definition !== "string" || !definition.trim()) continue;
        if (!SCRIPT_NAME.test(script)) {
          warnings.push(`A script with an unsupported name was omitted from ${relative || "."}/package.json.`);
          continue;
        }
        const packageName = typeof pkg.name === "string" ? pkg.name.slice(0, 256) : path2.basename(item.directory);
        const id = "script-" + createHash2("sha256").update(JSON.stringify([root, relative, manager, script, definition])).digest("hex").slice(0, 32);
        commands.push({
          id,
          label: `${packageName}: ${script}`,
          script,
          packageName,
          relativeDirectory: relative || ".",
          directory: item.directory,
          manager,
          command: `${manager} run ${script}`,
          definition: redactCommand(definition)
        });
      }
    }
    if (item.depth < maxDepth) {
      for (const child of children.sort()) {
        if (queue.length + visited >= maxDirectories) {
          warnings.push("Workspace directory scan limit reached; some subprojects may be omitted.");
          break;
        }
        queue.push({ directory: path2.join(item.directory, child), depth: item.depth + 1, manager: manager || item.manager });
      }
    } else if (children.length) warnings.push(`Directory depth limit reached: ${relative || "."}`);
  }
  signal?.throwIfAborted();
  if (queue.length || packages >= maxPackages || commands.length >= maxCommands || Date.now() >= deadline) warnings.push("Command discovery reached its scan limit; some scripts may be omitted.");
  return { commands, warnings: [...new Set(warnings)] };
}

// src/actions/runner.mjs
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile as readFile3 } from "node:fs/promises";
import { StringDecoder } from "node:string_decoder";
var ACTIVE = /* @__PURE__ */ new Set(["running", "stopping"]);
var sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
function view(entry) {
  return {
    id: entry.runId,
    runId: entry.runId,
    commandId: entry.command.id,
    label: entry.command.label,
    command: entry.command.command,
    definition: entry.command.definition,
    cwd: entry.command.directory,
    workspacePath: entry.workspacePath,
    pid: entry.child.pid,
    pids: entry.child.pid ? [entry.child.pid] : [],
    source: "managed",
    status: entry.status,
    startedAt: entry.startedAt,
    ...entry.finishedAt ? { finishedAt: entry.finishedAt } : {},
    ...entry.exitCode !== void 0 ? { exitCode: entry.exitCode } : {},
    ...entry.exitSignal ? { signal: entry.exitSignal } : {}
  };
}
function append(entry, chunk, cap, source = "system") {
  let bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  if (entry.discardUntilNewline.has(source)) {
    const newline = bytes.indexOf(10);
    if (newline === -1) return;
    entry.discardUntilNewline.delete(source);
    bytes = bytes.subarray(newline + 1);
  }
  entry.buffer = Buffer.concat([entry.buffer, bytes]);
  if (entry.buffer.length > cap) {
    const tail = entry.buffer.subarray(entry.buffer.length - cap);
    const newline = tail.indexOf(10);
    entry.buffer = newline === -1 ? Buffer.alloc(0) : tail.subarray(newline + 1);
    if (newline === -1) entry.discardUntilNewline.add(source);
    entry.truncated = true;
  }
}
function environmentSecrets(environment) {
  return Object.entries(environment).filter(([key, value]) => /(?:^|_)(?:TOKEN|PASSWORD|PASSWD|SECRET|API_KEY|PRIVATE_KEY|ACCESS_KEY)(?:_|$)/i.test(key) && typeof value === "string" && value.length >= 6).map(([, value]) => value).sort((a, b) => b.length - a.length);
}
function outputView(entry, secrets, cap) {
  let output = entry.buffer.toString("utf8").replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");
  for (const secret of secrets) output = output.split(secret).join("[redacted]");
  output = output.split("\n").map((line) => redactCommand(line)).join("\n");
  const bytes = Buffer.from(output);
  const clipped = bytes.length > cap;
  if (clipped) output = bytes.subarray(bytes.length - cap).toString("utf8");
  return { ...view(entry), output, truncated: entry.truncated || clipped };
}
async function linuxIdentity(pid) {
  try {
    const text = await readFile3(`/proc/${pid}/stat`, "utf8");
    const fields = text.slice(text.lastIndexOf(")") + 2).trim().split(/\s+/);
    return { pgrp: Number(fields[2]), start: fields[19] };
  } catch {
    return void 0;
  }
}
function createTaskRunner({
  maxConcurrentRuns = 8,
  maxOutputBytes = 65536,
  stopGraceMs = 1500,
  discover = discoverCommands,
  spawnProcess = spawn,
  now = Date.now,
  platform = process.platform,
  environment = process.env
} = {}) {
  const entries = /* @__PURE__ */ new Map();
  const secrets = environmentSecrets(environment);
  const cap = Math.max(1024, Math.min(65536, Number(maxOutputBytes) || 65536));
  const maxRuns = Math.max(1, Math.min(8, Number(maxConcurrentRuns) || 8));
  let disposed = false;
  async function resolveRun(workspacePath, runId) {
    if (typeof runId !== "string") throw new ActionError("run-not-found", "The selected run is unavailable.");
    const root = await canonicalWorkspace(workspacePath);
    const entry = entries.get(runId);
    if (!entry || entry.workspacePath !== root) throw new ActionError("run-not-found", "The selected run is unavailable in this workspace.");
    return entry;
  }
  async function identityMatches(entry) {
    if (entry.exitObserved || entry.child.exitCode !== null || entry.child.signalCode !== null || !entry.child.pid) return false;
    if (platform === "linux") {
      const current = await linuxIdentity(entry.child.pid);
      return !entry.exitObserved && entry.child.exitCode === null && entry.child.signalCode === null && !!entry.identity && current?.start === entry.identity.start && current?.pgrp === entry.child.pid;
    }
    return !entry.exitObserved;
  }
  async function stopEntry(entry) {
    await entry.ready;
    if (!ACTIVE.has(entry.status) || !await identityMatches(entry)) return view(entry);
    entry.stopRequested = true;
    entry.status = "stopping";
    try {
      process.kill(-entry.child.pid, "SIGTERM");
    } catch (error) {
      if (error.code !== "ESRCH") throw new ActionError("stop-failed", "The managed task could not be stopped.");
    }
    await Promise.race([entry.done, sleep(stopGraceMs)]);
    if (!entry.exitObserved && await identityMatches(entry)) {
      try {
        process.kill(-entry.child.pid, "SIGKILL");
      } catch (error) {
        if (error.code !== "ESRCH") throw new ActionError("stop-failed", "The managed task could not be stopped.");
      }
      await Promise.race([entry.done, sleep(1e3)]);
    }
    return view(entry);
  }
  return {
    async run({ workspacePath, commandId, signal } = {}) {
      if (disposed) throw new ActionError("runner-unavailable", "The task runner is unavailable.");
      if (!["linux", "darwin"].includes(platform)) throw new ActionError("unsupported-platform", "Managed script execution currently supports Linux and macOS.");
      if (typeof commandId !== "string" || !/^script-[a-f0-9]{32}$/.test(commandId)) throw new ActionError("command-not-found", "Refresh the command list and select a declared script.");
      signal?.throwIfAborted();
      const root = await canonicalWorkspace(workspacePath);
      const catalog = await discover({ workspacePath: root, signal });
      signal?.throwIfAborted();
      if (disposed) throw new ActionError("runner-unavailable", "The task runner is unavailable.");
      const command = catalog.commands.find((candidate) => candidate.id === commandId);
      if (!command) throw new ActionError("command-not-found", "This command changed or is unavailable. Refresh the command list.");
      if (!["npm", "pnpm", "yarn", "bun"].includes(command.manager) || !contained(root, command.directory)) throw new ActionError("invalid-command", "The command is outside this workspace.");
      const existing = [...entries.values()].find((entry2) => entry2.workspacePath === root && entry2.command.id === commandId && ACTIVE.has(entry2.status));
      if (existing) {
        await existing.ready;
        return { ...view(existing), existing: true };
      }
      if ([...entries.values()].filter((entry2) => ACTIVE.has(entry2.status)).length >= maxRuns) throw new ActionError("too-many-runs", `At most ${maxRuns} managed tasks can run at once.`);
      const child = spawnProcess(command.manager, ["run", command.script], {
        cwd: command.directory,
        shell: false,
        detached: true,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...environment, COREPACK_ENABLE_NETWORK: "0", COREPACK_ENABLE_DOWNLOAD_PROMPT: "0" }
      });
      const entry = {
        runId: `run-${randomUUID()}`,
        workspacePath: root,
        command,
        child,
        startedAt: now(),
        status: "running",
        buffer: Buffer.alloc(0),
        truncated: false,
        discardUntilNewline: /* @__PURE__ */ new Set(),
        exitObserved: false,
        stopRequested: false
      };
      entries.set(entry.runId, entry);
      let settle;
      entry.done = new Promise((resolve) => {
        settle = resolve;
      });
      for (const [source, stream] of [["stdout", child.stdout], ["stderr", child.stderr]]) {
        if (!stream) continue;
        const decoder = new StringDecoder("utf8");
        stream.on("data", (chunk) => append(entry, decoder.write(chunk), cap, source));
        stream.on("end", () => {
          const last = decoder.end();
          if (last) append(entry, last, cap, source);
        });
        stream.on("error", () => append(entry, "\nSome process output could not be read.\n", cap));
      }
      child.once("exit", (code, exitSignal) => {
        entry.exitObserved = true;
        entry.exitCode = code;
        entry.exitSignal = exitSignal;
        entry.finishedAt = now();
        entry.status = entry.stopRequested ? "stopped" : code === 0 ? "completed" : "failed";
        settle();
      });
      entry.ready = new Promise((resolve, reject) => {
        child.once("spawn", async () => {
          if (platform === "linux") entry.identity = await linuxIdentity(child.pid);
          resolve();
        });
        child.once("error", (error) => {
          entry.exitObserved = true;
          entry.status = "failed";
          entry.finishedAt = now();
          append(entry, "The package manager could not be started.\n", cap);
          settle();
          reject(new ActionError(error.code === "ENOENT" ? "manager-not-found" : "launch-failed", error.code === "ENOENT" ? `${command.manager} is not installed on the DSH host. Install it explicitly and retry.` : "The script could not be started."));
        });
      });
      for (const [id, item] of entries) if (entries.size > 100 && !ACTIVE.has(item.status)) entries.delete(id);
      await entry.ready;
      await new Promise((resolve) => setImmediate(resolve));
      return view(entry);
    },
    async list(workspacePath) {
      const root = await canonicalWorkspace(workspacePath);
      return [...entries.values()].filter((entry) => entry.workspacePath === root).map(view).sort((a, b) => b.startedAt - a.startedAt);
    },
    async output({ workspacePath, runId } = {}) {
      return outputView(await resolveRun(workspacePath, runId), secrets, cap);
    },
    async stopManaged({ workspacePath, runId } = {}) {
      return stopEntry(await resolveRun(workspacePath, runId));
    },
    async dispose() {
      disposed = true;
      await Promise.allSettled([...entries.values()].filter((entry) => ACTIVE.has(entry.status)).map(stopEntry));
    }
  };
}

// src/process-control/index.mjs
import { execFile as execFile2 } from "node:child_process";
import { readFile as readFile4, readlink as readlink2, realpath as realpath3, stat as stat3 } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
var activeStops = /* @__PURE__ */ new Set();
var GONE = /* @__PURE__ */ new Set(["ENOENT", "ESRCH"]);
var ProcessControlError = class extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProcessControlError";
    this.code = `workspace-monitor/${code}`;
  }
};
var refused = (code, message) => {
  throw new ProcessControlError(code, message);
};
var checkAbort = (signal) => signal?.throwIfAborted();
var positivePid = (pid) => Number.isSafeInteger(pid) && pid > 1;
var sameStart = (a, b) => Number.isFinite(a) && Number.isFinite(b) && a === b;
function run(file, args, { signal, allowEmpty = false } = {}) {
  checkAbort(signal);
  return new Promise((resolve, reject) => {
    execFile2(file, args, {
      encoding: "utf8",
      timeout: 4e3,
      maxBuffer: 1024 * 1024,
      signal,
      env: { ...process.env, LC_ALL: "C", LANG: "C" }
    }, (error, stdout = "") => {
      if (!error || allowEmpty && error.code === 1 && !stdout.trim()) resolve(stdout);
      else reject(error);
    });
  });
}
function currentMacProcess(output) {
  const row = parsePs(output)[0];
  if (!row) return null;
  const stateAndCommand = row.command.match(/^(\S+)\s+(.+)$/);
  if (!stateAndCommand) return null;
  return { ...row, state: stateAndCommand[1], command: stateAndCommand[2] };
}
function createIdentityReader({ platform = process.platform } = {}) {
  let linuxClock;
  async function clock(signal) {
    if (!linuxClock) {
      const [systemStat, ticks] = await Promise.all([
        readFile4("/proc/stat", { encoding: "utf8", signal }),
        run("getconf", ["CLK_TCK"], { signal })
      ]);
      const bootTime = Number(systemStat.match(/^btime\s+(\d+)/m)?.[1]);
      const clockTicks = Number(ticks.trim());
      if (!(bootTime > 0) || !(clockTicks > 0)) throw new Error("Process clock unavailable");
      linuxClock = { bootTime, clockTicks };
    }
    return linuxClock;
  }
  return async function readIdentity(pid, { signal } = {}) {
    if (!positivePid(pid)) return null;
    checkAbort(signal);
    try {
      if (platform === "linux") {
        const timing = await clock(signal);
        const base = `/proc/${pid}`;
        const [firstText, metadata, argv, directory] = await Promise.all([
          readFile4(`${base}/stat`, { encoding: "utf8", signal }),
          stat3(base),
          readFile4(`${base}/cmdline`, { encoding: "utf8", signal }),
          readlink2(`${base}/cwd`)
        ]);
        const first = parseProcStat(firstText, timing);
        const cwd = await realpath3(directory);
        const secondText = await readFile4(`${base}/stat`, { encoding: "utf8", signal });
        const second = parseProcStat(secondText, timing);
        if (first.identity !== second.identity || first.pid !== second.pid) return null;
        const state = secondText.slice(secondText.lastIndexOf(")") + 2).trim().split(/\s+/, 1)[0];
        if (state === "Z" || state === "X") return null;
        return {
          ...second,
          uid: metadata.uid,
          state,
          cwd,
          command: argv.split("\0").filter(Boolean).map((arg) => /\s/.test(arg) ? JSON.stringify(arg) : arg).join(" ")
        };
      }
      if (platform === "darwin") {
        const args = ["-ww", "-p", String(pid), "-o", "pid=,ppid=,uid=,lstart=,state=,command="];
        const first = currentMacProcess(await run("ps", args, { signal, allowEmpty: true }));
        if (!first || /^[ZX]/.test(first.state)) return null;
        const directories = parseLsof(await run("lsof", ["-nP", "-a", "-p", String(pid), "-d", "cwd", "-F0pfn"], { signal, allowEmpty: true })).cwd;
        const rawCwd = directories.get(pid);
        const cwd = rawCwd ? await realpath3(rawCwd) : void 0;
        const second = currentMacProcess(await run("ps", args, { signal, allowEmpty: true }));
        if (!second || /^[ZX]/.test(second.state)) return null;
        if (!sameStart(first.startedAt, second.startedAt) || first.uid !== second.uid || first.command !== second.command) return null;
        return { ...second, cwd, identity: `${second.uid}:${second.startedAt}` };
      }
      refused("unsupported", "Stopping externally started tasks is supported on Linux and macOS only.");
    } catch (error) {
      checkAbort(signal);
      if (GONE.has(error?.code)) return null;
      throw error;
    }
  };
}
async function protectedAncestors(readIdentity, signal) {
  const protectedPids = /* @__PURE__ */ new Set([1, process.pid, process.ppid]);
  let next = process.ppid;
  for (let depth = 0; positivePid(next) && depth < 64; depth++) {
    checkAbort(signal);
    let entry;
    try {
      entry = await readIdentity(next, { signal });
    } catch {
      break;
    }
    if (!entry || !positivePid(entry.ppid) || protectedPids.has(entry.ppid)) break;
    protectedPids.add(entry.ppid);
    next = entry.ppid;
  }
  return protectedPids;
}
function sameBirthIdentity(expected, actual) {
  return actual && expected.pid === actual.pid && expected.uid === actual.uid && sameStart(expected.startedAt, actual.startedAt) && expected.identity === actual.identity;
}
function sameIdentity(expected, actual) {
  return sameBirthIdentity(expected, actual) && expected.command === actual.command && expected.cwd === actual.cwd;
}
function evidenceProblem(expected, actual, { workspacePath, platform, currentUid, protectedPids }) {
  if (!actual) return "already-finished";
  if (!positivePid(actual.pid) || expected.pid !== actual.pid || protectedPids.has(actual.pid)) return "protected";
  if (!sameStart(expected.startedAt, actual.startedAt)) return "identity-changed";
  if (!Number.isInteger(actual.uid) || actual.uid !== currentUid) return "different-user";
  if (!actual.command || isInfrastructureProcess(actual.command)) return "infrastructure";
  if (redactCommand(actual.command) !== expected.command) return "identity-changed";
  if (!actual.cwd || !pathBelongsToWorkspace(actual.cwd, workspacePath, platform)) return "outside-workspace";
  return null;
}
function childrenFirst(entries) {
  const byPid = new Map(entries.map((entry) => [entry.pid, entry]));
  const depth = (entry) => {
    let result = 0, current = entry;
    const seen = /* @__PURE__ */ new Set([entry.pid]);
    while (byPid.has(current.ppid) && !seen.has(current.ppid)) {
      seen.add(current.ppid);
      current = byPid.get(current.ppid);
      result++;
    }
    return result;
  };
  return [...entries].sort((a, b) => depth(b) - depth(a));
}
async function stopWorkspaceTask({
  workspacePath,
  taskId,
  signal,
  scanWorkspace: scanWorkspace2 = scanWorkspace,
  platform = process.platform,
  readIdentity = createIdentityReader({ platform }),
  sendSignal = (pid, value) => process.kill(pid, value),
  currentUid = process.getuid?.(),
  protectedPids: offeredProtectedPids,
  waitMs = 600,
  pollMs = 75,
  sleep: sleep2 = delay,
  now = Date.now
} = {}) {
  checkAbort(signal);
  if (platform !== "linux" && platform !== "darwin") refused("unsupported", "Stopping externally started tasks is supported on Linux and macOS only.");
  if (typeof taskId !== "string" || !taskId || taskId.length > 256 || taskId.trim() !== taskId || /[\x00-\x1f]/.test(taskId) || typeof workspacePath !== "string" || !isAbsolute(workspacePath)) {
    refused("bad-request", "A workspace and exact task identity are required.");
  }
  if (!Number.isInteger(currentUid) || currentUid < 0) refused("unsupported", "The current process owner could not be verified.");
  let canonical;
  try {
    canonical = await realpath3(workspacePath);
    if (!(await stat3(canonical)).isDirectory()) throw new Error("Not a directory");
  } catch {
    refused("workspace-unavailable", "The workspace directory is unavailable.");
  }
  checkAbort(signal);
  const lockKey = JSON.stringify([canonical, taskId]);
  if (activeStops.has(lockKey)) refused("busy", "This task is already being stopped.");
  activeStops.add(lockKey);
  try {
    const snapshot = await scanWorkspace2({ workspacePath: canonical, platform, signal, includeInfrastructure: true });
    checkAbort(signal);
    const task = snapshot.tasks?.find((item) => item.id === taskId);
    const result = { taskId, workspacePath: canonical, signal: "SIGTERM", signalledPids: [], remainingPids: [], stoppedPids: [], skipped: [] };
    if (!task) return { ...result, status: "already-finished" };
    if (task.match !== "cwd" || task.infrastructure || isInfrastructureProcess(task.command)) {
      refused("unsafe-task", "This task cannot be safely associated with the workspace for stopping.");
    }
    const expected = new Map((task.processes || []).map((entry) => [entry.pid, entry]));
    const owner = expected.get(task.pid);
    const pids = [...new Set(task.pids || [])];
    if (!positivePid(task.pid) || !owner || !sameStart(task.startedAt, owner.startedAt) || !pids.includes(task.pid) || pids.length > 256 || pids.some((pid) => !positivePid(pid) || !expected.has(pid))) {
      refused("unsafe-task", "The task process identities could not be verified.");
    }
    const protectedPids = offeredProtectedPids ? /* @__PURE__ */ new Set([1, process.pid, process.ppid, ...offeredProtectedPids]) : await protectedAncestors(readIdentity, signal);
    if (pids.some((pid) => protectedPids.has(pid))) refused("unsafe-task", "The DSH host and its parent processes cannot be stopped.");
    const policy = { workspacePath: canonical, platform, currentUid, protectedPids };
    const prepared = [];
    for (const pid of pids) {
      checkAbort(signal);
      const record = expected.get(pid);
      let identity, problem;
      try {
        identity = await readIdentity(pid, { signal });
      } catch {
        checkAbort(signal);
        problem = "unverifiable";
      }
      problem ??= evidenceProblem(record, identity, policy);
      if (problem) {
        if (pid === task.pid) {
          if (problem === "already-finished") return { ...result, status: "already-finished" };
          refused(problem === "identity-changed" ? "identity-changed" : "unsafe-task", "The task identity or workspace ownership changed. Refresh the task list.");
        }
        result.skipped.push({ pid, reason: problem });
      } else prepared.push({ record, identity });
    }
    const ordered = childrenFirst(prepared.map((item) => item.identity));
    const preparedByPid = new Map(prepared.map((item) => [item.identity.pid, item]));
    for (const identity of ordered) {
      checkAbort(signal);
      const { record } = preparedByPid.get(identity.pid);
      let latest, problem;
      try {
        latest = await readIdentity(identity.pid, { signal });
      } catch {
        checkAbort(signal);
        problem = "unverifiable";
      }
      checkAbort(signal);
      problem ??= evidenceProblem(record, latest, policy);
      if (!problem && !sameIdentity(identity, latest)) problem = "identity-changed";
      if (problem) {
        result.skipped.push({ pid: identity.pid, reason: problem });
        continue;
      }
      try {
        sendSignal(identity.pid, "SIGTERM");
        result.signalledPids.push(identity.pid);
      } catch (error) {
        if (!GONE.has(error?.code)) result.skipped.push({ pid: identity.pid, reason: error?.code === "EPERM" ? "permission-denied" : "signal-failed" });
      }
    }
    const deadline = now() + Math.max(0, Math.min(Number.isFinite(waitMs) ? waitMs : 600, 2e3));
    do {
      result.remainingPids = [];
      for (const pid of result.signalledPids) {
        checkAbort(signal);
        try {
          const current = await readIdentity(pid, { signal });
          if (sameBirthIdentity(preparedByPid.get(pid).identity, current)) result.remainingPids.push(pid);
        } catch {
          checkAbort(signal);
          result.remainingPids.push(pid);
        }
      }
      if (!result.remainingPids.length || now() >= deadline) break;
      await sleep2(Math.min(Math.max(10, pollMs), Math.max(0, deadline - now())), void 0, { signal });
    } while (true);
    result.stoppedPids = result.signalledPids.filter((pid) => !result.remainingPids.includes(pid));
    const denied = result.skipped.some((item) => item.reason !== "already-finished");
    return { ...result, status: denied ? "partial" : result.remainingPids.length ? "stopping" : result.signalledPids.length ? "stopped" : "already-finished" };
  } catch (error) {
    if (error instanceof ProcessControlError) throw error;
    checkAbort(signal);
    refused("stop-failed", "Unable to verify or stop this task. Refresh the task list and try again.");
  } finally {
    activeStops.delete(lockKey);
  }
}

// src/host/scope.mjs
import { realpath as realpath4, stat as stat4 } from "node:fs/promises";
import { isAbsolute as isAbsolute2 } from "node:path";
var WorkspaceScopeError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
};
function validId(value, maximum = 256) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum && !/[\x00-\x1f\x7f]/.test(value);
}
function validScopedRequest(payload, extraKeys = []) {
  return payload !== null && typeof payload === "object" && !Array.isArray(payload) && Object.keys(payload).every((key) => ["sessionId", "workspaceId", ...extraKeys].includes(key)) && Object.hasOwn(payload, "sessionId") !== Object.hasOwn(payload, "workspaceId") && validId(payload.sessionId ?? payload.workspaceId);
}
async function resolveWorkspaceScope(ctx, payload, signal) {
  signal?.throwIfAborted();
  let cwd;
  let workspace;
  if (payload.workspaceId !== void 0) {
    workspace = ctx.workspaceRegistry.get(payload.workspaceId);
    if (!workspace) throw new WorkspaceScopeError("workspace-not-found", "The selected workspace is unavailable.");
    cwd = workspace.path;
  } else {
    const live = ctx.sessions.get(payload.sessionId)?.header;
    const stored = live === void 0 ? await ctx.sessionPersistence.stat(payload.sessionId, { signal }) : void 0;
    const header = live ?? stored?.header;
    if (!header) throw new WorkspaceScopeError("session-not-found", "The selected session is unavailable.");
    cwd = header.cwd;
  }
  signal?.throwIfAborted();
  if (typeof cwd !== "string" || !isAbsolute2(cwd)) {
    throw new WorkspaceScopeError("no-workspace", "Select a workspace or session with an absolute project directory.");
  }
  let workspacePath;
  try {
    workspacePath = await realpath4(cwd);
    if (!(await stat4(workspacePath)).isDirectory()) throw new Error("not a directory");
  } catch {
    throw new WorkspaceScopeError("workspace-unavailable", "The workspace directory is unavailable on this host.");
  }
  signal?.throwIfAborted();
  return {
    workspacePath,
    ...workspace ? { workspaceId: payload.workspaceId, workspaceTitle: workspace.title } : {}
  };
}

// src/host/index.mjs
var name = "workspace-monitor";
var inject = ["connection", "sessions", "sessionPersistence", "jobs", "workspaceRegistry"];
var ROUTE = "/api/workspace-monitor/scan";
var ENDPOINTS = ["scan", "commands", "run", "stop", "output"];
var fail = (code, message) => ({
  ok: false,
  error: { code: `workspace-monitor/${code}`, message, details: {} }
});
function validRequest(payload) {
  return validScopedRequest(payload, ["includeInfrastructure"]) && (payload.includeInfrastructure === void 0 || typeof payload.includeInfrastructure === "boolean");
}
function controlCapability(task, platform) {
  if (!["darwin", "linux"].includes(platform)) return "Stopping tasks is supported on macOS and Linux.";
  if (task.runId) return void 0;
  if (task.infrastructure) return "Tool and infrastructure processes cannot be stopped here.";
  if (task.match !== "cwd") return "Project ownership is inferred; stopping is unavailable.";
  if (!task.processes?.length || task.processes.some((item) => !Number.isFinite(item.startedAt))) {
    return "The process identity could not be verified.";
  }
  return void 0;
}
function currentJobs(ctx, sessionId) {
  const registry = ctx.get?.("jobs") ?? ctx.jobs;
  if (!registry) return [];
  return registry.list(sessionId).filter((job) => job.owner === sessionId && (job.status === "running" || job.status === "stopping")).slice(0, 100).map((job) => ({
    id: job.id,
    label: redactCommand(String(job.label ?? "")).slice(0, 4096),
    status: job.status,
    startedAt: job.startedAt,
    owner: job.owner
  }));
}
function createScanHandler(ctx, {
  scanWorkspace: scanWorkspace2 = scanWorkspace,
  now = Date.now,
  hostname = systemHostname,
  platform = process.platform,
  cacheTtlMs = 2e3,
  scanTimeoutMs = 15e3,
  maxConcurrentScans = 2,
  lifetimeSignal,
  listRuns = async () => []
} = {}) {
  const cache = /* @__PURE__ */ new Map();
  let active = 0;
  const handle = async function handle2(endpoint, payload, signal, peer) {
    if (peer?.principal?.kind !== "owner") return fail("forbidden", "Only the DSH owner can view host processes.");
    if (endpoint !== "scan") return fail("not-found", "Unknown monitor operation.");
    if (!validRequest(payload)) return fail("bad-request", "Provide exactly one sessionId or workspaceId, and an optional includeInfrastructure boolean.");
    if (signal?.aborted || lifetimeSignal?.aborted) return fail("cancelled", "Scan cancelled.");
    const deadline = AbortSignal.timeout(scanTimeoutMs);
    const signals = [deadline, signal, lifetimeSignal].filter(Boolean);
    const scanSignal = AbortSignal.any(signals);
    try {
      const scope = await resolveWorkspaceScope(ctx, payload, scanSignal);
      const { workspacePath } = scope;
      const includeInfrastructure = payload.includeInfrastructure === true;
      const key = JSON.stringify([workspacePath, includeInfrastructure]);
      const previous = cache.get(key);
      let result = previous && now() - previous.at < cacheTtlMs ? previous.result : void 0;
      if (!result) {
        if (active >= maxConcurrentScans) return fail("busy", "Other scans are in progress. Retry in a moment.");
        active += 1;
        try {
          result = await scanWorkspace2({ workspacePath, platform, includeInfrastructure, signal: scanSignal });
          scanSignal.throwIfAborted();
          if (cache.size >= 32) cache.delete(cache.keys().next().value);
          cache.set(key, { at: now(), result });
        } finally {
          active -= 1;
        }
      }
      scanSignal.throwIfAborted();
      let jobs = [];
      const warnings = [...result.warnings ?? []];
      try {
        if (payload.sessionId !== void 0) jobs = currentJobs(ctx, payload.sessionId);
      } catch {
        warnings.push("DSH background job information is temporarily unavailable.");
      }
      let runs = [];
      try {
        runs = await listRuns(workspacePath);
      } catch {
        warnings.push("Started command information is temporarily unavailable.");
      }
      const tasks = (result.tasks ?? []).map((task) => {
        const run2 = runs.find((item) => ["running", "stopping"].includes(item.status) && item.pid && task.pids?.includes(item.pid));
        const next = { ...task, ...run2 ? { runId: run2.runId ?? run2.id } : {} };
        const stopReason = controlCapability(next, platform);
        return { ...next, canStop: stopReason === void 0, ...stopReason ? { stopReason } : {} };
      });
      return {
        ok: true,
        value: {
          ...result,
          ...scope,
          tasks,
          runs,
          warnings,
          host: { platform, hostname: typeof hostname === "function" ? hostname() : hostname },
          jobs,
          capabilities: { readOnly: false, canRun: ["darwin", "linux"].includes(platform), canStop: ["darwin", "linux"].includes(platform), scope: "host", originalCommand: "when-observable" }
        }
      };
    } catch (error) {
      if (signal?.aborted || lifetimeSignal?.aborted) return fail("cancelled", "Scan cancelled.");
      if (deadline.aborted) return fail("timeout", "The process scan timed out. Retry in a moment.");
      if (error instanceof WorkspaceScopeError) return fail(error.code, error.message);
      return fail("scan-failed", "Unable to inspect processes on this host. Retry or check the DSH host log.");
    }
  };
  handle.invalidateCache = () => cache.clear();
  return handle;
}
var actionMessages = {
  "command-not-found": "This script changed or is no longer available. Refresh the command list.",
  "script-not-found": "This script changed or is no longer available. Refresh the command list.",
  "manager-unavailable": "The package manager is not available on the DSH host.",
  "manager-not-found": "The package manager is not installed on the DSH host.",
  "too-many-runs": "Too many commands are running. Stop a command before starting another.",
  "unsupported-platform": "Running and stopping commands is currently supported on macOS and Linux.",
  "launch-failed": "The command could not be started. Check the package manager on the DSH host.",
  "stop-failed": "The process could not be stopped. Refresh the task list to check its status.",
  "runner-unavailable": "The task runner is unavailable. Refresh the page and retry.",
  "invalid-command": "This command is not available in the selected workspace.",
  "bad-request": "Invalid workspace command request.",
  "workspace-unavailable": "The workspace directory is unavailable on this host.",
  "run-not-found": "This started command is no longer available.",
  "unsafe-task": "This process cannot be safely stopped from this workspace.",
  "identity-changed": "The process changed since it was displayed. Refresh the task list.",
  "unsupported": "Running and stopping commands is currently supported on macOS and Linux.",
  "busy": "Too many commands are running. Stop a command before starting another."
};
function createActionHandler(ctx, {
  runner,
  discover = discoverCommands,
  stopTask = stopWorkspaceTask,
  platform = process.platform,
  lifetimeSignal,
  invalidateCache = () => {
  }
} = {}) {
  return async (endpoint, payload, signal, peer) => {
    if (peer?.principal?.kind !== "owner") return fail("forbidden", "Only the DSH owner can manage host processes.");
    if (!["commands", "run", "stop", "output"].includes(endpoint)) return fail("not-found", "Unknown monitor operation.");
    const extra = { commands: [], run: ["commandId"], stop: ["taskId", "runId"], output: ["runId"] }[endpoint];
    if (!validScopedRequest(payload, extra) || endpoint === "run" && !validId(payload.commandId) || endpoint === "output" && !validId(payload.runId) || endpoint === "stop" && (Object.hasOwn(payload, "taskId") === Object.hasOwn(payload, "runId") || !validId(payload.taskId ?? payload.runId, 512))) {
      return fail("bad-request", "Invalid workspace command request.");
    }
    if (signal?.aborted || lifetimeSignal?.aborted) return fail("cancelled", "Operation cancelled.");
    const deadline = AbortSignal.timeout(3e4);
    const operationSignal = AbortSignal.any([signal, lifetimeSignal, deadline].filter(Boolean));
    try {
      const scope = await resolveWorkspaceScope(ctx, payload, operationSignal);
      const { workspacePath } = scope;
      if (endpoint === "commands") {
        const catalog = await discover({ workspacePath, signal: operationSignal });
        const canRun = ["darwin", "linux"].includes(platform);
        return { ok: true, value: { ...catalog, ...scope, commands: catalog.commands.map((command) => ({ ...command, canRun })), capabilities: { canRun } } };
      }
      if (!["darwin", "linux"].includes(platform) && endpoint !== "output") return fail("unsupported", actionMessages.unsupported);
      let value;
      if (endpoint === "run") value = await runner.run({ workspacePath, commandId: payload.commandId, signal: operationSignal });
      else if (endpoint === "output") value = await runner.output({ workspacePath, runId: payload.runId });
      else if (payload.runId !== void 0) value = await runner.stopManaged({ workspacePath, runId: payload.runId });
      else value = await stopTask({ workspacePath, taskId: payload.taskId, signal: operationSignal });
      if (endpoint !== "output") invalidateCache();
      return { ok: true, value };
    } catch (error) {
      if (signal?.aborted || lifetimeSignal?.aborted) return fail("cancelled", "Operation cancelled.");
      if (deadline.aborted) return fail("timeout", "The operation timed out. Refresh the task list to check its status.");
      if (error instanceof WorkspaceScopeError) return fail(error.code, error.message);
      const code = typeof error?.code === "string" ? error.code.replace(/^workspace-monitor\//, "") : "";
      if (actionMessages[code]) return fail(code, actionMessages[code]);
      return fail("action-failed", "Unable to complete this action. Refresh the task list and check the command output.");
    }
  };
}
function createFetchHandler(handler, endpoint = "scan") {
  return async (request) => {
    let message;
    try {
      message = await request.json();
    } catch {
      return new Response("Invalid monitor request.", { status: 400 });
    }
    if (!message || message.type !== "client-request" || message.method !== `workspace-monitor/${endpoint}` || typeof message.rpcId !== "string" || !message.rpcId || message.rpcId.length > 128 || /[\x00-\x1f]/.test(message.rpcId)) {
      return new Response("Invalid monitor request.", { status: 400 });
    }
    const result = await handler(endpoint, message.payload, request.signal, { principal: { kind: "owner" } });
    return Response.json({ type: "server-response", rpcId: message.rpcId, result }, {
      headers: { "cache-control": "no-store" }
    });
  };
}
function apply(ctx) {
  const lifetime = new AbortController();
  const pending = /* @__PURE__ */ new Set();
  const runner = createTaskRunner();
  const scan = createScanHandler(ctx, { lifetimeSignal: lifetime.signal, listRuns: (path3) => runner.list(path3) });
  const actions = createActionHandler(ctx, { runner, lifetimeSignal: lifetime.signal, invalidateCache: scan.invalidateCache });
  for (const endpoint of ENDPOINTS) {
    const fetch = createFetchHandler(endpoint === "scan" ? scan : actions, endpoint);
    ctx.connection.fetch.register({
      path: `/api/workspace-monitor/${endpoint}`,
      methods: ["POST"],
      requestBody: "buffered",
      fetch: (request) => {
        const task = fetch(request);
        pending.add(task);
        void task.then(() => pending.delete(task), () => pending.delete(task));
        return task;
      }
    });
  }
  ctx.effect(() => async () => {
    lifetime.abort();
    await Promise.allSettled(pending);
    await runner.dispose();
  });
}
export {
  ENDPOINTS,
  ROUTE,
  apply,
  createActionHandler,
  createFetchHandler,
  createScanHandler,
  inject,
  name
};
