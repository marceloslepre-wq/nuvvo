import { useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useTenant } from '@/contexts/tenant-context'
import { isTenantBlocked } from '@/types/tenant'
import { TenantBlockedScreen } from '@/pages/TenantBlockedScreen'
import {
  LayoutDashboard,
  Package,
  Settings,
  LayoutTemplate,
  LogOut,
  Menu,
  Building2,
  ExternalLink,
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
  KeyRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export default function AdminLayout() {
  const { signOut, user } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { allTenants, activeAdminTenant, selectedAdminTenantId, setSelectedAdminTenantId } =
    useTenant()

  const isMaster = user?.role === 'master'
  const isImpersonating = Boolean(localStorage.getItem('master_impersonating_from'))
  const supportCompanyName =
    activeAdminTenant?.name || localStorage.getItem('master_impersonating_tenant_name') || 'Cliente'

  const handleExitSupport = () => {
    localStorage.removeItem('master_impersonating_from')
    localStorage.removeItem('master_impersonating_tenant_name')
    // Restaurar seleção original ou locadora de origem
    const originTenant = allTenants.find((t) => t.is_origin) || allTenants[0]
    if (originTenant) {
      setSelectedAdminTenantId(originTenant.id)
    }
    navigate('/master')
  }

  // Se o usuário não for master, travar a empresa ativa na empresa do usuário logado
  useEffect(() => {
    if (user && !isMaster && user.tenant && selectedAdminTenantId !== user.tenant) {
      setSelectedAdminTenantId(user.tenant)
    }
  }, [user, isMaster, selectedAdminTenantId, setSelectedAdminTenantId])

  // Se a locadora ativa estiver com plano vencido ou suspenso:
  // - O Master tem permissão de impersonar e visualizar (com aviso)
  // - Usuários comuns da locadora têm acesso bloqueado com a tela amigável
  const blockCheck = isTenantBlocked(activeAdminTenant)
  const shouldBlock = blockCheck.blocked && !isMaster

  const links = [
    {
      to: '/admin/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard Gerencial',
      roles: ['master', 'gestor', 'funcionario'],
    },
    {
      to: '/admin/products',
      icon: Package,
      label: 'Produtos',
      roles: ['master', 'gestor', 'funcionario'],
    },
    {
      to: '/admin/licenses',
      icon: KeyRound,
      label: 'Licenças e Planos',
      roles: ['master', 'gestor'],
    },
    { to: '/admin/settings', icon: Settings, label: 'Configurações', roles: ['master', 'gestor'] },
    {
      to: '/admin/layout',
      icon: LayoutTemplate,
      label: 'Layout & Empresa',
      roles: ['master', 'gestor'],
    },
    {
      to: '/master',
      icon: ShieldCheck,
      label: 'Painel Master',
      roles: ['master'],
    },
  ].filter((link) => link.roles.includes(user?.role || 'gestor'))

  const NavLinks = () => (
    <>
      {links.map((l) => {
        const Icon = l.icon
        const isActive = pathname.startsWith(l.to)
        return (
          <Link
            key={l.to}
            to={l.to}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium',
              isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
          >
            <Icon className="h-5 w-5" />
            {l.label}
          </Link>
        )
      })}
    </>
  )

  if (shouldBlock && activeAdminTenant) {
    return <TenantBlockedScreen tenant={activeAdminTenant} reason={blockCheck.reason} />
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* 1. BARRA LARANJA FIXA NO TOPO - MODO SUPORTE (Identico ao Ponto Digital) */}
      {isMaster && isImpersonating && (
        <aside
          aria-label="Aviso de modo suporte"
          className="w-full bg-[#f58220] text-slate-950 px-4 py-2 flex items-center justify-between text-xs sm:text-sm font-medium shadow-sm z-50 shrink-0"
        >
          <div className="flex items-center gap-2 truncate">
            <AlertTriangle className="w-4 h-4 shrink-0 text-slate-950 stroke-[2.5]" />
            <span className="truncate">
              Você está acessando como suporte:{' '}
              <strong className="font-bold text-slate-950">{supportCompanyName}</strong>
            </span>
          </div>
          <button
            onClick={handleExitSupport}
            className="ml-3 shrink-0 bg-[#d96b14] hover:bg-[#c25e0e] text-white text-xs font-semibold px-3 py-1 rounded transition-colors shadow-none cursor-pointer"
          >
            Sair do acesso
          </button>
        </aside>
      )}

      {/* 2. CORPO DO PAINEL GERENCIAL */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside className="hidden md:flex flex-col w-64 bg-white border-r">
          <div className="p-4 border-b h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl text-primary">Painel</span>
              {isMaster ? (
                <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-red-600 text-white">
                  MASTER
                </span>
              ) : (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                  Multi-Tenant
                </span>
              )}
            </div>
          </div>

          {/* Indicador de impersonação na barra lateral quando em modo suporte */}
          {isMaster && isImpersonating && (
            <div className="p-3 bg-slate-900 text-white border-b border-slate-800">
              <div className="text-[11px] text-slate-400 mb-1.5 flex items-center justify-between">
                <span className="font-semibold text-slate-300">Modo de Acesso:</span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded text-[10px] font-bold">
                  SUPORTE
                </span>
              </div>
              <Button
                size="sm"
                onClick={handleExitSupport}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 gap-1.5 font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Sair do acesso
              </Button>
            </div>
          )}

          {/* Tenant Switcher: Master pode alternar livremente; Gestor/Funcionário vê apenas sua empresa fixa */}
          {allTenants.length > 0 && (
            <div className="p-3 border-b bg-gray-50/50">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5 font-medium">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span>Empresa ativa:</span>
              </div>
              {isMaster ? (
                <Select
                  value={activeAdminTenant?.id || selectedAdminTenantId || ''}
                  onValueChange={(val) => setSelectedAdminTenantId(val)}
                >
                  <SelectTrigger className="w-full h-8 text-xs bg-white">
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {allTenants.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="w-full h-8 px-2.5 flex items-center rounded-md border border-gray-200 bg-white text-xs font-semibold text-gray-800 truncate">
                  {activeAdminTenant?.name || user?.name || 'Minha Empresa'}
                </div>
              )}
              {activeAdminTenant && (
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-400">
                  <span
                    className="truncate max-w-[170px]"
                    title={
                      activeAdminTenant.custom_domain ||
                      (activeAdminTenant.is_origin
                        ? `${activeAdminTenant.subdomain}.sholver.com.br`
                        : `nuvvo.sholver.com.br/${activeAdminTenant.slug || activeAdminTenant.subdomain}`)
                    }
                  >
                    {activeAdminTenant.is_origin
                      ? `${activeAdminTenant.subdomain}.sholver.com.br`
                      : `nuvvo.sholver.com.br/${activeAdminTenant.slug || activeAdminTenant.subdomain}`}
                  </span>
                  <a
                    href={
                      activeAdminTenant.custom_domain
                        ? `https://${activeAdminTenant.custom_domain}`
                        : activeAdminTenant.is_origin
                          ? `https://${activeAdminTenant.subdomain}.sholver.com.br`
                          : `https://nuvvo.sholver.com.br/${activeAdminTenant.slug || activeAdminTenant.subdomain}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                    title="Abrir site público"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <NavLinks />
          </nav>
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 px-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-slate-900 truncate">
                    {user?.name || user?.email?.split('@')[0]}
                  </span>
                  {isMaster && (
                    <span className="text-[9px] bg-red-100 text-red-700 border border-red-300 font-bold px-1.5 py-0.2 rounded shrink-0">
                      Master
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {isMaster ? 'Master' : user?.role || 'gestor'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 h-8 text-xs"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:hidden">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-primary">Painel</span>
              {allTenants.length > 0 &&
                (isMaster ? (
                  <Select
                    value={activeAdminTenant?.id || selectedAdminTenantId || ''}
                    onValueChange={(val) => setSelectedAdminTenantId(val)}
                  >
                    <SelectTrigger className="h-8 text-xs max-w-[140px] truncate bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allTenants.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs font-semibold text-gray-700 max-w-[130px] truncate">
                    {activeAdminTenant?.name || ''}
                  </span>
                ))}
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 flex flex-col">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex-1 space-y-2 mt-4">
                  <NavLinks />
                </nav>
                <div className="border-t pt-4">
                  <div className="flex items-center gap-3 px-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                      {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {user?.name || user?.email?.split('@')[0]}
                        </span>
                        {isMaster && (
                          <span className="text-[9px] bg-red-100 text-red-700 border border-red-300 font-bold px-1.5 py-0.2 rounded shrink-0">
                            Master
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {isMaster ? 'Master' : user?.role || 'gestor'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 h-8 text-xs"
                    onClick={signOut}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </header>
          <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            {/* Banner de aviso para o Master se a licença estiver vencida/suspensa */}
            {isMaster && blockCheck.blocked && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
                <span>
                  <strong>Aviso Master:</strong> Esta instância está marcada como{' '}
                  <strong className="underline">{blockCheck.reason}</strong>. Usuários comuns desta
                  empresa estão com acesso bloqueado.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/master')}
                  className="h-7 text-xs bg-white text-amber-900 border-amber-300"
                >
                  Gerenciar no Master
                </Button>
              </div>
            )}
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
