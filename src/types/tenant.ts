export interface Plan {
  id: string
  name: string
  slug: string
  badge?: string
  description?: string
  price: number
  is_free?: boolean
  unit_limit?: number
  user_limit?: number
  product_limit?: number
  features?: string[] | any
  status: 'active' | 'inactive'
  is_master_exclusive?: boolean
  order?: number
  created?: string
  updated?: string
}

export type PlanStatus = 'trial' | 'active' | 'suspended' | 'canceled'
export type WhatsAppStatus = 'connected' | 'disconnected'

export type LicenseEventType =
  | 'license_created'
  | 'renewal_pix'
  | 'renewal_manual'
  | 'plan_change'
  | 'license_suspended'
  | 'license_reactivated'

export interface LicenseRenewal {
  id: string
  tenant: string
  previous_expiration?: string
  new_expiration: string
  days_added?: number
  amount_paid?: number
  notes?: string
  renewed_by?: string
  event_type?: LicenseEventType
  plan_name?: string
  description?: string
  period_display?: string
  payment_id?: string
  payment_status?: 'pending' | 'approved' | 'rejected' | 'canceled'
  created?: string
  updated?: string
}

export interface Tenant {
  id: string
  name: string
  slug: string
  subdomain?: string
  custom_domain?: string
  preview_host?: string
  extra_hosts?: string
  status: 'active' | 'inactive'
  phone?: string
  email?: string
  logo?: string
  hero_media?: string
  about_us?: string
  terms?: string
  privacy?: string
  returns?: string
  primary_color?: string
  created?: string
  updated?: string

  // Campos comerciais / licenciamento Nuvvo
  plan?: string
  expand?: {
    plan?: Plan
  }
  plan_status?: PlanStatus
  trial_days?: number
  start_date?: string
  expiration_date?: string
  effective_value?: number
  effective_unit_limit?: number
  effective_user_limit?: number
  effective_product_limit?: number
  document_cnpj?: string
  whatsapp_status?: WhatsAppStatus
  is_origin?: boolean
  pending_pix_payment_id?: string
}

/**
 * URL pública oficial da plataforma Nuvvo Master
 */
export const NUVVO_OFFICIAL_URL = 'https://nuvvo.sholver.com.br'

/**
 * Segmentos de primeiro nível reservados no roteamento da plataforma Nuvvo.
 * Nunca devem ser interpretados como slug de empresa no domínio oficial.
 */
export const RESERVED_PATH_PREFIXES = [
  'cadastro',
  'admin',
  'master',
  'categoria',
  'produto',
  'pagina',
  'nossas-lojas',
  'backend',
  'api',
  '_',
] as const

/**
 * Normaliza um hostname removendo porta e convertendo para minúsculas.
 */
export function normalizeHost(rawHost: string): string {
  if (!rawHost) return ''
  return rawHost.split(':')[0].toLowerCase().trim()
}

/**
 * Identifica se o host corresponde ao domínio oficial do Master Nuvvo
 * (nuvvo.sholver.com.br ou www.nuvvo.sholver.com.br)
 */
export function isNuvvoOfficialHost(rawHost?: string): boolean {
  const host = normalizeHost(rawHost || (typeof window !== 'undefined' ? window.location.host : ''))
  return host === 'nuvvo.sholver.com.br' || host === 'www.nuvvo.sholver.com.br'
}

/**
 * Extrai o subdomínio do padrão *.sholver.com.br
 * Ex: aluguelhospitalhome.sholver.com.br -> aluguelhospitalhome
 * Se não for do domínio sholver.com.br, retorna null.
 */
export function extractSubdomainFromSholver(host: string): string | null {
  const normalized = normalizeHost(host)
  const suffix = '.sholver.com.br'
  if (normalized.endsWith(suffix) && normalized !== 'sholver.com.br') {
    const sub = normalized.slice(0, -suffix.length)
    return sub.trim() || null
  }
  return null
}

/**
 * Verifica se um host corresponde a um determinado tenant.
 */
export function matchesHost(tenant: Tenant, host: string): boolean {
  const norm = normalizeHost(host)
  if (!norm) return false

  // 1. Subdomínio sholver.com.br
  const sub = extractSubdomainFromSholver(norm)
  if (sub && tenant.subdomain && tenant.subdomain.toLowerCase() === sub) {
    return true
  }

  // 2. custom_domain (ex: aluguelhospitalhome.sholver.com.br ou dominio.com.br próprio)
  if (tenant.custom_domain && normalizeHost(tenant.custom_domain) === norm) {
    return true
  }

  // 3. preview_host (ex: plataforma-de-vendas-8286f--preview.goskip.app)
  if (tenant.preview_host && normalizeHost(tenant.preview_host) === norm) {
    return true
  }

  // 4. extra_hosts (separados por vírgula, ex: localhost, 127.0.0.1, etc.)
  if (tenant.extra_hosts) {
    const extraList = tenant.extra_hosts
      .split(',')
      .map((h) => normalizeHost(h))
      .filter(Boolean)
    if (extraList.includes(norm)) {
      return true
    }
  }

  // 5. Comparação direta com slug se for um subdomínio
  if (sub && tenant.slug && tenant.slug.toLowerCase() === sub) {
    return true
  }

  // 6. Host oficial do Nuvvo mapeia para a instância de origem
  if (
    tenant.is_origin &&
    (norm === 'nuvvo.sholver.com.br' || norm === 'www.nuvvo.sholver.com.br')
  ) {
    return true
  }

  return false
}

/**
 * Retorna a URL pública recomendada para o tenant.
 * - Se for origin (Hospital Home), utiliza seu subdomínio dedicado ou custom domain
 * - Se estiver no domínio oficial da Nuvvo ou se for nova empresa sem wildcard CNAME ativo,
 *   a URL por path provisória https://nuvvo.sholver.com.br/:slug é fornecida como opção C,
 *   mas caso tenha subdomínio/custom_domain configurado, também é utilizável.
 */
export function getTenantPublicUrl(tenant: Tenant): string {
  // Se for hospital home ou tiver custom_domain que não seja nuvvo
  if (tenant.custom_domain && !tenant.custom_domain.includes('nuvvo.sholver.com.br')) {
    return `https://${tenant.custom_domain}`
  }
  // Se for o tenant de origem (Hospital Home), subdomínio direto
  if (tenant.is_origin && tenant.subdomain) {
    return `https://${tenant.subdomain}.sholver.com.br`
  }
  // Para tenants novos em nuvvo.sholver.com.br provisoriamente Opção C
  const slug = tenant.slug || tenant.subdomain
  if (slug) {
    return `${NUVVO_OFFICIAL_URL}/${slug}`
  }
  return NUVVO_OFFICIAL_URL
}

/**
 * Checa se o tenant está expirado ou bloqueado
 */
export function isTenantBlocked(tenant: Tenant | null): {
  blocked: boolean
  reason: string | null
} {
  if (!tenant) return { blocked: false, reason: null }
  if (tenant.is_origin) return { blocked: false, reason: null }

  if (tenant.plan_status === 'suspended') {
    return { blocked: true, reason: 'Licença suspensa' }
  }
  if (tenant.plan_status === 'canceled') {
    return { blocked: true, reason: 'Licença cancelada' }
  }

  if (tenant.expiration_date) {
    const exp = new Date(tenant.expiration_date)
    const now = new Date()
    if (exp.getTime() < now.getTime()) {
      return { blocked: true, reason: 'Licença expirada' }
    }
  }

  return { blocked: false, reason: null }
}
