import { authenticate } from '../lib/orpen.js';

export default async function handler(req, res) {
  try {
    const session = await authenticate();
    return res.status(200).json({
      ok: true,
      route: 'test-auth',
      build: '3.0.5',
      userId: session.userId,
      userType: session.userType,
      hasPhpSession: Boolean(session.phpSessionId),
      hasSessionId: Boolean(session.sessionId),
      cookieNames: session.cookie ? session.cookie.split(';').map(x => x.trim().split('=')[0]).filter(Boolean) : []
    });
  } catch (error) {
    console.error('Monitor IA auth diagnostic:', error);
    return res.status(502).json({
      ok: false,
      route: 'test-auth',
      build: '3.0.5',
      stage: 'authenticate',
      error: error?.message || String(error),
      name: error?.name || 'Error'
    });
  }
}
