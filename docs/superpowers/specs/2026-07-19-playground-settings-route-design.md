# Playground Settings 独立路由设计

> 日期：2026-07-19  
> 状态：已批准  
> 形态：方案 1 — `/` 聊天 + `/settings` 真实路由

## 1. 目标

- 去掉 Header 的 **New chat**
- Settings 从同页 `view` 切换改为独立页面 `/settings`
- 保留简单清空能力：**Clear** 文字按钮（非 Agent 多会话）

## 2. 非目标

- 多会话持久化 / 侧栏 / Agent UI
- 改 proxy API 或鉴权
- 自定义 Base URL（保持现有固定 `/api/v1beta`）

## 3. 信息架构

| 路径        | 内容                         |
| ----------- | ---------------------------- |
| `/`         | 聊天：消息列表 + Composer    |
| `/settings` | API Key、只读 Base URL、Save |

- 齿轮 → `Link` 到 `/settings`
- 设置页「← Back」→ `/`
- 消息仅内存；设置仍 `localStorage`

## 4. Header

**聊天页**

- 左：标题 + 副标题
- 右：**Clear** + 齿轮（链到 `/settings`）
- 无 New chat

**Clear**

- 停止进行中的流（若有）
- 清空消息与状态文案
- 无确认框

**设置页**

- 左：← Back；中：Settings；无 Clear / 齿轮

## 5. 组件拆分

- `app/page.tsx` → 聊天（`PlaygroundApp` 去掉 settings 分支）
- `app/settings/page.tsx` → 新建，挂载设置页
- `PlaygroundHeader` → chat / settings 两套 props（或等价简化），不再用 `view`
- `PlaygroundSettingsPanel` → 设置页独立 hydrate / save
- 缺 Key 时提示可链到 `/settings`

## 6. 验收

- [ ] `/` 无 New chat；有 Clear + 齿轮
- [ ] 齿轮进入 `/settings`；Back 回 `/`
- [ ] Clear 清空对话并可中断流
- [ ] 设置 Save 写入 localStorage，回聊天后 Refresh 可用
