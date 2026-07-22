[![build.workflow](https://github.com/DavidKk/vercel-gemini-proxy/actions/workflows/coverage.workflow.yml/badge.svg)](https://github.com/DavidKk/vercel-gemini-proxy/actions/workflows/coverage.workflow.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![codecov](https://codecov.io/gh/DavidKk/vercel-gemini-proxy/graph/badge.svg?token=ELV5W1H0C0)](https://codecov.io/gh/DavidKk/vercel-gemini-proxy) [![Demo](https://img.shields.io/badge/demo-online-brightgreen?style=flat-square)](https://gemini-relay-proxy.vercel.app/chat)

# Gemini Relay

[![中文](https://img.shields.io/badge/%E6%96%87%E6%A1%A3-%E4%B8%AD%E6%96%87-green?style=flat-square&logo=docs)](https://github.com/DavidKk/vercel-gemini-proxy/blob/main/README.zh-CN.md) [![English](https://img.shields.io/badge/docs-English-green?style=flat-square&logo=docs)](https://github.com/DavidKk/vercel-gemini-proxy/blob/main/README.md)

**Gemini Relay** is a Gemini API proxy on Vercel (Next.js App Router) for regions where direct Gemini access is slow or blocked, plus a browser streaming playground for debugging.

**Try it:** [gemini-relay-proxy.vercel.app/chat](https://gemini-relay-proxy.vercel.app/chat) <sub>(demo only)</sub>

## Important notes

- **Custom domain required for production.** Prefer DNS in a region that can reach Google Gemini.
  <sub>Do not rely on `*.vercel.app` in production. If needed, front the service with a jump host or another edge proxy (e.g. CF).</sub>
- Use **your own** Gemini API key. Do not share or reuse others’ keys.
- Multiturn messages must end with `role: user` (or a function response). If the first message is not `user`, the proxy drops it; if the last is not `user`, the request is rejected.
- Auth paths: `/api/v1`, `/api/v1beta`, `/api/v1beta2` only.
  - **Passthrough:** `?key=` or `x-goog-api-key` with your Gemini key.
  - **Proxy mode:** headers from `PROXY_AUTH_HEADERS`; server injects a key from `GEMINI_API_KEYS`.
  - Missing credential/path → `401`. Proxy mode without `GEMINI_API_KEYS` → `503`. Empty JSON body on POST/PUT/PATCH → `403` (GET needs no body).
- Runs on Next.js **App Router** Route Handlers (`nodejs` + Fluid Compute): `app/api/v1|v1beta|v1beta2/[...path]` → `services/gemini/`. Successful calls return `200` then stream. `maxDuration` and business timeout are **120s**.
- Model IDs live in the URL (transparent forward), e.g. `/api/v1beta/models/{model}:generateContent`. Prefer current Stable: `gemini-3.5-flash` (general) or `gemini-3.5-flash-lite` (lighter). Playground can Refresh the official model list.
- Debug via Vercel → Logs (or local `pnpm dev` terminal). Playground / MCP are for debugging; generation still goes through the REST proxy.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDavidKk%2Fvercel-gemini-proxy)

1. Clone / import the repo and deploy.
2. Attach a **custom domain**.
3. Set env vars (see below). Redeploy after changes.
4. If **Deployment Protection** is on, callers need `x-vercel-protection-bypass` (Vercel → Deployment Protection → Protection Bypass for Automation).

Local: copy `.env.example` → `.env`, then `pnpm install` && `pnpm dev`.

## App routes

| Path               | Purpose                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| `/`                | Short how-to                                                            |
| `/chat`            | Streaming playground (Settings → API Key → Refresh models → chat)       |
| `/settings`        | API Key in browser `localStorage` only; Base URL fixed to `/api/v1beta` |
| `/docs/pass-key`   | API guide (passthrough)                                                 |
| `/docs/server-env` | API guide (proxy mode)                                                  |

## Usage

Replace `$HOST` with your origin (custom domain in production).

**Passthrough** (`?key=`):

```bash
curl "$HOST/api/v1beta/models/gemini-3.5-flash:streamGenerateContent?key=$GEMINI_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-vercel-protection-bypass: $VERCEL_SECRET" \
  -H "cache-control: no-cache" \
  --data-raw '{"contents":[{"role":"user","parts":[{"text":"Hello Gemini"}]}]}' \
  --compressed
```

**Passthrough** (header — recommended by Google):

```bash
curl "$HOST/api/v1beta/models/gemini-3.5-flash:generateContent" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $GEMINI_API_TOKEN" \
  -H "x-vercel-protection-bypass: $VERCEL_SECRET" \
  --data-raw '{"contents":[{"role":"user","parts":[{"text":"Hello Gemini"}]}]}'
```

**Proxy mode** (server holds Gemini keys; callers send `PROXY_AUTH_HEADERS`):

```bash
# PROXY_AUTH_HEADERS='{"X-API-KEY":"<secret>"}'
# GEMINI_API_KEYS='["..."]'
curl "$HOST/api/v1beta/models" \
  -H "X-API-KEY: <secret>" \
  -H "x-vercel-protection-bypass: $VERCEL_SECRET"
```

## Environment variables

| Variable                                                          | Where                          | Description                                                                                                                               |
| ----------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_TOKEN`                                                | Client                         | Your Gemini API key (passthrough). Get it from Google AI Studio / Cloud.                                                                  |
| `GEMINI_API_KEYS`                                                 | Server                         | JSON array of Gemini keys for proxy mode. With Vercel KV and ≥2 keys, picks the key with the lowest total tokens for the current UTC day. |
| `PROXY_AUTH_HEADERS`                                              | Server                         | JSON object of required headers (e.g. `{"X-API-KEY":"..."}`). All must match (AND). Names are case-insensitive.                           |
| `GEMINI_RELAY_KV_REST_API_URL` / `GEMINI_RELAY_KV_REST_API_TOKEN` | Server (optional)              | Vercel KV REST credentials for rotation counters. Do not use `*_READ_ONLY_TOKEN` or `*_KV_URL` / `*_REDIS_URL`.                           |
| `VERCEL_SECRET`                                                   | Client (when protection is on) | Value of Protection Bypass for Automation → send as `x-vercel-protection-bypass`.                                                         |

MCP (optional): `POST/GET /api/mcp` requires proxy mode. Skill: `/skills/gemini-relay-skill.md`.
