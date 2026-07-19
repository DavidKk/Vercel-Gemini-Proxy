# Playground 图片上传 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Composer 左下角 `+` 上传单张图片，经 `inline_data` 走现有流式 generate。

**Architecture:** 客户端读文件为 data URL；消息可选 `image`；`toGeminiContents` 映射为 Gemini `inline_data` + `text`。不改 proxy。

**Tech Stack:** Next.js App Router、React client components、现有 `lib/playground/*`、Jest。

## Global Constraints

- 仅 jpg/png/webp/gif；每次最多 1 张；≤ 4MB
- 不拖拽、不粘贴、不 Files API、不落盘

---

## File map

| File                              | Responsibility                             |
| --------------------------------- | ------------------------------------------ |
| `lib/playground/types.ts`         | `PlaygroundImage`、消息 `image?`           |
| `lib/playground/gemini-client.ts` | parts / `toGeminiContents` / base64 helper |
| `PlaygroundComposer.tsx`          | `+`、file input、预览、payload             |
| `PlaygroundApp.tsx`               | `handleSend` 接图                          |
| `PlaygroundMessageList.tsx`       | user 气泡展示图                            |
| `gemini-client.spec.ts`           | 含图 contents 单测                         |

---

### Task 1: Types + `toGeminiContents`（TDD）

**Files:** `types.ts`, `gemini-client.ts`, `gemini-client.spec.ts`

- [x] 写失败测试：带 `image` 的 user → `inline_data` + 可选 `text`；仅图无 text 也保留
- [x] 扩展类型与 `toGeminiContents` 使测试通过
- [x] 跑 `pnpm test -- gemini-client`

### Task 2: Composer `+` UI

**Files:** `PlaygroundComposer.tsx`

- [x] 底栏左侧 `+` + hidden `input[type=file]`
- [x] 预览缩略图 / × / 替换；校验 MIME 与 4MB；`onSend({ text, image? })`；`onImageError` 或 status 回调

### Task 3: App + MessageList 接线

**Files:** `PlaygroundApp.tsx`, `PlaygroundMessageList.tsx`

- [x] `handleSend` 接 payload；user 消息带 `image`
- [x] user 气泡先图后文
- [x] 手动/现有测试不回归：`pnpm test`
