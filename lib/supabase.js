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
    SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1/token?grant_type=password',
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
  // chaves novas (sb_secret_...) vão só no apikey; a service_role antiga (JWT) também no Authorization
  if (/^eyJ/.test(SUPABASE_KEY)) headers.set('Authorization', 'Bearer ' + SUPABASE_KEY);
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

  const collectedAt = new Date().toISOString();
  const body = [{
    report_id: reportId,
    period_start: start,
    period_end: end,
    collected_at: collectedAt,
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

  // guarda só a cópia mais recente de cada período (as anteriores não são usadas)
  try {
    const old = new URLSearchParams({
      report_id: 'eq.' + reportId,
      period_start: 'eq.' + start,
      period_end: 'eq.' + end,
      collected_at: 'lt.' + collectedAt
    });
    await request('report_snapshots?' + old.toString(), { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  } catch (error) {
    console.error('Monitor IA limpeza de snapshots:', error.message);
  }

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

/* ======================================================================
   Administração de acessos (Supabase Auth Admin API) — só no servidor
   ====================================================================== */
function authBase() {
  return SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1';
}

async function adminRequest(path, { method = 'GET', body } = {}) {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');
  const headers = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
  if (/^eyJ/.test(SUPABASE_KEY)) headers.Authorization = 'Bearer ' + SUPABASE_KEY;
  const response = await fetch(authBase() + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = null; }
  if (!response.ok) {
    const msg = data?.msg || data?.message || data?.error_description || data?.error || text.slice(0, 200);
    const err = new Error(String(msg || `Supabase Auth HTTP ${response.status}`));
    err.status = response.status;
    err.code = data?.error_code || data?.code || '';
    throw err;
  }
  return data;
}

function publicUser(u) {
  if (!u) return null;
  const banned = u.banned_until && new Date(u.banned_until).getTime() > Date.now();
  return {
    id: u.id,
    email: u.email,
    role: u.app_metadata?.monitor_role === 'admin' ? 'admin' : 'leitura',
    createdAt: u.created_at || null,
    lastSignInAt: u.last_sign_in_at || null,
    blocked: Boolean(banned)
  };
}

export async function adminListUsers() {
  const out = [];
  for (let page = 1; page <= 20; page += 1) {
    const data = await adminRequest(`/admin/users?page=${page}&per_page=100`);
    const users = Array.isArray(data) ? data : (data?.users || []);
    users.forEach((u) => out.push(publicUser(u)));
    if (users.length < 100) break;
  }
  return out.sort((a, b) => String(a.email).localeCompare(String(b.email)));
}

export async function adminGetUser(id) {
  return publicUser(await adminRequest(`/admin/users/${encodeURIComponent(id)}`));
}

export async function adminCreateUser({ email, password, role }) {
  const data = await adminRequest('/admin/users', {
    method: 'POST',
    body: { email, password, email_confirm: true, app_metadata: { monitor_role: role === 'admin' ? 'admin' : 'leitura' } }
  });
  return publicUser(data?.user || data);
}

export async function adminUpdateUser(id, changes) {
  const data = await adminRequest(`/admin/users/${encodeURIComponent(id)}`, { method: 'PUT', body: changes });
  return publicUser(data?.user || data);
}

export async function adminDeleteUser(id) {
  await adminRequest(`/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return true;
}
