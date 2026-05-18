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

  const body = await parseBody<{
    email: string
    shipping_address: Record<string, string>
    billing_address?: Record<string, string>
  }>(ctx.request)

  if (!body.email || !body.shipping_address) {
    return errorResponse('email and shipping_address required', 400)
  }

  try {
    const { cart } = await sdk.store.cart.update(cartId, body, {
      fields: CART_FIELDS
    })
    return json({ cart })
  } catch (err) {
    if (isCartNotFound(err)) {
      clearCartCookie(ctx)
      return errorResponse('cart_expired', 410)
    }
    throw err
  }
})
