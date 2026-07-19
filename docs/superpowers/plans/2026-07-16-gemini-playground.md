# Gemini Playground Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `/` Playground: localStorage API Key + optional Base URL, list models, Codex-style streaming chat via this proxy’s Gemini API.

**Architecture:** Client-only Next App Router page; Chat/Settings full-screen toggle; `lib/playground` for storage + Gemini HTTP client; Tailwind Calm Ops UI.

**Tech Stack:** Next 15 App Router, React 19, Tailwind 3, fetch + SSE/`alt=sse` streaming.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-16-gemini-playground-design.md`
- Auth header: `x-goog-api-key` only in UI
- Default API root: `/api/v1beta`; custom Base URL optional
- No server-side key storage; no multi-session persistence; no heavy markdown lib
- Do not break existing `/api/v1*` proxy routes
- No commit unless user asks

---

## File map

| Path                                                            | Responsibility                          |
| --------------------------------------------------------------- | --------------------------------------- |
| `tailwind.config.ts` / `postcss.config.mjs` / `app/globals.css` | Tailwind + tokens                       |
| `app/layout.tsx` / `app/page.tsx`                               | Shell + mount Playground                |
| `lib/playground/types.ts`                                       | Shared types                            |
| `lib/playground/storage.ts`                                     | localStorage load/save + resolveApiRoot |
| `lib/playground/gemini-client.ts`                               | listModels + streamGenerateContent      |
| `components/playground/*`                                       | UI components                           |
| `README.md` / `README.zh-CN.md`                                 | One-line Playground note                |

---

### Task 1: Tailwind + layout shell

**Files:**

- Create: `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css`
- Modify: `package.json` (devDeps), `app/layout.tsx`, `app/page.tsx`

- [ ] Install `tailwindcss@3 postcss autoprefixer`
- [ ] Add Tailwind config with canvas/surface/border/brand tokens from spec
- [ ] Wire `globals.css` (`@tailwind` + `body` canvas bg); layout imports it, `antialiased`
- [ ] `page.tsx` renders a placeholder `PlaygroundApp` (or empty div until Task 3)
- [ ] Verify: `pnpm build` still succeeds

### Task 2: storage + gemini-client

**Files:**

- Create: `lib/playground/types.ts`, `storage.ts`, `gemini-client.ts`
- Test: `__tests__/lib/playground/storage.spec.ts`, `gemini-client.spec.ts` (pure helpers)

- [ ] Types: `PlaygroundSettings`, `PlaygroundMessage`, `GeminiModel`
- [ ] storage: keys from spec; `loadSettings` / `saveSettings` / `resolveApiRoot`
- [ ] `listModels(apiRoot, apiKey)` → string[]
- [ ] `streamGenerateContent({ apiRoot, apiKey, modelId, contents, signal, onChunk })`
- [ ] Unit-test `resolveApiRoot` and model name stripping (`models/x` → `x`)
- [ ] Verify: `pnpm test` green for new specs

### Task 3: PlaygroundApp shell + Header + Settings

**Files:**

- Create: `components/playground/PlaygroundApp.tsx`, `PlaygroundHeader.tsx`, `PlaygroundSettings.tsx`

- [ ] State: `view: 'chat' | 'settings'`, settings draft, load from storage on mount
- [ ] Header: title, New chat, Settings / Back
- [ ] Settings form: API Key, useCustomBaseUrl switch, Base URL, Save
- [ ] Save clears in-memory models + modelsLoaded
- [ ] Verify: `pnpm dev` — toggle Chat/Settings, Save persists refresh

### Task 4: Chat list + Composer + listModels

**Files:**

- Create: `PlaygroundChat.tsx`, `PlaygroundMessageList.tsx`, `PlaygroundComposer.tsx`
- Modify: `PlaygroundApp.tsx`

- [ ] Empty state + message bubbles (user right gray, assistant left pre-wrap)
- [ ] Composer: textarea, model pill / Refresh, Send
- [ ] Refresh calls `listModels`; select persists `modelId`
- [ ] Send disabled without key/model/text or while streaming
- [ ] Verify: with key, Refresh shows models; New chat clears messages

### Task 5: Streaming send + Stop + README

**Files:**

- Modify: `PlaygroundApp.tsx` / composer wiring
- Modify: `README.md`, `README.zh-CN.md`

- [ ] Map history to Gemini contents; stream into assistant bubble
- [ ] AbortController for Stop
- [ ] Surface errors in UI (status line or assistant error text)
- [ ] README: Playground at `/`, Key in Settings
- [ ] Verify: `pnpm build` + manual stream smoke; proxy routes unchanged
