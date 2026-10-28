/**
 * Utilitário para gerenciamento seguro da tag do Google Ads da Nuvvo (AW-18513891486)
 *
 * REGRAS CRÍTICAS:
 * 1. Carregar script https://www.googletagmanager.com/gtag/js?id=AW-18513891486 + dataLayer + gtag('config', 'AW-18513891486')
 *    SOMENTE nas páginas próprias da Nuvvo:
 *    - /login
 *    - /admin/login
 *    - /cadastro
 * 2. NUNCA nos sites dos clientes (subdomínios de tenants, custom domains, preview hosts).
 * 3. NUNCA no painel após login (/admin/dashboard, /admin/products, etc., nem /master).
 * 4. Carregamento dinâmico idempotente (não duplica script em navegação SPA).
 * 5. Disparo de conversão (send_to: 'AW-18513891486/iBAaCLO-0qwdEJ6hjvxE') SOMENTE após confirmação
 *    de sucesso do backend na criação da conta (nunca no clique, nunca em erro), UMA ÚNICA VEZ por cadastro.
 * 6. Todo disparo com typeof window.gtag === 'function' em try/catch silencioso.
 */

import { isNuvvoOfficialHost } from '@/types/tenant'

export const NUVVO_GOOGLE_ADS_ID = 'AW-18513891486'
export const NUVVO_CONVERSION_SEND_TO = 'AW-18513891486/iBAaCLO-0qwdEJ6hjvxE'

/**
 * Mapeamento padronizado de valores por plano (valores numéricos conforme especificação):
 * Plano Básico: 99.90 | Pro: 149.90 | Gold: 349.90 | Pratinum: 499.90
 */
export const NUVVO_PLAN_VALUES: Record<string, number> = {
  'plano-basico': 99.9,
  'plano-pro': 149.9,
  'plano-gold': 349.9,
  'plano-pratinum': 499.9,
}

let googleAdsScriptLoaded = false
const firedConversionTransactions = new Set<string>()

/**
 * Valida se um determinado caminho pathname pertence estritamente às páginas próprias da Nuvvo
 * que devem carregar a tag do Google Ads (/login, /admin/login, /cadastro).
 */
export function isNuvvoGoogleAdsAllowedPath(pathname: string): boolean {
  if (!pathname) return false
  const p = pathname.toLowerCase().trim()
  if (p === '/cadastro' || p === '/cadastro/') return true
  if (p === '/login' || p === '/login/') return true
  if (p === '/admin/login' || p === '/admin/login/') return true
  return false
}

/**
 * Determina se a tag do Google Ads da Nuvvo pode ser carregada/executada no contexto atual.
 *
 * Requisitos:
 * 1. Deve ser o domínio oficial da Nuvvo (nuvvo.sholver.com.br ou www.nuvvo.sholver.com.br,
 *    ou ambientes de desenvolvimento/preview da própria Nuvvo sem tenant).
 *    Mas se for subdomínio de tenant (ex: aluguelhospitalhome.sholver.com.br) ou domínio customizado, NUNCA.
 * 2. O pathname deve ser exclusivamente /login, /admin/login ou /cadastro.
 * 3. Qualquer outra rota pública de tenant ou interna (/admin/*, /master) retorna false.
 */
export function isNuvvoGoogleAdsAllowed(pathname?: string): boolean {
  if (typeof window === 'undefined') return false

  const currentPath = pathname ?? window.location.pathname
  if (!isNuvvoGoogleAdsAllowedPath(currentPath)) {
    return false
  }

  const host = (window.location.host || '').toLowerCase().trim().split(':')[0]

  // Se o host for explicitamente um subdomínio de tenant (ex: cliente.sholver.com.br),
  // NUNCA carregar tags da Nuvvo
  if (
    host.endsWith('.sholver.com.br') &&
    host !== 'nuvvo.sholver.com.br' &&
    host !== 'www.nuvvo.sholver.com.br'
  ) {
    return false
  }

  // Se estiver no domínio oficial da Nuvvo, permite
  if (isNuvvoOfficialHost(host)) {
    return true
  }

  // Em localhost / ambientes locais de teste da plataforma
  if (host === 'localhost' || host === '127.0.0.1' || host.includes('localhost:')) {
    return true
  }

  // Caso padrão de fallback defensivo: se estiver em um domínio não-oficial de cliente, bloqueia
  return false
}

/**
 * Carrega a tag base do Google Ads (gtag.js) de forma idempotente e segura
 * SOMENTE nas rotas /login, /admin/login e /cadastro da Nuvvo.
 */
export function ensureNuvvoGoogleAdsLoaded(pathname?: string): void {
  if (typeof window === 'undefined') return

  if (!isNuvvoGoogleAdsAllowed(pathname)) {
    return
  }

  try {
    const win = window as any

    // 1. Inicializa dataLayer se não existir
    win.dataLayer = win.dataLayer || []

    // 2. Inicializa função gtag se não existir
    if (typeof win.gtag !== 'function') {
      win.gtag = function (...args: any[]) {
        win.dataLayer.push(args)
      }
    }

    // 3. Injeta script se ainda não estiver presente no DOM
    const existingScript = document.querySelector(
      `script[src*="googletagmanager.com/gtag/js?id=${NUVVO_GOOGLE_ADS_ID}"]`,
    )

    if (!existingScript) {
      const script = document.createElement('script')
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${NUVVO_GOOGLE_ADS_ID}`
      script.setAttribute('data-nuvvo-ads-tag', NUVVO_GOOGLE_ADS_ID)

      const firstScript = document.getElementsByTagName('script')[0]
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript)
      } else {
        document.head.appendChild(script)
      }
    }

    // 4. Executa inicialização base UMA ÚNICA VEZ
    if (!googleAdsScriptLoaded) {
      win.gtag('js', new Date())
      win.gtag('config', NUVVO_GOOGLE_ADS_ID)
      googleAdsScriptLoaded = true
    }
  } catch (err) {
    // Falha silenciosa, nunca bloqueia ou quebra a página
  }
}

/**
 * Retorna o valor numérico padrão do plano para o evento de conversão do Google Ads.
 */
export function getNuvvoPlanValue(
  plan?: { name?: string; slug?: string; price?: number } | null,
): number {
  if (!plan) return 99.9

  const slug = (plan.slug || '').toLowerCase().trim()
  if (slug && NUVVO_PLAN_VALUES[slug] !== undefined) {
    return NUVVO_PLAN_VALUES[slug]
  }

  const rawName = (plan.name || '').toLowerCase()
  if (rawName.includes('pratinum')) return 499.9
  if (rawName.includes('gold')) return 349.9
  if (rawName.includes('pro')) return 149.9
  if (rawName.includes('básico') || rawName.includes('basico')) return 99.9

  if (typeof plan.price === 'number' && plan.price > 0) {
    return plan.price
  }

  return 99.9
}

export interface TrackConversionParams {
  transactionId: string
  value: number
}

/**
 * Dispara o evento de conversão do Google Ads (send_to: AW-18513891486/iBAaCLO-0qwdEJ6hjvxE)
 * SOMENTE após confirmação de sucesso do backend na criação da conta (onboarding).
 *
 * Guardas:
 * - UMA ÚNICA VEZ por cadastro (verificação em Set de memória + sessionStorage para sobreviver a remounts)
 * - typeof window.gtag === 'function'
 * - try/catch silencioso
 */
export function trackNuvvoAdsConversion(params: TrackConversionParams): boolean {
  if (typeof window === 'undefined') return false

  const { transactionId, value } = params
  const cleanTxId = (transactionId || '').trim()
  if (!cleanTxId) return false

  // 1. Guard contra disparos duplicados na mesma sessão
  if (firedConversionTransactions.has(cleanTxId)) {
    return false
  }

  try {
    const sessionKey = `nuvvo_gads_conv_${cleanTxId}`
    if (sessionStorage.getItem(sessionKey)) {
      firedConversionTransactions.add(cleanTxId)
      return false
    }

    const win = window as any
    if (typeof win.gtag === 'function') {
      win.gtag('event', 'conversion', {
        send_to: NUVVO_CONVERSION_SEND_TO,
        value: Number(value.toFixed(2)),
        currency: 'BRL',
        transaction_id: cleanTxId,
      })

      firedConversionTransactions.add(cleanTxId)
      try {
        sessionStorage.setItem(sessionKey, '1')
      } catch {
        // quota ou private mode, engolir
      }
      return true
    }
  } catch (err) {
    // Falha silenciosa
  }

  return false
}
