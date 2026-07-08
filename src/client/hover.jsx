import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { detectLanguage, portAddress } from './model.mjs';
import { compactWorkspaceCommand, createWorkspaceHover, placeWorkspaceHover, suppressNativeWorkspaceHover, workspaceTarget } from './hover-model.mjs';
import { CommandCatalog, ManagedRuns, StopButton, StopFeedback, executionStyles, useExecution } from './execution.jsx';
import { isActiveRun, mergeRuns, runKey, stopKey, unlistedRuns } from './execution-model.mjs';

const copy = {
  en: {
    title: 'Running tasks', loading: 'Reading running tasks…', empty: 'No running tasks found.',
    error: 'Could not read running tasks.', retry: 'Try again', more: count => `+${count} more tasks`,
    partial: 'Some process details are unavailable.', count: count => `${count} ${count === 1 ? 'task' : 'tasks'}`,
    morePorts: count => `Show ${count} more endpoints`, collapsePorts: 'Less', collapsePortsLabel: 'Collapse endpoints', endpoints: 'All listening endpoints',
  },
  zh: {
    title: '运行任务', loading: '正在读取运行任务…', empty: '未发现运行中的任务。',
    error: '无法读取运行任务。', retry: '重试', more: count => `还有 ${count} 个任务`,
    partial: '部分进程信息不可用。', count: count => `${count} 个任务`,
    morePorts: count => `展开其余 ${count} 个端口端点`, collapsePorts: '收起', collapsePortsLabel: '收起端口列表', endpoints: '全部监听端点',
  },
};

export const hoverStyles = `
[data-dwm-native-workspace-hover="active"]{visibility:hidden!important;pointer-events:none!important}
.dwm-hover{--dwm-hover-text:var(--dsw-alias-label-primary,#202b32);--dwm-hover-muted:var(--dsw-alias-label-secondary,#64747b);--dwm-hover-line:var(--dsw-alias-border-l3,#dfe7e8);--dwm-hover-surface:var(--dsw-alias-bg-layer-1,#fff);--dwm-hover-accent:var(--dsw-alias-state-business-primary,#087f83);position:fixed;z-index:110;box-sizing:border-box;overflow-y:auto;overflow-x:hidden;background:var(--dwm-hover-surface);color:var(--dwm-hover-text);border:1px solid var(--dwm-hover-line);border-radius:10px;box-shadow:0 8px 32px #0002;overscroll-behavior:contain;font:12px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:left;-webkit-app-region:no-drag}
.dwm-hover *{box-sizing:border-box}.dwm-hover-head{padding:9px 12px 8px;border-bottom:1px solid var(--dwm-hover-line)}.dwm-hover-heading{display:flex;align-items:center;gap:10px}.dwm-hover-heading h2{font:600 13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;min-width:0;flex:1;text-overflow:ellipsis;overflow:hidden;white-space:nowrap}.dwm-hover-count{flex:none;font-size:10px;color:var(--dwm-hover-muted);font-variant-numeric:tabular-nums}.dwm-hover-label{font-size:10px;color:var(--dwm-hover-muted);margin:2px 0 0}.dwm-hover-path{font:10px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;margin:5px 0 0;color:var(--dwm-hover-muted);overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.dwm-hover-list{list-style:none;margin:0;padding:1px 12px}.dwm-hover-task{padding:5px 0;border-bottom:1px solid var(--dwm-hover-line)}.dwm-hover-task:last-child{border-bottom:0}.dwm-hover-command{min-width:0;flex:1;font:11px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;user-select:text}.dwm-hover-meta{display:flex;align-items:center;gap:4px;flex:none}.dwm-hover-port{font:10px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;display:inline-block;padding:1px 5px;color:var(--dwm-hover-accent);border:1px solid var(--dwm-hover-line);border-radius:4px;background:var(--dsw-alias-bg-base,#fff);font-variant-numeric:tabular-nums}.dwm-hover-no-port{color:var(--dwm-hover-muted);font-size:11px}.dwm-hover-pid{font-size:9px;color:var(--dwm-hover-muted);margin-left:auto;font-variant-numeric:tabular-nums}.dwm-hover-status{padding:9px 12px;color:var(--dwm-hover-muted);font-size:12px}.dwm-hover-status p{margin:0;line-height:1.6;overflow-wrap:anywhere}.dwm-hover-retry{margin:8px 0 0;padding:3px 7px;border:1px solid var(--dwm-hover-line);border-radius:5px;background:var(--dsw-alias-bg-base,#fff);color:var(--dwm-hover-text);cursor:pointer;font:11px/1.5 inherit}.dwm-hover-retry:focus-visible{outline:2px solid var(--dwm-hover-accent);outline-offset:2px}.dwm-hover-footer{padding:5px 12px;color:var(--dwm-hover-muted);font-size:10px;border-top:1px solid var(--dwm-hover-line)}.dwm-hover-bridge{position:fixed;z-index:109;-webkit-app-region:no-drag}
.dwm-hover .dwm-hover-task-row{align-items:flex-start}.dwm-hover .dwm-hover-task-main{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;min-width:0;flex:1}.dwm-hover .dwm-hover-command{flex:1 1 84px;min-width:0;max-width:100%}.dwm-hover .dwm-hover-meta{min-width:0;max-width:100%;flex:0 1 auto;flex-wrap:wrap}.dwm-hover-port-toggle{flex:none;max-width:100%;min-height:20px;border:0;border-radius:3px;padding:2px 3px;background:transparent;color:var(--dwm-hover-accent);font:10px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}.dwm-hover-port-toggle:hover{background:var(--dsw-alias-interactive-bg-hover,#eef3f3)}.dwm-hover-port-toggle:focus-visible{outline:2px solid var(--dwm-hover-accent);outline-offset:2px}.dwm-hover-endpoints{flex:1 0 100%;min-width:0;display:grid;grid-template-columns:minmax(0,1fr);gap:3px;margin-top:2px;padding:4px 0;overscroll-behavior:contain}.dwm-hover-endpoints[hidden]{display:none}.dwm-hover-endpoint{min-width:0;max-width:100%;font:10px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:normal;overflow-wrap:anywhere;color:var(--dwm-hover-muted)}.dwm-hover-endpoint-protocol{color:var(--dwm-hover-accent)}

`;

/** A root overlay observes only DSH's real Workspace rows, leaving their behavior intact. */
export function WorkspaceHoverOverlay({ useWorkspaces, scan, actions }) {
  const workspaces = useWorkspaces(snapshot => snapshot.items);
  const workspacesRef = useRef(workspaces);
  workspacesRef.current = workspaces;
  const [state, setState] = useState(null);
  const [suppressionTarget, setSuppressionTarget] = useState(null);
  const [position, setPosition] = useState(null);
  const [language, setLanguage] = useState(detectLanguage);
  const controllerRef = useRef(null);
  const popoverRef = useRef(null);
  const id = `dwm-workspace-hover-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  const execution = useExecution({ identity: state ? { workspaceId: state.target.workspaceId } : null, actions, onChanged: (_result, identity) => {
    if (controllerRef.current?.getTarget()?.workspaceId === identity.workspaceId) controllerRef.current.refresh();
  } });
  const hasActiveRuns = mergeRuns(state?.snapshot?.runs, execution.state.runs).some(isActiveRun);

  useEffect(() => {
    if (!state || !hasActiveRuns) return;
    const workspaceId = state.target.workspaceId;
    let timer;
    const sync = () => {
      clearInterval(timer);
      if (document.hidden) return;
      timer = setInterval(() => {
        if (controllerRef.current?.getTarget()?.workspaceId === workspaceId) controllerRef.current.refresh({ skipIfBusy: true });
      }, 3000);
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', sync); };
  }, [state?.target.workspaceId, hasActiveRuns]);

  useEffect(() => {
    let controller;
    controller = createWorkspaceHover({ scan, onChange: next => {
      setState(next);
      setSuppressionTarget(next?.target || controller.getSuppressedTarget());
    } });
    controllerRef.current = controller;
    const enter = target => {
      controller.enter(target);
      // Warm native HoverCard groups can open immediately; suppress the same
      // row during our dwell as well, before any process request is sent.
      setSuppressionTarget(controller.getAnchorTarget());
    };
    const inPopover = node => Boolean(node?.nodeType && popoverRef.current?.contains(node));
    const inCurrentRow = node => Boolean(node?.nodeType && controller.getAnchorTarget()?.row.contains(node));
    const inRegion = node => inPopover(node) || inCurrentRow(node)
      || Boolean(node?.closest?.('[data-dwm-hover-bridge]'));
    const pointerOver = event => {
      if (document.hidden || event.pointerType === 'touch' || event.buttons) return;
      if (inPopover(event.target) || event.target.closest?.('[data-dwm-hover-bridge]')) { controller.keep(); return; }
      const target = workspaceTarget(event.target, workspacesRef.current);
      if (target && workspaceTarget(event.relatedTarget, workspacesRef.current)?.row !== target.row) enter(target);
    };
    const pointerOut = event => {
      if (!inRegion(event.target)) return;
      if (inRegion(event.relatedTarget) || inRegion(document.activeElement)) controller.keep();
      else controller.leave();
    };
    const focusIn = event => {
      if (document.hidden) return;
      if (inPopover(event.target)) { controller.keep(); return; }
      const target = workspaceTarget(event.target, workspacesRef.current);
      if (target) enter(target);
    };
    const focusOut = event => {
      if (!inRegion(event.target)) return;
      if (inRegion(event.relatedTarget)) controller.keep(); else controller.leave();
    };
    const keyDown = event => { if (event.key === 'Escape') controller.dismiss(); };
    const dismissOutside = event => { if (!inPopover(event.target)) controller.dismiss(); };
    const hide = () => { if (document.hidden) controller.dismiss(); };
    const listeners = [
      ['pointerover', pointerOver], ['pointerout', pointerOut], ['focusin', focusIn], ['focusout', focusOut],
      ['keydown', keyDown], ['pointerdown', dismissOutside], ['contextmenu', dismissOutside], ['dragstart', dismissOutside],
      ['visibilitychange', hide],
    ];
    for (const [name, listener] of listeners) document.addEventListener(name, listener);
    return () => {
      controller.dispose();
      controllerRef.current = null;
      for (const [name, listener] of listeners) document.removeEventListener(name, listener);
    };
  }, [scan]);

  useEffect(() => {
    if (state && !workspaces.some(workspace => workspace.workspaceId === state.target.workspaceId)) controllerRef.current?.dismiss();
  }, [workspaces, state]);

  useEffect(() => {
    const observer = new MutationObserver(() => setLanguage(detectLanguage()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!suppressionTarget) return;
    return suppressNativeWorkspaceHover(document, suppressionTarget.path);
  }, [suppressionTarget?.row, suppressionTarget?.path]);

  useLayoutEffect(() => {
    if (!state) { setPosition(null); return; }
    const row = state.target.row;
    const place = () => {
      const rect = row.getBoundingClientRect();
      if (!row.isConnected || row.closest('[hidden], [inert]') || rect.width === 0 || rect.height === 0
        || rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
        controllerRef.current?.dismiss(); return;
      }
      setPosition(placeWorkspaceHover(rect, { width: window.innerWidth, height: window.innerHeight }, popoverRef.current?.offsetHeight || 240));
    };
    place();
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    resize?.observe(row);
    if (popoverRef.current) resize?.observe(popoverRef.current);
    const visibility = new MutationObserver(place);
    if (row.parentElement) visibility.observe(row.parentElement, { childList: true });
    if (row.parentElement?.parentElement) visibility.observe(row.parentElement.parentElement, { childList: true });
    for (let ancestor = row; ancestor; ancestor = ancestor.parentElement) visibility.observe(ancestor, { attributes: true, attributeFilter: ['hidden', 'inert', 'style', 'class'] });
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      resize?.disconnect(); visibility.disconnect();
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [state?.target.row, state?.status, state?.snapshot]);

  if (typeof document === 'undefined') return null;
  if (!state) return suppressionTarget ? createPortal(<style>{hoverStyles}{executionStyles}</style>, document.body) : null;
  const keep = () => controllerRef.current?.keep();
  const leave = () => controllerRef.current?.leave();
  return createPortal(<>
    <style>{hoverStyles}{executionStyles}</style>
    {position && <div className="dwm-hover-bridge" data-dwm-hover-bridge aria-hidden="true" style={position.bridge} onPointerEnter={keep} onPointerLeave={leave} />}
    <div ref={popoverRef} className="dwm-hover" data-dwm-hover data-workspace-id={state.target.workspaceId} role="dialog" aria-modal="false" aria-labelledby={id} onPointerEnter={keep} onPointerLeave={leave}
      style={{ left: position?.left ?? 0, top: position?.top ?? 0, width: position?.width ?? 344, maxHeight: position?.maxHeight ?? 430, visibility: position ? 'visible' : 'hidden' }}>
      <WorkspaceHoverContent state={state} language={language} headingId={id} onRetry={() => controllerRef.current?.retry()} execution={actions ? execution : undefined} />
    </div>
  </>, document.body);
}

export function WorkspaceHoverContent({ state, language = 'en', headingId, onRetry, execution }) {
  const text = copy[language] || copy.en;
  const tasks = state.snapshot?.tasks || [];
  const runs = mergeRuns(state.snapshot?.runs, execution?.state.runs);
  const catalog = execution?.state;
  const commands = catalog?.commands || [];
  const knownCommands = new Set(commands.map(command => command.id));
  // An active script already has its ports and Stop control in the task list.
  const representedRuns = new Set(tasks.slice(0, 5).map(task => task.runId).filter(Boolean));
  const representedCommands = new Set(runs.filter(run => isActiveRun(run) && representedRuns.has(runKey(run))).map(run => run.commandId));
  const availableCommands = commands.filter(command => !representedCommands.has(command.id));
  const showCatalog = catalog && (catalog.commandStatus !== 'ready' || !commands.length || availableCommands.length > 0);
  const recentRuns = unlistedRuns(runs, tasks).filter(run => !isActiveRun(run) || !knownCommands.has(run.commandId));
  return <>
    <header className="dwm-hover-head"><div className="dwm-hover-heading"><h2 id={headingId}>{state.target.title}</h2>{state.status === 'ready' && <span className="dwm-hover-count">{text.count(tasks.length)}</span>}</div><p className="dwm-hover-path" title={state.target.path}>{state.target.path}</p></header>
    {state.status === 'loading' && <div className="dwm-hover-status" role="status"><p>{text.loading}</p></div>}
    {state.status === 'error' && <div className="dwm-hover-status" role="alert"><p>{text.error}</p><button type="button" className="dwm-hover-retry" onClick={onRetry}>{text.retry}</button></div>}
    {state.status === 'ready' && (tasks.length === 0 ? !execution && <div className="dwm-hover-status"><p>{text.empty}</p></div> : <ol className="dwm-hover-list">{tasks.slice(0, 5).map(task => <WorkspaceHoverTask
      key={`${state.target.workspaceId || state.target.path}:${task.id || `${task.pid}:${task.startedAt || ''}`}`}
      task={task} workspacePath={state.target.path} language={language} execution={execution}
    />)}</ol>)}
    {state.status === 'ready' && tasks.length > 5 && <footer className="dwm-hover-footer">{text.more(tasks.length - 5)}</footer>}
    {state.status === 'ready' && state.snapshot?.warnings?.length > 0 && <footer className="dwm-hover-footer">{text.partial}</footer>}
    {execution && <ManagedRuns runs={recentRuns} operations={catalog.operations} onStop={execution.manager.stop} identity={{ workspaceId: state.target.workspaceId }} language={language} compact canStop={state.snapshot?.capabilities?.canStop !== false} />}
    {showCatalog && <CommandCatalog state={{ ...catalog, commands: availableCommands }} runs={runs} onRun={execution.manager.run} onStop={execution.manager.stop} onRetry={execution.manager.commands} language={language} compact />}
  </>;
}


/** Task-local disclosure survives scans with the same stable task identity. */
export function WorkspaceHoverTask({ task, workspacePath, language = 'en', execution }) {
  const [expanded, setExpanded] = useState(false);
  const controlsId = `dwm-hover-endpoints-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  const operation = execution?.state.operations[stopKey(task)];
  return <li className="dwm-hover-task" data-dwm-hover-task>
    <div className="dwm-hover-task-row"><div className="dwm-hover-task-main">
      <code className="dwm-hover-command" title={`${task.command}\nPID ${task.pid}`}>{compactWorkspaceCommand(task.command, workspacePath)}</code>
      <HoverTaskPorts ports={task.ports || []} expanded={expanded} onToggle={() => setExpanded(value => !value)} controlsId={controlsId} language={language} />
    </div>{execution && <StopButton task={task} operation={operation} onStop={execution.manager.stop} language={language} />}</div>
    <StopFeedback operation={operation} language={language} />{operation?.error && <div className="dwm-action-error" role="alert">{operation.error.message}</div>}
  </li>;
}

/** Only this region expands; the popover remains the single scroll container. */
export function HoverTaskPorts({ ports, expanded, onToggle, controlsId, language = 'en' }) {
  const text = copy[language] || copy.en;
  const extra = Math.max(0, ports.length - 4);
  const label = expanded ? text.collapsePortsLabel : text.morePorts(extra);
  return <>
    <div className="dwm-hover-meta">{!expanded && (ports.length ? ports.slice(0, 4).map((port, index) => <span className="dwm-hover-port" title={`${port.protocol} ${portAddress(port)}`} key={index}>{port.protocol === 'udp' ? 'UDP ' : ''}{port.port}</span>) : <span className="dwm-hover-no-port">—</span>)}
      {(extra > 0 || expanded) && <button type="button" className="dwm-hover-port-toggle" onClick={onToggle} aria-expanded={expanded} aria-controls={controlsId} aria-label={label} title={label} data-dwm-hover-port-toggle>{expanded ? text.collapsePorts : `+${extra}`}</button>}
    </div>
    <div id={controlsId} className="dwm-hover-endpoints" hidden={!expanded} role="region" aria-label={text.endpoints} data-dwm-hover-endpoints>
      {expanded && ports.map((port, index) => <code className="dwm-hover-endpoint" key={`${port.protocol}-${port.address}-${port.port}-${index}`} data-dwm-hover-endpoint><span className="dwm-hover-endpoint-protocol">{(port.protocol || 'tcp').toUpperCase()}</span>{' '}{portAddress(port)}</code>)}
    </div>
  </>;
}
