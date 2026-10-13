// Configurações do Monitor guardadas no Supabase (tabela monitor_settings).
//  GET  → metas por IA (qualquer pessoa logada) + situação das coletas (só administradores)
//  PUT  → salva as metas (só administradores)
import { requireActiveSession, requireActiveAdmin } from '../lib/auth.js';
import { isSupabaseConfigured, getSetting, setSetting } from '../lib/supabase.js';
import { collectionHealth } from '../lib/alerts.js';

const IAS = ['Assistente Safira', 'IA SPC', 'SPC AGE', 'SPC ACI'];
const FIELDS = { resolvido: [0, 100], transferido: [0, 100], nao: [0, 100], nota: [1, 5] };
const MISSING_TABLE = 'A tabela de metas ainda não existe no Supabase. Rode o arquivo supabase/metas.sql no SQL Editor do Supabase e tente de novo.';

function tableMissing(error) {
  return /monitor_settings|PGRST205|42P01|HTTP 404/i.test(String(error?.message || error));
}

// Aceita só as 4 IAs e números dentro da faixa; campo vazio = sem meta
function cleanMetas(input) {
  const out = {};
  for (const ia of IAS) {
    const src = input && typeof input === 'object' ? input[ia] : null;
    if (!src || typeof src !== 'object') continue;
    const goal = {};
    for (const [field, [min, max]] of Object.entries(FIELDS)) {
      const raw = src[field];
      if (raw === '' || raw == null) continue;
      const n = Number(String(raw).replace(',', '.'));
      if (!Number.isFinite(n) || n < min || n > max) {
        throw Object.assign(new Error(`Meta inválida para ${ia} (${field}).`), { status: 400 });
      }
      goal[field] = Math.round(n * 100) / 100;
    }
    if (Object.keys(goal).length) out[ia] = goal;
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const session = await requireActiveSession(req, res);
    if (!session) return;
    const out = { ok: true, admin: Boolean(session.admin), ias: IAS, metas: {}, configured: isSupabaseConfigured() };
    if (isSupabaseConfigured()) {
      try {
        const row = await getSetting('metas');
        out.metas = row?.value || {};
        if (row) out.metasUpdatedAt = row.updated_at;
      } catch (error) {
        if (tableMissing(error)) out.setupNeeded = MISSING_TABLE;
        else console.error('Monitor IA metas:', error.message);
      }
      if (session.admin) {
        try { out.health = await collectionHealth(); } catch (_) { /* sem informação de saúde */ }
      }
    }
    return res.status(200).json(out);
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    const session = await requireActiveAdmin(req, res);
    if (!session) return;
    if (!isSupabaseConfigured()) {
      return res.status(400).json({ ok: false, error: 'Supabase não configurado no servidor.' });
    }
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch (_) {
      return res.status(400).json({ ok: false, error: 'Dados inválidos.' });
    }
    try {
      const metas = cleanMetas(body.metas);
      await setSetting('metas', metas, session.email);
      return res.status(200).json({ ok: true, metas });
    } catch (error) {
      if (error.status === 400) return res.status(400).json({ ok: false, error: error.message });
      if (tableMissing(error)) return res.status(409).json({ ok: false, error: MISSING_TABLE });
      console.error('Monitor IA salvar metas:', error.message);
      return res.status(500).json({ ok: false, error: 'Não foi possível salvar as metas.' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Método não permitido.' });
}
