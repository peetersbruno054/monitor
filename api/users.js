// Gestão de acessos ao Monitor (Supabase Auth). Só administradores, exceto a troca da própria senha.
//   GET    /api/users                          → lista de acessos
//   POST   /api/users  {email, role}           → cria acesso com senha temporária (mostrada uma vez)
//   PATCH  /api/users  {id, action}            → action: reset | block | unblock | role (com role)
//   PATCH  /api/users  {action:'self-password', current, password} → troca a própria senha (qualquer usuário)
//   DELETE /api/users  {id}                    → remove o acesso
import { randomInt } from 'node:crypto';
import { getMonitorSession, requireActiveAdmin, forgetSessionStatus, isFixedAdmin, ownerEmail } from '../lib/auth.js';
import {
  isSupabaseConfigured, isSupabaseAuthConfigured, signInWithPassword,
  adminListUsers, adminGetUser, adminCreateUser, adminUpdateUser, adminDeleteUser
} from '../lib/supabase.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Senha temporária legível (sem 0/O, 1/l/I), com letras e números
function tempPassword(len = 12) {
  const a = 'abcdefghjkmnpqrstuvwxyz', A = 'ABCDEFGHJKMNPQRSTUVWXYZ', d = '23456789', all = a + A + d;
  const pick = (set) => set[randomInt(set.length)];
  const chars = [pick(a), pick(A), pick(d), pick(d)];
  while (chars.length < len) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i -= 1) { const j = randomInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join('');
}

function allowedDomain(email) {
  const list = String(process.env.MONITOR_ALLOWED_DOMAINS || '').split(/[,;\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
  return !list.length || list.some((d) => email.endsWith('@' + d.replace(/^@/, '')));
}

function friendly(error) {
  const m = String(error?.message || error || '');
  if (/already.*(registered|exists)/i.test(m) || error?.code === 'email_exists') return 'Este e-mail já tem acesso.';
  if (/invalid.*jwt|bad_jwt|not.*admin|403/i.test(m) || error?.status === 403 || error?.status === 401)
    return 'O Supabase recusou a chave do servidor. Use a chave secret (sb_secret_...) ou a service_role na Vercel.';
  if (/password/i.test(m) && /(weak|short|least)/i.test(m)) return 'A senha não atende às regras do Supabase (mínimo de caracteres).';
  return m.slice(0, 200) || 'Não foi possível concluir.';
}

function parse(req) {
  try { return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch (_) { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!isSupabaseConfigured() || !isSupabaseAuthConfigured()) {
    return res.status(503).json({ ok: false, error: 'Configure SUPABASE_URL, a chave secret e a publishable na Vercel para gerenciar acessos.' });
  }

  const body = req.method === 'GET' ? {} : parse(req);
  if (body === null) return res.status(400).json({ ok: false, error: 'Corpo da requisição inválido.' });

  // troca da própria senha: qualquer usuário logado
  if (req.method === 'PATCH' && body.action === 'self-password') {
    const session = getMonitorSession(req);
    if (!session) return res.status(401).json({ ok: false, error: 'Acesso não autorizado.' });
    const current = String(body.current || ''), next = String(body.password || '');
    if (next.length < 8) return res.status(400).json({ ok: false, error: 'A nova senha precisa ter pelo menos 8 caracteres.' });
    if (next === current) return res.status(400).json({ ok: false, error: 'A nova senha precisa ser diferente da atual.' });
    let signed;
    try { signed = await signInWithPassword(session.email, current); }
    catch (_) { return res.status(401).json({ ok: false, error: 'Senha atual incorreta.' }); }
    try {
      await adminUpdateUser(signed?.user?.id || session.uid, { password: next });
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Monitor IA self-password:', error);
      return res.status(502).json({ ok: false, error: friendly(error) });
    }
  }

  const session = await requireActiveAdmin(req, res);
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const users = await adminListUsers();
      return res.status(200).json({
        ok: true,
        me: session.email,
        users: users.map((u) => ({ ...u, fixedAdmin: isFixedAdmin(u.email), owner: u.email === ownerEmail(), role: isFixedAdmin(u.email) ? 'admin' : u.role }))
      });
    }

    if (req.method === 'POST') {
      const email = String(body.email || '').trim().toLowerCase();
      const role = body.role === 'admin' ? 'admin' : 'leitura';
      if (!EMAIL.test(email)) return res.status(400).json({ ok: false, error: 'Informe um e-mail válido.' });
      if (!allowedDomain(email)) return res.status(400).json({ ok: false, error: 'Este domínio de e-mail não é permitido.' });
      const password = tempPassword();
      const user = await adminCreateUser({ email, password, role });
      return res.status(201).json({ ok: true, user, password });
    }

    const id = String(body.id || '');
    if (!id) return res.status(400).json({ ok: false, error: 'Informe o acesso.' });
    const target = await adminGetUser(id);
    if (!target) return res.status(404).json({ ok: false, error: 'Acesso não encontrado.' });
    const protectedUser = target.email === ownerEmail() || target.email === session.email;

    if (req.method === 'PATCH') {
      if (body.action === 'reset') {
        const password = tempPassword();
        await adminUpdateUser(id, { password });
        return res.status(200).json({ ok: true, password, user: target });
      }
      if (body.action === 'block' || body.action === 'unblock') {
        if (protectedUser) return res.status(400).json({ ok: false, error: 'Você não pode bloquear o próprio acesso nem o do responsável.' });
        const user = await adminUpdateUser(id, { ban_duration: body.action === 'block' ? '876000h' : 'none' });
        forgetSessionStatus(id);
        return res.status(200).json({ ok: true, user });
      }
      if (body.action === 'role') {
        if (protectedUser || isFixedAdmin(target.email)) return res.status(400).json({ ok: false, error: 'O perfil deste acesso não pode ser alterado aqui.' });
        const user = await adminUpdateUser(id, { app_metadata: { monitor_role: body.role === 'admin' ? 'admin' : 'leitura' } });
        forgetSessionStatus(id);
        return res.status(200).json({ ok: true, user });
      }
      return res.status(400).json({ ok: false, error: 'Ação desconhecida.' });
    }

    if (req.method === 'DELETE') {
      if (protectedUser) return res.status(400).json({ ok: false, error: 'Você não pode remover o próprio acesso nem o do responsável.' });
      await adminDeleteUser(id);
      forgetSessionStatus(id);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  } catch (error) {
    console.error('Monitor IA /api/users:', error);
    return res.status(error?.status === 422 || error?.status === 400 ? 400 : 502).json({ ok: false, error: friendly(error) });
  }
}
