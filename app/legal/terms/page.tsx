import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Terms and conditions for using Ralph.world — the magazine, TV, events, shop, and member portal.',
}

/**
 * Terms of Service — Task 3.10.
 *
 * Scaffold placeholder. Sections marked [LEGAL: review] need a solicitor
 * to drop final copy. Do NOT ship this to production without that pass.
 * Last reviewed: 2026-06-10.
 */
export default function TermsPage() {
  return (
    <article>
      <h1>Terms of Service</h1>
      <p className="text-black/60 text-sm">
        Last updated:{' '}
        <strong>
          [LEGAL: insert effective date — must match POLICY_VERSION in
          lib/consent.ts]
        </strong>
      </p>

      <h2>1. Who we are</h2>
      <p>
        <strong>[LEGAL: insert legal entity name]</strong> (&quot;Ralph&quot;,
        &quot;we&quot;) operates ralph.world, a culture magazine and member
        platform. You can reach us at{' '}
        <a href="mailto:hello@ralph.world">hello@ralph.world</a>.
      </p>
      <p>
        <strong>
          [LEGAL: company number, registered office, VAT number if applicable]
        </strong>
      </p>

      <h2>2. Accepting these terms</h2>
      <p>
        By creating an account, subscribing, or using ralph.world you agree to
        these terms. If you don&apos;t agree, please don&apos;t use the site.
        We may update these terms — material changes are flagged on this page
        and (for account holders) emailed in advance.
      </p>

      <h2>3. Your account</h2>
      <p>
        You&apos;re responsible for keeping your password safe and for any
        activity from your account. Tell us promptly if you suspect
        unauthorised use. You must be 13 or older to create an account.
      </p>

      <h2>4. Subscriptions and billing</h2>
      <p>
        <strong>[LEGAL: review against current Stripe ToS + UK CMA guidance]</strong>{' '}
        Paid subscriptions are charged quarterly via Stripe at the rate shown
        at checkout. Your subscription auto-renews until you cancel. Cancel
        from the member portal at any time; access continues until the end of
        your paid period.
      </p>
      <p>
        Refunds are at our discretion within 14 days of purchase, in line
        with UK consumer contract regulations. Email{' '}
        <a href="mailto:hello@ralph.world">hello@ralph.world</a> to request
        one.
      </p>

      <h2>5. Magazine delivery</h2>
      <p>
        Paid subscribers receive a printed magazine each issue, posted to the
        address on file. <strong>[LEGAL: shipping geography limits, delays]</strong>
      </p>

      <h2>6. Acceptable use</h2>
      <ul>
        <li>Don&apos;t break the law on or via the site.</li>
        <li>Don&apos;t scrape, automate, or rate-abuse the platform.</li>
        <li>Don&apos;t impersonate someone else.</li>
        <li>
          Don&apos;t upload content you don&apos;t have rights to (if/when
          uploads exist).
        </li>
      </ul>

      <h2>7. Content and IP</h2>
      <p>
        All articles, images, video, and design on ralph.world are owned by
        Ralph or licensed to us. You may share links and short quotes with
        attribution; reproduction beyond fair-use limits requires our written
        permission. <strong>[LEGAL: confirm IP / licence terms]</strong>
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        Ralph.world is provided &quot;as is.&quot; We don&apos;t promise the
        service will be uninterrupted, error-free, or fit for any particular
        purpose beyond what UK consumer law requires.
      </p>

      <h2>9. Liability</h2>
      <p>
        <strong>
          [LEGAL: limitation-of-liability clause — UK CMA / Consumer Rights
          Act compliant]
        </strong>
      </p>

      <h2>10. Termination</h2>
      <p>
        You may close your account at any time from the member portal (or by
        emailing us). We may suspend or terminate accounts that breach these
        terms, after notice where reasonable.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These terms are governed by{' '}
        <strong>[LEGAL: jurisdiction — England & Wales by default]</strong>.
        Disputes go to the courts of that jurisdiction.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these terms? Email{' '}
        <a href="mailto:hello@ralph.world">hello@ralph.world</a>.
      </p>
    </article>
  )
}
