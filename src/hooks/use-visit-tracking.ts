import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { trackVisit } from '@/services/visit-logs'
import { useTenant } from '@/contexts/tenant-context'

export function useVisitTracking(): void {
  const { pathname } = useLocation()
  const { currentTenant } = useTenant()
  const lastPath = useRef<string>('')

  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    if (pathname === lastPath.current) return
    lastPath.current = pathname
    trackVisit({ type: 'pageview', path: pathname, tenantId: currentTenant?.id })
  }, [pathname, currentTenant?.id])
}
