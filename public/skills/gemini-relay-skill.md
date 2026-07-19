# Gemini Relay — Agent skill

## Routing / trigger

Use this skill when the user asks, in any language, to call **Gemini through this relay**, configure proxy auth, list models, or generate content via this deployment’s HTTP MCP / REST proxy.

Canonical anchors:

- Gemini Relay
- Gemini proxy
- `/api/v1beta`
- `PROXY_AUTH_HEADERS`
- `GEMINI_API_KEY`
- `X-API-KEY` (example proxy header)

Prefer this MCP over raw `generativelanguage.googleapis.com` when the user is targeting **this** deployed relay.

## When to use

- Deploy or configure this relay on Vercel (env, domain, protection bypass).
- Explain how to use Playground, REST, or MCP against **this** host.
- Install MCP for Skill docs + list-models smoke test (not generation).
- Explain passthrough vs server-env (proxy) authentication for REST.
- Install / configure Cursor or VS Code MCP pointing at `/api/mcp`.

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
GEMINI_API_KEY=<your-gemini-api-key>
```

- `PROXY_AUTH_HEADERS`: JSON map; **all** headers must match (AND). Names are case-insensitive. Wrap JSON in single quotes in `.env`.
- `GEMINI_API_KEY`: server-only; injected upstream after auth. Never expose to the browser.
- Passthrough-only REST deployments can leave both unset; callers must send their own Gemini key each request. **MCP will return 503** until proxy env is set.

4. Optional: if Vercel **Deployment Protection** is on, callers need `x-vercel-protection-bypass` (see Vercel → Deployment Protection → Protection Bypass for Automation).
5. Redeploy after env changes. Confirm with `GET https://$HOST/api/v1beta/models` using either auth mode.
6. Product URLs after deploy: `/` (home), `/docs/pass-key` (API guide), `/chat` (playground), `/settings`, `/api/mcp` (MCP), `/skills/gemini-relay-skill.md` (this skill).

Local: copy `.env.example` → `.env`, `pnpm install`, `pnpm dev`.

## Use

### Playground (browser)

1. Open `/settings`, paste a Gemini API key, save (stored only in **browser localStorage**; passthrough by default).
2. Open `/chat` → refresh models → pick a model → stream chat. **Clear** resets the session.
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

**Proxy mode** (server holds `GEMINI_API_KEY`; caller sends configured headers):

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

MCP is for **Skill docs + smoke test**, not a full Gemini client. Generation stays on REST / Playground.

1. Server must set `PROXY_AUTH_HEADERS` and `GEMINI_API_KEY` (proxy mode). Passthrough Gemini keys are **rejected** on MCP.
2. Endpoint: `GET/POST $HOST/api/mcp` (proxy headers required).
3. Public install hints (header **names** only): `GET $HOST/api/mcp/meta`.
4. UI: **MCP** header button → Skill URL / MCP URL / Cursor·VS Code install. Put real proxy secrets in client config — never commit them.
5. After connect: `resources/read` this skill; optional `tools/call` `gemini_list_models` to verify the relay.

## Authentication

**REST / Playground** — two modes:

1. **Passthrough** — caller sends Gemini key via `?key=` or header `x-goog-api-key`.
2. **Proxy (server env)** — server has `GEMINI_API_KEY` and `PROXY_AUTH_HEADERS`. Caller sends those custom headers (e.g. `X-API-KEY`). Header names are case-insensitive.

**MCP** — proxy mode only (same custom headers). No `?key=` / `x-goog-api-key`.

## MCP (HTTP) reference

- `GET /api/mcp` — manifest (tools + skill resources)
- `POST /api/mcp` — JSON-RPC 2.0: `initialize`, `tools/list`, `tools/call`, `resources/list`, `resources/read`

### Tools

| Tool                 | Purpose                                    |
| -------------------- | ------------------------------------------ |
| `gemini_list_models` | Smoke-test / list models (`v1beta/models`) |

There is **no** generateContent tool on MCP — use REST or Playground.

### Skill resource

- `resources/list` / `resources/read` with URI `skill://gemini-relay/gemini-relay-skill.md`
- Static copy: `/skills/gemini-relay-skill.md`

## Errors

| Status | Meaning                                                                  |
| ------ | ------------------------------------------------------------------------ |
| 401    | Missing/invalid credential or proxy headers                              |
| 503    | Proxy mode without `GEMINI_API_KEY`, or MCP without `PROXY_AUTH_HEADERS` |
| 403    | Empty JSON body on POST/PUT/PATCH (REST)                                 |

## Notes for agents

- Prefer model ids like `gemini-2.5-flash` unless the user specifies otherwise.
- Multiturn: last (and preferably first) `role` should be `user`, or Gemini may reject the request.
- Route timeout / `maxDuration` is **120s** on this project — long streams may hit that ceiling.
- Do not paste real `GEMINI_API_KEY` / proxy secrets into chat, commits, or user-visible UI.
- Do not use MCP for generation; call REST through this host when the user wants traffic via the relay.
