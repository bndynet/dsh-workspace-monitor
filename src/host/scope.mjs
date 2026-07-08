import { realpath, stat } from 'node:fs/promises';
import { isAbsolute } from 'node:path';

export class WorkspaceScopeError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export function validId(value, maximum = 256) {
  return typeof value === 'string' && value.trim().length > 0
    && value.length <= maximum && !/[\x00-\x1f\x7f]/.test(value);
}

export function validScopedRequest(payload, extraKeys = []) {
  return payload !== null && typeof payload === 'object' && !Array.isArray(payload)
    && Object.keys(payload).every(key => ['sessionId', 'workspaceId', ...extraKeys].includes(key))
    && Object.hasOwn(payload, 'sessionId') !== Object.hasOwn(payload, 'workspaceId')
    && validId(payload.sessionId ?? payload.workspaceId);
}

/** Resolve every read and mutation through authoritative DSH identities. */
export async function resolveWorkspaceScope(ctx, payload, signal) {
  signal?.throwIfAborted();
  let cwd;
  let workspace;
  if (payload.workspaceId !== undefined) {
    workspace = ctx.workspaceRegistry.get(payload.workspaceId);
    if (!workspace) throw new WorkspaceScopeError('workspace-not-found', 'The selected workspace is unavailable.');
    cwd = workspace.path;
  } else {
    const live = ctx.sessions.get(payload.sessionId)?.header;
    const stored = live === undefined ? await ctx.sessionPersistence.stat(payload.sessionId, { signal }) : undefined;
    const header = live ?? stored?.header;
    if (!header) throw new WorkspaceScopeError('session-not-found', 'The selected session is unavailable.');
    cwd = header.cwd;
  }
  signal?.throwIfAborted();
  if (typeof cwd !== 'string' || !isAbsolute(cwd)) {
    throw new WorkspaceScopeError('no-workspace', 'Select a workspace or session with an absolute project directory.');
  }
  let workspacePath;
  try {
    workspacePath = await realpath(cwd);
    if (!(await stat(workspacePath)).isDirectory()) throw new Error('not a directory');
  } catch {
    throw new WorkspaceScopeError('workspace-unavailable', 'The workspace directory is unavailable on this host.');
  }
  signal?.throwIfAborted();
  return {
    workspacePath,
    ...(workspace ? { workspaceId: payload.workspaceId, workspaceTitle: workspace.title } : {}),
  };
}
