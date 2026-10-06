# Local first — test on your PC, then ship

Use this loop so Vercel only gets changes you already tried at home.

## One-time setup (Windows)

1. **Node.js 20+** — [nodejs.org](https://nodejs.org/)
2. **Git** — clone or open your folder:
   ```powershell
   cd "C:\Users\jakob\Videos\Content\Projects\Quicksense Dashboard"
   git remote -v
   ```
   Remote should be `https://github.com/QuicksenseGoated/Quicksense-Dashboard.git`

3. **Install & Clerk env (optional but recommended):**
   ```powershell
   npm install
   npx clerk login
   npm run setup:clerk
   ```
   That creates `.env.local` (never commit it). Without it, Clerk still uses the test key in `index.html` for local tries.

4. **Clerk dashboard** — [Configure → Developers → Allowed origins](https://dashboard.clerk.com):
   - `http://localhost:3000`
   - Your Vercel URL when you deploy later

## Daily workflow

```powershell
git pull origin main
npm install
npm run dev
```

Open:

- http://localhost:3000/
- http://localhost:3000/#cow

### What to test before you push

| Step | Expect |
|------|--------|
| Sign in / sign up | Clerk modal completes, no freeze |
| After login | Bottom “Sign in to post clips” **hidden**; top-right **not** still “Sign in / Sign up” |
| Synonym | **Public synonym** modal (or “Choose synonym”) — pick a name |
| Post | Paste a Medal / YouTube / TikTok link → submit works |
| Leaderboard | Your clip / votes look sane |

Then run:

```powershell
npm run check
```

Fix anything that fails, re-test in the browser, then commit.

## Submit to GitHub (triggers Vercel)

Only when local testing is good:

```powershell
git status
git add .
git commit -m "Describe what you tested locally"
git push origin main
```

Vercel redeploys from `main` automatically unless you changed that in the Vercel project.

### Optional: stop “every push goes live”

In **Vercel → Project → Settings → Git**:

- Turn off **Automatic Production Deployments**, **or**
- Use a personal branch for experiments and only merge to `main` when ready.

Manual production deploy anytime:

```powershell
npm run deploy
```

(Requires `vercel login` once.)

## Which dev command?

| Command | Use when |
|---------|----------|
| `npm run dev` | **Default** — static site + local `/api/*` (matches most work) |
| `npm run dev:vercel` | Debugging Vercel-only behavior (`vercel dev`) |
| `npm run dev:static` | Static files only, no API |

## Troubleshooting (local)

| Problem | Fix |
|---------|-----|
| Sign-in works in Clerk but UI stays “Guest” | Hard refresh; check browser console for red errors; run `npm run check` |
| Clerk modal doesn’t open | Allowed origins must include `http://localhost:3000` |
| `/api/auth/config` empty | Normal without `.env.local`; HTML meta key still works locally |
| “Additional verification…” when saving synonym | Add **`CLERK_SECRET_KEY`** to `.env.local` (local) and **Vercel env** (live), then restart / redeploy |
| Port in use | `set PORT=3001` then `npm run dev` (PowerShell: `$env:PORT=3001; npm run dev`) |

## Files you edit most

- `index.html` — layout, COW UI, styles
- `js/clerk-auth.js` — sign-in, synonym modal, auth bar
- `data/cow-clips.json` — local fallback clips
- `api/*` — serverless (production on Vercel)

Never commit `.env.local` or secret keys.
