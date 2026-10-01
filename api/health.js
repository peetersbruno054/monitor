export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: 'monitor-ia-safeweb',
    version: '3.0.1',
    runtime: process.version,
    configured: Boolean(process.env.ORPEN_USERNAME && process.env.ORPEN_PASSWORD)
  });
}
