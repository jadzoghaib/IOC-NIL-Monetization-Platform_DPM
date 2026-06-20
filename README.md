# My Match · Olympics

An interactive fan-economy platform for the Olympic Games — connecting fans, athletes, and sponsors through personalized discovery, content, and real-time AI assistance.

---

## What it does

My Match Olympics is a three-mode web application built around the idea that Olympic athletes deserve a direct fan economy. Each mode serves a different stakeholder:

| Mode | Who it's for | Core value |
|------|-------------|------------|
| **Fan** | Supporters and spectators | Discover athletes by personality match, follow them, book experiences |
| **Athlete** | Olympic athletes | Manage content, courses, availability, and sponsorship offers from one studio |
| **Sponsor** | Brands and agencies | Scout athletes by sport, country, and audience fit; send and track sponsorship offers |

---

## Key features

### Fan Mode — Maya AI assistant
- **Connection Quiz** — personality-based athlete matching across Paris 2024 or Milano-Cortina 2026
- **Discover** — searchable grid of 9 000+ athletes with sport, country, star-rating, and archetype filters
- **Athlete profiles** — full bios, medal history, content posts, and bookable experiences
- **My Wall** — live feed from followed athletes
- **Maya** — gold floating AI assistant that searches athletes, shows clickable profile cards in chat, and can open the booking flow directly from conversation

### Athlete Mode — Studio AI assistant
- Pick any Olympic athlete and manage their studio
- Post content, design fan courses, set availability slots
- Review and accept incoming sponsorship offers from brands
- **Studio AI** — teal AI assistant scoped to the athlete's dashboard, navigates sections on command

### Sponsor / Business Mode — Scout AI assistant
- Brand onboarding (name + category)
- Scout athletes across both Olympics with marketability scores, brand-fit ranking, and brand-safety data
- Build multi-athlete campaigns and send offers
- Track offer status (pending → accepted / declined)
- **Scout AI** — purple AI assistant that searches and shows athlete cards tailored to sponsorship context

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite 6 |
| Styling | Tailwind CSS + CSS custom properties (light/dark theme) |
| Animation | Framer Motion |
| Backend | FastAPI (Python 3.11) |
| Athlete data | Custom dataset — 9 000+ Paris 2024 & Milano-Cortina 2026 athletes |
| AI assistants | OpenRouter API → GPT-4o mini, agentic tool-calling loop |
| Demo persistence | Browser localStorage (no DB required for demo) |
| Deployment | Frontend → Vercel · Backend → Render |

---

## AI assistants

All three modes include a floating AI assistant powered by **OpenRouter (GPT-4o mini)** with a tool-calling agentic loop (up to 4 iterations per message).

```
User message
    ↓
LLM decides: text reply OR call a tool
    ↓
Tool execution (search_athletes / show_athlete / open_booking / navigate_to)
    ↓
Result fed back to LLM → next iteration or final reply
    ↓
UI renders: text bubble + clickable athlete cards
```

Each assistant has a **mode-scoped system prompt** — Maya knows about the current athlete being viewed and followed athletes; Studio AI knows which athlete's studio is open; Scout AI knows the brand name and category. They never bleed into each other's context.

---

## Local development

```bash
# Terminal 1 — backend (port 8001)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8001

# Terminal 2 — frontend
cd frontend
npm install

# Create the env file for the AI assistant
echo "VITE_OPENROUTER_KEY=your_key_here" > .env.local

npm run dev   # → http://localhost:5173
```

`vite.config.ts` proxies all `/api` calls to `http://localhost:8001` in dev, so no CORS config needed locally.

---

## Deployment

See [DEPLOY.md](DEPLOY.md) for the full step-by-step. Summary:

1. **Backend → Render** — Blueprint deploy using `render.yaml`. Set `GROQ_API_KEY` (optional, for AI bios) and `ALLOWED_ORIGINS` to your Vercel URL.
2. **Frontend → Vercel** — Root directory `frontend`. Edit `frontend/vercel.json` to point `/api/*` rewrites at your Render URL. Add `VITE_OPENROUTER_KEY` as an environment variable in Vercel.

---

## Project structure

```
my_match_olympics/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── routes/              # /api/athletes, /api/news, etc.
│   ├── services/            # Data loading, enrichment, GDELT news
│   └── data/                # Athlete CSV dataset
├── frontend/
│   ├── src/
│   │   ├── pages/           # FanEngagement, AthleteMode, BusinessMode, Home
│   │   ├── views/           # Sub-views per page (Discover, Profile, Campaign…)
│   │   ├── components/      # Shared UI: AIAssistant, TopNav, SideNav, cards…
│   │   ├── lib/             # api.ts, store.ts (localStorage), openrouter.ts
│   │   └── hooks/           # useConnectionQuiz, useFollows
│   ├── vercel.json
│   └── vite.config.ts
├── render.yaml
└── DEPLOY.md
```

---

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_OPENROUTER_KEY` | `frontend/.env.local` + Vercel | Powers all three AI assistants |
| `GROQ_API_KEY` | Render env | Optional — AI-generated athlete bios and news filtering |
| `ALLOWED_ORIGINS` | Render env | CORS — set to your Vercel deployment URL |

---

## Data & persistence

- Athlete data (9 000+ records) is served by the FastAPI backend from a pre-built CSV dataset covering Paris 2024 Summer and Milano-Cortina 2026 Winter Olympics.
- All user-generated demo data — posts, courses, availability, sponsor offers — lives in **browser localStorage**. No database is required to run the full demo.
- The offer flow works across tabs in the same browser: open Sponsor Mode in one tab and Athlete Mode in another to watch an offer travel end-to-end.
- See [DEPLOY.md](DEPLOY.md) for notes on upgrading to a hosted database for multi-user production use.
