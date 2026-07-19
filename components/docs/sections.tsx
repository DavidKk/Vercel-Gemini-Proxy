import type { ReactNode } from 'react'

import { CodeBlock } from '@/components/CodeBlock'

export const DOCS_NAV = [
  { href: '/docs/pass-key', label: 'Pass API key', hint: 'Client credential' },
  { href: '/docs/server-env', label: 'Server env', hint: 'Proxy headers' },
  { href: '/docs/request-response', label: 'Request & response', hint: 'Paths · errors' },
] as const

export const DOCS_DEFAULT_HREF = DOCS_NAV[0].href

const GEMINI_DOCS = 'https://ai.google.dev/api'

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

export function PassKeyContent() {
  return (
    <DocsPanel title="Pass your API key" lead="Caller sends a Gemini key on each request. No server GEMINI_API_KEY needed.">
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
        {`curl "$HOST/api/v1beta/models?key=$GEMINI_API_TOKEN"

curl "$HOST/api/v1beta/models" \\
  -H "x-goog-api-key: $GEMINI_API_TOKEN"`}
      </CodeBlock>
    </DocsPanel>
  )
}

export function ServerEnvContent() {
  return (
    <DocsPanel title="Use server environment variables" lead="Server holds the Gemini key. Callers only send custom headers. Better for shared deployments.">
      <div className="overflow-hidden rounded-md border border-border bg-canvas">
        <EnvRow name="PROXY_AUTH_HEADERS" body={`JSON headers, all must match. e.g. {"X-API-KEY":"<secret>"}`} />
        <EnvRow name="GEMINI_API_KEY" body="Injected upstream after headers match. Never expose to the browser." last />
      </div>
      <CodeBlock tone="canvas" label=".env" className="mt-5">
        {`PROXY_AUTH_HEADERS='{"X-API-KEY":"<your-proxy-secret>"}'
GEMINI_API_KEY=<your-gemini-api-key>`}
      </CodeBlock>
      <CodeBlock tone="canvas" label="curl" className="mt-3">
        {`curl "$HOST/api/v1beta/models" \\
  -H "X-API-KEY: <your-proxy-secret>"`}
      </CodeBlock>
    </DocsPanel>
  )
}

export function RequestResponseContent() {
  return (
    <DocsPanel title="Request & response" lead="Body and response match the official Gemini REST API. Paths: /api/v1, /api/v1beta, /api/v1beta2.">
      <div className="space-y-3">
        <Endpoint method="GET" path="/api/v1beta/models" note="List models — no body.">
          {`curl "$HOST/api/v1beta/models" -H "X-API-KEY: <secret>"`}
        </Endpoint>
        <Endpoint method="POST" path="/api/v1beta/models/{model}:generateContent" note="Body: JSON contents. Response: candidates / usageMetadata (same as Google).">
          {`curl "$HOST/api/v1beta/models/gemini-2.5-flash:generateContent" \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: <secret>" \\
  --data-raw '{"contents":[{"role":"user","parts":[{"text":"Hello"}]}]}'`}
        </Endpoint>
        <Endpoint method="POST" path="/api/v1beta/models/{model}:streamGenerateContent" note="Same body as generateContent. Response: streamed chunks.">
          {`curl "$HOST/api/v1beta/models/gemini-2.5-flash:streamGenerateContent" \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: <secret>" \\
  --data-raw '{"contents":[{"role":"user","parts":[{"text":"Hello"}]}]}'`}
        </Endpoint>
      </div>

      <div className="mt-5 overflow-hidden rounded-md border border-border bg-canvas">
        <ErrorRow code="401" detail="Missing or invalid credential" />
        <ErrorRow code="503" detail="Proxy mode without GEMINI_API_KEY on the server" />
        <ErrorRow code="403" detail="Empty body on POST / PUT / PATCH" last />
      </div>

      <p className="mt-5 text-[14px] text-muted">
        Full field reference:{' '}
        <a href={GEMINI_DOCS} target="_blank" rel="noreferrer" className="font-medium text-brand hover:text-brand-hover">
          Google Gemini API docs
        </a>
        . Auth examples use either mode — swap headers as needed.
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
