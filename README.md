# Quicksense Dashboard

One repo, one branch (**`main`**), deploy on **Vercel**. No PR workflow — push to `main` and Vercel redeploys.

Single-page app (`index.html`) + serverless **`/api/*`** (Clip of the Week, dashboard state, Clerk config).

## Vercel (production)

1. [vercel.com/new](https://vercel.com/new) → import **QuicksenseGoated/Quicksense-Dashboard**
2. **Production branch:** `main`
3. **Build command:** *(empty)* · **Output:** *(empty)* · **Install:** `npm install`
4. **Storage → KV** → connect to the project
5. **Environment variables:** `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
6. Clerk: **Username required** · allow your `*.vercel.app` origin

Full checklist: **[docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md)**

Verify: `https://YOUR-APP.vercel.app/api/health` → `"storage":"kv"` · COW: `/#cow`

## Local dev

```bash
git clone https://github.com/QuicksenseGoated/Quicksense-Dashboard.git
cd Quicksense-Dashboard
npm install
npm run setup:clerk   # once: clerk auth login, then pulls .env.local
npm run dev
```

- http://localhost:3000/
- http://localhost:3000/#cow

Without `.env.local`, Clerk still works from the publishable key in `index.html` meta (dev only).

## Clip of the Week

- **Clerk** sign-in · **public synonym** (username) — email never shown
- **10** link slots · **1 clip per account** · votes on leaderboard
- **KV** sync on Vercel; local dev uses `data/*.json`

## Legacy GitHub Pages

Static hosting still works; clip **writes** need Vercel + KV.
