import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { Tenant, RESERVED_PATH_PREFIXES, isNuvvoOfficialHost } from '@/types/tenant'
import { getTenants, resolveTenantByHost } from '@/services/tenants'
import { useLocation } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'

interface TenantContextValue {
  currentTenant: Tenant | null
  loading: boolean
  allTenants: Tenant[]
  selectedAdminTenantId: string | null
  setSelectedAdminTenantId: (id: string | null) => void
  activeAdminTenant: Tenant | null
  refreshTenants: () => Promise<void>
  /**
   * Prefixo de base para links quando acessado via path em nuvvo.sholver.com.br/:slug
   * Ex: '/testelandpage' ou vazio '' para subdomínios normais (Hospital Home etc)
   */
  tenantBasePath: string
  /**
   * Slug resolvido a partir do primeiro segmento de path, se houver
   */
  pathTenantSlug: string | null
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

  // Detecta se a rota atual possui um primeiro segmento correspondente a um slug de tenant
  // Ex: nuvvo.sholver.com.br/testelandpage ou /testelandpage em localhost
  const pathSegment = useMemo(() => {
    const rawFirst = location.pathname.split('/').filter(Boolean)[0] || ''
    const lower = rawFirst.toLowerCase()
    if (!lower || RESERVED_PATH_PREFIXES.includes(lower as any)) {
      return null
    }
    return lower
  }, [location.pathname])

  // Resolução inicial e re-avaliação do tenant pelo host e/ou pelo primeiro segmento de path
  useEffect(() => {
    let mounted = true
    const resolve = async () => {
      setLoading(true)
      try {
        const host = typeof window !== 'undefined' ? window.location.host : ''
        const [hostTenant, list] = await Promise.all([
          resolveTenantByHost(host),
          allTenants.length > 0
            ? Promise.resolve(allTenants)
            : getTenants().catch(() => [] as Tenant[]),
        ])

        if (!mounted) return

        setAllTenants(list)

        // Se houver um primeiro segmento de caminho (ex: /testelandpage)
        // e ele corresponder ao slug de um tenant cadastrado:
        let matchedTenant: Tenant | null = null
        if (pathSegment) {
          const bySlug = list.find(
            (t) =>
              (t.slug && t.slug.toLowerCase() === pathSegment) ||
              (t.subdomain && t.subdomain.toLowerCase() === pathSegment),
          )
          if (bySlug) {
            matchedTenant = bySlug
          }
        }

        // Se não casou por path, usa o tenant resolvido pelo host
        const finalTenant = matchedTenant || hostTenant
        setCurrentTenant(finalTenant)
        if (typeof window !== 'undefined') {
          ;(window as any).__NUVVO_CURRENT_TENANT_ID__ = finalTenant?.id || null
        }

        // Se não há admin tenant selecionado, adota o tenant resolvido ou o primeiro
        if (!selectedAdminTenantId && finalTenant) {
          setSelectedAdminTenantIdState(finalTenant.id)
          localStorage.setItem(ADMIN_TENANT_KEY, finalTenant.id)
        } else if (!selectedAdminTenantId && list.length > 0) {
          setSelectedAdminTenantIdState(list[0].id)
          localStorage.setItem(ADMIN_TENANT_KEY, list[0].id)
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
  }, [pathSegment])

  // Atualizar documento title / branding se tenant tiver nome
  useEffect(() => {
    const isNuvvoHost =
      typeof window !== 'undefined' &&
      (window.location.host.toLowerCase().startsWith('nuvvo.sholver.com.br') ||
        window.location.host.toLowerCase().startsWith('www.nuvvo.sholver.com.br'))

    if (isNuvvoHost) {
      document.title = 'Nuvvo - Plataforma de Vendas e Locação'
      return
    }

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
    // 1. Se houver um usuário autenticado no authStore que NÃO seja master (ex: gestor ou funcionário),
    // ele DEVE ficar restrito estritamente à sua empresa (user.tenant)
    const authRecord =
      typeof window !== 'undefined' ? (window as any).pocketbaseAuthRecord || null : null
    // Fallback lendo do pb.authStore.record
    const pbUser = pb.authStore?.record
    const effectiveUser = pbUser || authRecord
    const isMaster = effectiveUser?.role === 'master'

    if (effectiveUser && !isMaster && effectiveUser.tenant) {
      const userTenant = allTenants.find((t) => t.id === effectiveUser.tenant)
      if (userTenant) return userTenant
    }

    // 2. Se for Master ou impersonação ativa ou não logado:
    if (selectedAdminTenantId) {
      const found = allTenants.find((t) => t.id === selectedAdminTenantId)
      if (found) return found
    }
    return currentTenant || allTenants[0] || null
  }, [selectedAdminTenantId, allTenants, currentTenant])

  // Determina se o tenant está sendo acessado por caminho (nuvvo.sholver.com.br/empresa)
  const isPathRouted = useMemo(() => {
    if (!pathSegment || !currentTenant) return false
    return (
      (currentTenant.slug && currentTenant.slug.toLowerCase() === pathSegment) ||
      (currentTenant.subdomain && currentTenant.subdomain.toLowerCase() === pathSegment)
    )
  }, [pathSegment, currentTenant])

  const tenantBasePath = isPathRouted && pathSegment ? `/${pathSegment}` : ''

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
        tenantBasePath,
        pathTenantSlug: isPathRouted ? pathSegment : null,
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
