import { hasKv } from '../lib/storage.mjs';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    backend: 'vercel',
    storage: hasKv() ? 'kv' : 'file',
    ts: Date.now(),
  });
}
