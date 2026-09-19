import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface Product extends RecordModel {
  name: string
  description: string
  detailed_description?: string
  price?: number
  image: string
  video: string
  status: 'active' | 'inactive'
  order: number
  variations?: string[]
  rental_period?: string | string[]
  expand?: {
    variations?: any[]
    rental_period?: any | any[]
  }
}

export const getActiveProducts = async (
  locationId?: string,
  tenantId?: string,
): Promise<Product[]> => {
  if (!tenantId) return []
  let filter = `status='active' && tenant='${tenantId}'`
  if (locationId) {
    filter += ` && available_locations~'${locationId}'`
  } else {
    filter += ` && available_locations='__none__'`
  }
  return pb.collection<Product>('products').getFullList({
    filter,
    sort: 'order',
  })
}

export const getProduct = async (id: string): Promise<Product> => {
  return pb.collection<Product>('products').getOne(id, { expand: 'variations,rental_period' })
}

export const getFileUrl = (record: RecordModel, filename: string): string => {
  if (!filename) return ''
  return pb.files.getURL(record, filename)
}
