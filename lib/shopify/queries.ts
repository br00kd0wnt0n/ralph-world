export const PRODUCT_FRAGMENT = `
  fragment ProductFields on Product {
    id
    handle
    title
    description
    descriptionHtml
    availableForSale
    productType
    tags
    featuredImage { url altText width height }
    images(first: 8) { edges { node { url altText width height } } }
    variants(first: 20) {
      edges {
        node {
          id
          title
          availableForSale
          price { amount currencyCode }
          selectedOptions { name value }
          image { url altText }
        }
      }
    }
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    # Custom "Date" metafield from Shopify Admin → Custom data → Products.
    # Requires the metafield definition to have **Storefront access** enabled
    # — without that toggle the Storefront API returns null even if the
    # metafield has a value in Admin.
    dateMetafield: metafield(namespace: "custom", key: "date") {
      value
      type
    }
    # Custom "product_shot" image metafield (namespace: custom, key: product_shot).
    # Used as the listing-card image in preference to featuredImage. Needs
    # Storefront access enabled on the metafield definition, else reference is null.
    productShotMetafield: metafield(namespace: "custom", key: "product_shot") {
      reference {
        ... on MediaImage {
          image { url altText width height }
        }
      }
    }
  }
`

export const CART_FRAGMENT = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      totalAmount { amount currencyCode }
      subtotalAmount { amount currencyCode }
    }
    lines(first: 50) {
      edges {
        node {
          id
          quantity
          cost {
            totalAmount { amount currencyCode }
            amountPerQuantity { amount currencyCode }
          }
          merchandise {
            ... on ProductVariant {
              id
              title
              product {
                title
                handle
                featuredImage { url altText }
              }
            }
          }
        }
      }
    }
  }
`

export const GET_PRODUCTS_BY_COLLECTION = `
  ${PRODUCT_FRAGMENT}
  query GetProductsByCollection($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      id
      title
      products(first: $first) {
        edges { node { ...ProductFields } }
      }
    }
  }
`

export const GET_ALL_PRODUCTS = `
  ${PRODUCT_FRAGMENT}
  query GetAllProducts($first: Int!, $sortKey: ProductSortKeys, $reverse: Boolean) {
    products(first: $first, sortKey: $sortKey, reverse: $reverse) {
      edges { node { ...ProductFields } }
    }
  }
`

export const GET_PRODUCT_BY_HANDLE = `
  ${PRODUCT_FRAGMENT}
  query GetProductByHandle($handle: String!) {
    product(handle: $handle) { ...ProductFields }
  }
`

export const CREATE_CART = `
  ${CART_FRAGMENT}
  mutation CreateCart($lines: [CartLineInput!]) {
    cartCreate(input: { lines: $lines }) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`

// Subscription carts pre-fill buyerIdentity.email so the Shopify checkout
// doesn't ask a logged-in Ralph user to retype the email they just used.
// Line must include sellingPlanId — without it, Shopify treats the cart as
// a one-time purchase at face value rather than a recurring subscription.
export const CREATE_SUBSCRIPTION_CART = `
  ${CART_FRAGMENT}
  mutation CreateSubscriptionCart(
    $lines: [CartLineInput!]!
    $email: String!
  ) {
    cartCreate(
      input: {
        lines: $lines
        buyerIdentity: { email: $email }
      }
    ) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`

// Reads the selling plans attached to a variant so we know which
// plan ID to include in the cart line. Storefront API exposes these
// as sellingPlanGroups → sellingPlans.
export const GET_VARIANT_SELLING_PLANS = `
  query GetVariantSellingPlans($variantId: ID!) {
    node(id: $variantId) {
      ... on ProductVariant {
        id
        sellingPlanAllocations(first: 10) {
          edges {
            node {
              sellingPlan { id name }
            }
          }
        }
      }
    }
  }
`

export const ADD_CART_LINES = `
  ${CART_FRAGMENT}
  mutation AddCartLines($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`

export const UPDATE_CART_LINES = `
  ${CART_FRAGMENT}
  mutation UpdateCartLines($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`

export const REMOVE_CART_LINES = `
  ${CART_FRAGMENT}
  mutation RemoveCartLines($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`

export const GET_CART = `
  ${CART_FRAGMENT}
  query GetCart($id: ID!) {
    cart(id: $id) { ...CartFields }
  }
`
