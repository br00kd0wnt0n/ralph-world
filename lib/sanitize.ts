import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize rich-text HTML before rendering via dangerouslySetInnerHTML.
 *
 * The article body is authored in the CMS Tiptap editor and stored raw, so
 * it must be treated as untrusted at render time (a compromised or malicious
 * editor account could otherwise store an XSS payload that runs for every
 * reader). Allowlist exactly the tags Tiptap emits. DOMPurify strips all
 * event handlers and `javascript:`/`data:` URIs by default, so links keep
 * their href but can't carry script.
 */
const CONFIG = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'em',
    'b',
    'i',
    'u',
    's',
    'ul',
    'ol',
    'li',
    'a',
    'h1',
    'h2',
    'h3',
    'blockquote',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
}

export function sanitizeArticleHtml(html: string): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, CONFIG)
}
