# Proxy API Key + Playground Settings Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Dual-mode auth (`x-api-key` → server `GEMINI_API_KEY`) + Playground fixed proxy Base URL display.

**Architecture:** Resolve credentials in `handleRequest` before upstream fetch. Playground always uses `/api/v1beta`; settings show read-only `origin/api/v1beta?key=…`.

**Tech Stack:** Next.js App Router, existing Jest tests, Vercel env.

## Global Constraints

- Dual mode; `x-api-key` wins over client Gemini key
- Env: `GEMINI_API_KEY`, `PROXY_API_KEY`
- Playground: no custom Base URL; display uses proxy origin only

---

## File map

| File                                     | Responsibility                           |
| ---------------------------------------- | ---------------------------------------- |
| `services/gemini/auth.ts`                | Resolve proxy vs passthrough credentials |
| `services/gemini/handleRequest.ts`       | Call auth; rewrite upstream key          |
| `services/gemini/constants.ts`           | Optional env key names                   |
| `__tests__/services/gemini/auth.spec.ts` | Auth unit tests                          |
| `__tests__/handleRequest.spec.ts`        | Integration cases                        |
| `PlaygroundSettings.tsx` / `storage.ts`  | Fixed API root + display                 |
| `README.md` / `README.zh-CN.md`          | Document env + `x-api-key`               |

---

### Task 1: Auth resolver (TDD)

- [x] Failing tests for proxy / passthrough / 401 / 503 outcomes
- [x] Implement `resolveUpstreamAuth(headers, searchParams, env)`
- [x] Tests pass

### Task 2: Wire `handleRequest`

- [x] Use resolver; rewrite query/header for upstream
- [x] Integration tests in `handleRequest.spec.ts`
- [x] Update README EN/ZH

### Task 3: Playground settings

- [x] Remove custom Base URL UI; read-only proxy URL + `?key=`
- [x] `resolveApiRoot` always `/api/v1beta`
- [x] Save forces `useCustomBaseUrl: false`
