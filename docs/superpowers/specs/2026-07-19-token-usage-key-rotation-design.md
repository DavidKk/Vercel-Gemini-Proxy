# Token usage stats + multi-key rotation

Date: 2026-07-19  
Status: implemented (Playground Part A + Redis key rotation Part B + env/docs Part C)  
Decisions locked so far:

- Playground: per-turn / current-session stats in **localStorage only**
- Server: **accumulate only** (not analytics) when proxy keys are configured
- Rotation goal: balance quota by **least total tokens today**
- Storage: Upstash Redis — **one TTL’d counter per fingerprint per day** (no growing logs)

## Problem

1. Callers cannot see Gemini `usageMetadata` in the Playground UI.
2. Operators configure `GEMINI_API_KEYS` (one or more) and may hit rate/quota ceilings; they want automatic load spreading by **token volume**, not guesswork.

## Goals

1. **Playground** — show token counts for the current conversation; persist with existing local chat storage; no server billing DB.
2. **Server (proxy mode)** — after successful upstream calls, **INCRBY** a Redis counter used only for key picking (not analytics).
3. **Key rotation** — select the Gemini key with the **lowest accumulated total tokens for the current UTC day**.
4. Never expose raw API keys; Redis keys use fingerprint + a single counter. **No per-request usage logs, no growing audit trail.**

## Non-goals

- Google Cloud billing parity or invoice reconciliation.
- Server-side “真实统计 / 报表 / 用量看板” (rotation only needs a number to compare).
- Rotating **passthrough** client keys (caller still supplies their own Gemini key).
- Hard per-key caps / reject-when-over (can add later).
- Cross-device Playground sync.
- MCP generate tools (MCP stays list-models only).
- Writing token details to application logs.

## Architecture overview

```text
Playground (browser)
  stream/generate → parse usageMetadata on final chunk
  → attach to assistant message → localStorage

Proxy request (server)
  resolveUpstreamAuth (proxy headers)
  → pickKeyLeastTokensToday(GEMINI_API_KEYS) via Redis
  → upstream Google with chosen key
  → on success, parse usageMetadata (JSON or last SSE chunk)
  → Redis INCRBY today's counter for that fingerprint only
```

## Part A — Playground local stats

### Behavior

- When assistant response completes, read `usageMetadata` from the final Gemini payload (non-stream JSON or last SSE data object).
- Store on `PlaygroundMessage` (assistant only), e.g.:

```ts
usage?: {
  promptTokenCount?: number
  candidatesTokenCount?: number
  thoughtsTokenCount?: number
  cachedContentTokenCount?: number
  totalTokenCount?: number
}
```

- Render a compact line under the assistant bubble: `in · out · total` (omit zero/undefined fields; show thoughts if present).
- Session clear clears usage with messages (existing Clear).
- Optional session footer: sum `totalTokenCount` across assistant messages in the current list only.

### Gating

- UI always **parses** metadata from responses when present (works for passthrough and proxy).
- No dependency on server `GEMINI_API_KEYS` for Playground display — tokens come from Google’s response.  
  (Server-side **rotation** still requires configured keys; see Part B.)

### Files (expected)

- `lib/playground/types.ts` — extend message type
- `lib/playground/gemini-client.ts` / stream parser — extract metadata
- `components/playground/PlaygroundMessageList.tsx` — display
- Tests for metadata parse helpers

## Part B — Server multi-key rotation (accumulate only)

Goal of Redis: **compare keys for load balancing**, not retain history or emit telemetry.

### Config

| Env                              | Meaning                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `GEMINI_API_KEYS`                | JSON array of strings, e.g. `["keyA"]` or `["keyA","keyB"]`. Required for proxy mode. |
| `GEMINI_RELAY_KV_REST_API_URL`   | Vercel KV REST URL (store-prefixed; primary)                                          |
| `GEMINI_RELAY_KV_REST_API_TOKEN` | Vercel KV write token (not `*_READ_ONLY_TOKEN`)                                       |

Fallbacks for local/generic installs: `KV_REST_API_URL` / `KV_REST_API_TOKEN`, then `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`. Ignore `*_KV_URL` / `*_REDIS_URL` (redis://).

If Redis env missing → **rotation disabled**: use first configured key; skip INCRBY; log **once** at warn (not per request).

Day boundary: **UTC** (for balancing within Google-ish daily windows; not for reporting).

### Key identity

- `fingerprint = sha256(apiKey).hex.slice(0, 16)` — opaque id so Redis never holds the raw secret.

### Redis schema (minimal, bounded)

One string counter per key per day:

```text
gemini:rot:{yyyy-mm-dd}:{fingerprint}  →  integer (totalTokens accumulated)
```

- On success: `INCRBY` by `usageMetadata.totalTokenCount` (or `prompt + candidates + thoughts` if total missing).
- If metadata missing: **skip INCRBY** (do not invent fake token counts; optional later: INCRBY 1 as weak heuristic — default skip).
- **TTL ~ 48h** on write/expire: old days disappear automatically → **storage does not grow without bound**.
- No hash fields, no `requests`, no `__all__`, no per-request entries, no append-only log stream.

### Selection algorithm

1. Pool = `GEMINI_API_KEYS` (JSON array; length ≥ 1 for proxy).
2. Read today’s counter for each fingerprint (missing → `0`).
3. Pick **min** counter; ties → lower index in env array.
4. Upstream with that raw key (from env, not from Redis).

Redis error → use `pool[0]`; request must still succeed.

### Recording

After upstream OK, extract `totalTokenCount` from JSON body or last SSE chunk (via transform side-channel), then async `INCRBY` + ensure TTL. Do not log token amounts or fingerprints at info level.

### Auth integration

After proxy auth succeeds: `pickProxyGeminiKey() → apiKey` using Redis counters; passthrough unchanged.

### Operator meta

**Out of v1.** No `/api/meta/usage` — we are not building a stats product. Rotation needs no dashboard.

## Part C — Implementation phases

| Phase | Deliverable                                                            |
| ----- | ---------------------------------------------------------------------- |
| **1** | Playground parse + UI + localStorage (Part A)                          |
| **2** | `GEMINI_API_KEYS` + Upstash least-counter pick + INCRBY-only recording |
| **3** | `.env.example` / Skill note for multi-key + Redis                      |

## Risks & mitigations

| Risk                                             | Mitigation                                                                              |
| ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Serverless concurrency races on “pick then incr” | Accept small imbalance; optional Redis Lua later for atomic pick                        |
| SSE body already piped — hard to read metadata   | Extend transform stream to capture last `usageMetadata` without buffering full response |
| Upstash outage                                   | Fall back to first key; request still succeeds                                          |
| Key list change mid-day                          | New fingerprints start at 0 → temporarily preferred; OK for balance                     |

## Success criteria

1. Assistant messages in Playground show token line when metadata present; survives refresh via localStorage.
2. With ≥2 keys + Upstash, traffic trends toward lower-counter keys within a UTC day.
3. Redis holds only a small set of TTL’d counters (≈ keys × 1–2 days); no append-only usage log.
4. Passthrough mode behavior unchanged.

## Open points (defaults if silent)

- Day boundary: **UTC**.
- Playground: **always show** when metadata exists.
- No `/api/meta/usage` in v1.

## Out of scope follow-ups

- Usage dashboards, Grafana, request-level audit logs.
- Weighted keys / manual weights.
- Charging tenants by token.
