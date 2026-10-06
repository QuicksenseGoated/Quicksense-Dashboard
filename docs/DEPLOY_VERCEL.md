# Deploy Quicksense Dashboard on Vercel

~10 minutes. Do this once; every `git push` to `main` redeploys.

## 1. Import the repo

1. Open [vercel.com/new](https://vercel.com/new)
2. Import **QuicksenseGoated/Quicksense-Dashboard** (GitHub)
3. **Framework Preset:** Other (static — no build command)
4. **Root Directory:** `./` (default)
5. **Build Command:** leave empty
6. **Output Directory:** leave empty (serves `index.html` from repo root)
7. Click **Deploy** (first deploy may work without KV; clips won’t persist until step 2)

## 2. Add Redis (shared Clip of the Week)

Vercel **KV** was replaced by **Marketplace Redis** (often Upstash under the hood).

1. Project → **Storage** → scroll to **Marketplace Database Providers**
2. Click **Redis** — *“Official Redis for Vercel”* → **Create**
3. Pick a name/region → **Create** → **Connect** to **quicksense-dashboard** (your project)

Vercel injects REST credentials (`KV_REST_API_URL` / `KV_REST_API_TOKEN` and/or `UPSTASH_REDIS_REST_*`). This repo reads both.

## 3. Add Clerk env vars

From [Clerk Dashboard → API Keys](https://dashboard.clerk.com/last-active?path=api-keys) (app `app_3KJuRHZeiueeEBWgolcso5OwFuG`):

| Variable | Value |
|----------|--------|
| `CLERK_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` |
| `CLERK_SECRET_KEY` | `sk_test_...` or `sk_live_...` |

Project → **Settings → Environment Variables** → add both for **Production** (and Preview if you want).

**Redeploy:** Deployments → ⋮ on latest → **Redeploy**.

## 4. Clerk domain allowlist

Clerk → **Configure → Developers → Allowed origins** (or Domains):

- `https://YOUR-PROJECT.vercel.app`
- Your custom domain later (e.g. `https://dashboard.quicksense.gg`)

Clerk → **Paths / Redirect URLs** — allow your Vercel URL for sign-in redirect.

Under **User & authentication → Username**: enable and set **Required** so every account has a public handle (email is never shown in the app).

## 5. Verify

- `https://YOUR-PROJECT.vercel.app/api/health` → `"storage":"kv"` and `"backend":"vercel"`
- `https://YOUR-PROJECT.vercel.app/#cow` → Sign in → post a **link** clip → open in incognito → clip appears

## 6. Custom domain (optional)

Vercel → **Settings → Domains** → add domain → follow DNS → add same domain in Clerk allowed origins.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `/api/health` 404 | Branch must include `api/` folder (use `main` after merge) |
| `"storage":"file"` on Vercel | Connect KV to project and redeploy |
| Sign-in modal broken | Env vars set + redeploy; check Clerk allowed origins |
| Clips don’t sync | Use **link** posts; file uploads are local-only until blob storage is added |
