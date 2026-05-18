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

  const { variantId, quantity } = await parseBody<{
    variantId: string
    quantity: number
  }>(ctx.request)

  if (!variantId || typeof quantity !== 'number' || quantity < 1) {
    return errorResponse('variantId and positive quantity required', 400)
  }

  try {
    const { cart } = await sdk.store.cart.createLineItem(
      cartId,
      { variant_id: variantId, quantity },
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
