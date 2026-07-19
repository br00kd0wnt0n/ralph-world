/**
 * Renders a schema.org JSON-LD block. Pass a single object or an array of
 * objects (each a `@context`/`@type` graph node). Server-safe; the JSON is
 * serialised into a <script type="application/ld+json"> for crawlers.
 */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[]
}) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe here (no user HTML); escape < to be safe
      // against a "</script>" sequence in any string field.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}
