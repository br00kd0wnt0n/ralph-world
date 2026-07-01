import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Terms and conditions for using Ralph.world — the magazine, TV, events, shop, and member portal.',
}

/**
 * Terms of Service — final copy dated 01 July 2026.
 *
 * See lib/consent.ts POLICY_VERSION notes in privacy/page.tsx for the
 * consent-versioning trade-off if this policy changes materially again.
 */
export default function TermsPage() {
  return (
    <article>
      <h1>Terms of Service</h1>
      <p className="text-black/60 text-sm">
        Last updated: <strong>01 July 2026</strong>
      </p>

      <h2>1. Who we are</h2>
      <p>
        Ralph Creative Limited (&ldquo;Ralph&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;), registered with company number 05638038 at 27-33
        Bethnal Green Rd, London, E1 6LA operates ralph.world, a culture
        magazine and member platform. You can reach us at{' '}
        <a href="mailto:hello@ralph.world">hello@ralph.world</a>.
      </p>
      <p>
        These terms incorporate our Privacy Notice and Cookie Notice by
        reference. By using ralph.world you also agree to those policies,
        which explain how we handle your personal data.
      </p>

      <h2>2. Accepting these terms</h2>
      <p>
        By creating an account, subscribing, or using ralph.world you agree
        to these terms. If you don&apos;t agree, please don&apos;t use the
        site. We may update these terms from time to time. We&apos;ll flag
        material changes on this page. If you keep using ralph.world after
        that, you&apos;re accepting the updated terms.
      </p>

      <h2>3. Your account</h2>
      <p>
        You&apos;re responsible for keeping your password safe and for any
        activity from your account. Tell us promptly if you suspect
        unauthorised use. If you are under 13, you confirm that a parent or
        guardian has consented to your use of ralph.world or any of its
        features and we may ask for that confirmation before activating a
        paid subscription.
      </p>
      <p>
        If you create an account, please give us accurate registration
        details and keep them up to date. We may suspend or limit access
        where we reasonably believe this is necessary to protect security,
        prevent fraud, or comply with the law, and will tell you why
        we&apos;re able to.
      </p>

      <h2>4. Subscriptions and billing</h2>
      <p>
        Paid subscriptions are charged quarterly via Stripe at the rate
        shown at checkout. Your subscription auto-renews until you cancel.
        Cancel from the member portal at any time just as easily as you
        signed up; access continues until the end of your paid period.
      </p>
      <p>
        If a renewal payment fails, we&apos;ll try again and email you to
        update your payment details. If payment still hasn&apos;t gone
        through after 14 days, we may pause your subscription until
        it&apos;s resolved. Prices shown at checkout include VAT where
        applicable; we&apos;re responsible for any taxes we&apos;re required
        to collect.
      </p>
      <p>
        Refunds are at our discretion within 14 days of purchase, in line
        with UK consumer contract regulations. Email{' '}
        <a href="mailto:hello@ralph.world">hello@ralph.world</a> to request
        one.
      </p>

      <h2>5. Magazine delivery</h2>
      <p>
        Paid subscribers receive a printed magazine each issue, posted to
        the address on file. If an issue goes missing or arrives damaged in
        transit, tell us within 14 days of the expected delivery date and
        we&apos;ll send a replacement or credit to your account, at our
        choice. We&apos;re not responsible for delays caused by postal
        services once an issue has been dispatched.
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
        <li>
          Don&apos;t upload malware, or try to disrupt, overload, or gain
          unauthorised access to the site.
        </li>
        <li>
          Don&apos;t harass, abuse, or threaten other members or our staff.
        </li>
        <li>
          Don&apos;t infringe anyone&apos;s intellectual property, or post
          content that violates someone else&apos;s rights.
        </li>
        <li>
          Don&apos;t create multiple accounts to evade a suspension or
          harvest other members&apos; personal data.
        </li>
      </ul>
      <p>
        If you breach this section, we may remove the content, suspend your
        account, or take both steps, as described in section 10.
      </p>

      <h2>7. Content and IP</h2>
      <p>
        All articles, images, video, and design on ralph.world are owned by
        Ralph or licensed to us. &ldquo;Ralph&rdquo; and our logos are our
        trademarks; nothing here gives you rights to use them without our
        permission. You may share links and short quotes with attribution;
        reproduction beyond fair dealing limits requires our written
        permission.
      </p>
      <p>
        If you believe something on ralph.world infringes your rights,
        email{' '}
        <a href="mailto:hello@ralph.world">hello@ralph.world</a> with
        details of the content and your rights in it, and we&apos;ll
        investigate and, where appropriate, remove it.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        Ralph.world is provided &ldquo;as is.&rdquo; We don&apos;t promise
        the service will be uninterrupted, error-free, or fit for any
        particular purpose beyond what UK consumer law requires. Editorial
        content reflects the views of its authors and is provided for
        information and entertainment; it isn&apos;t professional advice.
        We may link to third-party sites and content we don&apos;t control,
        and we&apos;re not responsible for them. Nothing in this section
        affects your statutory rights as a consumer.
      </p>

      <h2>9. Liability</h2>
      <p>
        We&apos;re not liable for indirect or consequential losses, or for
        loss of profits, data, or opportunity. Where we are liable to you,
        our total liability for any claim arising from your use of
        ralph.world is limited to the amount you paid us in the 12 months
        before the claim arose.
      </p>

      <h2>10. Termination</h2>
      <p>
        You may close your account at any time from the member portal (or
        by emailing us). We may suspend or terminate accounts that breach
        these terms, after notice where reasonable. If we terminate your
        account for breach, you won&apos;t be entitled to a refund for the
        remaining subscription period. After your account closes, we&apos;ll
        handle your data as described in our Privacy Notice. Sections 7
        (Content and IP), 9 (Liability), and 12 (Governing law) survive
        termination.
      </p>

      <h2>11. Privacy and data protection</h2>
      <p>
        We process your personal data as described in our{' '}
        <a href="/legal/privacy">Privacy Notice</a>. By using ralph.world,
        you acknowledge that notice. If you have questions about your data,
        email{' '}
        <a href="mailto:hello@ralph.world">hello@ralph.world</a>.
      </p>

      <h2>12. Governing law</h2>
      <p>
        The courts of England and Wales have exclusive jurisdiction over
        disputes. If you&apos;re a consumer living elsewhere, mandatory
        consumer-protection laws of your country of residence may still
        apply.
      </p>

      <h2>13. General</h2>
      <p>
        These terms (together with the documents they refer to) are the
        entire agreement between you and us about ralph.world, and replace
        any earlier agreements on the same subject. If any part of these
        terms is found unenforceable, the rest still stands. If we
        don&apos;t act on a breach straight away, that doesn&apos;t mean
        we&apos;ve waived our right to act on it later. You can&apos;t
        transfer your rights under these terms to someone else without our
        agreement; we may transfer ours, including if we restructure or
        sell the business, and we&apos;ll tell you if that affects you.
        Neither of us is liable for delay or failure caused by something
        reasonably outside our control. We&apos;ll send notices to the
        email on your account; you can reach us at{' '}
        <a href="mailto:hello@ralph.world">hello@ralph.world</a>.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions about these terms? Email{' '}
        <a href="mailto:hello@ralph.world">hello@ralph.world</a>. If you
        have a complaint, email us there first and we&apos;ll try to resolve
        it directly before any other steps.
      </p>
    </article>
  )
}
