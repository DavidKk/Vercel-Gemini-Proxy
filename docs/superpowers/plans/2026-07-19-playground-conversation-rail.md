# Playground Conversation Rail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Codex-style left conversation rail to Gemini Relay `/chat` for same-session turn navigation.

**Architecture:** Pure helpers build user→assistant segments; a narrow rail with fisheye ticks + hover preview; IntersectionObserver tracks the active turn; PlaygroundChatShell lays out rail | messages | composer.

**Tech Stack:** Next.js App Router, React 19, existing ScrollArea (forwardRef), localStorage messages unchanged.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-19-playground-conversation-rail-design.md`
- Approach A only (no multi-session sidebar; no ticket system/evidence blocks)
- Visual tokens: existing playground (`text-primary`, `text-muted`, `border-border`, `bg-surface`)
- English UI copy for rail aria / streaming preview: use "Generating…" to match app language (spec Chinese「生成中…」→ English in product)

## File map

| File                                              | Action                                  |
| ------------------------------------------------- | --------------------------------------- |
| `lib/playground/chat-rail.ts`                     | Create                                  |
| `__tests__/lib/playground/chat-rail.spec.ts`      | Create                                  |
| `components/playground/useChatRail.ts`            | Create                                  |
| `components/playground/RailPreviewCard.tsx`       | Create                                  |
| `components/playground/ConversationRail.tsx`      | Create                                  |
| `components/playground/PlaygroundChatShell.tsx`   | Create                                  |
| `components/playground/PlaygroundMessageList.tsx` | Modify — turn anchors + registerSegment |
| `components/playground/PlaygroundApp.tsx`         | Modify — wire shell + rail              |

---

### Task 1: Segment helpers + tests

- [x] Write failing tests for `buildChatRailSegments`, `truncateRailPreview`, `resolveRailBarWidthPercent`
- [x] Implement `lib/playground/chat-rail.ts`
- [x] Run `pnpm exec jest __tests__/lib/playground/chat-rail.spec.ts` — pass

### Task 2: Rail UI pieces

- [x] Add `useChatRail.ts` (mirror janitor hook)
- [x] Add `RailPreviewCard.tsx` (portal + clamp)
- [x] Add `ConversationRail.tsx` (fisheye ticks)
- [x] Add `PlaygroundChatShell.tsx` (leftRail | scroll | footer)

### Task 3: Wire into chat

- [x] Update `PlaygroundMessageList` to group turns, set `data-segment-id`, call `registerSegment`
- [x] Update `PlaygroundApp` to build segments, use hook, wrap with shell
- [ ] Manual: open `/chat`, send 2+ turns, verify hover / click / active highlight / clear

### Task 4: Spec checklist

- [x] Mark acceptance items done in the design spec if verified
