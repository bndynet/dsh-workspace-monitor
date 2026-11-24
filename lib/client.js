window.__ModuleLoader__.load({id:"@bndynet/dsh-workspace-monitor",factory:(require)=>{
var module={exports:{}};var exports=module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.jsx
var index_exports = {};
__export(index_exports, {
  CommandCatalog: () => CommandCatalog,
  ID: () => ID,
  KIND: () => KIND,
  ManagedRuns: () => ManagedRuns,
  MonitorPanel: () => MonitorPanel,
  Panel: () => Panel,
  StopButton: () => StopButton,
  StopFeedback: () => StopFeedback,
  Task: () => Task,
  WorkspaceHoverContent: () => WorkspaceHoverContent,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react3 = __toESM(require("react"), 1);

// src/client/copy.mjs
var copy = {
  en: {
    title: "Running Tasks",
    description: "Commands, processes, and listening ports in this workspace.",
    workspace: "Workspace",
    host: "Host",
    tasks: "tasks",
    listeners: "endpoints",
    refresh: "Refresh",
    refreshing: "Refreshing\u2026",
    auto: "Auto refresh",
    autoHint: "Refresh every 5 seconds",
    paused: "Paused",
    live: "Every 5s",
    updated: "Updated",
    search: "Filter commands, PIDs, or ports",
    infrastructure: "Include tool processes",
    infrastructureHint: "Include language servers, IDE helpers, and other development tools.",
    noWorkspace: "Choose a workspace to see its running tasks.",
    loading: "Reading workspace processes\u2026",
    emptyTitle: "No running tasks found",
    empty: "Start a command in this project, then refresh. Commands started from another terminal can appear here too.",
    noMatch: "No tasks match your filter.",
    clear: "Clear filter",
    retry: "Try again",
    errorTitle: "Could not refresh tasks",
    stale: "Showing the last successful scan.",
    partial: "Some process details are unavailable",
    noPort: "No listening ports",
    pid: "PID",
    pids: "PIDs",
    uptime: "Uptime",
    cwd: "Working directory",
    processes: "Processes",
    endpoints: "Listening TCP / bound UDP endpoints",
    command: "Process command",
    copied: "Copied",
    copyFailed: "Could not copy. Select the text and copy it manually.",
    copyPort: "Copy endpoint",
    expand: "Show process details",
    collapse: "Hide process details",
    match: "Workspace match",
    matches: { cwd: "Working directory", command: "Project path in command", descendant: "Child of a project process" },
    source: "System scan",
    tool: "Tool process",
    jobs: "DSH background jobs",
    jobsNote: "DSH records these jobs separately. A job may also have a process above.",
    stopping: "Stopping",
    running: "Running",
    scanNote: "A listening port does not confirm application readiness.",
    denied: "This connection does not have permission to read host processes."
  },
  zh: {
    title: "\u8FD0\u884C\u4EFB\u52A1",
    description: "\u67E5\u770B\u5F53\u524D\u9879\u76EE\u7684\u547D\u4EE4\u3001\u8FDB\u7A0B\u548C\u76D1\u542C\u7AEF\u53E3\u3002",
    workspace: "\u9879\u76EE",
    host: "\u4E3B\u673A",
    tasks: "\u4E2A\u4EFB\u52A1",
    listeners: "\u4E2A\u7AEF\u53E3\u7AEF\u70B9",
    refresh: "\u5237\u65B0",
    refreshing: "\u5237\u65B0\u4E2D\u2026",
    auto: "\u81EA\u52A8\u5237\u65B0",
    autoHint: "\u6BCF 5 \u79D2\u5237\u65B0\u4E00\u6B21",
    paused: "\u5DF2\u6682\u505C",
    live: "\u6BCF 5 \u79D2\u5237\u65B0",
    updated: "\u66F4\u65B0\u4E8E",
    search: "\u641C\u7D22\u547D\u4EE4\u3001PID \u6216\u7AEF\u53E3",
    infrastructure: "\u5305\u542B\u5DE5\u5177\u8FDB\u7A0B",
    infrastructureHint: "\u663E\u793A\u8BED\u8A00\u670D\u52A1\u3001IDE \u8F85\u52A9\u7A0B\u5E8F\u7B49\u5F00\u53D1\u5DE5\u5177\u8FDB\u7A0B\u3002",
    noWorkspace: "\u9009\u62E9\u4E00\u4E2A\u9879\u76EE\uFF0C\u5373\u53EF\u67E5\u770B\u8FD0\u884C\u4EFB\u52A1\u3002",
    loading: "\u6B63\u5728\u8BFB\u53D6\u9879\u76EE\u8FDB\u7A0B\u2026",
    emptyTitle: "\u672A\u53D1\u73B0\u8FD0\u884C\u4E2D\u7684\u4EFB\u52A1",
    empty: "\u5728\u8FD9\u4E2A\u9879\u76EE\u4E2D\u542F\u52A8\u547D\u4EE4\u540E\u5237\u65B0\u3002\u4ECE\u5176\u4ED6\u7EC8\u7AEF\u542F\u52A8\u7684\u4EFB\u52A1\u4E5F\u53EF\u4EE5\u51FA\u73B0\u5728\u8FD9\u91CC\u3002",
    noMatch: "\u6CA1\u6709\u5339\u914D\u7684\u8FD0\u884C\u4EFB\u52A1\u3002",
    clear: "\u6E05\u9664\u641C\u7D22",
    retry: "\u91CD\u8BD5",
    errorTitle: "\u5237\u65B0\u4EFB\u52A1\u5931\u8D25",
    stale: "\u5F53\u524D\u663E\u793A\u4E0A\u6B21\u6210\u529F\u626B\u63CF\u7684\u7ED3\u679C\u3002",
    partial: "\u90E8\u5206\u8FDB\u7A0B\u4FE1\u606F\u4E0D\u53EF\u7528",
    noPort: "\u65E0\u76D1\u542C\u7AEF\u53E3",
    pid: "PID",
    pids: "PIDs",
    uptime: "\u5DF2\u8FD0\u884C",
    cwd: "\u5DE5\u4F5C\u76EE\u5F55",
    processes: "\u8FDB\u7A0B",
    endpoints: "TCP \u76D1\u542C / UDP \u7ED1\u5B9A\u7AEF\u70B9",
    command: "\u8FDB\u7A0B\u547D\u4EE4",
    copied: "\u5DF2\u590D\u5236",
    copyFailed: "\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u9009\u4E2D\u6587\u5B57\u540E\u624B\u52A8\u590D\u5236\u3002",
    copyPort: "\u590D\u5236\u7AEF\u70B9",
    expand: "\u663E\u793A\u8FDB\u7A0B\u8BE6\u60C5",
    collapse: "\u6536\u8D77\u8FDB\u7A0B\u8BE6\u60C5",
    match: "\u9879\u76EE\u5F52\u5C5E\u4F9D\u636E",
    matches: { cwd: "\u5DE5\u4F5C\u76EE\u5F55\u5339\u914D", command: "\u547D\u4EE4\u5305\u542B\u9879\u76EE\u8DEF\u5F84", descendant: "\u9879\u76EE\u8FDB\u7A0B\u7684\u5B50\u8FDB\u7A0B" },
    source: "\u7CFB\u7EDF\u626B\u63CF",
    tool: "\u5DE5\u5177\u8FDB\u7A0B",
    jobs: "DSH \u540E\u53F0\u4EFB\u52A1",
    jobsNote: "DSH \u5355\u72EC\u8BB0\u5F55\u8FD9\u4E9B\u4EFB\u52A1\uFF1B\u5B83\u4EEC\u53EF\u80FD\u5BF9\u5E94\u4E0A\u65B9\u5DF2\u7ECF\u5217\u51FA\u7684\u8FDB\u7A0B\u3002",
    stopping: "\u505C\u6B62\u4E2D",
    running: "\u8FD0\u884C\u4E2D",
    scanNote: "\u76D1\u542C\u7AEF\u53E3\u8868\u793A\u8FDB\u7A0B\u5DF2\u7ED1\u5B9A\u7AEF\u53E3\uFF0C\u5E94\u7528\u662F\u5426\u5C31\u7EEA\u8FD8\u9700\u53E6\u884C\u5224\u65AD\u3002",
    denied: "\u5F53\u524D\u8FDE\u63A5\u6CA1\u6709\u67E5\u770B\u4E3B\u673A\u8FDB\u7A0B\u7684\u6743\u9650\u3002"
  }
};

// src/client/model.mjs
function detectLanguage() {
  const language = typeof document !== "undefined" && document.documentElement.lang || (typeof navigator !== "undefined" ? navigator.language : "en");
  return /^zh(?:-|$)/i.test(language) ? "zh" : "en";
}
function displayPath(value = "") {
  const parts = String(value).replace(/[\\/]+$/, "").split(/[\\/]/);
  return parts.at(-1) || String(value);
}
function formatElapsed(startedAt, now = Date.now()) {
  const start = typeof startedAt === "number" ? startedAt : Date.parse(startedAt);
  if (!Number.isFinite(start)) return "\u2014";
  const seconds = Math.max(0, Math.floor((now - start) / 1e3));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor(seconds % 86400 / 3600)}h`;
}
function portAddress(endpoint) {
  const address = String(endpoint.address || "*");
  return `${address.includes(":") && !address.startsWith("[") ? `[${address}]` : address}:${endpoint.port}`;
}
function filterTasks(tasks, query) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return tasks;
  return tasks.filter((task) => {
    const text = [
      task.command,
      task.cwd,
      task.runtime,
      task.pid,
      ...task.pids || [],
      ...(task.ports || []).map((port) => `${port.protocol} ${portAddress(port)}`),
      ...(task.processes || []).map((process) => process.command)
    ].join(" ").toLowerCase();
    return terms.every((term) => text.includes(term));
  });
}
function scanValue(result) {
  if (result?.ok === false) {
    const error = new Error(result.error?.message || "Could not read running tasks.");
    error.code = result.error?.code;
    throw error;
  }
  const value = result?.ok === true ? result.value : result;
  if (!value || !Array.isArray(value.tasks) || typeof value.workspacePath !== "string") {
    throw new Error("The monitor returned an invalid response.");
  }
  return { ...value, warnings: Array.isArray(value.warnings) ? value.warnings : [] };
}
function runningJobs(jobs = [], query = "") {
  const term = query.trim().toLowerCase();
  return jobs.filter((job) => ["running", "stopping"].includes(job.status) && (!term || `${job.label} ${job.id}`.toLowerCase().includes(term)));
}

// src/client/styles.mjs
var styles = `
.dwm-panel{--dwm-text:var(--dsw-alias-label-primary,#202b32);--dwm-muted:var(--dsw-alias-label-secondary,#64747b);--dwm-faint:var(--dsw-alias-label-tertiary,#7b898e);--dwm-line:var(--dsw-alias-border-l3,#e0e7e8);--dwm-surface:var(--dsw-alias-bg-base,#fff);--dwm-raised:var(--dsw-alias-bg-layer-1,#f5f8f8);--dwm-hover:var(--dsw-alias-interactive-bg-hover,#eef3f3);--dwm-accent:var(--dsw-alias-state-business-primary,#087f83);display:flex;flex-direction:column;flex:1;min-width:0;min-height:0;height:100%;box-sizing:border-box;background:var(--dwm-surface);color:var(--dwm-text);font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:left;container-type:inline-size}
.dwm-panel *{box-sizing:border-box}.dwm-panel button,.dwm-panel input{font:inherit}.dwm-panel button{color:inherit}.dwm-panel button:focus-visible,.dwm-panel input:focus-visible,.dwm-panel summary:focus-visible{outline:2px solid var(--dwm-accent);outline-offset:3px}.dwm-panel button{cursor:pointer}.dwm-panel button:disabled{cursor:default;opacity:.55}.dwm-panel svg{display:block;flex:none;width:16px;height:16px}.dwm-panel code{font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow-wrap:anywhere}
.dwm-header{padding:20px 18px 14px;flex:none;border-bottom:1px solid var(--dwm-line)}.dwm-title-row{display:flex;align-items:center;gap:8px}.dwm-title-mark{display:grid;place-items:center;color:var(--dwm-accent);width:26px;height:26px;border:1px solid var(--dwm-line);border-radius:7px}.dwm-title-row h2{font-size:16px;font-weight:600;line-height:1.4;margin:0;flex:1;letter-spacing:-.2px}.dwm-description{margin:8px 0 12px;color:var(--dwm-muted);font-size:12px}.dwm-workspace{display:flex;gap:6px;align-items:baseline;min-width:0}.dwm-workspace strong{font-size:13px;font-weight:550;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dwm-host{font-size:11px;color:var(--dwm-faint);overflow-wrap:anywhere;margin-top:3px}.dwm-workspace-label{font-size:11px;color:var(--dwm-faint);flex:none}.dwm-counts{display:flex;gap:18px;margin-top:14px;color:var(--dwm-muted);font-size:12px}.dwm-counts strong{font-size:19px;color:var(--dwm-text);font-weight:550;line-height:1.1;margin-right:5px;font-variant-numeric:tabular-nums}
.dwm-controls{padding:12px 18px 10px;flex:none;border-bottom:1px solid var(--dwm-line)}.dwm-search{display:flex;align-items:center;gap:7px;min-height:34px;padding:0 9px;border:1px solid var(--dwm-line);border-radius:7px;background:var(--dwm-raised);color:var(--dwm-faint)}.dwm-search input{min-width:0;width:100%;color:var(--dwm-text);border:0;background:none;outline:none;padding:6px 0;font-size:12px}.dwm-search input::placeholder{color:var(--dwm-faint)}.dwm-search:focus-within{border-color:var(--dwm-accent)}.dwm-search input::-webkit-search-cancel-button{-webkit-appearance:none}.dwm-clear{border:0;padding:2px;background:none;color:var(--dwm-muted)!important}.dwm-options{display:flex;align-items:center;flex-wrap:wrap;column-gap:12px;row-gap:7px;margin-top:10px}.dwm-check{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--dwm-muted);cursor:pointer;user-select:none}.dwm-check input{accent-color:var(--dwm-accent);width:13px;height:13px;margin:0;flex:none}.dwm-refresh{display:flex;align-items:center;justify-content:center;gap:5px;border:1px solid var(--dwm-line);border-radius:6px;padding:4px 8px;background:var(--dwm-surface);font-size:11px!important;min-height:27px;margin-left:auto}.dwm-refresh:hover{background:var(--dwm-hover)}.dwm-refresh svg{width:13px;height:13px}.dwm-status{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:9px;min-height:16px;font-size:10px;color:var(--dwm-faint)}.dwm-status-dot{height:5px;width:5px;background:var(--dwm-accent);border-radius:50%;flex:none}.dwm-status[data-paused=true] .dwm-status-dot{background:var(--dwm-faint)}.dwm-updated{margin-left:auto;font-variant-numeric:tabular-nums}.dwm-spin{animation:dwm-spin 1s linear infinite}@keyframes dwm-spin{to{transform:rotate(360deg)}}
.dwm-body{flex:1;min-height:0;overflow:auto;padding:14px 18px 18px;overscroll-behavior:contain}.dwm-task-list{display:flex;flex-direction:column;gap:10px}.dwm-task{border:1px solid var(--dwm-line);border-radius:8px;overflow:hidden;background:var(--dwm-surface)}.dwm-task-toggle{width:100%;border:0;background:transparent;text-align:left;display:flex;align-items:flex-start;gap:8px;padding:12px 12px 8px}.dwm-task-toggle:hover{background:var(--dwm-hover)}.dwm-task-toggle>svg{color:var(--dwm-faint);margin-top:3px;width:13px;height:13px;transition:transform .12s}.dwm-task-toggle[aria-expanded=true]>svg{transform:rotate(90deg)}.dwm-task-heading{min-width:0;flex:1}.dwm-task-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:5px;font-size:10px;color:var(--dwm-faint)}.dwm-runtime{font-size:10px;font-weight:600;color:var(--dwm-accent);border-radius:4px;padding:1px 5px;background:color-mix(in srgb,var(--dwm-accent) 8%,transparent)}.dwm-tool-tag{border:1px solid var(--dwm-line);border-radius:4px;padding:0 4px;font-size:9px}.dwm-uptime{margin-left:auto;font-variant-numeric:tabular-nums}.dwm-command{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;color:var(--dwm-text);white-space:pre-wrap;font-weight:450}.dwm-task-toggle[aria-expanded=true] .dwm-command{-webkit-line-clamp:unset;display:block}.dwm-task-bottom{padding:0 12px 11px 33px}.dwm-cwd{color:var(--dwm-faint);font:10px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:2px 0 8px}.dwm-ports{display:flex;flex-wrap:wrap;gap:5px;align-items:center}.dwm-port{display:inline-flex;align-items:center;gap:5px;font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace!important;padding:3px 6px;border:1px solid var(--dwm-line);border-radius:4px;background:var(--dwm-raised);font-variant-numeric:tabular-nums}.dwm-port:hover{border-color:var(--dwm-accent);color:var(--dwm-accent)}.dwm-port svg{width:10px;height:10px;opacity:.65}.dwm-protocol{font-size:8px;opacity:.7;text-transform:uppercase}.dwm-no-port{font-size:11px;color:var(--dwm-faint)}.dwm-task-details{border-top:1px solid var(--dwm-line);padding:11px 12px;background:var(--dwm-raised)}.dwm-detail-line{font-size:10px;line-height:1.6;margin:0 0 8px;color:var(--dwm-muted);overflow-wrap:anywhere}.dwm-detail-line span{display:block;margin-bottom:2px;color:var(--dwm-faint)}.dwm-detail-line code{font-size:10px;color:var(--dwm-text)}.dwm-detail-heading{font-size:10px;font-weight:600;color:var(--dwm-muted);margin:12px 0 6px}.dwm-process-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}.dwm-process{padding-left:8px;border-left:2px solid var(--dwm-line);min-width:0}.dwm-process-pid{font-size:9px;color:var(--dwm-faint);font-variant-numeric:tabular-nums}.dwm-process code{display:block;font-size:10px;white-space:pre-wrap;color:var(--dwm-muted)}.dwm-endpoint-list{display:flex;flex-wrap:wrap;gap:5px}
.dwm-empty{display:flex;flex-direction:column;align-items:center;text-align:center;max-width:340px;margin:30px auto;padding:10px 5px}.dwm-empty>svg{width:28px;height:28px;color:var(--dwm-faint);margin-bottom:12px}.dwm-empty strong{font-size:13px;font-weight:550}.dwm-empty p{font-size:12px;color:var(--dwm-muted);line-height:1.7;margin:7px 0}.dwm-text-button{padding:3px 0;background:none;border:0;color:var(--dwm-accent)!important;font-size:12px!important;text-decoration:underline;text-underline-offset:3px}.dwm-notice{padding:10px 11px;margin-bottom:12px;border:1px solid var(--dwm-line);border-radius:6px;font-size:11px;color:var(--dwm-muted);background:var(--dwm-raised)}.dwm-notice strong{display:block;color:var(--dwm-text);font-size:11px;margin-bottom:3px;font-weight:550}.dwm-notice p{margin:4px 0;overflow-wrap:anywhere}.dwm-notice[data-error=true]{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#b24940) 45%,var(--dwm-line))}.dwm-notice summary{cursor:pointer;font-weight:500;color:var(--dwm-muted)}.dwm-notice ul{margin:8px 0 0;padding-left:16px}.dwm-notice li+li{margin-top:4px}.dwm-footnote{font-size:10px;color:var(--dwm-faint);line-height:1.6;margin:14px 0 0}.dwm-jobs{margin-top:20px;padding-top:14px;border-top:1px solid var(--dwm-line)}.dwm-jobs h3{margin:0;font-size:12px;font-weight:600}.dwm-jobs-note{font-size:10px;line-height:1.6;margin:5px 0 10px;color:var(--dwm-faint)}.dwm-job{padding:9px 0;border-top:1px solid var(--dwm-line)}.dwm-job code{display:block;font-size:11px;white-space:pre-wrap}.dwm-job-meta{font-size:10px;display:flex;gap:9px;color:var(--dwm-faint);margin-bottom:4px}.dwm-job-meta>span:last-child{margin-left:auto}.dwm-toast{position:sticky;bottom:8px;align-self:center;width:fit-content;max-width:calc(100% - 32px);margin:0 auto 8px;padding:7px 11px;box-shadow:0 2px 12px #0001;border:1px solid var(--dwm-line);border-radius:6px;background:var(--dwm-raised);color:var(--dwm-text);font-size:11px;z-index:1}
@container (max-width:330px){.dwm-header{padding:15px 12px 12px}.dwm-controls{padding:10px 12px}.dwm-body{padding:12px}.dwm-options{column-gap:8px}.dwm-refresh{padding:4px 6px}.dwm-task-toggle{padding:10px 9px 7px;gap:5px}.dwm-task-bottom{padding-left:27px;padding-right:9px}.dwm-task-meta{gap:5px}.dwm-uptime{font-size:9px}.dwm-description{font-size:11px}}
@media (prefers-reduced-motion:reduce){.dwm-spin{animation:none}.dwm-task-toggle>svg{transition:none}}
`;

// src/client/hover.jsx
var import_react2 = __toESM(require("react"), 1);
var import_react_dom = require("react-dom");

// src/client/hover-model.mjs
var WORKSPACE_ROW_SELECTOR = '[role="treeitem"][data-row-key^="workspace:"]';
var WORKSPACE_LIST_SELECTOR = '[data-slot="sidebar.workspaces"]';
function compactWorkspaceCommand(command, workspacePath) {
  let label = String(command || "");
  const first = label.match(/^(?:"([^"]+)"|'([^']+)'|(\S+))/);
  const executable = first && (first[1] || first[2] || first[3]);
  if (executable && (/^\//.test(executable) || /^[A-Za-z]:[\\/]/.test(executable))) {
    const basename = executable.split(/[\\/]/).at(-1);
    label = `${/\s/.test(basename) ? `"${basename}"` : basename}${label.slice(first[0].length)}`;
  }
  const root = String(workspacePath || "").replace(/[\\/]+$/, "");
  if (!root) return label;
  const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const path = root.split(/[\\/]/).map(escape).join("[\\\\/]");
  const prefix = new RegExp(`(^|[\\s="'])${path}[\\\\/]`, "g");
  return label.replace(prefix, "$1./");
}
function groupManagedRunTasks(tasks = [], runs = []) {
  const activeRuns = runs.filter((run) => ["running", "stopping"].includes(run.status));
  if (!activeRuns.length || !tasks.length) return tasks;
  const processByPid = /* @__PURE__ */ new Map();
  for (const task of tasks) {
    for (const process of task.processes || []) processByPid.set(process.pid, process);
    if (!processByPid.has(task.pid)) processByPid.set(task.pid, { pid: task.pid, ppid: 0, command: task.command });
  }
  const isDescendantOf = (pid, ancestor) => {
    const seen = /* @__PURE__ */ new Set();
    let process = processByPid.get(pid);
    while (process?.ppid && !seen.has(process.ppid)) {
      if (process.ppid === ancestor) return true;
      seen.add(process.ppid);
      process = processByPid.get(process.ppid);
    }
    return false;
  };
  const hidden = /* @__PURE__ */ new Set();
  const rootsByTask = /* @__PURE__ */ new Map();
  const roots = activeRuns.flatMap((run) => {
    const runId = run.runId || run.id;
    const root = tasks.find((task) => runId && task.runId === runId || run.pid && task.pids?.includes(run.pid));
    return root ? [{ run, root, pid: run.pid || root.pid }] : [];
  });
  for (const { run, root, pid } of roots) {
    if (!pid) continue;
    const hiddenForRoot = /* @__PURE__ */ new Set();
    for (const task of tasks) {
      if (task === root) continue;
      const pids = task.pids?.length ? task.pids : [task.pid];
      if (pids.some((childPid) => childPid !== pid && isDescendantOf(childPid, pid))) {
        hidden.add(task);
        hiddenForRoot.add(task);
      }
    }
    const childProcesses = [...processByPid.values()].filter((process) => process.pid !== pid && isDescendantOf(process.pid, pid)).sort((a, b) => a.pid - b.pid).map((process) => ({ pid: process.pid, command: process.command }));
    const ports = [...new Map([
      ...root.ports || [],
      ...[...hiddenForRoot].flatMap((task) => task.ports || [])
    ].map((port) => [`${port.protocol}:${port.address}:${port.port}`, port])).values()];
    rootsByTask.set(root, {
      ...root,
      command: run.command || run.label || root.command,
      ports,
      ...childProcesses.length ? { childProcesses } : {}
    });
  }
  return tasks.filter((task) => !hidden.has(task)).map((task) => rootsByTask.get(task) || task);
}
function workspaceTarget(element, workspaces) {
  const node = element?.nodeType === 3 ? element.parentElement : element;
  const row = node?.closest?.(WORKSPACE_ROW_SELECTOR);
  if (!row || !row.closest(WORKSPACE_LIST_SELECTOR) || row.closest("[hidden], [inert]")) return null;
  const key = row.getAttribute("data-row-key");
  const workspaceId = key?.startsWith("workspace:") ? key.slice("workspace:".length) : "";
  const workspace = workspaces.find((item) => item.workspaceId === workspaceId);
  if (!workspace) return null;
  return { row, workspaceId, title: workspace.title, path: workspace.path };
}
function placeWorkspaceHover(rect, viewport, measuredHeight = 240) {
  const margin = 10;
  const gap = 8;
  const width = Math.max(0, Math.min(344, viewport.width - margin * 2));
  const maxHeight = Math.max(0, Math.min(430, viewport.height - margin * 2));
  const height = Math.min(measuredHeight, maxHeight);
  let side = "right";
  let left = rect.right + gap;
  let top = rect.top;
  if (left + width > viewport.width - margin) {
    if (rect.left - gap - width >= margin) {
      side = "left";
      left = rect.left - gap - width;
    } else {
      side = "bottom";
      left = Math.max(margin, Math.min(rect.left, viewport.width - width - margin));
      top = rect.bottom + gap;
      if (top + height > viewport.height - margin && rect.top - gap - height >= margin) {
        side = "top";
        top = rect.top - gap - height;
      }
    }
  }
  left = Math.max(margin, Math.min(left, viewport.width - width - margin));
  top = Math.max(margin, Math.min(top, viewport.height - height - margin));
  const bridge = side === "right" || side === "left" ? { left: side === "right" ? rect.right : left + width, top: Math.min(rect.top, top), width: gap, height: Math.max(rect.bottom, top + height) - Math.min(rect.top, top) } : { left: Math.min(rect.left, left), top: side === "bottom" ? rect.bottom : top + height, width: Math.max(rect.right, left + width) - Math.min(rect.left, left), height: gap };
  return { left, top, width, maxHeight, bridge };
}
function createHoverDismissal(inRegion) {
  let pointerInside = false;
  return {
    pointerEnter() {
      pointerInside = true;
    },
    pointerExit() {
      pointerInside = false;
    },
    pointerOut(target, related) {
      if (!inRegion(target)) return null;
      if (inRegion(related)) {
        pointerInside = true;
        return "keep";
      }
      pointerInside = false;
      return "leave";
    },
    focusOut(target, related) {
      if (!inRegion(target)) return null;
      if (inRegion(related) || pointerInside) return "keep";
      return related ? "leave" : null;
    },
    get pointerInside() {
      return pointerInside;
    }
  };
}
function createWorkspaceHover({ scan, onChange, setTimer = setTimeout, clearTimer = clearTimeout, openDelay = 350, closeDelay = 180 }) {
  let current = null;
  let state = null;
  let openTimer;
  let closeTimer;
  let controller;
  let generation = 0;
  let disposed = false;
  let suppressedRow = null;
  let suppressedTarget = null;
  let scanning = false;
  const publish = (value) => {
    state = value;
    onChange(value);
  };
  const cancelTimers = () => {
    clearTimer(openTimer);
    clearTimer(closeTimer);
  };
  function close(suppress = false) {
    cancelTimers();
    generation += 1;
    controller?.abort();
    scanning = false;
    if (suppress && current) {
      suppressedRow = current.row;
      suppressedTarget = current;
    }
    current = null;
    publish(null);
  }
  async function load(preserve = false, skipIfBusy = false) {
    if (disposed || !current || skipIfBusy && scanning) return;
    controller?.abort();
    controller = new AbortController();
    scanning = true;
    const signal = controller.signal;
    const token = ++generation;
    const target = current;
    const previous = preserve ? state?.snapshot : null;
    publish({ target, status: previous ? "ready" : "loading", snapshot: previous || null, error: null });
    try {
      const snapshot = scanValue(await scan({ workspaceId: target.workspaceId, includeInfrastructure: false }, signal));
      if (!disposed && !signal.aborted && generation === token) publish({ target, status: "ready", snapshot, error: null });
    } catch (error) {
      if (!disposed && !signal.aborted && generation === token) publish({ target, status: "error", snapshot: null, error: error instanceof Error ? error : new Error(String(error)) });
    } finally {
      if (generation === token) scanning = false;
    }
  }
  return {
    enter(target) {
      if (disposed || !target || target.row === suppressedRow) return;
      suppressedRow = null;
      suppressedTarget = null;
      clearTimer(closeTimer);
      if (current?.row === target.row && current.workspaceId === target.workspaceId) {
        if (state === null) {
          clearTimer(openTimer);
          openTimer = setTimer(() => void load(), openDelay);
        }
        return;
      }
      close();
      current = target;
      openTimer = setTimer(() => {
        if (current?.row?.isConnected !== false) void load();
        else close();
      }, openDelay);
    },
    leave() {
      if (disposed) return;
      suppressedRow = null;
      suppressedTarget = null;
      clearTimer(openTimer);
      clearTimer(closeTimer);
      closeTimer = setTimer(() => close(), closeDelay);
    },
    keep() {
      if (!disposed) clearTimer(closeTimer);
    },
    dismiss() {
      if (!disposed) close(true);
    },
    retry() {
      if (!disposed && state?.status === "error") void load();
    },
    refresh({ skipIfBusy = false } = {}) {
      if (!disposed && current) void load(true, skipIfBusy);
    },
    getTarget() {
      return current;
    },
    getAnchorTarget() {
      return current || suppressedTarget;
    },
    getSuppressedTarget() {
      return suppressedTarget;
    },
    getState() {
      return state;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelTimers();
      generation += 1;
      controller?.abort();
      current = null;
      state = null;
    }
  };
}
var NATIVE_CARD_SELECTOR = 'body > span > div[role="button"][aria-label][style]';
var NATIVE_MARKER = "data-dwm-native-workspace-hover";
function isNativeWorkspaceHover(card, workspacePath) {
  return typeof workspacePath === "string" && workspacePath.length > 0 && card.getAttribute("role") === "button" && Boolean(card.style.getPropertyValue("--dsh-hover-preview-fade")) && card.getAttribute("aria-label")?.endsWith(`: ${workspacePath}`) === true;
}
function suppressNativeWorkspaceHover(document2, workspacePath, Observer = globalThis.MutationObserver) {
  const marked = /* @__PURE__ */ new Map();
  const mark = (card) => {
    if (!isNativeWorkspaceHover(card, workspacePath) || marked.has(card)) return;
    marked.set(card, card.getAttribute(NATIVE_MARKER));
    card.setAttribute(NATIVE_MARKER, "active");
  };
  const inspect = () => {
    for (const card of document2.querySelectorAll(NATIVE_CARD_SELECTOR)) mark(card);
  };
  inspect();
  const observer = new Observer(inspect);
  observer.observe(document2.body, { childList: true });
  return () => {
    observer.disconnect();
    for (const [card, previous] of marked) {
      if (card.getAttribute(NATIVE_MARKER) !== "active") continue;
      if (previous === null) card.removeAttribute(NATIVE_MARKER);
      else card.setAttribute(NATIVE_MARKER, previous);
    }
    marked.clear();
  };
}

// src/client/execution.jsx
var import_react = __toESM(require("react"), 1);

// src/client/execution-model.mjs
function rpcValue(result) {
  if (result?.ok === false) {
    const error = new Error(result.error?.message || "The operation failed.");
    error.code = result.error?.code;
    throw error;
  }
  return result?.ok === true ? result.value : result;
}
var identityKey = (identity) => identity?.workspaceId ? `workspace:${identity.workspaceId}` : identity?.sessionId ? `session:${identity.sessionId}` : "";
var runKey = (run) => run?.runId || run?.id;
var isActiveRun = (run) => ["running", "stopping"].includes(run?.status);
var stopKey = (task) => `stop:${task.runId || task.id}`;
var stopRequest = (task) => task.runId ? { runId: task.runId } : { taskId: task.id };
function mergeRuns(scanned = [], local = []) {
  const runs = new Map(local.map((run) => [runKey(run), run]));
  for (const run of scanned) {
    const previous = runs.get(runKey(run));
    if (previous && (!isActiveRun(previous) && isActiveRun(run) || previous.status === "stopping" && run.status === "running")) continue;
    runs.set(runKey(run), run);
  }
  return [...runs.values()].sort((a, b) => b.startedAt - a.startedAt);
}
function unlistedRuns(runs = [], tasks = []) {
  const listed = new Set(tasks.map((task) => task.runId).filter(Boolean));
  return runs.filter((run) => !isActiveRun(run) || !listed.has(runKey(run)));
}
function filterCommands(commands = [], query = "") {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return commands.filter((command) => terms.every((term) => [command.label, command.script, command.relativeDirectory, command.definition, command.packageName, command.command].join(" ").toLowerCase().includes(term)));
}
function emptyExecution(contextKey = "") {
  return { contextKey, commands: null, commandStatus: "idle", commandError: null, warnings: [], operations: {}, runs: [], capabilities: {} };
}
function createExecutionManager({ actions = {}, onChange, onChanged = () => {
} }) {
  let identity = null;
  let state = emptyExecution();
  let commandController;
  let commandGeneration = 0;
  let disposed = false;
  const pending = /* @__PURE__ */ new Map();
  const actionControllers = /* @__PURE__ */ new Set();
  const publish = (patch) => {
    state = { ...state, ...patch };
    if (!disposed) onChange(state);
  };
  const operation = (key, patch) => publish({ operations: { ...state.operations, [key]: { ...state.operations[key], ...patch } } });
  async function commands() {
    if (disposed || !identity || typeof actions.commands !== "function") return;
    commandController?.abort();
    commandController = new AbortController();
    const signal = commandController.signal;
    const context = identityKey(identity);
    const request = { ...identity };
    const generation = ++commandGeneration;
    publish({ commandStatus: "loading", commandError: null });
    try {
      const result = rpcValue(await actions.commands(request, signal));
      if (!result || !Array.isArray(result.commands)) throw new Error("The command catalog returned an invalid response.");
      if (!disposed && !signal.aborted && generation === commandGeneration && state.contextKey === context) publish({ commandStatus: "ready", commands: result.commands, warnings: result.warnings || [], capabilities: result.capabilities || {} });
    } catch (error) {
      if (!disposed && !signal.aborted && generation === commandGeneration && state.contextKey === context) publish({ commandStatus: "error", commandError: error instanceof Error ? error : new Error(String(error)) });
    }
  }
  function execute(kind, request, key) {
    if (disposed || !identity || typeof actions[kind] !== "function") return Promise.resolve(void 0);
    const context = identityKey(identity);
    const uniqueKey = `${context}:${key}`;
    if (pending.has(uniqueKey)) return pending.get(uniqueKey);
    const targetIdentity = { ...identity };
    const controller = new AbortController();
    actionControllers.add(controller);
    operation(key, { pending: true, error: null, result: null });
    const task = Promise.resolve().then(() => actions[kind]({ ...targetIdentity, ...request }, controller.signal)).then(rpcValue).then((result) => {
      if (!disposed && state.contextKey === context) {
        const runs = runKey(result) && result.status ? mergeRuns([], [...state.runs.filter((run) => runKey(run) !== runKey(result)), result]) : state.runs;
        publish({ runs });
        operation(key, { pending: false, result });
        onChanged(result, targetIdentity, kind);
      }
      return result;
    }, (error) => {
      if (!disposed && state.contextKey === context) operation(key, { pending: false, error: error instanceof Error ? error : new Error(String(error)) });
      return void 0;
    }).finally(() => {
      pending.delete(uniqueKey);
      actionControllers.delete(controller);
    });
    pending.set(uniqueKey, task);
    return task;
  }
  return {
    setIdentity(next) {
      if (disposed || identityKey(next) === state.contextKey) return;
      commandController?.abort();
      commandGeneration += 1;
      identity = next ? next.workspaceId ? { workspaceId: next.workspaceId } : { sessionId: next.sessionId } : null;
      state = emptyExecution(identityKey(identity));
      onChange(state);
      void commands();
    },
    commands,
    run(commandId) {
      return execute("run", { commandId }, `run:${commandId}`);
    },
    stop(task) {
      return execute("stop", stopRequest(task), stopKey(task));
    },
    getState() {
      return state;
    },
    dispose() {
      disposed = true;
      commandController?.abort();
      for (const controller of actionControllers) controller.abort();
    }
  };
}

// src/client/execution.jsx
var import_jsx_runtime = require("react/jsx-runtime");
var executionCopy = {
  en: {
    commands: "Available commands",
    loading: "Reading package scripts\u2026",
    empty: "No package scripts found.",
    noMatch: "No commands match your filter.",
    retry: "Try again",
    catalogError: "Could not load commands.",
    run: "Run command",
    stop: "Stop task",
    stopping: "Stopping\u2026",
    starting: "Starting\u2026",
    alreadyRunning: "Already running",
    unavailable: "Stopping is unavailable for this process.",
    runUnavailable: "Running commands is unavailable on this host.",
    definition: "Script definition",
    root: "Project root",
    launched: "Launched here",
    running: "Running",
    stopped: "Stopped",
    completed: "Completed",
    failed: "Failed",
    exit: "Exit",
    output: "Output",
    refresh: "Refresh output",
    loadingOutput: "Reading output\u2026",
    noOutput: "No output yet.",
    truncated: "Earlier output was truncated.",
    outputError: "Could not read output.",
    actionError: "Action failed",
    partial: "Some command locations could not be read.",
    partialStop: "Some processes are still running. Refresh to check them.",
    alreadyFinished: "The task has already finished."
  },
  zh: {
    commands: "\u53EF\u8FD0\u884C\u547D\u4EE4",
    loading: "\u6B63\u5728\u8BFB\u53D6\u9879\u76EE\u811A\u672C\u2026",
    empty: "\u672A\u53D1\u73B0 package.json \u811A\u672C\u3002",
    noMatch: "\u6CA1\u6709\u5339\u914D\u7684\u547D\u4EE4\u3002",
    retry: "\u91CD\u8BD5",
    catalogError: "\u8BFB\u53D6\u547D\u4EE4\u5931\u8D25\u3002",
    run: "\u8FD0\u884C\u547D\u4EE4",
    stop: "\u505C\u6B62\u4EFB\u52A1",
    stopping: "\u505C\u6B62\u4E2D\u2026",
    starting: "\u542F\u52A8\u4E2D\u2026",
    alreadyRunning: "\u5DF2\u5728\u8FD0\u884C",
    unavailable: "\u6B64\u8FDB\u7A0B\u6682\u4E0D\u652F\u6301\u505C\u6B62\u3002",
    runUnavailable: "\u5F53\u524D\u4E3B\u673A\u4E0D\u652F\u6301\u542F\u52A8\u547D\u4EE4\u3002",
    definition: "\u811A\u672C\u5B9A\u4E49",
    root: "\u9879\u76EE\u6839\u76EE\u5F55",
    launched: "\u63D2\u4EF6\u542F\u52A8\u4EFB\u52A1",
    running: "\u8FD0\u884C\u4E2D",
    stopped: "\u5DF2\u505C\u6B62",
    completed: "\u5DF2\u5B8C\u6210",
    failed: "\u5931\u8D25",
    exit: "\u9000\u51FA\u7801",
    output: "\u8F93\u51FA\u65E5\u5FD7",
    refresh: "\u5237\u65B0\u65E5\u5FD7",
    loadingOutput: "\u6B63\u5728\u8BFB\u53D6\u65E5\u5FD7\u2026",
    noOutput: "\u6682\u65E0\u8F93\u51FA\u3002",
    truncated: "\u8F83\u65E9\u7684\u65E5\u5FD7\u5DF2\u622A\u65AD\u3002",
    outputError: "\u8BFB\u53D6\u65E5\u5FD7\u5931\u8D25\u3002",
    actionError: "\u64CD\u4F5C\u5931\u8D25",
    partial: "\u90E8\u5206\u76EE\u5F55\u7684\u811A\u672C\u672A\u80FD\u8BFB\u53D6\u3002",
    partialStop: "\u90E8\u5206\u8FDB\u7A0B\u4ECD\u5728\u8FD0\u884C\uFF0C\u8BF7\u5237\u65B0\u540E\u67E5\u770B\u3002",
    alreadyFinished: "\u4EFB\u52A1\u5DF2\u7ECF\u7ED3\u675F\u3002"
  }
};
var executionStyles = `
.dwm-icon-action{display:inline-flex;align-items:center;justify-content:center;flex:none;width:27px;height:27px;min-width:27px;padding:6px;border:1px solid var(--dsw-alias-border-l3,#dfe7e8);border-radius:5px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-secondary,#637078);cursor:pointer}.dwm-icon-action svg{display:block;width:12px;height:12px;flex:none}.dwm-icon-action:hover:not(:disabled){color:var(--dsw-alias-state-business-primary,#087f83);border-color:currentColor}.dwm-icon-action:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#087f83);outline-offset:2px}.dwm-icon-action:disabled{opacity:.42;cursor:default}.dwm-icon-stop:hover:not(:disabled){color:var(--dsw-alias-state-error-primary,#b24940)}.dwm-task-topline{display:flex;align-items:flex-start}.dwm-task-topline>.dwm-task-toggle{min-width:0;flex:1}.dwm-task-stop{margin:12px 10px 0 0;display:flex;flex:none}.dwm-action-section{margin-top:18px;padding-top:13px;border-top:1px solid var(--dsw-alias-border-l3,#dfe7e8)}.dwm-action-section h3,.dwm-command-section-title{margin:0 0 8px;font-size:12px;font-weight:600}.dwm-command-item{padding:9px 0;border-bottom:1px solid var(--dsw-alias-border-l3,#dfe7e8)}.dwm-command-item:last-child{border-bottom:0}.dwm-command-row{display:flex;align-items:center;gap:8px}.dwm-command-info{flex:1;min-width:0}.dwm-script-name{font:600 12px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow-wrap:anywhere}.dwm-script-directory{font-size:10px;color:var(--dsw-alias-label-tertiary,#7b898e);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dwm-command-details{margin-top:5px;font-size:10px;color:var(--dsw-alias-label-secondary,#64747b)}.dwm-command-details summary{cursor:pointer;overflow-wrap:anywhere}.dwm-command-definition{display:block;margin:6px 0 0;padding:6px 8px;border-radius:4px;background:var(--dsw-alias-bg-base,#fff);font:10px/1.7 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}.dwm-action-note{font-size:11px;color:var(--dsw-alias-label-secondary,#64747b);padding:7px 0}.dwm-action-error{margin-top:6px;color:var(--dsw-alias-state-error-primary,#b24940);font-size:10px;line-height:1.6;overflow-wrap:anywhere}.dwm-run-state{font-size:10px;color:var(--dsw-alias-label-secondary,#64747b);font-variant-numeric:tabular-nums}.dwm-run-state[data-failed=true]{color:var(--dsw-alias-state-error-primary,#b24940)}.dwm-run-record{padding:9px 0;border-bottom:1px solid var(--dsw-alias-border-l3,#dfe7e8)}.dwm-run-record:last-child{border-bottom:0}.dwm-run-heading{display:flex;align-items:center;gap:8px}.dwm-run-heading>div{flex:1;min-width:0}.dwm-run-label{font:11px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow-wrap:anywhere}.dwm-output{margin-top:8px;font-size:10px}.dwm-output summary{cursor:pointer;color:var(--dsw-alias-label-secondary,#64747b)}.dwm-output-toolbar{display:flex;align-items:center;gap:8px;margin-top:6px}.dwm-output-toolbar button{font:10px/1.5 inherit;padding:3px 6px;border:1px solid var(--dsw-alias-border-l3,#dfe7e8);border-radius:4px;background:var(--dsw-alias-bg-base,#fff);color:inherit;cursor:pointer}.dwm-output pre{font:10px/1.7 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;max-height:220px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0 0;padding:8px;border-radius:4px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#202b32)}.dwm-output-note{font-size:10px;color:var(--dsw-alias-label-tertiary,#7b898e);margin-top:4px}.dwm-hover .dwm-command-item{padding:4px 0}.dwm-hover .dwm-command-details{margin:0;font-size:11px}.dwm-hover .dwm-command-details summary{min-height:24px;align-content:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dwm-hover .dwm-command-details summary::marker{font-size:8px;color:var(--dsw-alias-label-tertiary,#7b898e)}.dwm-hover .dwm-script-name{font-size:11px}.dwm-hover .dwm-script-directory{display:inline;margin-left:8px;font-size:10px}.dwm-hover .dwm-command-definition{margin:3px 0;font-size:10px}.dwm-hover .dwm-icon-action{width:24px;min-width:24px;height:24px;padding:5px}.dwm-hover-action-section{padding:4px 12px;border-top:1px solid var(--dsw-alias-border-l3,#dfe7e8)}.dwm-hover-task-row{display:flex;align-items:center;gap:8px}.dwm-hover-task-main{min-width:0;flex:1}.dwm-hover .dwm-run-record{padding:5px 0}.dwm-hover .dwm-run-heading>div{display:flex;align-items:center;gap:8px;min-width:0}.dwm-hover .dwm-run-label{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dwm-hover .dwm-run-state{flex:none;font-size:9px}.dwm-hover .dwm-action-note{padding:4px 0}
`;
function useExecution({ identity, actions, onChanged }) {
  const [value, setValue] = (0, import_react.useState)(null);
  const changed = (0, import_react.useRef)(onChanged);
  changed.current = onChanged;
  const context = identityKey(identity);
  const manager = (0, import_react.useMemo)(() => createExecutionManager({ actions, onChange: setValue, onChanged: (...args) => changed.current?.(...args) }), [actions]);
  (0, import_react.useEffect)(() => () => manager.dispose(), [manager]);
  (0, import_react.useEffect)(() => {
    manager.setIdentity(identity);
  }, [manager, context]);
  return { state: value?.contextKey === context ? value : emptyExecution(context), manager };
}
function ActionIcon({ kind }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { viewBox: "0 0 16 16", fill: "currentColor", "aria-hidden": "true", children: kind === "stop" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "3", y: "3", width: "10", height: "10", rx: "1" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 2.5v11l9-5.5z" }) });
}
function runStatus(run, text) {
  const status = text[run?.status] || run?.status || "";
  return `${status}${run?.exitCode !== void 0 && run?.exitCode !== null ? ` \xB7 ${text.exit} ${run.exitCode}` : ""}${run?.signal ? ` \xB7 ${run.signal}` : ""}`;
}
function StopButton({ task, operation, onStop, language = "en" }) {
  const text = executionCopy[language] || executionCopy.en;
  const stopping = operation?.pending || operation?.result?.status === "stopping" || task.status === "stopping";
  const allowed = task.canStop === true;
  const reason = stopping ? text.stopping : allowed ? `${text.stop}: ${task.label || task.command || task.pid}` : task.stopReason || text.unavailable;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dwm-icon-action dwm-icon-stop", onClick: () => onStop?.(task), disabled: !allowed || stopping || !onStop, title: reason, "aria-label": reason, "data-dwm-stop": true, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionIcon, { kind: "stop" }) });
}
function StopFeedback({ operation, language = "en" }) {
  const text = executionCopy[language] || executionCopy.en;
  const status = operation?.pending ? "stopping" : operation?.result?.status;
  const label = status === "partial" ? text.partialStop : status === "already-finished" ? text.alreadyFinished : status === "stopping" ? text.stopping : status === "stopped" ? text.stopped : null;
  return label ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: status === "partial" ? "dwm-action-error" : "dwm-run-state", role: "status", children: label }) : null;
}
function CommandCatalog({ state, runs = [], onRun, onStop, onRetry, query = "", language = "en", compact = false }) {
  const text = executionCopy[language] || executionCopy.en;
  const commands = filterCommands(state.commands || [], query);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: compact ? "dwm-hover-action-section" : "dwm-action-section", "data-dwm-commands": true, "aria-label": compact ? text.commands : void 0, children: [
    !compact && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "dwm-command-section-title", children: text.commands }),
    ["idle", "loading"].includes(state.commandStatus) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dwm-action-note", role: "status", children: text.loading }),
    state.commandStatus === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dwm-action-note", role: "alert", children: [
      text.catalogError,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dwm-text-button", onClick: onRetry, children: text.retry })
    ] }),
    state.commandStatus === "ready" && commands.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dwm-action-note", children: query.trim() ? text.noMatch : text.empty }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dwm-command-list", children: commands.map((command) => {
      const operation = state.operations[`run:${command.id}`];
      const active = runs.find((run) => run.commandId === command.id && isActiveRun(run));
      const runDisabled = command.canRun === false || state.capabilities.canRun === false;
      const title = operation?.pending ? text.starting : runDisabled ? text.runUnavailable : `${text.run}: ${command.label || command.script}`;
      const stopOperation = active ? state.operations[stopKey({ runId: runKey(active) })] : null;
      const launch = command.command || `${command.manager || "npm"} run ${command.script}`;
      const nested = command.relativeDirectory && command.relativeDirectory !== ".";
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: "dwm-command-item", "data-dwm-command-id": command.id, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dwm-command-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dwm-command-info", children: [
            compact ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "dwm-command-details", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", { title: `${launch}
${command.directory || ""}`, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dwm-script-name", children: command.script || command.label }),
                nested && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dwm-script-directory", children: command.relativeDirectory })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("code", { className: "dwm-command-definition", children: [
                launch,
                "\n",
                command.definition
              ] })
            ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dwm-script-name", children: command.script || command.label }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dwm-script-directory", title: command.directory, children: [
                nested ? command.relativeDirectory : text.root,
                command.packageName ? ` \xB7 ${command.packageName}` : ""
              ] })
            ] }),
            active && (!compact || active.status === "stopping") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RunState, { run: active, text })
          ] }),
          active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StopButton, { task: { ...active, runId: runKey(active), canStop: active.canStop !== false && state.capabilities.canStop !== false }, operation: stopOperation, onStop, language }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dwm-icon-action", onClick: () => onRun(command.id), disabled: operation?.pending || runDisabled, title, "aria-label": title, "data-dwm-run": true, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionIcon, { kind: "run" }) })
        ] }),
        !compact && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "dwm-command-details", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: launch }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { className: "dwm-command-definition", children: command.definition })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StopFeedback, { operation: stopOperation, language }),
        (operation?.error || stopOperation?.error) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dwm-action-error", role: "alert", children: [
          text.actionError,
          ": ",
          (operation?.error || stopOperation?.error).message
        ] })
      ] }, command.id);
    }) }),
    !compact && state.warnings?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dwm-output-note", children: text.partial })
  ] });
}
function RunState({ run, text }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dwm-run-state", "data-failed": run.status === "failed" || Number(run.exitCode) > 0, children: runStatus(run, text) });
}
function RunOutput({ run, identity, actions, language = "en" }) {
  const text = executionCopy[language] || executionCopy.en;
  const [open, setOpen] = (0, import_react.useState)(false);
  const [result, setResult] = (0, import_react.useState)(run);
  const [error, setError] = (0, import_react.useState)(null);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [refresh, setRefresh] = (0, import_react.useState)(0);
  const context = identityKey(identity);
  (0, import_react.useEffect)(() => {
    if (!open || !actions?.output) return;
    let disposed = false;
    let timer;
    let controller;
    async function read() {
      controller = new AbortController();
      setBusy(true);
      let next;
      try {
        next = rpcValue(await actions.output({ ...identity, runId: runKey(run) }, controller.signal));
        if (!disposed) {
          setResult(next);
          setError(null);
        }
      } catch (cause) {
        if (!disposed && !controller.signal.aborted) setError(cause);
      } finally {
        if (!disposed) {
          setBusy(false);
          if (isActiveRun(next)) timer = setTimeout(read, 3e3);
        }
      }
    }
    void read();
    return () => {
      disposed = true;
      controller?.abort();
      clearTimeout(timer);
    };
  }, [open, context, runKey(run), run.status, actions, refresh]);
  const output = String(result?.output || "").replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "dwm-output", onToggle: (event) => setOpen(event.currentTarget.open), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: text.output }),
    open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dwm-output-toolbar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => setRefresh((value) => value + 1), disabled: busy, children: text.refresh }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RunState, { run: result || run, text })
      ] }),
      error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dwm-action-error", role: "alert", children: text.outputError }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { children: output || (busy ? text.loadingOutput : text.noOutput) }),
      result?.truncated && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dwm-output-note", children: text.truncated })
    ] })
  ] });
}
function ManagedRuns({ runs, operations, onStop, identity, actions, language = "en", compact = false, canStop = true }) {
  const text = executionCopy[language] || executionCopy.en;
  if (!runs.length) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: compact ? "dwm-hover-action-section" : "dwm-action-section", "data-dwm-managed-runs": true, "aria-label": compact ? text.launched : void 0, children: [
    !compact && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "dwm-command-section-title", children: text.launched }),
    (compact ? runs.slice(0, 3) : runs).map((run) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: "dwm-run-record", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dwm-run-heading", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dwm-run-label", title: run.label, children: compact ? run.command || run.label : run.label || run.command }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RunState, { run, text })
        ] }),
        isActiveRun(run) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StopButton, { task: { ...run, runId: runKey(run), canStop: canStop && run.canStop !== false }, operation: operations[stopKey({ runId: runKey(run) })], onStop, language })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StopFeedback, { operation: operations[stopKey({ runId: runKey(run) })], language }),
      operations[stopKey({ runId: runKey(run) })]?.error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dwm-action-error", role: "alert", children: operations[stopKey({ runId: runKey(run) })].error.message }),
      !compact && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RunOutput, { run, identity, actions, language })
    ] }, runKey(run)))
  ] });
}

// src/client/hover.jsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var copy2 = {
  en: {
    title: "Running tasks",
    loading: "Reading running tasks\u2026",
    empty: "No running tasks found.",
    error: "Could not read running tasks.",
    retry: "Try again",
    more: (count) => `+${count} more tasks`,
    count: (count) => `${count} ${count === 1 ? "task" : "tasks"}`,
    morePorts: (count) => `Show ${count} more endpoints`,
    collapsePorts: "Less",
    collapsePortsLabel: "Collapse endpoints",
    endpoints: "All listening endpoints",
    childProcesses: (count) => `Show ${count} child process ${count === 1 ? "command" : "commands"}`
  },
  zh: {
    title: "\u8FD0\u884C\u4EFB\u52A1",
    loading: "\u6B63\u5728\u8BFB\u53D6\u8FD0\u884C\u4EFB\u52A1\u2026",
    empty: "\u672A\u53D1\u73B0\u8FD0\u884C\u4E2D\u7684\u4EFB\u52A1\u3002",
    error: "\u65E0\u6CD5\u8BFB\u53D6\u8FD0\u884C\u4EFB\u52A1\u3002",
    retry: "\u91CD\u8BD5",
    more: (count) => `\u8FD8\u6709 ${count} \u4E2A\u4EFB\u52A1`,
    count: (count) => `${count} \u4E2A\u4EFB\u52A1`,
    morePorts: (count) => `\u5C55\u5F00\u5176\u4F59 ${count} \u4E2A\u7AEF\u53E3\u7AEF\u70B9`,
    collapsePorts: "\u6536\u8D77",
    collapsePortsLabel: "\u6536\u8D77\u7AEF\u53E3\u5217\u8868",
    endpoints: "\u5168\u90E8\u76D1\u542C\u7AEF\u70B9",
    childProcesses: (count) => `\u663E\u793A ${count} \u6761\u5B50\u8FDB\u7A0B\u547D\u4EE4`
  }
};
var hoverStyles = `
[data-dwm-native-workspace-hover="active"]{visibility:hidden!important;pointer-events:none!important}
.dwm-hover{--dwm-hover-text:var(--dsw-alias-label-primary,#202b32);--dwm-hover-muted:var(--dsw-alias-label-secondary,#64747b);--dwm-hover-line:var(--dsw-alias-border-l3,#dfe7e8);--dwm-hover-surface:var(--dsw-alias-bg-layer-1,#fff);--dwm-hover-accent:var(--dsw-alias-state-business-primary,#087f83);position:fixed;z-index:110;box-sizing:border-box;overflow-y:auto;overflow-x:hidden;background:var(--dwm-hover-surface);color:var(--dwm-hover-text);border:1px solid var(--dwm-hover-line);border-radius:10px;box-shadow:0 8px 32px #0002;overscroll-behavior:contain;font:12px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:left;-webkit-app-region:no-drag}
.dwm-hover *{box-sizing:border-box}.dwm-hover-head{padding:9px 12px 8px;border-bottom:1px solid var(--dwm-hover-line)}.dwm-hover-heading{display:flex;align-items:center;gap:10px}.dwm-hover-heading h2{font:600 13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;min-width:0;flex:1;text-overflow:ellipsis;overflow:hidden;white-space:nowrap}.dwm-hover-count{flex:none;font-size:10px;color:var(--dwm-hover-muted);font-variant-numeric:tabular-nums}.dwm-hover-label{font-size:10px;color:var(--dwm-hover-muted);margin:2px 0 0}.dwm-hover-path{font:10px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;margin:5px 0 0;color:var(--dwm-hover-muted);overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.dwm-hover-list{list-style:none;margin:0;padding:1px 12px}.dwm-hover-task{padding:5px 0;border-bottom:1px solid var(--dwm-hover-line)}.dwm-hover-task:last-child{border-bottom:0}.dwm-hover-command{min-width:0;flex:1;font:11px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;user-select:text}.dwm-hover-meta{display:flex;align-items:center;gap:4px;flex:none}.dwm-hover-port{font:10px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;display:inline-block;padding:1px 5px;color:var(--dwm-hover-accent);border:1px solid var(--dwm-hover-line);border-radius:4px;background:var(--dsw-alias-bg-base,#fff);font-variant-numeric:tabular-nums}.dwm-hover-no-port{color:var(--dwm-hover-muted);font-size:11px}.dwm-hover-pid{font-size:9px;color:var(--dwm-hover-muted);margin-left:auto;font-variant-numeric:tabular-nums}.dwm-hover-status{padding:9px 12px;color:var(--dwm-hover-muted);font-size:12px}.dwm-hover-status p{margin:0;line-height:1.6;overflow-wrap:anywhere}.dwm-hover-retry{margin:8px 0 0;padding:3px 7px;border:1px solid var(--dwm-hover-line);border-radius:5px;background:var(--dsw-alias-bg-base,#fff);color:var(--dwm-hover-text);cursor:pointer;font:11px/1.5 inherit}.dwm-hover-retry:focus-visible{outline:2px solid var(--dwm-hover-accent);outline-offset:2px}.dwm-hover-footer{padding:5px 12px;color:var(--dwm-hover-muted);font-size:10px;border-top:1px solid var(--dwm-hover-line)}.dwm-hover-bridge{position:fixed;z-index:109;-webkit-app-region:no-drag}
.dwm-hover .dwm-hover-task-row{align-items:flex-start}.dwm-hover .dwm-hover-task-main{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;min-width:0;flex:1}.dwm-hover .dwm-hover-command{flex:1 1 84px;min-width:0;max-width:100%}.dwm-hover .dwm-hover-meta{min-width:0;max-width:100%;flex:0 1 auto;flex-wrap:wrap}.dwm-hover-port-toggle{flex:none;max-width:100%;min-height:20px;border:0;border-radius:3px;padding:2px 3px;background:transparent;color:var(--dwm-hover-accent);font:10px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}.dwm-hover-port-toggle:hover{background:var(--dsw-alias-interactive-bg-hover,#eef3f3)}.dwm-hover-port-toggle:focus-visible{outline:2px solid var(--dwm-hover-accent);outline-offset:2px}.dwm-hover-endpoints{flex:1 0 100%;min-width:0;display:grid;grid-template-columns:minmax(0,1fr);gap:3px;margin-top:2px;padding:4px 0;overscroll-behavior:contain}.dwm-hover-endpoints[hidden]{display:none}.dwm-hover-endpoint{min-width:0;max-width:100%;font:10px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:normal;overflow-wrap:anywhere;color:var(--dwm-hover-muted)}.dwm-hover-endpoint-protocol{color:var(--dwm-hover-accent)}
.dwm-hover{display:flex;flex-direction:column;overflow:hidden}.dwm-hover>*{flex:none}.dwm-hover>section[data-dwm-commands]{display:flex;flex:1 1 auto;flex-direction:column;min-height:0}.dwm-hover>section[data-dwm-commands]>.dwm-command-list{flex:1 1 auto;min-height:0;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;margin:0 -12px;padding:0 12px}
.dwm-hover-child-processes{flex:1 0 100%;min-width:0;color:var(--dwm-hover-muted);font-size:10px}.dwm-hover-child-processes summary{width:fit-content;max-width:100%;color:var(--dwm-hover-accent);cursor:pointer;overflow-wrap:anywhere}.dwm-hover-child-processes ul{list-style:none;margin:4px 0 2px;padding:0 0 0 8px;border-left:1px solid var(--dwm-hover-line)}.dwm-hover-child-processes li+li{margin-top:3px}.dwm-hover-child-processes code{display:block;overflow-wrap:anywhere;font:10px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}

`;
function WorkspaceHoverOverlay({ useWorkspaces, scan, actions }) {
  const workspaces = useWorkspaces((snapshot) => snapshot.items);
  const workspacesRef = (0, import_react2.useRef)(workspaces);
  workspacesRef.current = workspaces;
  const [state, setState] = (0, import_react2.useState)(null);
  const [suppressionTarget, setSuppressionTarget] = (0, import_react2.useState)(null);
  const [position, setPosition] = (0, import_react2.useState)(null);
  const [language, setLanguage] = (0, import_react2.useState)(detectLanguage);
  const controllerRef = (0, import_react2.useRef)(null);
  const dismissalRef = (0, import_react2.useRef)(null);
  const popoverRef = (0, import_react2.useRef)(null);
  const id = `dwm-workspace-hover-${(0, import_react2.useId)().replace(/[^A-Za-z0-9_-]/g, "")}`;
  const execution = useExecution({ identity: state ? { workspaceId: state.target.workspaceId } : null, actions, onChanged: (_result, identity) => {
    if (controllerRef.current?.getTarget()?.workspaceId === identity.workspaceId) controllerRef.current.refresh();
  } });
  const hasActiveRuns = mergeRuns(state?.snapshot?.runs, execution.state.runs).some(isActiveRun);
  (0, import_react2.useEffect)(() => {
    if (!state || !hasActiveRuns) return;
    const workspaceId = state.target.workspaceId;
    let timer;
    const sync = () => {
      clearInterval(timer);
      if (document.hidden) return;
      timer = setInterval(() => {
        if (controllerRef.current?.getTarget()?.workspaceId === workspaceId) controllerRef.current.refresh({ skipIfBusy: true });
      }, 3e3);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [state?.target.workspaceId, hasActiveRuns]);
  (0, import_react2.useEffect)(() => {
    let controller;
    controller = createWorkspaceHover({ scan, onChange: (next) => {
      setState(next);
      setSuppressionTarget(next?.target || controller.getSuppressedTarget());
    } });
    controllerRef.current = controller;
    const enter = (target) => {
      controller.enter(target);
      setSuppressionTarget(controller.getAnchorTarget());
    };
    const inPopover = (node) => Boolean(node?.nodeType && popoverRef.current?.contains(node));
    const inCurrentRow = (node) => Boolean(node?.nodeType && controller.getAnchorTarget()?.row.contains(node));
    const inRegion = (node) => inPopover(node) || inCurrentRow(node) || Boolean(node?.closest?.("[data-dwm-hover-bridge]"));
    const dismissal = createHoverDismissal(inRegion);
    dismissalRef.current = dismissal;
    const settle = (action) => {
      if (action === "keep") controller.keep();
      else if (action === "leave") controller.leave();
    };
    const pointerOver = (event) => {
      if (document.hidden || event.pointerType === "touch" || event.buttons) return;
      if (inPopover(event.target) || event.target.closest?.("[data-dwm-hover-bridge]")) {
        dismissal.pointerEnter();
        controller.keep();
        return;
      }
      const target = workspaceTarget(event.target, workspacesRef.current);
      if (!target) return;
      dismissal.pointerEnter();
      if (workspaceTarget(event.relatedTarget, workspacesRef.current)?.row !== target.row) enter(target);
    };
    const pointerOut = (event) => {
      if (inPopover(event.target) || event.target.closest?.("[data-dwm-hover-bridge]")) return;
      settle(dismissal.pointerOut(event.target, event.relatedTarget));
    };
    const focusIn = (event) => {
      if (document.hidden) return;
      if (inPopover(event.target)) {
        controller.keep();
        return;
      }
      const target = workspaceTarget(event.target, workspacesRef.current);
      if (target) enter(target);
    };
    const focusOut = (event) => settle(dismissal.focusOut(event.target, event.relatedTarget));
    const keyDown = (event) => {
      if (event.key === "Escape") controller.dismiss();
    };
    const dismissOutside = (event) => {
      if (!inPopover(event.target)) controller.dismiss();
    };
    const hide = () => {
      if (document.hidden) controller.dismiss();
    };
    const listeners = [
      ["pointerover", pointerOver],
      ["pointerout", pointerOut],
      ["focusin", focusIn],
      ["focusout", focusOut],
      ["keydown", keyDown],
      ["pointerdown", dismissOutside],
      ["contextmenu", dismissOutside],
      ["dragstart", dismissOutside],
      ["visibilitychange", hide]
    ];
    for (const [name, listener] of listeners) document.addEventListener(name, listener);
    return () => {
      controller.dispose();
      controllerRef.current = null;
      dismissalRef.current = null;
      for (const [name, listener] of listeners) document.removeEventListener(name, listener);
    };
  }, [scan]);
  (0, import_react2.useEffect)(() => {
    if (state && !workspaces.some((workspace) => workspace.workspaceId === state.target.workspaceId)) controllerRef.current?.dismiss();
  }, [workspaces, state]);
  (0, import_react2.useEffect)(() => {
    const observer = new MutationObserver(() => setLanguage(detectLanguage()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);
  (0, import_react2.useEffect)(() => {
    if (!suppressionTarget) return;
    return suppressNativeWorkspaceHover(document, suppressionTarget.path);
  }, [suppressionTarget?.row, suppressionTarget?.path]);
  (0, import_react2.useLayoutEffect)(() => {
    if (!state) {
      setPosition(null);
      return;
    }
    const row = state.target.row;
    const place = () => {
      const rect = row.getBoundingClientRect();
      if (!row.isConnected || row.closest("[hidden], [inert]") || rect.width === 0 || rect.height === 0 || rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
        controllerRef.current?.dismiss();
        return;
      }
      setPosition(placeWorkspaceHover(rect, { width: window.innerWidth, height: window.innerHeight }, popoverRef.current?.offsetHeight || 240));
    };
    place();
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    resize?.observe(row);
    if (popoverRef.current) resize?.observe(popoverRef.current);
    const visibility = new MutationObserver(place);
    if (row.parentElement) visibility.observe(row.parentElement, { childList: true });
    if (row.parentElement?.parentElement) visibility.observe(row.parentElement.parentElement, { childList: true });
    for (let ancestor = row; ancestor; ancestor = ancestor.parentElement) visibility.observe(ancestor, { attributes: true, attributeFilter: ["hidden", "inert", "style", "class"] });
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      resize?.disconnect();
      visibility.disconnect();
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [state?.target.row, state?.status, state?.snapshot]);
  if (typeof document === "undefined") return null;
  if (!state) return suppressionTarget ? (0, import_react_dom.createPortal)(/* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("style", { children: [
    hoverStyles,
    executionStyles
  ] }), document.body) : null;
  const keep = () => {
    dismissalRef.current?.pointerEnter();
    controllerRef.current?.keep();
  };
  const leave = () => {
    dismissalRef.current?.pointerExit();
    controllerRef.current?.leave();
  };
  return (0, import_react_dom.createPortal)(/* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("style", { children: [
      hoverStyles,
      executionStyles
    ] }),
    position && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dwm-hover-bridge", "data-dwm-hover-bridge": true, "aria-hidden": "true", style: position.bridge, onPointerEnter: keep, onPointerLeave: leave }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "div",
      {
        ref: popoverRef,
        className: "dwm-hover",
        "data-dwm-hover": true,
        "data-workspace-id": state.target.workspaceId,
        role: "dialog",
        "aria-modal": "false",
        "aria-labelledby": id,
        onPointerEnter: keep,
        onPointerLeave: leave,
        style: { left: position?.left ?? 0, top: position?.top ?? 0, width: position?.width ?? 344, maxHeight: position?.maxHeight ?? 430, visibility: position ? "visible" : "hidden" },
        children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(WorkspaceHoverContent, { state, language, headingId: id, onRetry: () => controllerRef.current?.retry(), execution: actions ? execution : void 0 })
      }
    )
  ] }), document.body);
}
function WorkspaceHoverContent({ state, language = "en", headingId, onRetry, execution }) {
  const text = copy2[language] || copy2.en;
  const tasks = state.snapshot?.tasks || [];
  const runs = mergeRuns(state.snapshot?.runs, execution?.state.runs);
  const displayTasks = groupManagedRunTasks(tasks, runs);
  const catalog = execution?.state;
  const commands = catalog?.commands || [];
  const representedRuns = new Set(displayTasks.slice(0, 5).map((task) => task.runId).filter(Boolean));
  const representedCommands = new Set(runs.filter((run) => isActiveRun(run) && representedRuns.has(runKey(run))).map((run) => run.commandId));
  const availableCommands = commands.filter((command) => !representedCommands.has(command.id));
  const showCatalog = catalog && (catalog.commandStatus !== "ready" || !commands.length || availableCommands.length > 0);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("header", { className: "dwm-hover-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dwm-hover-heading", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { id: headingId, children: state.target.title }),
        state.status === "ready" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dwm-hover-count", children: text.count(displayTasks.length) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "dwm-hover-path", title: state.target.path, children: state.target.path })
    ] }),
    state.status === "loading" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dwm-hover-status", role: "status", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: text.loading }) }),
    state.status === "error" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dwm-hover-status", role: "alert", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: text.error }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "dwm-hover-retry", onClick: onRetry, children: text.retry })
    ] }),
    state.status === "ready" && (displayTasks.length === 0 ? !execution && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dwm-hover-status", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: text.empty }) }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ol", { className: "dwm-hover-list", children: displayTasks.slice(0, 5).map((task) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      WorkspaceHoverTask,
      {
        task,
        workspacePath: state.target.path,
        language,
        execution
      },
      `${state.target.workspaceId || state.target.path}:${task.id || `${task.pid}:${task.startedAt || ""}`}`
    )) })),
    state.status === "ready" && displayTasks.length > 5 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("footer", { className: "dwm-hover-footer", children: text.more(displayTasks.length - 5) }),
    showCatalog && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(CommandCatalog, { state: { ...catalog, commands: availableCommands }, runs, onRun: execution.manager.run, onStop: execution.manager.stop, onRetry: execution.manager.commands, language, compact: true })
  ] });
}
function WorkspaceHoverTask({ task, workspacePath, language = "en", execution }) {
  const [expanded, setExpanded] = (0, import_react2.useState)(false);
  const controlsId = `dwm-hover-endpoints-${(0, import_react2.useId)().replace(/[^A-Za-z0-9_-]/g, "")}`;
  const operation = execution?.state.operations[stopKey(task)];
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("li", { className: "dwm-hover-task", "data-dwm-hover-task": true, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dwm-hover-task-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dwm-hover-task-main", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("code", { className: "dwm-hover-command", title: `${task.command}
PID ${task.pid}`, children: compactWorkspaceCommand(task.command, workspacePath) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(HoverTaskPorts, { ports: task.ports || [], expanded, onToggle: () => setExpanded((value) => !value), controlsId, language }),
        task.childProcesses?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("details", { className: "dwm-hover-child-processes", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("summary", { children: (copy2[language] || copy2.en).childProcesses(task.childProcesses.length) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ul", { children: task.childProcesses.map((process) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("code", { title: `PID ${process.pid}`, children: compactWorkspaceCommand(process.command, workspacePath) }) }, process.pid)) })
        ] })
      ] }),
      execution && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(StopButton, { task, operation, onStop: execution.manager.stop, language })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(StopFeedback, { operation, language }),
    operation?.error && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dwm-action-error", role: "alert", children: operation.error.message })
  ] });
}
function HoverTaskPorts({ ports, expanded, onToggle, controlsId, language = "en" }) {
  const text = copy2[language] || copy2.en;
  const extra = Math.max(0, ports.length - 4);
  const label = expanded ? text.collapsePortsLabel : text.morePorts(extra);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dwm-hover-meta", children: [
      !expanded && (ports.length ? ports.slice(0, 4).map((port, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "dwm-hover-port", title: `${port.protocol} ${portAddress(port)}`, children: [
        port.protocol === "udp" ? "UDP " : "",
        port.port
      ] }, index)) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dwm-hover-no-port", children: "\u2014" })),
      (extra > 0 || expanded) && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "dwm-hover-port-toggle", onClick: onToggle, "aria-expanded": expanded, "aria-controls": controlsId, "aria-label": label, title: label, "data-dwm-hover-port-toggle": true, children: expanded ? text.collapsePorts : `+${extra}` })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { id: controlsId, className: "dwm-hover-endpoints", hidden: !expanded, role: "region", "aria-label": text.endpoints, "data-dwm-hover-endpoints": true, children: expanded && ports.map((port, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("code", { className: "dwm-hover-endpoint", "data-dwm-hover-endpoint": true, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dwm-hover-endpoint-protocol", children: (port.protocol || "tcp").toUpperCase() }),
      " ",
      portAddress(port)
    ] }, `${port.protocol}-${port.address}-${port.port}-${index}`)) })
  ] });
}

// src/client/index.jsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var ID = "dsh-workspace-monitor";
var KIND = "workspace-monitor";
var inject = ["slots", "sidebarRightTabs", "connection", "uiWorkspace"];
function Icon({ name, ...props }) {
  const paths = {
    tasks: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M3 4h18v13H3zM8 21h8M12 17v4" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "m7 8 3 2-3 2m6 0h4" })
    ] }),
    search: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "10.5", cy: "10.5", r: "6.5" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "m16 16 5 5" })
    ] }),
    refresh: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M20 7v5h-5M4 17v-5h5" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M6.1 6.1a8 8 0 0 1 13 2.4M4.9 15.5a8 8 0 0 0 13 2.4" })
    ] }),
    chevron: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "m9 5 7 7-7 7" }),
    close: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "m6 6 12 12M6 18 18 6" }),
    copy: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("rect", { x: "8", y: "8", width: "12", height: "13", rx: "2" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" })
    ] })
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", ...props, children: paths[name] || paths.tasks });
}
function Panel({ useSessions, sessionId, useTabInfo, scan, actions }) {
  const workspacePath = useSessions((sessions) => sessions.byId[sessionId]?.cwd);
  const { tab } = useTabInfo();
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(MonitorPanel, { workspacePath, sessionId, scan, actions, visible: tab.visible !== false }, `${sessionId}:${workspacePath}`);
}
function MonitorPanel({ workspacePath, sessionId, scan, actions, visible = true, language: fixedLanguage }) {
  const [language, setLanguage] = (0, import_react3.useState)(fixedLanguage || detectLanguage);
  const [query, setQuery] = (0, import_react3.useState)("");
  const [automatic, setAutomatic] = (0, import_react3.useState)(true);
  const [includeInfrastructure, setIncludeInfrastructure] = (0, import_react3.useState)(false);
  const [snapshotState, setSnapshotState] = (0, import_react3.useState)(null);
  const [busy, setBusy] = (0, import_react3.useState)(false);
  const [error, setError] = (0, import_react3.useState)(null);
  const [expanded, setExpanded] = (0, import_react3.useState)(/* @__PURE__ */ new Set());
  const [toast, setToast] = (0, import_react3.useState)("");
  const refresh = (0, import_react3.useRef)(() => {
  });
  const previousContext = (0, import_react3.useRef)("");
  const toastTimer = (0, import_react3.useRef)();
  const text = copy[fixedLanguage || language] || copy.en;
  const requestContext = JSON.stringify([sessionId, workspacePath, includeInfrastructure]);
  const snapshot = snapshotState?.context === requestContext ? snapshotState.value : null;
  const execution = useExecution({ identity: sessionId && workspacePath ? { sessionId } : null, actions, onChanged: () => refresh.current() });
  const runs = mergeRuns(snapshot?.runs, execution.state.runs);
  const manualRefresh = () => {
    refresh.current();
    if (actions) void execution.manager.commands();
  };
  (0, import_react3.useEffect)(() => {
    if (fixedLanguage || typeof MutationObserver === "undefined") return;
    const update = () => setLanguage(detectLanguage());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, [fixedLanguage]);
  (0, import_react3.useEffect)(() => () => clearTimeout(toastTimer.current), []);
  (0, import_react3.useEffect)(() => {
    const context = JSON.stringify([sessionId, workspacePath, includeInfrastructure]);
    if (previousContext.current !== context) {
      previousContext.current = context;
      setSnapshotState(null);
      setError(null);
      setExpanded(/* @__PURE__ */ new Set());
    }
    let disposed = false;
    let inFlight = false;
    let queued = false;
    let timer;
    let controller;
    const active = () => visible && (typeof document === "undefined" || !document.hidden);
    const schedule = () => {
      clearTimeout(timer);
      if (!disposed && automatic && active()) timer = setTimeout(load, 5e3);
    };
    async function load() {
      clearTimeout(timer);
      if (disposed || !sessionId || !workspacePath || !active()) return;
      if (inFlight) {
        queued = true;
        return;
      }
      inFlight = true;
      controller = new AbortController();
      setBusy(true);
      try {
        const next = scanValue(await scan({ sessionId, includeInfrastructure }, controller.signal));
        if (!disposed && !controller.signal.aborted) {
          setSnapshotState({ context, value: next });
          setError(null);
        }
      } catch (cause) {
        if (!disposed && !controller.signal.aborted) setError(cause instanceof Error ? cause : new Error(String(cause)));
      } finally {
        inFlight = false;
        if (!disposed) {
          setBusy(false);
          if (queued && active()) {
            queued = false;
            void load();
          } else schedule();
        }
      }
    }
    refresh.current = load;
    const onVisibility = () => {
      clearTimeout(timer);
      if (!active()) {
        queued = false;
        controller?.abort();
      } else void load();
    };
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
    void load();
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
      refresh.current = () => {
      };
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [sessionId, workspacePath, includeInfrastructure, automatic, visible, scan]);
  const copyText = (0, import_react3.useCallback)(async (value) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      setToast(text.copied);
    } catch {
      setToast(text.copyFailed);
    }
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3e3);
  }, [text]);
  const tasks = filterTasks(snapshot?.tasks || [], query);
  const jobs = runningJobs(snapshot?.jobs, query);
  const endpointCount = (snapshot?.tasks || []).reduce((sum, task) => sum + (task.ports?.length || 0), 0);
  const toggle = (id) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const updated = snapshot?.scannedAt ? new Date(snapshot.scannedAt).toLocaleTimeString(fixedLanguage || language, { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : null;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: "dwm-panel", "aria-label": text.title, "data-dwm-panel": true, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("style", { children: [
      styles,
      executionStyles
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { className: "dwm-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dwm-title-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dwm-title-mark", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon, { name: "tasks" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { children: text.title })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dwm-description", children: text.description }),
      workspacePath && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dwm-workspace", title: workspacePath, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dwm-workspace-label", children: text.workspace }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: displayPath(workspacePath) })
        ] }),
        snapshot?.host && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dwm-host", children: [
          text.host,
          " \xB7 ",
          snapshot.host.hostname || snapshot.host.name || snapshot.host.platform,
          " ",
          snapshot.host.hostname ? `\xB7 ${snapshot.host.platform}` : ""
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dwm-counts", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: snapshot ? snapshot.tasks.length : "\u2014" }),
            text.tasks
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: snapshot ? endpointCount : "\u2014" }),
            text.listeners
          ] })
        ] })
      ] })
    ] }),
    workspacePath && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dwm-controls", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dwm-search", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon, { name: "search" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { type: "search", value: query, onChange: (event) => setQuery(event.target.value), placeholder: text.search, "aria-label": text.search, "data-dwm-search": true }),
        query && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "dwm-clear", "aria-label": text.clear, onClick: () => setQuery(""), children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon, { name: "close" }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dwm-options", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { className: "dwm-check", title: text.autoHint, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { type: "checkbox", checked: automatic, onChange: (event) => setAutomatic(event.target.checked), "data-dwm-auto": true }),
          text.auto
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { className: "dwm-check", title: text.infrastructureHint, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { type: "checkbox", checked: includeInfrastructure, onChange: (event) => setIncludeInfrastructure(event.target.checked), "data-dwm-infrastructure": true }),
          text.infrastructure
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("button", { type: "button", className: "dwm-refresh", onClick: manualRefresh, disabled: busy, "aria-label": text.refresh, "data-dwm-refresh": true, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon, { name: "refresh", className: busy ? "dwm-spin" : "" }),
          text.refresh
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dwm-status", "data-paused": !automatic || !visible, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dwm-status-dot" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: busy ? text.refreshing : automatic && visible ? text.live : text.paused }),
        updated && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "dwm-updated", children: [
          text.updated,
          " ",
          updated
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dwm-body", "aria-busy": busy, children: !workspacePath ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dwm-empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon, { name: "tasks" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: text.noWorkspace })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
      error && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dwm-notice", role: "alert", "data-error": "true", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: text.errorTitle }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: ["forbidden", "gateway/forbidden", "monitor/forbidden", "workspace-monitor/forbidden"].includes(error.code) ? text.denied : error.message }),
        snapshot && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: text.stale }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "dwm-text-button", disabled: busy, onClick: () => refresh.current(), children: text.retry })
      ] }),
      snapshot?.warnings?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("details", { className: "dwm-notice", "data-dwm-warnings": true, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("summary", { children: [
          text.partial,
          " (",
          snapshot.warnings.length,
          ")"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("ul", { children: snapshot.warnings.map((warning, index) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("li", { children: String(warning) }, index)) })
      ] }),
      busy && !snapshot && !error && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dwm-empty", role: "status", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon, { name: "refresh", className: "dwm-spin" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: text.loading })
      ] }),
      snapshot && tasks.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dwm-empty", "data-dwm-empty": true, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon, { name: "tasks" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: query.trim() ? text.noMatch : text.emptyTitle }),
        query.trim() ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "dwm-text-button", onClick: () => setQuery(""), children: text.clear }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: text.empty })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dwm-task-list", children: tasks.map((task) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Task, { task, expanded: expanded.has(task.id || task.pid), toggle: () => toggle(task.id || task.pid), text, onCopy: copyText, now: snapshot?.scannedAt, language: fixedLanguage || language, onStop: actions ? execution.manager.stop : void 0, operation: execution.state.operations[stopKey(task)], run: runs.find((run) => runKey(run) === task.runId), identity: { sessionId }, actions }, task.id || task.pid)) }),
      actions && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ManagedRuns, { runs: filterTasks(unlistedRuns(runs, snapshot?.tasks), query), operations: execution.state.operations, onStop: execution.manager.stop, identity: { sessionId }, actions, language: fixedLanguage || language, canStop: snapshot?.capabilities?.canStop !== false }),
      actions && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(CommandCatalog, { state: execution.state, runs, onRun: execution.manager.run, onStop: execution.manager.stop, onRetry: execution.manager.commands, query, language: fixedLanguage || language }),
      jobs.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: "dwm-jobs", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("h3", { children: [
          text.jobs,
          " (",
          jobs.length,
          ")"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dwm-jobs-note", children: text.jobsNote }),
        jobs.map((job) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("article", { className: "dwm-job", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dwm-job-meta", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: job.status === "stopping" ? text.stopping : text.running }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: job.id }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: formatElapsed(job.startedAt, snapshot.scannedAt) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("code", { children: job.label })
        ] }, job.id))
      ] }),
      snapshot && tasks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dwm-footnote", children: text.scanNote })
    ] }) }),
    toast && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dwm-toast", role: "status", children: toast })
  ] });
}
function Task({ task, expanded, toggle, text, onCopy, now, language = "en", onStop, operation, run, identity, actions }) {
  const ports = task.ports || [];
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("article", { className: "dwm-task", "data-dwm-task": true, "data-pid": task.pid, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dwm-task-topline", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("button", { type: "button", className: "dwm-task-toggle", onClick: toggle, "aria-expanded": expanded, "aria-label": `${expanded ? text.collapse : text.expand}: ${task.command}`, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon, { name: "chevron" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dwm-task-heading", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dwm-task-meta", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dwm-runtime", children: task.runtime || "process" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
              text.pid,
              " ",
              task.pid
            ] }),
            task.infrastructure && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dwm-tool-tag", children: text.tool }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dwm-uptime", title: text.uptime, children: formatElapsed(task.startedAt, now) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("code", { className: "dwm-command", children: task.command })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dwm-task-stop", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(StopButton, { task, operation, onStop, language }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dwm-task-bottom", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dwm-cwd", title: task.cwd, children: task.cwd || "\u2014" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dwm-ports", children: ports.length ? ports.map((port, index) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("button", { type: "button", className: "dwm-port", onClick: () => onCopy(portAddress(port)), title: `${text.copyPort}: ${port.protocol?.toUpperCase()} ${portAddress(port)}`, "aria-label": `${text.copyPort} ${portAddress(port)}`, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dwm-protocol", children: port.protocol || "tcp" }),
        port.port,
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon, { name: "copy" })
      ] }, `${port.protocol}-${port.address}-${port.port}-${index}`)) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dwm-no-port", children: text.noPort }) }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(StopFeedback, { operation, language }),
      operation?.error && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dwm-action-error", role: "alert", children: operation.error.message })
    ] }),
    expanded && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dwm-task-details", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { className: "dwm-detail-line", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: text.cwd }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("code", { children: task.cwd || "\u2014" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { className: "dwm-detail-line", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: text.match }),
        text.matches[task.match] || text.source
      ] }),
      ports.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h4", { className: "dwm-detail-heading", children: text.endpoints }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dwm-endpoint-list", children: ports.map((port, index) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("button", { type: "button", className: "dwm-port", onClick: () => onCopy(portAddress(port)), title: text.copyPort, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dwm-protocol", children: port.protocol }),
          portAddress(port),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon, { name: "copy" })
        ] }, index)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("h4", { className: "dwm-detail-heading", children: [
        text.processes,
        " (",
        task.processes?.length || 1,
        ")"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("ul", { className: "dwm-process-list", children: (task.processes?.length ? task.processes : [task]).map((process) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("li", { className: "dwm-process", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "dwm-process-pid", children: [
          "PID ",
          process.pid,
          process.ppid ? ` \xB7 PPID ${process.ppid}` : ""
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("code", { children: process.command }),
        process.cwd && process.cwd !== task.cwd && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("code", { children: process.cwd })
      ] }, process.pid)) }),
      run && actions && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(RunOutput, { run, identity, actions, language })
    ] })
  ] });
}
function degrade(label, error) {
  console.error(`workspace-monitor: ${label} is unavailable in this DSH Web client; the remaining integrations stay registered.`, error);
}
function apply(ctx) {
  if (typeof ctx?.effect !== "function" || typeof ctx?.slots?.inject !== "function" || typeof ctx?.connection?.rpc?.call !== "function") {
    console.warn("workspace-monitor: this DSH Web client does not expose the slot and RPC services the plugin needs; the plugin stays inactive.");
    return;
  }
  const text = () => copy[detectLanguage()];
  const scan = (request, signal) => ctx.connection.rpc.call("/api", "workspace-monitor/scan", request, signal);
  const actions = Object.fromEntries(["commands", "run", "stop", "output"].map((endpoint) => [endpoint, (request, signal) => ctx.connection.rpc.call("/api", `workspace-monitor/${endpoint}`, request, signal)]));
  try {
    ctx.effect(() => ctx.sidebarRightTabs.register({
      id: ID,
      kind: KIND,
      title: () => text().title,
      guide: [{ id: "running-tasks", order: 40, title: () => text().title, description: () => text().description, icon: () => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Icon, { name: "tasks" }) }]
    }), "workspace-monitor: tab");
  } catch (error) {
    degrade("the sidebar tab API", error);
  }
  try {
    ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
      name: "sidebar.right.pane.tab",
      key: ID,
      inject: () => ({ scan, actions })
    }, Panel)), "workspace-monitor: panel");
  } catch (error) {
    degrade("the sidebar panel slot", error);
  }
  try {
    ctx.effect(() => ctx.slots.inject("shell.overlay", () => ctx.slots.register({
      name: "shell.overlay",
      id: `${ID}-hover`,
      order: 450,
      inject: () => ({ scan, actions })
    }, WorkspaceHoverOverlay)), "workspace-monitor: workspace hover preview");
  } catch (error) {
    degrade("the shell overlay slot", error);
  }
}

return module.exports;
}});
