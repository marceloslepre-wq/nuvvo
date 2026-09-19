import pb from '@/lib/pocketbase/client'
import { Tenant, matchesHost, normalizeHost } from '@/types/tenant'

export const getTenants = async (): Promise<Tenant[]> => {
  return pb.collection<Tenant>('tenants').getFullList({
    sort: 'name',
  })
}

export const getTenantById = async (id: string): Promise<Tenant> => {
  return pb.collection<Tenant>('tenants').getOne(id)
}

/**
 * Resolve o tenant ativo a partir do hostname acessado.
 * Retorna o Tenant encontrado ou null se nenhum corresponder.
 */
export const resolveTenantByHost = async (host: string): Promise<Tenant | null> => {
  const normHost = normalizeHost(host)
  if (!normHost) return null

  const allTenants = await getTenants()

  // Procura correspondência direta com o host
  for (const t of allTenants) {
    if (matchesHost(t, normHost)) {
      return t
    }
  }

  // Fallback seguro: se estiver rodando em localhost / dev sem match ou no preview sem match explícito,
  // ou se for a plataforma default, localiza o Hospital Home
  const isLocalOrPreview =
    normHost === 'localhost' ||
    normHost === '127.0.0.1' ||
    normHost.endsWith('.goskip.app') ||
    normHost.endsWith('.goskip.dev')

  if (isLocalOrPreview) {
    const hospital = allTenants.find((t) => t.slug === 'hospital-home')
    if (hospital) return hospital
    if (allTenants.length > 0) return allTenants[0]
  }

  return null
}
