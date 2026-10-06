import { kv } from '@vercel/kv';
import fs from 'node:fs/promises';
import path from 'node:path';

export function hasKv() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function fileAbs(relativePath) {
  return path.join(process.cwd(), relativePath);
}

export async function storageGet(key, relativePath) {
  if (hasKv()) {
    const val = await kv.get(key);
    return val ?? null;
  }
  try {
    const raw = await fs.readFile(fileAbs(relativePath), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function storageSet(key, relativePath, data) {
  const json = JSON.stringify(data, null, 2) + '\n';
  if (hasKv()) {
    await kv.set(key, data);
    return;
  }
  const abs = fileAbs(relativePath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, json);
}
