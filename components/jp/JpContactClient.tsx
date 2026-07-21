'use client'

import { useState } from 'react'

// Stable keys — must match the server's NEEDS_LABELS / PROJECT_SIZE_LABELS
// in app/api/contact/jp/route.ts. Display labels can be rewritten freely
// here without disturbing historical rows because only the keys are stored.
const NEEDS_OPTIONS = [
  { key: 'branding_strategy', label: 'ブランディング・\nクリエイティブ戦略' },
  { key: 'campaign_promotion', label: 'キャンペーン・\nプロモーション企画' },
  { key: 'content_production', label: 'コンテンツ制作\n（動画・静止画・コピー）' },
  { key: 'sns_management', label: 'SNS運用・\nソーシャルコミュニケーション' },
  { key: 'influencer_casting', label: 'インフルエンサー・\nタレントキャスティング' },
  { key: 'not_sure', label: 'まだ決まっていない・\nまず話したい' },
] as const

const PROJECT_SIZE_OPTIONS = [
  { key: 'spot_under_1m', label: 'スポット・単発\n（〜100万円程度）' },
  { key: 'mid_1m_5m', label: '中規模プロジェクト\n（100〜500万円）' },
  { key: 'large_over_5m', label: '大型・継続案件\n（500万円〜）' },
  { key: 'undecided', label: '未定・まずは相談したい' },
] as const

type NeedKey = (typeof NEEDS_OPTIONS)[number]['key']
type SizeKey = (typeof PROJECT_SIZE_OPTIONS)[number]['key']

export default function JpContactClient() {
  const [needs, setNeeds] = useState<Set<NeedKey>>(new Set())
  const [size, setSize] = useState<Set<SizeKey>>(new Set())
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  // Honeypot — bots fill this; humans never see it.
  const [hpField, setHpField] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleNeed(k: NeedKey) {
    setNeeds((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }
  function toggleSize(k: SizeKey) {
    setSize((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Client-side guard — server validates again.
    if (needs.size === 0) {
      setError('ご相談内容を1つ以上選択してください。')
      return
    }
    if (size.size === 0) {
      setError('プロジェクトの規模感を1つ以上選択してください。')
      return
    }
    if (!name.trim()) {
      setError('お名前を入力してください。')
      return
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('有効なメールアドレスを入力してください。')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/contact/jp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          needs: Array.from(needs),
          projectSize: Array.from(size),
          name: name.trim(),
          company: company.trim() || undefined,
          email: email.trim(),
          message: message.trim() || undefined,
          hp_field: hpField,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? '送信エラー — もう一度お試しください。')
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信エラー — もう一度お試しください。')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success state ────────────────────────────────────────────────────
  if (submitted) {
    return (
      <main>
        <section className="relative" style={{ minHeight: 'calc(100svh - 200px)' }}>
          <PinkPlanetTop />
          <div className="relative z-10 pb-24" style={{ paddingTop: 200 }}>
            <div className="max-w-3xl mx-auto px-6 text-center">
              <p style={eyebrowStyle}>ご相談ありがとうございます</p>
              <h1 style={h1Style} className="mb-4">
                ご連絡いただきありがとうございます
              </h1>
              <hr style={dividerStyle} />
              <p className="text-black/80 text-base leading-relaxed" style={bodyStyle}>
                ご相談内容を受け付けました。通常2営業日以内に担当よりご連絡いたします。まずはカジュアルに話しましょう。
              </p>
            </div>
          </div>
        </section>
      </main>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────
  return (
    <main>
      <section className="relative" style={{ minHeight: 'calc(100svh - 200px)' }}>
        {/* Pink planet top (creative) + white fill — same layout as the
            magazine/events section pages. */}
        <PinkPlanetTop />

        {/* Content */}
        <div className="relative z-10 pb-24" style={{ paddingTop: 200 }}>
          <div className="max-w-3xl mx-auto px-6">
            <header className="mb-12">
              <p style={eyebrowStyle} className="mb-2">
                お気軽にご相談ください
              </p>
            </header>

        <form onSubmit={handleSubmit} className="space-y-14">
          {/* Q1 */}
          <section>
            <h2 style={h2Style} className="mb-2">
              どんなことでお悩みですか？
            </h2>
            <p style={helperStyle} className="mb-6">
              複数選んでいただいても構いません。「まだわからない」も立派な回答です。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {NEEDS_OPTIONS.map((opt) => (
                <OptionCell
                  key={opt.key}
                  label={opt.label}
                  selected={needs.has(opt.key)}
                  onToggle={() => toggleNeed(opt.key)}
                />
              ))}
            </div>
          </section>

          <hr style={hairlineStyle} />

          {/* Q2 */}
          <section>
            <h2 style={h2Style} className="mb-2">
              プロジェクトの規模感を教えてください
            </h2>
            <p style={helperStyle} className="mb-6">
              最適なご提案のために参考にします。未定でも大丈夫です。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PROJECT_SIZE_OPTIONS.map((opt) => (
                <OptionCell
                  key={opt.key}
                  label={opt.label}
                  selected={size.has(opt.key)}
                  onToggle={() => toggleSize(opt.key)}
                />
              ))}
            </div>
          </section>

          <hr style={hairlineStyle} />

          {/* Q3 — contact details */}
          <section>
            <h2 style={h2Style} className="mb-6">
              ご連絡先を教えてください
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="お名前"
                  required
                  maxLength={200}
                  className={inputCls}
                  aria-label="お名前"
                />
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="会社名・ブランド名（任意）"
                  maxLength={200}
                  className={inputCls}
                  aria-label="会社名・ブランド名"
                />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="メールアドレス"
                required
                maxLength={320}
                className={inputCls}
                aria-label="メールアドレス"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="一言あれば。なんとなくで大丈夫です。"
                rows={5}
                maxLength={4000}
                className={`${inputCls} resize-y`}
                aria-label="メッセージ"
              />
            </div>

            {/* Honeypot — visually hidden but in the DOM. Real users won't
                see/tab to it; bots that auto-fill forms typically will. */}
            <div
              aria-hidden="true"
              style={{ position: 'absolute', left: '-10000px', height: 0, overflow: 'hidden' }}
            >
              <label>
                Leave this field empty
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={hpField}
                  onChange={(e) => setHpField(e.target.value)}
                />
              </label>
            </div>
          </section>

          {/* Error surface — sits above the submit button when present */}
          {error && (
            <p
              role="alert"
              className="text-sm text-ralph-pink font-semibold text-center"
            >
              {error}
            </p>
          )}

          {/* Submit — pink shadow button (pink fill, black text/frame/shadow) */}
          <div className="relative w-full">
            <div
              className="absolute inset-0 translate-x-1 translate-y-1 bg-black"
              aria-hidden="true"
            />
            <button
              type="submit"
              disabled={submitting}
              className={`${submitting ? '' : 'btn-press'} relative w-full border-2 border-black bg-ralph-pink text-black text-center py-6 text-lg font-semibold tracking-wide disabled:opacity-50`}
            >
              {submitting ? '送信中…' : '相談してみる →'}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500" style={helperStyle}>
            通常2営業日以内にご連絡します。まずはカジュアルに話しましょう。
          </p>
        </form>
          </div>
        </div>
      </section>
    </main>
  )
}

/** Pink planet top + white fill — the shared section-page decoration
    (creative planet is ralph-pink), used by both page states. */
function PinkPlanetTop() {
  return (
    <div className="absolute inset-0 z-0">
      <div className="relative w-full" style={{ height: 270 }}>
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 h-full planet-bg-cover"
          style={{
            backgroundImage: 'url(/imgs/planet_background_creative.svg)',
            backgroundPosition: 'top center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            width: '100%',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 h-full pointer-events-none planet-bg-cover"
          style={{
            backgroundImage: 'url(/imgs/planet_foreground_creative.svg)',
            backgroundPosition: 'top center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            width: '100%',
          }}
          aria-hidden="true"
        />
      </div>
      <div className="absolute bg-white" style={{ top: 270, left: 0, right: 0, bottom: 0 }} />
    </div>
  )
}

/** One option box in either choice grid. Pink when selected, white border-only when not. */
function OptionCell({
  label,
  selected,
  onToggle,
}: {
  label: string
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`text-center px-4 py-5 border-2 transition-colors whitespace-pre-line leading-tight ${
        selected
          ? 'bg-ralph-pink text-black border-ralph-pink'
          : 'bg-white text-black border-gray-300 hover:border-black'
      }`}
      style={{
        fontFamily: 'var(--font-body), Arial, sans-serif',
        fontWeight: 600,
        fontSize: 14,
        letterSpacing: 0,
      }}
    >
      {label}
    </button>
  )
}

const inputCls =
  'w-full bg-white border-2 border-gray-300 rounded-sm px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:border-ralph-pink focus:outline-none transition-colors'

const eyebrowStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body), Arial, sans-serif',
  fontSize: 13,
  color: '#EA128B',
  fontWeight: 600,
  letterSpacing: '0.04em',
}
const h1Style: React.CSSProperties = {
  fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
  fontWeight: 600,
  fontSize: 32,
  lineHeight: 1.2,
  color: '#0B0B0B',
  letterSpacing: '-0.01em',
}
const h2Style: React.CSSProperties = {
  fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
  fontWeight: 600,
  fontSize: 22,
  lineHeight: 1.3,
  color: '#0B0B0B',
}
const helperStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body), Arial, sans-serif',
  fontSize: 13,
  color: '#6B5B8A',
  lineHeight: 1.6,
}
const bodyStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body), Arial, sans-serif',
}
const dividerStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '2px solid #0B0B0B',
  width: 80,
  margin: '20px auto',
}
const hairlineStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #E4DED1',
}
