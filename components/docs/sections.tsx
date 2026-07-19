import type { ReactNode } from 'react'

import { CodeBlock } from '@/components/CodeBlock'

export const DOCS_NAV = [
  { href: '/docs/pass-key', label: 'Pass API key', hint: 'Client credential' },
  { href: '/docs/server-env', label: 'Server env', hint: 'Proxy headers' },
  { href: '/docs/request-response', label: 'Request & response', hint: 'Paths · errors' },
] as const

export const DOCS_DEFAULT_HREF = DOCS_NAV[0].href

const GEMINI_DOCS = 'https://ai.google.dev/api'

function withHost(host: string, template: string): string {
  return template.replaceAll('$HOST', host || '$HOST')
}

export function DocsPanel(props: { title: string; lead: string; children: ReactNode }) {
  return (
    <div className="w-full min-w-0 border border-border bg-surface px-5 py-6 sm:px-7 sm:py-7">
      <h1 className="font-display text-xl font-semibold tracking-tight text-primary sm:text-2xl">{props.title}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">{props.lead}</p>
      <div className="mt-5 min-w-0">{props.children}</div>
    </div>
  )
}

export function DocsInlineCode(props: { children: ReactNode }) {
  return <code className="rounded bg-black/[0.05] px-1 py-0.5 font-mono text-[12px] text-primary">{props.children}</code>
}

export function PassKeyContent(props: { host: string }) {
  const { host } = props

  return (
    <DocsPanel title="Pass your API key" lead="Caller sends a Gemini key on each request. No server GEMINI_API_KEYS needed.">
      <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-muted">
        <li>
          Query: <DocsInlineCode>?key=$GEMINI_API_TOKEN</DocsInlineCode>
        </li>
        <li>
          Or header: <DocsInlineCode>x-goog-api-key: $GEMINI_API_TOKEN</DocsInlineCode>
        </li>
      </ul>
      <p className="mt-3 text-[14px] text-muted">Playground uses this mode (key stored in browser localStorage).</p>
      <CodeBlock tone="canvas" label="curl" className="mt-5">
        {withHost(
          host,
          `curl "$HOST/api/v1beta/models?key=$GEMINI_API_TOKEN"

curl "$HOST/api/v1beta/models" \\
  -H "x-goog-api-key: $GEMINI_API_TOKEN"`
        )}
      </CodeBlock>
    </DocsPanel>
  )
}

export function ServerEnvContent(props: { host: string }) {
  const { host } = props

  return (
    <DocsPanel title="Use server environment variables" lead="Server holds the Gemini key. Callers only send custom headers. Better for shared deployments.">
      <div className="overflow-hidden rounded-md border border-border bg-canvas">
        <EnvRow name="PROXY_AUTH_HEADERS" body={`JSON headers, all must match. e.g. {"X-API-KEY":"<secret>"}`} />
        <EnvRow name="GEMINI_API_KEYS" body='JSON array of server Gemini keys, e.g. ["keyA"] or ["keyA","keyB"]. Required for proxy mode.' />
        <EnvRow name="GEMINI_RELAY_KV_REST_API_URL" body="Vercel KV REST URL (store-prefixed). Used with @upstash/redis for rotation counters." />
        <EnvRow name="GEMINI_RELAY_KV_REST_API_TOKEN" body="Vercel KV write token. Without KV (or with one key), proxy uses keys[0]. Do not use READ_ONLY_TOKEN." last />
      </div>
      <CodeBlock tone="canvas" label=".env" className="mt-5">
        {`PROXY_AUTH_HEADERS='{"X-API-KEY":"<your-proxy-secret>"}'
GEMINI_API_KEYS='["<your-gemini-api-key>"]'
# Multi-key + KV (optional):
# GEMINI_API_KEYS='["key-a","key-b"]'
# GEMINI_RELAY_KV_REST_API_URL=https://….kv.vercel-storage.com
# GEMINI_RELAY_KV_REST_API_TOKEN=...`}
      </CodeBlock>
      <CodeBlock tone="canvas" label="curl" className="mt-3">
        {withHost(
          host,
          `curl "$HOST/api/v1beta/models" \\
  -H "X-API-KEY: <your-proxy-secret>"`
        )}
      </CodeBlock>
    </DocsPanel>
  )
}

export function RequestResponseContent(props: { host: string }) {
  const { host } = props

  return (
    <DocsPanel title="Request & response" lead="Body and response match the official Gemini REST API. Paths: /api/v1, /api/v1beta, /api/v1beta2.">
      <div className="space-y-3">
        <Endpoint method="GET" path="/api/v1beta/models" note="List models — no body.">
          {withHost(host, `curl "$HOST/api/v1beta/models" -H "X-API-KEY: <secret>"`)}
        </Endpoint>
        <Endpoint method="POST" path="/api/v1beta/models/{model}:generateContent" note="Body: JSON contents. Response: candidates / usageMetadata (same as Google).">
          {withHost(
            host,
            `curl "$HOST/api/v1beta/models/gemini-2.5-flash:generateContent" \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: <secret>" \\
  --data-raw '{"contents":[{"role":"user","parts":[{"text":"Hello"}]}]}'`
          )}
        </Endpoint>
        <Endpoint method="POST" path="/api/v1beta/models/{model}:streamGenerateContent" note="Same body as generateContent. Response: streamed chunks.">
          {withHost(
            host,
            `curl "$HOST/api/v1beta/models/gemini-2.5-flash:streamGenerateContent" \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: <secret>" \\
  --data-raw '{"contents":[{"role":"user","parts":[{"text":"Hello"}]}]}'`
          )}
        </Endpoint>
      </div>

      <div className="mt-5 overflow-hidden rounded-md border border-border bg-canvas">
        <ErrorRow code="401" detail="Missing or invalid credential" />
        <ErrorRow code="503" detail="Proxy headers OK but GEMINI_API_KEYS unset; or MCP without PROXY_AUTH_HEADERS" />
        <ErrorRow code="403" detail="Empty body on POST / PUT / PATCH" last />
      </div>

      <p className="mt-5 text-[14px] text-muted">
        Full field reference:{' '}
        <a href={GEMINI_DOCS} target="_blank" rel="noreferrer" className="font-medium text-brand hover:text-brand-hover">
          Google Gemini API docs
        </a>
        . Auth examples below use proxy headers — swap for passthrough (<DocsInlineCode>?key=</DocsInlineCode> / <DocsInlineCode>x-goog-api-key</DocsInlineCode>) as needed.
      </p>
    </DocsPanel>
  )
}

function EnvRow(props: { name: string; body: string; last?: boolean }) {
  return (
    <div className={`grid gap-1 px-4 py-3.5 sm:grid-cols-[14rem_1fr] sm:gap-4 ${props.last ? '' : 'border-b border-border'}`}>
      <code className="font-mono text-[12px] font-medium text-primary">{props.name}</code>
      <p className="text-[13px] leading-relaxed text-muted">{props.body}</p>
    </div>
  )
}

function Endpoint(props: { method: string; path: string; note: string; children: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-border">
      <div className="border-b border-border bg-canvas px-4 py-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 shrink-0 rounded bg-brand px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-white">{props.method}</span>
          <code className="min-w-0 break-all font-mono text-[13px] text-primary">{props.path}</code>
        </div>
        <p className="mt-1.5 text-[13px] text-muted">{props.note}</p>
      </div>
      <CodeBlock bare tone="canvas">
        {props.children}
      </CodeBlock>
    </div>
  )
}

function ErrorRow(props: { code: string; detail: string; last?: boolean }) {
  return (
    <div className={`grid grid-cols-[4.5rem_1fr] gap-3 px-4 py-2.5 text-[14px] ${props.last ? '' : 'border-b border-border'}`}>
      <code className="font-mono text-[12px] font-semibold text-primary">{props.code}</code>
      <span className="text-muted">{props.detail}</span>
    </div>
  )
}
