[![build.workflow](https://github.com/DavidKk/vercel-gemini-proxy/actions/workflows/coverage.workflow.yml/badge.svg)](https://github.com/DavidKk/vercel-gemini-proxy/actions/workflows/coverage.workflow.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![codecov](https://codecov.io/gh/DavidKk/vercel-gemini-proxy/graph/badge.svg?token=ELV5W1H0C0)](https://codecov.io/gh/DavidKk/vercel-gemini-proxy)

# Gemini Relay

[![中文](https://img.shields.io/badge/%E6%96%87%E6%A1%A3-%E4%B8%AD%E6%96%87-green?style=flat-square&logo=docs)](https://github.com/DavidKk/vercel-gemini-proxy/blob/main/README.zh-CN.md) [![English](https://img.shields.io/badge/docs-English-green?style=flat-square&logo=docs)](https://github.com/DavidKk/vercel-gemini-proxy/blob/main/README.md)

**Gemini Relay** is a Gemini API proxy on Vercel (Next.js App Router) for regions where direct Gemini access is slow or unavailable—plus a local streaming playground.

## Background

Due to network conditions and geographical locations, access to the Gemini API can be slow or even impossible in some regions. Gemini Relay lets you route traffic through Vercel so clients can reach Gemini more reliably, and debug streams in the browser playground.

## Important Notes

- This service must have its own domain name. Without a domain name, requests cannot be sent. Also, please try to set your DNS resolution in a region where Gemini allows access for successful connectivity.
- The project requires a `Gemini API Token`. Please set up and use your own token, and refrain from using tokens from others to prevent unauthorized use of the service.
- If the `role` of the last or the first message in the message context is not `user`, the error `Please ensure that multiturn requests ends with a user role or a function response.` may occur. Therefore, if the `role` of the first message is not `user`, the service will automatically delete the first (ie. the first) message. If the `role` of the last message is not user, an error will be reported and the message will not be sent to Gemini.
- Credentials: either **passthrough** (`?key=` or `x-goog-api-key` with your Gemini key) or **proxy mode** (custom headers from env `PROXY_AUTH_HEADERS`, server injects a key from env `GEMINI_API_KEYS`). Path must be `/api/v1`, `/api/v1beta`, or `/api/v1beta2`. Missing credential/path → `401`. Proxy mode without `GEMINI_API_KEYS` → `503`. Empty JSON body on POST/PUT/PATCH → `403`. GET (e.g. list models) does not require a body.
- The service returns `200` immediately and streams Gemini's reply. Route `maxDuration` and business timeout are **120 seconds** (enough for typical Agent streams on Hobby with Fluid Compute).
- Model IDs are chosen by the client in the URL (transparent proxy). Prefer current Stable Flash models such as `gemini-2.5-flash`.
- You can check the log situation through the Vercel console Log.

## Deploy With Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDavidKk%2Fvercel-gemini-proxy)

## Playground

- `/` — short how-to
- `/chat` — Codex-style demo (Settings → API Key → Refresh models → stream)
- `/settings` — API Key in browser `localStorage` only; Base URL fixed to `/api/v1beta`

## Usage

```bash
$ curl "http://$YOU_SERVER_HOST:$PORT/api/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=$GEMINI_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-vercel-protection-bypass: $VERCEL_SECRET" \
  -H 'cache-control: no-cache' \
  --data-raw '{"contents":[{"role":"user","parts":[{"text":"Hello Gemini"}]}]}' \
  --compressed
```

Header auth (recommended by Google) also works:

```bash
$ curl "http://$YOU_SERVER_HOST:$PORT/api/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $GEMINI_API_TOKEN" \
  -H "x-vercel-protection-bypass: $VERCEL_SECRET" \
  --data-raw '{"contents":[{"role":"user","parts":[{"text":"Hello Gemini"}]}]}'
```

Proxy mode (server holds the Gemini key; callers send headers from `PROXY_AUTH_HEADERS`):

```bash
# Set on Vercel / .env (example):
# PROXY_AUTH_HEADERS='{"X-API-KEY":"<secret>"}'
# GEMINI_API_KEYS='["..."]'
$ curl "http://$YOU_SERVER_HOST:$PORT/api/v1beta/models" \
  -H "X-API-KEY: <secret>" \
  -H "x-vercel-protection-bypass: $VERCEL_SECRET"
```

### Parameters

**GEMINI_API_TOKEN**: Client-side Gemini API KEY (passthrough mode)

Apply for a Google app, add Gemini, and get API keys.

**GEMINI_API_KEYS** (server env): JSON array of Gemini keys for proxy mode (one or more). With Vercel KV and ≥2 keys, select least total tokens today (UTC)

**GEMINI_RELAY_KV_REST_API_URL** / **GEMINI_RELAY_KV_REST_API_TOKEN** (optional): Vercel KV REST credentials for rotation counters (not `*_READ_ONLY_TOKEN`, not `*_KV_URL` / `*_REDIS_URL`)

**PROXY_AUTH_HEADERS** (server env): JSON object of required headers (e.g. `{"X-API-KEY":"..."}`). All must match (AND). Extra headers can be added if desired. Header names are case-insensitive.

**VERCEL_SECRET**: User Limitation

Refer to the `Deployment Protection` > `Protection Bypass for Automation` settings in Vercel.
