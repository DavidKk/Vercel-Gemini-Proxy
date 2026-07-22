[![build.workflow](https://github.com/DavidKk/vercel-gemini-proxy/actions/workflows/coverage.workflow.yml/badge.svg)](https://github.com/DavidKk/vercel-gemini-proxy/actions/workflows/coverage.workflow.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![codecov](https://codecov.io/gh/DavidKk/vercel-gemini-proxy/graph/badge.svg?token=ELV5W1H0C0)](https://codecov.io/gh/DavidKk/vercel-gemini-proxy) [![Demo](https://img.shields.io/badge/demo-online-brightgreen?style=flat-square)](https://gemini-relay-proxy.vercel.app/chat)

# Gemini Relay

[![中文](https://img.shields.io/badge/%E6%96%87%E6%A1%A3-%E4%B8%AD%E6%96%87-green?style=flat-square&logo=docs)](https://github.com/DavidKk/vercel-gemini-proxy/blob/main/README.zh-CN.md) [![English](https://img.shields.io/badge/docs-English-green?style=flat-square&logo=docs)](https://github.com/DavidKk/vercel-gemini-proxy/blob/main/README.md)

**Gemini Relay** 是部署在 Vercel 上的 Gemini API 代理（Next.js App Router），用于改善部分地区访问 Gemini 慢或不可达的问题，并附带本地流式调试 Playground。

**在线 Demo：** [https://gemini-relay-proxy.vercel.app/chat](https://gemini-relay-proxy.vercel.app/chat)

## 背景

由于网络状况和地理位置的原因，在某些地区访问 Gemini API 的速度可能很慢，甚至根本无法访问。为了解决这个问题，我们创建了 Vercel Gemini 代理，它允许这些地区的用户更快、更可靠地访问 Gemini API。

## 重要须知

- 此服务必须有自己的域名。如果没有域名，则无法发送请求。此外，请尝试在 Gemini 允许访问的区域中设置您的 DNS 解析，以实现成功的连接。
- 该项目需要一个 `Gemini API Token`。请设置并使用您自己的令牌，不要使用他人的令牌，以防止未经授权使用该服务。
- 如果消息上下文最后一条信息或第一条信息 `role` 不为 `user` 时，可能会出现 `Please ensure that multiturn requests ends with a user role or a function response.` 错误。因此若第一条信息 `role` 不为 `user`时，服务会自动删除第一条（即第一条）信息。若最后一条信息 `role` 不为 `user` 时，将会报错不会将信息发送给 `Gemini`。
- 凭证支持两种模式：**透传**（`?key=` 或 `x-goog-api-key` 带你的 Gemini Key）或 **Proxy 模式**（环境变量 `PROXY_AUTH_HEADERS` 配置的自定义 Header 名/值，由服务端从 `GEMINI_API_KEYS` 注入 Key）。路径需为 `/api/v1`、`/api/v1beta` 或 `/api/v1beta2`。缺凭证/路径 → `401`；Proxy 模式缺 `GEMINI_API_KEYS` → `503`。POST/PUT/PATCH 空 body → `403`；GET（如 list models）不要求 body。
- 服务会优先返回 `200` 并以流形式回传。Route `maxDuration` 与业务超时均为 **120 秒**（覆盖常见 Agent 流，Hobby + Fluid Compute 即可）。
- 模型 ID 由调用方写在 URL 中（透明代理）。推荐使用当前稳定 Flash，例如 `gemini-2.5-flash`。
- 可以通过 Vercel 控制台 Log 查看日志情况。

## 使用 Vercel 部署

[![使用 Vercel 部署](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDavidKk%2Fvercel-gemini-proxy)

## Playground

- **Demo：** [https://gemini-relay-proxy.vercel.app/chat](https://gemini-relay-proxy.vercel.app/chat)
- `/`：简要使用说明
- `/chat`：Codex 风格调试页（Settings 填 API Key → Refresh 选模型 → 流式对话）
- `/settings`：API Key（仅浏览器 `localStorage`；Base URL 固定为本代理 `/api/v1beta`）

## 用法

```bash
$ curl "http://$YOU_SERVER_HOST:$PORT/api/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=$GEMINI_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-vercel-protection-bypass: $VERCEL_SECRET" \
  -H 'cache-control: no-cache' \
  --data-raw '{"contents":[{"role":"user","parts":[{"text":"你好 Gemini"}]}]}' \
  --compressed
```

也支持官方推荐的 Header 鉴权：

```bash
$ curl "http://$YOU_SERVER_HOST:$PORT/api/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $GEMINI_API_TOKEN" \
  -H "x-vercel-protection-bypass: $VERCEL_SECRET" \
  --data-raw '{"contents":[{"role":"user","parts":[{"text":"你好 Gemini"}]}]}'
```

Proxy 模式（服务端持有 Gemini Key；调用方发送 `PROXY_AUTH_HEADERS` 中配置的 Header）：

```bash
# 在 Vercel / .env 配置（示例）：
# PROXY_AUTH_HEADERS='{"X-API-KEY":"<密钥>"}'
# GEMINI_API_KEYS='["..."]'
$ curl "http://$YOU_SERVER_HOST:$PORT/api/v1beta/models" \
  -H "X-API-KEY: <密钥>" \
  -H "x-vercel-protection-bypass: $VERCEL_SECRET"
```

### 参数

**GEMINI_API_TOKEN**: 客户端透传用的 Gemini API KEY

申请 Google 应用，添加 Gemini 并获取 API KEY。

**GEMINI_API_KEYS**（服务端环境变量）：Proxy 模式的 Gemini Key 池（JSON 数组，可单 Key）。配合 Vercel KV 且 ≥2 把时按当日（UTC）累计 Token 最少选 Key

**GEMINI_RELAY_KV_REST_API_URL** / **GEMINI_RELAY_KV_REST_API_TOKEN**（可选）：Vercel KV REST 凭证，用于轮询计数（勿用 READ_ONLY_TOKEN；KV_URL / REDIS_URL 不用于本逻辑）

**PROXY_AUTH_HEADERS**（服务端环境变量）：JSON 对象，例如 `{"X-API-KEY":"..."}`；可加多对 Header，全部匹配才通过（AND）。Header 名大小写不敏感。

**VERCEL_SECRET**: 用户限制

参考 Vercel 中的 `Deployment Protection` > `Protection Bypass for Automation` 设置。
