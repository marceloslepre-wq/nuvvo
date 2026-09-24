import { useState, useEffect } from 'react'
import { useTenant } from '@/contexts/tenant-context'

export function useSelectedCity(tenantIdOverride?: string) {
  const { currentTenant } = useTenant()
  const tenantId = tenantIdOverride || currentTenant?.id || ''
  const storageKey = tenantId ? `cidade_selecionada_${tenantId}` : 'cidade_selecionada'

  const [selectedCityId, setSelectedCityId] = useState<string>(() => {
    try {
      if (!tenantId) {
        return (
          localStorage.getItem('cidade_selecionada') ||
          localStorage.getItem('selected_city_id') ||
          ''
        )
      }
      return (
        localStorage.getItem(`cidade_selecionada_${tenantId}`) ||
        localStorage.getItem('selected_city_id') ||
        ''
      )
    } catch {
      return ''
    }
  })

  // Sincroniza o estado se o tenant mudar (ex.: navegação entre tenants)
  useEffect(() => {
    try {
      const stored = tenantId
        ? localStorage.getItem(`cidade_selecionada_${tenantId}`) ||
          localStorage.getItem('selected_city_id') ||
          ''
        : localStorage.getItem('cidade_selecionada') ||
          localStorage.getItem('selected_city_id') ||
          ''
      setSelectedCityId(stored)
    } catch {
      /* ignore */
    }
  }, [tenantId])

  // Persiste sempre que selectedCityId mudar
  useEffect(() => {
    try {
      if (selectedCityId) {
        localStorage.setItem(storageKey, selectedCityId)
      } else {
        localStorage.removeItem(storageKey)
      }
    } catch {
      /* ignore */
    }
  }, [selectedCityId, storageKey])

  // Sincroniza abas/janelas
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey) {
        setSelectedCityId(e.newValue || '')
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [storageKey])

  return { selectedCityId, setSelectedCityId }
}

export default useSelectedCity
