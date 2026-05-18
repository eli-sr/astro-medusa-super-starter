import {
  clearCartCookie,
  errorResponse,
  getCartIdFromCookie,
  isCartNotFound,
  isConflict,
  json,
  sdk,
  withCartHandler
} from '@lib/server/cart-helpers'
import type { APIRoute } from 'astro'

export const prerender = false

export const POST: APIRoute = withCartHandler(async (ctx) => {
  const cartId = getCartIdFromCookie(ctx)
  if (!cartId) return errorResponse('No cart found', 400)

  try {
    const result = await sdk.store.cart.complete(cartId)

    if (result.type === 'order') {
      clearCartCookie(ctx)
      return json({ type: 'order', order: result.order })
    }

    return json(result)
  } catch (err) {
    if (isConflict(err)) {
      clearCartCookie(ctx)
      return json({ type: 'already_completed' })
    }

    if (isCartNotFound(err)) {
      clearCartCookie(ctx)
      return errorResponse('cart_expired', 410)
    }

    throw err
  }
})
