/**
 * Helper para utilitários de contato via WhatsApp e rastreamento de conversão via GTM dataLayer
 */

import { isAdministrativePath } from './gtag'
import { trackVisit } from '@/services/visit-logs'

/**
 * Dispara o evento 'whatsapp_click' para o dataLayer do GTM.
 * Executado exclusivamente nas interações de contato do site público.
 */
export function trackWhatsAppConversion(label?: string) {
  if (typeof window === 'undefined') return
  if (isAdministrativePath(window.location.pathname)) return
  try {
    const w = window as any
    w.dataLayer = w.dataLayer || []
    w.dataLayer.push({
      event: 'whatsapp_click',
      whatsapp_origem: label || 'desconhecido',
      page_path: window.location.pathname,
    })
  } catch {
    // rastreamento nunca deve quebrar o clique
  }

  try {
    const w = window as any
    const tenantId =
      w.__NUVVO_CURRENT_TENANT_ID__ || localStorage.getItem('admin_selected_tenant_id') || undefined
    trackVisit({
      type: 'click',
      path: window.location.pathname,
      tenantId: tenantId || undefined,
    }).catch(() => {
      /* silently ignore tracking errors */
    })
  } catch {
    /* silently ignore tracking errors */
  }
}

/**
 * Formata um número de telefone para o link do WhatsApp (wa.me)
 * Adiciona DDI 55 caso não conste, mantendo apenas dígitos.
 */
export function buildWhatsAppLink(rawPhone: string, message?: string): string {
  if (!rawPhone) return ''
  const digits = rawPhone.replace(/\D/g, '')
  if (!digits) return ''

  // Se já começar com 55 e tiver tamanho de telefone brasileiro com DDI (ex: 55 + 10 ou 11 dígitos)
  let fullDigits = digits
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    fullDigits = digits
  } else if (!digits.startsWith('55')) {
    fullDigits = `55${digits}`
  }

  const base = `https://wa.me/${fullDigits}`
  if (message && message.trim()) {
    return `${base}?text=${encodeURIComponent(message.trim())}`
  }
  return base
}

/**
 * Formata um número de telefone para exibição amigável:
 * Ex: 2730263300 -> (27) 3026-3300
 * Ex: 27999046961 -> (27) 99904-6961
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return ''
  let digits = phone.replace(/\D/g, '')

  // Se vier com o DDI 55 no início e tiver 12 ou 13 dígitos, remove o 55 para formatar padrão BR
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2)
  }

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`
  }

  return phone
}

/**
 * Abre o link do WhatsApp disparando o evento gtag
 */
export function openWhatsApp(rawPhone: string, message?: string, label?: string) {
  trackWhatsAppConversion(label)
  const url = buildWhatsAppLink(rawPhone, message)
  if (url && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
