const BASE = process.env.ORPEN_BASE_URL || 'https://safeweb.orpen.com.br/rcx';
const AJAX_URL = process.env.ORPEN_AJAX_URL || `${BASE}/ajax.php`;
const REPORT_URL = process.env.ORPEN_REPORT_URL || `${AJAX_URL}?action=generateReport`;

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável ${name} não configurada na Vercel.`);
  return value;
}

function parseSetCookie(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

function cookieValue(setCookies, name) {
  for (const item of setCookies) {
    const match = item.match(new RegExp(`(?:^|;)\\s*${name}=([^;]*)`));
    if (match) return match[1];
  }
  return '';
}

function buildCookieHeader(setCookies, values = {}) {
  const cookies = new Map();
  for (const item of setCookies) {
    const first = String(item).split(';', 1)[0];
    const index = first.indexOf('=');
    if (index > 0) cookies.set(first.slice(0, index), first.slice(index + 1));
  }
  for (const [name, value] of Object.entries(values)) {
    if (value) cookies.set(name, value);
  }
  return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

function deviceInfo() {
  return JSON.stringify({
    device_type: 'web',
    appCodeName: 'Mozilla',
    appName: 'Netscape',
    appVersion: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
    language: 'pt-BR',
    platform: 'Win32',
    plugins: [
      'PDF Viewer',
      'Chrome PDF Viewer',
      'Chromium PDF Viewer',
      'Microsoft Edge PDF Viewer',
      'WebKit built-in PDF'
    ],
    product: 'Gecko',
    productSub: '20030107',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
    userAgentData: {
      brands: [
        { brand: 'Chromium', version: '154' },
        { brand: 'Google Chrome', version: '154' },
        { brand: 'Not A(Brand', version: '99' }
      ],
      mobile: false,
      platform: 'Windows'
    },
    vendor: 'Google Inc.'
  });
}

export async function authenticate() {
  const username = required('ORPEN_USERNAME');
  const password = required('ORPEN_PASSWORD');
  const deviceUniqueId = required('ORPEN_DEVICE_UNIQUE_ID');

  const body = new URLSearchParams({
    username,
    password,
    device_type: 'web',
    device_info: deviceInfo(),
    device_unique_id: deviceUniqueId,
    action: 'login'
  }).toString();

  const response = await fetch(AJAX_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      accept: 'application/json, text/javascript, */*; q=0.01',
      'x-requested-with': 'XMLHttpRequest',
      origin: 'https://safeweb.orpen.com.br',
      referer: 'https://safeweb.orpen.com.br/rcx/login.php',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36'
    },
    body
  });

  const raw = await response.text();
  let data = null;
  try { data = JSON.parse(raw); } catch (_) {}

  if (!response.ok) {
    throw new Error(`Autenticação Orpen falhou (HTTP ${response.status}).`);
  }

  if (data?.return !== 'success') {
    const keys = data && typeof data === 'object' ? Object.keys(data).slice(0, 20).join(',') : '';
    const detail = [
      `HTTP ${response.status}`,
      data?.return ? `return=${data.return}` : '',
      data?.message ? `message=${String(data.message).slice(0, 180)}` : '',
      data?.error ? `error=${String(data.error).slice(0, 180)}` : '',
      data?.time_to_login ? `time_to_login=${String(data.time_to_login).slice(0, 40)}` : '',
      data?.userType ? `userType=${String(data.userType).slice(0, 40)}` : '',
      data?.userId ? `userId=${String(data.userId).slice(0, 40)}` : '',
      `hasSessionId=${Boolean(data?.sessionId)}`,
      keys ? `keys=${keys}` : '',
      !data && raw ? `raw=${raw.slice(0, 180).replace(/\\s+/g, ' ')}` : ''
    ].filter(Boolean).join(' | ');
    throw new Error(detail || 'Login Orpen recusado.');
  }

  const setCookies = parseSetCookie(response.headers);
  const phpSessionId = cookieValue(setCookies, 'PHPSESSID');
  const sessionId = data?.sessionId;

  if (!phpSessionId) {
    throw new Error('Login Orpen ocorreu, mas a resposta não trouxe PHPSESSID.');
  }
  if (!sessionId) {
    throw new Error('Login Orpen ocorreu, mas a resposta não trouxe sessionId.');
  }

  const cookie = buildCookieHeader(setCookies, {
    sessionid: sessionId,
    userMail: username
  });

  return {
    cookie,
    phpSessionId,
    sessionId,
    userId: data.userId,
    userType: data.userType
  };
}

export async function orpenFetch(url, session, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('cookie', session.cookie);
  headers.set('accept', headers.get('accept') || 'application/json, text/plain, */*');
  headers.set('x-requested-with', headers.get('x-requested-with') || 'XMLHttpRequest');

  return fetch(url, { ...options, headers });
}

export async function generateReport(payload, session = null) {
  const activeSession = session || await authenticate();
  const response = await orpenFetch(REPORT_URL, activeSession, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    body: new URLSearchParams(payload).toString()
  });

  const raw = await response.text();
  if (!response.ok) throw new Error(`Orpen generateReport respondeu HTTP ${response.status}.`);
  return raw;
}
