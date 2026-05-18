import {
  clearCartCookie,
  errorResponse,
  getCartIdFromCookie,
  isCartNotFound,
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
    const { shipping_options } = await sdk.store.fulfillment.listCartOptions({
      cart_id: cartId
    })
    return json({ shipping_options })
  } catch (err) {
    if (isCartNotFound(err)) {
      clearCartCookie(ctx)
      return errorResponse('cart_expired', 410)
    }
    throw err
  }
})
