import { authenticate, orpenFetch } from '../lib/orpen.js';

const BASE = process.env.ORPEN_BASE_URL || 'https://safeweb.orpen.com.br/rcx';
const CONVERSATION_URL = `${BASE}/ContactCenter/ajax.php?getMessagesFromProtocol`;

function maskSensitive(value = '') {
  let out = String(value || '').replace(/\s+/g, ' ').trim();
  out = out.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '***.***.***-**');
  out = out.replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '**.***.***/****-**');
  out = out.replace(/(\+?55)?\s?\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4}/g, (telefone) => {
    const digits = String(telefone).replace(/\D/g, '');
    return digits.length >= 8 ? `+${digits.slice(0, 4)}****${digits.slice(-4)}` : telefone;
  });
  return out;
}

function extractMessageText(message = {}) {
  const candidates = [
    message.MESSAGE,
    message.MESSAGE_TEXT,
    message.TEXT,
    message.BODY,
    message.CONTENT,
    message.DESCRIPTION,
    message.message,
    message.text,
    message.body,
    message.content
  ];

  const found = candidates.find((value) => String(value || '').trim());
  const raw = String(found || '');

  // Reproduz a limpeza feita pela extensão: HTML não faz parte do texto da conversa.
  const withoutTags = raw
    .replace(/<script[\\s\\S]*?<\\/script>/gi, '')
    .replace(/<style[\\s\\S]*?<\\/style>/gi, '')
    .replace(/<img\\b[^>]*>/gi, '')
    .replace(/<br\\s*\\/?>(?=.)/gi, '\\n')
    .replace(/<[^>]+>/g, '');

  return maskSensitive(withoutTags.replace(/\\s+/g, ' ').trim());
}

function directionFromMessage(message = {}) {
  const sentBy = String(message.SENT_BY ?? message.sent_by ?? message.SENDER_TYPE ?? '');
  const type = String(message.TYPE ?? message.type ?? '').toLowerCase();
  const sender = String(
    message.SENDER_NAME ||
    message.SENDER ||
    message.sender ||
    message.AGENT_NAME ||
    ''
  ).toLowerCase();

  if (sentBy === '-1' || type.includes('client') || type.includes('in') || sender.includes('cliente')) {
    return 'in';
  }

  if (sentBy && sentBy !== '-1') return 'out';

  if (type.includes('out') || sender.includes('safira') || sender.includes('spc') || sender.includes('bot')) {
    return 'out';
  }

  return 'out';
}

function flattenMessages(data = []) {
  return (Array.isArray(data) ? data : [])
    .map((group) => {
      if (Array.isArray(group?.MESSAGES)) return group.MESSAGES;
      if (Array.isArray(group?.messages)) return group.messages;
      return [];
    })
    .flat()
    .filter(Boolean)
    .map((message) => {
      const text = extractMessageText(message);

      return {
        direction: directionFromMessage(message),
        sender: String(
          message.SENDER_NAME ||
          message.SENDER ||
          message.sender ||
          message.AGENT_NAME ||
          ''
        ).trim(),
        timestamp: String(
          message.CREATED_AT ||
          message.DATE ||
          message.MESSAGE_DATE ||
          message.SENT_AT ||
          message.created_at ||
          ''
        ).trim(),
        text: text.slice(0, 700),
        id: String(message.MESSAGE_ID || message.ID || message.id || '')
      };
    })
    .filter((message) =>
      message.text &&
      !/esperando por novas mensagens/i.test(message.sender)
    );
}

function parseBody(req) {
  if (req.method === 'GET') return req.query || {};

  if (typeof req.body === 'string') {
    return JSON.parse(req.body || '{}');
  }

  return req.body || {};
}

export default async function handler(req, res) {
  res.setHeader('x-monitor-build', '3.4.0');

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Método não permitido.'
    });
  }

  try {
    const body = parseBody(req);
    const protocol = String(body.protocol || body.protocol_id || '').trim();

    if (!protocol) {
      return res.status(400).json({
        ok: false,
        error: 'Informe protocol.'
      });
    }

    let session;

    try {
      session = await authenticate();
    } catch (error) {
      console.error('Monitor IA conversation auth:', error);
      return res.status(502).json({
        ok: false,
        stage: 'authenticate',
        error: error?.message || String(error),
        name: error?.name || 'Error'
      });
    }

    const form = new URLSearchParams();
    form.set('action', 'getMessagesFromProtocol');
    form.set('protocol_id', protocol);

    const response = await orpenFetch(CONVERSATION_URL, session, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      body: form.toString()
    });

    const raw = await response.text();

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        stage: 'conversation',
        protocol,
        status: response.status,
        error: `Orpen getMessagesFromProtocol respondeu HTTP ${response.status}.`,
        raw: raw.slice(0, 1000)
      });
    }

    let json;

    try {
      json = JSON.parse(raw);
    } catch (_) {
      return res.status(502).json({
        ok: false,
        stage: 'conversation',
        protocol,
        error: 'O Orpen não retornou JSON para getMessagesFromProtocol.',
        raw: raw.slice(0, 1000)
      });
    }

    const messages = flattenMessages(json?.data || []);

    return res.status(200).json({
      ok: true,
      build: '3.4.0',
      protocol,
      source: 'getMessagesFromProtocol',
      totalMessages: messages.length,
      clientMessages: messages.filter((message) => message.direction === 'in').length,
      botMessages: messages.filter((message) => message.direction === 'out').length,
      messages
    });
  } catch (error) {
    console.error('Monitor IA /api/conversation:', error);

    return res.status(500).json({
      ok: false,
      error: error?.message || 'Erro ao consultar a conversa.',
      name: error?.name || 'Error'
    });
  }
}
