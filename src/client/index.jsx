import React, { useCallback, useEffect, useRef, useState } from 'react';
import { copy } from './copy.mjs';
import { detectLanguage, displayPath, filterTasks, formatElapsed, portAddress, runningJobs, scanValue } from './model.mjs';
import { styles } from './styles.mjs';
import { WorkspaceHoverOverlay } from './hover.jsx';
export { WorkspaceHoverContent } from './hover.jsx';
import { CommandCatalog, ManagedRuns, RunOutput, StopButton, StopFeedback, executionStyles, useExecution } from './execution.jsx';
import { mergeRuns, runKey, stopKey, unlistedRuns } from './execution-model.mjs';
export { CommandCatalog, ManagedRuns, StopButton, StopFeedback } from './execution.jsx';

export const ID = 'dsh-workspace-monitor';
export const KIND = 'workspace-monitor';
export const inject = ['slots', 'sidebarRightTabs', 'connection', 'uiWorkspace'];

function Icon({ name, ...props }) {
  const paths = {
    tasks: <><path d="M3 4h18v13H3zM8 21h8M12 17v4" /><path d="m7 8 3 2-3 2m6 0h4" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 6.1a8 8 0 0 1 13 2.4M4.9 15.5a8 8 0 0 0 13 2.4" /></>,
    chevron: <path d="m9 5 7 7-7 7" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.tasks}</svg>;
}

/** Host Slot adapter. Session identity, never a browser-supplied path, authorizes a scan. */
export function Panel({ useSessions, sessionId, useTabInfo, scan, actions }) {
  const workspacePath = useSessions(sessions => sessions.byId[sessionId]?.cwd);
  const { tab } = useTabInfo();
  return <MonitorPanel key={`${sessionId}:${workspacePath}`} workspacePath={workspacePath} sessionId={sessionId} scan={scan} actions={actions} visible={tab.visible !== false} />;
}

/** Standalone presentation entry also used by the browser smoke-test fixture. */
export function MonitorPanel({ workspacePath, sessionId, scan, actions, visible = true, language: fixedLanguage }) {
  const [language, setLanguage] = useState(fixedLanguage || detectLanguage);
  const [query, setQuery] = useState('');
  const [automatic, setAutomatic] = useState(true);
  const [includeInfrastructure, setIncludeInfrastructure] = useState(false);
  const [snapshotState, setSnapshotState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [toast, setToast] = useState('');
  const refresh = useRef(() => {});
  const previousContext = useRef('');
  const toastTimer = useRef();
  const text = copy[fixedLanguage || language] || copy.en;
  const requestContext = JSON.stringify([sessionId, workspacePath, includeInfrastructure]);
  // Hide the previous project's result synchronously, before effect cleanup runs.
  const snapshot = snapshotState?.context === requestContext ? snapshotState.value : null;
  const execution = useExecution({ identity: sessionId && workspacePath ? { sessionId } : null, actions, onChanged: () => refresh.current() });
  const runs = mergeRuns(snapshot?.runs, execution.state.runs);
  const manualRefresh = () => {
    refresh.current();
    if (actions) void execution.manager.commands();
  };

  useEffect(() => {
    if (fixedLanguage || typeof MutationObserver === 'undefined') return;
    const update = () => setLanguage(detectLanguage());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    return () => observer.disconnect();
  }, [fixedLanguage]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  useEffect(() => {
    const context = JSON.stringify([sessionId, workspacePath, includeInfrastructure]);
    if (previousContext.current !== context) {
      previousContext.current = context;
      setSnapshotState(null);
      setError(null);
      setExpanded(new Set());
    }
    let disposed = false;
    let inFlight = false;
    let queued = false;
    let timer;
    let controller;
    const active = () => visible && (typeof document === 'undefined' || !document.hidden);
    const schedule = () => {
      clearTimeout(timer);
      if (!disposed && automatic && active()) timer = setTimeout(load, 5000);
    };
    async function load() {
      clearTimeout(timer);
      if (disposed || !sessionId || !workspacePath || !active()) return;
      if (inFlight) { queued = true; return; }
      inFlight = true;
      controller = new AbortController();
      setBusy(true);
      try {
        const next = scanValue(await scan({ sessionId, includeInfrastructure }, controller.signal));
        if (!disposed && !controller.signal.aborted) { setSnapshotState({ context, value: next }); setError(null); }
      } catch (cause) {
        if (!disposed && !controller.signal.aborted) setError(cause instanceof Error ? cause : new Error(String(cause)));
      } finally {
        inFlight = false;
        if (!disposed) {
          setBusy(false);
          if (queued && active()) { queued = false; void load(); }
          else schedule();
        }
      }
    }
    refresh.current = load;
    const onVisibility = () => {
      clearTimeout(timer);
      if (!active()) { queued = false; controller?.abort(); }
      else void load();
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
    void load();
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
      refresh.current = () => {};
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [sessionId, workspacePath, includeInfrastructure, automatic, visible, scan]);

  const copyText = useCallback(async value => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      setToast(text.copied);
    } catch { setToast(text.copyFailed); }
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  }, [text]);

  const tasks = filterTasks(snapshot?.tasks || [], query);
  const jobs = runningJobs(snapshot?.jobs, query);
  const endpointCount = (snapshot?.tasks || []).reduce((sum, task) => sum + (task.ports?.length || 0), 0);
  const toggle = id => setExpanded(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const updated = snapshot?.scannedAt ? new Date(snapshot.scannedAt).toLocaleTimeString(fixedLanguage || language, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null;

  return <section className="dwm-panel" aria-label={text.title} data-dwm-panel>
    <style>{styles}{executionStyles}</style>
    <header className="dwm-header">
      <div className="dwm-title-row"><span className="dwm-title-mark"><Icon name="tasks" /></span><h2>{text.title}</h2></div>
      <p className="dwm-description">{text.description}</p>
      {workspacePath && <><div className="dwm-workspace" title={workspacePath}><span className="dwm-workspace-label">{text.workspace}</span><strong>{displayPath(workspacePath)}</strong></div>
        {snapshot?.host && <div className="dwm-host">{text.host} · {snapshot.host.hostname || snapshot.host.name || snapshot.host.platform} {snapshot.host.hostname ? `· ${snapshot.host.platform}` : ''}</div>}
        <div className="dwm-counts"><span><strong>{snapshot ? snapshot.tasks.length : '—'}</strong>{text.tasks}</span><span><strong>{snapshot ? endpointCount : '—'}</strong>{text.listeners}</span></div></>}
    </header>
    {workspacePath && <div className="dwm-controls">
      <div className="dwm-search"><Icon name="search" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={text.search} aria-label={text.search} data-dwm-search />{query && <button type="button" className="dwm-clear" aria-label={text.clear} onClick={() => setQuery('')}><Icon name="close" /></button>}</div>
      <div className="dwm-options">
        <label className="dwm-check" title={text.autoHint}><input type="checkbox" checked={automatic} onChange={event => setAutomatic(event.target.checked)} data-dwm-auto />{text.auto}</label>
        <label className="dwm-check" title={text.infrastructureHint}><input type="checkbox" checked={includeInfrastructure} onChange={event => setIncludeInfrastructure(event.target.checked)} data-dwm-infrastructure />{text.infrastructure}</label>
        <button type="button" className="dwm-refresh" onClick={manualRefresh} disabled={busy} aria-label={text.refresh} data-dwm-refresh><Icon name="refresh" className={busy ? 'dwm-spin' : ''} />{text.refresh}</button>
      </div>
      <div className="dwm-status" data-paused={!automatic || !visible}><span className="dwm-status-dot" /><span>{busy ? text.refreshing : automatic && visible ? text.live : text.paused}</span>{updated && <span className="dwm-updated">{text.updated} {updated}</span>}</div>
    </div>}
    <div className="dwm-body" aria-busy={busy}>
      {!workspacePath ? <div className="dwm-empty"><Icon name="tasks" /><p>{text.noWorkspace}</p></div> : <>
        {error && <div className="dwm-notice" role="alert" data-error="true"><strong>{text.errorTitle}</strong><p>{['forbidden', 'gateway/forbidden', 'monitor/forbidden', 'workspace-monitor/forbidden'].includes(error.code) ? text.denied : error.message}</p>{snapshot && <p>{text.stale}</p>}<button type="button" className="dwm-text-button" disabled={busy} onClick={() => refresh.current()}>{text.retry}</button></div>}
        {snapshot?.warnings?.length > 0 && <details className="dwm-notice" data-dwm-warnings><summary>{text.partial} ({snapshot.warnings.length})</summary><ul>{snapshot.warnings.map((warning, index) => <li key={index}>{String(warning)}</li>)}</ul></details>}
        {busy && !snapshot && !error && <div className="dwm-empty" role="status"><Icon name="refresh" className="dwm-spin" /><p>{text.loading}</p></div>}
        {snapshot && tasks.length === 0 && <div className="dwm-empty" data-dwm-empty><Icon name="tasks" /><strong>{query.trim() ? text.noMatch : text.emptyTitle}</strong>{query.trim() ? <button type="button" className="dwm-text-button" onClick={() => setQuery('')}>{text.clear}</button> : <p>{text.empty}</p>}</div>}
        <div className="dwm-task-list">{tasks.map(task => <Task key={task.id || task.pid} task={task} expanded={expanded.has(task.id || task.pid)} toggle={() => toggle(task.id || task.pid)} text={text} onCopy={copyText} now={snapshot?.scannedAt} language={fixedLanguage || language} onStop={actions ? execution.manager.stop : undefined} operation={execution.state.operations[stopKey(task)]} run={runs.find(run => runKey(run) === task.runId)} identity={{ sessionId }} actions={actions} />)}</div>
        {actions && <ManagedRuns runs={filterTasks(unlistedRuns(runs, snapshot?.tasks), query)} operations={execution.state.operations} onStop={execution.manager.stop} identity={{ sessionId }} actions={actions} language={fixedLanguage || language} canStop={snapshot?.capabilities?.canStop !== false} />}
        {actions && <CommandCatalog state={execution.state} runs={runs} onRun={execution.manager.run} onStop={execution.manager.stop} onRetry={execution.manager.commands} query={query} language={fixedLanguage || language} />}
        {jobs.length > 0 && <section className="dwm-jobs"><h3>{text.jobs} ({jobs.length})</h3><p className="dwm-jobs-note">{text.jobsNote}</p>{jobs.map(job => <article className="dwm-job" key={job.id}><div className="dwm-job-meta"><span>{job.status === 'stopping' ? text.stopping : text.running}</span><span>{job.id}</span><span>{formatElapsed(job.startedAt, snapshot.scannedAt)}</span></div><code>{job.label}</code></article>)}</section>}
        {snapshot && tasks.length > 0 && <p className="dwm-footnote">{text.scanNote}</p>}
      </>}
    </div>
    {toast && <div className="dwm-toast" role="status">{toast}</div>}
  </section>;
}

export function Task({ task, expanded, toggle, text, onCopy, now, language = 'en', onStop, operation, run, identity, actions }) {
  const ports = task.ports || [];
  return <article className="dwm-task" data-dwm-task data-pid={task.pid}>
    <div className="dwm-task-topline"><button type="button" className="dwm-task-toggle" onClick={toggle} aria-expanded={expanded} aria-label={`${expanded ? text.collapse : text.expand}: ${task.command}`}>
      <Icon name="chevron" /><div className="dwm-task-heading"><div className="dwm-task-meta"><span className="dwm-runtime">{task.runtime || 'process'}</span><span>{text.pid} {task.pid}</span>{task.infrastructure && <span className="dwm-tool-tag">{text.tool}</span>}<span className="dwm-uptime" title={text.uptime}>{formatElapsed(task.startedAt, now)}</span></div><code className="dwm-command">{task.command}</code></div>
    </button><span className="dwm-task-stop"><StopButton task={task} operation={operation} onStop={onStop} language={language} /></span></div>
    <div className="dwm-task-bottom"><p className="dwm-cwd" title={task.cwd}>{task.cwd || '—'}</p><div className="dwm-ports">{ports.length ? ports.map((port, index) => <button type="button" className="dwm-port" key={`${port.protocol}-${port.address}-${port.port}-${index}`} onClick={() => onCopy(portAddress(port))} title={`${text.copyPort}: ${port.protocol?.toUpperCase()} ${portAddress(port)}`} aria-label={`${text.copyPort} ${portAddress(port)}`}><span className="dwm-protocol">{port.protocol || 'tcp'}</span>{port.port}<Icon name="copy" /></button>) : <span className="dwm-no-port">{text.noPort}</span>}</div><StopFeedback operation={operation} language={language} />{operation?.error && <div className="dwm-action-error" role="alert">{operation.error.message}</div>}</div>
    {expanded && <div className="dwm-task-details">
      <p className="dwm-detail-line"><span>{text.cwd}</span><code>{task.cwd || '—'}</code></p>
      <p className="dwm-detail-line"><span>{text.match}</span>{text.matches[task.match] || text.source}</p>
      {ports.length > 0 && <><h4 className="dwm-detail-heading">{text.endpoints}</h4><div className="dwm-endpoint-list">{ports.map((port, index) => <button type="button" className="dwm-port" key={index} onClick={() => onCopy(portAddress(port))} title={text.copyPort}><span className="dwm-protocol">{port.protocol}</span>{portAddress(port)}<Icon name="copy" /></button>)}</div></>}
      <h4 className="dwm-detail-heading">{text.processes} ({task.processes?.length || 1})</h4><ul className="dwm-process-list">{(task.processes?.length ? task.processes : [task]).map(process => <li className="dwm-process" key={process.pid}><span className="dwm-process-pid">PID {process.pid}{process.ppid ? ` · PPID ${process.ppid}` : ''}</span><code>{process.command}</code>{process.cwd && process.cwd !== task.cwd && <code>{process.cwd}</code>}</li>)}</ul>
      {run && actions && <RunOutput run={run} identity={identity} actions={actions} language={language} />}
    </div>}
  </article>;
}

/** One unavailable integration must not unregister the rest of the plugin. */
function degrade(label, error) {
  console.error(`workspace-monitor: ${label} is unavailable in this DSH Web client; the remaining integrations stay registered.`, error);
}

export function apply(ctx) {
  // Slot names and services can move between DSH releases. Detect the baseline
  // instead of throwing during activation, which would drop the whole plugin.
  if (typeof ctx?.effect !== 'function' || typeof ctx?.slots?.inject !== 'function'
    || typeof ctx?.connection?.rpc?.call !== 'function') {
    console.warn('workspace-monitor: this DSH Web client does not expose the slot and RPC services the plugin needs; the plugin stays inactive.');
    return;
  }
  const text = () => copy[detectLanguage()];
  const scan = (request, signal) => ctx.connection.rpc.call('/api', 'workspace-monitor/scan', request, signal);
  const actions = Object.fromEntries(['commands', 'run', 'stop', 'output'].map(endpoint => [endpoint, (request, signal) => ctx.connection.rpc.call('/api', `workspace-monitor/${endpoint}`, request, signal)]));
  try {
    ctx.effect(() => ctx.sidebarRightTabs.register({
      id: ID, kind: KIND, title: () => text().title,
      guide: [{ id: 'running-tasks', order: 40, title: () => text().title, description: () => text().description, icon: () => <Icon name="tasks" /> }],
    }), 'workspace-monitor: tab');
  } catch (error) { degrade('the sidebar tab API', error); }
  try {
    ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
      name: 'sidebar.right.pane.tab', key: ID,
      inject: () => ({ scan, actions }),
    }, Panel)), 'workspace-monitor: panel');
  } catch (error) { degrade('the sidebar panel slot', error); }
  try {
    ctx.effect(() => ctx.slots.inject('shell.overlay', () => ctx.slots.register({
      name: 'shell.overlay', id: `${ID}-hover`, order: 450,
      inject: () => ({ scan, actions }),
    }, WorkspaceHoverOverlay)), 'workspace-monitor: workspace hover preview');
  } catch (error) { degrade('the shell overlay slot', error); }
}
