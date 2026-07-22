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
  // The link back to the site is fine as ralph.world once DNS cuts
  // over. But the wordmark <img> needs a URL that resolves TODAY, or
  // Gmail shows an empty pink bar and testers see "no logo in the
  // header". Default the image host to the Railway URL (always live)
  // and only fall back to the linkUrl host if EMAIL_ASSET_URL is set
  // (post-cutover we can drop this override).
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://ralph.world'
  const assetHost =
    process.env.EMAIL_ASSET_URL?.trim() ||
    'https://ralph-world-production.up.railway.app'
  // White wordmark — the header bar is brand pink, so the pink wordmark
  // would be invisible against it.
  const wordmarkSrc = `${assetHost}/ralph-wordmark-white-240.png` // 240px source, rendered at 120 (2x)
  const year = new Date().getFullYear()
  const isJa = locale === 'ja'
  const signOff = isJa ? '— Ralph Creative Tokyo' : '— The Ralph Team'
  const supportEmail = isJa ? 'tokyo@ralphandco.com' : 'hello@ralph.world'
  // Scoped @font-face for the Gooper display font used on titles + CTAs.
  // Only clients that keep <head> styles AND support web fonts (Apple Mail,
  // iOS Mail) render Gooper; Gmail/Outlook ignore it and fall back to serif
  // (the fallback is baked into the h1/button font stacks). Served from the
  // deployed asset host, same as the wordmark.
  const fontFaceCss = `@font-face {
  font-family: 'Gooper Trial';
  src: url('${assetHost}/fonts/Gooper7-SemiBold.woff2') format('woff2'),
       url('${assetHost}/fonts/Gooper7-SemiBold.woff') format('woff');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}`
  return (
    <Html>
      <Head>
        <style dangerouslySetInnerHTML={{ __html: fontFaceCss }} />
      </Head>
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
              © {year} Ralph.World ·{' '}
              <Link href="https://ralph.world/" style={footerLink}>
                ralph.world
              </Link>
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
  textAlign: 'left' as const,
}

const headerLink = {
  display: 'inline-block',
  textDecoration: 'none',
}

const wordmark = {
  display: 'block',
  height: 'auto',
  margin: 0,
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
    fontFamily: "'Gooper Trial', \"Helvetica Neue\", Helvetica, Arial, sans-serif",
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
    // Equal gap above and below the CTA.
    margin: '24px 0',
    textAlign: 'center' as const,
  },
  // Mirrors the site's shadow button: pink fill, black text, black border and
  // a hard black offset "shadow". box-shadow + border-radius are honoured by
  // modern clients (Apple Mail, iOS, Gmail web/app); Outlook desktop ignores
  // both, so it degrades to a flat pink button with a solid black border —
  // still on-brand.
  button: {
    display: 'inline-block',
    fontFamily: "'Gooper Trial', \"Helvetica Neue\", Helvetica, Arial, sans-serif",
    backgroundColor: '#EA128B',
    color: '#000000',
    padding: '12px 24px',
    border: '2px solid #000000',
    boxShadow: '4px 4px 0 #000000',
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
