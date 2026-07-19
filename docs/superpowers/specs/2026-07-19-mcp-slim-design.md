# MCP slim-down (install + smoke test)

Date: 2026-07-19  
Status: implemented  
Approach: **A**

## Problem

Current HTTP MCP exposed `gemini_list_models` + `gemini_generate_content` and accepted the same auth as REST (proxy **or** Gemini key passthrough). That positioned MCP as a Gemini call surface for agents. Product intent is different:

- MCP = **install / skill docs** + a light **connectivity check**
- Real generation stays on **REST** and **Playground**
- Callers using their own `GEMINI_API_KEY` via MCP is unnecessary

## Goals

1. Remove generation from MCP tools.
2. Keep at most one smoke tool: list models (proves proxy auth + upstream Gemini).
3. MCP auth = **proxy headers only** (`PROXY_AUTH_HEADERS` + server `GEMINI_API_KEY`).
4. Update Skill + install meta/UI copy so agents and humans see the slim scope.

## Non-goals

- No streaming / multiturn / embeddings / generic proxy tools on MCP.
- No change to REST or Playground passthrough behavior.
- No new MCP tools beyond the single list/smoke tool.

## Design

### Tools

| Tool                      | Keep?       | Notes                                                       |
| ------------------------- | ----------- | ----------------------------------------------------------- |
| `gemini_list_models`      | Yes         | Only tool. Description: smoke-test / list models via relay. |
| `gemini_generate_content` | **Removed** | Agents must use REST or Playground.                         |

### Auth (`GET`/`POST /api/mcp`)

- `resolveMcpAuth`: requires configured `PROXY_AUTH_HEADERS` and a successful proxy match; then uses server `GEMINI_API_KEY`.
- Rejects Gemini passthrough (`?key=` / `x-goog-api-key`) on MCP with **401**.
- If proxy headers are not configured → **503**.
- `GET /api/mcp/meta` stays public; exposes `proxyConfigured` + header names only (no passthrough fallback).

### Resources

Unchanged: Skill at `skill://gemini-relay/gemini-relay-skill.md` (+ static `/skills/...`).

### Docs / copy

Updated: Skill, McpDialog, `.env.example`, service description.

## Success criteria

- Agent installing MCP gets Skill + can list models to verify the relay.
- No MCP path for `generateContent` or client Gemini key.
- REST passthrough unchanged.
