# Shop listings — product_shot image + newest-first order

Two changes to the shop **listings** page (`/shop`), 2026-06-18.

## 1. Use the `product_shot` metafield as the card image

Listing cards now prefer a curated image from the Shopify metafield over the
product's `featuredImage`, so merchandising can pick the exact shot shown in
the grid without reordering the product's media.

**Resolution order for a card's image:**
`custom.product_shot` → `featuredImage` → `null` (renders the "No image" state).

### Shopify requirements
- Metafield definition: **namespace `custom`, key `product_shot`**, type
  **Image (file reference / MediaImage)**.
- **Storefront API access must be enabled** on the definition — otherwise the
  Storefront API returns `reference: null` and cards silently fall back to
  `featuredImage` (same gotcha as the existing `custom.date` metafield).

### Code
- `lib/shopify/queries.ts` — added `productShotMetafield` to `PRODUCT_FRAGMENT`:
  ```graphql
  productShotMetafield: metafield(namespace: "custom", key: "product_shot") {
    reference { ... on MediaImage { image { url altText width height } } }
  }
  ```
- `lib/shopify/types.ts` — `ShopifyProduct.productShotMetafield:
  { reference: { image: ShopifyImage | null } | null } | null`.
- `lib/shopify/client.ts` (`toProductSummary`) and `lib/shopify/mock.ts`
  (`toSummary`) — `imageUrl` now resolves
  `productShotMetafield?.reference?.image?.url ?? featuredImage?.url ?? null`.
- The detail page (`ProductDetail`) is **unaffected** — it uses the full
  `images` array, not `imageUrl`.

## 2. Order products newest → oldest

`app/shop/page.tsx` now fetches the catalogue sorted by creation date, newest
first:

```ts
getAllProducts(50, { sortKey: 'CREATED_AT', reverse: true })
```

- "Newest" = Shopify product **created date** (`ProductSortKeys.CREATED_AT`).
- The **Magazines** collection (`getProductsByCollection('magazines', …)`) is
  unchanged — it keeps the manual product order set in Shopify Admin.
- The query (`GET_ALL_PRODUCTS`) already declared `$sortKey` / `$reverse`, so no
  query change was needed.

## Files changed
| File | Change |
| ---- | ------ |
| `lib/shopify/queries.ts` | `productShotMetafield` added to `PRODUCT_FRAGMENT` |
| `lib/shopify/types.ts` | `productShotMetafield` typed on `ShopifyProduct` |
| `lib/shopify/client.ts` | `imageUrl` prefers `product_shot` |
| `lib/shopify/mock.ts` | `imageUrl` prefers `product_shot`; mock field defaulted `null` |
| `app/shop/page.tsx` | `getAllProducts` sorted `CREATED_AT` reverse (newest first) |
