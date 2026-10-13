// Login do Monitor (rota /api/auth).
//  • Com Supabase Auth configurado: qualquer pessoa cadastrada no Supabase entra com e-mail e senha.
//    Administradores: o dono (AUTH_EMAIL), quem estiver em MONITOR_ADMINS ou quem tiver perfil "admin".
//  • Sem Supabase Auth: modo antigo, só o e-mail do dono.
// A sessão é um cookie HttpOnly assinado com MONITOR_AUTH_SECRET, válido até o fim do dia.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { isSupabaseAuthConfigured, isSupabaseConfigured, signInWithPassword, adminGetUser } from '../lib/supabase.js';

const AUTH_EMAIL = 'bruno.lumertz@safeweb.com.br';
const COOKIE_NAME = '__Host-monitor_session';
const TZ = 'America/Sao_Paulo';

function secret() {
  return process.env.MONITOR_AUTH_SECRET || process.env.ORPEN_EXTERNAL_TOKEN || '';
}

export function ownerEmail() {
  return AUTH_EMAIL;
}

// Administradores fixos: o dono + lista opcional na variável MONITOR_ADMINS (e-mails separados por vírgula)
export function isFixedAdmin(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return false;
  if (e === AUTH_EMAIL) return true;
  return String(process.env.MONITOR_ADMINS || '').split(/[,;\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean).includes(e);
}

function encode(value) { return Buffer.from(value).toString('base64url'); }
function decode(value) { return Buffer.from(value, 'base64url').toString('utf8'); }
function sign(payload) { return createHmac('sha256', secret()).update(payload).digest('base64url'); }

function expiryAtEndOfDay() {
  const now = new Date();
  const localNow = new Date(now.toLocaleString('en-US', { timeZone: TZ }));
  const tomorrow = new Date(localNow);
  tomorrow.setDate(localNow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return Date.now() + Math.max(60_000, tomorrow.getTime() - localNow.getTime());
}

function sessionToken({ email, exp, mode, admin, uid }) {
  const payload = encode(JSON.stringify({ email, exp, mode, admin: Boolean(admin), uid: uid || '' }));
  return payload + '.' + sign(payload);
}

function cookieValue(req) {
  const raw = String(req.headers?.cookie || '');
  const found = raw.split(';').map((v) => v.trim()).find((v) => v.startsWith(COOKIE_NAME + '='));
  return found ? found.slice(COOKIE_NAME.length + 1) : '';
}

export function getMonitorSession(req) {
  if (!secret()) return null;

  const parts = cookieValue(req).split('.');
  if (parts.length !== 2) return null;

  const [payload, provided] = parts;
  const expected = sign(payload);
  if (provided.length !== expected.length) return null;

  try {
    if (!timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return null;
    const data = JSON.parse(decode(payload));
    if (!Number.isFinite(data.exp) || data.exp <= Date.now()) return null;
    const email = String(data.email || '').toLowerCase();
    // sessões de colegas só valem enquanto o login com senha estiver ligado
    const allowed = email === AUTH_EMAIL || (data.mode === 'password' && isSupabaseAuthConfigured());
    if (!allowed) return null;
    return { email, exp: data.exp, uid: data.uid || '', admin: Boolean(data.admin) || isFixedAdmin(email) };
  } catch (_) {
    return null;
  }
}

export function requireMonitorSession(req, res) {
  if (getMonitorSession(req)) return true;
  res.status(401).json({ ok: false, error: 'Acesso não autorizado.' });
  return false;
}

// Confere no Supabase se o acesso ainda existe e não está bloqueado (resultado guardado por 2 min).
// Assim, remover ou bloquear um colega corta o acesso dele em poucos minutos, sem esperar o fim do dia.
const statusCache = new Map();
// Situação atual do acesso no Supabase: existe? bloqueado? perfil? (guardado por 2 min)
async function liveStatus(session) {
  if (!session.uid || !isSupabaseConfigured()) return { ok: true, role: null };
  const hit = statusCache.get(session.uid);
  if (hit && Date.now() - hit.t < 120_000) return hit;
  let st = { ok: true, role: null };
  try { const u = await adminGetUser(session.uid); st = { ok: Boolean(u && !u.blocked), role: u ? u.role : null }; }
  catch (error) { st = { ok: error?.status !== 404, role: null }; }   // falha de rede não derruba ninguém
  st.t = Date.now();
  statusCache.set(session.uid, st);
  return st;
}
async function stillActive(session) { return (await liveStatus(session)).ok; }

export function forgetSessionStatus(uid) { statusCache.delete(uid); }

// Sessão conferida no Supabase, com o perfil atualizado (mudança de perfil vale sem novo login)
export async function currentSession(req) {
  const session = getMonitorSession(req);
  if (!session) return null;
  const st = await liveStatus(session);
  if (!st.ok) return null;
  if (st.role) session.admin = isFixedAdmin(session.email) || st.role === 'admin';
  return session;
}

export async function requireActiveSession(req, res) {
  const raw = getMonitorSession(req);
  const session = await currentSession(req);
  if (session) return session;
  if (raw) res.setHeader('Set-Cookie', sessionCookie('', 0));
  res.status(401).json({ ok: false, error: 'Acesso não autorizado.' });
  return null;
}

export async function requireActiveAdmin(req, res) {
  const session = await requireActiveSession(req, res);
  if (!session) return null;
  if (!session.admin) { res.status(403).json({ ok: false, error: 'Somente administradores podem gerenciar acessos.' }); return null; }
  return session;
}

export function requireAdminSession(req, res) {
  const session = getMonitorSession(req);
  if (!session) { res.status(401).json({ ok: false, error: 'Acesso não autorizado.' }); return null; }
  if (!session.admin) { res.status(403).json({ ok: false, error: 'Somente administradores podem gerenciar acessos.' }); return null; }
  return session;
}

function sessionCookie(token, maxAge) {
  return COOKIE_NAME + '=' + token + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + Math.max(0, Math.floor(maxAge / 1000));
}

// Freio contra tentativas de senha em sequência (por instância da função)
const attempts = new Map();
function tooMany(key) {
  const now = Date.now();
  const list = (attempts.get(key) || []).filter((t) => now - t < 10 * 60_000);
  attempts.set(key, list);
  return list.length >= 8;
}
function addAttempt(key) { const list = attempts.get(key) || []; list.push(Date.now()); attempts.set(key, list); }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!secret()) {
    return res.status(500).json({ ok: false, error: 'Autenticação não configurada no servidor.' });
  }

  const mode = isSupabaseAuthConfigured() ? 'password' : 'email';

  if (req.method === 'GET') {
    const raw = getMonitorSession(req);
    const session = await currentSession(req);
    if (raw && !session) res.setHeader('Set-Cookie', sessionCookie('', 0));
    return session
      ? res.status(200).json({ ok: true, email: session.email, admin: session.admin, mode })
      : res.status(401).json({ ok: false, error: 'Sessão não encontrada ou expirada.', mode });
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', sessionCookie('', 0));
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch (_) {
    return res.status(400).json({ ok: false, error: 'Não foi possível validar o acesso.' });
  }
  const email = String(body.email || '').trim().toLowerCase();

  if (mode === 'password') {
    const password = String(body.password || '');
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'ip';
    if (tooMany('e:' + email) || tooMany('i:' + ip)) {
      return res.status(429).json({ ok: false, error: 'Muitas tentativas. Aguarde alguns minutos.' });
    }
    if (!email || !password) {
      return res.status(401).json({ ok: false, error: 'Informe e-mail e senha.' });
    }

    let data;
    try {
      data = await signInWithPassword(email, password);
    } catch (error) {
      addAttempt('e:' + email); addAttempt('i:' + ip);
      return res.status(401).json({ ok: false, error: 'E-mail ou senha incorretos, ou acesso bloqueado.' });
    }

    const user = data?.user || {};
    const admin = isFixedAdmin(email) || user?.app_metadata?.monitor_role === 'admin';
    const exp = expiryAtEndOfDay();
    res.setHeader('Set-Cookie', sessionCookie(sessionToken({ email, exp, mode, admin, uid: user.id }), exp - Date.now()));
    return res.status(200).json({ ok: true, email, admin, mode, expiresAt: exp });
  }

  // modo antigo (sem Supabase Auth): só o dono
  if (email !== AUTH_EMAIL) {
    return res.status(401).json({ ok: false, error: 'E-mail não autorizado.' });
  }
  const exp = expiryAtEndOfDay();
  res.setHeader('Set-Cookie', sessionCookie(sessionToken({ email, exp, mode, admin: true }), exp - Date.now()));
  return res.status(200).json({ ok: true, email, admin: true, mode, expiresAt: exp });
}
