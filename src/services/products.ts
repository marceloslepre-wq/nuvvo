import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface ProductVariantDetail extends RecordModel {
  product: string
  variation: string
  reference_code?: string
  price?: number
}

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

export interface ProductPathInfo {
  id: string
  name: string
  reference?: string
  displayReference: string
}

/**
 * Retorna um mapa de id -> { name, reference, displayReference } dos produtos da empresa ativa.
 * A busca é feita em lote único (produtos + variações com referência) em memória.
 */
export const getTenantProductReferenceMap = async (
  tenantId?: string,
): Promise<Map<string, ProductPathInfo>> => {
  const map = new Map<string, ProductPathInfo>()
  if (!tenantId) return map

  try {
    const filter = `tenant = '${tenantId}'`
    const [products, pvdList, variations] = await Promise.all([
      pb.collection('products').getFullList({
        filter,
        fields: 'id,name,reference,variations',
        sort: 'order',
      }),
      pb
        .collection('product_variant_details')
        .getFullList({
          fields: 'id,product,variation,reference_code',
        })
        .catch(() => []),
      pb
        .collection('variations')
        .getFullList({
          filter,
          fields: 'id,name,order',
          sort: 'order,name',
        })
        .catch(() => []),
    ])

    const variationNameMap = new Map<string, string>()
    variations.forEach((v: any) => {
      variationNameMap.set(v.id, v.name)
    })

    const pvdByProduct = new Map<string, any[]>()
    pvdList.forEach((vd: any) => {
      if (!vd.product || !vd.reference_code) return
      const list = pvdByProduct.get(vd.product) || []
      list.push(vd)
      pvdByProduct.set(vd.product, list)
    })

    for (const p of products) {
      const baseRef = (p.reference || '').trim()
      let displayReference = baseRef

      // Se não tem referência base (ou para enriquecer caso variações tenham ref com nome legível):
      // Verificar variações com referência
      const pvds = pvdByProduct.get(p.id) || []
      if (!displayReference && pvds.length > 0) {
        // Encontra a primeira variação com referência legível
        const firstPvd = pvds[0]
        const varName = variationNameMap.get(firstPvd.variation)
        const refCode = String(firstPvd.reference_code).trim()
        if (varName && refCode) {
          // Ex: "24 tam 44" ou "600 (Tam 38)" ou "Tam 44: 24"
          // O usuário deu como exemplo: "/produto/244 tam 44"
          displayReference = `${refCode} ${varName.toLowerCase()}`
        } else if (refCode) {
          displayReference = refCode
        }
      }

      map.set(p.id, {
        id: p.id,
        name: p.name || '',
        reference: baseRef || undefined,
        displayReference: displayReference || '',
      })
    }
  } catch {
    /* fallback silencioso */
  }

  return map
}

export const getActiveProducts = async (
  locationId?: string,
  tenantId?: string,
): Promise<Product[]> => {
  if (!tenantId) return []
  let filter = `status='active' && tenant='${tenantId}'`
  if (locationId) {
    filter += ` && (available_locations:length = 0 || available_locations = null || available_locations~'${locationId}')`
  } else {
    filter += ` && (available_locations:length = 0 || available_locations = null)`
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
