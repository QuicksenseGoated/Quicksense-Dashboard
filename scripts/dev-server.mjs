import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return undefined;
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function wrapRes(nodeRes) {
  let statusCode = 200;
  const api = {
    status(code) {
      statusCode = code;
      return api;
    },
    setHeader(k, v) {
      nodeRes.setHeader(k, v);
      return api;
    },
    json(data) {
      if (!nodeRes.headersSent) {
        nodeRes.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      }
      nodeRes.end(JSON.stringify(data));
      return api;
    },
    end(data) {
      if (!nodeRes.headersSent) nodeRes.writeHead(statusCode);
      nodeRes.end(data);
      return api;
    },
  };
  return api;
}

async function handleApi(req, res, pathname) {
  const vercelRes = wrapRes(res);
  req.query = Object.fromEntries(new URL(req.url, `http://${req.headers.host}`).searchParams);
  if (req.method === 'PUT' || req.method === 'POST') {
    req.body = await readBody(req);
  }

  if (pathname === '/api/health') {
    const mod = await import('../api/health.js');
    return mod.default(req, vercelRes);
  }
  if (pathname === '/api/cow/clips') {
    const mod = await import('../api/cow/clips.js');
    return mod.default(req, vercelRes);
  }
  if (pathname === '/api/dashboard/state') {
    const mod = await import('../api/dashboard/state.js');
    return mod.default(req, vercelRes);
  }
  if (pathname === '/api/auth/config') {
    const mod = await import('../api/auth/config.js');
    return mod.default(req, vercelRes);
  }

  vercelRes.status(404).json({ error: 'Not found' });
}

async function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const abs = path.join(ROOT, filePath);
  if (!abs.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const data = await fs.readFile(abs);
    const ext = path.extname(abs);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  if (pathname.startsWith('/api/')) {
    try {
      await handleApi(req, res, pathname);
    } catch (e) {
      console.error(e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal error' }));
    }
    return;
  }
  await serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`Quicksense dev server http://localhost:${PORT} (API + static)`);
  console.log(`  COW: http://localhost:${PORT}/#cow`);
});
