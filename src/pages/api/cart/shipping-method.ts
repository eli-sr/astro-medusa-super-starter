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

  const { optionId, data } = await parseBody<{
    optionId: string
    data?: Record<string, unknown>
  }>(ctx.request)

  if (!optionId) return errorResponse('optionId required', 400)

  try {
    const { cart } = await sdk.store.cart.addShippingMethod(
      cartId,
      { option_id: optionId, data },
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
