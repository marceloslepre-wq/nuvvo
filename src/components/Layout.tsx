import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { ShoppingCart, Search, Menu, Facebook, Twitter, Instagram, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/contexts/cart-context'
import { useRealtime } from '@/hooks/use-realtime'

export default function Layout() {
  const { count } = useCart()
  const { pathname, hash } = useLocation()
  const [locations, setLocations] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)

  const loadSettings = () => {
    pb.collection('site_settings')
      .getFirstListItem('')
      .then(setSettings)
      .catch(() => {})
  }

  const loadLocations = () => {
    pb.collection('pickup_locations')
      .getFullList()
      .then(setLocations)
      .catch(() => {})
  }

  useEffect(() => {
    loadLocations()
    loadSettings()
  }, [])

  useRealtime('site_settings', () => {
    loadSettings()
  })

  useRealtime('pickup_locations', () => {
    loadLocations()
  })

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    }
    return phone
  }

  const getWaLink = (phone: string) => {
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('55')) return `https://wa.me/${digits}`
    return `https://wa.me/55${digits}`
  }

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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center shrink-0 mr-2">
              {settings?.logo ? (
                <img
                  src={pb.files.getURL(settings, settings.logo)}
                  alt="Logo"
                  className="h-8 md:h-10 object-contain"
                />
              ) : (
                <span className="font-bold text-xl text-primary">Plataforma</span>
              )}
            </Link>
            <nav className="hidden md:flex gap-6">
              <Link
                to="/"
                className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
              >
                Home
              </Link>
              <Link
                to="/#destaques"
                className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
              >
                Produtos
              </Link>
              <Link
                to="/#contato"
                className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
              >
                Contato
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
                      to="/"
                      className="text-lg font-medium hover:text-primary transition-colors"
                    >
                      Home
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/#destaques"
                      className="text-lg font-medium hover:text-primary transition-colors"
                    >
                      Produtos
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/#contato"
                      className="text-lg font-medium hover:text-primary transition-colors"
                    >
                      Contato
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
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main key={pathname} className="flex-1 animate-fade-in">
        <Outlet />
      </main>

      <footer className="bg-secondary text-white py-12 mt-auto" id="contato">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold text-lg mb-4 text-white">Contato</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              {settings?.phone && (
                <li>
                  Telefone:{' '}
                  <a
                    href={getWaLink(settings.phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    {formatPhone(settings.phone)}
                  </a>
                </li>
              )}
              {settings?.email && (
                <li>
                  E-mail:{' '}
                  <a
                    href={`mailto:${settings.email}`}
                    className="hover:text-primary transition-colors"
                  >
                    {settings.email}
                  </a>
                </li>
              )}
              {!settings?.phone && !settings?.email && (
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
                <Link to="/pagina/sobre-nos" className="hover:text-primary transition-colors">
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link to="/pagina/termos" className="hover:text-primary transition-colors">
                  Termos de Serviço
                </Link>
              </li>
              <li>
                <Link to="/pagina/privacidade" className="hover:text-primary transition-colors">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link to="/pagina/trocas" className="hover:text-primary transition-colors">
                  Trocas e Devoluções
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-white/10 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Skip Apps - Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  )
}
