# 35 — Morning light

Morning light for Solana traders — research a mint/pool, save sources, next search, verdict.

Public happy path (no login): paste a Solana mint or token/pool query → web search (Tavily and/or Linkup) → store findings → detect missing risk/audit/liquidity/rug angles → optional second search → verdict (`go` / `wait` / `caution`).

## Stack

- Vite + React + TypeScript (UI)
- Express + TypeScript (API)
- JSON file store under `data/findings.json`
- **Tavily** via [`@tavily/core`](https://www.npmjs.com/package/@tavily/core) (`TAVILY_API_KEY`)
- **Linkup** `POST https://api.linkup.so/v1/search` (Bearer `LINKUP_API_KEY`)

When both keys are set, each search runs Tavily and Linkup in parallel and merges answers/sources (Tavily answer preferred; sources deduped by URL). With only one key, that provider is used alone — existing Linkup-only deploys keep working.

## Setup

```bash
cp .env.example .env
# put your key(s) in .env (never commit them)
npm install
```

Load `TAVILY_API_KEY` and/or `LINKUP_API_KEY` into the environment. The server reads `process.env` only — no secrets are written into the repo.

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

Verifies configured research providers without printing API keys:

```bash
npm run smoke
```

Example output when both keys are set:

```text
Research providers configured: tavily, linkup
TAVILY_API_KEY: set
LINKUP_API_KEY: set
Smoke Tavily: ok (10 sources)
Smoke Linkup: ok (5 sources)
```

- Exit `0` if every **configured** provider succeeds.
- Exit `0` immediately (skipped) when no keys are set — useful in CI without secrets.
- Exit `1` if any configured provider fails (network, auth, quota).

To smoke-test against live APIs locally, export keys in your shell or `.env` (gitignored), then run `npm run smoke`. On Render, add `TAVILY_API_KEY` (and keep `LINKUP_API_KEY` if desired) in the service environment; run smoke from a one-off shell or local machine with the same keys.

## API

- `GET /api/health` — `{ ok, name, linkupKey, tavilyKey, researchProviders: string[] }`
- `POST /api/research` — body `{ "query": "..." }` → full research record
- `GET /api/findings` — recent stored findings
- `GET /api/findings/:id` — one finding

## Deploy notes (Render / Railway / Fly / VPS)

- Set **`TAVILY_API_KEY`** and/or **`LINKUP_API_KEY`** and optionally **`PORT`** in the host env.
- Build with `npm run build`, start with `npm start` (unchanged — safe for existing Render services).
- Persist `/data` (or the whole app dir) if you want findings across restarts.
- Do not commit `.env`. Use `.env.example` as the template.

## Tavily tuning

Following [Tavily search best practices](https://docs.tavily.com/documentation/best-practices/best-practices-search):

- Queries stay concise (built from mint/token + angle hints).
- `searchDepth`: `basic` for standard passes, `advanced` for deep.
- `chunksPerSource: 3` and `maxResults: 10` for targeted snippets.
- `includeAnswer: basic` for sourced summaries comparable to Linkup.
- Parallel provider calls with per-provider error handling when both keys are set.

## Verdict heuristic (MVP)

Heuristic over sourced text — not financial advice:

- **caution** — rug/scam/exploit language, or only partial coverage
- **wait** — thin sources or many missing angles
- **go** — audit + liquidity signals with most angles covered (still DYOR)
