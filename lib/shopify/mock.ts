import type { ShopifyProduct, ProductSummary } from './types'

const MOCK_IMAGE = (seed: string, w = 600) =>
  `https://picsum.photos/seed/${seed}/${w}/${w}`

function makeProduct(
  handle: string,
  title: string,
  price: string,
  tags: string[],
  available: boolean,
  description: string,
  productType: string
): ShopifyProduct {
  const variantId = `gid://mock/ProductVariant/${handle}`
  return {
    id: `gid://mock/Product/${handle}`,
    handle,
    title,
    description,
    descriptionHtml: `<p>${description}</p>`,
    availableForSale: available,
    productType,
    tags,
    featuredImage: { url: MOCK_IMAGE(handle), altText: title },
    images: {
      edges: [
        { node: { url: MOCK_IMAGE(handle), altText: title } },
        { node: { url: MOCK_IMAGE(`${handle}-2`), altText: title } },
        { node: { url: MOCK_IMAGE(`${handle}-3`), altText: title } },
      ],
    },
    variants: {
      edges: [
        {
          node: {
            id: variantId,
            title: 'Default',
            availableForSale: available,
            price: { amount: price, currencyCode: 'GBP' },
            selectedOptions: [],
          },
        },
      ],
    },
    priceRange: {
      minVariantPrice: { amount: price, currencyCode: 'GBP' },
      maxVariantPrice: { amount: price, currencyCode: 'GBP' },
    },
  }
}

const MOCK_PRODUCTS: Record<string, ShopifyProduct[]> = {
  'ralph-magazine': [
    makeProduct(
      'ralph-mag-issue-1',
      'Ralph Magazine — Issue One',
      '10.00',
      ['badge-hot'],
      true,
      'Our first quarterly print magazine. 128 pages of pop culture, odd interviews, photo essays, and things we love. Printed in Bermondsey on lovely uncoated stock.\n\nPrice: £10.00\nSize: A4 (297 × 210 mm)\nPages: 128',
      'Magazines'
    ),
    makeProduct(
      'ralph-mag-issue-2',
      'Ralph Magazine — Issue Two',
      '10.00',
      ['badge-new'],
      true,
      'Issue two — weirder, glossier, even more obsessive. Deep dives on late-night TV, street food after midnight, and the return of the zine.\n\nPrice: £10.00\nSize: A4 (297 × 210 mm)\nPages: 144',
      'Magazines'
    ),
    makeProduct(
      'ralph-mag-issue-0',
      'Ralph Magazine — Issue Zero',
      '10.00',
      ['badge-limited'],
      false,
      'The prototype. The one that started it all. Now sold out — but you can subscribe to get every future issue delivered.\n\nPrice: £10.00\nSize: A4 (297 × 210 mm)\nPages: 96',
      'Magazines'
    ),
  ],
  'ralph-merch': [
    makeProduct(
      'ralph-tee-pink',
      'Ralph Logo T-Shirt (Pink)',
      '25.00',
      ['badge-new'],
      true,
      'Ralph logo on a heavyweight pink tee. 100% organic cotton, printed in Manchester.\n\nSizes: S, M, L, XL',
      'Apparel'
    ),
    makeProduct(
      'ralph-tote',
      'Ralph Tote Bag',
      '12.00',
      [],
      true,
      'Sturdy canvas tote with the Ralph wordmark. Big enough for a magazine, a laptop, and a questionable amount of groceries.',
      'Tote Bags'
    ),
    makeProduct(
      'ralph-cap',
      'Ralph Dad Cap',
      '20.00',
      ['badge-limited'],
      true,
      'Unstructured cotton cap with embroidered logo. One size fits most heads.',
      'Hats'
    ),
    makeProduct(
      'ralph-hoodie',
      'Ralph Heavyweight Hoodie',
      '55.00',
      [],
      false,
      'Out of stock until the next drop. Join the list to be first in line.',
      'Hoodies'
    ),
  ],
  'ralph-random': [
    makeProduct(
      'ralph-enamel-pin',
      'Enamel Pin — Small but Loud',
      '6.00',
      ['badge-hot'],
      true,
      'Hard enamel Ralph logo pin. 25mm wide. Comes on a backing card.',
      'Pins'
    ),
    makeProduct(
      'ralph-sticker-pack',
      'Sticker Pack (8 pieces)',
      '5.00',
      [],
      true,
      'Eight vinyl stickers, various sizes. Waterproof. Put them everywhere.',
      'Stickers'
    ),
    makeProduct(
      'ralph-poster-a2',
      'A2 Screenprint',
      '35.00',
      ['badge-limited'],
      true,
      'Two-colour screenprint on 200gsm uncoated. Limited run of 100. Signed and numbered.',
      'Prints'
    ),
    makeProduct(
      'ralph-mug',
      'Ralph Mug',
      '14.00',
      [],
      true,
      'Dishwasher-safe ceramic mug. 330ml. Holds exactly one mediocre coffee.',
      'Mugs'
    ),
    makeProduct(
      'ralph-candle',
      'Scented Candle — "Fresh Print"',
      '28.00',
      ['badge-new'],
      true,
      'Smells like a freshly printed magazine. Ink, paper, slight glue. 60-hour burn time. Yes, this is real.',
      'Candles'
    ),
  ],
}

function toSummary(p: ShopifyProduct): ProductSummary {
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    price: p.priceRange.minVariantPrice.amount,
    currency: p.priceRange.minVariantPrice.currencyCode,
    imageUrl: p.featuredImage?.url ?? null,
    available: p.availableForSale,
    productType: p.productType,
    tags: p.tags,
    variantId: p.variants.edges[0]?.node.id ?? '',
  }
}

export function getMockProducts(handle: string): ProductSummary[] {
  return (MOCK_PRODUCTS[handle] ?? []).map(toSummary)
}

export function getAllMockProducts(): ProductSummary[] {
  return Object.values(MOCK_PRODUCTS).flat().map(toSummary)
}

export function getMockProduct(handle: string): ShopifyProduct | null {
  for (const products of Object.values(MOCK_PRODUCTS)) {
    const found = products.find((p) => p.handle === handle)
    if (found) return found
  }
  return null
}

export function isShopifyConfigured(): boolean {
  return Boolean(
    process.env.SHOPIFY_STOREFRONT_URL && process.env.SHOPIFY_STOREFRONT_TOKEN
  )
}
