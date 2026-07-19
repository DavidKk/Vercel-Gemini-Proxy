import './home.css'

import Link from 'next/link'

import { BrandLogo } from '@/components/BrandLogo'

export default function HomePage() {
  return (
    <main className="home-page min-h-full">
      <section className="relative isolate min-h-[100dvh] overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(80% 60% at 70% 0%, var(--glow), transparent 55%), linear-gradient(160deg, #f5f7fb 0%, #e9eef6 55%, #e4ebf4 100%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.28]"
          style={{
            backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'linear-gradient(90deg, black 0%, black 42%, transparent 78%)',
          }}
        />

        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] border-l border-white/10 bg-panel lg:block">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background:
                'radial-gradient(60% 40% at 30% 20%, rgba(14,116,144,0.35), transparent 60%), radial-gradient(50% 50% at 80% 80%, rgba(56,189,248,0.12), transparent 55%)',
            }}
          />
          <div className="relative flex h-full flex-col justify-center px-10 py-16 xl:px-14">
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-panel-muted">Live stream preview</p>
            <div className="mt-8 space-y-3 font-mono text-[13px] leading-relaxed text-panel-fg">
              <p className="home-stream-line text-panel-muted">POST /api/v1beta/models/gemini-2.5-flash:streamGenerateContent</p>
              <p className="home-stream-line">
                <span className="text-cyan-300/90">data:</span> {'{'}&quot;text&quot;:&quot;Proxy online.&quot;{'}'}
              </p>
              <p className="home-stream-line">
                <span className="text-cyan-300/90">data:</span> {'{'}&quot;text&quot;:&quot; Tokens arriving…&quot;{'}'}
              </p>
              <p className="home-stream-line text-panel-muted">HTTP/1.1 200 · text/event-stream</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl items-center px-6 py-20 lg:py-24">
          <div className="max-w-xl lg:max-w-[28rem] xl:max-w-xl">
            <div className="home-animate-1 flex items-center gap-3">
              <BrandLogo size={40} priority className="shadow-sm ring-1 ring-black/10" />
              <p className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Gemini Relay</p>
            </div>
            <h1 className="home-animate-2 font-display mt-5 text-[2.55rem] font-semibold leading-[1.05] tracking-tight text-primary sm:text-5xl lg:text-[3.25rem]">
              Route Gemini.
              <br />
              Debug with intent.
            </h1>
            <p className="home-animate-3 mt-5 max-w-md text-[15px] leading-relaxed text-muted">
              A lean API proxy plus a local playground for streaming chat—keys stay in this browser only.
            </p>
            <div className="home-animate-4 mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/chat"
                className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                Open Playground
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center justify-center rounded-md border border-border bg-white/80 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:border-brand hover:text-brand-hover"
              >
                Settings
              </Link>
            </div>

            <div aria-hidden className="relative left-1/2 mt-14 w-screen -translate-x-1/2 border-y border-white/10 bg-panel px-6 py-6 lg:hidden">
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-panel-muted">Live stream preview</p>
              <div className="mt-4 space-y-2 font-mono text-[11px] leading-relaxed text-panel-fg">
                <p className="home-stream-line text-panel-muted">POST …:streamGenerateContent</p>
                <p className="home-stream-line">
                  <span className="text-cyan-300/90">data:</span> Proxy online.
                </p>
                <p className="home-stream-line text-panel-muted">200 · text/event-stream</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-t border-border bg-white/70">
        <div className="mx-auto grid w-full max-w-6xl gap-14 px-6 py-16 lg:grid-cols-2 lg:gap-20 lg:py-20">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">How to use</h2>
            <p className="mt-2 text-sm text-muted">Three steps to exercise the proxy stream.</p>
            <ol className="mt-8 space-y-5 text-sm leading-relaxed">
              <li className="grid grid-cols-[2.25rem_1fr] gap-2">
                <span className="font-display text-sm font-semibold text-brand">01</span>
                <span>Open Playground → Settings, enter your API key, and save.</span>
              </li>
              <li className="grid grid-cols-[2.25rem_1fr] gap-2">
                <span className="font-display text-sm font-semibold text-brand">02</span>
                <span>Return to chat, refresh models, and pick a model.</span>
              </li>
              <li className="grid grid-cols-[2.25rem_1fr] gap-2">
                <span className="font-display text-sm font-semibold text-brand">03</span>
                <span>Send a message to test streaming; Clear resets the session.</span>
              </li>
            </ol>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">API quick start</h2>
            <p className="mt-2 text-sm text-muted">
              Paths under <code className="text-primary">/api/v1beta</code>. Pass-through with <code className="text-primary">key</code> /{' '}
              <code className="text-primary">x-goog-api-key</code>, or proxy mode with headers from <code className="text-primary">PROXY_AUTH_HEADERS</code> (e.g.{' '}
              <code className="text-primary">X-API-KEY</code>).
            </p>
            <pre className="mt-6 overflow-x-auto border border-border bg-canvas px-4 py-3 font-mono text-xs leading-relaxed">
              {`curl "$HOST/api/v1beta/models?key=$GEMINI_API_TOKEN"`}
            </pre>
          </div>
        </div>
      </section>
    </main>
  )
}
