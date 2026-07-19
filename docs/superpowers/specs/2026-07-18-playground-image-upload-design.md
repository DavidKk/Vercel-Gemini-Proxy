# Playground 图片上传设计

> 日期：2026-07-18  
> 状态：已批准并实现  
> 形态：方案 A — Composer `+` + `inline_data`（仅单图）

## 1. 目标

在 Gemini Playground 的 Composer **左下角**增加 `+`，支持上传 **一张图片**，随消息走现有 `streamGenerateContent` 多模态请求，便于本地调试代理的图文能力。

## 2. 非目标

- 多图、PDF、音视频、Google Files API
- 拖拽上传、粘贴截图
- 客户端图片压缩 / 服务端落盘
- 会话持久化（含图；消息仍仅内存）

## 3. 交互与 UI

- Composer 底栏左右布局：
  - **左侧**：圆形 `+`（与 Send 同尺寸）
  - **右侧**：现有模型 pill + Send/Stop
- 点击 `+` → 系统文件选择器，`accept="image/jpeg,image/png,image/webp,image/gif"`
- 选中后：输入框**上方**显示一张圆角缩略图 + × 移除
- 已有图时再点 `+` → **替换**当前图
- **可发送**：有图 **或** 有非空文字（且非 streaming、无 `disabledReason`）
- 发送后清空文字与图片
- 消息列表：user 气泡先图后文；assistant 仍纯文本
- 非白名单 MIME / 超过 **4MB**：不挂图，用现有 status 行提示（如「仅支持图片」/「图片过大」）

## 4. 数据模型

```ts
type PlaygroundImage = {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
  /** data URL，用于预览与会话内回显 */
  dataUrl: string
}

type PlaygroundMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  image?: PlaygroundImage // 仅 user
  createdAt: number
}
```

Composer `onSend`：`(payload: { text: string; image?: PlaygroundImage })`。

## 5. API 映射

扩展 `GeminiContent.parts`，支持 `text` 与 `inline_data`：

```ts
parts: [...(image ? [{ inline_data: { mime_type: image.mimeType, data: base64WithoutPrefix } }] : []), ...(text.trim() ? [{ text: text.trim() }] : [])]
```

- `toGeminiContents`：从 `content` + 可选 `image` 组装；多轮历史中带图的 user 同样带 `inline_data`
- 不改 proxy / 服务端；图片不写 localStorage
- New chat 清空消息时一并丢弃图片

## 6. 改动文件

| 文件                                              | 变更                                        |
| ------------------------------------------------- | ------------------------------------------- |
| `lib/playground/types.ts`                         | `PlaygroundImage`、消息可选 `image`         |
| `lib/playground/gemini-client.ts`                 | parts 类型、`toGeminiContents`、base64 剥离 |
| `components/playground/PlaygroundComposer.tsx`    | `+`、选图、预览、payload                    |
| `components/playground/PlaygroundApp.tsx`         | `handleSend` 接图                           |
| `components/playground/PlaygroundMessageList.tsx` | user 气泡展示图                             |
| `__tests__/lib/playground/gemini-client.spec.ts`  | 含图 contents 映射                          |

## 7. 验收标准

1. `+` 可选 jpg/png/webp/gif → 预览 → 可仅图或图+文发送，流式回复正常
2. Stop / Abort 行为与现网一致
3. 非图片或 >4MB 被拒绝并提示
4. 再选图替换；× 可移除；New chat 清空含图消息
5. 现有纯文本对话与单测不回归
