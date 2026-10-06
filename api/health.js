import { storageMode } from '../lib/storage.mjs';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    backend: 'vercel',
    storage: storageMode(),
    ts: Date.now(),
  });
}
