import { generateReport, authenticate, orpenFetch } from '../lib/orpen.js';

const BOT_POINTS = Array.from({ length: 23 }, (_, i) => String(52 + i));
const BASE = process.env.ORPEN_BASE_URL || 'https://safeweb.orpen.com.br/rcx';

function brDate(iso) {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
}

function payload(reportId, start, end, destiny) {
  const p = {
    reportTitle: reportId === 72 ? 'R72_-_Chat_-_Pontos_de_Acesso' : 'R74_-_Chat_-_Pesquisa_de_satisfação',
    reportClass: 'ContactCenter', user_type: '1', user_id: '162', repetitionType: '1', repeatDay: '1', interval: '',
    repeatHour: '00:00', reportAlias: '', reportId: String(reportId), reportAction: 'now', enable_date_filter: '1', period: '',
    from_date: brDate(start), to_date: brDate(end), from_hour: '00:00', to_hour: '23:59', protocolDateFilterAt: 'create_date',
    protocolStatus: '0', attendance_type: '', date_grouping_option: 'by_date', group_by_queue: '1', include_available_agents: '1',
    show_service_level_for_abandons: '1', startLetter: '0', uci: '0', blacklist: '0', optIn: '0', optOut: '0',
    show_only_first_substatus: '1', lineDivision: '1', minTalkTime: '0', graphDivision: '1', abandonThreshold: '5',
    include_transfer_info: '0', email: process.env.ORPEN_REPORT_EMAIL || 'admti@safeweb.com.br', reportDestiny: destiny
  };
  if (reportId === 72) p.bot_point = BOT_POINTS;
  if (reportId === 74) p.survey_bots = ['66666','393939','313131','323232','676767'];
  return p;
}

function deepFindPath(value) {
  const seen = new Set();
  function walk(x) {
    if (x == null) return '';
    if (typeof x === 'string') {
      if (/generatedReports\\/tmp\\/.*\\.csv/i.test(x) || /report_.*\\.csv/i.test(x)) return x;
      try { return walk(JSON.parse(x)); } catch (_) { return ''; }
    }
    if (typeof x !== 'object' || seen.has(x)) return '';
    seen.add(x);
    for (const key of ['path','url','file','filename','href','result','data']) {
      if (key in x) { const found = walk(x[key]); if (found) return found; }
    }
    for (const v of Object.values(x)) { const found = walk(v); if (found) return found; }
    return '';
  }
  return walk(value);
}

function extractDirect(raw) {
  try {
    const j = JSON.parse(raw);
    for (const c of [j?.data,j?.result,j?.rows,j?.aaData,j?.items,j?.records]) {
      if (Array.isArray(c)) return c;
      if (typeof c === 'string' && /protocolo|pontos de bot|nota|quest/i.test(c)) return c;
    }
    return j;
  } catch (_) { return raw; }
}

async function fetchGeneratedPath(path, session) {
  const url = new URL(path, BASE);
  for (let i = 0; i < 8; i++) {
    url.searchParams.set('_', Date.now());
    const r = await orpenFetch(url, session, {
      headers: { accept: 'text/plain,text/csv,application/json,*/*' }
    });
    const text = await r.text();
    const nested = deepFindPath(text);
    if (nested && nested !== path) return fetchGeneratedPath(nested, session);
    if (r.ok && text && !/^\\s*\\{\\s*"?success"?\\s*:/i.test(text) && !/<html|<!doctype/i.test(text)) return text;
    await new Promise(resolve => setTimeout(resolve, 1200));
  }
  throw new Error('O CSV do relatório não ficou disponível após as tentativas.');
}

async function load(reportId, start, end, destinies, session) {
  let last = '';
  for (const destiny of destinies) {
    const raw = await generateReport(payload(reportId,start,end,destiny), session);
    const path = deepFindPath(raw);
    if (path) {
      const csv = await fetchGeneratedPath(path, session);
      if (csv) return csv;
    }
    const direct = extractDirect(raw);
    if (direct && (Array.isArray(direct) || typeof direct === 'object' || /protocolo|pontos de bot|nota|quest/i.test(String(direct)))) return direct;
    last = raw;
  }
  return extractDirect(last);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Método não permitido.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { start, end } = body;
    if (!start || !end) return res.status(400).json({ ok:false, error:'Informe start e end.' });

    const session = await authenticate();

    const r72 = await load(72,start,end,['csv','screen'],session);
    const r74 = await load(74,start,end,['screen','csv'],session);

    res.status(200).json({
      ok:true,
      version:'3.0.0',
      period:{start,end},
      auth:{ userId:session.userId, userType:session.userType },
      r72,
      r74
    });
  } catch (error) {
    console.error('Monitor IA /api/reports:', error);
    if (!res.headersSent) res.status(500).json({ ok:false, error:error?.message || 'Erro ao consultar o Orpen.', name:error?.name || 'Error' });
  }
}
