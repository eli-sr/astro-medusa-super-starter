import { sdk } from '@lib/sdk'

type ErrorWithStatus = Error & {
  status?: unknown
  statusCode?: unknown
  response?: {
    status?: unknown
  }
}

export class StoreDataError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'StoreDataError'
    this.status = status
  }
}

const getErrorStatus = (error: unknown) => {
  const maybeError = error as ErrorWithStatus
  const status =
    maybeError.status ?? maybeError.statusCode ?? maybeError.response?.status

  return typeof status === 'number' ? status : undefined
}

export const listProducts = async (regionId: string) => {
  try {
    const { products } = await sdk.store.product.list({
      region_id: regionId
    })
    return products
  } catch (error) {
    console.error(error)
    throw new StoreDataError('Failed to fetch products', getErrorStatus(error))
  }
}

export const retrieveProduct = async (productId: string, regionId: string) => {
  try {
    const { product } = await sdk.store.product.retrieve(productId, {
      region_id: regionId,
      fields:
        '*variants.calculated_price,+variants.inventory_quantity,*variants.images,+metadata,+tags,'
    })
    return product
  } catch (error) {
    console.error(error)
    const status = getErrorStatus(error)

    throw new StoreDataError(
      status === 404 ? 'Product not found' : 'Failed to fetch product',
      status
    )
  }
}
