import { generateReport, authenticate, orpenFetch } from '../lib/orpen.js';
import { requireActiveSession } from '../lib/auth.js';
import { isSupabaseConfigured, saveReportSnapshot, saveSyncRun, getLatestReportSnapshot } from '../lib/supabase.js';
import { noteCollectionFailure, noteSupabaseFailure, noteSupabaseSuccess } from '../lib/alerts.js';

const BOT_POINTS = Array.from({ length: 23 }, (_, i) => String(52 + i));
const SURVEY_BOTS = ['66666', '393939', '313131', '323232', '676767'];
const BASE = process.env.ORPEN_BASE_URL || 'https://safeweb.orpen.com.br/rcx';

function brDate(iso) {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
}

function saoPauloDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function previousDate(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  if (!y || !m || !d) return '';
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function isClosedRange(end) {
  const yesterday = previousDate(saoPauloDate());
  return Boolean(end && yesterday && end < yesterday);
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

function classifyR72Point(value) {
  const point = normalizeHeader(value);

  if (point.includes('problema nao resolvido')) return 'nao';
  if (point.includes('falha de conhecimento')) return 'outro';
  if (point.includes('problema resolvido')) return 'resolvido';
  if (point.includes('finaliza safenota')) return 'outro';
  if (
    point.includes('transferencia fila') ||
    point.includes('transfere ac') ||
    point.includes('transferencia ac') ||
    point.includes('transfere documental') ||
    point.includes('transferencia documental') ||
    point.includes('transferencial comercial') ||
    point.includes('transferencia comercial') ||
    point.includes('transfere comercial')
  ) return 'transferido';
  if (point.includes('nao retomou') || point.includes('nao retornou')) return 'outro';
  if (
    point.includes('atendimento retomado') ||
    point.includes('retomada apos inatividade') ||
    point.includes('retomado') ||
    point.includes('retomou atendimento')
  ) return 'retomado';
  if (point.includes('inatividade')) return 'inatividade';
  if (point.includes('pesquisa encaminhada')) return 'possivel';
  return 'outro';
}

/* Canal de entrada (Webchat / WhatsApp): coluna "Tipo de Entrada" do R72.
   Prefere o cabeçalho exato; se o valor não parecer um canal (linha com colunas deslocadas),
   procura na própria linha uma célula que seja exatamente um nome de canal. */
const SCAN_CELL = /^(web\s*chat|whats\s*app|wpp)$/i;
const CHANNEL_CELL = /^(web\s*chat|chat|whats\s*app|wpp|telegram|instagram|facebook|e-?mail)$/i;
function findInputColumn(row) {
  const keys = Object.keys(row || {});
  const exact = keys.find((k) => ['tipo de entrada', 'tipo entrada', 'input type'].includes(normalizeHeader(k)));
  return exact || findColumn(row, ['Tipo de Entrada', 'Input Type', 'Tipo Entrada']);
}
function inputValue(row, key) {
  const v = normalizeText(row[key]);
  if (CHANNEL_CELL.test(v)) return v;
  for (const k of Object.keys(row || {})) {
    const c = normalizeText(row[k]);
    if (SCAN_CELL.test(c)) return c;
  }
  return v;
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
    const inputKey = findInputColumn(row);
    const clientKey = findColumn(row, ['Cliente', 'Client']);
    const contactKey = findColumn(row, ['Contato', 'Telefone', 'Contact', 'Phone']);
    const botPointKey = findColumn(row, ['Pontos de Bot', 'Bot Point', 'Checkpoint', 'Ponto de Bot']);
    const agentKey = findColumn(row, ['Agente', 'Agent']);

    return {
      Data: row[dateKey] || '',
      Protocolo: row[protocolKey] || '',
      'Tipo de Entrada': inputValue(row, inputKey),
      Cliente: row[clientKey] || '',
      Contato: row[contactKey] || '',
      'Pontos de Bot': row[botPointKey] || '',
      Agente: row[agentKey] || '',
      date: row[dateKey] || '',
      protocol: row[protocolKey] || '',
      inputType: inputValue(row, inputKey),
      client: row[clientKey] || '',
      contact: row[contactKey] || '',
      botPoint: row[botPointKey] || '',
      agent: row[agentKey] || '',
      outcome: classifyR72Point(row[botPointKey] || ''),
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

  if (!rows[headerIndex]) return [];

  const headers = rows[headerIndex].map((value, index) => {
    const header = normalizeText(value);
    return header || `c${index}`;
  });

  const data = [];

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    const first = normalizeHeader(row?.[0] || '');

    if (first === 'media de agentes' || first === 'satisfacao geral') {
      break;
    }

    if (!row?.length) continue;

    const object = {};
    headers.forEach((header, columnIndex) => {
      object[header] = normalizeText(row[columnIndex]);
    });

    const dateKey = findColumn(object, ['Data/Hora', 'Data Hora', 'Data', 'Date']);
    const agentKey = findColumn(object, ['Agente', 'Agent']);
    const contactKey = findColumn(object, ['Contato', 'Telefone', 'Contact', 'Phone']);
    const protocolKey = findColumn(object, ['Protocolo', 'Protocol']);
    const questionKey = findColumn(object, ['Questão', 'Questao', 'Pergunta', 'Question']);
    const answerKey = findColumn(object, ['Nota', 'Resposta', 'Answer', 'Response']);

    const answer = object[answerKey] || '';

    if (!(object[protocolKey] || object[questionKey] || answer)) continue;

    data.push({
      date: object[dateKey] || '',
      agent: object[agentKey] || '',
      contact: object[contactKey] || '',
      protocol: object[protocolKey] || '',
      question: object[questionKey] || '',
      answer,
      note: parseNumber(answer),
      raw: object
    });
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

/* ---------- Linhas enxutas ----------
   O painel só usa estas colunas. Guardar e enviar só elas deixa a resposta e o Supabase
   bem menores (antes cada linha ia em dobro, com nomes em português e inglês, e mais a linha original). */
function pick(row, keys) {
  for (const k of keys) if (row && row[k] != null && row[k] !== '') return String(row[k]);
  return '';
}
function isSummaryRow(r) {
  return Object.values(r || {}).some((v) => typeof v === 'string' && /^(qtde|quantidade)$/i.test(v.trim()));
}
function compactR72(rows) {
  const list = [];
  // o CSV do R72 termina com um quadro-resumo ("Qtde"); ele não é protocolo e fica de fora
  for (const r of rows || []) { if (isSummaryRow(r)) break; list.push(r); }
  return list.map((r) => ({
    Data: pick(r, ['Data', 'date']),
    Protocolo: pick(r, ['Protocolo', 'protocol']),
    Contato: pick(r, ['Contato', 'contact']),
    'Tipo de Entrada': pick(r, ['Tipo de Entrada', 'inputType']),
    Ent: 2,
    'Pontos de Bot': pick(r, ['Pontos de Bot', 'botPoint']),
    Agente: pick(r, ['Agente', 'agent'])
  }));
}
function compactR74(rows) {
  return (rows || []).map((r) => ({
    date: pick(r, ['date']),
    agent: pick(r, ['agent']),
    contact: pick(r, ['contact']),
    protocol: pick(r, ['protocol']),
    question: pick(r, ['question']),
    answer: pick(r, ['answer'])
  }));
}

/* ---------- Sessão do Orpen reaproveitada ----------
   Um login serve para várias consultas seguidas (ex.: carregar um mês dia a dia).
   Se o Orpen recusar a sessão, faz um login novo e tenta mais uma vez. */
const SESSION_TTL_MS = 4 * 60 * 1000;
let orpenSession = null;
function getOrpenSession(fresh = false) {
  if (!fresh && orpenSession && Date.now() - orpenSession.t < SESSION_TTL_MS) return orpenSession.p;
  const p = authenticate();
  orpenSession = { p, t: Date.now() };
  p.catch(() => { if (orpenSession && orpenSession.p === p) orpenSession = null; });
  return p;
}

/* ---------- Cache no Supabase e uma consulta por vez ----------
   • Hoje: se o mesmo dia foi consultado há menos de 3 minutos, todos recebem essa cópia (ontem: 10 minutos).
   • Períodos fechados: a cópia só vale se foi feita depois que o período fechou de vez
     (fim do dia seguinte, por causa da regra de retorno em 24h). Antes disso, consulta de novo uma vez.
   • Consultas iguais ao mesmo tempo viram uma só (por instância da função). */
const OPEN_TTL_MS = 3 * 60 * 1000;        // hoje
const YESTERDAY_TTL_MS = 10 * 60 * 1000;  // ontem (muda pouco; ainda não está fechado por causa das 24h)
const inflight = new Map();

function finalAfter(end) {
  const [y, m, d] = String(end).split('-').map(Number);
  return Date.UTC(y, m - 1, d + 2, 3, 0, 0); // 00:00 de Brasília, dois dias depois
}

async function cachedSnapshots(start, requestedEnd, { anyAge = false } = {}) {
  if (!isSupabaseConfigured()) return null;
  const [a, b] = await Promise.all([
    getLatestReportSnapshot({ reportId: 72, start, end: requestedEnd }),
    getLatestReportSnapshot({ reportId: 74, start, end: requestedEnd })
  ]);
  if (!Array.isArray(a?.rows) || !Array.isArray(b?.rows)) return null;
  // snapshots salvos antes da leitura do canal de entrada (marca "Ent" = 2) são coletados de novo, uma vez
  if (!anyAge && a.rows.length && !a.rows.some((r) => r && r.Ent === 2)) return null;
  const t = Math.min(Date.parse(a.collected_at), Date.parse(b.collected_at));
  const ttl = requestedEnd >= saoPauloDate() ? OPEN_TTL_MS : YESTERDAY_TTL_MS;
  const fresh = anyAge || (isClosedRange(requestedEnd) ? t >= finalAfter(requestedEnd) : Date.now() - t < ttl);
  if (!fresh) return null;
  return { r72: { rows: compactR72(a.rows) }, r74: { rows: compactR74(b.rows) }, source: 'supabase', collectedAt: new Date(t).toISOString() };
}

async function collectFromOrpen(start, end, requestedEnd) {
  // outra instância pode ter acabado de guardar o mesmo período
  const again = await cachedSnapshots(start, requestedEnd).catch(() => null);
  if (again) return again;

  const stage = (name, fn) => fn().catch((error) => { error.stage = error.stage || name; throw error; });
  const reused = Boolean(orpenSession && Date.now() - orpenSession.t < SESSION_TTL_MS);
  let session = await stage('authenticate', () => getOrpenSession());
  let r72;
  try {
    r72 = await loadReport(72, start, end, session);
  } catch (error) {
    if (!reused) { error.stage = 'r72'; throw error; }
    // sessão reaproveitada pode ter expirado no Orpen: login novo e mais uma tentativa
    session = await stage('authenticate', () => getOrpenSession(true));
    r72 = await stage('r72', () => loadReport(72, start, end, session));
  }
  const r74 = await stage('r74', () => loadReport(74, start, end, session));
  r72.rows = compactR72(r72.rows);
  r74.rows = compactR74(r74.rows);
  const out = { r72, r74, session, source: 'orpen', saved: false, collectedAt: new Date().toISOString() };

  if (isSupabaseConfigured()) {
    try {
      await Promise.all([
        saveReportSnapshot({ reportId: 72, start, end: requestedEnd, rows: r72.rows }),
        saveReportSnapshot({ reportId: 74, start, end: requestedEnd, rows: r74.rows })
      ]);
      out.saved = true;
      noteSupabaseSuccess();
      await saveSyncRun({ success: true, start, end: requestedEnd, r72Rows: r72.rows.length, r74Rows: r74.rows.length });
    } catch (error) {
      console.error('Monitor IA Supabase:', error);
      out.saveError = 'Falha ao salvar no Supabase.';
      noteSupabaseFailure(error);
    }
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('x-monitor-build', '3.5.0');

  if (!(await requireActiveSession(req, res))) return;

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      route: 'reports',
      build: '3.5.0',
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
    const requestedEnd = String(body.__monitorOriginalEnd || end || '').trim();

    if (!start || !end || !requestedEnd) {
      return res.status(400).json({
        ok: false,
        error: 'Informe start e end.'
      });
    }

    let result;
    let warning;
    try {
      result = await cachedSnapshots(start, requestedEnd);
    } catch (error) {
      console.error('Monitor IA Supabase read:', error);
    }

    if (!result) {
      // uma consulta por período: quem clicar enquanto ela roda espera pelo mesmo resultado
      const key = `${start}|${end}|${requestedEnd}`;
      if (!inflight.has(key)) {
        inflight.set(key, collectFromOrpen(start, end, requestedEnd).finally(() => inflight.delete(key)));
      }
      try {
        result = await inflight.get(key);
      } catch (error) {
        console.error('Monitor IA Orpen:', error);
        // registra a falha; depois de 3 seguidas, avisa por e-mail (se configurado)
        await noteCollectionFailure({ start, end: requestedEnd, stage: error?.stage || 'orpen', error }).catch(() => {});
        // Orpen indisponível: mostra a última cópia guardada desse período, se houver
        const stale = await cachedSnapshots(start, requestedEnd, { anyAge: true }).catch(() => null);
        if (!stale) {
          return res.status(502).json({
            ok: false,
            stage: error?.stage || 'orpen',
            error: error?.message || String(error),
            name: error?.name || 'Error'
          });
        }
        result = stale;
        warning = 'Não foi possível consultar o Orpen agora. Mostrando os dados guardados às ' +
          new Date(stale.collectedAt).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }) + '.';
      }
    }

    const session = result.session || null;
    const r72 = result.r72;
    const r74 = result.r74;
    const supabase = {
      configured: isSupabaseConfigured(),
      saved: Boolean(result.saved),
      source: result.source,
      collectedAt: result.collectedAt || null
    };
    if (result.saveError) supabase.error = result.saveError;

    return res.status(200).json({
      ok: true,
      version: '3.5.0',
      period: { start, end: requestedEnd },
      warning,
      auth: {
        authMethod: session ? (session.authMethod || 'unknown') : 'cache',
        userId: session?.userId || null,
        userType: session?.userType || null
      },
      r72: r72.rows,
      r74: r74.rows,
      meta: {
        r72Rows: r72.rows.length,
        r74Rows: r74.rows.length,
        supabase
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
