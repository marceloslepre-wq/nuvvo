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
}

export const trackVisit = async (payload: TrackPayload): Promise<void> => {
  const info = detectVisitInfo()
  const body = {
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

export const getTodayVisitCount = async (): Promise<number> => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const result = await pb.collection('visit_logs').getList(1, 1, {
    filter: `created >= '${formatDateForFilter(start)}'`,
  })
  return result.totalItems
}
