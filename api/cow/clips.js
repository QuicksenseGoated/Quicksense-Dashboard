import { storageGet, storageSet } from '../../lib/storage.mjs';
import { mergeCowClips, emptyCowFile } from '../../lib/cow.mjs';

const KV_KEY = 'cow:clips';
const FILE = 'data/cow-clips.json';

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
    const data = (await storageGet(KV_KEY, FILE)) || emptyCowFile();
    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    try {
      const incoming = Array.isArray(req.body?.clips) ? req.body.clips : [];
      const current = (await storageGet(KV_KEY, FILE)) || emptyCowFile();
      const clips = mergeCowClips(current.clips, incoming);
      const payload = {
        v: 1,
        updatedAt: new Date().toISOString(),
        clips,
      };
      await storageSet(KV_KEY, FILE, payload);
      return res.status(200).json(payload);
    } catch (e) {
      return res.status(503).json({
        error: e.message || 'Shared storage not configured',
        hint: 'Set JSONBIN_COW_BIN_ID + JSONBIN_API_KEY on Vercel (free) or connect Redis',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
