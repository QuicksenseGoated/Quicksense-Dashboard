import { createClient } from '@vercel/kv';
import fs from 'node:fs/promises';
import path from 'node:path';

function redisRestCredentials() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.REDIS_URL;
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.REDIS_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

let _kv = null;
function getKv() {
  if (_kv) return _kv;
  const creds = redisRestCredentials();
  if (!creds) return null;
  _kv = createClient(creds);
  return _kv;
}

export function hasKv() {
  return Boolean(redisRestCredentials());
}

function fileAbs(relativePath) {
  return path.join(process.cwd(), relativePath);
}

export async function storageGet(key, relativePath) {
  const kv = getKv();
  if (kv) {
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
  const kv = getKv();
  if (kv) {
    await kv.set(key, data);
    return;
  }
  const abs = fileAbs(relativePath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, json);
}
