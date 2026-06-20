import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { LayoutDashboard, Package, Settings, LayoutTemplate, LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export default function AdminLayout() {
  const { signOut, user } = useAuth()
  const { pathname } = useLocation()

  const links = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard Gerencial' },
    { to: '/admin/products', icon: Package, label: 'Produtos' },
    { to: '/admin/settings', icon: Settings, label: 'Configurações' },
    { to: '/admin/layout', icon: LayoutTemplate, label: 'Layout Página Principal' },
  ]

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

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="hidden md:flex flex-col w-64 bg-white border-r">
        <div className="p-4 border-b h-16 flex items-center">
          <span className="font-bold text-xl text-primary">Painel Skip</span>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="p-4 border-t">
          <div className="text-sm font-medium mb-2 px-2 truncate">{user?.name || user?.email}</div>
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
          <span className="font-bold text-lg text-primary">Painel</span>
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
          <Outlet />
        </main>
      </div>
    </div>
  )
}
