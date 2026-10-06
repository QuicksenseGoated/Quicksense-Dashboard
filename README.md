# Quicksense Dashboard

Single-page app (`index.html`) + serverless **`/api/*`** (Clip of the Week, dashboard state, Clerk config).

**Workflow:** develop and test on your PC first, then push to **`main`** when it works. See **[docs/LOCAL_FIRST.md](docs/LOCAL_FIRST.md)** (Windows paths, sign-in checklist, optional manual deploy).

## Vercel (production)

1. [vercel.com/new](https://vercel.com/new) → import **QuicksenseGoated/Quicksense-Dashboard**
2. **Production branch:** `main`
3. **Build command:** *(empty)* · **Output:** *(empty)* · **Install:** `npm install`
4. **Clips storage:** original **JSONBin** bin `6a5d13b1f5f4af5e29a49985` (browser sync — no Redis, no Vercel env required)
5. **Environment variables:** `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
6. Clerk: **Username required** · allow your `*.vercel.app` origin

Full checklist: **[docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md)**

Verify: `https://YOUR-APP.vercel.app/api/health` → `"storage":"kv"` · COW: `/#cow`

## Local dev (do this before every push)

```bash
git pull origin main
npm install
npm run dev          # http://localhost:3000/#cow
npm run check        # quick sanity checks before git push
```

Once: `npm run setup:clerk` (after `npx clerk login`) → `.env.local`.  
Clerk must allow **`http://localhost:3000`** in allowed origins.

Full guide: **[docs/LOCAL_FIRST.md](docs/LOCAL_FIRST.md)**

## Clip of the Week

- **Clerk** sign-in · **public synonym** (username) — email never shown
- **10** link slots · **1 clip per account** · votes on leaderboard
- **KV** sync on Vercel; local dev uses `data/*.json`

## Legacy GitHub Pages

Static hosting still works; clip **writes** need Vercel + KV.
