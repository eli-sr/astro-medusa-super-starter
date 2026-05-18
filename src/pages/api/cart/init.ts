import {
  CART_FIELDS,
  clearCartCookie,
  errorResponse,
  getCartIdFromCookie,
  json,
  parseBody,
  sdk,
  setCartCookie,
  withCartHandler
} from '@lib/server/cart-helpers'
import type { APIRoute } from 'astro'

export const prerender = false

export const POST: APIRoute = withCartHandler(async (ctx) => {
  const { regionId } = await parseBody<{ regionId: string }>(ctx.request)

  if (!regionId || typeof regionId !== 'string') {
    return errorResponse('regionId is required', 400)
  }

  const existingCartId = getCartIdFromCookie(ctx)

  if (existingCartId) {
    try {
      const { cart } = await sdk.store.cart.retrieve(existingCartId, {
        fields: CART_FIELDS
      })
      return json({ cart })
    } catch {
      clearCartCookie(ctx)
    }
  }

  const { cart } = await sdk.store.cart.create(
    { region_id: regionId },
    { fields: CART_FIELDS }
  )

  setCartCookie(ctx, cart.id)
  return json({ cart })
})
