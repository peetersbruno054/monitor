import * as orpen from '../lib/orpen.js';

export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    route: 'test-orpen-module',
    build: '3.0.4',
    runtime: process.version,
    exports: Object.keys(orpen)
  });
}
