interface GtagFunction {
  (...args: unknown[]): void
}

declare global {
  interface Window {
    gtag?: GtagFunction
    dataLayer: Record<string, unknown>[]
  }
}

const GOOGLE_ADS_CONVERSION_ID = 'AW-756398937'
const GOOGLE_ADS_CONVERSION_LABEL = 'WgQOCJ3d1-YBENn21ugC'

export function trackGoogleAdsConversion(transactionId?: string): void {
  if (typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return

  const finalTransactionId =
    transactionId || `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

  try {
    window.gtag('event', 'conversion', {
      send_to: `${GOOGLE_ADS_CONVERSION_ID}/${GOOGLE_ADS_CONVERSION_LABEL}`,
      transaction_id: finalTransactionId,
    })
  } catch (error) {
    console.error('Google Ads conversion tracking failed', error)
  }
}
