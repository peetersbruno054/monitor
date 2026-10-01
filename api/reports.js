import { generateReport, authenticate, orpenFetch } from '../lib/orpen.js';

const BOT_POINTS = Array.from({ length: 23 }, (_, i) => String(52 + i));
const SURVEY_BOTS = ['66666', '393939', '313131', '323232', '676767'];
const BASE = process.env.ORPEN_BASE_URL || 'https://safeweb.orpen.com.br/rcx';
const BUILD = '3.3.0';

function brDate(iso) {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
}

function payload(reportId, start, end) {
  const p = {
    reportTitle: reportId === 72
      ? 'R72_-_Chat_-_Pontos_de_Acesso'
      : 'R74_-_Chat_-_Pesquisa_de_satisfação',
    reportClass: 'ContactCenter',
    user_type: '1',
    user_id: '162',
    repetitionType: '1',
    repeatDay: '1',
    interval: '',
    repeatHour: '00:00',
    reportAlias: '',
    reportId: String(reportId),
    reportAction: 'now',
    enable_date_filter: '1',
    period: '',
    from_date: brDate(start),
    to_date: brDate(end),
    from_hour: '00:00',
    to_hour: '23:59',
    protocolDateFilterAt: 'create_date',
    protocolStatus: '0',
    attendance_type: '',
    date_grouping_option: 'by_date',
    group_by_queue: '1',
    include_available_agents: '1',
    show_service_level_for_abandons: '1',
    startLetter: '0',
    uci: '0',
    blacklist: '0',
    optIn: '0',
    optOut: '0',
    show_only_first_substatus: '1',
    lineDivision: '1',
    minTalkTime: '0',
    graphDivision: '1',
    abandonThreshold: '5',
    include_transfer_info: '0',
    email: process.env.ORPEN_REPORT_EMAIL || 'admti@safeweb.com.br',
    reportDestiny: reportId === 74 ? 'screen' : 'csv'
  };

  if (reportId === 72) p.bot_point = BOT_POINTS;
  if (reportId === 74) p.survey_bots = SURVEY_BOTS;
  return p;
}

function parseCsvLine(line) {
  const out = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      out.push(value);
      value = '';
    } else {
      value += char;
    }
  }

  out.push(value);
  return out;
}

function parseCsv(text) {
  const clean = String(text || '').replace(/^\uFEFF/, '');
  const lines = clean.split(/\r?\n/);
  const rows = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    rows.push(parseCsvLine(line));
  }

  return rows;
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((value) => value.trim());
  return rows.slice(1).map((row) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = String(row[index] ?? '').trim();
    });
    return item;
  });
}

function parseNumber(value) {
  const normalized = String(value ?? '').trim().replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function normalizeR72(csv) {
  const rows = parseCsv(csv);
  const data = rowsToObjects(rows);

  return data.map((row) => ({
    Data: row['Data'] || '',
    Protocolo: row['Protocolo'] || '',
    'Tipo de Entrada': row['Tipo de Entrada'] || '',
    Cliente: row['Cliente'] || '',
    Contato: row['Contato'] || '',
    'Pontos de Bot': row['Pontos de Bot'] || '',
    Agente: row['Agente'] || '',
    date: row['Data'] || '',
    protocol: row['Protocolo'] || '',
    inputType: row['Tipo de Entrada'] || '',
    client: row['Cliente'] || '',
    contact: row['Contato'] || '',
    botPoint: row['Pontos de Bot'] || '',
    agent: row['Agente'] || ''
  }));
}

function normalizeR74(csv) {
  const rows = parseCsv(csv);
  const data = [];
  let answersStarted = false;

  for (const row of rows) {
    if (!row.length || !row[0]) continue;

    const first = String(row[0]).trim();

    // O relatório começa com o título "Pesquisa de satisfação".
    // As respostas começam na linha de cabeçalho Data/Hora,...
    if (first === 'Data/Hora') {
      answersStarted = true;
      continue;
    }

    // Depois das respostas aparecem as seções de médias.
    if (first === 'Média de Agentes' || first === 'Satisfação Geral') {
      answersStarted = false;
      continue;
    }

    if (answersStarted && row.length >= 6) {
      data.push({
        date: row[0] || '',
        agent: row[1] || '',
        contact: row[2] || '',
        protocol: row[3] || '',
        question: row[4] || '',
        answer: row.slice(5).join(',').trim()
      });
    }
  }

  return data;
}

async function downloadCsv(path, session) {
  const url = new URL(path, BASE);

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    url.searchParams.set('_', Date.now());

    const response = await orpenFetch(url, session, {
      method: 'GET',
      headers: {
        accept: 'text/csv,text/plain,application/octet-stream,*/*'
      }
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    const text = buffer.toString('utf8').replace(/^\uFEFF/, '');

    if (response.ok && text.trim() && !/<html|<!doctype/i.test(text)) {
      return text;
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  throw new Error('O CSV gerado pelo Orpen não ficou disponível.');
}

function findPath(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    return /generatedReports\\/tmp\\/.*\\.(csv|pdf)/i.test(value) || /report_.*\\.(csv|pdf)/i.test(value) ? value : '';
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPath(item);
      if (found) return found;
    }
    return '';
  }
  if (typeof value === 'object') {
    for (const key of ['result', 'data', 'url', 'path', 'file', 'filename', 'href']) {
      const found = findPath(value[key]);
      if (found) return found;
    }
    for (const item of Object.values(value)) {
      const found = findPath(item);
      if (found) return found;
    }
  }
  return '';
}

function extractDirectRows(value) {
  if (!value || typeof value !== 'object') return null;
  for (const key of ['data', 'rows', 'result', 'aaData', 'items', 'records']) {
    const candidate = value[key];
    if (Array.isArray(candidate) && candidate.length) return candidate;
    if (candidate && typeof candidate === 'object') {
      const nested = extractDirectRows(candidate);
      if (nested) return nested;
    }
  }
  return null;
}

function normalizeDirect(reportId, rows) {
  if (!Array.isArray(rows)) return [];
  if (reportId === 72) {
    return rows.map((row) => {
      if (Array.isArray(row)) {
        return {
          Data: row[0] || '', Protocolo: row[1] || '', 'Tipo de Entrada': row[2] || '',
          Cliente: row[3] || '', Contato: row[4] || '', 'Pontos de Bot': row[5] || '', Agente: row[6] || '',
          date: row[0] || '', protocol: row[1] || '', inputType: row[2] || '', client: row[3] || '',
          contact: row[4] || '', botPoint: row[5] || '', agent: row[6] || ''
        };
      }
      return {
        Data: row?.Data || row?.date || '', Protocolo: row?.Protocolo || row?.protocol || '',
        'Tipo de Entrada': row?.['Tipo de Entrada'] || row?.inputType || '',
        Cliente: row?.Cliente || row?.client || '', Contato: row?.Contato || row?.contact || '',
        'Pontos de Bot': row?.['Pontos de Bot'] || row?.botPoint || '', Agente: row?.Agente || row?.agent || '',
        date: row?.Data || row?.date || '', protocol: row?.Protocolo || row?.protocol || '',
        inputType: row?.['Tipo de Entrada'] || row?.inputType || '', client: row?.Cliente || row?.client || '',
        contact: row?.Contato || row?.contact || '', botPoint: row?.['Pontos de Bot'] || row?.botPoint || '',
        agent: row?.Agente || row?.agent || ''
      };
    });
  }
  return rows.map((row) => Array.isArray(row)
    ? { date: row[0] || '', agent: row[1] || '', contact: row[2] || '', protocol: row[3] || '', question: row[4] || '', answer: row.slice(5).join(',').trim() }
    : {
        date: row?.['Data/Hora'] || row?.date || '', agent: row?.Agente || row?.agent || '',
        contact: row?.Contato || row?.contact || '', protocol: row?.Protocolo || row?.protocol || '',
        question: row?.Questão || row?.Pergunta || row?.question || '', answer: row?.Nota || row?.Resposta || row?.answer || ''
      });
}

async function loadReport(reportId, start, end, session) {
  const destinies = reportId === 74 ? ['screen', 'csv'] : ['csv', 'screen'];
  let lastError = null;

  for (const destiny of destinies) {
    try {
      const p = payload(reportId, start, end);
      p.reportDestiny = destiny;
      const raw = await generateReport(p, session, { destiny });

      let result = null;
      try { result = JSON.parse(String(raw).replace(/^\s+/, '')); } catch (_) {}

      const direct = result ? extractDirectRows(result) : null;
      if (direct) {
        const rows = normalizeDirect(reportId, direct);
        if (rows.length) return { path: '', rows, destiny };
      }

      const path = findPath(result || raw);
      if (path && /\\.csv$/i.test(path)) {
        const csv = await downloadCsv(path, session);
        const rows = reportId === 72 ? normalizeR72(csv) : normalizeR74(csv);
        if (rows.length) return { path, rows, destiny };
      }

      if (path && /\\.pdf$/i.test(path) && destiny === 'screen') {
        continue;
      }

      lastError = new Error(`O Orpen não retornou dados úteis no R${reportId} com destino ${destiny}.`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Não foi possível obter o R${reportId}.`);
}

export default async function handler(req, res) {
  res.setHeader('x-monitor-build', BUILD);

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      route: 'reports',
      build: BUILD,
      runtime: process.version
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  }

  try {
    const body = typeof req.body === 'string'
      ? JSON.parse(req.body || '{}')
      : (req.body || {});

    const { start, end } = body;

    if (!start || !end) {
      return res.status(400).json({
        ok: false,
        error: 'Informe start e end.'
      });
    }

    let session;

    try {
      session = await authenticate();
    } catch (error) {
      console.error('Monitor IA auth:', error);
      return res.status(502).json({
        ok: false,
        stage: 'authenticate',
        error: error?.message || String(error),
        name: error?.name || 'Error'
      });
    }

    let r72;

    try {
      r72 = await loadReport(72, start, end, session);
    } catch (error) {
      console.error('Monitor IA R72:', error);
      return res.status(502).json({
        ok: false,
        stage: 'r72',
        error: error?.message || String(error),
        name: error?.name || 'Error'
      });
    }

    let r74;

    try {
      r74 = await loadReport(74, start, end, session);
    } catch (error) {
      console.error('Monitor IA R74:', error);
      return res.status(502).json({
        ok: false,
        stage: 'r74',
        error: error?.message || String(error),
        name: error?.name || 'Error'
      });
    }

    return res.status(200).json({
      ok: true,
      version: BUILD,
      period: { start, end },
      auth: {
        authMethod: session.authMethod || 'unknown',
        userId: session.userId || null,
        userType: session.userType || null
      },
      r72: r72.rows,
      r74: r74.rows,
      meta: {
        r72Rows: r72.rows.length,
        r74Rows: r74.rows.length
      }
    });
  } catch (error) {
    console.error('Monitor IA /api/reports:', error);

    return res.status(500).json({
      ok: false,
      error: error?.message || 'Erro ao consultar o Orpen.',
      name: error?.name || 'Error'
    });
  }
}
