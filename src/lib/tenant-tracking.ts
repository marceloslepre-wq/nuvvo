/**
 * Utilitário de rastreamento por cliente (tenant) na plataforma Nuvvo.
 *
 * Regras da especificação:
 * 1. GTM e Meta Pixel configurados no tenant devem ser carregados SOMENTE no site público daquele cliente.
 * 2. NUNCA no site de outro cliente, NUNCA no painel administrativo (/admin, /master) e NUNCA nas páginas da Nuvvo (login, /cadastro).
 * 3. Se os campos estiverem vazios, não carrega nada.
 * 4. Em navegação SPA, dispara PageView a cada troca de rota, uma única vez por página (sem duplicar).
 * 5. Todo disparo deve verificar antes: if (typeof window.fbq === 'function') { ... }
 * 6. Fire-and-forget silencioso em try/catch, sem atrasar ou quebrar navegação.
 */

import { Tenant } from '@/types/tenant'

const loadedGtmIds = new Set<string>()
const initializedPixelIds = new Set<string>()
let lastTenantTrackedPath: string | null = null
let lastTrackedPixelId: string | null = null

/**
 * Verifica se a rota é administrativa ou restrita da plataforma Nuvvo
 */
export function isNonPublicTenantPath(pathname: string): boolean {
  if (!pathname) return false
  const p = pathname.toLowerCase().trim()
  if (p.startsWith('/admin')) return true
  if (p.startsWith('/master')) return true
  if (p === '/cadastro' || p.startsWith('/cadastro/')) return true
  return false
}

/**
 * Garante que a base do Meta Pixel está carregada no window
 */
function ensureMetaPixelBaseLoaded(): void {
  if (typeof window === 'undefined') return
  const win = window as any
  if (win.fbq) return

  try {
    /* eslint-disable */
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
    /* eslint-enable */
  } catch (err) {
    console.warn('Falha silenciosa ao inicializar base do Meta Pixel:', err)
  }
}

/**
 * Injeta o script do Google Tag Manager para um determinado GTM-ID no site público do tenant.
 */
function loadGtmForTenant(gtmId: string): void {
  if (typeof window === 'undefined') return
  const cleanId = (gtmId || '').trim()
  if (!cleanId || !cleanId.startsWith('GTM-')) return

  if (loadedGtmIds.has(cleanId)) return

  try {
    const win = window as any
    win.dataLayer = win.dataLayer || []
    win.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })

    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(cleanId)}`
    script.setAttribute('data-tenant-gtm', cleanId)
    const firstScript = document.getElementsByTagName('script')[0]
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript)
    } else {
      document.head.appendChild(script)
    }

    loadedGtmIds.add(cleanId)
  } catch (err) {
    console.warn('Falha ao carregar script GTM do tenant:', err)
  }
}

/**
 * Inicializa o Pixel da Meta para o tenant e registra o PageView inicial
 */
function initMetaPixelForTenant(pixelId: string): void {
  if (typeof window === 'undefined') return
  const cleanId = (pixelId || '').trim().replace(/\D/g, '')
  if (!cleanId) return

  ensureMetaPixelBaseLoaded()

  try {
    const win = window as any
    if (typeof win.fbq === 'function') {
      if (!initializedPixelIds.has(cleanId)) {
        win.fbq('init', cleanId)
        initializedPixelIds.add(cleanId)
      }
    }
  } catch (err) {
    console.warn('Falha ao inicializar Pixel do tenant:', err)
  }
}

/**
 * Dispara o PageView no Meta Pixel e no dataLayer do GTM para o site público do cliente
 */
export function trackTenantPageView(
  tenant: Tenant | null,
  pathname: string,
  isDirectAdminScreen = false,
): void {
  if (typeof window === 'undefined') return
  if (!tenant) return

  // NUNCA disparar em telas administrativas, login ou cadastro
  if (isDirectAdminScreen || isNonPublicTenantPath(pathname)) {
    return
  }

  const gtmId = (tenant.gtm_id || '').trim()
  const pixelId = (tenant.meta_pixel_id || '').trim().replace(/\D/g, '')

  // Se ambos vazios, nada a carregar/disparar
  if (!gtmId && !pixelId) {
    return
  }

  // 1. Carregar GTM dinamicamente se configurado
  if (gtmId) {
    loadGtmForTenant(gtmId)
  }

  // 2. Inicializar Pixel se configurado
  if (pixelId) {
    initMetaPixelForTenant(pixelId)
  }

  // 3. Disparar PageView UMA ÚNICA VEZ por troca de rota
  const pageKey = `${pixelId || gtmId}:${pathname}`
  if (lastTenantTrackedPath === pageKey) {
    return
  }
  lastTenantTrackedPath = pageKey
  lastTrackedPixelId = pixelId || null

  try {
    const win = window as any
    // Disparo Meta Pixel
    if (pixelId && typeof win.fbq === 'function') {
      win.fbq('track', 'PageView')
    }

    // Disparo dataLayer PageView para GTM
    if (gtmId) {
      win.dataLayer = win.dataLayer || []
      win.dataLayer.push({
        event: 'pageview',
        page_path: pathname,
        tenant_id: tenant.id,
        tenant_slug: tenant.slug,
      })
    }
  } catch (err) {
    console.warn('Falha ao registrar PageView do tenant:', err)
  }
}

/**
 * Dispara fbq('track', 'Contact') se houver Meta Pixel ativo no contexto atual
 */
export function trackTenantContactEvent(label?: string): void {
  if (typeof window === 'undefined') return
  if (isNonPublicTenantPath(window.location.pathname)) return

  try {
    const win = window as any
    if (typeof win.fbq === 'function') {
      win.fbq('track', 'Contact')
    }
  } catch (err) {
    // Rastreamento nunca quebra a ação do usuário
  }
}
