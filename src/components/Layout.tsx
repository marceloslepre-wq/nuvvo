import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { ShoppingCart, Search, Menu, Facebook, Twitter, Instagram, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/contexts/cart-context'
import { useRealtime } from '@/hooks/use-realtime'
import { useVisitTracking } from '@/hooks/use-visit-tracking'
import { useTenant } from '@/contexts/tenant-context'
import TenantNotFound from '@/pages/TenantNotFound'
import AdminLogin from '@/pages/admin/Login'
import { isNuvvoOfficialHost } from '@/types/tenant'
import { WhatsAppFloatingButton } from '@/components/WhatsAppFloatingButton'
import {
  formatPhoneNumber,
  buildWhatsAppLink,
  openWhatsApp,
  trackWhatsAppConversion,
} from '@/lib/whatsapp'

export default function Layout() {
  const { currentTenant, loading: tenantLoading, tenantBasePath } = useTenant()
  const { count } = useCart()
  const { pathname, hash } = useLocation()
  useVisitTracking()
  const [locations, setLocations] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)

  const loadSettings = () => {
    if (!currentTenant) return
    const filter = `tenant = '${currentTenant.id}'`
    pb.collection('site_settings')
      .getFirstListItem(filter)
      .then(setSettings)
      .catch(() => {
        // Fallback caso ainda não tenha site_settings específico
        setSettings({
          phone: currentTenant.phone,
          email: currentTenant.email,
          about_us: currentTenant.about_us,
          terms: currentTenant.terms,
          privacy: currentTenant.privacy,
          returns: currentTenant.returns,
        })
      })
  }

  const loadLocations = () => {
    if (!currentTenant) return
    pb.collection('pickup_locations')
      .getFullList({
        filter: `tenant = '${currentTenant.id}'`,
      })
      .then(setLocations)
      .catch(() => {})
  }

  useEffect(() => {
    if (currentTenant) {
      loadLocations()
      loadSettings()
    }
  }, [currentTenant?.id])

  useRealtime('site_settings', () => {
    loadSettings()
  })

  useRealtime('pickup_locations', () => {
    loadLocations()
  })

  const contactPhone = settings?.phone || currentTenant?.phone || ''

  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.substring(1))
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [pathname, hash])

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Se o host acessado for nuvvo.sholver.com.br (domínio oficial da plataforma)
  // e NÃO estiver acessando uma empresa por caminho (/empresa),
  // a rota pública raiz deve exibir diretamente a tela de login do painel administrativo
  // (Nuvvo como plataforma), e não o vitrine de um tenant nem "empresa não encontrada".
  const isDirectNuvvoRoot = isNuvvoOfficialHost() && (pathname === '/' || pathname === '')

  if (isDirectNuvvoRoot) {
    return <AdminLogin />
  }

  // Se o usuário navegou em nuvvo.sholver.com.br por um caminho que não casou com nenhum tenant
  // (ex: /slug-inexistente), exibe TenantNotFound
  if (!currentTenant) {
    return <TenantNotFound />
  }

  const logoUrl = settings?.logo
    ? pb.files.getURL(settings, settings.logo)
    : currentTenant.logo
      ? pb.files.getURL(currentTenant as any, currentTenant.logo)
      : null

  const brandName = currentTenant.name || 'Plataforma'

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to={tenantBasePath || '/'} className="flex items-center shrink-0 mr-2">
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="h-8 md:h-10 object-contain" />
              ) : (
                <span className="font-bold text-xl text-primary">{brandName}</span>
              )}
            </Link>
            <nav className="hidden md:flex gap-6">
              <Link
                to={tenantBasePath || '/'}
                className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
              >
                Home
              </Link>
              <Link
                to={`${tenantBasePath || ''}/#destaques`}
                className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
              >
                Produtos
              </Link>
              <Link
                to={`${tenantBasePath || ''}/#contato`}
                className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
              >
                Contato
              </Link>
              <Link
                to={`${tenantBasePath || ''}/nossas-lojas`}
                className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
              >
                Nossas Lojas
              </Link>
              <Link
                to="/admin"
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-3 py-1 rounded-md"
              >
                Painel
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Bloco Central de Atendimento e botão WhatsApp do Cabeçalho */}
            {contactPhone ? (
              <div className="hidden lg:flex items-center gap-4">
                <a
                  href={buildWhatsAppLink(contactPhone)}
                  onClick={(e) => {
                    e.preventDefault()
                    openWhatsApp(contactPhone, undefined, 'header_phone_block')
                  }}
                  className="flex flex-col items-end text-right group cursor-pointer transition-colors"
                  title="Falar com a Central de Atendimento no WhatsApp"
                >
                  <span className="text-[11px] font-medium text-gray-500 leading-tight">
                    Central de Atendimento
                  </span>
                  <span className="flex items-center gap-1.5 text-base font-bold text-secondary group-hover:text-primary transition-colors">
                    <Phone className="w-3.5 h-3.5 text-secondary group-hover:text-primary transition-colors" />
                    {formatPhoneNumber(contactPhone)}
                  </span>
                </a>

                <Button
                  onClick={() => openWhatsApp(contactPhone, undefined, 'header_whatsapp_btn')}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-sm px-4 h-9 shadow-sm rounded-md transition-colors"
                >
                  Fale no WhatsApp
                </Button>
              </div>
            ) : null}

            {/* Em telas menores (mobile/tablet), botão compacto Fale no WhatsApp */}
            {contactPhone ? (
              <Button
                onClick={() => openWhatsApp(contactPhone, undefined, 'header_mobile_btn')}
                size="sm"
                className="lg:hidden bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-xs px-2.5 h-8 shadow-sm rounded-md transition-colors"
              >
                Fale no WhatsApp
              </Button>
            ) : null}

            <Button
              variant="ghost"
              size="icon"
              className="text-gray-600 hover:text-primary hidden sm:flex"
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-gray-600 hover:text-primary"
            >
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-accent text-white border-none">
                  {count}
                </Badge>
              )}
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-gray-600">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <nav className="flex flex-col gap-4 mt-8">
                  <SheetClose asChild>
                    <Link
                      to={tenantBasePath || '/'}
                      className="text-lg font-medium hover:text-primary transition-colors"
                    >
                      Home
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to={`${tenantBasePath || ''}/#destaques`}
                      className="text-lg font-medium hover:text-primary transition-colors"
                    >
                      Produtos
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to={`${tenantBasePath || ''}/#contato`}
                      className="text-lg font-medium hover:text-primary transition-colors"
                    >
                      Contato
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to={`${tenantBasePath || ''}/nossas-lojas`}
                      className="text-lg font-medium hover:text-primary transition-colors"
                    >
                      Nossas Lojas
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/admin"
                      className="text-lg font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Painel Administrativo
                    </Link>
                  </SheetClose>

                  {contactPhone && (
                    <div className="pt-4 mt-2 border-t border-gray-100 flex flex-col gap-2">
                      <span className="text-xs text-gray-500">Central de Atendimento</span>
                      <a
                        href={buildWhatsAppLink(contactPhone)}
                        onClick={(e) => {
                          e.preventDefault()
                          openWhatsApp(contactPhone, undefined, 'drawer_phone')
                        }}
                        className="flex items-center gap-2 text-base font-bold text-secondary hover:text-primary transition-colors"
                      >
                        <Phone className="w-4 h-4 text-primary" />
                        {formatPhoneNumber(contactPhone)}
                      </a>
                      <Button
                        onClick={() => openWhatsApp(contactPhone, undefined, 'drawer_whatsapp_btn')}
                        className="mt-2 w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                      >
                        Fale no WhatsApp
                      </Button>
                    </div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main key={pathname} className="flex-1 animate-fade-in">
        <Outlet />
      </main>

      {/* Botão flutuante do WhatsApp em todas as páginas públicas */}
      <WhatsAppFloatingButton phone={contactPhone} />
      <footer className="bg-secondary text-white py-12 mt-auto" id="contato">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold text-lg mb-4 text-white">Contato</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              {contactPhone && (
                <li>
                  Telefone:{' '}
                  <a
                    href={buildWhatsAppLink(contactPhone)}
                    onClick={(e) => {
                      e.preventDefault()
                      openWhatsApp(contactPhone, undefined, 'footer_phone')
                    }}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    {formatPhoneNumber(contactPhone)}
                  </a>
                </li>
              )}
              {(settings?.email || currentTenant.email) && (
                <li>
                  E-mail:{' '}
                  <a
                    href={`mailto:${settings?.email || currentTenant.email}`}
                    className="hover:text-primary transition-colors"
                  >
                    {settings?.email || currentTenant.email}
                  </a>
                </li>
              )}
              {!contactPhone && !settings?.email && !currentTenant.email && (
                <li>Informações de contato indisponíveis.</li>
              )}
            </ul>
            <div className="flex gap-4 mt-6">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
              >
                <Facebook className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
              >
                <Instagram className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div>
            {locations.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-4 text-white">Locais de Retirada</h3>
                <ul className="space-y-3 text-sm text-gray-400">
                  {locations.map((l) => {
                    const addressStr = `${l.street || ''}, ${l.number || ''} - ${l.neighborhood || ''}, ${l.city || ''} - ${l.state || ''}`
                    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressStr)}`
                    return (
                      <li key={l.id}>
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-primary transition-colors block"
                        >
                          <span className="block text-white font-medium">
                            {l.city} - {l.state}
                          </span>
                          {l.street}, {l.number} - {l.neighborhood}
                          <br />
                          {l.hours}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-4 text-white">Links Rápidos</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li>
                <Link
                  to={`${tenantBasePath || ''}/pagina/sobre-nos`}
                  className="hover:text-primary transition-colors"
                >
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link
                  to={`${tenantBasePath || ''}/pagina/termos`}
                  className="hover:text-primary transition-colors"
                >
                  Termos de Serviço
                </Link>
              </li>
              <li>
                <Link
                  to={`${tenantBasePath || ''}/pagina/privacidade`}
                  className="hover:text-primary transition-colors"
                >
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link
                  to={`${tenantBasePath || ''}/pagina/trocas`}
                  className="hover:text-primary transition-colors"
                >
                  Trocas e Devoluções
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-white/10 text-center text-sm text-gray-500">
          <p>
            © {new Date().getFullYear()} {brandName} - Todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  )
}
