import {
  bearerFromReq,
  clerkPatchUser,
  clerkSecretKey,
  verifySessionToken,
} from '../../lib/clerk-auth.mjs';

const SYNONYM_RE = /^[a-zA-Z0-9._-]{2,32}$/;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!clerkSecretKey()) {
    return res.status(503).json({
      error: 'Server auth not configured',
      hint: 'Set CLERK_SECRET_KEY on Vercel (or in .env.local for npm run dev).',
    });
  }

  const token = bearerFromReq(req);
  const session = await verifySessionToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Sign in again and retry.' });
  }

  const synonym = String(req.body?.synonym || req.body?.username || '')
    .trim()
    .replace(/^@+/, '');

  if (!SYNONYM_RE.test(synonym)) {
    return res.status(400).json({
      error: 'Use 2–32 characters: letters, numbers, . _ - (no email).',
    });
  }

  try {
    const user = await clerkPatchUser(session.userId, { username: synonym });
    return res.status(200).json({
      ok: true,
      username: user.username || synonym,
      display: user.username ? `@${user.username}` : `@${synonym}`,
    });
  } catch (e) {
    const msg = e.message || 'Could not save synonym';
    const taken = /taken|already|duplicate|unique/i.test(msg);
    return res.status(e.status && e.status >= 400 ? e.status : 422).json({
      error: taken ? 'That name is taken. Try another.' : msg,
    });
  }
}
