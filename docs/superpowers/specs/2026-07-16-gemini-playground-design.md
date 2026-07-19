# Gemini Playground 设计

> 日期：2026-07-16  
> 状态：已批准并实现
> 形态：方案 A — 单页 Chat / Settings 整屏切换

## 1. 目标

在 `vercel-gemini-proxy` 增加一个 **本地调试 / Demo Playground**：

- 配置 Gemini API Key（及可选自定义 Base URL）
- 拉取模型列表并选择模型
- Codex 风格对话，走 `streamGenerateContent` 流式输出

参考：

- **布局与设置流**：`vercel-web-scripts` 侧栏 AGENT（header + chat/settings 互斥 + composer 内模型 pill）
- **交互与视觉**：`ticket-ai-service` ticket 详情 / ACP playground（Calm Ops：灰 user 泡、无框 assistant Markdown、大圆角 composer）

## 2. 非目标（首轮不做）

- 多会话持久化 / 服务端存 Key
- Tool 调用卡片、Agent loop
- 搬迁两边整仓组件
- Interactions API UI（仍可底层透传，本页只用 generateContent 流）

## 3. 信息架构

**路由**：`/`（替换空 `app/page.tsx`）

```
┌─────────────────────────────────────────┐
│ Header: Gemini Playground | New | 齿轮   │
├─────────────────────────────────────────┤
│ Chat（默认）                             │
│  ├─ 空态 / 消息列表                      │
│  └─ Composer（模型 pill + Send/Stop）    │
│                                          │
│ Settings（与 Chat 互斥）                 │
│  ├─ API Key                              │
│  ├─ Use custom base URL                  │
│  └─ Base URL + Save                      │
└─────────────────────────────────────────┘
```

## 4. 设置与存储

| 字段               | 存储                                        | 默认    | 说明                        |
| ------------------ | ------------------------------------------- | ------- | --------------------------- |
| `apiKey`           | `localStorage` key `vgp_playground_api_key` | 空      | password 输入；仅浏览器本地 |
| `useCustomBaseUrl` | `vgp_playground_use_custom_base`            | `false` | 开关                        |
| `baseUrl`          | `vgp_playground_base_url`                   | 空      | 开启自定义后编辑            |
| `modelId`          | `vgp_playground_model`                      | 空      | 选中模型                    |

**解析后的 API 根路径**（不含末尾 `/`）：

- 未开自定义 → 同源相对路径前缀：`/api/v1beta`
- 开启自定义 → 用户填写的 Base URL（trim，去尾 `/`），例如：
  - `https://generativelanguage.googleapis.com/v1beta`
  - `https://your-proxy.example.com/api/v1beta`

**鉴权**：请求头 `x-goog-api-key: <apiKey>`（本 proxy 已支持；官方亦推荐）。若用户坚持 query `key=`，同源 proxy 同样兼容，但 UI 统一用 header。

**Save Settings**：写入 localStorage；将 `modelsLoaded=false`、清空内存中的 models 列表，提示用户回到聊天后 Refresh。

## 5. 模型列表

- Composer 底栏左侧 **模型 pill**
- 未加载或列表空：显示 `Refresh`；点击后：

  `GET {apiRoot}/models`

  Header：`x-goog-api-key`

- 解析 Google `ListModels` JSON：取 `models[].name`，去掉 `models/` 前缀；可选过滤名称含 `generateContent` 的 supportedGenerationMethods（有则过滤，无则全收）
- 选中后写入 `modelId`；Send 要求：有 Key、有 modelId、非 streaming 中

## 6. 对话与流式

**消息模型（客户端）**

```ts
type PlaygroundMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}
```

**发送**

1. 追加 user 消息；追加空 assistant 消息（streaming）
2. `POST {apiRoot}/models/{modelId}:streamGenerateContent?alt=sse`
   - Body：`{ contents: [{ role: 'user', parts: [{ text }] }, ...] }`（多轮：历史 user/assistant 映射为 Gemini `user`/`model`）
   - Header：`Content-Type: application/json`、`x-goog-api-key`
3. 解析 SSE / NDJSON 流：累加 `candidates[0].content.parts[].text` 到当前 assistant
4. `AbortController` → Stop 按钮中止

**Composer**

- Enter 发送，Shift+Enter 换行
- 空输入 / 无 Key / 无模型 / streaming → Send disabled
- streaming 时显示 Stop（替代 Send）

**New chat**：清空消息列表（不删 Settings）

## 7. UI / 视觉

技术：Next App Router **Client Component** + **Tailwind 3**（本仓新增）。

Tokens（偏 ticket-ai Calm Ops + 侧栏清晰度）：

| Token   | 值                          |
| ------- | --------------------------- |
| canvas  | `#f6f7fb`                   |
| surface | `#ffffff`                   |
| border  | `#d8deea`                   |
| text    | `#111827` / muted `#929db0` |
| brand   | `#4f46e5`（发送钮）         |

模式：

- User：右对齐 `rounded-3xl bg-black/5`
- Assistant：左对齐纯文本/轻 Markdown（首轮可用 `whitespace-pre-wrap`；可选简单 markdown）
- Composer：`rounded-[1.75rem]` 边框 + focus ring
- 不做左侧 conversation rail（首轮简化）

## 8. 文件结构（建议）

```
app/
  layout.tsx          # 引入 globals.css、字体 antialiased
  page.tsx            # <PlaygroundPage />
  globals.css         # Tailwind directives
components/playground/
  PlaygroundApp.tsx   # Chat/Settings 切换状态机
  PlaygroundHeader.tsx
  PlaygroundChat.tsx
  PlaygroundComposer.tsx
  PlaygroundSettings.tsx
  PlaygroundMessageList.tsx
lib/playground/
  storage.ts          # localStorage helpers
  gemini-client.ts    # listModels / streamGenerate
  types.ts
tailwind.config.ts
postcss.config.mjs
```

依赖新增：`tailwindcss`、`postcss`、`autoprefixer`（dev）。不引入重型 markdown 库除非必要；首轮 assistant 用 pre-wrap 即可。

## 9. 验收

- [ ] 打开 `/` 见 Playground；无 Key 时 Send/Refresh 有明确提示
- [ ] Settings 保存 Key（默认同源）→ Refresh 拉到模型 → 选模型 → 流式对话
- [ ] 自定义 Base URL 指向官方或其它 proxy 仍可 Refresh + 聊天
- [ ] Stop 可中断流；New chat 清空对话
- [ ] Key 仅存 localStorage，不上传除目标 Gemini/proxy 外的服务
- [ ] `pnpm build` 通过；不影响现有 `/api/v1*` 代理

## 10. 实现顺序

1. 加 Tailwind / globals / layout
2. storage + gemini-client
3. PlaygroundApp 壳（header + chat/settings 切换）
4. Settings 表单
5. Composer + listModels
6. 消息列表 + streamGenerateContent
7. README 补一行 Playground 说明
