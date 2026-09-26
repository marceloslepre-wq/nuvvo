import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Menu, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { useRealtime } from '@/hooks/use-realtime'
import { useVisitTracking } from '@/hooks/use-visit-tracking'
import { useTenant } from '@/contexts/tenant-context'
import TenantNotFound from '@/pages/TenantNotFound'
import AdminLogin from '@/pages/admin/Login'
import { isNuvvoOfficialHost } from '@/types/tenant'
import { WhatsAppFloatingButton } from '@/components/WhatsAppFloatingButton'
import { syncGoogleTagWithRoute } from '@/lib/gtag'
import { formatPhoneNumber, buildWhatsAppLink, openWhatsApp } from '@/lib/whatsapp'

export default function Layout() {
  const { currentTenant, loading: tenantLoading, tenantBasePath } = useTenant()
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
        // Se o tenant atual ainda não tiver site_settings, mantém vazio/null
        // NUNCA buscar ou herdar de outro tenant
        setSettings(null)
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

  const contactPhone = settings?.phone?.trim() || currentTenant?.phone?.trim() || ''
  const contactEmail = settings?.email?.trim() || currentTenant?.email?.trim() || ''
  const facebookUrl = settings?.facebook_url?.trim() || currentTenant?.facebook_url?.trim() || ''
  const instagramUrl = settings?.instagram_url?.trim() || currentTenant?.instagram_url?.trim() || ''
  const hasSocialLinks = Boolean(facebookUrl || instagramUrl)

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

  // Se o host acessado for nuvvo.sholver.com.br (domínio oficial da plataforma)
  // e NÃO estiver acessando uma empresa por caminho (/empresa),
  // a rota pública raiz deve exibir diretamente a tela de login do painel administrativo
  // (Nuvvo como plataforma), e não o vitrine de um tenant nem "empresa não encontrada".
  const isDirectNuvvoRoot = isNuvvoOfficialHost() && (pathname === '/' || pathname === '')

  // Sincroniza o Google Tag apenas para as rotas públicas (não carrega nem dispara se for rota admin ou tela de login direta)
  useEffect(() => {
    syncGoogleTagWithRoute(pathname, isDirectNuvvoRoot)
  }, [pathname, isDirectNuvvoRoot])

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

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
    : (currentTenant as any).logo
      ? pb.files.getURL(currentTenant as any, (currentTenant as any).logo)
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
              {locations.length > 0 && (
                <Link
                  to={`${tenantBasePath || ''}/nossas-lojas`}
                  className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
                >
                  Nossas Lojas
                </Link>
              )}
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
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                {/* Desktop: label discreto + número de telefone em destaque com ícone */}
                <a
                  href={buildWhatsAppLink(contactPhone)}
                  onClick={(e) => {
                    e.preventDefault()
                    openWhatsApp(contactPhone, undefined, 'header_phone_block')
                  }}
                  className="hidden md:flex flex-col items-end text-right group cursor-pointer transition-colors py-0.5"
                  title="Falar com a Central de Atendimento no WhatsApp"
                >
                  <span className="text-[11px] font-medium tracking-wide uppercase text-gray-400 group-hover:text-gray-600 transition-colors leading-tight">
                    Central de Atendimento
                  </span>
                  <span className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-gray-800 group-hover:text-[#2563EB] transition-colors mt-0.5">
                    <span className="w-6 h-6 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                      <Phone className="w-3.5 h-3.5" />
                    </span>
                    {formatPhoneNumber(contactPhone)}
                  </span>
                </a>

                {/* Botão Fale no WhatsApp: versão completa com ícone WhatsApp no desktop, compacta em telas menores */}
                <Button
                  onClick={() => openWhatsApp(contactPhone, undefined, 'header_whatsapp_btn')}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-xs sm:text-sm px-3 sm:px-4 h-9 shadow-sm hover:shadow rounded-lg transition-all flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4 fill-current shrink-0"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.414z" />
                  </svg>
                  <span className="hidden sm:inline">Fale no WhatsApp</span>
                  <span className="sm:hidden">WhatsApp</span>
                </Button>

                {/* Ícones de Redes Sociais ao lado do botão WhatsApp (Desktop + Mobile) */}
                {hasSocialLinks && (
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {facebookUrl && (
                      <a
                        href={facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[#1877F2] hover:bg-blue-50/80 active:scale-95 transition-all shadow-sm border border-gray-100"
                        title="Facebook da Empresa"
                        aria-label="Acessar página no Facebook"
                      >
                        <svg
                          className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-[#1877F2]"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      </a>
                    )}
                    {instagramUrl && (
                      <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center hover:bg-pink-50/80 active:scale-95 transition-all shadow-sm border border-gray-100 group"
                        title="Instagram da Empresa"
                        aria-label="Acessar perfil no Instagram"
                      >
                        <svg
                          className="w-4 h-4 sm:w-4.5 sm:h-4.5"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <defs>
                            <linearGradient
                              id="instagram-header-gradient"
                              x1="0%"
                              y1="100%"
                              x2="100%"
                              y2="0%"
                            >
                              <stop offset="0%" stopColor="#f09433" />
                              <stop offset="25%" stopColor="#e6683c" />
                              <stop offset="50%" stopColor="#dc2743" />
                              <stop offset="75%" stopColor="#cc2366" />
                              <stop offset="100%" stopColor="#bc1888" />
                            </linearGradient>
                          </defs>
                          <path
                            fill="url(#instagram-header-gradient)"
                            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                          />
                        </svg>
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : hasSocialLinks ? (
              <div className="flex items-center gap-1 sm:gap-1.5">
                {facebookUrl && (
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[#1877F2] hover:bg-blue-50/80 active:scale-95 transition-all shadow-sm border border-gray-100"
                    title="Facebook da Empresa"
                    aria-label="Acessar página no Facebook"
                  >
                    <svg
                      className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-[#1877F2]"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                )}
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center hover:bg-pink-50/80 active:scale-95 transition-all shadow-sm border border-gray-100 group"
                    title="Instagram da Empresa"
                    aria-label="Acessar perfil no Instagram"
                  >
                    <svg
                      className="w-4 h-4 sm:w-4.5 sm:h-4.5"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        <linearGradient
                          id="instagram-header-gradient-alt"
                          x1="0%"
                          y1="100%"
                          x2="100%"
                          y2="0%"
                        >
                          <stop offset="0%" stopColor="#f09433" />
                          <stop offset="25%" stopColor="#e6683c" />
                          <stop offset="50%" stopColor="#dc2743" />
                          <stop offset="75%" stopColor="#cc2366" />
                          <stop offset="100%" stopColor="#bc1888" />
                        </linearGradient>
                      </defs>
                      <path
                        fill="url(#instagram-header-gradient-alt)"
                        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                      />
                    </svg>
                  </a>
                )}
              </div>
            ) : null}

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-gray-600 hover:text-primary"
                  aria-label="Abrir menu"
                >
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
                  {locations.length > 0 && (
                    <SheetClose asChild>
                      <Link
                        to={`${tenantBasePath || ''}/nossas-lojas`}
                        className="text-lg font-medium hover:text-primary transition-colors"
                      >
                        Nossas Lojas
                      </Link>
                    </SheetClose>
                  )}
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

                  {hasSocialLinks && (
                    <div className="pt-4 mt-2 border-t border-gray-100 flex flex-col gap-2">
                      <span className="text-xs text-gray-500">Nossas Redes Sociais</span>
                      <div className="flex items-center gap-3 mt-1">
                        {facebookUrl && (
                          <a
                            href={facebookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-[#1877F2] text-sm font-medium hover:bg-blue-100 transition-colors"
                          >
                            <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            Facebook
                          </a>
                        )}
                        {instagramUrl && (
                          <a
                            href={instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-pink-50 text-[#dc2743] text-sm font-medium hover:bg-pink-100 transition-colors"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path
                                fill="url(#instagram-header-gradient)"
                                d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                              />
                            </svg>
                            Instagram
                          </a>
                        )}
                      </div>
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
              {contactEmail && (
                <li>
                  E-mail:{' '}
                  <a
                    href={`mailto:${contactEmail}`}
                    className="hover:text-primary transition-colors"
                  >
                    {contactEmail}
                  </a>
                </li>
              )}
              {!contactPhone && !contactEmail && <li>Informações de contato indisponíveis.</li>}
            </ul>
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
