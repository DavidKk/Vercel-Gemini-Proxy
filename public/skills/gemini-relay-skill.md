# Gemini Relay — Agent skill

## Routing / trigger

Use this skill when the user asks, in any language, to call **Gemini through this relay**, configure proxy auth, list models, or generate content via this deployment’s HTTP MCP / REST proxy.

Canonical anchors:

- Gemini Relay
- Gemini proxy
- `/api/v1beta`
- `PROXY_AUTH_HEADERS`
- `GEMINI_API_KEYS`
- `X-API-KEY` (example proxy header)

Prefer this MCP over raw `generativelanguage.googleapis.com` when the user is targeting **this** deployed relay.

## When to use

- Deploy or configure this relay on Vercel (env, domain, protection bypass).
- Explain how to use Playground, REST, or MCP against **this** host.
- Install MCP for Skill docs + list-models smoke test (not generation).
- Explain passthrough vs server-env (proxy) authentication for REST.
- Install / configure Cursor or VS Code MCP: bootstrap via `/api/mcp/install`, then auth via `/api/mcp`.

## When not to use

- Do **not** invent API keys or paste real secrets into chat, commits, or user-visible UI.
- Do **not** use this MCP to control browser UI (Playground clicks); use the `/chat` page for that.
- Do **not** bypass the relay when the user explicitly wants traffic through this host.

## Deploy (Vercel)

1. One-click clone/deploy: [Deploy with Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDavidKk%2Fvercel-gemini-proxy) — or fork `DavidKk/vercel-gemini-proxy` and import the repo.
2. Assign a **custom domain** (required for reliable clients). Prefer DNS resolution in a region that can reach Google Gemini.
3. In Vercel → Project → **Settings → Environment Variables**, set proxy mode (**required for MCP**; recommended for shared REST):

```bash
PROXY_AUTH_HEADERS='{"X-API-KEY":"<your-proxy-secret>"}'
GEMINI_API_KEYS='["<your-gemini-api-key>"]'
# Multi-key + Vercel KV least-tokens-today rotation:
# GEMINI_API_KEYS='["key-a","key-b"]'
# GEMINI_RELAY_KV_REST_API_URL=https://….kv.vercel-storage.com
# GEMINI_RELAY_KV_REST_API_TOKEN=...
```

- `PROXY_AUTH_HEADERS`: JSON map; **all** headers must match (AND). Names are case-insensitive. Wrap JSON in single quotes in `.env`.
- `GEMINI_API_KEYS`: JSON array of server Gemini keys (one or more). Never expose to the browser. With Vercel KV and ≥2 keys, proxy picks the key with the **lowest accumulated `totalTokenCount` for the current UTC day** (counters TTL ~48h; not a stats dashboard).
- `GEMINI_RELAY_KV_REST_API_URL` / `GEMINI_RELAY_KV_REST_API_TOKEN` (optional): Vercel KV REST write credentials (store-prefixed). Do **not** use `*_READ_ONLY_TOKEN`. `*_KV_URL` / `*_REDIS_URL` are redis:// and unused here. Fallbacks: `KV_REST_API_*` or `UPSTASH_REDIS_REST_*`. If unset, proxy uses `GEMINI_API_KEYS[0]` and skips INCRBY.
- Passthrough-only REST deployments can leave proxy env unset; callers must send their own Gemini key each request. **MCP will return 503** until proxy env is set.

4. Optional: if Vercel **Deployment Protection** is on, callers need `x-vercel-protection-bypass` (see Vercel → Deployment Protection → Protection Bypass for Automation).
5. Redeploy after env changes. Confirm with `GET https://$HOST/api/v1beta/models` using either auth mode.
6. Product URLs after deploy: `/` (home), `/docs/pass-key` (API guide), `/chat` (playground), `/settings`, `/api/mcp/install` (install MCP), `/api/mcp` (auth MCP), `/skills/gemini-relay-skill.md` (this skill).

Local: copy `.env.example` → `.env`, `pnpm install`, `pnpm dev`.

## Use

### Playground (browser)

1. Open `/settings`, paste a Gemini API key, save (stored only in **browser localStorage**; passthrough by default).
2. Open `/chat` → refresh models → pick a model → stream chat. Assistant bubbles show token usage when Gemini returns `usageMetadata`. **Clear** resets the session (and local token totals).
3. Base URL is fixed to this host’s `/api/v1beta`.

### REST (any HTTP client)

`$HOST` = your deployment origin. Body/response match the [official Gemini REST API](https://ai.google.dev/api).

**Passthrough** (caller’s Gemini key):

```bash
curl "$HOST/api/v1beta/models?key=$GEMINI_API_TOKEN"

curl "$HOST/api/v1beta/models" -H "x-goog-api-key: $GEMINI_API_TOKEN"

curl "$HOST/api/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $GEMINI_API_TOKEN" \
  --data-raw '{"contents":[{"role":"user","parts":[{"text":"Hello"}]}]}'
```

**Proxy mode** (server holds `GEMINI_API_KEYS`; caller sends configured headers):

```bash
curl "$HOST/api/v1beta/models" -H "X-API-KEY: <your-proxy-secret>"

curl "$HOST/api/v1beta/models/gemini-2.5-flash:streamGenerateContent" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: <your-proxy-secret>" \
  --data-raw '{"contents":[{"role":"user","parts":[{"text":"Hello"}]}]}'
```

Prefixes: `/api/v1`, `/api/v1beta`, `/api/v1beta2`. Common paths:

- `GET …/models` — list models (no body)
- `POST …/models/{model}:generateContent`
- `POST …/models/{model}:streamGenerateContent`

Human docs on the site: `/docs/pass-key`, `/docs/server-env`, `/docs/request-response`.

### MCP (Cursor / VS Code)

Two MCP endpoints share this Skill. Generation stays on REST / Playground.

1. **Install MCP** (public): `GET/POST $HOST/api/mcp/install` — Skill only, no secret. Server key `gemini-relay-install`.
2. After deploy + `PROXY_AUTH_HEADERS` / `GEMINI_API_KEYS`, switch to **Auth MCP**: `GET/POST $HOST/api/mcp` — Skill + `gemini_list_models`. Server key `gemini-relay`.
3. Optionally set `MCP_INSTALL_ENABLED=false` to disable install MCP.
4. Public install hints: `GET $HOST/api/mcp/meta`.
5. UI: **MCP** header button → install + auth one-click / Copy mcp.json.
6. After connect: `resources/read` this skill; on auth MCP optionally `tools/call` `gemini_list_models`.

## Authentication

**REST / Playground** — two modes:

1. **Passthrough** — caller sends Gemini key via `?key=` or header `x-goog-api-key`.
2. **Proxy (server env)** — server has `GEMINI_API_KEYS` and `PROXY_AUTH_HEADERS`. Caller sends those custom headers (e.g. `X-API-KEY`). Header names are case-insensitive.

**MCP**

- Install MCP (`/api/mcp/install`) — public Skill bootstrap.
- Auth MCP (`/api/mcp`) — proxy headers required for all methods. No `?key=` / `x-goog-api-key`.

## MCP (HTTP) reference

- `GET/POST /api/mcp/install` — public Skill bootstrap (no tools). Disable with `MCP_INSTALL_ENABLED=false` → 404.
- `GET/POST /api/mcp` — auth MCP (Skill + tools); proxy auth required.
- JSON-RPC: `initialize`, `tools/list`, `tools/call`, `resources/list`, `resources/read`, `ping`

### Tools

| Tool                 | Purpose                                    |
| -------------------- | ------------------------------------------ |
| `gemini_list_models` | Smoke-test / list models (`v1beta/models`) |

There is **no** generateContent tool on MCP — use REST or Playground.

### Skill resource

- `resources/list` / `resources/read` with URI `skill://gemini-relay/gemini-relay-skill.md`
- Static copy: `/skills/gemini-relay-skill.md`

## Errors

| Status | Meaning                                                                      |
| ------ | ---------------------------------------------------------------------------- |
| 401    | Missing/invalid credential (REST) or Auth MCP without proxy headers          |
| 503    | Proxy mode without `GEMINI_API_KEYS` / Auth MCP without `PROXY_AUTH_HEADERS` |
| 404    | Install MCP disabled (`MCP_INSTALL_ENABLED=false`)                           |
| 403    | Empty JSON body on POST/PUT/PATCH (REST)                                     |

## Notes for agents

- Prefer model ids like `gemini-2.5-flash` unless the user specifies otherwise.
- Multiturn: last (and preferably first) `role` should be `user`, or Gemini may reject the request.
- Route timeout / `maxDuration` is **120s** on this project — long streams may hit that ceiling.
- Do not paste real `GEMINI_API_KEYS` / proxy secrets into chat, commits, or user-visible UI.
- Do not use MCP for generation; call REST through this host when the user wants traffic via the relay.
