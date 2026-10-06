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

## Clerk CLI (link app `app_3KJuRHZeiueeEBWgolcso5OwFuG`)

This project is vanilla JS + Vercel APIs (not Next.js). From your machine:

```bash
npm install -g clerk   # or: curl -fsSL https://clerk.com/install | bash
clerk auth login
cd path/to/Quicksense-Dashboard
clerk init --app app_3KJuRHZeiueeEBWgolcso5OwFuG --framework javascript --pm npm -y
clerk env pull
clerk doctor
```

Cloud agents cannot finish the browser OAuth step for you. After `clerk env pull`, local `npm run dev` reads `.env.local` automatically.

Enable **Username** in the [Clerk Dashboard](https://dashboard.clerk.com/) so Clip of the Week shows handles.

## Deploy on Vercel

1. Import this repo at [vercel.com/new](https://vercel.com/new)
2. **Storage → KV** → create a database and **Connect to Project**
3. [Clerk](https://dashboard.clerk.com) → create app → copy **Publishable** + **Secret** keys
4. Vercel **Settings → Environment Variables**:
   - `CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
5. In Clerk: **User & authentication → Username** → enable so users pick a handle
6. Deploy

Clip of the Week uses **Clerk sign-in** (no manual Twitch name). Clips and owner dashboard sync through `/api/*` (no JSONBin on Vercel).

## Legacy GitHub Pages

Still works as a static site; shared clips fall back to reading `data/cow-clips.json`. Owner sync can still use JSONBin until you fully switch to Vercel.

## Workflow

Edit `index.html` and/or `api/` → test with `npm run dev` → push to `main`.
