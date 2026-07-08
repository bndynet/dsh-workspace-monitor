export function rpcValue(result) {
  if (result?.ok === false) {
    const error = new Error(result.error?.message || 'The operation failed.');
    error.code = result.error?.code;
    throw error;
  }
  return result?.ok === true ? result.value : result;
}

export const identityKey = identity => identity?.workspaceId ? `workspace:${identity.workspaceId}` : identity?.sessionId ? `session:${identity.sessionId}` : '';
export const runKey = run => run?.runId || run?.id;
export const isActiveRun = run => ['running', 'stopping'].includes(run?.status);
export const stopKey = task => `stop:${task.runId || task.id}`;
export const stopRequest = task => task.runId ? { runId: task.runId } : { taskId: task.id };

export function mergeRuns(scanned = [], local = []) {
  const runs = new Map(local.map(run => [runKey(run), run]));
  for (const run of scanned) {
    const previous = runs.get(runKey(run));
    // A scan started before a stop response must not move a run backwards.
    if (previous && (!isActiveRun(previous) && isActiveRun(run) || previous.status === 'stopping' && run.status === 'running')) continue;
    runs.set(runKey(run), run);
  }
  return [...runs.values()].sort((a, b) => b.startedAt - a.startedAt);
}

export function unlistedRuns(runs = [], tasks = []) {
  const listed = new Set(tasks.map(task => task.runId).filter(Boolean));
  return runs.filter(run => !isActiveRun(run) || !listed.has(runKey(run)));
}

export function filterCommands(commands = [], query = '') {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return commands.filter(command => terms.every(term => [command.label, command.script, command.relativeDirectory, command.definition, command.packageName, command.command].join(' ').toLowerCase().includes(term)));
}

export function emptyExecution(contextKey = '') {
  return { contextKey, commands: null, commandStatus: 'idle', commandError: null, warnings: [], operations: {}, runs: [], capabilities: {} };
}

/** UI requests change identity independently of accepted background executions. */
export function createExecutionManager({ actions = {}, onChange, onChanged = () => {} }) {
  let identity = null;
  let state = emptyExecution();
  let commandController;
  let commandGeneration = 0;
  let disposed = false;
  const pending = new Map();
  const actionControllers = new Set();
  const publish = patch => { state = { ...state, ...patch }; if (!disposed) onChange(state); };
  const operation = (key, patch) => publish({ operations: { ...state.operations, [key]: { ...state.operations[key], ...patch } } });
  async function commands() {
    if (disposed || !identity || typeof actions.commands !== 'function') return;
    commandController?.abort();
    commandController = new AbortController();
    const signal = commandController.signal;
    const context = identityKey(identity);
    const request = { ...identity };
    const generation = ++commandGeneration;
    publish({ commandStatus: 'loading', commandError: null });
    try {
      const result = rpcValue(await actions.commands(request, signal));
      if (!result || !Array.isArray(result.commands)) throw new Error('The command catalog returned an invalid response.');
      if (!disposed && !signal.aborted && generation === commandGeneration && state.contextKey === context) publish({ commandStatus: 'ready', commands: result.commands, warnings: result.warnings || [], capabilities: result.capabilities || {} });
    } catch (error) {
      if (!disposed && !signal.aborted && generation === commandGeneration && state.contextKey === context) publish({ commandStatus: 'error', commandError: error instanceof Error ? error : new Error(String(error)) });
    }
  }
  function execute(kind, request, key) {
    if (disposed || !identity || typeof actions[kind] !== 'function') return Promise.resolve(undefined);
    const context = identityKey(identity);
    const uniqueKey = `${context}:${key}`;
    if (pending.has(uniqueKey)) return pending.get(uniqueKey);
    const targetIdentity = { ...identity };
    const controller = new AbortController();
    actionControllers.add(controller);
    operation(key, { pending: true, error: null, result: null });
    const task = Promise.resolve().then(() => actions[kind]({ ...targetIdentity, ...request }, controller.signal)).then(rpcValue).then(result => {
      if (!disposed && state.contextKey === context) {
        const runs = runKey(result) && result.status ? mergeRuns([], [...state.runs.filter(run => runKey(run) !== runKey(result)), result]) : state.runs;
        publish({ runs });
        operation(key, { pending: false, result });
        onChanged(result, targetIdentity, kind);
      }
      return result;
    }, error => {
      if (!disposed && state.contextKey === context) operation(key, { pending: false, error: error instanceof Error ? error : new Error(String(error)) });
      return undefined;
    }).finally(() => { pending.delete(uniqueKey); actionControllers.delete(controller); });
    pending.set(uniqueKey, task);
    return task;
  }
  return {
    setIdentity(next) {
      if (disposed || identityKey(next) === state.contextKey) return;
      commandController?.abort(); commandGeneration += 1;
      identity = next ? next.workspaceId ? { workspaceId: next.workspaceId } : { sessionId: next.sessionId } : null;
      state = emptyExecution(identityKey(identity));
      onChange(state);
      void commands();
    },
    commands,
    run(commandId) { return execute('run', { commandId }, `run:${commandId}`); },
    stop(task) { return execute('stop', stopRequest(task), stopKey(task)); },
    getState() { return state; },
    dispose() { disposed = true; commandController?.abort(); for (const controller of actionControllers) controller.abort(); },
  };
}
