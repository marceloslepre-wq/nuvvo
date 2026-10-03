import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import { detectVisitInfo, formatDateForFilter } from '@/lib/visit-utils'

export interface VisitLog extends RecordModel {
  type: 'pageview' | 'click'
  modality: string
  source: string
  device: string
  browser: string
  os: string
  country: string
  region: string
  city: string
  ip_hash: string
  referrer: string
  path: string
  session_id: string
}

export interface TrackPayload {
  type: 'pageview' | 'click'
  path: string
  tenantId?: string
}

const BOT_USER_AGENT_REGEX =
  /bot|crawler|spider|googlebot|adsbot|mediapartners-google|google-inspectiontool|googleother|lighthouse|headlesschrome|facebookexternalhit|bingpreview|slurp/i

export function shouldIgnoreTracking(): boolean {
  if (typeof window === 'undefined') return false

  // 1. Referrer contém goskip.dev
  if (
    typeof document !== 'undefined' &&
    document.referrer &&
    document.referrer.includes('goskip.dev')
  ) {
    return true
  }

  // 2. Hostname contém goskip.dev ou é localhost
  const hostname = window.location.hostname || ''
  if (hostname.includes('goskip.dev') || hostname === 'localhost' || hostname === '127.0.0.1') {
    return true
  }

  // 3. Dentro de iframe (preview do Skip / embed)
  try {
    if (window.self !== window.top) {
      return true
    }
  } catch {
    // Cross-origin iframe security error -> está dentro de iframe
    return true
  }

  // 4. Usuário administrador / gestor / master logado
  if (pb.authStore.isValid) {
    const role = (pb.authStore.record as any)?.role
    if (!role || role === 'master' || role === 'gestor' || role === 'admin') {
      return true
    }
  }

  // 5. Robôs e ferramentas automatizadas
  if (typeof navigator !== 'undefined') {
    if ((navigator as any).webdriver === true) {
      return true
    }
    const ua = navigator.userAgent || ''
    if (BOT_USER_AGENT_REGEX.test(ua)) {
      return true
    }
  }

  return false
}

export const trackVisit = async (payload: TrackPayload): Promise<void> => {
  if (shouldIgnoreTracking()) {
    return
  }

  const info = detectVisitInfo()
  const body: Record<string, any> = {
    type: payload.type,
    modality: info.modality,
    source: info.source,
    device: info.device,
    browser: info.browser,
    os: info.os,
    referrer: info.referrer,
    path: payload.path,
    session_id: info.session_id,
  }
  if (payload.tenantId) {
    body.tenant_id = payload.tenantId
  }
  try {
    await pb.send('/backend/v1/track', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    /* silently ignore tracking errors */
  }
}

export interface VisitFilter {
  periodDays: number
  modality: string
  tenantId?: string
  onlyBrazil?: boolean
}

export const buildVisitFilter = (filter: VisitFilter): string => {
  const parts: string[] = []
  if (filter.periodDays > 0) {
    const start = new Date()
    start.setDate(start.getDate() - filter.periodDays)
    start.setHours(0, 0, 0, 0)
    parts.push(`created >= '${formatDateForFilter(start)}'`)
  }
  if (filter.modality && filter.modality !== 'all') {
    parts.push(`modality = '${filter.modality}'`)
  }
  if (filter.tenantId && filter.tenantId !== 'all') {
    parts.push(`tenant = '${filter.tenantId}'`)
  }
  if (filter.onlyBrazil) {
    parts.push(`country = 'Brazil'`)
  }
  return parts.length > 0 ? parts.join(' && ') : ''
}

export const getVisitLogs = async (filter: VisitFilter, limit = 1000): Promise<VisitLog[]> => {
  const f = buildVisitFilter(filter)
  const result = await pb.collection<VisitLog>('visit_logs').getList(1, limit, {
    filter: f || '',
    sort: '-created',
  })
  return result.items as unknown as VisitLog[]
}

export const getAllVisitLogs = async (
  filter: VisitFilter,
  fields = 'id,type,modality,session_id,created',
): Promise<VisitLog[]> => {
  const f = buildVisitFilter(filter)
  const result = await pb.collection<VisitLog>('visit_logs').getFullList({
    filter: f || '',
    sort: '-created',
    fields,
  })
  return result as unknown as VisitLog[]
}

export const getTotalVisitCount = async (filter: VisitFilter): Promise<number> => {
  const f = buildVisitFilter(filter)
  const result = await pb.collection('visit_logs').getList(1, 1, {
    filter: f || '',
  })
  return result.totalItems
}

export const getTodayVisitCount = async (
  tenantId?: string,
  onlyBrazil = false,
): Promise<number> => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  let filter = `created >= '${formatDateForFilter(start)}'`
  if (tenantId && tenantId !== 'all') {
    filter += ` && tenant = '${tenantId}'`
  }
  if (onlyBrazil) {
    filter += ` && country = 'Brazil'`
  }
  const result = await pb.collection('visit_logs').getList(1, 1, {
    filter,
  })
  return result.totalItems
}
