export interface ShopifyImage {
  url: string
  altText: string | null
  width?: number
  height?: number
}

export interface ShopifyMoney {
  amount: string
  currencyCode: string
}

export interface ShopifyVariant {
  id: string
  title: string
  availableForSale: boolean
  price: ShopifyMoney
  image?: ShopifyImage
  selectedOptions: { name: string; value: string }[]
}

export interface ShopifyProduct {
  id: string
  handle: string
  title: string
  description: string
  descriptionHtml: string
  availableForSale: boolean
  productType: string
  tags: string[]
  featuredImage: ShopifyImage | null
  images: { edges: { node: ShopifyImage }[] }
  variants: { edges: { node: ShopifyVariant }[] }
  priceRange: {
    minVariantPrice: ShopifyMoney
    maxVariantPrice: ShopifyMoney
  }
}

export interface ShopifyCartLine {
  id: string
  quantity: number
  cost: {
    totalAmount: ShopifyMoney
    amountPerQuantity: ShopifyMoney
  }
  merchandise: {
    id: string
    title: string
    product: {
      title: string
      handle: string
      featuredImage: ShopifyImage | null
    }
  }
}

export interface ShopifyCart {
  id: string
  checkoutUrl: string
  cost: {
    totalAmount: ShopifyMoney
    subtotalAmount: ShopifyMoney
  }
  lines: { edges: { node: ShopifyCartLine }[] }
  totalQuantity: number
}

export interface ProductSummary {
  id: string
  handle: string
  title: string
  price: string
  currency: string
  imageUrl: string | null
  available: boolean
  productType: string
  tags: string[]
  variantId: string
}

export type ShopCategory = 'magazine' | 'merch' | 'random'
