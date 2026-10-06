#!/usr/bin/env node
/**
 * Quick sanity checks before git push / Vercel deploy.
 * Run: npm run check
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;

function fail(msg) {
  console.error('✗', msg);
  failed = true;
}

function ok(msg) {
  console.log('✓', msg);
}

const jsFiles = [
  'js/clerk-auth.js',
  'api/health.js',
  'api/auth/config.js',
  'api/auth/synonym.js',
  'api/cow/clips.js',
];
for (const rel of jsFiles) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    fail(`Missing ${rel}`);
    continue;
  }
  try {
    execSync(`node --check "${abs}"`, { stdio: 'pipe' });
    ok(`${rel} syntax`);
  } catch {
    fail(`${rel} syntax error`);
  }
}

const clerkAuth = fs.readFileSync(path.join(ROOT, 'js/clerk-auth.js'), 'utf8');
if (/window\.hasClerkSynonym\s*=\s*\(\)\s*=>\s*hasClerkSynonym\s*\(/.test(clerkAuth)) {
  fail(
    'clerk-auth.js: window.hasClerkSynonym must not call global hasClerkSynonym (use userHasSynonym internally)',
  );
} else {
  ok('clerk-auth.js: no hasClerkSynonym self-recursion');
}

if (!clerkAuth.includes('function userHasSynonym(')) {
  fail('clerk-auth.js: expected internal userHasSynonym helper');
} else {
  ok('clerk-auth.js: userHasSynonym helper present');
}

if (failed) {
  process.exit(1);
}
console.log('\nAll checks passed. Safe to commit / push when local testing looks good.');
