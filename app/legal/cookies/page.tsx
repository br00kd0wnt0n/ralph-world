import type { Metadata } from 'next'
import CookiePreferencesLink from '@/components/legal/CookiePreferencesLink'

export const metadata: Metadata = {
  title: 'Cookies',
  description:
    'All cookies set by ralph.world — what they do, how long they last, and how to change your choice.',
}

/**
 * Cookies disclosure page — Task 3.10.
 *
 * The table reflects the ACTUAL cookies + localStorage keys the site
 * uses today. Update this page whenever new tracking is added — if you
 * add Google Analytics, a new processor, etc., it must appear here AND
 * be gated by the cookie banner.
 *
 * Last reviewed: 2026-06-10.
 */
export default function CookiesPage() {
  return (
    <article>
      <h1>Cookies</h1>
      <p>
        We use a small number of cookies and similar storage to run the
        site. This page lists every one of them, what it does, and how
        long it sticks around.
      </p>

      <h2>Change your preferences</h2>
      <p>
        <CookiePreferencesLink />
      </p>

      <h2>Necessary cookies</h2>
      <p>
        These are required for the site to work. We don&apos;t ask for
        consent because without them basic features (signing in, your
        cart) would break.
      </p>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Purpose</th>
            <th>Duration</th>
            <th>Set by</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>authjs.session-token</code>
            </td>
            <td>Keeps you signed in</td>
            <td>30 days (rolling)</td>
            <td>Ralph (Auth.js)</td>
          </tr>
          <tr>
            <td>
              <code>authjs.csrf-token</code>
            </td>
            <td>CSRF protection on auth endpoints</td>
            <td>Session</td>
            <td>Ralph (Auth.js)</td>
          </tr>
          <tr>
            <td>
              <code>ralph-cookie-consent</code> (localStorage)
            </td>
            <td>Remember your cookie choice</td>
            <td>12 months</td>
            <td>Ralph</td>
          </tr>
          <tr>
            <td>
              <code>ralph-cart</code> (localStorage)
            </td>
            <td>Shop cart contents</td>
            <td>Until cleared</td>
            <td>Ralph</td>
          </tr>
          <tr>
            <td>
              <code>ralph-tv-volume</code> (localStorage)
            </td>
            <td>Remember TV volume between visits</td>
            <td>Until cleared</td>
            <td>Ralph</td>
          </tr>
          <tr>
            <td>
              <code>ralph-tv-preview-expires-at</code> (localStorage)
            </td>
            <td>Tracks the end of your TV free-view session</td>
            <td>Until expiry / sign-in</td>
            <td>Ralph</td>
          </tr>
        </tbody>
      </table>

      <h2>Analytics cookies (only if you accept)</h2>
      <p>
        These help us see when something breaks. They never load unless
        you accept them in the banner.
      </p>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Purpose</th>
            <th>Duration</th>
            <th>Set by</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>sentry-trace</code> + Sentry session keys
            </td>
            <td>Connect an error report to the request that caused it</td>
            <td>Per-page-view</td>
            <td>Sentry</td>
          </tr>
        </tbody>
      </table>

      <h2>Third-party services that may set cookies</h2>
      <p>
        Some pages embed third-party services that set their own cookies
        according to their own policies. We don&apos;t control these
        directly:
      </p>
      <ul>
        <li>
          <strong>Stripe</strong> — payment checkout pages. See{' '}
          <a href="https://stripe.com/cookie-settings">Stripe cookie settings</a>
          .
        </li>
        <li>
          <strong>Google</strong> — only if you sign in with Google. See{' '}
          <a href="https://policies.google.com/technologies/cookies">
            Google cookies
          </a>
          .
        </li>
        <li>
          <strong>YouTube / Vimeo</strong> — only on pages with embedded
          videos.
        </li>
      </ul>

      <h2>Change your mind</h2>
      <p>
        Click the &quot;Cookie preferences&quot; link in the footer (or{' '}
        <CookiePreferencesLink />) to show the banner again. We&apos;ll log
        your new choice and apply it immediately.
      </p>
    </article>
  )
}
