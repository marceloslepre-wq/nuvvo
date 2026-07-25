import { useState, useEffect } from 'react'

const STORAGE_KEY = 'selected_city_id'

export function useSelectedCity() {
  const [selectedCityId, setSelectedCityId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || ''
    } catch {
      return ''
    }
  })

  useEffect(() => {
    try {
      if (selectedCityId) {
        localStorage.setItem(STORAGE_KEY, selectedCityId)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      /* ignore */
    }
  }, [selectedCityId])

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setSelectedCityId(e.newValue || '')
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  return { selectedCityId, setSelectedCityId }
}

export default useSelectedCity
