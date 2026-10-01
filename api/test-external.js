import { authenticate, orpenFetch } from '../lib/orpen.js';

export default async function handler(req, res) {
  try {
    const session = await authenticate();
    const base = process.env.ORPEN_BASE_URL || 'https://safeweb.orpen.com.br/rcx';
    const target = `${base}/ContactCenter/monitoring.php`;
    const response = await orpenFetch(target, session, {
      method: 'GET',
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    const raw = await response.text();
    return res.status(200).json({
      ok: true,
      route: 'test-external',
      build: '3.1.1',
      authMethod: session.authMethod,
      hasPhpSession: Boolean(session.phpSessionId),
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      finalUrl: response.url,
      bodyLength: raw.length,
      bodyStart: raw.slice(0, 500).replace(/\s+/g, ' ').trim()
    });
  } catch (error) {
    console.error('Monitor IA external diagnostic:', error);
    return res.status(502).json({
      ok: false,
      route: 'test-external',
      build: '3.1.1',
      error: error?.message || String(error),
      name: error?.name || 'Error'
    });
  }
}
