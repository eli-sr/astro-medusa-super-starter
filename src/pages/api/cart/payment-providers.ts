import {
  errorResponse,
  json,
  parseBody,
  sdk,
  withCartHandler
} from '@lib/server/cart-helpers'
import type { APIRoute } from 'astro'

export const prerender = false

export const POST: APIRoute = withCartHandler(async (ctx) => {
  const { regionId } = await parseBody<{ regionId: string }>(ctx.request)
  if (!regionId) return errorResponse('regionId required', 400)

  const { payment_providers } = await sdk.store.payment.listPaymentProviders({
    region_id: regionId
  })

  return json({ payment_providers })
})
