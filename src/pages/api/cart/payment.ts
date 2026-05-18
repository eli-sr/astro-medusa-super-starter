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

  const { providerId } = await parseBody<{ providerId: string }>(ctx.request)
  if (!providerId) return errorResponse('providerId required', 400)

  try {
    const { cart } = await sdk.store.cart.retrieve(cartId, {
      fields: CART_FIELDS
    })

    await sdk.store.payment.initiatePaymentSession(cart, {
      provider_id: providerId
    })

    const { cart: updatedCart } = await sdk.store.cart.retrieve(cartId, {
      fields: CART_FIELDS
    })

    return json({ cart: updatedCart })
  } catch (err) {
    if (isCartNotFound(err)) {
      clearCartCookie(ctx)
      return errorResponse('cart_expired', 410)
    }
    throw err
  }
})
