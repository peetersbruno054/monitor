const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';
const SUPABASE_AUTH_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

export function isSupabaseAuthConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_AUTH_KEY);
}

function apiUrl(path) {
  return SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/' + path.replace(/^\/+/, '');
}

export async function signInWithPassword(email, password) {
  if (!isSupabaseAuthConfigured()) {
    throw new Error('Supabase Auth não configurado.');
  }

  const response = await fetch(
    SUPABASE_URL.replace(/\\/+$/, '') + '/auth/v1/token?grant_type=password',
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_AUTH_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    }
  );

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error_description || data?.msg || 'E-mail ou senha inválidos.');
  }

  return data;
}

async function request(path, options = {}) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase não configurado.');
  }

  const headers = new Headers(options.headers || {});
  headers.set('apikey', SUPABASE_KEY);
  headers.set('Authorization', 'Bearer ' + SUPABASE_KEY);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(apiUrl(path), {
    ...options,
    headers
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Supabase HTTP ${response.status}: ${text.slice(0, 500)}`);
  }

  return text ? JSON.parse(text) : null;
}

export async function saveReportSnapshot({
  reportId,
  start,
  end,
  rows,
  source = 'manual'
}) {
  if (!isSupabaseConfigured()) return { saved: false, reason: 'not-configured' };

  const body = [{
    report_id: reportId,
    period_start: start,
    period_end: end,
    collected_at: new Date().toISOString(),
    rows,
    rows_count: Array.isArray(rows) ? rows.length : 0,
    source
  }];

  await request('report_snapshots', {
    method: 'POST',
    headers: {
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(body)
  });

  return { saved: true };
}

export async function saveSyncRun({
  startedAt,
  finishedAt,
  success,
  start,
  end,
  r72Rows = 0,
  r74Rows = 0,
  error = null
}) {
  if (!isSupabaseConfigured()) return { saved: false, reason: 'not-configured' };

  await request('sync_runs', {
    method: 'POST',
    headers: {
      Prefer: 'return=minimal'
    },
    body: JSON.stringify([{
      started_at: startedAt || new Date().toISOString(),
      finished_at: finishedAt || new Date().toISOString(),
      success: Boolean(success),
      period_start: start || null,
      period_end: end || null,
      r72_rows: Number(r72Rows) || 0,
      r74_rows: Number(r74Rows) || 0,
      error: error ? String(error).slice(0, 2000) : null
    }])
  });

  return { saved: true };
}

export async function getLatestReportSnapshot({ reportId, start, end }) {
  if (!isSupabaseConfigured()) return null;

  const params = new URLSearchParams({
    select: 'id,report_id,period_start,period_end,collected_at,rows,rows_count,source',
    report_id: 'eq.' + reportId,
    period_start: 'eq.' + start,
    period_end: 'eq.' + end,
    order: 'collected_at.desc',
    limit: '1'
  });

  const rows = await request('report_snapshots?' + params.toString(), {
    method: 'GET'
  });

  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}
