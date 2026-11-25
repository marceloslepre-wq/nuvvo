import type { VisitLog } from '@/services/visit-logs'
import { MODALITY_LABELS } from '@/lib/visit-utils'

export interface OriginClickStat {
  origin: string
  sessions: number
  clickSessions: number
  rate: number
}

export interface ButtonClickStat {
  key: string
  clicks: number
  sessions: number
}

export interface ClickStats {
  clickSessions: number
  origins: OriginClickStat[]
  buttons: ButtonClickStat[]
}

export const CLICK_ORIGIN_LABELS: Record<string, string> = {
  floating_button: 'Botão flutuante',
  header_whatsapp_btn: 'WhatsApp (cabeçalho)',
  header_phone_block: 'Telefone (cabeçalho)',
  drawer_whatsapp_btn: 'WhatsApp (menu)',
  drawer_phone: 'Telefone (menu)',
  footer_phone: 'Telefone (rodapé)',
  product_rent_click: 'Botão alugar (produto)',
  nao_informado: 'Não informado',
}

function addToSet(map: Map<string, Set<string>>, key: string, value: string): void {
  let set = map.get(key)
  if (!set) {
    set = new Set<string>()
    map.set(key, set)
  }
  set.add(value)
}

function getOriginLabel(log: VisitLog): string {
  return log.source || MODALITY_LABELS[log.modality] || log.modality || 'Desconhecido'
}

/**
 * Agrega sessões e cliques (type = 'click') por origem e por botão (click_origin).
 * Taxa de conversão = sessões com clique / sessões totais daquela origem.
 */
export function computeClickStats(logs: VisitLog[]): ClickStats {
  const originSessions = new Map<string, Set<string>>()
  const originClickSessions = new Map<string, Set<string>>()
  const buttonSessions = new Map<string, Set<string>>()
  const buttonClicks = new Map<string, number>()
  const clickSessions = new Set<string>()

  for (const log of logs) {
    const sid = log.session_id
    if (!sid) continue
    const origin = getOriginLabel(log)
    addToSet(originSessions, origin, sid)

    if (log.type === 'click') {
      addToSet(originClickSessions, origin, sid)
      clickSessions.add(sid)
      const key = log.click_origin || 'nao_informado'
      buttonClicks.set(key, (buttonClicks.get(key) || 0) + 1)
      addToSet(buttonSessions, key, sid)
    }
  }

  const origins: OriginClickStat[] = Array.from(originSessions.entries())
    .map(([origin, sessions]) => {
      const clickSet = originClickSessions.get(origin)
      const clickCount = clickSet ? clickSet.size : 0
      return {
        origin,
        sessions: sessions.size,
        clickSessions: clickCount,
        rate: sessions.size > 0 ? (clickCount / sessions.size) * 100 : 0,
      }
    })
    .sort((a, b) => b.sessions - a.sessions)

  const buttons: ButtonClickStat[] = Array.from(buttonClicks.entries())
    .map(([key, clicks]) => ({
      key,
      clicks,
      sessions: buttonSessions.get(key)?.size || 0,
    }))
    .sort((a, b) => b.clicks - a.clicks)

  return { clickSessions: clickSessions.size, origins, buttons }
}
