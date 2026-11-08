import { scanValue } from './model.mjs';

export const WORKSPACE_ROW_SELECTOR = '[role="treeitem"][data-row-key^="workspace:"]';
export const WORKSPACE_LIST_SELECTOR = '[data-slot="sidebar.workspaces"]';

/** Display-only shortening keeps the original redacted command intact for the title. */
export function compactWorkspaceCommand(command, workspacePath) {
  let label = String(command || '');
  const first = label.match(/^(?:"([^"]+)"|'([^']+)'|(\S+))/);
  const executable = first && (first[1] || first[2] || first[3]);
  if (executable && (/^\//.test(executable) || /^[A-Za-z]:[\\/]/.test(executable))) {
    const basename = executable.split(/[\\/]/).at(-1);
    label = `${/\s/.test(basename) ? `"${basename}"` : basename}${label.slice(first[0].length)}`;
  }
  const root = String(workspacePath || '').replace(/[\\/]+$/, '');
  if (!root) return label;
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const path = root.split(/[\\/]/).map(escape).join('[\\\\/]');
  const prefix = new RegExp(`(^|[\\s="'])${path}[\\\\/]`, 'g');
  return label.replace(prefix, '$1./');
}

/** Collapse scanner rows that belong to a plugin-managed run into that run's row. */
export function groupManagedRunTasks(tasks = [], runs = []) {
  const activeRuns = runs.filter(run => ['running', 'stopping'].includes(run.status));
  if (!activeRuns.length || !tasks.length) return tasks;

  const processByPid = new Map();
  for (const task of tasks) {
    for (const process of task.processes || []) processByPid.set(process.pid, process);
    if (!processByPid.has(task.pid)) processByPid.set(task.pid, { pid: task.pid, ppid: 0, command: task.command });
  }
  const isDescendantOf = (pid, ancestor) => {
    const seen = new Set();
    let process = processByPid.get(pid);
    while (process?.ppid && !seen.has(process.ppid)) {
      if (process.ppid === ancestor) return true;
      seen.add(process.ppid);
      process = processByPid.get(process.ppid);
    }
    return false;
  };

  const hidden = new Set();
  const rootsByTask = new Map();
  const roots = activeRuns.flatMap(run => {
    const runId = run.runId || run.id;
    const root = tasks.find(task => (runId && task.runId === runId) || (run.pid && task.pids?.includes(run.pid)));
    return root ? [{ run, root, pid: run.pid || root.pid }] : [];
  });

  for (const { run, root, pid } of roots) {
    if (!pid) continue;
    const hiddenForRoot = new Set();
    for (const task of tasks) {
      if (task === root) continue;
      const pids = task.pids?.length ? task.pids : [task.pid];
      if (pids.some(childPid => childPid !== pid && isDescendantOf(childPid, pid))) {
        hidden.add(task);
        hiddenForRoot.add(task);
      }
    }

    const childProcesses = [...processByPid.values()]
      .filter(process => process.pid !== pid && isDescendantOf(process.pid, pid))
      .sort((a, b) => a.pid - b.pid)
      .map(process => ({ pid: process.pid, command: process.command }));
    const ports = [...new Map([
      ...(root.ports || []),
      ...[...hiddenForRoot].flatMap(task => task.ports || []),
    ].map(port => [`${port.protocol}:${port.address}:${port.port}`, port])).values()];
    rootsByTask.set(root, {
      ...root,
      command: run.command || run.label || root.command,
      ports,
      ...(childProcesses.length ? { childProcesses } : {}),
    });
  }

  return tasks.filter(task => !hidden.has(task)).map(task => rootsByTask.get(task) || task);
}

/** Resolve only real sidebar rows whose ids exist in DSH's public Workspace model. */
export function workspaceTarget(element, workspaces) {
  const node = element?.nodeType === 3 ? element.parentElement : element;
  const row = node?.closest?.(WORKSPACE_ROW_SELECTOR);
  if (!row || !row.closest(WORKSPACE_LIST_SELECTOR) || row.closest('[hidden], [inert]')) return null;
  const key = row.getAttribute('data-row-key');
  const workspaceId = key?.startsWith('workspace:') ? key.slice('workspace:'.length) : '';
  const workspace = workspaces.find(item => item.workspaceId === workspaceId);
  if (!workspace) return null;
  return { row, workspaceId, title: workspace.title, path: workspace.path };
}

/** Keep the popover beside its row and inside even a narrow viewport. */
export function placeWorkspaceHover(rect, viewport, measuredHeight = 240) {
  const margin = 10;
  const gap = 8;
  const width = Math.max(0, Math.min(344, viewport.width - margin * 2));
  const maxHeight = Math.max(0, Math.min(430, viewport.height - margin * 2));
  const height = Math.min(measuredHeight, maxHeight);
  let side = 'right';
  let left = rect.right + gap;
  let top = rect.top;
  if (left + width > viewport.width - margin) {
    if (rect.left - gap - width >= margin) { side = 'left'; left = rect.left - gap - width; }
    else {
      side = 'bottom'; left = Math.max(margin, Math.min(rect.left, viewport.width - width - margin)); top = rect.bottom + gap;
      if (top + height > viewport.height - margin && rect.top - gap - height >= margin) { side = 'top'; top = rect.top - gap - height; }
    }
  }
  left = Math.max(margin, Math.min(left, viewport.width - width - margin));
  top = Math.max(margin, Math.min(top, viewport.height - height - margin));
  const bridge = side === 'right' || side === 'left'
    ? { left: side === 'right' ? rect.right : left + width, top: Math.min(rect.top, top), width: gap, height: Math.max(rect.bottom, top + height) - Math.min(rect.top, top) }
    : { left: Math.min(rect.left, left), top: side === 'bottom' ? rect.bottom : top + height, width: Math.max(rect.right, left + width) - Math.min(rect.left, left), height: gap };
  return { left, top, width, maxHeight, bridge };
}

/**
 * Pointer presence owns the preview lifetime. A Run/Stop click disables its own
 * button, which blurs it and emits focusout; that must not close a preview the
 * pointer is still inside. Returns 'keep', 'leave', or null when unrelated.
 */
export function createHoverDismissal(inRegion) {
  let pointerInside = false;
  return {
    pointerEnter() { pointerInside = true; },
    pointerExit() { pointerInside = false; },
    pointerOut(target, related) {
      if (!inRegion(target)) return null;
      if (inRegion(related)) { pointerInside = true; return 'keep'; }
      pointerInside = false;
      return 'leave';
    },
    focusOut(target, related) {
      if (!inRegion(target)) return null;
      if (inRegion(related) || pointerInside) return 'keep';
      // A disabled control and a move to browser chrome both blur with no
      // relatedTarget; without pointer evidence, leave any close timer alone.
      return related ? 'leave' : null;
    },
    get pointerInside() { return pointerInside; },
  };
}

/** A small cancellable, non-polling state machine independent of React and the DOM. */
export function createWorkspaceHover({ scan, onChange, setTimer = setTimeout, clearTimer = clearTimeout, openDelay = 350, closeDelay = 180 }) {
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
  const publish = value => { state = value; onChange(value); };
  const cancelTimers = () => { clearTimer(openTimer); clearTimer(closeTimer); };
  function close(suppress = false) {
    cancelTimers();
    generation += 1;
    controller?.abort();
    scanning = false;
    if (suppress && current) { suppressedRow = current.row; suppressedTarget = current; }
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
    publish({ target, status: previous ? 'ready' : 'loading', snapshot: previous || null, error: null });
    try {
      const snapshot = scanValue(await scan({ workspaceId: target.workspaceId, includeInfrastructure: false }, signal));
      if (!disposed && !signal.aborted && generation === token) publish({ target, status: 'ready', snapshot, error: null });
    } catch (error) {
      if (!disposed && !signal.aborted && generation === token) publish({ target, status: 'error', snapshot: null, error: error instanceof Error ? error : new Error(String(error)) });
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
      openTimer = setTimer(() => { if (current?.row?.isConnected !== false) void load(); else close(); }, openDelay);
    },
    leave() {
      if (disposed) return;
      suppressedRow = null;
      suppressedTarget = null;
      clearTimer(openTimer);
      clearTimer(closeTimer);
      closeTimer = setTimer(() => close(), closeDelay);
    },
    keep() { if (!disposed) clearTimer(closeTimer); },
    dismiss() { if (!disposed) close(true); },
    retry() { if (!disposed && state?.status === 'error') void load(); },
    refresh({ skipIfBusy = false } = {}) { if (!disposed && current) void load(true, skipIfBusy); },
    getTarget() { return current; },
    getAnchorTarget() { return current || suppressedTarget; },
    getSuppressedTarget() { return suppressedTarget; },
    getState() { return state; },
    dispose() { if (disposed) return; disposed = true; cancelTimers(); generation += 1; controller?.abort(); current = null; state = null; },
  };
}

const NATIVE_CARD_SELECTOR = 'body > span > div[role="button"][aria-label][style]';
const NATIVE_MARKER = 'data-dwm-native-workspace-hover';

/** rc.1 identifies its copyable Workspace HoverCard by the original workspace path. */
export function isNativeWorkspaceHover(card, workspacePath) {
  return typeof workspacePath === 'string' && workspacePath.length > 0
    && card.getAttribute('role') === 'button'
    && Boolean(card.style.getPropertyValue('--dsh-hover-preview-fade'))
    && card.getAttribute('aria-label')?.endsWith(`: ${workspacePath}`) === true;
}

/** Hide only the current row's built-in card while the richer preview is open. */
export function suppressNativeWorkspaceHover(document, workspacePath, Observer = globalThis.MutationObserver) {
  const marked = new Map();
  const mark = card => {
    if (!isNativeWorkspaceHover(card, workspacePath) || marked.has(card)) return;
    marked.set(card, card.getAttribute(NATIVE_MARKER));
    card.setAttribute(NATIVE_MARKER, 'active');
  };
  const inspect = () => { for (const card of document.querySelectorAll(NATIVE_CARD_SELECTOR)) mark(card); };
  inspect();
  // DSH portals are direct body children; no broad subtree observation is needed.
  const observer = new Observer(inspect);
  observer.observe(document.body, { childList: true });
  return () => {
    observer.disconnect();
    for (const [card, previous] of marked) {
      if (card.getAttribute(NATIVE_MARKER) !== 'active') continue;
      if (previous === null) card.removeAttribute(NATIVE_MARKER);
      else card.setAttribute(NATIVE_MARKER, previous);
    }
    marked.clear();
  };
}
