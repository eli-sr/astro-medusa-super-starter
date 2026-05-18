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

  const { lineItemId } = await parseBody<{ lineItemId: string }>(ctx.request)
  if (!lineItemId) return errorResponse('lineItemId required', 400)

  try {
    const { parent: cart } = await sdk.store.cart.deleteLineItem(
      cartId,
      lineItemId,
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
