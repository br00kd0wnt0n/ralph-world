export const PRODUCT_FRAGMENT = `
  fragment ProductFields on Product {
    id
    handle
    title
    description
    descriptionHtml
    availableForSale
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
