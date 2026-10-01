import { generateReport, authenticate, orpenFetch } from '../lib/orpen.js';

const BOT_POINTS = Array.from({ length: 23 }, (_, i) => String(52 + i));
const SURVEY_BOTS = ['66666', '393939', '313131', '323232', '676767'];
const BASE = process.env.ORPEN_BASE_URL || 'https://safeweb.orpen.com.br/rcx';

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
    reportDestiny: 'csv'
  };

  if (reportId === 72) p.bot_point = BOT_POINTS;
  if (reportId === 74) p.survey_bots = SURVEY_BOTS;
  return p;
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function normalizeHeader(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function detectDelimiter(text) {
  const sample = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .slice(0, 8);

  const candidates = [',', ';', '\t', '|'];
  let best = ',';
  let bestScore = -1;

  for (const delimiter of candidates) {
    let score = 0;

    for (const line of sample) {
      let quoted = false;
      let count = 0;

      for (let i = 0; i < line.length; i += 1) {
        const char = line[i];

        if (char === '"') {
          if (quoted && line[i + 1] === '"') {
            i += 1;
          } else {
            quoted = !quoted;
          }
        } else if (char === delimiter && !quoted) {
          count += 1;
        }
      }

      score += count;
    }

    if (score > bestScore) {
      bestScore = score;
      best = delimiter;
    }
  }

  return best;
}

function parseCsv(text) {
  const input = String(text || '').replace(/^\uFEFF/, '');
  if (!input.trim()) return [];

  const delimiter = detectDelimiter(input);
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === delimiter && !quoted) {
      row.push(value);
      value = '';
      continue;
    }

    if (char === '\n' && !quoted) {
      row.push(value);
      value = '';
      if (row.some((cell) => normalizeText(cell) !== '')) rows.push(row);
      row = [];
      continue;
    }

    if (char === '\r' && !quoted) {
      if (input[i + 1] === '\n') continue;
      row.push(value);
      value = '';
      if (row.some((cell) => normalizeText(cell) !== '')) rows.push(row);
      row = [];
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((cell) => normalizeText(cell) !== '')) rows.push(row);

  return rows;
}

function findHeaderRow(rows, aliases) {
  const wanted = aliases.map(normalizeHeader);

  for (let index = 0; index < rows.length; index += 1) {
    const normalized = rows[index].map(normalizeHeader);
    const matches = wanted.filter((alias) =>
      normalized.some((header) => header === alias || header.includes(alias) || alias.includes(header))
    ).length;

    if (matches >= 2) return index;
  }

  return 0;
}

function rowsToObjects(rows, headerIndex = 0) {
  if (!rows.length || !rows[headerIndex]) return [];

  const headers = rows[headerIndex].map((value, index) => {
    const header = normalizeText(value);
    return header || `c${index}`;
  });

  return rows.slice(headerIndex + 1).map((row) => {
    const item = {};

    headers.forEach((header, index) => {
      item[header] = normalizeText(row[index]);
    });

    return item;
  });
}

function findColumn(row, aliases) {
  const keys = Object.keys(row || {});
  const wanted = aliases.map(normalizeHeader);

  return keys.find((key) => {
    const normalized = normalizeHeader(key);
    return wanted.some((alias) =>
      normalized === alias || normalized.includes(alias) || alias.includes(normalized)
    );
  }) || '';
}

function parseNumber(value) {
  const normalized = String(value ?? '').trim().replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function normalizeR72(csv) {
  const rows = parseCsv(csv);
  if (!rows.length) return [];

  const headerIndex = findHeaderRow(rows, [
    'Data',
    'Protocolo',
    'Pontos de Bot',
    'Agente'
  ]);
  const data = rowsToObjects(rows, headerIndex);

  return data.map((row) => {
    const dateKey = findColumn(row, ['Data/Hora', 'Data Hora', 'Data']);
    const protocolKey = findColumn(row, ['Protocolo', 'Protocol']);
    const inputKey = findColumn(row, ['Tipo de Entrada', 'Input Type', 'Tipo Entrada']);
    const clientKey = findColumn(row, ['Cliente', 'Client']);
    const contactKey = findColumn(row, ['Contato', 'Telefone', 'Contact', 'Phone']);
    const botPointKey = findColumn(row, ['Pontos de Bot', 'Bot Point', 'Checkpoint', 'Ponto de Bot']);
    const agentKey = findColumn(row, ['Agente', 'Agent']);

    return {
      Data: row[dateKey] || '',
      Protocolo: row[protocolKey] || '',
      'Tipo de Entrada': row[inputKey] || '',
      Cliente: row[clientKey] || '',
      Contato: row[contactKey] || '',
      'Pontos de Bot': row[botPointKey] || '',
      Agente: row[agentKey] || '',
      date: row[dateKey] || '',
      protocol: row[protocolKey] || '',
      inputType: row[inputKey] || '',
      client: row[clientKey] || '',
      contact: row[contactKey] || '',
      botPoint: row[botPointKey] || '',
      agent: row[agentKey] || '',
      raw: row
    };
  }).filter((row) => row.protocol || row.botPoint || row.agent);
}

function normalizeR74(csv) {
  const rows = parseCsv(csv);
  if (!rows.length) return [];

  const headerIndex = findHeaderRow(rows, [
    'Data/Hora',
    'Agente',
    'Contato',
    'Protocolo',
    'Questão',
    'Nota'
  ]);
  const data = rowsToObjects(rows, headerIndex);

  return data
    .filter((row) => {
      const firstKey = Object.keys(row)[0] || '';
      const first = normalizeHeader(row[firstKey] || '');
      return first !== 'media de agentes' && first !== 'satisfacao geral';
    })
    .map((row) => {
      const dateKey = findColumn(row, ['Data/Hora', 'Data Hora', 'Data', 'Date']);
      const agentKey = findColumn(row, ['Agente', 'Agent']);
      const contactKey = findColumn(row, ['Contato', 'Telefone', 'Contact', 'Phone']);
      const protocolKey = findColumn(row, ['Protocolo', 'Protocol']);
      const questionKey = findColumn(row, ['Questão', 'Questao', 'Pergunta', 'Question']);
      const answerKey = findColumn(row, ['Nota', 'Resposta', 'Answer', 'Response']);

      const answer = row[answerKey] || '';

      return {
        date: row[dateKey] || '',
        agent: row[agentKey] || '',
        contact: row[contactKey] || '',
        protocol: row[protocolKey] || '',
        question: row[questionKey] || '',
        answer,
        note: parseNumber(answer),
        raw: row
      };
    })
    .filter((row) => row.protocol || row.question || row.answer);
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

async function loadReport(reportId, start, end, session) {
  const raw = await generateReport(payload(reportId, start, end), session);

  let result;
  try {
    result = JSON.parse(String(raw).replace(/^\s+/, ''));
  } catch (_) {
    throw new Error(`O Orpen não retornou JSON ao gerar o R${reportId}.`);
  }

  const path = result?.result;
  if (!path) {
    throw new Error(`O Orpen não retornou o arquivo do R${reportId}.`);
  }

  const csv = await downloadCsv(path, session);

  return {
    path,
    rows: reportId === 72 ? normalizeR72(csv) : normalizeR74(csv)
  };
}

export default async function handler(req, res) {
  res.setHeader('x-monitor-build', '3.3.0');

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      route: 'reports',
      build: '3.3.0',
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
      version: '3.3.0',
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
