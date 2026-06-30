import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { ReactNode } from 'react'

interface EmailLayoutProps {
  /** Plain-text preview line shown in the inbox row. */
  preview: string
  /** Body content — pre-styled blocks (Text, Section, etc.) from the template. */
  children: ReactNode
  /** Localises the footer copy. Defaults to 'en'. */
  locale?: 'en' | 'ja'
}

/**
 * Shared shell for all transactional Ralph emails.
 *
 * Renders a hot-pink header strip with the wordmark, a white content card,
 * and a subdued footer with the support address + plain copyright. Every
 * style is inlined (Outlook + most webmails ignore <style>) and the layout
 * sticks to nested <table>-equivalent <Section> blocks so it survives any
 * email client.
 *
 * Brand image is pulled from APP_URL (NEXT_PUBLIC_APP_URL on Railway,
 * falling back to ralph.world post-DNS-cutover). Falling back keeps the
 * header working in test/dev where the env var isn't set.
 */
export function EmailLayout({ preview, children, locale = 'en' }: EmailLayoutProps) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://ralph.world'
  const wordmarkSrc = `${appUrl}/ralph-wordmark.png`
  const year = new Date().getFullYear()
  const isJa = locale === 'ja'
  const signOff = isJa ? '— Ralph Creative Tokyo' : '— The Ralph Team'
  const supportEmail = isJa ? 'tokyo@ralphandco.com' : 'hello@ralph.world'
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={outer}>
          <Section style={headerBar}>
            <Link href={appUrl} style={headerLink}>
              <Img
                src={wordmarkSrc}
                alt="Ralph"
                width="120"
                style={wordmark}
              />
            </Link>
          </Section>

          <Section style={card}>{children}</Section>

          <Section style={footerWrap}>
            <Text style={footerSig}>{signOff}</Text>
            <Text style={footerMeta}>
              {isJa ? 'ご質問は ' : 'Questions? Drop us a line at '}
              <Link href={`mailto:${supportEmail}`} style={footerLink}>
                {supportEmail}
              </Link>
              {isJa ? ' までお気軽にどうぞ。' : '.'}
            </Text>
            <Text style={footerLegal}>
              © {year} Ralph.World · {appUrl.replace(/^https?:\/\//, '')}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────
// Brand palette: pink #EA128B, ink #0B0B0B, ivory background.

const body = {
  margin: 0,
  padding: '24px 16px',
  backgroundColor: '#F5F2EC',
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  color: '#0B0B0B',
}

const outer = {
  margin: '0 auto',
  maxWidth: '560px',
  width: '100%',
}

const headerBar = {
  backgroundColor: '#EA128B',
  borderRadius: '12px 12px 0 0',
  padding: '24px',
  textAlign: 'center' as const,
}

const headerLink = {
  display: 'inline-block',
  textDecoration: 'none',
}

const wordmark = {
  display: 'block',
  height: 'auto',
  margin: '0 auto',
}

const card = {
  backgroundColor: '#FFFFFF',
  borderLeft: '2px solid #0B0B0B',
  borderRight: '2px solid #0B0B0B',
  borderBottom: '2px solid #0B0B0B',
  borderTop: '2px solid #0B0B0B',
  borderRadius: '0 0 12px 12px',
  padding: '32px 28px',
}

const footerWrap = {
  padding: '20px 8px 8px',
  textAlign: 'center' as const,
}

const footerSig = {
  fontSize: '14px',
  fontWeight: 600,
  margin: '0 0 12px',
  color: '#0B0B0B',
}

const footerMeta = {
  fontSize: '13px',
  color: '#6B5B8A',
  margin: '0 0 12px',
  lineHeight: 1.5,
}

const footerLegal = {
  fontSize: '11px',
  color: '#8A7AA8',
  margin: 0,
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
}

const footerLink = {
  color: '#EA128B',
  textDecoration: 'underline',
}

// ── Shared content-style helpers ───────────────────────────────────────
// Templates importing this layout should pull these helpers so the body
// content sits on a consistent type scale and link colour.

export const styles = {
  h1: {
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: '26px',
    fontWeight: 700,
    lineHeight: 1.25,
    margin: '0 0 16px',
    color: '#0B0B0B',
    letterSpacing: '-0.01em',
  },
  paragraph: {
    fontSize: '16px',
    lineHeight: 1.55,
    margin: '0 0 14px',
    color: '#0B0B0B',
  },
  detail: {
    fontSize: '14px',
    lineHeight: 1.6,
    margin: '0 0 12px',
    color: '#3D2560',
  },
  link: {
    color: '#EA128B',
    textDecoration: 'underline',
  },
  buttonWrap: {
    margin: '24px 0 8px',
    textAlign: 'center' as const,
  },
  button: {
    display: 'inline-block',
    backgroundColor: '#EA128B',
    color: '#FFFFFF',
    padding: '12px 24px',
    borderRadius: '999px',
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: '14px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  },
  divider: {
    border: 'none',
    borderTop: '2px solid #0B0B0B',
    margin: '20px 0',
    width: '40%',
  },
} as const
