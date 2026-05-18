import {
  errorResponse,
  json,
  sdk,
  validateRequest
} from '@lib/server/cart-helpers'
import type { APIRoute } from 'astro'

export const prerender = false

export const GET: APIRoute = async (ctx) => {
  const requestError = validateRequest(ctx.request, ctx.url)
  if (requestError) return errorResponse(requestError, 403)

  const productId = ctx.params.productId
  const regionId = ctx.url.searchParams.get('regionId')

  if (!productId || !regionId) {
    return errorResponse('productId and regionId required', 400)
  }

  try {
    const { product } = await sdk.store.product.retrieve(productId, {
      region_id: regionId,
      fields: '+variants.inventory_quantity,*variants.options'
    })

    return json({ variants: product.variants ?? [] })
  } catch (err) {
    console.error('[Product API] Failed to fetch variants:', err)
    return errorResponse('Failed to fetch variants', 500)
  }
}
