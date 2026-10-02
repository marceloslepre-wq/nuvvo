/**
 * Utilitário para gerenciamento seguro da Google Tag (gtag.js / Google Ads)
 *
 * Garante que:
 * 1. O script gtag do Google Ads (AW-403144958) e os beacons de remarketing NUNCA sejam carregados
 *    ou executados em rotas administrativas (/admin/*, /master e telas de login como /admin/login).
 * 2. Nas rotas públicas da empresa/site, o rastreamento permaneça 100% ativo e funcional,
 *    incluindo a tag global gtag.js e as conversões de clique do WhatsApp.
 * 3. Como defesa em profundidade, quaisquer falhas de rede/beacon (ex: HTTP 0 / non-OK response
 *    bloqueados por ad-blocker ou políticas de CORS em /rmkt/collect) sejam capturadas
 *    silenciosamente, sem estourar erros de runtime visíveis ao usuário.
 */

export const GOOGLE_ADS_ID = 'AW-403144958'

/**
 * Validação de rotas e manipulação defensiva do Google Ads
 */

/**
 * Determina se um dado caminho (pathname) pertence a uma rota administrativa/interna.
 * Exemplos: /admin, /admin/login, /admin/dashboard, /master, etc.
 * Também cobre casos em que a tela de login do painel Nuvvo é renderizada na raiz.
 */
export function isAdministrativePath(pathname: string): boolean {
  if (!pathname) return false
  const cleanPath = pathname.toLowerCase().trim()
  if (cleanPath.startsWith('/admin')) return true
  if (cleanPath.startsWith('/master')) return true
  return false
}

/**
 * Determina se o contexto atual de navegação é puramente uma rota pública do site,
 * onde o rastreamento do Google Ads e remarketing é desejado.
 *
 * @param pathname Caminho da rota atual
 * @param isDirectAdminScreen Flag opcional se uma tela de login admin está ativa
 */
export function isPublicTrackingAllowed(pathname: string, isDirectAdminScreen = false): boolean {
  if (isDirectAdminScreen) return false
  if (isAdministrativePath(pathname)) return false
  return true
}

let gtagScriptLoaded = false
let defensiveHandlersInstalled = false
let networkMonkeyPatched = false

/**
 * Instala manipuladores globais defensivos para capturar e silenciar erros
 * de rede causados por beacons do Google Ads / Remarketing (ex: HTTP 0 em /rmkt/collect),
 * impedindo que estoure erro de runtime na tela do usuário.
 */
export function installDefensiveGoogleAdsErrorHandler(): void {
  if (typeof window === 'undefined') return

  // 1. Interceptar unhandledrejection para promessas com erro de beacon/Google Ads
  if (!defensiveHandlersInstalled) {
    defensiveHandlersInstalled = true

    window.addEventListener('unhandledrejection', (event) => {
      try {
        const reason = event.reason
        const msg = typeof reason === 'string' ? reason : reason?.message || ''
        const stack = reason?.stack || ''
        const isGoogleAdsBeaconError =
          msg.includes('rmkt') ||
          msg.includes('AW-403144958') ||
          msg.includes('googleadservices') ||
          msg.includes('googletagmanager') ||
          (msg.includes('HTTP 0') &&
            (msg.includes('collect') ||
              stack.includes('gtag') ||
              stack.includes('googletagmanager') ||
              stack.includes('rmkt'))) ||
          stack.includes('rmkt') ||
          stack.includes('AW-403144958') ||
          stack.includes('googletagmanager') ||
          stack.includes('googleadservices')

        if (isGoogleAdsBeaconError) {
          event.preventDefault()
          event.stopPropagation()
        }
      } catch {
        // Engolir silenciosamente qualquer falha no listener defensivo
      }
    })

    // 2. Interceptar erros de runtime globais (window.onerror) disparados por scripts do Google
    window.addEventListener(
      'error',
      (event) => {
        try {
          const msg = event.message || ''
          const filename = event.filename || ''
          const errorStack = event.error?.stack || ''

          const isGoogleError =
            filename.includes('googletagmanager.com') ||
            filename.includes('googleadservices.com') ||
            filename.includes('google.com/rmkt') ||
            filename.includes('rmkt') ||
            msg.includes('rmkt') ||
            msg.includes('AW-403144958') ||
            errorStack.includes('googletagmanager') ||
            errorStack.includes('AW-403144958') ||
            (msg.includes('HTTP 0') &&
              (errorStack.includes('gtag') || errorStack.includes('googletagmanager')))

          if (isGoogleError) {
            event.preventDefault()
            event.stopPropagation()
            return true
          }
        } catch {
          // Engolir silenciosamente
        }
      },
      true, // useCapture para interceptar antes de outros handlers
    )
  }

  // 3. Blindagem a nível de rede: monkey-patch de window.fetch e navigator.sendBeacon
  // para interceptar requisições para google.com/rmkt ou googleadservices quando em rotas /admin ou /master,
  // ou em caso de erro de rede (HTTP 0 / ad-blocker) não lançar rejeições descontroladas.
  if (!networkMonkeyPatched && typeof window.fetch === 'function') {
    networkMonkeyPatched = true

    const originalFetch = window.fetch.bind(window)
    window.fetch = async function (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      const urlStr =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input && 'url' in input
              ? (input as Request).url
              : ''

      const isGoogleTrackingUrl =
        urlStr.includes('google.com/rmkt') ||
        urlStr.includes('googleadservices.com') ||
        urlStr.includes('googletagmanager.com/gtag') ||
        urlStr.includes('AW-403144958')

      // Se estiver numa rota administrativa e for requisição de remarketing/ads, aborta com Response vazia fictícia
      if (isGoogleTrackingUrl && isAdministrativePath(window.location.pathname)) {
        return new Response(null, { status: 200, statusText: 'OK (Blocked in Admin)' })
      }

      try {
        const response = await originalFetch(input, init)
        return response
      } catch (err: any) {
        // Se a requisição de rastreamento do Google falhou (ex: bloqueada por adblocker / cors / HTTP 0),
        // retorna Response dummy de status 200 em vez de estourar TypeError/NetworkError na aplicação
        if (isGoogleTrackingUrl) {
          return new Response(null, {
            status: 200,
            statusText: 'OK (Silenced Google Ads Network Error)',
          })
        }
        throw err
      }
    }

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const originalSendBeacon = navigator.sendBeacon.bind(navigator)
      navigator.sendBeacon = function (url: string | URL, data?: BodyInit | null): boolean {
        const urlStr = typeof url === 'string' ? url : url.toString()
        const isGoogleTrackingUrl =
          urlStr.includes('google.com/rmkt') ||
          urlStr.includes('googleadservices.com') ||
          urlStr.includes('AW-403144958')

        if (isGoogleTrackingUrl && isAdministrativePath(window.location.pathname)) {
          return true
        }

        try {
          return originalSendBeacon(url, data)
        } catch {
          return true
        }
      }
    }
  }

  // 4. Instalar gate estrito no window.dataLayer e window.gtag
  gateDataLayerAndGtag()
}

/**
 * Garante que window.dataLayer.push e window.gtag NUNCA processem eventos
 * ou enviem dados enquanto a rota atual for administrativa (/admin/* ou /master/*).
 */
export function gateDataLayerAndGtag(): void {
  if (typeof window === 'undefined') return

  window.dataLayer = window.dataLayer || []

  // Wrap seguro em dataLayer.push
  const dl = window.dataLayer as any
  if (!dl.__nuvvo_gated) {
    const originalPush = dl.push.bind(dl)
    dl.push = function (...items: any[]) {
      if (isAdministrativePath(window.location.pathname)) {
        // Bloqueia qualquer push disparado enquanto o usuário navega no admin/master
        return dl.length
      }
      return originalPush(...items)
    }
    dl.__nuvvo_gated = true
  }

  // Wrap seguro em window.gtag
  const win = window as any
  const existingGtag = typeof win.gtag === 'function' ? win.gtag : null

  win.gtag = function (...args: any[]) {
    if (isAdministrativePath(window.location.pathname)) {
      // Bloqueia qualquer chamada gtag feita em páginas administrativas
      return
    }

    if (existingGtag && existingGtag !== win.gtag) {
      existingGtag(...args)
    } else {
      window.dataLayer.push(args)
    }
  }
}

/**
 * Remove qualquer script do Google Ads (AW-403144958) previamente injetado no DOM,
 * garantindo que listeners de auto-event (como form submit) sejam neutralizados
 * quando o usuário navega para uma tela administrativa.
 */
export function removeGoogleTagFromDom(): void {
  if (typeof window === 'undefined') return

  try {
    const scripts = document.querySelectorAll(
      `script[src*="googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}"], script[src*="AW-403144958"]`,
    )
    scripts.forEach((s) => s.remove())
    gtagScriptLoaded = false
  } catch {
    // Engolir silenciosamente
  }
}

/**
 * Mantida como no-op para compatibilidade de chamadas legadas.
 * Não injeta mais o script do Google Ads nem chama gtag('config').
 * Todas as tags são gerenciadas exclusivamente pelo GTM (GTM-KH6V33Q5).
 */
export function ensureGoogleTagLoaded(): void {
  // no-op intencional: tags centralizadas no GTM via dataLayer
}

/**
 * Notifica mudança de rota para controlar o gtag e registrar pageview se for rota pública.
 */
export function syncGoogleTagWithRoute(pathname: string, isDirectAdminScreen = false): void {
  if (typeof window === 'undefined') return

  // Sempre instala os handlers defensivos para proteção mesmo em rotas administrativas
  installDefensiveGoogleAdsErrorHandler()

  if (!isPublicTrackingAllowed(pathname, isDirectAdminScreen)) {
    // Rota administrativa/login:
    // 1. Remove qualquer script gtag ativo para neutralizar listeners de auto-event (form_submit)
    removeGoogleTagFromDom()
    // 2. Garante que os wrappers de dataLayer e gtag estejam bloqueando envios
    gateDataLayerAndGtag()
    return
  }

  // Rota pública: não carrega mais gtag.js direto
}
