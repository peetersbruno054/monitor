import { createHmac, timingSafeEqual } from 'node:crypto';
import { isSupabaseAuthConfigured, signInWithPassword } from '../lib/supabase.js';

const AUTH_EMAIL = 'bruno.lumertz@safeweb.com.br';
const COOKIE_NAME = '__Host-monitor_session';
const TZ = 'America/Sao_Paulo';

function secret() {
  return process.env.MONITOR_AUTH_SECRET || process.env.ORPEN_EXTERNAL_TOKEN || '';
}

function encode(value) {
  return Buffer.from(value).toString('base64url');
}

function decode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function expiryAtEndOfDay() {
  const now = new Date();
  const localNow = new Date(now.toLocaleString('en-US', { timeZone: TZ }));
  const tomorrow = new Date(localNow);
  tomorrow.setDate(localNow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return Date.now() + Math.max(60_000, tomorrow.getTime() - localNow.getTime());
}

function sessionToken(exp) {
  const payload = encode(JSON.stringify({ email: AUTH_EMAIL, exp }));
  return payload + '.' + sign(payload);
}

function cookieValue(req) {
  const raw = String(req.headers?.cookie || '');
  const found = raw.split(';').map((v) => v.trim()).find((v) => v.startsWith(COOKIE_NAME + '='));
  return found ? found.slice(COOKIE_NAME.length + 1) : '';
}

export function getMonitorSession(req) {
  if (!secret()) return null;

  const token = cookieValue(req);
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payload, provided] = parts;
  const expected = sign(payload);
  if (provided.length !== expected.length) return null;

  try {
    if (!timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return null;
    const data = JSON.parse(decode(payload));
    if (data.email !== AUTH_EMAIL || !Number.isFinite(data.exp) || data.exp <= Date.now()) return null;
    return { email: data.email, exp: data.exp };
  } catch (_) {
    return null;
  }
}

export function requireMonitorSession(req, res) {
  if (getMonitorSession(req)) return true;
  res.status(401).json({ ok: false, error: 'Acesso não autorizado.' });
  return false;
}

function sessionCookie(token, maxAge) {
  return COOKIE_NAME + '=' + token + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + Math.max(1, Math.floor(maxAge / 1000));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!secret()) {
    return res.status(500).json({
      ok: false,
      error: 'Autenticação não configurada no servidor.'
    });
  }

  if (req.method === 'GET') {
    const session = getMonitorSession(req);
    return session
      ? res.status(200).json({ ok: true, email: session.email, mode: isSupabaseAuthConfigured() ? 'password' : 'email' })
      : res.status(401).json({ ok: false, error: 'Sessão não encontrada ou expirada.', mode: isSupabaseAuthConfigured() ? 'password' : 'email' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  }

  try {
    const body = typeof req.body === 'string'
      ? JSON.parse(req.body || '{}')
      : (req.body || {});
    const email = String(body.email || '').trim().toLowerCase();

    if (email !== AUTH_EMAIL) {
      return res.status(401).json({
        ok: false,
        error: 'E-mail não autorizado.'
      });
    }

    if (isSupabaseAuthConfigured()) {
      const password = String(body.password || '');
      if (!password) {
        return res.status(401).json({
          ok: false,
          error: 'Informe a senha.'
        });
      }

      try {
        await signInWithPassword(email, password);
      } catch (error) {
        return res.status(401).json({
          ok: false,
          error: error?.message || 'E-mail ou senha inválidos.'
        });
      }
    }

    const expiresAt = expiryAtEndOfDay();
    const token = sessionToken(expiresAt);

    res.setHeader('Set-Cookie', sessionCookie(token, expiresAt - Date.now()));
    return res.status(200).json({
      ok: true,
      email: AUTH_EMAIL,
      mode: isSupabaseAuthConfigured() ? 'password' : 'email',
      expiresAt
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: 'Não foi possível validar o acesso.'
    });
  }
}
