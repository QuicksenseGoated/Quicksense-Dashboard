import { storageGet, storageSet } from '../../lib/storage.mjs';

const KV_KEY = 'ndz:dashboard';
const FILE = 'data/dashboard-state.json';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    const data = await storageGet(KV_KEY, FILE);
    if (!data) return res.status(200).json({});
    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Expected JSON object' });
    }
    await storageSet(KV_KEY, FILE, req.body);
    return res.status(200).json({ ok: true, updatedAt: new Date().toISOString() });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
