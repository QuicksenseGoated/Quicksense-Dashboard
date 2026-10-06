const CLERK_API = 'https://api.clerk.com/v1';

export function clerkSecretKey() {
  return (
    process.env.CLERK_SECRET_KEY ||
    process.env.CLERK_SECRET ||
    ''
  ).trim();
}

export function bearerFromReq(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || '';
  const m = String(h).match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

/** @returns {Promise<{ userId: string } | null>} */
export async function verifySessionToken(token) {
  const secret = clerkSecretKey();
  if (!secret || !token) return null;

  try {
    const { verifyToken } = await import('@clerk/backend');
    const payload = await verifyToken(token, { secretKey: secret });
    const userId = payload.sub || payload.userId;
    if (!userId) return null;
    return { userId };
  } catch (e) {
    console.warn('Clerk token verify failed', e?.message || e);
    return null;
  }
}

export async function clerkPatchUser(userId, body) {
  const secret = clerkSecretKey();
  const r = await fetch(`${CLERK_API}/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg =
      data?.errors?.[0]?.long_message ||
      data?.errors?.[0]?.message ||
      data?.message ||
      `Clerk update failed (${r.status})`;
    const err = new Error(msg);
    err.status = r.status;
    err.clerk = data;
    throw err;
  }
  return data;
}
