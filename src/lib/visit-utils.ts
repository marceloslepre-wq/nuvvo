export interface VisitInfo {
  device: string
  browser: string
  os: string
  modality: string
  source: string
  referrer: string
  session_id: string
}

export function detectDevice(ua: string): string {
  if (/tablet|ipad/i.test(ua)) return 'tablet'
  if (/mobi|android|iphone/i.test(ua)) return 'mobile'
  return 'desktop'
}

export function detectBrowser(ua: string): string {
  if (/edg/i.test(ua)) return 'Edge'
  if (/opr|opera/i.test(ua)) return 'Opera'
  if (/chrome/i.test(ua)) return 'Chrome'
  if (/firefox/i.test(ua)) return 'Firefox'
  if (/safari/i.test(ua)) return 'Safari'
  return 'Other'
}

export function detectOS(ua: string): string {
  if (/windows/i.test(ua)) return 'Windows'
  if (/mac os|macintosh/i.test(ua)) return 'macOS'
  if (/android/i.test(ua)) return 'Android'
  if (/iphone|ipad|ios/i.test(ua)) return 'iOS'
  if (/linux/i.test(ua)) return 'Linux'
  return 'Other'
}

const SEARCH_ENGINES = ['google', 'bing', 'yahoo', 'duckduckgo', 'baidu', 'yandex', 'ask']
const SOCIAL = [
  'facebook',
  'instagram',
  'twitter',
  'x.com',
  'linkedin',
  'tiktok',
  'youtube',
  'pinterest',
  'whatsapp',
  'telegram',
]

const SESSION_MODALITY_KEY = 'visit_session_modality'
const PAID_MEDIUMS = ['cpc', 'paid', 'ppc']

export function detectModality(referrer: string): { modality: string; source: string } {
  // 1. Antes de olhar o referrer, verificar parâmetros da URL (se em ambiente de navegador)
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search)
      const gclid = params.get('gclid')
      const gbraid = params.get('gbraid')
      const wbraid = params.get('wbraid')
      const fbclid = params.get('fbclid')
      const utmMedium = (params.get('utm_medium') || '').toLowerCase()
      const utmSource = params.get('utm_source') || ''

      const isPaidMedium = PAID_MEDIUMS.includes(utmMedium)
      const hasGooglePaidParam = Boolean(gclid || gbraid || wbraid)

      // gclid, gbraid, wbraid ou utm_medium em (cpc, paid, ppc) -> modality: 'paid', source: 'google' (ou o utm_source, se existir)
      if (hasGooglePaidParam || isPaidMedium) {
        // fbclid junto com utm_medium pago -> modality: 'paid', source: 'meta' (ou utm_source)
        if (fbclid && isPaidMedium) {
          const result = { modality: 'paid', source: utmSource || 'meta' }
          saveSessionModality(result)
          return result
        }

        const result = {
          modality: 'paid',
          source: utmSource || (hasGooglePaidParam ? 'google' : 'google'),
        }
        saveSessionModality(result)
        return result
      }

      // Só fbclid, sem utm pago, continua social
      if (fbclid) {
        const result = { modality: 'social', source: utmSource || 'meta' }
        saveSessionModality(result)
        return result
      }
    } catch {
      /* ignore */
    }
  }

  // 2. Se a sessão já possui uma modalidade/origem gravada (primeira página da sessão), reutilizar
  // para que as páginas seguintes da mesma visita não virem "Direto"
  const savedModality = getSessionModality()
  if (savedModality) {
    return savedModality
  }

  // 3. Referrer
  if (!referrer) {
    const result = { modality: 'direct', source: '' }
    saveSessionModality(result)
    return result
  }

  let host = ''
  try {
    host = new URL(referrer).hostname
  } catch {
    const result = { modality: 'direct', source: '' }
    saveSessionModality(result)
    return result
  }

  if (typeof window !== 'undefined' && host === window.location.hostname) {
    const result = { modality: 'direct', source: '' }
    saveSessionModality(result)
    return result
  }

  if (SEARCH_ENGINES.some((s) => host.includes(s))) {
    const result = { modality: 'organic', source: host }
    saveSessionModality(result)
    return result
  }

  if (SOCIAL.some((s) => host.includes(s))) {
    const result = { modality: 'social', source: host }
    saveSessionModality(result)
    return result
  }

  const result = { modality: 'referral', source: host }
  saveSessionModality(result)
  return result
}

function getSessionModality(): { modality: string; source: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(SESSION_MODALITY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.modality === 'string') {
      return { modality: parsed.modality, source: parsed.source || '' }
    }
  } catch {
    /* ignore */
  }
  return null
}

function saveSessionModality(info: { modality: string; source: string }): void {
  if (typeof window === 'undefined') return
  try {
    if (!sessionStorage.getItem(SESSION_MODALITY_KEY)) {
      sessionStorage.setItem(SESSION_MODALITY_KEY, JSON.stringify(info))
    }
  } catch {
    /* ignore */
  }
}

export function getOrCreateSessionId(): string {
  const KEY = 'visit_session_id'
  try {
    let id = sessionStorage.getItem(KEY)
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return Math.random().toString(36).slice(2)
  }
}

export function detectVisitInfo(): VisitInfo {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const referrer = typeof document !== 'undefined' ? document.referrer : ''
  const { modality, source } = detectModality(referrer)
  return {
    device: detectDevice(ua),
    browser: detectBrowser(ua),
    os: detectOS(ua),
    modality,
    source,
    referrer,
    session_id: getOrCreateSessionId(),
  }
}

export const MODALITY_LABELS: Record<string, string> = {
  direct: 'Direto',
  organic: 'Orgânico',
  social: 'Social',
  referral: 'Referência',
  paid: 'Pago',
  unknown: 'Desconhecido',
}

export const DEVICE_LABELS: Record<string, string> = {
  mobile: 'Mobile',
  desktop: 'Desktop',
  tablet: 'Tablet',
}

export function formatDateForFilter(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function formatChartDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`
}

export function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

export function getLocationString(c: string, r: string, ci: string): string {
  const parts = [ci, r, c].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : '—'
}
