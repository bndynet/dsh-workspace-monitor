/** Display helpers shared by the panel and its focused unit tests. */
export function detectLanguage() {
  const language = typeof document !== 'undefined' && document.documentElement.lang
    || (typeof navigator !== 'undefined' ? navigator.language : 'en');
  return /^zh(?:-|$)/i.test(language) ? 'zh' : 'en';
}

export function displayPath(value = '') {
  const parts = String(value).replace(/[\\/]+$/, '').split(/[\\/]/);
  return parts.at(-1) || String(value);
}

export function formatElapsed(startedAt, now = Date.now()) {
  const start = typeof startedAt === 'number' ? startedAt : Date.parse(startedAt);
  if (!Number.isFinite(start)) return '—';
  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor(seconds % 86400 / 3600)}h`;
}

export function portAddress(endpoint) {
  const address = String(endpoint.address || '*');
  return `${address.includes(':') && !address.startsWith('[') ? `[${address}]` : address}:${endpoint.port}`;
}

export function filterTasks(tasks, query) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return tasks;
  return tasks.filter(task => {
    const text = [task.command, task.cwd, task.runtime, task.pid, ...(task.pids || []),
      ...(task.ports || []).map(port => `${port.protocol} ${portAddress(port)}`),
      ...(task.processes || []).map(process => process.command)].join(' ').toLowerCase();
    return terms.every(term => text.includes(term));
  });
}

/** Accept a direct scan result for previews, or the official Connection RPC envelope. */
export function scanValue(result) {
  if (result?.ok === false) {
    const error = new Error(result.error?.message || 'Could not read running tasks.');
    error.code = result.error?.code;
    throw error;
  }
  const value = result?.ok === true ? result.value : result;
  if (!value || !Array.isArray(value.tasks) || typeof value.workspacePath !== 'string') {
    throw new Error('The monitor returned an invalid response.');
  }
  return { ...value, warnings: Array.isArray(value.warnings) ? value.warnings : [] };
}

export function runningJobs(jobs = [], query = '') {
  const term = query.trim().toLowerCase();
  return jobs.filter(job => ['running', 'stopping'].includes(job.status)
    && (!term || `${job.label} ${job.id}`.toLowerCase().includes(term)));
}
