const JSONBIN_URL = 'https://api.jsonbin.io/v3/b';

const DEFAULT_COW_BIN_ID = '6a5d13b1f5f4af5e29a49985';

export function cowBinId() {
  return process.env.JSONBIN_COW_BIN_ID || DEFAULT_COW_BIN_ID;
}

export function hasJsonBinCow() {
  return Boolean(cowBinId() && jsonBinApiKey());
}

function jsonBinApiKey() {
  return (
    process.env.JSONBIN_API_KEY ||
    process.env.JSONBIN_MASTER_KEY ||
    process.env.JSONBIN_ACCESS_KEY ||
    ''
  );
}

function authHeaders() {
  const key = jsonBinApiKey();
  const h = { 'Content-Type': 'application/json' };
  if (process.env.JSONBIN_ACCESS_KEY) h['X-Access-Key'] = key;
  else h['X-Master-Key'] = key;
  return h;
}

export async function jsonBinGetRecord(binId) {
  const res = await fetch(`${JSONBIN_URL}/${binId}/latest`, {
    headers: authHeaders(),
  });
  if (!res.ok) return null;
  const j = await res.json();
  return j.record ?? null;
}

export async function jsonBinPutRecord(binId, record) {
  const res = await fetch(`${JSONBIN_URL}/${binId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(record),
  });
  return res.ok;
}
