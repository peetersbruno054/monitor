export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: 'monitor-ia-safeweb',
    version: '3.0.0',
    configured: Boolean(process.env.ORPEN_AUTH_URL && process.env.ORPEN_USERNAME && process.env.ORPEN_PASSWORD)
  });
}
