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

/**
 * Instala manipuladores globais defensivos para capturar e silenciar erros
 * de rede causados por beacons do Google Ads / Remarketing (ex: HTTP 0 em /rmkt/collect),
 * impedindo que estoure erro de runtime na tela do usuário.
 */
export function installDefensiveGoogleAdsErrorHandler(): void {
  if (typeof window === 'undefined' || defensiveHandlersInstalled) return
  defensiveHandlersInstalled = true

  // 1. Interceptar unhandledrejection para promessas de fetch com erro HTTP 0 / rmkt
  window.addEventListener('unhandledrejection', (event) => {
    try {
      const reason = event.reason
      const msg = typeof reason === 'string' ? reason : reason?.message || ''
      const stack = reason?.stack || ''
      const isGoogleAdsBeaconError =
        msg.includes('rmkt/collect') ||
        msg.includes('AW-403144958') ||
        (msg.includes('HTTP 0') &&
          (msg.includes('collect') ||
            stack.includes('gtag') ||
            stack.includes('googletagmanager'))) ||
        stack.includes('rmkt/collect') ||
        stack.includes('AW-403144958')

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
          filename.includes('rmkt') ||
          msg.includes('rmkt/collect') ||
          msg.includes('AW-403144958') ||
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

/**
 * Inicializa a Google Tag dinamicamente apenas quando a rota for pública.
 */
export function ensureGoogleTagLoaded(): void {
  if (typeof window === 'undefined') return

  // Garante dataLayer e gtag function básicos
  window.dataLayer = window.dataLayer || []
  if (typeof (window as any).gtag !== 'function') {
    ;(window as any).gtag = function (...args: any[]) {
      window.dataLayer.push(args)
    }
  }

  // Instala proteção defensiva antes de qualquer requisição do gtag
  installDefensiveGoogleAdsErrorHandler()

  if (gtagScriptLoaded) return

  const existingScript = document.querySelector(
    `script[src*="googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}"]`,
  )
  if (existingScript) {
    gtagScriptLoaded = true
    return
  }

  // Cria e injeta a tag do Google dinamicamente
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`
  script.onerror = () => {
    // Falhas de download do script (ex: adblocker) não devem lançar erro
  }

  const firstScript = document.getElementsByTagName('script')[0]
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript)
  } else {
    document.head.appendChild(script)
  }

  gtagScriptLoaded = true
  ;(window as any).gtag('js', new Date())
  ;(window as any).gtag('config', GOOGLE_ADS_ID)
}

/**
 * Notifica mudança de rota para controlar o gtag e registrar pageview se for rota pública.
 */
export function syncGoogleTagWithRoute(pathname: string, isDirectAdminScreen = false): void {
  if (typeof window === 'undefined') return

  // Sempre instala os handlers defensivos para proteção mesmo em rotas administrativas
  installDefensiveGoogleAdsErrorHandler()

  if (!isPublicTrackingAllowed(pathname, isDirectAdminScreen)) {
    // Rota administrativa/login: não inicializa nem dispara gtag
    return
  }

  // Rota pública: garante que o script do gtag está carregado
  ensureGoogleTagLoaded()
}
