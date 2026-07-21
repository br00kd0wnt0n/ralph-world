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
    'h4',
    'blockquote',
    'code',
    // Table set — needed for the legal pages (privacy data-table,
    // cookies matrix). Article bodies use tables rarely but they cost
    // nothing to allow.
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
  ],
  // `style` is allow-listed so Tiptap's TextAlign extension survives, but the
  // hook below narrows its value to just `text-align: left|center|right`.
  ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'colspan', 'rowspan', 'scope'],
}

// Restrict style attributes to a single safe declaration. Without this, the
// `style` allow-list above would let an editor paste in arbitrary CSS
// (background-image: url(…), position tricks, etc.).
DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName !== 'style') return
  const match = data.attrValue.match(/text-align\s*:\s*(left|right|center)/i)
  if (match) {
    data.attrValue = `text-align: ${match[1].toLowerCase()}`
    data.keepAttr = true
  } else {
    data.attrValue = ''
    data.keepAttr = false
  }
})

export function sanitizeArticleHtml(html: string): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, CONFIG)
}
