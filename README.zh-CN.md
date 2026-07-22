[![build.workflow](https://github.com/DavidKk/vercel-gemini-proxy/actions/workflows/coverage.workflow.yml/badge.svg)](https://github.com/DavidKk/vercel-gemini-proxy/actions/workflows/coverage.workflow.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![codecov](https://codecov.io/gh/DavidKk/vercel-gemini-proxy/graph/badge.svg?token=ELV5W1H0C0)](https://codecov.io/gh/DavidKk/vercel-gemini-proxy) [![Demo](https://img.shields.io/badge/demo-online-brightgreen?style=flat-square)](https://gemini-relay-proxy.vercel.app/chat)

# Gemini Relay

[![中文](https://img.shields.io/badge/%E6%96%87%E6%A1%A3-%E4%B8%AD%E6%96%87-green?style=flat-square&logo=docs)](https://github.com/DavidKk/vercel-gemini-proxy/blob/main/README.zh-CN.md) [![English](https://img.shields.io/badge/docs-English-green?style=flat-square&logo=docs)](https://github.com/DavidKk/vercel-gemini-proxy/blob/main/README.md)

**Gemini Relay** 是部署在 Vercel 上的 Gemini API 代理（Next.js App Router），用于改善部分地区直连 Gemini 慢或不可达的问题，并附带浏览器端流式调试 Playground。

**试用：** [gemini-relay-proxy.vercel.app/chat](https://gemini-relay-proxy.vercel.app/chat) <sub>（仅 Demo）</sub>

## 重要须知

- **生产环境必须使用自有域名。** DNS 请尽量解析到可访问 Google Gemini 的区域。生产环境不宜依赖 `*.vercel.app`；必要时可用跳板机或其他边缘代理（如 CF）对外提供访问。
- 请使用**自己的** Gemini API Key，勿借用他人密钥。
- 多轮对话最后一条须为 `role: user`（或 function response）。若首条非 `user`，代理会丢弃该条；若末条非 `user`，请求将被拒绝。
- 仅支持路径：`/api/v1`、`/api/v1beta`、`/api/v1beta2`。
  - **透传：** `?key=` 或 `x-goog-api-key` 携带你的 Gemini Key。
  - **Proxy 模式：** 使用 `PROXY_AUTH_HEADERS` 中配置的 Header；服务端从 `GEMINI_API_KEYS` 注入 Key。
  - 缺凭证/路径 → `401`；Proxy 模式缺 `GEMINI_API_KEYS` → `503`；POST/PUT/PATCH 空 JSON body → `403`（GET 不要求 body）。
- 代理跑在 Next.js **App Router** Route Handler（`nodejs` + Fluid Compute）：`app/api/v1|v1beta|v1beta2/[...path]` → `services/gemini/`，成功时先回 `200` 再流式转发。`maxDuration` 与业务超时均为 **120 秒**。
- 模型写在 URL 里透明转发（如 `/api/v1beta/models/{model}:generateContent`）。推荐当前 Stable：`gemini-3.5-flash`（通用）或 `gemini-3.5-flash-lite`（更轻量）；也可用 Playground Refresh 拉官方列表自选。
- 排障看 Vercel → Logs；本地 `pnpm dev` 看终端。Playground / MCP 仅调试辅助，生成仍走 REST 代理。

## 部署

[![使用 Vercel 部署](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDavidKk%2Fvercel-gemini-proxy)

1. Clone / 导入仓库并部署。
2. 绑定**自定义域名**。
3. 配置环境变量（见下），改完后重新部署。
4. 若开启了 **Deployment Protection**，调用方需带 `x-vercel-protection-bypass`（Vercel → Deployment Protection → Protection Bypass for Automation）。

本地：复制 `.env.example` → `.env`，然后 `pnpm install` && `pnpm dev`。

## 页面与文档

| 路径               | 说明                                                             |
| ------------------ | ---------------------------------------------------------------- |
| `/`                | 简要说明                                                         |
| `/chat`            | 流式 Playground（Settings → API Key → Refresh 选模型 → 对话）    |
| `/settings`        | API Key 仅存浏览器 `localStorage`；Base URL 固定为 `/api/v1beta` |
| `/docs/pass-key`   | API 文档（透传）                                                 |
| `/docs/server-env` | API 文档（Proxy 模式）                                           |

## 用法

将 `$HOST` 换成你的站点源（生产请用自定义域名）。

**透传**（`?key=`）：

```bash
curl "$HOST/api/v1beta/models/gemini-3.5-flash:streamGenerateContent?key=$GEMINI_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-vercel-protection-bypass: $VERCEL_SECRET" \
  -H "cache-control: no-cache" \
  --data-raw '{"contents":[{"role":"user","parts":[{"text":"你好 Gemini"}]}]}' \
  --compressed
```

**透传**（Header，Google 推荐）：

```bash
curl "$HOST/api/v1beta/models/gemini-3.5-flash:generateContent" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $GEMINI_API_TOKEN" \
  -H "x-vercel-protection-bypass: $VERCEL_SECRET" \
  --data-raw '{"contents":[{"role":"user","parts":[{"text":"你好 Gemini"}]}]}'
```

**Proxy 模式**（服务端持有 Gemini Key；调用方发送 `PROXY_AUTH_HEADERS`）：

```bash
# PROXY_AUTH_HEADERS='{"X-API-KEY":"<密钥>"}'
# GEMINI_API_KEYS='["..."]'
curl "$HOST/api/v1beta/models" \
  -H "X-API-KEY: <密钥>" \
  -H "x-vercel-protection-bypass: $VERCEL_SECRET"
```

## 环境变量

| 变量                                                              | 位置                 | 说明                                                                                             |
| ----------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------ |
| `GEMINI_API_TOKEN`                                                | 客户端               | 透传用的 Gemini API Key（Google AI Studio / Cloud 申请）                                         |
| `GEMINI_API_KEYS`                                                 | 服务端               | Proxy 模式 Key 池（JSON 数组）。配合 Vercel KV 且 ≥2 把时，按当日（UTC）累计 Token 最少选 Key    |
| `PROXY_AUTH_HEADERS`                                              | 服务端               | 必填 Header 的 JSON 对象，如 `{"X-API-KEY":"..."}`；全部匹配才通过（AND）；Header 名大小写不敏感 |
| `GEMINI_RELAY_KV_REST_API_URL` / `GEMINI_RELAY_KV_REST_API_TOKEN` | 服务端（可选）       | Vercel KV REST 凭证，用于轮询计数；勿用 `*_READ_ONLY_TOKEN` 或 `*_KV_URL` / `*_REDIS_URL`        |
| `VERCEL_SECRET`                                                   | 客户端（开启保护时） | Protection Bypass for Automation 的值，以 `x-vercel-protection-bypass` 发送                      |

## MCP（给 Agent 用）

HTTP MCP 提供 **Skill**（部署 / REST / 鉴权）以及 `gemini_list_models` 冒烟测试；正式生成请走 REST / Playground。**仅 Proxy 模式**——需发送 `PROXY_AUTH_HEADERS`（如 `X-API-KEY`），不接受 Gemini Key 透传。

**一键安装**（打开 Cursor / VS Code；安装后按需替换 `<your-proxy-secret>`）：

[![Add to Cursor](https://img.shields.io/badge/Add_to-Cursor-black?style=flat-square&logo=cursor)](cursor://anysphere.cursor-deeplink/mcp/install?name=gemini-relay&config=eyJ1cmwiOiJodHRwczovL2dlbWluaS1yZWxheS1wcm94eS52ZXJjZWwuYXBwL2FwaS9tY3AiLCJoZWFkZXJzIjp7IlgtQVBJLUtFWSI6Ijx5b3VyLXByb3h5LXNlY3JldD4ifX0%3D) [![Add to VS Code](https://img.shields.io/badge/Add_to-VS_Code-007ACC?style=flat-square&logo=visualstudiocode&logoColor=white)](vscode:mcp/install?%7B%22name%22%3A%22gemini-relay%22%2C%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fgemini-relay-proxy.vercel.app%2Fapi%2Fmcp%22%2C%22headers%22%3A%7B%22X-API-KEY%22%3A%22%3Cyour-proxy-secret%3E%22%7D%7D) [![Add to Insiders](https://img.shields.io/badge/Add_to-VS_Code_Insiders-007ACC?style=flat-square&logo=visualstudiocode&logoColor=white)](vscode-insiders:mcp/install?%7B%22name%22%3A%22gemini-relay%22%2C%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fgemini-relay-proxy.vercel.app%2Fapi%2Fmcp%22%2C%22headers%22%3A%7B%22X-API-KEY%22%3A%22%3Cyour-proxy-secret%3E%22%7D%7D)

或粘贴到 Cursor `mcp.json`（server key 为 `gemini-relay`）：

```json
{
  "mcpServers": {
    "gemini-relay": {
      "url": "https://gemini-relay-proxy.vercel.app/api/mcp",
      "headers": {
        "X-API-KEY": "<your-proxy-secret>"
      }
    }
  }
}
```

| 资源                    | 地址                                                               |
| ----------------------- | ------------------------------------------------------------------ |
| MCP 端点                | https://gemini-relay-proxy.vercel.app/api/mcp                      |
| 安装元信息（Header 名） | https://gemini-relay-proxy.vercel.app/api/mcp/meta                 |
| Skill                   | https://gemini-relay-proxy.vercel.app/skills/gemini-relay-skill.md |
| Skill URI               | `skill://gemini-relay/gemini-relay-skill.md`                       |

站内：Header 的 **MCP** 按钮 → 同样的一键安装 + Copy mcp.json。连接后 `resources/read` Skill，可选 `tools/call` `gemini_list_models`。自建实例把 origin 换成 `$HOST` 即可。
