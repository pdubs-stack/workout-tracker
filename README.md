# Questlog: Iron & Ink

A medieval/RPG-styled workout, weight, and accountability tracker. Auto-generates
Push/Pull/Legs workouts on a rolling schedule, tracks XP/stats/armor progression,
and shows weight-trend/goal projections. Backed by Vercel Blob storage so your
data persists across devices, gated by a single shared passcode.

## Stack

- Next.js (App Router) — just enough server to host API routes + the passcode gate
- Vanilla JS frontend (`public/js/*`) — same game logic as the original localStorage
  version, now talking to `/api/state` instead of `localStorage`
- Vercel Blob — single JSON document stores all app data (workouts, stats, armor,
  weigh-ins). No schema/migrations since it's single-user.
- A passcode cookie (HMAC-signed) gates every route via `middleware.js`.

## Deploy (no local Node/git required on your end)

### 1. Create the GitHub repo

Go to **https://github.com/new**, create a new repo (public or private, your call),
and push the contents of this `questlog-iron-ink` folder to it as the repo root
(the folder containing `package.json`, `app/`, `public/`, etc. — not a
subfolder of it).

If you're using git locally:

```bash
cd questlog-iron-ink
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo-name>.git
git push -u origin main
```

Or use GitHub's "upload an existing folder" web flow if you'd rather not touch git.

### 2. Import into Vercel

1. Go to **https://vercel.com/new** and import the GitHub repo you just created.
2. Vercel will auto-detect Next.js — no build config changes needed.
3. **Before your first deploy finishes mattering**, add the Blob store:
   Project → **Storage** tab → **Create Database** → **Blob** → connect it to
   this project. This automatically sets the `BLOB_READ_WRITE_TOKEN` env var —
   you don't need to touch it.
4. Add one environment variable yourself: **Settings → Environment Variables**:
   - `AUTH_SECRET` = a long random passphrase of your choosing. This *is* your
     login passcode — whatever you set here is what you'll type on the login
     screen. (Nothing works until this is set — the app fails closed on purpose,
     since it's your personal weight/workout data on a public URL.)
5. Redeploy (Deployments tab → ⋯ → Redeploy) so the new env var takes effect.

### 3. Use it

Visit your Vercel URL, enter the passcode you set as `AUTH_SECRET`, and you're in.
The session cookie lasts 90 days; use the **Log Out** button in the header to clear it early.

## Local development (optional)

Only needed if you want to run it on your own machine before deploying:

```bash
npm install
vercel link          # links this folder to the Vercel project
vercel env pull .env.local   # pulls AUTH_SECRET + BLOB_READ_WRITE_TOKEN locally
npm run dev
```

## Notes on the data model

Everything lives in one JSON document at `data/store.json` in your Blob store
(see `lib/blobStore.js`). The shape is defined in `lib/defaultState.js`:
`workoutLog`, `currentWorkout`, `rotation`, `characterStats`, `armor`, `weightLog`,
`exerciseBests`, `prHistory`, `meta`. The client fetches the whole document once
on load and writes it back (debounced ~600ms after each change) via `PUT /api/state`.

## Design choices worth knowing about

- **Armor tiers are formula-driven** (`public/js/gamification.js`), not
  hand-authored — 6 tiers × 5 pieces from one config object per piece.
- **Cape's unlock formula is `20×(T+1)`**, not `20×T` like the other stat-gated
  pieces — this reproduces the spec's Capstone quest requirement (all stats ≥ 40)
  exactly at tier 1 while staying formulaic.
- **The passcode gate fails closed**: if `AUTH_SECRET` isn't set, nobody gets in
  (including you), rather than defaulting to open.
