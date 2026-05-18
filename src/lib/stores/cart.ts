import type { StoreCart } from '@medusajs/types'
import { atom, computed } from 'nanostores'

type CartAddress = {
  first_name: string
  last_name: string
  address_1: string
  company?: string
  postal_code: string
  city: string
  country_code: string
  province?: string
  phone?: string
}

const FETCH_HEADERS = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'fetch'
}

// Cart state atom
export const $cart = atom<StoreCart | null>(null)

// Sidebar visibility atom
export const $isCartSidebarOpen = atom<boolean>(false)

// Current region ID atom (set server-side, used client-side)
export const $regionId = atom<string | null>(null)

// Computed cart item count
export const $cartItemCount = computed($cart, (cart) => {
  if (!cart?.items) return 0
  return cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
})

class CartExpiredError extends Error {
  constructor() {
    super('Cart expired')
    this.name = 'CartExpiredError'
  }
}

async function cartFetch<T>(
  endpoint: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'same-origin',
    headers: FETCH_HEADERS,
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))

    if (response.status === 410 && data.error === 'cart_expired') {
      $cart.set(null)
      throw new CartExpiredError()
    }

    throw new Error(data.error || `Cart API error: ${response.status}`)
  }

  return response.json()
}

export async function initCart(): Promise<void> {
  try {
    const regionId = $regionId.get()
    if (!regionId) {
      console.warn('Region ID not set, cannot initialize cart')
      return
    }

    const { cart } = await cartFetch<{ cart: StoreCart }>('/api/cart/init', {
      regionId
    })

    $cart.set(cart)
  } catch (error) {
    console.error('Failed to initialize cart:', error)
  }
}

export async function addToCart(
  variantId: string,
  quantity: number
): Promise<void> {
  if (!$cart.get()) await initCart()

  try {
    const { cart } = await cartFetch<{ cart: StoreCart }>(
      '/api/cart/add-item',
      { variantId, quantity }
    )
    $cart.set(cart)
    $isCartSidebarOpen.set(true)
  } catch (error) {
    if (error instanceof CartExpiredError) {
      await initCart()
      const { cart } = await cartFetch<{ cart: StoreCart }>(
        '/api/cart/add-item',
        { variantId, quantity }
      )
      $cart.set(cart)
      $isCartSidebarOpen.set(true)
      return
    }

    throw error
  }
}

export async function removeFromCart(lineItemId: string): Promise<void> {
  try {
    const { cart } = await cartFetch<{ cart: StoreCart }>(
      '/api/cart/remove-item',
      { lineItemId }
    )
    $cart.set(cart)
  } catch (error) {
    if (error instanceof CartExpiredError) {
      await initCart()
      return
    }
    throw error
  }
}

export async function updateLineItemQuantity(
  lineItemId: string,
  quantity: number
): Promise<void> {
  try {
    const { cart } = await cartFetch<{ cart: StoreCart }>(
      '/api/cart/update-item',
      { lineItemId, quantity }
    )
    $cart.set(cart)
  } catch (error) {
    if (error instanceof CartExpiredError) {
      await initCart()
      return
    }
    throw error
  }
}

export function toggleCartSidebar(): void {
  $isCartSidebarOpen.set(!$isCartSidebarOpen.get())
}

export function closeCartSidebar(): void {
  $isCartSidebarOpen.set(false)
}

export function openCartSidebar(): void {
  $isCartSidebarOpen.set(true)
}

export async function addShippingMethod(
  shippingOptionId: string,
  data?: Record<string, unknown>
): Promise<void> {
  const { cart } = await cartFetch<{ cart: StoreCart }>(
    '/api/cart/shipping-method',
    { optionId: shippingOptionId, data }
  )

  $cart.set(cart)
}

export async function initPaymentSession(providerId: string): Promise<void> {
  const { cart } = await cartFetch<{ cart: StoreCart }>('/api/cart/payment', {
    providerId
  })

  $cart.set(cart)
}

export async function completeCart() {
  try {
    const result = await cartFetch<{
      type: string
      order?: unknown
      error?: { message: string }
    }>('/api/cart/complete')

    if (result.type === 'order' || result.type === 'already_completed') {
      $cart.set(null)
    }

    return result
  } catch (error) {
    if (error instanceof CartExpiredError) {
      $cart.set(null)
      return { type: 'already_completed' as const }
    }

    throw error
  }
}

export async function updateCartAddress(data: {
  email: string
  shipping_address: CartAddress
  billing_address?: CartAddress
}): Promise<void> {
  const { cart } = await cartFetch<{ cart: StoreCart }>(
    '/api/cart/address',
    data
  )

  $cart.set(cart)
}
