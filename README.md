# 35 — Morning light

Morning light for Solana traders — research a mint/pool, save sources, next search, verdict.

Public happy path (no login): paste a Solana mint or token/pool query → Linkup search → store findings → detect missing risk/audit/liquidity/rug angles → optional second Linkup search → verdict (`go` / `wait` / `caution`).

## Stack

- Vite + React + TypeScript (UI)
- Express + TypeScript (API)
- JSON file store under `data/findings.json`
- Linkup `POST https://api.linkup.so/v1/search` (Bearer `LINKUP_API_KEY`)

## Setup

```bash
cp .env.example .env
# put your key in .env (never commit it)
npm install
```

Load `LINKUP_API_KEY` into the environment (or use a dotenv loader of your choice). The server reads `process.env.LINKUP_API_KEY` only — no secrets are written into the repo.

## Develop

```bash
npm run dev
```

- UI: http://127.0.0.1:5173 (proxies `/api` → API)
- API: http://127.0.0.1:8787

## Build & run production-style

```bash
npm run build
npm start
```

Serves the built UI + API on **port 8787** (override with `PORT`).

## Smoke test

```bash
npm run smoke
```

Prints whether `LINKUP_API_KEY` is set/missing and the Linkup HTTP status (never prints the key).

## API

- `GET /api/health` — `{ ok, name, linkupKey: boolean }`
- `POST /api/research` — body `{ "query": "..." }` → full research record
- `GET /api/findings` — recent stored findings
- `GET /api/findings/:id` — one finding

## Deploy notes

- Set `LINKUP_API_KEY` and optionally `PORT` in the host env.
- Build with `npm run build`, start with `npm start`.
- Persist `/data` (or the whole app dir) if you want findings across restarts.
- Suitable for a small Node host (Railway, Fly, Render, VPS). No private login required for the MVP path.
- Do not commit `.env`. Use `.env.example` as the template.

## Verdict heuristic (MVP)

Heuristic over sourced text — not financial advice:

- **caution** — rug/scam/exploit language, or only partial coverage
- **wait** — thin sources or many missing angles
- **go** — audit + liquidity signals with most angles covered (still DYOR)
