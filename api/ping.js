export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    route: 'ping',
    build: '3.0.3',
    runtime: process.version
  });
}
