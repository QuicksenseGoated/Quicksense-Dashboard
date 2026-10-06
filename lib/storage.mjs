import { createClient } from '@vercel/kv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { hasJsonBinCow, jsonBinGetRecord, jsonBinPutRecord } from './jsonbin.mjs';

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

export function storageMode() {
  if (hasKv()) return 'kv';
  if (hasJsonBinCow()) return 'jsonbin';
  return 'static';
}

function fileAbs(relativePath) {
  return path.join(process.cwd(), relativePath);
}

function isCowFile(relativePath) {
  return relativePath === 'data/cow-clips.json';
}

async function readStaticFile(relativePath) {
  try {
    const raw = await fs.readFile(fileAbs(relativePath), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function storageGet(key, relativePath) {
  const kv = getKv();
  if (kv) {
    const val = await kv.get(key);
    return val ?? null;
  }

  if (hasJsonBinCow() && isCowFile(relativePath)) {
    const record = await jsonBinGetRecord(process.env.JSONBIN_COW_BIN_ID);
    if (record && typeof record === 'object') return record;
  }

  return readStaticFile(relativePath);
}

export async function storageSet(key, relativePath, data) {
  const kv = getKv();
  if (kv) {
    await kv.set(key, data);
    return true;
  }

  if (hasJsonBinCow() && isCowFile(relativePath)) {
    const ok = await jsonBinPutRecord(process.env.JSONBIN_COW_BIN_ID, data);
    if (ok) return true;
    throw new Error('JSONBin save failed');
  }

  if (process.env.VERCEL) {
    throw new Error(
      'No shared storage configured. Add free JSONBin env vars or Redis — see docs/DEPLOY_VERCEL.md',
    );
  }

  const json = JSON.stringify(data, null, 2) + '\n';
  const abs = fileAbs(relativePath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, json);
  return true;
}
