/**
 * Helper para utilitários de contato via WhatsApp e rastreamento de conversão (gtag)
 */

export const GTAG_WHATSAPP_CONVERSION_ID = 'AW-403144958/CLIQUE_WHATSAPP'

/**
 * Dispara o evento de conversão do Google Ads (gtag) para cliques no WhatsApp
 */
export function trackWhatsAppConversion(label?: string) {
  if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
    try {
      ;(window as any).gtag('event', 'conversion', {
        send_to: GTAG_WHATSAPP_CONVERSION_ID,
        value: 1.0,
        currency: 'BRL',
        event_label: label,
      })
    } catch (err) {
      console.warn('Falha ao disparar conversão gtag:', err)
    }
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
