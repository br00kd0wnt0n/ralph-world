-- 2026-07-20 — legal_pages table + seed the 3 current pages.
--
-- Moves Privacy Notice, Terms of Service, and Cookies page out of
-- hand-coded React and into CMS-editable rows. body_html is Tiptap-
-- authored HTML; a companion sanitiser on the public side allows the
-- subset of tags editors need (headings, lists, links, tables, code).
--
-- last_updated_auto bumps on every save; last_updated_override lets an
-- editor pin a specific display date without touching the underlying
-- audit-facing bump.
--
-- Seed values preserve the current published content verbatim. Legal
-- policy version bump is handled separately in homepage_config
-- (see migrate-legal-policy-version.sql, applied alongside this).
--
-- Idempotent — re-running is safe: CREATE TABLE IF NOT EXISTS, ON
-- CONFLICT DO NOTHING on the seed inserts.

CREATE TABLE IF NOT EXISTS legal_pages (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                   text NOT NULL UNIQUE,
  title                  text NOT NULL,
  body_html              text NOT NULL,
  last_updated_auto      timestamp NOT NULL DEFAULT now(),
  last_updated_override  timestamp,
  is_published           boolean NOT NULL DEFAULT true,
  created_at             timestamp DEFAULT now(),
  updated_at             timestamp DEFAULT now()
);

GRANT SELECT ON legal_pages TO ralph_world;
-- CMS role (ralph_cms) owns the table and gets all rights via ownership.

-- ── Seed rows — safe to re-run ────────────────────────────────────

INSERT INTO legal_pages (slug, title, body_html, last_updated_auto, last_updated_override)
VALUES ('privacy', 'Privacy Policy', $BODY$
<p>This policy explains what personal data ralph.world collects about you, why we collect it, how long we keep it, and the rights you have over it. It applies to everyone who visits the site, has an account, or subscribes.</p>

<h2>1. Who's responsible (the data controller)</h2>
<p>Ralph Creative Limited (&ldquo;Ralph&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), company number 05638038, registered at 27-33 Bethnal Green Road, London, E1 6LA. We're the &ldquo;controller&rdquo; of your data under UK GDPR.</p>

<h2>2. What data we collect, why, and the lawful basis</h2>
<table>
  <thead>
    <tr><th>What</th><th>Why</th><th>Lawful basis</th><th>Retention</th></tr>
  </thead>
  <tbody>
    <tr><td>Email, name, hashed password</td><td>Account creation and sign-in</td><td>Contract</td><td>Until account deletion</td></tr>
    <tr><td>Subscription status, Stripe customer ID, billing period</td><td>Manage your subscription</td><td>Contract</td><td>Until account deletion + 6 years (UK tax retention)</td></tr>
    <tr><td>Shipping address</td><td>Post the magazine to you</td><td>Contract</td><td>Until account deletion</td></tr>
    <tr><td>Marketing opt-in flag + consent log</td><td>Newsletter sends (opt-in only)</td><td>Consent</td><td>Consent log: indefinite (legal record); opt-in flag: until withdrawn or account deleted</td></tr>
    <tr><td>Cookie preferences</td><td>Remember your choice</td><td>Consent (for analytics) / Legitimate interest (for necessary)</td><td>12 months</td></tr>
    <tr><td>Event RSVP records</td><td>Confirm you're on the guest list</td><td>Contract / Legitimate interest</td><td>Until 6 months after the event</td></tr>
    <tr><td>Error reports (Sentry)</td><td>Diagnose bugs</td><td>Consent (cookies_all only)</td><td>90 days</td></tr>
    <tr><td>IP address, device/browser data, security and audit logs</td><td>Detect and prevent fraud, abuse, and security incidents; keep an audit trail of sensitive account actions</td><td>Legitimate interest</td><td>12 months from collection</td></tr>
    <tr><td>Support correspondence (emails to hello@ralph.world)</td><td>Respond to your questions and rights requests</td><td>Legitimate interest</td><td>24 months after the issue is resolved</td></tr>
  </tbody>
</table>

<h2>3. Who we share it with</h2>
<p>We share personal data with the service providers below, who process it on our behalf and under our instructions (as &ldquo;processors&rdquo; under UK GDPR), each bound by a data processing agreement.</p>
<ul>
  <li><strong>Stripe</strong> — subscription billing. <a href="https://stripe.com/privacy">stripe.com/privacy</a></li>
  <li><strong>Shopify</strong> — shop orders and magazine fulfilment. <a href="https://www.shopify.com/legal/privacy">shopify.com/legal/privacy</a></li>
  <li><strong>Resend</strong> — transactional email delivery (verification, receipts, RSVP confirmations).</li>
  <li><strong>Mailchimp</strong> — marketing newsletter (only if you opted in).</li>
  <li><strong>Cloudflare R2</strong> — image storage and CDN.</li>
  <li><strong>Railway</strong> — application hosting + database.</li>
  <li><strong>Sentry</strong> — error reporting (only if you accepted analytics cookies).</li>
  <li><strong>Google OAuth</strong> — sign-in if you choose Google.</li>
  <li><strong>Newsstand</strong> — magazine printing and distribution.</li>
</ul>
<p>We don't sell your data. We don't share it with anyone else unless required by law.</p>

<h2>4. International transfers</h2>
<p>Several of our processors operate outside the UK, including Stripe, Sentry, Resend, Mailchimp, Cloudflare, Railway, and Google. Where we transfer your data outside the UK, we rely on the UK's adequacy regulations (for transfers to the EU) or on Standard Contractual Clauses / the International Data Transfer Addendum (for transfers elsewhere, including the US) which require the recipient to protect your data to UK standards.</p>

<h2>5. Your rights under UK GDPR</h2>
<p>You have the right to:</p>
<ul>
  <li><strong>Access</strong> — get a copy of the data we hold about you. Use &ldquo;Download my data&rdquo; in your account, or email <a href="mailto:hello@ralph.world">hello@ralph.world</a>.</li>
  <li><strong>Rectify</strong> — correct anything wrong. Edit in your account or email us.</li>
  <li><strong>Erase</strong> — delete your account from your account page. Subscription billing history and consent records are kept under the lawful bases above; everything else is removed.</li>
  <li><strong>Restrict / object</strong> — pause specific processing (e.g. marketing) without deleting your account.</li>
  <li><strong>Portability</strong> — get the data you've given us in a structured, commonly used, machine-readable format, or ask us to send it directly to another provider where that's technically feasible.</li>
  <li><strong>Automated decisions</strong> — we don't make any decisions about you based solely on automated processing that have a legal or similarly significant effect on you.</li>
  <li><strong>Withdraw consent</strong> — unsubscribe from marketing or revoke cookies at any time via the account page or the &ldquo;Cookie preferences&rdquo; link in the footer.</li>
  <li><strong>Complain</strong> — to the UK ICO at <a href="https://ico.org.uk/">ico.org.uk</a>.</li>
</ul>
<p>We'll respond to rights requests within 30 days. To exercise any of these, email <a href="mailto:hello@ralph.world">hello@ralph.world</a>.</p>

<h2>6. Children's privacy</h2>
<p>If you're under 13, a parent or guardian needs to confirm they're aware of and consent to your use of ralph.world before you create an account, as set out in our Terms of Service. We may ask for that confirmation directly. We don't collect additional categories of data from children, use children's data for marketing, or show them targeted advertising. A parent or guardian can exercise any of the rights in section 5 on a child's behalf by emailing <a href="mailto:hello@ralph.world">hello@ralph.world</a>.</p>

<h2>7. Cookies</h2>
<p>See our <a href="/legal/cookies">Cookies page</a> for the full list and how to change your preferences.</p>

<h2>8. Security</h2>
<p>Passwords are hashed (bcrypt). Database access is role-segregated. All traffic is TLS. Production data is encrypted at rest by our hosting provider. We log sensitive actions to an append-only audit trail. We don't store payment card details — Stripe handles those directly. If a security incident puts your personal data at risk, we'll notify the ICO within the timescales UK GDPR requires and tell affected users without undue delay where there's a high risk to your rights and freedoms.</p>

<h2>9. Changes to this policy</h2>
<p>Material changes are flagged on this page and (for account holders) emailed in advance. Minor wording fixes don't trigger a notice.</p>

<h2>10. Contact</h2>
<p>Privacy questions, rights requests, or anything you'd like clarified: <a href="mailto:hello@ralph.world">hello@ralph.world</a>. If you have a complaint about how we've handled your data, email us there first and we'll try to resolve it directly before you escalate to the ICO.</p>
$BODY$, now(), '2026-07-01'::timestamp)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO legal_pages (slug, title, body_html, last_updated_auto, last_updated_override)
VALUES ('terms', 'Terms of Service', $BODY$
<h2>1. Who we are</h2>
<p>Ralph Creative Limited (&ldquo;Ralph&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), registered with company number 05638038 at 27-33 Bethnal Green Rd, London, E1 6LA operates ralph.world, a culture magazine and member platform. You can reach us at <a href="mailto:hello@ralph.world">hello@ralph.world</a>.</p>
<p>These terms incorporate our Privacy Notice and Cookie Notice by reference. By using ralph.world you also agree to those policies, which explain how we handle your personal data.</p>

<h2>2. Accepting these terms</h2>
<p>By creating an account, subscribing, or using ralph.world you agree to these terms. If you don't agree, please don't use the site. We may update these terms from time to time. We'll flag material changes on this page. If you keep using ralph.world after that, you're accepting the updated terms.</p>

<h2>3. Your account</h2>
<p>You're responsible for keeping your password safe and for any activity from your account. Tell us promptly if you suspect unauthorised use. If you are under 13, you confirm that a parent or guardian has consented to your use of ralph.world or any of its features and we may ask for that confirmation before activating a paid subscription.</p>
<p>If you create an account, please give us accurate registration details and keep them up to date. We may suspend or limit access where we reasonably believe this is necessary to protect security, prevent fraud, or comply with the law, and will tell you why we're able to.</p>

<h2>4. Subscriptions and billing</h2>
<p>Paid subscriptions are charged quarterly via Stripe at the rate shown at checkout. Your subscription auto-renews until you cancel. Cancel from the member portal at any time just as easily as you signed up; access continues until the end of your paid period.</p>
<p>If a renewal payment fails, we'll try again and email you to update your payment details. If payment still hasn't gone through after 14 days, we may pause your subscription until it's resolved. Prices shown at checkout include VAT where applicable; we're responsible for any taxes we're required to collect.</p>
<p>Refunds are at our discretion within 14 days of purchase, in line with UK consumer contract regulations. Email <a href="mailto:hello@ralph.world">hello@ralph.world</a> to request one.</p>

<h2>5. Magazine delivery</h2>
<p>Paid subscribers receive a printed magazine each issue, posted to the address on file. If an issue goes missing or arrives damaged in transit, tell us within 14 days of the expected delivery date and we'll send a replacement or credit to your account, at our choice. We're not responsible for delays caused by postal services once an issue has been dispatched.</p>

<h2>6. Acceptable use</h2>
<ul>
  <li>Don't break the law on or via the site.</li>
  <li>Don't scrape, automate, or rate-abuse the platform.</li>
  <li>Don't impersonate someone else.</li>
  <li>Don't upload content you don't have rights to (if/when uploads exist).</li>
  <li>Don't upload malware, or try to disrupt, overload, or gain unauthorised access to the site.</li>
  <li>Don't harass, abuse, or threaten other members or our staff.</li>
  <li>Don't infringe anyone's intellectual property, or post content that violates someone else's rights.</li>
  <li>Don't create multiple accounts to evade a suspension or harvest other members' personal data.</li>
</ul>
<p>If you breach this section, we may remove the content, suspend your account, or take both steps, as described in section 10.</p>

<h2>7. Content and IP</h2>
<p>All articles, images, video, and design on ralph.world are owned by Ralph or licensed to us. &ldquo;Ralph&rdquo; and our logos are our trademarks; nothing here gives you rights to use them without our permission. You may share links and short quotes with attribution; reproduction beyond fair dealing limits requires our written permission.</p>
<p>If you believe something on ralph.world infringes your rights, email <a href="mailto:hello@ralph.world">hello@ralph.world</a> with details of the content and your rights in it, and we'll investigate and, where appropriate, remove it.</p>

<h2>8. Disclaimers</h2>
<p>Ralph.world is provided &ldquo;as is.&rdquo; We don't promise the service will be uninterrupted, error-free, or fit for any particular purpose beyond what UK consumer law requires. Editorial content reflects the views of its authors and is provided for information and entertainment; it isn't professional advice. We may link to third-party sites and content we don't control, and we're not responsible for them. Nothing in this section affects your statutory rights as a consumer.</p>

<h2>9. Liability</h2>
<p>We're not liable for indirect or consequential losses, or for loss of profits, data, or opportunity. Where we are liable to you, our total liability for any claim arising from your use of ralph.world is limited to the amount you paid us in the 12 months before the claim arose.</p>

<h2>10. Termination</h2>
<p>You may close your account at any time from the member portal (or by emailing us). We may suspend or terminate accounts that breach these terms, after notice where reasonable. If we terminate your account for breach, you won't be entitled to a refund for the remaining subscription period. After your account closes, we'll handle your data as described in our Privacy Notice. Sections 7 (Content and IP), 9 (Liability), and 12 (Governing law) survive termination.</p>

<h2>11. Privacy and data protection</h2>
<p>We process your personal data as described in our <a href="/legal/privacy">Privacy Notice</a>. By using ralph.world, you acknowledge that notice. If you have questions about your data, email <a href="mailto:hello@ralph.world">hello@ralph.world</a>.</p>

<h2>12. Governing law</h2>
<p>The courts of England and Wales have exclusive jurisdiction over disputes. If you're a consumer living elsewhere, mandatory consumer-protection laws of your country of residence may still apply.</p>

<h2>13. General</h2>
<p>These terms (together with the documents they refer to) are the entire agreement between you and us about ralph.world, and replace any earlier agreements on the same subject. If any part of these terms is found unenforceable, the rest still stands. If we don't act on a breach straight away, that doesn't mean we've waived our right to act on it later. You can't transfer your rights under these terms to someone else without our agreement; we may transfer ours, including if we restructure or sell the business, and we'll tell you if that affects you. Neither of us is liable for delay or failure caused by something reasonably outside our control. We'll send notices to the email on your account; you can reach us at <a href="mailto:hello@ralph.world">hello@ralph.world</a>.</p>

<h2>14. Contact</h2>
<p>Questions about these terms? Email <a href="mailto:hello@ralph.world">hello@ralph.world</a>. If you have a complaint, email us there first and we'll try to resolve it directly before any other steps.</p>
$BODY$, now(), '2026-07-01'::timestamp)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO legal_pages (slug, title, body_html, last_updated_auto, last_updated_override)
VALUES ('cookies', 'Cookies', $BODY$
<p>We use a small number of cookies and similar storage to run the site. This page lists every one of them, what it does, and how long it sticks around.</p>

<h2>Change your preferences</h2>
<p><a href="#cookie-preferences">Cookie preferences</a></p>

<h2>Necessary cookies</h2>
<p>These are required for the site to work. We don't ask for consent because without them basic features (signing in, your cart) would break.</p>
<table>
  <thead>
    <tr><th>Name</th><th>Purpose</th><th>Duration</th><th>Set by</th></tr>
  </thead>
  <tbody>
    <tr><td><code>authjs.session-token</code></td><td>Keeps you signed in</td><td>30 days (rolling)</td><td>Ralph (Auth.js)</td></tr>
    <tr><td><code>authjs.csrf-token</code></td><td>CSRF protection on auth endpoints</td><td>Session</td><td>Ralph (Auth.js)</td></tr>
    <tr><td><code>ralph-cookie-consent</code> (localStorage)</td><td>Remember your cookie choice</td><td>12 months</td><td>Ralph</td></tr>
    <tr><td><code>ralph-cart</code> (localStorage)</td><td>Shop cart contents</td><td>Until cleared</td><td>Ralph</td></tr>
    <tr><td><code>ralph-tv-volume</code> (localStorage)</td><td>Remember TV volume between visits</td><td>Until cleared</td><td>Ralph</td></tr>
    <tr><td><code>ralph-tv-preview-expires-at</code> (localStorage)</td><td>Tracks the end of your TV free-view session</td><td>Until expiry / sign-in</td><td>Ralph</td></tr>
  </tbody>
</table>

<h2>Analytics cookies (only if you accept)</h2>
<p>These help us see when something breaks. They never load unless you accept them in the banner.</p>
<table>
  <thead>
    <tr><th>Name</th><th>Purpose</th><th>Duration</th><th>Set by</th></tr>
  </thead>
  <tbody>
    <tr><td><code>sentry-trace</code> + Sentry session keys</td><td>Connect an error report to the request that caused it</td><td>Per-page-view</td><td>Sentry</td></tr>
  </tbody>
</table>

<h2>Third-party services that may set cookies</h2>
<p>Some pages embed third-party services that set their own cookies according to their own policies. We don't control these directly:</p>
<ul>
  <li><strong>Stripe</strong> — payment checkout pages. See <a href="https://stripe.com/cookie-settings">Stripe cookie settings</a>.</li>
  <li><strong>Google</strong> — only if you sign in with Google. See <a href="https://policies.google.com/technologies/cookies">Google cookies</a>.</li>
  <li><strong>YouTube / Vimeo</strong> — only on pages with embedded videos.</li>
</ul>

<h2>Change your mind</h2>
<p>Click the &ldquo;Cookie preferences&rdquo; link in the footer (or <a href="#cookie-preferences">Cookie preferences</a>) to show the banner again. We'll log your new choice and apply it immediately.</p>
$BODY$, now(), '2026-06-10'::timestamp)
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE seeded int;
BEGIN
  SELECT count(*) INTO seeded FROM legal_pages WHERE slug IN ('privacy','terms','cookies');
  IF seeded < 3 THEN
    RAISE EXCEPTION 'legal_pages seed short: expected 3 rows, got %', seeded;
  END IF;
  RAISE NOTICE 'OK — legal_pages table present with % seeded rows', seeded;
END $$;
