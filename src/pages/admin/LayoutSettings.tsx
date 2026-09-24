import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { Plus, Trash2, X, RotateCcw } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { RichTextEditor } from '@/components/RichTextEditor'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTenant } from '@/contexts/tenant-context'
import { Building2 } from 'lucide-react'

export default function AdminLayoutSettings() {
  const { user } = useAuth()
  const { activeAdminTenant, allTenants, refreshTenants, setSelectedAdminTenantId } = useTenant()
  const [settings, setSettings] = useState<any>(null)
  const [aboutUs, setAboutUs] = useState('')
  const [terms, setTerms] = useState('')
  const [privacy, setPrivacy] = useState('')
  const [returns, setReturns] = useState('')

  // Tenant management form state
  const [tenantName, setTenantName] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [tenantSubdomain, setTenantSubdomain] = useState('')
  const [tenantCustomDomain, setTenantCustomDomain] = useState('')
  const [tenantPreviewHost, setTenantPreviewHost] = useState('')
  const [tenantExtraHosts, setTenantExtraHosts] = useState('')
  const [savingTenant, setSavingTenant] = useState(false)
  const [isNewTenantOpen, setIsNewTenantOpen] = useState(false)

  // Contact form file state (explicit control so files are never cleared accidentally)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [deleteLogo, setDeleteLogo] = useState(false)
  const [heroFile, setHeroFile] = useState<File | null>(null)
  const [deleteHero, setDeleteHero] = useState(false)

  const loadData = async () => {
    if (!activeAdminTenant) return
    const tenantId = activeAdminTenant.id
    try {
      const res = await pb.collection('site_settings').getFirstListItem(`tenant = '${tenantId}'`)
      setSettings(res)
      setAboutUs(res.about_us || '')
      setTerms(res.terms || '')
      setPrivacy(res.privacy || '')
      setReturns(res.returns || '')
    } catch {
      // Cria site_settings associado ao tenant caso ainda não exista
      try {
        const s = await pb.collection('site_settings').create({
          tenant: tenantId,
          phone: activeAdminTenant.phone || '',
          email: activeAdminTenant.email || '',
        })
        setSettings(s)
        setAboutUs('')
        setTerms('')
        setPrivacy('')
        setReturns('')
      } catch {
        /* ignore */
      }
    }

    // Sync tenant metadata form
    setTenantName(activeAdminTenant.name || '')
    setTenantSlug(activeAdminTenant.slug || '')
    setTenantSubdomain(activeAdminTenant.subdomain || '')
    setTenantCustomDomain(activeAdminTenant.custom_domain || '')
    setTenantPreviewHost(activeAdminTenant.preview_host || '')
    setTenantExtraHosts(activeAdminTenant.extra_hosts || '')
  }

  useEffect(() => {
    loadData()
  }, [activeAdminTenant?.id])

  useRealtime('site_settings', () => {
    loadData()
  })

  const saveContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Text fields come from the form (phone, email). File fields are handled
    // explicitly via state: only appended when a new file is selected or an
    // explicit removal is requested. Omitted file fields are preserved by
    // PocketBase, so existing files never get cleared unintentionally.
    const fd = new FormData(e.currentTarget)
    if (logoFile) {
      fd.append('logo', logoFile)
    } else if (deleteLogo) {
      fd.append('logo', '')
    }
    if (heroFile) {
      fd.append('hero_media', heroFile)
    } else if (deleteHero) {
      fd.append('hero_media', '')
    }
    try {
      await pb.collection('site_settings').update(settings.id, fd)
      toast({ title: 'Sucesso', description: 'Configurações salvas.' })
      setLogoFile(null)
      setDeleteLogo(false)
      setHeroFile(null)
      setDeleteHero(false)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  const savePages = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Only the rich-text fields are sent; phone/email/logo/hero_media are
    // omitted and therefore preserved by PocketBase.
    const fd = new FormData(e.currentTarget)
    try {
      await pb.collection('site_settings').update(settings.id, fd)
      toast({ title: 'Sucesso', description: 'Conteúdos salvos.' })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  const saveTenantInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAdminTenant) return
    setSavingTenant(true)
    try {
      await pb.collection('tenants').update(activeAdminTenant.id, {
        name: tenantName,
        slug: tenantSlug,
        subdomain: tenantSubdomain.trim().toLowerCase(),
        custom_domain: tenantCustomDomain.trim().toLowerCase(),
        preview_host: tenantPreviewHost.trim().toLowerCase(),
        extra_hosts: tenantExtraHosts.trim().toLowerCase(),
      })
      await refreshTenants()
      toast({ title: 'Sucesso', description: 'Dados da empresa/domínio atualizados.' })
    } catch (err: any) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setSavingTenant(false)
    }
  }

  const handleCreateTenant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get('name') || '').trim()
    const slug = String(fd.get('slug') || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
    const subdomain = String(fd.get('subdomain') || '')
      .trim()
      .toLowerCase()
    const custom_domain = String(fd.get('custom_domain') || '')
      .trim()
      .toLowerCase()

    try {
      const newTenant = await pb.collection('tenants').create({
        name,
        slug,
        subdomain,
        custom_domain,
        status: 'active',
        phone: String(fd.get('phone') || '').trim(),
        email: String(fd.get('email') || '').trim(),
      })
      await pb.collection('site_settings').create({
        tenant: newTenant.id,
        phone: newTenant.phone || '',
        email: newTenant.email || '',
      })
      await refreshTenants()
      setSelectedAdminTenantId(newTenant.id)
      setIsNewTenantOpen(false)
      toast({ title: 'Empresa criada com sucesso!', description: `Ativada: ${newTenant.name}` })
    } catch (err: any) {
      toast({
        title: 'Erro ao criar empresa',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  if (user?.role !== 'gestor' && user?.role !== 'master') {
    return <Navigate to="/admin/dashboard" />
  }

  if (!settings) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Layout & Dados da Empresa</h1>
          <p className="text-sm text-gray-500 mt-1">
            Editando dados de:{' '}
            <strong className="text-primary">
              {activeAdminTenant?.name || 'Nenhuma selecionada'}
            </strong>
          </p>
        </div>
        <Button onClick={() => setIsNewTenantOpen(true)} variant="outline">
          <Plus className="w-4 h-4 mr-2" /> Nova Empresa
        </Button>
      </div>

      <Tabs defaultValue="tenant" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="tenant">Domínios & Empresa</TabsTrigger>
          <TabsTrigger value="contact">Contato & Mídia Hero</TabsTrigger>
          <TabsTrigger value="pages">Páginas de Conteúdo</TabsTrigger>
        </TabsList>

        <TabsContent value="tenant" className="pt-4 max-w-2xl">
          <form
            onSubmit={saveTenantInfo}
            className="space-y-4 bg-white p-6 border rounded-md shadow-sm"
          >
            <div className="flex items-center gap-2 pb-2 border-b">
              <Building2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">
                Identificação & Domínios (Multi-Tenant)
              </h2>
            </div>

            <div className="space-y-2">
              <Label>Nome da Empresa / Marca</Label>
              <Input
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                required
                placeholder="Ex: Hospital Home"
              />
            </div>

            <div className="space-y-2">
              <Label>Identificador Único (Slug)</Label>
              <Input
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                required
                placeholder="Ex: hospital-home"
              />
            </div>

            <div className="space-y-2">
              <Label>Subdomínio / Slug da Empresa</Label>
              <div className="flex items-center rounded-md border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                <span className="bg-gray-100 border-r border-gray-300 text-gray-600 font-mono px-3 h-10 flex items-center text-xs font-medium shrink-0 select-none">
                  nuvvo.sholver.com.br/
                </span>
                <input
                  type="text"
                  value={tenantSubdomain}
                  onChange={(e) => setTenantSubdomain(e.target.value)}
                  placeholder="aluguelhospitalhome"
                  className="w-full bg-white text-gray-900 placeholder:text-gray-400 h-10 px-3 text-xs font-mono outline-none"
                />
              </div>
              <p className="text-xs text-gray-500">
                Acesso provisório por caminho:{' '}
                <code>nuvvo.sholver.com.br/{tenantSubdomain || 'empresa'}</code> (e por subdomínio{' '}
                <code>{tenantSubdomain || 'empresa'}.sholver.com.br</code>)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Domínio Próprio do Cliente (CNAME)</Label>
              <Input
                value={tenantCustomDomain}
                onChange={(e) => setTenantCustomDomain(e.target.value)}
                placeholder="aluguelhospitalhome.sholver.com.br ou aluguel.cliente.com.br"
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                Host exato que o cliente usará apontando CNAME para a plataforma.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Host de Preview (Plataforma)</Label>
              <Input
                value={tenantPreviewHost}
                onChange={(e) => setTenantPreviewHost(e.target.value)}
                placeholder="plataforma-de-vendas-8286f--preview.goskip.app"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Hosts Adicionais (separados por vírgula)</Label>
              <Input
                value={tenantExtraHosts}
                onChange={(e) => setTenantExtraHosts(e.target.value)}
                placeholder="localhost, 127.0.0.1"
                className="font-mono text-sm"
              />
            </div>

            <Button type="submit" disabled={savingTenant}>
              {savingTenant ? 'Salvando...' : 'Salvar Dados da Empresa'}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="contact" className="pt-4 max-w-2xl">
          <form onSubmit={saveContact} className="space-y-4 bg-white p-4 border rounded-md">
            <div className="space-y-2">
              <Label>Telefone / WhatsApp</Label>
              <Input name="phone" defaultValue={settings.phone} />
            </div>
            <div className="space-y-2">
              <Label>E-mail de Contato</Label>
              <Input name="email" defaultValue={settings.email} />
            </div>

            {/* Logo — explicit file control */}
            <div className="space-y-2">
              <Label>Logomarca da Empresa</Label>
              {settings.logo && !deleteLogo && !logoFile && (
                <div className="mb-2 flex items-center gap-3 rounded-md border p-2">
                  <img
                    src={pb.files.getURL(settings, settings.logo)}
                    alt="Logo"
                    className="h-12 object-contain"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteLogo(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2 text-red-500" /> Remover Logo
                  </Button>
                </div>
              )}
              {deleteLogo && !logoFile && (
                <div className="mb-2 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-600">
                  A logomarca será removida ao salvar.
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteLogo(false)}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" /> Desfazer
                  </Button>
                </div>
              )}
              {logoFile && (
                <div className="mb-2 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-700">
                  {logoFile.name} (novo)
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLogoFile(null)}>
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              )}
              {!logoFile && !deleteLogo && (
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setLogoFile(e.target.files?.[0] || null)
                    setDeleteLogo(false)
                  }}
                />
              )}
            </div>

            {/* Hero media — explicit file control */}
            <div className="space-y-2">
              <Label>Hero Media (Fundo da Home)</Label>
              {settings.hero_media && !deleteHero && !heroFile && (
                <div className="mb-2 flex items-center gap-3 rounded-md border p-2 text-sm text-gray-600">
                  <span>Mídia atual salva.</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteHero(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2 text-red-500" /> Remover Mídia
                  </Button>
                </div>
              )}
              {deleteHero && !heroFile && (
                <div className="mb-2 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-600">
                  A mídia hero será removida ao salvar.
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteHero(false)}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" /> Desfazer
                  </Button>
                </div>
              )}
              {heroFile && (
                <div className="mb-2 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-700">
                  {heroFile.name} (novo)
                  <Button type="button" variant="ghost" size="sm" onClick={() => setHeroFile(null)}>
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              )}
              {!heroFile && !deleteHero && (
                <Input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    setHeroFile(e.target.files?.[0] || null)
                    setDeleteHero(false)
                  }}
                />
              )}
            </div>

            <Button type="submit">Salvar Alterações</Button>
          </form>
        </TabsContent>

        <TabsContent value="pages" className="pt-4 max-w-3xl">
          <form onSubmit={savePages} className="space-y-6 bg-white p-4 border rounded-md">
            <div className="space-y-2">
              <Label>Sobre Nós</Label>
              <RichTextEditor value={aboutUs} onChange={setAboutUs} />
              <input type="hidden" name="about_us" value={aboutUs} />
            </div>
            <div className="space-y-2">
              <Label>Termos de Serviço</Label>
              <RichTextEditor value={terms} onChange={setTerms} />
              <input type="hidden" name="terms" value={terms} />
            </div>
            <div className="space-y-2">
              <Label>Política de Privacidade</Label>
              <RichTextEditor value={privacy} onChange={setPrivacy} />
              <input type="hidden" name="privacy" value={privacy} />
            </div>
            <div className="space-y-2">
              <Label>Trocas e Devoluções</Label>
              <RichTextEditor value={returns} onChange={setReturns} />
              <input type="hidden" name="returns" value={returns} />
            </div>
            <Button type="submit">Salvar Conteúdos</Button>
          </form>
        </TabsContent>
      </Tabs>

      {/* Dialog para Cadastrar Nova Empresa (Multi-Tenant) */}
      <Dialog open={isNewTenantOpen} onOpenChange={setIsNewTenantOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Nova Empresa (Tenant)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTenant} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nome da Empresa</Label>
              <Input name="name" required placeholder="Ex: Ortocare Locações" />
            </div>
            <div className="space-y-2">
              <Label>Identificador (Slug)</Label>
              <Input name="slug" required placeholder="ortocare" />
            </div>
            <div className="space-y-2">
              <Label>Subdomínio (*.sholver.com.br)</Label>
              <div className="flex items-center">
                <Input
                  name="subdomain"
                  required
                  placeholder="ortocare"
                  className="rounded-r-none font-mono"
                />
                <span className="inline-flex items-center px-3 h-10 border border-l-0 rounded-r-md bg-gray-50 text-gray-500 text-xs">
                  .sholver.com.br
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Domínio Próprio (Opcional)</Label>
              <Input name="custom_domain" placeholder="locacao.ortocare.com.br" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Telefone / WhatsApp</Label>
                <Input name="phone" placeholder="27999999999" />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input name="email" type="email" placeholder="contato@empresa.com" />
              </div>
            </div>
            <Button type="submit" className="w-full">
              Cadastrar Empresa
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
