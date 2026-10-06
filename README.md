# Quicksense Dashboard

Single-page dashboard (`index.html`) with **Vercel serverless APIs** for Clip of the Week and dashboard state.

## Run locally (with API)

```bash
npm install
npm run dev
```

Uses `scripts/dev-server.mjs` (static + API, file storage under `data/`). No Vercel login required.

For production-like local dev with the Vercel CLI: `npm run dev:vercel` (requires `vercel login`).

Open:

- Home: http://localhost:3000/
- Clip of the Week: http://localhost:3000/#cow
- API health: http://localhost:3000/api/health

Without Vercel KV env vars, APIs persist to `data/cow-clips.json` and `data/dashboard-state.json` on disk.

Static-only (no API):

```bash
npm run dev:static
```

## Deploy on Vercel

1. Import this repo at [vercel.com/new](https://vercel.com/new)
2. **Storage → KV** → create a database and **Connect to Project**
3. Deploy — Vercel injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`

Clip links and owner dashboard edits sync through the API (no JSONBin required on Vercel).

## Legacy GitHub Pages

Still works as a static site; shared clips fall back to reading `data/cow-clips.json`. Owner sync can still use JSONBin until you fully switch to Vercel.

## Workflow

Edit `index.html` and/or `api/` → test with `npm run dev` → push to `main`.
