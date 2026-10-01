import { authenticate } from '../lib/orpen.js';

export default async function handler(req, res) {
  try {
    const session = await authenticate();
    return res.status(200).json({
      ok: true,
      stage: 'authenticate',
      userId: session.userId,
      userType: session.userType,
      hasPhpSession: Boolean(session.phpSessionId),
      hasSessionId: Boolean(session.sessionId)
    });
  } catch (error) {
    console.error('Monitor IA /api/test-auth:', error);
    return res.status(500).json({
      ok: false,
      stage: 'authenticate',
      error: error?.message || String(error),
      name: error?.name || 'Error'
    });
  }
}
