# API docs page + homepage summary

**Date:** 2026-07-19  
**Status:** Approved for implementation  
**Approach:** C — homepage API summary + dedicated `/docs` page

## Goal

Make dual-mode auth (passthrough vs proxy with `GEMINI_API_KEY` + `PROXY_AUTH_HEADERS`) discoverable without digging into the GitHub README: a short summary on `/`, full guide on `/docs` that also **explains server env vars and how to self-deploy** on Vercel.

## Non-goals

- Change Playground or proxy auth behavior
- Expose real env secrets on any page (use placeholders only; do not embed values from `.env` / `.env.example`)
- Multilingual UI (page copy stays English, matching the current site)
- Markdown CMS / multi-page docs tree
- In-app one-click deploy wizard beyond linking the existing Vercel deploy button / clone URL

## Audience

- **Self-deployers** (clone → Vercel → set env): primary for Deploy + Environment sections
- **API callers** (curl / SDK): auth + endpoints
- **Playground users**: keep existing “How to use” on homepage; link to docs as secondary

## Homepage (`/`)

Keep the existing hero and “How to use” (Playground steps).

Update **API quick start**:

1. Short intro: paths under `/api/v1`, `/api/v1beta`, `/api/v1beta2`
2. **Passthrough** — one sentence + one curl using `?key=` (or mention `x-goog-api-key`)
3. **Proxy mode** — one sentence (`PROXY_AUTH_HEADERS` e.g. `X-API-KEY`, server injects `GEMINI_API_KEY`) + one curl with `X-API-KEY` only
4. One-line nudge: “Deploy your own instance and set env vars — see Docs”
5. Link: **Full API guide → `/docs`** (no hash URLs)

Optional: add a tertiary text link **Docs** next to Open Playground / Settings in the hero CTA row.

Do not expand into full endpoint catalog or full env tables on the homepage.

## Docs page (`/docs`)

New App Router page: `app/docs/page.tsx`.

Visual language: match homepage (Space Grotesk / IBM Plex via existing CSS variables, canvas/panel, monospace for samples). Light docs layout — not a second marketing hero.

### Structure

1. **Header** — BrandLogo (click → `/` only) + plain text “Gemini Relay” (not a link) + nav links: Home, Playground. Same rule in Playground chrome: logo home, title never navigates.
2. **Overview** — transparent proxy; path prefixes; this public demo vs **your own deployment**
3. **Deploy your own** — short numbered steps (no in-page hash links):
   1. Fork / clone the repo (link GitHub)
   2. Deploy to Vercel (link existing “Deploy with Vercel” button / clone URL from README)
   3. Set environment variables in Vercel Project → Settings → Environment Variables (or local `.env` from `.env.example`)
   4. Point a custom domain if needed; note Deployment Protection / `x-vercel-protection-bypass` when automation is blocked
   5. Call your `$HOST` with the auth mode you chose
4. **Environment variables** — table / cards aligned with `.env.example` intent:

   | Variable             | Required when    | Purpose                                                                                                                                                 |
   | -------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `PROXY_AUTH_HEADERS` | Proxy mode       | JSON object of required request headers (AND). Example shape: `{"X-API-KEY":"<secret>"}`. Names case-insensitive. Wrap JSON in single quotes in `.env`. |
   | `GEMINI_API_KEY`     | Proxy mode       | Server-side Gemini key injected upstream after proxy headers match. Never send this to the browser.                                                     |
   | _(none)_             | Passthrough only | Callers supply Gemini key via `?key=` or `x-goog-api-key`; Playground uses browser localStorage.                                                        |

   Explicit guidance:

   - Copy `.env.example` → `.env` for local; set the same keys in Vercel for production
   - Generate your own proxy header secret; do not reuse demo/example values in production
   - Prefer proxy mode for shared deployments so Gemini key stays on the server

5. **Authentication** — passthrough vs proxy (as before)
6. **Common endpoints** — illustrative curls:
   - `GET /api/v1beta/models`
   - `POST …/models/{model}:generateContent`
   - `POST …/models/{model}:streamGenerateContent`
7. **Errors** — `401` / `503` / `403` brief list
8. **Footer note** — other Gemini REST paths under the same prefixes generally pass through; link Google Gemini API docs

Placeholders in curls: `$HOST`, `$GEMINI_API_TOKEN`, `<proxy-secret>` — never real keys from `.env`.

### Metadata

`title` / `description` for “API guide · Gemini Relay”.

## Implementation notes

- Prefer static JSX (no MDX dependency) so content stays in-repo and typed with the rest of the app
- Reuse `BrandLogo`; share minimal layout patterns with home (border, `pre` styling)
- No new env vars
- Keep deploy steps concise (one screen scroll for env + deploy); deep README detail stays in GitHub

## Acceptance

- [ ] `/` shows both auth modes with one curl each, a deploy nudge, and a link to `/docs`
- [ ] `/docs` covers overview, **self-deploy steps**, **env var table**, auth, three common endpoints, and errors
- [ ] Env section matches `.env.example` semantics without copying real secret values into the page
- [ ] No secrets from env appear in page source
- [ ] Visual style consistent with existing home
