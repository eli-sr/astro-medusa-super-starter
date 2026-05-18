import {
  CART_FIELDS,
  clearCartCookie,
  errorResponse,
  getCartIdFromCookie,
  isCartNotFound,
  json,
  parseBody,
  sdk,
  withCartHandler
} from '@lib/server/cart-helpers'
import type { APIRoute } from 'astro'

export const prerender = false

export const POST: APIRoute = withCartHandler(async (ctx) => {
  const cartId = getCartIdFromCookie(ctx)
  if (!cartId) return errorResponse('No cart found', 400)

  const { lineItemId, quantity } = await parseBody<{
    lineItemId: string
    quantity: number
  }>(ctx.request)

  if (!lineItemId || typeof quantity !== 'number') {
    return errorResponse('lineItemId and quantity required', 400)
  }

  try {
    if (quantity <= 0) {
      const { parent: cart } = await sdk.store.cart.deleteLineItem(
        cartId,
        lineItemId,
        { fields: CART_FIELDS }
      )
      return json({ cart })
    }

    const { cart } = await sdk.store.cart.updateLineItem(
      cartId,
      lineItemId,
      { quantity },
      { fields: CART_FIELDS }
    )
    return json({ cart })
  } catch (err) {
    if (isCartNotFound(err)) {
      clearCartCookie(ctx)
      return errorResponse('cart_expired', 410)
    }
    throw err
  }
})
