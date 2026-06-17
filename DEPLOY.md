# Deploying My Match Olympics

Two pieces deploy separately:

| Part | What | Where | Why |
|------|------|-------|-----|
| **Frontend** | React + Vite static build | **Vercel** | Ideal for static SPAs; free, fast, global CDN |
| **Backend** | FastAPI + news scheduler | **Render** | Vercel is awkward for long-running FastAPI; Render runs it as a real web service |

All user-generated demo data (athlete posts, courses, availability, sponsor campaigns & offers) is stored in the **browser's localStorage** — nothing to provision, and it survives redeploys because it lives client-side. See "Persistence notes" below.

---

## 0. Make this folder its own git repo first

Right now `my_match_olympics/` sits inside a larger git repo. For clean deploys, give it its own repo:

```bash
cd "my_match_olympics"
git init
git add .
git commit -m "Initial commit"
# create an empty repo on GitHub, then:
git remote add origin https://github.com/<you>/my-match-olympics.git
git push -u origin main
```

A `.gitignore` should exclude `node_modules/`, `dist/`, `backend/.env`, and `__pycache__/`.

---

## 1. Backend → Render

1. Render → **New + → Blueprint** → pick this repo. It reads [`render.yaml`](render.yaml) and creates the `my-match-olympics-api` web service (root dir `backend`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`).
2. In the service's **Environment**, optionally set:
   - `GROQ_API_KEY` — only needed for AI bios / news filtering. Everything else works without it.
   - `ALLOWED_ORIGINS` — set after step 2 to your Vercel URL, e.g. `https://my-match-olympics.vercel.app`.
3. Deploy. Confirm `https://<your-service>.onrender.com/health` returns `{"status":"healthy"}`.
4. **Copy that Render URL** — you need it next.

> Free tier spins down when idle, so the first request after a pause takes ~30s to wake. Fine for a demo.

## 2. Frontend → Vercel

1. Vercel → **Add New → Project** → import this repo.
2. Set **Root Directory = `frontend`**. Framework preset: Vite (auto-detected). Build/output are already declared in [`frontend/vercel.json`](frontend/vercel.json).
3. **Edit [`frontend/vercel.json`](frontend/vercel.json)** and replace the placeholder host with your real Render URL:
   ```json
   { "source": "/api/:path*", "destination": "https://YOUR-SERVICE.onrender.com/api/:path*" }
   ```
   This proxies every `/api/*` call to the backend, so the app's existing same-origin fetches work in production with **zero code changes**. The second rewrite is the SPA fallback so `/fan`, `/athlete`, `/business` deep-links and refreshes resolve to `index.html`.
4. Deploy. Then go back to Render and set `ALLOWED_ORIGINS` to your new Vercel URL (belt-and-suspenders; the proxy already makes calls same-origin).

---

## Local development

```bash
# Terminal 1 — backend (port 8001, matches the Vite dev proxy)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8001

# Terminal 2 — frontend
cd frontend
npm install
npm run dev          # http://localhost:5173
```

`vite.config.ts` proxies `/api` → `http://localhost:8001` in dev. `vercel.json` does the same job in production.

---

## Persistence notes (read before a "real" launch)

- **Demo data is per-browser (localStorage).** The sponsor→athlete offer loop works end-to-end within a single browser. Open Sponsorship Mode and Athlete Mode in the same browser to see an offer flow through.
- It is **not shared across devices/users**, and it resets if the user clears site data.
- **Do not** "upgrade" this to a backend JSON file on Render/Vercel — both have **ephemeral filesystems**, so runtime-written files vanish on every redeploy/spin-down.
- The real multi-user path is a hosted DB (Supabase/Postgres). All storage is isolated in [`frontend/src/lib/store.ts`](frontend/src/lib/store.ts) precisely so that swap is a one-file change.
