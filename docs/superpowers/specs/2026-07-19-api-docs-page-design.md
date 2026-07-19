# API docs page + homepage summary

**Date:** 2026-07-19  
**Status:** Approved for implementation  
**Approach:** C — homepage API summary + dedicated `/docs` page

## Goal

Make dual-mode auth (passthrough vs proxy with `GEMINI_API_KEY` + `PROXY_AUTH_HEADERS`) discoverable without digging into the GitHub README: a short summary on `/`, full guide on `/docs`.

## Non-goals

- Change Playground or proxy auth behavior
- Expose real env secrets on any page
- Multilingual UI (page copy stays English, matching the current site)
- Markdown CMS / multi-page docs tree

## Audience

- **API callers** (curl / SDK): primary consumers of `/docs`
- **Playground users**: keep existing “How to use” on homepage; link to docs only as secondary

## Homepage (`/`)

Keep the existing hero and “How to use” (Playground steps).

Update **API quick start**:

1. Short intro: paths under `/api/v1`, `/api/v1beta`, `/api/v1beta2`
2. **Passthrough** — one sentence + one curl using `?key=` (or mention `x-goog-api-key`)
3. **Proxy mode** — one sentence (`PROXY_AUTH_HEADERS` e.g. `X-API-KEY`, server injects `GEMINI_API_KEY`) + one curl with `X-API-KEY` only
4. Link: **Full API guide → `/docs`**

Optional: add a tertiary text link **Docs** next to Open Playground / Settings in the hero CTA row.

Do not expand into full endpoint catalog on the homepage.

## Docs page (`/docs`)

New App Router page: `app/docs/page.tsx`.

Visual language: match homepage (Space Grotesk / IBM Plex via existing CSS variables, canvas/panel, monospace for samples). Light docs layout — not a second marketing hero.

### Structure

1. **Header** — BrandLogo + “Gemini Relay” + links: Home, Playground
2. **Overview** — transparent proxy; path prefixes
3. **Authentication**
   - Passthrough: `?key=` or header `x-goog-api-key`
   - Proxy: configure `PROXY_AUTH_HEADERS` + `GEMINI_API_KEY` on the server; callers send those custom headers (example `X-API-KEY`); header names case-insensitive
4. **Common endpoints** — illustrative curls only:
   - `GET /api/v1beta/models`
   - `POST …/models/{model}:generateContent`
   - `POST …/models/{model}:streamGenerateContent`
5. **Errors** — brief table or list: `401` missing/invalid credential, `503` proxy mode without `GEMINI_API_KEY`, `403` empty body on POST/PUT/PATCH
6. **Footer note** — other Gemini REST paths under the same prefixes generally pass through; point to Google Gemini API docs for full surface

Placeholders in curls: `$HOST`, `$GEMINI_API_TOKEN`, `<proxy-secret>` — never real keys from `.env`.

### Metadata

`title` / `description` for “API guide · Gemini Relay”.

## Implementation notes

- Prefer static JSX (no MDX dependency) so content stays in-repo and typed with the rest of the app
- Reuse `BrandLogo`; share minimal layout patterns with home (border, `pre` styling)
- No new env vars

## Acceptance

- [ ] `/` shows both auth modes with one curl each and a link to `/docs`
- [ ] `/docs` covers overview, auth, three common endpoints, and errors
- [ ] No secrets from env appear in page source
- [ ] Visual style consistent with existing home (no purple-default AI aesthetic clash)
