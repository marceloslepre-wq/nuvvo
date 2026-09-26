/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'
import { installDefensiveGoogleAdsErrorHandler } from './lib/gtag'

// Instala proteção defensiva global contra falhas de beacon de remarketing/ads
installDefensiveGoogleAdsErrorHandler()

// 1. Blindagem contra o Google Translate modificando nós de texto do DOM (evita erro "NotFoundError: Failed to execute 'removeChild'/'insertBefore' on 'Node'")
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    try {
      return originalRemoveChild.call(this, child) as T
    } catch (err: any) {
      if (
        err?.name === 'NotFoundError' ||
        (err?.message && err.message.includes('not a child of this node'))
      ) {
        return child
      }
      throw err
    }
  }

  const originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    try {
      return originalInsertBefore.call(this, newNode, referenceNode) as T
    } catch (err: any) {
      if (
        err?.name === 'NotFoundError' ||
        (err?.message && err.message.includes('not a child of this node'))
      ) {
        return newNode
      }
      throw err
    }
  }
}

// 2. Blindagem contra falhas de carregamento de chunk em navegadores desatualizados com cache
window.addEventListener('error', (event) => {
  const msg = event.message || ''
  const isChunkError =
    msg.includes('Loading chunk') ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed')

  if (isChunkError) {
    const reloadKey = 'chunk_reload_' + window.location.pathname
    if (!sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, '1')
      window.location.reload()
    }
  }
})

// @skip-protected: Do not remove. Required for React rendering.
createRoot(document.getElementById('root')!).render(<App />)
