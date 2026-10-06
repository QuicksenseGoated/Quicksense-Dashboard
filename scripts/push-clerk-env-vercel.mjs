#!/usr/bin/env node
/**
 * Push Clerk env vars from .env.local to linked Vercel project, then redeploy.
 *
 * Prerequisites:
 *   npm install
 *   npx vercel login
 *   npx vercel link    (pick Quicksense / quicksense-dashboard-6chi)
 *   .env.local with CLERK_SECRET_KEY + publishable keys
 *
 * Run: npm run setup:vercel-clerk
 */
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(name) {
  const file = path.join(ROOT, name);
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8', ...opts });
}

function vercelEnvAdd(name, value, target) {
  const input = spawnSync('npx', ['vercel', 'env', 'add', name, target, '--force'], {
    cwd: ROOT,
    input: value,
    encoding: 'utf8',
  });
  if (input.status !== 0) {
    const err = (input.stderr || input.stdout || '').trim();
    throw new Error(`vercel env add ${name} ${target} failed: ${err}`);
  }
}

const env = { ...loadEnvFile('.env'), ...loadEnvFile('.env.local') };
const publishable =
  env.CLERK_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  env.VITE_CLERK_PUBLISHABLE_KEY ||
  '';
const secret = env.CLERK_SECRET_KEY || '';

if (!secret || !publishable) {
  console.error(
    'Missing keys in .env.local. Need CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY (or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).',
  );
  process.exit(1);
}

try {
  run('npx vercel whoami');
} catch {
  console.error('Not logged in. Run: npx vercel login');
  process.exit(1);
}

if (!fs.existsSync(path.join(ROOT, '.vercel', 'project.json'))) {
  console.error('Project not linked. Run: npx vercel link');
  process.exit(1);
}

const targets = ['production', 'preview', 'development'];
const pairs = [
  ['CLERK_SECRET_KEY', secret],
  ['CLERK_PUBLISHABLE_KEY', publishable],
  ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', publishable],
];

console.log('Uploading Clerk env vars to Vercel…');
for (const [name, value] of pairs) {
  for (const target of targets) {
    vercelEnvAdd(name, value, target);
    console.log(`  ✓ ${name} (${target})`);
  }
}

console.log('\nRedeploying production…');
execSync('npx vercel --prod --yes', { cwd: ROOT, stdio: 'inherit' });
console.log('\nDone. Check /api/auth/config → configured: true');
