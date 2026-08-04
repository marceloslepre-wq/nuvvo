import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { trackVisit } from '@/services/visit-logs'

export function useVisitTracking(): void {
  const { pathname } = useLocation()
  const lastPath = useRef<string>('')

  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    if (pathname === lastPath.current) return
    lastPath.current = pathname
    trackVisit({ type: 'pageview', path: pathname })
  }, [pathname])
}
