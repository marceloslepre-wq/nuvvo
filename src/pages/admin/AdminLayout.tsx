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
    { to: '/admin/settings', icon: Settings, label: 'Configurações', roles: ['master', 'gestor'] },
    {
      to: '/admin/layout',
      icon: LayoutTemplate,
      label: 'Layout & Empresa',
      roles: ['master', 'gestor'],
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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
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

        {/* Botão de retorno ao Painel Master para o Master */}
        {isMaster && (
          <div className="p-3 bg-slate-900 text-white border-b border-slate-800">
            <div className="text-[11px] text-slate-400 mb-1.5 flex items-center justify-between">
              <span className="font-semibold text-slate-300">Modo de Acesso:</span>
              <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.2 rounded text-[10px] font-mono">
                IMPERSONAÇÃO
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => {
                localStorage.removeItem('master_impersonating_from')
                navigate('/master')
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 gap-1.5 font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retornar ao Painel Master
            </Button>
          </div>
        )}

        {/* Tenant Switcher */}
        {allTenants.length > 0 && (
          <div className="p-3 border-b bg-gray-50/50">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5 font-medium">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>Empresa ativa:</span>
            </div>
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
            {activeAdminTenant && (
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-400">
                <span
                  className="truncate max-w-[170px]"
                  title={
                    activeAdminTenant.custom_domain ||
                    `${activeAdminTenant.subdomain}.sholver.com.br`
                  }
                >
                  {activeAdminTenant.subdomain
                    ? `${activeAdminTenant.subdomain}.sholver.com.br`
                    : activeAdminTenant.slug}
                </span>
                <Link
                  to="/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                  title="Abrir site público"
                >
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        )}

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="p-4 border-t">
          <div className="text-sm font-medium mb-2 px-2 truncate flex items-center justify-between">
            <span className="truncate">{user?.name || user?.email}</span>
            {isMaster && (
              <span className="text-[9px] bg-red-100 text-red-700 border border-red-300 font-bold px-1.5 py-0.5 rounded">
                Master
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
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
            {allTenants.length > 0 && (
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
            )}
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
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-500"
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
  )
}
