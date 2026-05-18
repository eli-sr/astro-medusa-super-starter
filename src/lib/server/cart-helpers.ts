import { sdk } from '@lib/sdk'
import type { APIContext, APIRoute } from 'astro'

export const COOKIE_NAME = '_medusa_cart_id'

const CART_ID_REGEX = /^cart_[a-zA-Z0-9]{20,}$/
const MAX_AGE = 60 * 60 * 24 * 7
const MAX_BODY_SIZE = 8192

export const CART_FIELDS =
  '*items,*items.variant,*items.variant.product,*items.variant.product.images,*items.variant.product.thumbnail,*shipping_address,*billing_address,*shipping_methods,*payment_collection,*payment_collection.payment_sessions'

export function cookieOptions(isProd: boolean) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict' as const,
    maxAge: MAX_AGE,
    path: '/'
  }
}

export function getCartIdFromCookie(ctx: APIContext): string | null {
  const raw = ctx.cookies.get(COOKIE_NAME)?.value
  return raw && CART_ID_REGEX.test(raw) ? raw : null
}

export function setCartCookie(ctx: APIContext, cartId: string) {
  ctx.cookies.set(COOKIE_NAME, cartId, cookieOptions(import.meta.env.PROD))
}

export function clearCartCookie(ctx: APIContext) {
  ctx.cookies.delete(COOKIE_NAME, { path: '/' })
}

export function validateRequest(request: Request, url: URL): string | null {
  if (request.headers.get('x-requested-with') !== 'fetch') {
    return 'Forbidden: missing required header'
  }

  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const expectedOrigin = url.origin

  if (origin && origin !== expectedOrigin) {
    return 'Forbidden: invalid origin'
  }

  if (!origin && referer && !referer.startsWith(expectedOrigin)) {
    return 'Forbidden: invalid referer'
  }

  if (import.meta.env.PROD && !origin && !referer) {
    return 'Forbidden: missing origin'
  }

  return null
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  })
}

export function errorResponse(message: string, status: number) {
  return json({ error: message }, status)
}

export async function parseBody<T>(request: Request): Promise<T> {
  const contentType = request.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    throw { status: 415, message: 'Invalid content type' }
  }

  const text = await request.text()
  if (text.length > MAX_BODY_SIZE) {
    throw { status: 413, message: 'Payload too large' }
  }

  try {
    return JSON.parse(text) as T
  } catch {
    throw { status: 400, message: 'Invalid JSON' }
  }
}

export function isCartNotFound(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false

  const status =
    (err as { status?: number }).status ??
    (err as { response?: { status?: number } }).response?.status

  return status === 404 || status === 410
}

export function isConflict(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false

  const status =
    (err as { status?: number }).status ??
    (err as { response?: { status?: number } }).response?.status

  return status === 409
}

export function withCartHandler(
  handler: (ctx: APIContext) => Promise<Response>
): APIRoute {
  return async (ctx) => {
    const csrfError = validateRequest(ctx.request, ctx.url)
    if (csrfError) return errorResponse(csrfError, 403)

    try {
      return await handler(ctx)
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'status' in err &&
        'message' in err
      ) {
        const { status, message } = err as { status: number; message: string }
        return errorResponse(message, status)
      }

      console.error('[Cart API] Unexpected error:', err)
      return errorResponse('Internal server error', 500)
    }
  }
}

export { sdk }
