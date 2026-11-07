import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createExecutionManager, emptyExecution, filterCommands, identityKey, isActiveRun, rpcValue, runKey, stopKey } from './execution-model.mjs';

export const executionCopy = {
  en: {
    commands: 'Available commands', loading: 'Reading package scripts…', empty: 'No package scripts found.', noMatch: 'No commands match your filter.', retry: 'Try again', catalogError: 'Could not load commands.',
    run: 'Run command', stop: 'Stop task', stopping: 'Stopping…', starting: 'Starting…', alreadyRunning: 'Already running', unavailable: 'Stopping is unavailable for this process.', runUnavailable: 'Running commands is unavailable on this host.',
    definition: 'Script definition', root: 'Project root', launched: 'Launched here', running: 'Running', stopped: 'Stopped', completed: 'Completed', failed: 'Failed', exit: 'Exit', output: 'Output', refresh: 'Refresh output', loadingOutput: 'Reading output…', noOutput: 'No output yet.', truncated: 'Earlier output was truncated.', outputError: 'Could not read output.', actionError: 'Action failed', partial: 'Some command locations could not be read.', partialStop: 'Some processes are still running. Refresh to check them.', alreadyFinished: 'The task has already finished.',
  },
  zh: {
    commands: '可运行命令', loading: '正在读取项目脚本…', empty: '未发现 package.json 脚本。', noMatch: '没有匹配的命令。', retry: '重试', catalogError: '读取命令失败。',
    run: '运行命令', stop: '停止任务', stopping: '停止中…', starting: '启动中…', alreadyRunning: '已在运行', unavailable: '此进程暂不支持停止。', runUnavailable: '当前主机不支持启动命令。',
    definition: '脚本定义', root: '项目根目录', launched: '插件启动任务', running: '运行中', stopped: '已停止', completed: '已完成', failed: '失败', exit: '退出码', output: '输出日志', refresh: '刷新日志', loadingOutput: '正在读取日志…', noOutput: '暂无输出。', truncated: '较早的日志已截断。', outputError: '读取日志失败。', actionError: '操作失败', partial: '部分目录的脚本未能读取。', partialStop: '部分进程仍在运行，请刷新后查看。', alreadyFinished: '任务已经结束。',
  },
};

export const executionStyles = `
.dwm-icon-action{display:inline-flex;align-items:center;justify-content:center;flex:none;width:27px;height:27px;min-width:27px;padding:6px;border:1px solid var(--dsw-alias-border-l3,#dfe7e8);border-radius:5px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-secondary,#637078);cursor:pointer}.dwm-icon-action svg{display:block;width:12px;height:12px;flex:none}.dwm-icon-action:hover:not(:disabled){color:var(--dsw-alias-state-business-primary,#087f83);border-color:currentColor}.dwm-icon-action:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#087f83);outline-offset:2px}.dwm-icon-action:disabled{opacity:.42;cursor:default}.dwm-icon-stop:hover:not(:disabled){color:var(--dsw-alias-state-error-primary,#b24940)}.dwm-task-topline{display:flex;align-items:flex-start}.dwm-task-topline>.dwm-task-toggle{min-width:0;flex:1}.dwm-task-stop{margin:12px 10px 0 0;display:flex;flex:none}.dwm-action-section{margin-top:18px;padding-top:13px;border-top:1px solid var(--dsw-alias-border-l3,#dfe7e8)}.dwm-action-section h3,.dwm-command-section-title{margin:0 0 8px;font-size:12px;font-weight:600}.dwm-command-item{padding:9px 0;border-bottom:1px solid var(--dsw-alias-border-l3,#dfe7e8)}.dwm-command-item:last-child{border-bottom:0}.dwm-command-row{display:flex;align-items:center;gap:8px}.dwm-command-info{flex:1;min-width:0}.dwm-script-name{font:600 12px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow-wrap:anywhere}.dwm-script-directory{font-size:10px;color:var(--dsw-alias-label-tertiary,#7b898e);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dwm-command-details{margin-top:5px;font-size:10px;color:var(--dsw-alias-label-secondary,#64747b)}.dwm-command-details summary{cursor:pointer;overflow-wrap:anywhere}.dwm-command-definition{display:block;margin:6px 0 0;padding:6px 8px;border-radius:4px;background:var(--dsw-alias-bg-base,#fff);font:10px/1.7 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}.dwm-action-note{font-size:11px;color:var(--dsw-alias-label-secondary,#64747b);padding:7px 0}.dwm-action-error{margin-top:6px;color:var(--dsw-alias-state-error-primary,#b24940);font-size:10px;line-height:1.6;overflow-wrap:anywhere}.dwm-run-state{font-size:10px;color:var(--dsw-alias-label-secondary,#64747b);font-variant-numeric:tabular-nums}.dwm-run-state[data-failed=true]{color:var(--dsw-alias-state-error-primary,#b24940)}.dwm-run-record{padding:9px 0;border-bottom:1px solid var(--dsw-alias-border-l3,#dfe7e8)}.dwm-run-record:last-child{border-bottom:0}.dwm-run-heading{display:flex;align-items:center;gap:8px}.dwm-run-heading>div{flex:1;min-width:0}.dwm-run-label{font:11px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow-wrap:anywhere}.dwm-output{margin-top:8px;font-size:10px}.dwm-output summary{cursor:pointer;color:var(--dsw-alias-label-secondary,#64747b)}.dwm-output-toolbar{display:flex;align-items:center;gap:8px;margin-top:6px}.dwm-output-toolbar button{font:10px/1.5 inherit;padding:3px 6px;border:1px solid var(--dsw-alias-border-l3,#dfe7e8);border-radius:4px;background:var(--dsw-alias-bg-base,#fff);color:inherit;cursor:pointer}.dwm-output pre{font:10px/1.7 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;max-height:220px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0 0;padding:8px;border-radius:4px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#202b32)}.dwm-output-note{font-size:10px;color:var(--dsw-alias-label-tertiary,#7b898e);margin-top:4px}.dwm-hover .dwm-command-item{padding:4px 0}.dwm-hover .dwm-command-details{margin:0;font-size:11px}.dwm-hover .dwm-command-details summary{min-height:24px;align-content:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dwm-hover .dwm-command-details summary::marker{font-size:8px;color:var(--dsw-alias-label-tertiary,#7b898e)}.dwm-hover .dwm-script-name{font-size:11px}.dwm-hover .dwm-script-directory{display:inline;margin-left:8px;font-size:10px}.dwm-hover .dwm-command-definition{margin:3px 0;font-size:10px}.dwm-hover .dwm-icon-action{width:24px;min-width:24px;height:24px;padding:5px}.dwm-hover-action-section{padding:4px 12px;border-top:1px solid var(--dsw-alias-border-l3,#dfe7e8)}.dwm-hover-task-row{display:flex;align-items:center;gap:8px}.dwm-hover-task-main{min-width:0;flex:1}.dwm-hover .dwm-run-record{padding:5px 0}.dwm-hover .dwm-run-heading>div{display:flex;align-items:center;gap:8px;min-width:0}.dwm-hover .dwm-run-label{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dwm-hover .dwm-run-state{flex:none;font-size:9px}.dwm-hover .dwm-action-note{padding:4px 0}
`;

export function useExecution({ identity, actions, onChanged }) {
  const [value, setValue] = useState(null);
  const changed = useRef(onChanged);
  changed.current = onChanged;
  const context = identityKey(identity);
  const manager = useMemo(() => createExecutionManager({ actions, onChange: setValue, onChanged: (...args) => changed.current?.(...args) }), [actions]);
  useEffect(() => () => manager.dispose(), [manager]);
  useEffect(() => { manager.setIdentity(identity); }, [manager, context]);
  return { state: value?.contextKey === context ? value : emptyExecution(context), manager };
}

export function ActionIcon({ kind }) {
  return <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">{kind === 'stop' ? <rect x="3" y="3" width="10" height="10" rx="1" /> : <path d="M4 2.5v11l9-5.5z" />}</svg>;
}

export function runStatus(run, text) {
  const status = text[run?.status] || run?.status || '';
  return `${status}${run?.exitCode !== undefined && run?.exitCode !== null ? ` · ${text.exit} ${run.exitCode}` : ''}${run?.signal ? ` · ${run.signal}` : ''}`;
}

export function StopButton({ task, operation, onStop, language = 'en' }) {
  const text = executionCopy[language] || executionCopy.en;
  const stopping = operation?.pending || operation?.result?.status === 'stopping' || task.status === 'stopping';
  const allowed = task.canStop === true;
  const reason = stopping ? text.stopping : allowed ? `${text.stop}: ${task.label || task.command || task.pid}` : task.stopReason || text.unavailable;
  return <button type="button" className="dwm-icon-action dwm-icon-stop" onClick={() => onStop?.(task)} disabled={!allowed || stopping || !onStop} title={reason} aria-label={reason} data-dwm-stop><ActionIcon kind="stop" /></button>;
}

export function StopFeedback({ operation, language = 'en' }) {
  const text = executionCopy[language] || executionCopy.en;
  const status = operation?.pending ? 'stopping' : operation?.result?.status;
  const label = status === 'partial' ? text.partialStop : status === 'already-finished' ? text.alreadyFinished : status === 'stopping' ? text.stopping : status === 'stopped' ? text.stopped : null;
  return label ? <div className={status === 'partial' ? 'dwm-action-error' : 'dwm-run-state'} role="status">{label}</div> : null;
}

export function CommandCatalog({ state, runs = [], onRun, onStop, onRetry, query = '', language = 'en', compact = false }) {
  const text = executionCopy[language] || executionCopy.en;
  const commands = filterCommands(state.commands || [], query);
  return <section className={compact ? 'dwm-hover-action-section' : 'dwm-action-section'} data-dwm-commands aria-label={compact ? text.commands : undefined}>
    {!compact && <h3 className="dwm-command-section-title">{text.commands}</h3>}
    {['idle', 'loading'].includes(state.commandStatus) && <div className="dwm-action-note" role="status">{text.loading}</div>}
    {state.commandStatus === 'error' && <div className="dwm-action-note" role="alert">{text.catalogError}<button type="button" className="dwm-text-button" onClick={onRetry}>{text.retry}</button></div>}
    {state.commandStatus === 'ready' && commands.length === 0 && <div className="dwm-action-note">{query.trim() ? text.noMatch : text.empty}</div>}
    <div className="dwm-command-list">{commands.map(command => {
      const operation = state.operations[`run:${command.id}`];
      const active = runs.find(run => run.commandId === command.id && isActiveRun(run));
      const runDisabled = command.canRun === false || state.capabilities.canRun === false;
      const title = operation?.pending ? text.starting : runDisabled ? text.runUnavailable : `${text.run}: ${command.label || command.script}`;
      const stopOperation = active ? state.operations[stopKey({ runId: runKey(active) })] : null;
      const launch = command.command || `${command.manager || 'npm'} run ${command.script}`;
      const nested = command.relativeDirectory && command.relativeDirectory !== '.';
      return <article className="dwm-command-item" key={command.id} data-dwm-command-id={command.id}>
        <div className="dwm-command-row">
          <div className="dwm-command-info">
            {compact ? <details className="dwm-command-details">
              <summary title={`${launch}\n${command.directory || ''}`}><span className="dwm-script-name">{command.script || command.label}</span>{nested && <span className="dwm-script-directory">{command.relativeDirectory}</span>}</summary>
              <code className="dwm-command-definition">{launch}{'\n'}{command.definition}</code>
            </details> : <><div className="dwm-script-name">{command.script || command.label}</div><div className="dwm-script-directory" title={command.directory}>{nested ? command.relativeDirectory : text.root}{command.packageName ? ` · ${command.packageName}` : ''}</div></>}
            {active && (!compact || active.status === 'stopping') && <RunState run={active} text={text} />}
          </div>
          {active ? <StopButton task={{ ...active, runId: runKey(active), canStop: active.canStop !== false && state.capabilities.canStop !== false }} operation={stopOperation} onStop={onStop} language={language} /> : <button type="button" className="dwm-icon-action" onClick={() => onRun(command.id)} disabled={operation?.pending || runDisabled} title={title} aria-label={title} data-dwm-run><ActionIcon kind="run" /></button>}
        </div>
        {!compact && <details className="dwm-command-details"><summary>{launch}</summary><code className="dwm-command-definition">{command.definition}</code></details>}
        <StopFeedback operation={stopOperation} language={language} />
        {(operation?.error || stopOperation?.error) && <div className="dwm-action-error" role="alert">{text.actionError}: {(operation?.error || stopOperation?.error).message}</div>}
      </article>;
    })}</div>
    {!compact && state.warnings?.length > 0 && <div className="dwm-output-note">{text.partial}</div>}
  </section>;
}

export function RunState({ run, text }) {
  return <div className="dwm-run-state" data-failed={run.status === 'failed' || Number(run.exitCode) > 0}>{runStatus(run, text)}</div>;
}

export function RunOutput({ run, identity, actions, language = 'en' }) {
  const text = executionCopy[language] || executionCopy.en;
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(run);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const context = identityKey(identity);
  useEffect(() => {
    if (!open || !actions?.output) return;
    let disposed = false; let timer; let controller;
    async function read() {
      controller = new AbortController(); setBusy(true);
      let next;
      try { next = rpcValue(await actions.output({ ...identity, runId: runKey(run) }, controller.signal)); if (!disposed) { setResult(next); setError(null); } }
      catch (cause) { if (!disposed && !controller.signal.aborted) setError(cause); }
      finally { if (!disposed) { setBusy(false); if (isActiveRun(next)) timer = setTimeout(read, 3000); } }
    }
    void read();
    return () => { disposed = true; controller?.abort(); clearTimeout(timer); };
  }, [open, context, runKey(run), run.status, actions, refresh]);
  const output = String(result?.output || '').replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
  return <details className="dwm-output" onToggle={event => setOpen(event.currentTarget.open)}><summary>{text.output}</summary>{open && <><div className="dwm-output-toolbar"><button type="button" onClick={() => setRefresh(value => value + 1)} disabled={busy}>{text.refresh}</button><RunState run={result || run} text={text} /></div>{error && <div className="dwm-action-error" role="alert">{text.outputError}</div>}<pre>{output || (busy ? text.loadingOutput : text.noOutput)}</pre>{result?.truncated && <div className="dwm-output-note">{text.truncated}</div>}</>}</details>;
}

export function ManagedRuns({ runs, operations, onStop, identity, actions, language = 'en', compact = false, canStop = true }) {
  const text = executionCopy[language] || executionCopy.en;
  if (!runs.length) return null;
  return <section className={compact ? 'dwm-hover-action-section' : 'dwm-action-section'} data-dwm-managed-runs aria-label={compact ? text.launched : undefined}>{!compact && <h3 className="dwm-command-section-title">{text.launched}</h3>}{(compact ? runs.slice(0, 3) : runs).map(run => <article className="dwm-run-record" key={runKey(run)}><div className="dwm-run-heading"><div><div className="dwm-run-label" title={run.label}>{compact ? run.command || run.label : run.label || run.command}</div><RunState run={run} text={text} /></div>{isActiveRun(run) && <StopButton task={{ ...run, runId: runKey(run), canStop: canStop && run.canStop !== false }} operation={operations[stopKey({ runId: runKey(run) })]} onStop={onStop} language={language} />}</div><StopFeedback operation={operations[stopKey({ runId: runKey(run) })]} language={language} />{operations[stopKey({ runId: runKey(run) })]?.error && <div className="dwm-action-error" role="alert">{operations[stopKey({ runId: runKey(run) })].error.message}</div>}{!compact && <RunOutput run={run} identity={identity} actions={actions} language={language} />}</article>)}</section>;
}
