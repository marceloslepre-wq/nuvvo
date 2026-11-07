import pb from '@/lib/pocketbase/client'

export interface CategoryPathInfo {
  id: string
  name: string
}

/**
 * Retorna um mapa de id -> { name } das categorias da empresa ativa.
 * A busca é feita em lote único, em memória (mesmo padrão do mapa de produtos).
 */
export const getTenantCategoryPathMap = async (
  tenantId?: string,
): Promise<Map<string, CategoryPathInfo>> => {
  const map = new Map<string, CategoryPathInfo>()
  if (!tenantId) return map

  try {
    const categories = await pb.collection('categories').getFullList({
      filter: `tenant = '${tenantId}'`,
      fields: 'id,name',
      sort: 'order,name',
    })
    for (const c of categories) {
      map.set(c.id, {
        id: c.id,
        name: (c as any).name || '',
      })
    }
  } catch {
    /* fallback silencioso */
  }

  return map
}
