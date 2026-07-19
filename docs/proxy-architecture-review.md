# Gemini Proxy 架构审阅（面向 App Router 迁移）

> 日期：2026-07-16  
> 现状（迁移后）：Next.js **15.5.9** + **App Router** Route Handler（`nodejs` / Fluid，`maxDuration` 120s）  
> 历史：曾用 Pages Router Edge API（`pages/api/proxy.ts`）  
> 目标：~~迁移到 App Router~~ **已完成** — 见 `app/api/v1|v1beta/[...path]/route.ts` 与 `services/gemini/`

---

## 1. 项目定位

这是一个部署在 Vercel 上的 **Gemini API 透明代理**：

- 对外暴露与 Google Generative Language API 相近的路径（`/v1`、`/v1beta`）
- 由本服务转发到 `https://generativelanguage.googleapis.com`
- 解决部分地区直连 Gemini 慢/不可达的问题
- 在转发前对请求 body 做轻量校验与修复（多轮对话 `role` 约束）

**重要前提**：项目已经是 Next.js，不是「从零上 Next」。迁移本质是：

`pages/api/proxy.ts`（Pages Edge API）→ `app/.../route.ts`（App Router Route Handler）

---

## 2. 整体架构

```
Client
  │  POST /api/v1beta/models/...:generateContent?key=xxx
  │  (或 /v1beta/... ，由 rewrite 统一打到 proxy)
  ▼
next.config.mjs  rewrites
  source: /:_path*  →  destination: /api/proxy
  ▼
pages/api/proxy.ts
  runtime: 'edge'
  regions: [hkg1, cle1, iad1, ...]
  ▼
src/index.ts  (default export)
  createContext(request) → handleRequest(context)
  ▼
handleRequest
  校验 → 读 body → 修 payload → fetch Gemini → 流式 Response(200)
  ▼
Client  (先收到 200，再通过 ReadableStream 收内容)
```

### 关键文件职责

| 路径                                 | 职责                                           |
| ------------------------------------ | ---------------------------------------------- |
| `next.config.mjs`                    | 把几乎所有路径 rewrite 到 `/api/proxy`         |
| `pages/api/proxy.ts`                 | Edge runtime / regions 配置；re-export handler |
| `src/index.ts`                       | 入口：建 context、顶层 try/catch               |
| `src/createContext.ts`               | `{ request, logger }`                          |
| `src/handleRequest.ts`               | **核心代理逻辑**                               |
| `src/constants/conf.ts`              | 上游 URL、CORS、超时                           |
| `src/libs/ProcessTransformStream.ts` | 边传边记进度/拼内容的 TransformStream          |
| `src/libs/TransformStream.ts`        | 从 `stream/web` 引出 Stream API                |
| `src/libs/response/*`                | 统一错误/成功响应包装                          |
| `src/utils/pickHeaders.ts`           | 白名单转发请求头                               |
| `src/services/logger.ts`             | `console.log` 前缀日志（request/response）     |

业务核心几乎全部在 `src/`，`pages/api` 只是薄适配层——这对 App Router 迁移是利好。

---

## 3. 请求入口与路由技巧

### 3.1 Catch-all Rewrite

```js
// next.config.mjs
rewrites() {
  return [{ source: '/:_path*', destination: '/api/proxy' }]
}
```

效果：

- 客户端可写 `/api/v1beta/...` 或 `/v1beta/...`（取决于实际访问与 rewrite 匹配）
- 真实处理函数永远是 `/api/proxy`
- `handleRequest` 用 `request.nextUrl` / `request.url` 上的 **原始 pathname** 拼上游路径

路径变换：

```text
pathname（入站）: /api/v1beta/models/gemini-pro:generateContent
proxyPath       : pathname.replace(/^\/api/, '')
上游 URL        : https://generativelanguage.googleapis.com/v1beta/models/...
query           : 原样转发（并 delete `_path`）
```

### 3.2 Pages Edge 配置

```ts
// pages/api/proxy.ts
export const config = {
  runtime: 'edge',
  regions: ['hkg1', 'cle1', 'iad1', 'pdx1', 'sfo1', 'sin1', 'syd1', 'hnd1', 'kix1'],
}
```

regions 参考 Gemini/Google AI 可用区 + Vercel Edge 区域，意图是就近转发。

### 3.3 Handler 签名

```ts
// 使用 Web 标准 Request/Response，不是 Node IncomingMessage
export default async function proxy(request: Request & { nextUrl?: URL })
```

已接近 App Router Route Handler 的形态，迁移时主要改「如何导出 HTTP method」。

---

## 4. Proxy 核心流程（`handleRequest`）

### 4.1 流程总览

1. **OPTIONS** → 直接 `createErrorResponse(null, 500)`（见下文问题）
2. 解析 URL：`pathname`、`searchParams`
3. **鉴权形门禁**：必须有 `key` query，且 pathname 以 `/api/v1` 或 `/api/v1beta` 开头，否则 `401`
4. **body 非空**，否则 `403`（README 写的是一律 401，与实现不一致）
5. **预读完整 body** 为 JSON（`Message`），并打传输进度日志
6. **contents 修正**：
   - 首条 `role !== 'user'` → `splice(0,1)` 删掉
   - 末条 `role !== 'user'` → **不转发**，`createResponse(lastContent)` 直接返回
7. 组装上游 URL + 白名单 headers + 改写后的 JSON body
8. `AbortController` + `setTimeout(TIMEOUT)`（当前 `TIMEOUT = 10e3` → **10 秒**）
9. **`fetch` 异步进行，但 handler 立刻返回** `Response(readableStream, { status: 200, headers })`
10. Gemini 响应（或错误）后续写入该 stream

### 4.2 为什么先回 200 再流式写？

设计意图（代码注释 + README）：

> Vercel 可能中断长等待；因此先返回 200，再等 Gemini，用流把结果推给客户端。

实现模式：

```ts
fetch(proxyUrl, fetchOptions)
  .then(...) // 写入 responseStream.writable
  .catch(...) // 写入错误 JSON

return new Response(responseStream.readable, { status: 200, ... })
```

特点：

- HTTP status **对外几乎总是 200**
- 上游 4xx/5xx / 超时 / 空 body，多数被编码进 stream 内容（`createException` → `{ success:false, message, data }`）
- 客户端不能只靠 HTTP status 判断 Gemini 成败，必须看 body

### 4.3 Body 预读

```ts
body.pipeThrough(requestStream).pipeTo(writableStream)
→ requestStream.content  // ProcessTransformStream 拼接 Uint8Array → utf-8 字符串
→ JSON.parse
```

代价与取舍：

- **优点**：非法 JSON / 空 contents 可尽早拒绝，少打上游
- **缺点**：无法真正「透传流式请求体」；大 body（含图片 base64）会全部进入内存
- Edge/内存限制下，多模态大图可能是瓶颈

### 4.4 Header 白名单

转发头仅保留：

- `Content-Type` / `Content-Length`（正则）
- `x-goog-api-client`
- `x-goog-api-key`

`key` 主要走 querystring（Gemini REST 常见用法），不是强制走 header。

最终回客户端的 headers 也是这份 `picked` headers（**没有合并 `CORS_HEADERS`**），与 `createResponse` 路径行为不同。

### 4.5 响应流写入细节

成功路径（`status === 200`）：

- 用 `body.getReader()` 递归 `read`
- 每段经 `convertStringToUint8Array` 再写入本地下游 WritableStream  
  （注释引用 Next.js issue：Edge 上 streaming 的兼容处理）

失败路径：

- 无 body → stream 写 exception JSON
- `400 <= status || status > 200` → 读 `response.text()`，写 exception  
  （见 §6：条件等价于「仅严格 200 算成功」）
- fetch reject / abort → catch 里写 exception

---

## 5. 周边模块细节

### 5.1 `ProcessTransformStream`

- 继承 web `TransformStream`
- `process(fn)`：每个 `Uint8Array` chunk 累加字节、推 `writtenContents`、打进度文案
- `content` getter：`Buffer.concat(...).toString('utf-8')`
- **依赖 `Buffer`**：在 Node/部分 Edge polyfill 下可用；纯 Edge 长期需确认（迁移到 Node / Fluid Compute 更稳妥）

### 5.2 统一响应包装

```ts
getResult(data, { success, message }) → { success, message, data, toJson() }
```

- `createErrorResponse`：立刻返回带错误 status 的 `Response`
- `createException`：失败结构，常用于 **stream 内** 错误（HTTP 仍是 200）
- `createResponse`：成功包装 + `CORS_HEADERS`

两套语义并存：gate 失败用真实 HTTP status；代理中段失败用 200 + body.success=false。

### 5.3 Logger

`createLogger('request', 'response')` → `logger.request.info/fail/warn` 等，本质是带前缀的 `console.log`，依赖 Vercel Runtime Logs 查看。

### 5.4 常量

| 常量                    | 值                                          | 含义                                 |
| ----------------------- | ------------------------------------------- | ------------------------------------ |
| `GOOGLE_GEMINI_API_URL` | `https://generativelanguage.googleapis.com` | 上游                                 |
| `TIMEOUT`               | `10e3` (10s)                                | 请求超时；日志写成 `m`（分钟）不准确 |
| `CORS_HEADERS`          | `*` 全开                                    | 仅部分响应路径使用                   |

---

## 6. 已知行为偏差 / 风险点

迁移或改写时建议一并核对：

| #   | 问题                                             | 位置/表现                                                          |
| --- | ------------------------------------------------ | ------------------------------------------------------------------ |
| 1   | OPTIONS 返回 500，且几乎无 CORS 预处理           | `handleRequest` 开头                                               |
| 2   | README：缺参一律 401；实现：空 body → **403**    | 文档与代码不一致                                                   |
| 3   | `status` 判断：`400 <= status \|\| status > 200` | 仅 **200** 走成功；201/204 也会当失败                              |
| 4   | 超时日志单位写成 `m`，实际是秒                   | `TIMEOUT / 1e3` + `'m'`                                            |
| 5   | 超时仅 10s                                       | Gemini 慢时易 abort；流式长答也可能不够                            |
| 6   | 成功流 Response headers 未带 CORS                | 浏览器跨域可能踩坑                                                 |
| 7   | 预读整 body + `Buffer`                           | 大 payload / Edge 兼容风险                                         |
| 8   | `index.ts` 创建了 `responseStream` 却未使用      | 死代码                                                             |
| 9   | 测试覆盖薄                                       | `handleRequest` 仅 1 个 happy-path 用例；几乎未测流/错误/role 修正 |
| 10  | Rewrite `/:_path*` 极宽                          | 所有路径进 proxy，不利于以后加落地页/健康检查                      |

---

## 7. App Router 迁移映射

### 7.1 最小改动映射（推荐作迁移第一刀）

| 现状 (Pages)                                 | App Router                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| `pages/api/proxy.ts`                         | `app/api/proxy/route.ts`（或 `src/app/...`）                             |
| `export const config = { runtime, regions }` | `export const runtime = 'edge'` + `export const preferredRegion = [...]` |
| `export default async function (request)`    | `export async function POST(request)`（及需要的 method）                 |
| `next.config` rewrites → `/api/proxy`        | **可保持**；或改为 `app/api/[[...path]]/route.ts` 少一层 rewrite         |
| `src/handleRequest.ts` 等                    | **尽量原样复用**                                                         |

示意：

```ts
// app/api/proxy/route.ts
import proxy from '@/index' // 或直接调 handleRequest

export const runtime = 'edge' // 或改为 'nodejs'（见下）
export const preferredRegion = ['hkg1', 'cle1', 'iad1', 'pdx1', 'sfo1', 'sin1', 'syd1', 'hnd1', 'kix1']

export async function POST(request: Request) {
  return proxy(request)
}

export async function GET(request: Request) {
  return proxy(request) // 若需兼容 list models 等
}
```

注意：App Router 不会把任意 method 自动交给 default export；**每个 method 要显式导出**，或统一挂一个 helper。

### 7.2 Runtime 选择（关键决策）

Vercel 现状倾向：

- **Edge Function 不再是默认推荐**（兼容性）；同价同区域的 **Fluid Compute / Node.js** 更稳
- 本项目已用 `stream/web` + `fetch` + `Buffer`（ProcessTransformStream）→ **Node.js runtime 更贴合**
- 超时默认上限已提高（平台侧常见到 300s）；可把业务 `TIMEOUT` 与平台 maxDuration 对齐

建议在迁移时二选一明确：

1. **保 Edge**：语义接近现状，继续抠 streaming/Buffer 兼容
2. **改 Node（推荐）**：`runtime = 'nodejs'` + `maxDuration`，减少 Edge 坑，利于后续加日志/观测

### 7.3 路由形态三种方案

**A. Rewrite + 单 Route（最接近现状）**

- 保留 `rewrites` → `/api/proxy`
- `app/api/proxy/route.ts` 承接
- 改动最小，风险最低

**B. Catch-all Route Handler（去掉 rewrite）**

- `app/api/[...path]/route.ts` 或 `app/[[...path]]/route.ts`
- pathname 直接来自 App Router params
- 配置更直观，但要重测 URL 拼接与 `/api` 剥离逻辑

**C. 混合**

- Proxy：`app/api/v1/[...path]` + `app/api/v1beta/[...path]`
- 其它：健康检查、简单说明页用独立 route
- 收窄入口，便于以后扩展产品页

### 7.4 必须保留的行为契约（迁移验收清单）

- [ ] `?key=` 缺失或非 `/api/v1(beta)` → 401
- [ ] 空 body → 当前 403（或统一修成文档中的 401）
- [ ] 首条非 user 被删除；末条非 user 不打上游
- [ ] 上游 URL = `GOOGLE_GEMINI_API_URL` + 去掉前缀 `/api` 的 path + query
- [ ] 先 200 再流式 body（若仍保留该策略）
- [ ] regions / 超时行为符合预期
- [ ] Deployment Protection Bypass header（`x-vercel-protection-bypass`）仍可用
- [ ] 单测 / 至少一条真实 curl 冒烟

### 7.5 可顺手清理（非必须阻塞）

- 修正 OPTIONS / CORS
- 修正 status 判断为 `status !== 200` 或 `!response.ok`
- 超时文案与时长
- 删除 `index.ts` 未用 stream
- 加分层测试：gate / role 修正 / stream 错误编码

---

## 8. 依赖与工程现状（迁移相关）

- **Next 15.5.9 / React 19**：已支持 App Router；无需为「能用 App Router」升大版本
- **无 `app/` 目录**：目前纯 Pages API
- **无 UI 页**：代理专用服务；App Router 迁移几乎只动 Route Handler + config
- **Jest**：单元测试在 `__tests__`；E2E 配置指向 `__webtests__`（需确认目录是否存在）
- **包管理**：pnpm

---

## 9. 建议的迁移步骤（草案）

1. 新增 `app/api/proxy/route.ts`，复用 `src/index` / `handleRequest`
2. 配置 `runtime` / `preferredRegion`（或 Node + `maxDuration`）
3. 保留 rewrite，验证现有 curl 路径仍通
4. 删除 `pages/api/proxy.ts`
5. （可选）收窄 rewrite / 改 catch-all；修 CORS、超时、status 判断
6. 补测试与 README 对齐

---

## 10. 对照 `vercel-openapi`（迁移参考基准）

同作者体系下的 `vercel-openapi`（包名 unbnd）已是 **Next 16 + App Router**。Gemini Proxy 应对齐其约定，而不是另起一套。

### 10.1 已对齐 / 可直接借鉴

| 约定              | vercel-openapi                                                         | Gemini Proxy 建议                                               |
| ----------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| 路由形态          | `app/api/.../route.ts`，显式 `GET`/`POST`                              | 用 route handler 替换 `pages/api`                               |
| Runtime           | 对外 API 多为 `export const runtime = 'edge'`；重活/cron 才用 `nodejs` | **继续 edge**（纯 fetch 代理，符合 openapi 对轻量 API 的惯例）  |
| preferredRegion   | **未使用**                                                             | 可暂去掉；靠 Vercel 默认调度，或后续按需再加                    |
| 宽 rewrite        | **无**；路径写死在 `app/api/...`                                       | 收窄为 `/api/v1`、`/api/v1beta` catch-all，去掉 `/:_path*`      |
| Logger            | `createLogger('api-xxx')` → `info/ok/warn/fail`                        | 收口到同风格（可先薄封装，不必整份搬 context/traceId）          |
| Route 要薄        | `api()` / 薄 handler + `services/` 业务                                | `handleRequest` 迁到 `services/gemini/`（或 `services/proxy/`） |
| 包管理 / 脚本气质 | pnpm、jest、playwright、husky                                          | 保持；Next 可逐步跟到 16 若要完全同栈                           |

典型薄路由（openapi）：

```ts
export const runtime = 'edge'
export const POST = api(async (req) => {
  /* ... */ return jsonSuccess(data)
})
```

### 10.2 不宜硬搬的部分

| 点                                  | 原因                                                                                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `initializer/controller` 的 `api()` | 面向 JSON envelope；Gemini 成功路径是 **流式 body + 先 200**，更像 openapi 里 `mcp/[module]/route.ts` 那种直接返回 `Response`/`NextResponse` |
| `{ code, message, data }` 标准信封  | 现代理上游成功时应尽量像 Gemini；错误体目前是 `{ success, message, data }`。整仓改信封会破坏已有调用方                                       |
| UI/AppShell/MCP/Auth                | Gemini Proxy 是单用途代理，不必抄产品壳                                                                                                      |
| `services/context` + traceId        | 可后置；首轮迁移不阻塞                                                                                                                       |

### 10.3 推荐目标目录（对齐 openapi 气质）

```text
app/
  api/
    v1/[...path]/route.ts      # POST/GET → 共用 handler
    v1beta/[...path]/route.ts
  layout.tsx                   # 最小根 layout（Next 要求）
services/
  gemini/
    handleRequest.ts           # 现有核心逻辑
    ...
initializer/                   # 可选：仅留 logger/response 薄层，或暂不建
next.config.ts                 # 去掉宽 rewrite（或仅保留兼容跳转）
```

路径语义保持：

```text
客户端: /api/v1beta/models/xxx:generateContent?key=...
route  : app/api/v1beta/[...path]
上游   : https://generativelanguage.googleapis.com/v1beta/models/xxx:generateContent?key=...
```

不再依赖「所有流量进 `/api/proxy`」。

---

## 11. 一句话总结

代理实现是：**宽 rewrite 进 Edge API → 校验 key/path/body → 预读并修正 Gemini JSON → 白名单头转发 → 立刻 200 流式回包，异步 fetch 上游**。

对齐 `vercel-openapi` 后的迁移主线：换 App Router 入口 + **继续 edge** + 显式 `/api/v1|v1beta/[...path]` + 业务沉到 `services/`；流式响应走「直接返回 Response」，不要套 JSON `api()` 信封；错误信封与 CORS/超时可另开一轮修。
