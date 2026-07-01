import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Ralph collects, uses, and protects your personal data — UK GDPR compliant.',
}

/**
 * Privacy Notice — final copy dated 01 July 2026.
 *
 * Note: consent-tracking POLICY_VERSION in lib/consent.ts is intentionally
 * NOT bumped for this update. If a future edit is materially different
 * (new lawful basis, new processor category, expanded data collection),
 * bump POLICY_VERSION so existing users are re-prompted.
 */
export default function PrivacyPage() {
  return (
    <article>
      <h1>Privacy Policy</h1>
      <p className="text-black/60 text-sm">
        Last updated: <strong>01 July 2026</strong>
      </p>

      <p>
        This policy explains what personal data ralph.world collects about
        you, why we collect it, how long we keep it, and the rights you have
        over it. It applies to everyone who visits the site, has an account,
        or subscribes.
      </p>

      <h2>1. Who&apos;s responsible (the data controller)</h2>
      <p>
        Ralph Creative Limited (&ldquo;Ralph&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;), company number 05638038, registered at 27-33
        Bethnal Green Road, London, E1 6LA. We&apos;re the
        &ldquo;controller&rdquo; of your data under UK GDPR.
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
            <td>
              Consent log: indefinite (legal record); opt-in flag: until
              withdrawn or account deleted
            </td>
          </tr>
          <tr>
            <td>Cookie preferences</td>
            <td>Remember your choice</td>
            <td>
              Consent (for analytics) / Legitimate interest (for necessary)
            </td>
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
          <tr>
            <td>IP address, device/browser data, security and audit logs</td>
            <td>
              Detect and prevent fraud, abuse, and security incidents; keep
              an audit trail of sensitive account actions
            </td>
            <td>Legitimate interest</td>
            <td>12 months from collection</td>
          </tr>
          <tr>
            <td>Support correspondence (emails to hello@ralph.world)</td>
            <td>Respond to your questions and rights requests</td>
            <td>Legitimate interest</td>
            <td>24 months after the issue is resolved</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Who we share it with</h2>
      <p>
        We share personal data with the service providers below, who process
        it on our behalf and under our instructions (as
        &ldquo;processors&rdquo; under UK GDPR), each bound by a data
        processing agreement.
      </p>
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
          <strong>Resend</strong> — transactional email delivery
          (verification, receipts, RSVP confirmations).
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
        We don&apos;t sell your data. We don&apos;t share it with anyone
        else unless required by law.
      </p>

      <h2>4. International transfers</h2>
      <p>
        Several of our processors operate outside the UK, including Stripe,
        Sentry, Resend, Mailchimp, Cloudflare, Railway, and Google. Where we
        transfer your data outside the UK, we rely on the UK&apos;s adequacy
        regulations (for transfers to the EU) or on Standard Contractual
        Clauses / the International Data Transfer Addendum (for transfers
        elsewhere, including the US) which require the recipient to protect
        your data to UK standards.
      </p>

      <h2>5. Your rights under UK GDPR</h2>
      <p>You have the right to:</p>
      <ul>
        <li>
          <strong>Access</strong> — get a copy of the data we hold about
          you. Use &ldquo;Download my data&rdquo; in your account, or email{' '}
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
          <strong>Portability</strong> — get the data you&apos;ve given us
          in a structured, commonly used, machine-readable format, or ask
          us to send it directly to another provider where that&apos;s
          technically feasible.
        </li>
        <li>
          <strong>Automated decisions</strong> — we don&apos;t make any
          decisions about you based solely on automated processing that have
          a legal or similarly significant effect on you.
        </li>
        <li>
          <strong>Withdraw consent</strong> — unsubscribe from marketing or
          revoke cookies at any time via the account page or the
          &ldquo;Cookie preferences&rdquo; link in the footer.
        </li>
        <li>
          <strong>Complain</strong> — to the UK ICO at{' '}
          <a href="https://ico.org.uk/">ico.org.uk</a>.
        </li>
      </ul>
      <p>
        We&apos;ll respond to rights requests within 30 days. To exercise
        any of these, email{' '}
        <a href="mailto:hello@ralph.world">hello@ralph.world</a>.
      </p>

      <h2>6. Children&apos;s privacy</h2>
      <p>
        If you&apos;re under 13, a parent or guardian needs to confirm
        they&apos;re aware of and consent to your use of ralph.world before
        you create an account, as set out in our Terms of Service. We may
        ask for that confirmation directly. We don&apos;t collect additional
        categories of data from children, use children&apos;s data for
        marketing, or show them targeted advertising. A parent or guardian
        can exercise any of the rights in section 5 on a child&apos;s behalf
        by emailing{' '}
        <a href="mailto:hello@ralph.world">hello@ralph.world</a>.
      </p>

      <h2>7. Cookies</h2>
      <p>
        See our <a href="/legal/cookies">Cookies page</a> for the full list
        and how to change your preferences.
      </p>

      <h2>8. Security</h2>
      <p>
        Passwords are hashed (bcrypt). Database access is role-segregated.
        All traffic is TLS. Production data is encrypted at rest by our
        hosting provider. We log sensitive actions to an append-only audit
        trail. We don&apos;t store payment card details — Stripe handles
        those directly. If a security incident puts your personal data at
        risk, we&apos;ll notify the ICO within the timescales UK GDPR
        requires and tell affected users without undue delay where
        there&apos;s a high risk to your rights and freedoms.
      </p>

      <h2>9. Changes to this policy</h2>
      <p>
        Material changes are flagged on this page and (for account holders)
        emailed in advance. Minor wording fixes don&apos;t trigger a notice.
      </p>

      <h2>10. Contact</h2>
      <p>
        Privacy questions, rights requests, or anything you&apos;d like
        clarified:{' '}
        <a href="mailto:hello@ralph.world">hello@ralph.world</a>. If you
        have a complaint about how we&apos;ve handled your data, email us
        there first and we&apos;ll try to resolve it directly before you
        escalate to the ICO.
      </p>
    </article>
  )
}
