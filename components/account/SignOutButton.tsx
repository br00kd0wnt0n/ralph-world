'use client'

import { signOut } from 'next-auth/react'

/**
 * Sign-out button — client component.
 *
 * Uses the client-side signOut from next-auth/react (not the server-action
 * signOut from lib/auth) so that the useSession React cache is invalidated
 * in the same tick the cookie is cleared. Without this, Nav's initials
 * avatar persists until a manual refresh because useSession's context
 * doesn't refetch after a server-action signout.
 */
export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => {
        void signOut({ callbackUrl: '/' })
      }}
      className="rounded-full border-2 border-black/30 px-5 py-2 text-sm text-black hover:border-black transition-colors"
      style={{ fontFamily: "'Gooper Trial', serif", fontWeight: 600 }}
    >
      Sign out
    </button>
  )
}
