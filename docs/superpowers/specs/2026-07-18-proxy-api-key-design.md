# Proxy API Key + Playground 设置收紧设计

> 日期：2026-07-18  
> 状态：已批准  
> 范围：服务端双模式鉴权 + Playground 去掉自定义 Base URL

## 1. 目标

1. **服务端持有 Gemini Key**：环境变量 `GEMINI_API_KEY`
2. **调用方用自定义 Header**：环境变量 `PROXY_AUTH_HEADERS`（JSON `{"Name":"value"}`），Header 名与值均可随机，全部匹配后服务端注入 `GEMINI_API_KEY`
3. **Playground 仅调试本代理**：设置页不可配其它 Base URL；只读展示本站 `/api/v1beta?key=<API Key>`

## 2. 非目标

- 多租户 / 轮换密钥 UI
- Playground 改为只走自定义 Proxy Header（本轮仍可用现有 Gemini Key 透传调试）
- 改 Google 上游域名或另开 `/api/gateway` 路由
- 拖拽上传等其它 Playground 功能

## 3. 服务端鉴权（方案 A：`handleRequest` 内双模式）

### 3.1 环境变量

| 变量                 | 说明                                                                   |
| -------------------- | ---------------------------------------------------------------------- |
| `GEMINI_API_KEY`     | 注入上游的 Gemini Key（Proxy 模式必填）                                |
| `PROXY_AUTH_HEADERS` | 自定义 Header JSON：`{"Name":"value","Name2":"value2"}`；全部 AND 匹配 |

两者都未配置时，行为与今天完全一致（仅客户端透传）。

### 3.2 判定顺序

```
1. 路径非 /api/v1* / /api/v1beta* → 401
2. 请求出现任一已配置的自定义 Header 名
   a. 未全部匹配 → 401
   b. 全部匹配但 GEMINI_API_KEY 为空 → 503
   c. 通过 → Proxy 模式：上游只用 GEMINI_API_KEY
3. 否则 → 透传模式：要求 ?key= 或 x-goog-api-key，否则 401
```

**优先级**：出现自定义 Proxy Header 时优先 Proxy 模式，忽略客户端 Gemini Key。

### 3.3 调用示例

```bash
# Proxy 模式（推荐给外部调用方；Header 名/值来自你的 .env）
curl "https://<host>/api/v1beta/models" \
  -H "x-<random>: <secret>" \
  -H "x-<random2>: <secret2>"

# 透传模式（兼容现有 / Playground）
curl "https://<host>/api/v1beta/models?key=$GEMINI_API_TOKEN"
# 或 -H "x-goog-api-key: $GEMINI_API_TOKEN"
```

### 3.4 改动文件（服务端）

| 文件                               | 变更                                   |
| ---------------------------------- | -------------------------------------- |
| `services/gemini/auth.ts`          | 解析 `PROXY_AUTH_HEADERS` + 双模式鉴权 |
| `services/gemini/handleRequest.ts` | 双模式鉴权 + 上游 header/query 改写    |
| `__tests__/handleRequest.spec.ts`  | Proxy / 透传 / 401 / 503 用例          |
| `README.md` / `README.zh-CN.md`    | 文档 env 与自定义 Header               |

## 4. Playground 设置收紧

### 4.1 UI

- **保留**：API Key 输入 + Save
- **删除**：「Use custom Base URL」开关、可编辑 Base URL
- **只读展示**（随 API Key 字段实时变化）：

```text
Base URL
https://<window.location.origin>/api/v1beta?key=<apiKey 或占位>
```

- 实际请求**固定**同源 `DEFAULT_API_ROOT`（`/api/v1beta`），鉴权方式保持现有 header `x-goog-api-key`（或等价 `?key=`，实现任选其一，与展示一致优先 query 亦可，但以不破坏现有客户端为准：继续 header 即可；展示用 `?key=` 仅作可读副本）

### 4.2 数据模型

- 设置仍可保留 `useCustomBaseUrl` / `baseUrl` 字段以兼容旧 localStorage，但：
  - UI 不再暴露
  - `resolveApiRoot` **始终**返回 `/api/v1beta`
  - Save 时强制 `useCustomBaseUrl: false`、清空或忽略 `baseUrl`

### 4.3 改动文件（Playground）

| 文件                                    | 变更                                        |
| --------------------------------------- | ------------------------------------------- |
| `PlaygroundSettings.tsx`                | 去掉自定义 Base；只读展示代理 URL + `?key=` |
| `lib/playground/storage.ts`             | `resolveApiRoot` 固定同源                   |
| 可选：`types.ts` / README playground 段 | 文档同步                                    |

## 5. 验收标准

**服务端**

1. 配置 `PROXY_AUTH_HEADERS` + `GEMINI_API_KEY` 后，带齐自定义 Header 可成功 list models / generate
2. Header 名对但值错 / 缺一对 → 401；缺 `GEMINI_API_KEY` → 503
3. 不带自定义 Proxy Header、带客户端 Gemini Key → 仍透传成功
4. 未配 Proxy env 时，行为与改前一致

**Playground**

5. 设置页无自定义 Base URL 控件
6. 只读行展示 `<origin>/api/v1beta?key=...`，随 Key 变化
7. 对话 / Refresh models 仍走 `/api/v1beta`，不打 Google 直连

## 6. 实现顺序建议

1. 服务端双模式鉴权 + 测试 + README
2. Playground 设置 UI / `resolveApiRoot` 收紧
