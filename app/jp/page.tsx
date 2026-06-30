import { redirect } from 'next/navigation'

/**
 * /jp is currently just a landing redirect to /jp/contact — the only JP
 * surface today. Future JP-localised pages would either extend this file
 * (turn it into a section index) or live alongside it.
 */
export default function JpIndex() {
  redirect('/jp/contact')
}
