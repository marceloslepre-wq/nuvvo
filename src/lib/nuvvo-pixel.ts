/**
 * Utilitário de rastreamento do Pixel Meta 2307497159656039 (Sholver)
 * SOMENTE para as páginas próprias da Nuvvo:
 * - /cadastro (onboarding público)
 * - Tela de login do painel administrativo
 *
 * Nunca carregar nos sites dos clientes nem nos painéis (/admin, /master após logado).
 *
 * Valores por plano:
 * - Plano Básico: 99.90
 * - Pro: 149.90
 * - Gold: 349.90
 * - Pratinum: 499.90
 *
 * predicted_ltv = valor * 12
 * currency: 'BRL'
 * content_name: 'Nuvvo - <nome do plano>'
 *
 * Segurança:
 * - Sempre if (typeof window.fbq === 'function')
 * - NUNCA enviar CNPJ, senha, nome da empresa ou subdomínio ao pixel.
 */

export const SHOLVER_PIXEL_ID = '2307497159656039'

const PLAN_VALUES: Record<string, { name: string; value: number }> = {
  'plano-basico': { name: 'Plano Básico', value: 99.9 },
  'plano-pro': { name: 'Pro', value: 149.9 },
  'plano-gold': { name: 'Gold', value: 349.9 },
  'plano-pratinum': { name: 'Pratinum', value: 499.9 },
}

let sholverPixelLoaded = false

/**
 * Carrega a base do Pixel Sholver 2307497159656039 e dispara PageView
 */
export function ensureSholverPixelLoaded(): void {
  if (typeof window === 'undefined') return
  const win = window as any

  try {
    /* eslint-disable */
    if (!win.fbq) {
      ;(function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        if (f.fbq) return
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
        }
        if (!f._fbq) f._fbq = n
        n.push = n
        n.loaded = true
        n.version = '2.0'
        n.queue = []
        t = b.createElement(e)
        t.async = true
        t.src = v
        s = b.getElementsByTagName(e)[0]
        s.parentNode.insertBefore(t, s)
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
    }
    /* eslint-enable */

    if (typeof win.fbq === 'function' && !sholverPixelLoaded) {
      win.fbq('init', SHOLVER_PIXEL_ID)
      win.fbq('track', 'PageView')
      sholverPixelLoaded = true
    }
  } catch (err) {
    console.warn('Falha silenciosa ao inicializar Pixel Sholver:', err)
  }
}

/**
 * Retorna as informações padronizadas de valor e nome de plano para tracking
 */
export function getPlanTrackingInfo(
  plan?: { name?: string; slug?: string; price?: number } | null,
): {
  contentName: string
  value: number
} {
  const slug = (plan?.slug || '').toLowerCase().trim()
  const rawName = (plan?.name || '').trim()

  if (slug && PLAN_VALUES[slug]) {
    return {
      contentName: `Nuvvo - ${PLAN_VALUES[slug].name}`,
      value: PLAN_VALUES[slug].value,
    }
  }

  // Fallback por nome
  if (/pratinum/i.test(rawName)) {
    return { contentName: 'Nuvvo - Pratinum', value: 499.9 }
  }
  if (/gold/i.test(rawName)) {
    return { contentName: 'Nuvvo - Gold', value: 349.9 }
  }
  if (/pro/i.test(rawName)) {
    return { contentName: 'Nuvvo - Pro', value: 149.9 }
  }
  if (/b[aá]sico/i.test(rawName)) {
    return { contentName: 'Nuvvo - Plano Básico', value: 99.9 }
  }

  const price = typeof plan?.price === 'number' && plan.price > 0 ? plan.price : 99.9
  return {
    contentName: `Nuvvo - ${rawName || 'Plano Básico'}`,
    value: price,
  }
}

let initiateCheckoutFired = false

/**
 * Dispara InitiateCheckout UMA ÚNICA VEZ quando o campo "Nome da Empresa" é preenchido
 */
export function trackSholverInitiateCheckout(planInfo: {
  contentName: string
  value: number
}): void {
  if (typeof window === 'undefined') return
  if (initiateCheckoutFired) return

  const win = window as any
  try {
    if (typeof win.fbq === 'function') {
      win.fbq('track', 'InitiateCheckout', {
        content_name: planInfo.contentName,
        value: planInfo.value,
        currency: 'BRL',
      })
      initiateCheckoutFired = true
    }
  } catch (err) {
    console.warn('Falha silenciosa no InitiateCheckout do Pixel Sholver:', err)
  }
}

/**
 * Formata telefone apenas com dígitos e DDI 55 na frente: ex.: 5527999999999
 */
export function formatPhoneForPixel(rawPhone: string): string {
  const digits = (rawPhone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits
  }
  return `55${digits}`
}

/**
 * Disparado SOMENTE após confirmação de sucesso do backend (onboarding criado).
 * Sequência exata:
 * 1) fbq('init', '2307497159656039', { em: <email>, ph: <phone>, country: 'br' })
 * 2) fbq('track', 'CompleteRegistration', { content_name: 'Nuvvo - <nome do plano>', value: <valor>, currency: 'BRL' })
 * 3) fbq('track', 'StartTrial', { value: <valor>, currency: 'BRL', predicted_ltv: <valor x 12> })
 *
 * NUNCA envia CNPJ, senha, nome da empresa ou subdomínio.
 */
export function trackSholverSuccessfulRegistration(params: {
  email: string
  phone: string
  planInfo: { contentName: string; value: number }
}): void {
  if (typeof window === 'undefined') return
  const win = window as any

  try {
    if (typeof win.fbq === 'function') {
      const cleanEmail = (params.email || '').toLowerCase().replace(/\s+/g, '')
      const cleanPhone = formatPhoneForPixel(params.phone)
      const val = params.planInfo.value
      const ltv = Number((val * 12).toFixed(2))

      // 1. Re-init avançado com dados de correspondência avançada
      win.fbq('init', SHOLVER_PIXEL_ID, {
        em: cleanEmail,
        ph: cleanPhone,
        country: 'br',
      })

      // 2. CompleteRegistration
      win.fbq('track', 'CompleteRegistration', {
        content_name: params.planInfo.contentName,
        value: val,
        currency: 'BRL',
      })

      // 3. StartTrial
      win.fbq('track', 'StartTrial', {
        value: val,
        currency: 'BRL',
        predicted_ltv: ltv,
      })
    }
  } catch (err) {
    console.warn('Falha silenciosa no pós-cadastro do Pixel Sholver:', err)
  }
}

/**
 * Dispara fbq('track', 'Contact') para cliques de WhatsApp no login e no /cadastro
 */
export function trackSholverContact(): void {
  if (typeof window === 'undefined') return
  const win = window as any
  try {
    if (typeof win.fbq === 'function') {
      win.fbq('track', 'Contact')
    }
  } catch (err) {
    // silencioso
  }
}
