import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Ralph collects, uses, and protects your personal data — UK GDPR compliant.',
}

/**
 * Privacy Policy — Task 3.10.
 *
 * Scaffold placeholder. Sections marked [LEGAL: review] need a solicitor
 * to drop final copy. The factual sections (what we store, how long,
 * who we share with) are accurate based on the current architecture and
 * should NOT be edited without checking those reflect reality.
 * Last reviewed: 2026-06-10.
 */
export default function PrivacyPage() {
  return (
    <article>
      <h1>Privacy Policy</h1>
      <p className="text-white/60 text-sm">
        Last updated:{' '}
        <strong>
          [LEGAL: insert effective date — must match POLICY_VERSION in
          lib/consent.ts]
        </strong>
      </p>

      <p>
        This policy explains what personal data ralph.world collects about
        you, why we collect it, how long we keep it, and the rights you have
        over it. It applies to everyone who visits the site, has an account,
        or subscribes.
      </p>

      <h2>1. Who&apos;s responsible (the data controller)</h2>
      <p>
        <strong>
          [LEGAL: insert legal entity name, registered address, ICO
          registration number if applicable]
        </strong>
        . We&apos;re the &quot;controller&quot; of your data under UK GDPR.
      </p>

      <h2>2. What data we collect, why, and the lawful basis</h2>
      <table>
        <thead>
          <tr>
            <th>What</th>
            <th>Why</th>
            <th>Lawful basis</th>
            <th>Retention</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Email, name, hashed password</td>
            <td>Account creation and sign-in</td>
            <td>Contract</td>
            <td>Until account deletion</td>
          </tr>
          <tr>
            <td>Subscription status, Stripe customer ID, billing period</td>
            <td>Manage your subscription</td>
            <td>Contract</td>
            <td>Until account deletion + 6 years (UK tax retention)</td>
          </tr>
          <tr>
            <td>Shipping address</td>
            <td>Post the magazine to you</td>
            <td>Contract</td>
            <td>Until account deletion</td>
          </tr>
          <tr>
            <td>Marketing opt-in flag + consent log</td>
            <td>Newsletter sends (opt-in only)</td>
            <td>Consent</td>
            <td>Consent log: indefinite (legal record); opt-in flag: until withdrawn or account deleted</td>
          </tr>
          <tr>
            <td>Cookie preferences</td>
            <td>Remember your choice</td>
            <td>Consent (for analytics) / Legitimate interest (for necessary)</td>
            <td>12 months</td>
          </tr>
          <tr>
            <td>Event RSVP records</td>
            <td>Confirm you&apos;re on the guest list</td>
            <td>Contract / Legitimate interest</td>
            <td>Until 6 months after the event</td>
          </tr>
          <tr>
            <td>Error reports (Sentry)</td>
            <td>Diagnose bugs</td>
            <td>Consent (cookies_all only)</td>
            <td>90 days</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Who we share it with</h2>
      <ul>
        <li>
          <strong>Stripe</strong> — subscription billing.{' '}
          <a href="https://stripe.com/privacy">stripe.com/privacy</a>
        </li>
        <li>
          <strong>Shopify</strong> — shop orders and magazine fulfilment.{' '}
          <a href="https://www.shopify.com/legal/privacy">
            shopify.com/legal/privacy
          </a>
        </li>
        <li>
          <strong>Resend</strong> — transactional email delivery (verification,
          receipts, RSVP confirmations).
        </li>
        <li>
          <strong>Mailchimp</strong> — marketing newsletter (only if you
          opted in).
        </li>
        <li>
          <strong>Cloudflare R2</strong> — image storage and CDN.
        </li>
        <li>
          <strong>Railway</strong> — application hosting + database.
        </li>
        <li>
          <strong>Sentry</strong> — error reporting (only if you accepted
          analytics cookies).
        </li>
        <li>
          <strong>Google OAuth</strong> — sign-in if you choose Google.
        </li>
        <li>
          <strong>Newsstand</strong> — magazine printing and distribution.
        </li>
      </ul>
      <p>
        We don&apos;t sell your data. We don&apos;t share it with anyone else
        unless required by law.
      </p>

      <h2>4. International transfers</h2>
      <p>
        Some processors (Stripe, Sentry, Resend) operate from the US under
        the UK/EU adequacy decisions or with Standard Contractual Clauses.{' '}
        <strong>[LEGAL: confirm current adequacy status per processor]</strong>
      </p>

      <h2>5. Your rights under UK GDPR</h2>
      <p>You have the right to:</p>
      <ul>
        <li>
          <strong>Access</strong> — get a copy of the data we hold about
          you. Use &quot;Download my data&quot; in your account, or email{' '}
          <a href="mailto:hello@ralph.world">hello@ralph.world</a>.
        </li>
        <li>
          <strong>Rectify</strong> — correct anything wrong. Edit in your
          account or email us.
        </li>
        <li>
          <strong>Erase</strong> — delete your account from your account
          page. Subscription billing history and consent records are kept
          under the lawful bases above; everything else is removed.
        </li>
        <li>
          <strong>Restrict / object</strong> — pause specific processing
          (e.g. marketing) without deleting your account.
        </li>
        <li>
          <strong>Withdraw consent</strong> — unsubscribe from marketing or
          revoke cookies at any time via the account page or the &quot;Cookie
          preferences&quot; link in the footer.
        </li>
        <li>
          <strong>Complain</strong> — to the UK ICO at{' '}
          <a href="https://ico.org.uk/make-a-complaint/">ico.org.uk</a>.
        </li>
      </ul>
      <p>
        We&apos;ll respond to rights requests within 30 days. To exercise
        any of these, email{' '}
        <a href="mailto:hello@ralph.world">hello@ralph.world</a>.
      </p>

      <h2>6. Cookies</h2>
      <p>
        See our{' '}
        <a href="/legal/cookies">Cookies page</a> for the full list and how
        to change your preferences.
      </p>

      <h2>7. Security</h2>
      <p>
        Passwords are hashed (bcrypt). Database access is role-segregated.
        All traffic is TLS. Production data is encrypted at rest by our
        hosting provider. We log sensitive actions to an append-only audit
        trail. We don&apos;t store payment card details — Stripe handles
        those directly.
      </p>

      <h2>8. Changes to this policy</h2>
      <p>
        Material changes are flagged on this page and (for account holders)
        emailed in advance. Minor wording fixes don&apos;t trigger a notice.
      </p>

      <h2>9. Contact</h2>
      <p>
        Privacy questions, rights requests, or anything you&apos;d like
        clarified: <a href="mailto:hello@ralph.world">hello@ralph.world</a>.
      </p>
    </article>
  )
}
