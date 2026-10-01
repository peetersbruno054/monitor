const BASE = process.env.ORPEN_BASE_URL || 'https://safeweb.orpen.com.br/rcx';
const REPORT_URL = process.env.ORPEN_REPORT_URL || `${BASE}/ajax.php?action=generateReport`;

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável ${name} não configurada na Vercel.`);
  return value;
}

export async function authenticate() {
  const authUrl = required('ORPEN_AUTH_URL');
  const username = required('ORPEN_USERNAME');
  const password = required('ORPEN_PASSWORD');
  const body = new URLSearchParams({ username, password }).toString();
  const response = await fetch(authUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'accept': 'application/json' },
    body
  });
  const raw = await response.text();
  let data = null;
  try { data = JSON.parse(raw); } catch (_) {}
  if (!response.ok) throw new Error(`Autenticação Orpen falhou (HTTP ${response.status}).`);
  const token = data?.access_token || data?.token || data?.data?.access_token || data?.data?.token;
  if (!token) throw new Error('A autenticação respondeu sem token. Consulte a documentação da Autenticação Orpen API.');
  return token;
}

export async function generateReport(payload) {
  const token = await authenticate();
  const response = await fetch(REPORT_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'accept': 'application/json, text/plain, */*',
      'authorization': `Bearer ${token}`,
      'x-requested-with': 'XMLHttpRequest'
    },
    body: new URLSearchParams(payload).toString()
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Orpen generateReport respondeu HTTP ${response.status}.`);
  return raw;
}
