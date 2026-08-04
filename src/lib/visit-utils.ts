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

export function detectModality(referrer: string): { modality: string; source: string } {
  if (!referrer) return { modality: 'direct', source: '' }
  let host = ''
  try {
    host = new URL(referrer).hostname
  } catch {
    return { modality: 'direct', source: '' }
  }
  if (typeof window !== 'undefined' && host === window.location.hostname) {
    return { modality: 'direct', source: '' }
  }
  if (SEARCH_ENGINES.some((s) => host.includes(s))) {
    return { modality: 'organic', source: host }
  }
  if (SOCIAL.some((s) => host.includes(s))) {
    return { modality: 'social', source: host }
  }
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const medium = params.get('utm_medium') || ''
    if (medium === 'cpc' || medium === 'paid' || medium === 'ppc') {
      return { modality: 'paid', source: host }
    }
  }
  return { modality: 'referral', source: host }
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
