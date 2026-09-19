import pb from '@/lib/pocketbase/client'
import {
  Tenant,
  Plan,
  LicenseRenewal,
  matchesHost,
  normalizeHost,
  isNuvvoOfficialHost,
} from '@/types/tenant'

export const getTenants = async (): Promise<Tenant[]> => {
  return pb.collection<Tenant>('tenants').getFullList({
    sort: '-created',
    expand: 'plan',
  })
}

export const getTenantById = async (id: string): Promise<Tenant> => {
  return pb.collection<Tenant>('tenants').getOne(id, {
    expand: 'plan',
  })
}

export const updateTenant = async (id: string, data: Partial<Tenant>): Promise<Tenant> => {
  return pb.collection<Tenant>('tenants').update(id, data, {
    expand: 'plan',
  })
}

export const createTenant = async (data: Partial<Tenant>): Promise<Tenant> => {
  return pb.collection<Tenant>('tenants').create(data, {
    expand: 'plan',
  })
}

export const deleteTenant = async (id: string): Promise<boolean> => {
  return pb.collection('tenants').delete(id)
}

// Planos Comerciais
export const getPlans = async (): Promise<Plan[]> => {
  return pb.collection<Plan>('plans').getFullList({
    sort: 'order',
  })
}

export const getPlanById = async (id: string): Promise<Plan> => {
  return pb.collection<Plan>('plans').getOne(id)
}

export const createPlan = async (data: Partial<Plan>): Promise<Plan> => {
  return pb.collection<Plan>('plans').create(data)
}

export const updatePlan = async (id: string, data: Partial<Plan>): Promise<Plan> => {
  return pb.collection<Plan>('plans').update(id, data)
}

export const deletePlan = async (id: string): Promise<boolean> => {
  return pb.collection('plans').delete(id)
}

// Histórico de renovações
export const getRenewalsByTenant = async (tenantId: string): Promise<LicenseRenewal[]> => {
  return pb.collection<LicenseRenewal>('license_renewals').getFullList({
    filter: `tenant = '${tenantId}'`,
    sort: '-created',
  })
}

export const createRenewal = async (data: {
  tenant: string
  previous_expiration?: string
  new_expiration: string
  days_added?: number
  amount_paid?: number
  notes?: string
  renewed_by?: string
  event_type?: string
  plan_name?: string
  description?: string
  period_display?: string
  payment_id?: string
  payment_status?: string
}): Promise<LicenseRenewal> => {
  return pb.collection<LicenseRenewal>('license_renewals').create(data)
}

// Renovação rápida +30 dias
export const quickRenew30Days = async (
  tenant: Tenant,
  renewedBy: string = 'Master',
): Promise<Tenant> => {
  const currentExp = tenant.expiration_date ? new Date(tenant.expiration_date) : new Date()
  const baseDate = currentExp.getTime() > Date.now() ? currentExp : new Date()
  const newExp = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)

  // 1. Cria histórico de renovação
  await createRenewal({
    tenant: tenant.id,
    previous_expiration: tenant.expiration_date,
    new_expiration: newExp.toISOString(),
    days_added: 30,
    amount_paid: tenant.effective_value ?? 0,
    notes: 'Renovação rápida +30 dias aplicada pelo painel Master',
    renewed_by: renewedBy,
    event_type: 'renewal_manual',
    plan_name: tenant.expand?.plan?.name || 'Plano Atual',
    description: 'Renovação rápida de 30 dias',
    period_display: '30 dias adicionados',
  })

  // 2. Atualiza tenant
  return updateTenant(tenant.id, {
    expiration_date: newExp.toISOString(),
    plan_status: 'active',
  })
}

/**
 * Resolve o tenant ativo a partir do hostname acessado.
 * Retorna o Tenant encontrado ou null se nenhum corresponder.
 */
export const resolveTenantByHost = async (host: string): Promise<Tenant | null> => {
  const normHost = normalizeHost(host)
  if (!normHost) return null

  const allTenants = await getTenants()

  // 1. Tratamento específico para o domínio oficial da plataforma Master Nuvvo
  // Quando acessado via nuvvo.sholver.com.br (ou www.nuvvo.sholver.com.br),
  // deve tratar como a INSTÂNCIA DE ORIGEM (a mesma de demonstração/master).
  if (isNuvvoOfficialHost(normHost)) {
    const originTenant =
      allTenants.find((t) => t.is_origin) ||
      allTenants.find((t) => t.slug === 'hospital-home') ||
      (allTenants.length > 0 ? allTenants[0] : null)
    return originTenant
  }

  // 2. Procura correspondência direta com o host (subdomínio, custom_domain, preview_host, extra_hosts)
  for (const t of allTenants) {
    if (matchesHost(t, normHost)) {
      return t
    }
  }

  // 3. Fallback seguro: se estiver rodando em localhost / dev sem match ou no preview sem match explícito,
  // ou se for a plataforma default, localiza a instância de origem
  const isLocalOrPreview =
    normHost === 'localhost' ||
    normHost === '127.0.0.1' ||
    normHost.endsWith('.goskip.app') ||
    normHost.endsWith('.goskip.dev')

  if (isLocalOrPreview) {
    const origin =
      allTenants.find((t) => t.is_origin) ||
      allTenants.find((t) => t.slug === 'hospital-home') ||
      (allTenants.length > 0 ? allTenants[0] : null)
    if (origin) return origin
  }

  return null
}

export interface CreatePixResponse {
  success: boolean
  mode: 'demo' | 'live'
  payment_id: string
  status: string
  plan_name: string
  amount: number
  qr_code: string
  qr_code_base64?: string
  ticket_url?: string
  message?: string
}

export const createPixPayment = async (tenantId: string): Promise<CreatePixResponse> => {
  return pb.send<CreatePixResponse>('/backend/v1/licenses/create-pix', {
    method: 'POST',
    body: { tenant_id: tenantId },
  })
}

export interface PaymentStatusResponse {
  payment_id: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'in_process' | string
  status_detail?: string
  renewed: boolean
  tenant_id?: string
  mode?: string
  message?: string
  error?: string
}

export const getPaymentStatus = async (paymentId: string): Promise<PaymentStatusResponse> => {
  return pb.send<PaymentStatusResponse>(`/backend/v1/licenses/payment-status/${paymentId}`, {
    method: 'GET',
  })
}

export interface ReconcilePendingResponse {
  success: boolean
  reconciled_count: number
  results?: Array<{
    tenant_id: string
    payment_id: string
    status?: string
    detail?: string
    error?: string
  }>
}

export const reconcilePendingPayments = async (
  tenantId?: string,
): Promise<ReconcilePendingResponse> => {
  return pb.send<ReconcilePendingResponse>('/backend/v1/licenses/reconcile-pending', {
    method: 'POST',
    body: { tenant_id: tenantId },
  })
}

export const changeTenantPlan = async (
  tenant: Tenant,
  newPlan: Plan,
  changedBy: string = 'Gestor',
): Promise<Tenant> => {
  const currentPlanName = tenant.expand?.plan?.name || 'Plano Anterior'

  // Registra evento de histórico
  await createRenewal({
    tenant: tenant.id,
    previous_expiration: tenant.expiration_date,
    new_expiration: tenant.expiration_date || new Date().toISOString(),
    days_added: 0,
    amount_paid: newPlan.price,
    notes: `Alteração de plano: ${currentPlanName} -> ${newPlan.name}`,
    renewed_by: changedBy,
    event_type: 'plan_change',
    plan_name: newPlan.name,
    description: `Mudança de plano para ${newPlan.name}`,
    period_display: 'Vigência mantida',
  })

  // Atualiza tenant com novo plano e novos limites
  return updateTenant(tenant.id, {
    plan: newPlan.id,
    effective_value: newPlan.price,
    effective_unit_limit: 0,
    effective_user_limit: newPlan.user_limit,
  })
}
