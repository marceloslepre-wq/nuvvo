import { useState, useEffect } from 'react'
import { useTenant } from '@/contexts/tenant-context'
import pb from '@/lib/pocketbase/client'

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

  // Cidade via parâmetro na URL (?cidade=cachoeiro): casa com as cidades/lojas
  // cadastradas do tenant (nome começando com o valor, ignorando acentos/caixa)
  // e salva como a cidade escolhida do usuário. Sem parâmetro, nada muda.
  useEffect(() => {
    try {
      const param = new URLSearchParams(window.location.search).get('cidade')
      if (!param || !tenantId) return
      const normalized = param
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
      if (!normalized) return
      let cancelled = false
      const run = async () => {
        try {
          // Se já existe cidade salva, o parâmetro não precisa reescrever nada
          const stored = localStorage.getItem(storageKey)
          if (stored) return
          const locs = await pb
            .collection('pickup_locations')
            .getFullList({ filter: `tenant='${tenantId}'` })
          if (cancelled) return
          const loc = locs.find((l) => {
            const city = String(l.city || '')
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim()
              .toLowerCase()
            return city === normalized || city.startsWith(normalized)
          })
          if (loc) {
            setSelectedCityId(loc.id)
          }
          // Se nenhum local corresponder, ignora o parâmetro silenciosamente
        } catch {
          /* ignora silenciosamente */
        }
      }
      run()
      return () => {
        cancelled = true
      }
    } catch {
      /* ignora silenciosamente */
    }
  }, [tenantId, storageKey])

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
