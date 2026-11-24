import { hostname as systemHostname } from 'node:os';
import { scanWorkspace as systemScan, redactCommand } from '../monitor/index.mjs';
import { discoverCommands, createTaskRunner } from '../actions/index.mjs';
import { stopWorkspaceTask } from '../process-control/index.mjs';
import { resolveWorkspaceScope, validId, validScopedRequest, WorkspaceScopeError } from './scope.mjs';

export const name = 'workspace-monitor';
export const inject = ['connection', 'sessions', 'sessionPersistence', 'jobs', 'workspaceRegistry'];
export const ROUTE = '/api/workspace-monitor/scan';
export const ENDPOINTS = ['scan', 'commands', 'run', 'stop', 'output'];

const fail = (code, message) => ({
  ok: false,
  error: { code: `workspace-monitor/${code}`, message, details: {} },
});

function validRequest(payload) {
  return validScopedRequest(payload, ['includeInfrastructure'])
    && (payload.includeInfrastructure === undefined || typeof payload.includeInfrastructure === 'boolean');
}

function controlCapability(task, platform) {
  if (!['darwin', 'linux'].includes(platform)) return 'Stopping tasks is supported on macOS and Linux.';
  if (task.runId) return undefined;
  if (task.infrastructure) return 'Tool and infrastructure processes cannot be stopped here.';
  if (task.match !== 'cwd') return 'Project ownership is inferred; stopping is unavailable.';
  if (!task.processes?.length || task.processes.some(item => !Number.isFinite(item.startedAt))) {
    return 'The process identity could not be verified.';
  }
  return undefined;
}

function currentJobs(ctx, sessionId) {
  const registry = ctx.get?.('jobs') ?? ctx.jobs;
  if (!registry) return [];
  return registry.list(sessionId)
    .filter(job => job.owner === sessionId && (job.status === 'running' || job.status === 'stopping'))
    .slice(0, 100)
    .map(job => ({
      id: job.id,
      label: redactCommand(String(job.label ?? '')).slice(0, 4096),
      status: job.status,
      startedAt: job.startedAt,
      owner: job.owner,
    }));
}

/** The authenticated transport passes the Peer; a path is never accepted from the browser. */
export function createScanHandler(ctx, {
  scanWorkspace = systemScan,
  now = Date.now,
  hostname = systemHostname,
  platform = process.platform,
  cacheTtlMs = 2000,
  scanTimeoutMs = 15000,
  maxConcurrentScans = 2,
  lifetimeSignal,
  listRuns = async () => [],
} = {}) {
  const cache = new Map();
  let active = 0;

  const handle = async function handle(endpoint, payload, signal, peer) {
    if (peer?.principal?.kind !== 'owner') return fail('forbidden', 'Only the DSH owner can view host processes.');
    if (endpoint !== 'scan') return fail('not-found', 'Unknown monitor operation.');
    if (!validRequest(payload)) return fail('bad-request', 'Provide exactly one sessionId or workspaceId, and an optional includeInfrastructure boolean.');
    if (signal?.aborted || lifetimeSignal?.aborted) return fail('cancelled', 'Scan cancelled.');

    const deadline = AbortSignal.timeout(scanTimeoutMs);
    const signals = [deadline, signal, lifetimeSignal].filter(Boolean);
    const scanSignal = AbortSignal.any(signals);
    try {
      const scope = await resolveWorkspaceScope(ctx, payload, scanSignal);
      const { workspacePath } = scope;
      const includeInfrastructure = payload.includeInfrastructure === true;
      const key = JSON.stringify([workspacePath, includeInfrastructure]);
      const previous = cache.get(key);
      let result = previous && now() - previous.at < cacheTtlMs ? previous.result : undefined;
      if (!result) {
        if (active >= maxConcurrentScans) return fail('busy', 'Other scans are in progress. Retry in a moment.');
        active += 1;
        try {
          result = await scanWorkspace({ workspacePath, platform, includeInfrastructure, signal: scanSignal });
          scanSignal.throwIfAborted();
          if (cache.size >= 32) cache.delete(cache.keys().next().value);
          cache.set(key, { at: now(), result });
        } finally {
          active -= 1;
        }
      }
      scanSignal.throwIfAborted();
      let jobs = [];
      const warnings = [...(result.warnings ?? [])];
      try { if (payload.sessionId !== undefined) jobs = currentJobs(ctx, payload.sessionId); }
      catch { warnings.push('DSH background job information is temporarily unavailable.'); }
      let runs = [];
      try { runs = await listRuns(workspacePath); }
      catch { warnings.push('Started command information is temporarily unavailable.'); }
      const tasks = (result.tasks ?? []).map(task => {
        const run = runs.find(item => ['running', 'stopping'].includes(item.status) && item.pid && task.pids?.includes(item.pid));
        const next = { ...task, ...(run ? { runId: run.runId ?? run.id } : {}) };
        const stopReason = controlCapability(next, platform);
        return { ...next, canStop: stopReason === undefined, ...(stopReason ? { stopReason } : {}) };
      });
      return {
        ok: true,
        value: {
          ...result,
          ...scope,
          tasks,
          runs,
          warnings,
          host: { platform, hostname: typeof hostname === 'function' ? hostname() : hostname },
          jobs,
          capabilities: { readOnly: false, canRun: ['darwin', 'linux'].includes(platform), canStop: ['darwin', 'linux'].includes(platform), scope: 'host', originalCommand: 'when-observable' },
        },
      };
    } catch (error) {
      if (signal?.aborted || lifetimeSignal?.aborted) return fail('cancelled', 'Scan cancelled.');
      if (deadline.aborted) return fail('timeout', 'The process scan timed out. Retry in a moment.');
      if (error instanceof WorkspaceScopeError) return fail(error.code, error.message);
      // Raw OS exceptions can include command lines; never send them to the browser.
      return fail('scan-failed', 'Unable to inspect processes on this host. Retry or check the DSH host log.');
    }
  };
  handle.invalidateCache = () => cache.clear();
  return handle;
}

const actionMessages = {
  'command-not-found': 'This script changed or is no longer available. Refresh the command list.',
  'script-not-found': 'This script changed or is no longer available. Refresh the command list.',
  'manager-unavailable': 'The package manager is not available on the DSH host.',
  'manager-not-found': 'The package manager is not installed on the DSH host.',
  'too-many-runs': 'Too many commands are running. Stop a command before starting another.',
  'unsupported-platform': 'Running and stopping commands is currently supported on macOS and Linux.',
  'launch-failed': 'The command could not be started. Check the package manager on the DSH host.',
  'stop-failed': 'The process could not be stopped. Refresh the task list to check its status.',
  'runner-unavailable': 'The task runner is unavailable. Refresh the page and retry.',
  'invalid-command': 'This command is not available in the selected workspace.',
  'bad-request': 'Invalid workspace command request.',
  'workspace-unavailable': 'The workspace directory is unavailable on this host.',
  'run-not-found': 'This started command is no longer available.',
  'unsafe-task': 'This process cannot be safely stopped from this workspace.',
  'identity-changed': 'The process changed since it was displayed. Refresh the task list.',
  'unsupported': 'Running and stopping commands is currently supported on macOS and Linux.',
  'busy': 'Too many commands are running. Stop a command before starting another.',
};

export function createActionHandler(ctx, {
  runner,
  discover = discoverCommands,
  stopTask = stopWorkspaceTask,
  platform = process.platform,
  lifetimeSignal,
  invalidateCache = () => {},
} = {}) {
  return async (endpoint, payload, signal, peer) => {
    if (peer?.principal?.kind !== 'owner') return fail('forbidden', 'Only the DSH owner can manage host processes.');
    if (!['commands', 'run', 'stop', 'output'].includes(endpoint)) return fail('not-found', 'Unknown monitor operation.');
    const extra = { commands: [], run: ['commandId'], stop: ['taskId', 'runId'], output: ['runId'] }[endpoint];
    if (!validScopedRequest(payload, extra)
      || (endpoint === 'run' && !validId(payload.commandId))
      || (endpoint === 'output' && !validId(payload.runId))
      || (endpoint === 'stop' && (Object.hasOwn(payload, 'taskId') === Object.hasOwn(payload, 'runId')
        || !validId(payload.taskId ?? payload.runId, 512)))) {
      return fail('bad-request', 'Invalid workspace command request.');
    }
    if (signal?.aborted || lifetimeSignal?.aborted) return fail('cancelled', 'Operation cancelled.');
    const deadline = AbortSignal.timeout(30_000);
    const operationSignal = AbortSignal.any([signal, lifetimeSignal, deadline].filter(Boolean));
    try {
      const scope = await resolveWorkspaceScope(ctx, payload, operationSignal);
      const { workspacePath } = scope;
      if (endpoint === 'commands') {
        const catalog = await discover({ workspacePath, signal: operationSignal });
        const canRun = ['darwin', 'linux'].includes(platform);
        return { ok: true, value: { ...catalog, ...scope, commands: catalog.commands.map(command => ({ ...command, canRun })), capabilities: { canRun } } };
      }
      if (!['darwin', 'linux'].includes(platform) && endpoint !== 'output') return fail('unsupported', actionMessages.unsupported);
      let value;
      if (endpoint === 'run') value = await runner.run({ workspacePath, commandId: payload.commandId, signal: operationSignal });
      else if (endpoint === 'output') value = await runner.output({ workspacePath, runId: payload.runId });
      else if (payload.runId !== undefined) value = await runner.stopManaged({ workspacePath, runId: payload.runId });
      else value = await stopTask({ workspacePath, taskId: payload.taskId, signal: operationSignal });
      if (endpoint !== 'output') invalidateCache();
      return { ok: true, value };
    } catch (error) {
      if (signal?.aborted || lifetimeSignal?.aborted) return fail('cancelled', 'Operation cancelled.');
      if (deadline.aborted) return fail('timeout', 'The operation timed out. Refresh the task list to check its status.');
      if (error instanceof WorkspaceScopeError) return fail(error.code, error.message);
      const code = typeof error?.code === 'string' ? error.code.replace(/^workspace-monitor\//, '') : '';
      if (actionMessages[code]) return fail(code, actionMessages[code]);
      return fail('action-failed', 'Unable to complete this action. Refresh the task list and check the command output.');
    }
  };
}

/**
 * Exact Connection routes are authenticated and owner-only in DSH. Preserve the
 * standard RPC envelope so the browser can use Connection's public RPC caller.
 */
export function createFetchHandler(handler, endpoint = 'scan') {
  return async request => {
    let message;
    try { message = await request.json(); }
    catch { return new Response('Invalid monitor request.', { status: 400 }); }
    if (!message || message.type !== 'client-request'
      || message.method !== `workspace-monitor/${endpoint}`
      || typeof message.rpcId !== 'string' || !message.rpcId || message.rpcId.length > 128
      || /[\x00-\x1f]/.test(message.rpcId)) {
      return new Response('Invalid monitor request.', { status: 400 });
    }
    const result = await handler(endpoint, message.payload, request.signal, { principal: { kind: 'owner' } });
    return Response.json({ type: 'server-response', rpcId: message.rpcId, result }, {
      headers: { 'cache-control': 'no-store' },
    });
  };
}

/** DSH owns transport registration; unloading aborts and joins the plugin's scans. */
export function apply(ctx) {
  // A future DSH release may move or rename the Connection Fetch API. Stay inert
  // with a clear log instead of throwing during activation and losing the plugin row.
  if (typeof ctx?.effect !== 'function' || typeof ctx?.connection?.fetch?.register !== 'function') {
    const message = 'workspace-monitor: this DSH release does not expose connection.fetch.register; the Host plugin stays inactive. Install a plugin release that supports this DSH version.';
    try {
      if (typeof ctx?.logger === 'function') ctx.logger('workspace-monitor').warn(message);
      else console.warn(message);
    } catch { console.warn(message); }
    return;
  }
  const lifetime = new AbortController();
  const pending = new Set();
  const runner = createTaskRunner();
  const scan = createScanHandler(ctx, { lifetimeSignal: lifetime.signal, listRuns: path => runner.list(path) });
  const actions = createActionHandler(ctx, { runner, lifetimeSignal: lifetime.signal, invalidateCache: scan.invalidateCache });
  for (const endpoint of ENDPOINTS) {
    const fetch = createFetchHandler(endpoint === 'scan' ? scan : actions, endpoint);
    ctx.connection.fetch.register({
      path: `/api/workspace-monitor/${endpoint}`, methods: ['POST'], requestBody: 'buffered',
      fetch: request => {
        const task = fetch(request);
        pending.add(task);
        void task.then(() => pending.delete(task), () => pending.delete(task));
        return task;
      },
    });
  }
  ctx.effect(() => async () => {
    lifetime.abort();
    await Promise.allSettled(pending);
    await runner.dispose();
  });
}
