// Configurações do Monitor guardadas no Supabase (tabela monitor_settings).
//  GET  → metas por IA e dados da economia (qualquer pessoa logada) + situação das coletas (só administradores)
//  PUT  → salva as metas e/ou a economia (só administradores)
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

// Economia: tempo médio de um atendimento humano (minutos) e custo da hora do analista (R$, opcional)
function cleanEconomia(input) {
  if (!input || typeof input !== 'object') return {};
  const out = {};
  const num = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')));
  const min = num(input.minutos);
  if (min != null) {
    if (!Number.isFinite(min) || min <= 0 || min > 480) throw Object.assign(new Error('Tempo médio inválido: use de 1 a 480 minutos.'), { status: 400 });
    out.minutos = Math.round(min * 10) / 10;
  }
  const cost = num(input.custoHora);
  if (cost != null) {
    if (!Number.isFinite(cost) || cost < 0 || cost > 10000) throw Object.assign(new Error('Custo por hora inválido.'), { status: 400 });
    out.custoHora = Math.round(cost * 100) / 100;
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const session = await requireActiveSession(req, res);
    if (!session) return;
    const out = { ok: true, admin: Boolean(session.admin), ias: IAS, metas: {}, economia: {}, configured: isSupabaseConfigured() };
    if (isSupabaseConfigured()) {
      try {
        const row = await getSetting('metas');
        out.metas = row?.value || {};
        if (row) out.metasUpdatedAt = row.updated_at;
        const eco = await getSetting('economia');
        out.economia = eco?.value || {};
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
      const out = { ok: true };
      // cada parte é opcional: salva só o que veio no pedido
      if (body.metas !== undefined) { out.metas = cleanMetas(body.metas); await setSetting('metas', out.metas, session.email); }
      if (body.economia !== undefined) { out.economia = cleanEconomia(body.economia); await setSetting('economia', out.economia, session.email); }
      return res.status(200).json(out);
    } catch (error) {
      if (error.status === 400) return res.status(400).json({ ok: false, error: error.message });
      if (tableMissing(error)) return res.status(409).json({ ok: false, error: MISSING_TABLE });
      console.error('Monitor IA salvar metas:', error.message);
      return res.status(500).json({ ok: false, error: 'Não foi possível salvar.' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Método não permitido.' });
}
