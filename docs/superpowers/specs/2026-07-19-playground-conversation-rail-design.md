# Playground Conversation Rail（同会话轮次轨道）

日期：2026-07-19  
状态：已实现  
参考：ticket-janitor `AgentConversationRail` / `useAgentChatRail` / `agent-chat-rail.ts`

## 目标

在 Gemini Relay `/chat` 左侧增加 **Codex 式对话轨道**：按 user→assistant 轮次导航，hover 预览，点击跳转，滚动高亮当前轮。

非目标：多会话历史侧栏；工单 system/evidence 分组；复制 ticket-janitor 全套依赖。

## 行为

1. **分段**：消息按轮合并。每条 `user` 开启新段；后续连续 `assistant` 并入该段。段 id = 该轮 user 消息 id（若仅有孤立 assistant，用其 id）。
2. **轨道 UI**：窄 aside（约 `w-8`）；每段一条水平细条（默认约 1px 高）。内容越长短条越宽（约 8–12px idle）；hover 时左缘固定、向右 fisheye 拉长（上限约 22px）。
3. **预览**：hover 当前刻度时 portal 浮层显示 user / assistant 摘要（截断约 160 字）；流式且助手尚无正文时显示「生成中…」。
4. **跳转**：点击刻度 → `scrollIntoView({ behavior: 'smooth', block: 'start' })` 到对应轮次锚点。
5. **高亮**：消息区 `IntersectionObserver`（root = ScrollArea 滚动节点）更新 `activeSegmentId`。
6. **空态**：无消息或不存在可分段内容时不渲染轨道。

## 布局

```
Header
┌────────┬─────────────────────────────┐
│ Rail   │ Message list (ScrollArea)   │
│        │                             │
│        ├─────────────────────────────┤
│        │ Composer                    │
└────────┴─────────────────────────────┘
```

- 参考 `AgentChatShell`：左轨与消息列并列；Composer 仍在消息列底部，不压在轨道下。
- `ScrollArea` 已 `forwardRef`，用 ref 作为 observer root。

## 文件

| 路径                                            | 职责                                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `lib/playground/chat-rail.ts`                   | `ChatRailSegment`、`truncateRailPreview`、`resolveRailBarWidthPercent`、`buildChatRailSegments` |
| `components/playground/useChatRail.ts`          | register / active / scrollTo                                                                    |
| `components/playground/ConversationRail.tsx`    | 轨道 + fisheye 刻度                                                                             |
| `components/playground/RailPreviewCard.tsx`     | hover 预览 portal                                                                               |
| `components/playground/PlaygroundChatShell.tsx` | 左轨 + 消息 + footer 壳                                                                         |
| `PlaygroundMessageList.tsx`                     | 按轮次包一层带 `data-segment-id` 的锚点，并 `registerSegment`                                   |
| `PlaygroundApp.tsx`                             | 组装 segments、hook、shell                                                                      |
| `__tests__/lib/playground/chat-rail.spec.ts`    | 分段与宽度单测                                                                                  |

视觉 token 使用现有 playground：`bg-surface`、`border-border`、`text-primary`、`text-muted` / `text-subtle`（对应 janitor 的 tertiary）。

## 测试

- `buildChatRailSegments`：多轮、仅 user、仅 assistant、空列表、预览截断。
- `resolveRailBarWidthPercent`：空内容与长内容边界。
- 不做 E2E 强制项（可选后续）。

## 验收

- [x] 有 ≥1 轮对话时左侧出现轨道
- [x] hover 出现预览；离开轨道预览消失
- [x] 点击刻度滚动到对应轮
- [x] 滚动消息区时当前轮刻度高亮
- [x] Clear chat 后轨道消失
- [x] 流式中最新段可显示「Generating…」
