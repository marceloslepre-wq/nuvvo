import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { Tenant } from '@/types/tenant'
import { getTenants, resolveTenantByHost } from '@/services/tenants'
import { useLocation } from 'react-router-dom'

interface TenantContextValue {
  currentTenant: Tenant | null
  loading: boolean
  allTenants: Tenant[]
  selectedAdminTenantId: string | null
  setSelectedAdminTenantId: (id: string | null) => void
  activeAdminTenant: Tenant | null
  refreshTenants: () => Promise<void>
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined)

const ADMIN_TENANT_KEY = 'admin_selected_tenant_id'

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [allTenants, setAllTenants] = useState<Tenant[]>([])
  const [selectedAdminTenantId, setSelectedAdminTenantIdState] = useState<string | null>(() => {
    return localStorage.getItem(ADMIN_TENANT_KEY) || null
  })

  const location = useLocation()

  const refreshTenants = async () => {
    try {
      const list = await getTenants()
      setAllTenants(list)
    } catch {
      /* ignore */
    }
  }

  // Resolução inicial do tenant pelo host
  useEffect(() => {
    let mounted = true
    const resolve = async () => {
      setLoading(true)
      try {
        const host = typeof window !== 'undefined' ? window.location.host : ''
        const [tenant, list] = await Promise.all([
          resolveTenantByHost(host),
          getTenants().catch(() => [] as Tenant[]),
        ])

        if (mounted) {
          setCurrentTenant(tenant)
          setAllTenants(list)

          // Se não há admin tenant selecionado, adota o tenant resolvido ou o primeiro
          if (!selectedAdminTenantId && tenant) {
            setSelectedAdminTenantIdState(tenant.id)
            localStorage.setItem(ADMIN_TENANT_KEY, tenant.id)
          } else if (!selectedAdminTenantId && list.length > 0) {
            setSelectedAdminTenantIdState(list[0].id)
            localStorage.setItem(ADMIN_TENANT_KEY, list[0].id)
          }
        }
      } catch (err) {
        console.error('Erro ao resolver tenant:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    resolve()
    return () => {
      mounted = false
    }
  }, [])

  // Atualizar documento title / branding se tenant tiver nome
  useEffect(() => {
    if (currentTenant?.name && !location.pathname.startsWith('/admin')) {
      document.title = `${currentTenant.name} - Venda e Locação`
    }
  }, [currentTenant, location.pathname])

  const setSelectedAdminTenantId = (id: string | null) => {
    setSelectedAdminTenantIdState(id)
    if (id) {
      localStorage.setItem(ADMIN_TENANT_KEY, id)
    } else {
      localStorage.removeItem(ADMIN_TENANT_KEY)
    }
  }

  const activeAdminTenant = useMemo(() => {
    if (selectedAdminTenantId) {
      const found = allTenants.find((t) => t.id === selectedAdminTenantId)
      if (found) return found
    }
    return currentTenant || allTenants[0] || null
  }, [selectedAdminTenantId, allTenants, currentTenant])

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        loading,
        allTenants,
        selectedAdminTenantId,
        setSelectedAdminTenantId,
        activeAdminTenant,
        refreshTenants,
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}
