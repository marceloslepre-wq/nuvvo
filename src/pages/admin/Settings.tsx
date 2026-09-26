import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from '@/components/ui/use-toast'
import { Plus, Trash2, Pencil, Building2, RotateCcw, X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useTenant } from '@/contexts/tenant-context'

export default function AdminSettings() {
  const { user } = useAuth()
  const { activeAdminTenant, refreshTenants } = useTenant()
  const [searchParams, setSearchParams] = useSearchParams()
  const validTabs = ['users', 'categories', 'variations', 'rental', 'locations', 'company']
  const currentTab =
    searchParams.get('tab') && validTabs.includes(searchParams.get('tab')!)
      ? searchParams.get('tab')!
      : 'users'

  const handleTabChange = (val: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('tab', val)
        return next
      },
      { replace: true },
    )
  }
  const [users, setUsers] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [variations, setVariations] = useState<any[]>([])
  const [rentalPeriods, setRentalPeriods] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Estado da aba Empresa
  // Para novos cadastros ou carregamento de tenant, se o tenant já tiver os dados preenchidos
  // (ex: no cadastro público original), reflete esses valores; se estiver vazio (como no caso
  // que o usuário precisa preencher manualmente para Hospital Home), inicia vazio.
  const [companyName, setCompanyName] = useState('')
  const [companyCnpj, setCompanyCnpj] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [savingCompany, setSavingCompany] = useState(false)

  // Estado da aba Locais (transferida de Layout & Empresa)
  interface EditLocForm {
    street: string
    number: string
    neighborhood: string
    city: string
    state: string
    zip: string
    hours: string
    video_url: string
  }
  const emptyEditForm: EditLocForm = {
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    zip: '',
    hours: '',
    video_url: '',
  }
  const [editingLocation, setEditingLocation] = useState<any | null>(null)
  const [editForm, setEditForm] = useState<EditLocForm>(emptyEditForm)
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [deleteEditImage, setDeleteEditImage] = useState(false)
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null)
  const [deleteEditVideo, setDeleteEditVideo] = useState(false)
  const [savingLocation, setSavingLocation] = useState(false)

  const isMaster = user?.role === 'master'

  const loadData = async () => {
    // Determinar o tenant ativo para filtragem
    const targetTenantId = activeAdminTenant?.id || user?.tenant || ''

    // Se for master e estiver gerenciando uma locadora selecionada:
    // filtra os usuários daquela locadora (incluindo usuários legados sem tenant se for a locadora de origem)
    // Se for gestor: a API Rule já isola no backend, mas podemos reforçar com tenant filter se targetTenantId existir
    let userFilter = ''
    if (isMaster && targetTenantId) {
      if (activeAdminTenant?.is_origin) {
        userFilter = `tenant = '${targetTenantId}' || tenant = '' || tenant = null`
      } else {
        userFilter = `tenant = '${targetTenantId}'`
      }
    } else if (!isMaster && targetTenantId) {
      if (activeAdminTenant?.is_origin) {
        userFilter = `tenant = '${targetTenantId}' || tenant = '' || tenant = null`
      } else {
        userFilter = `tenant = '${targetTenantId}'`
      }
    }

    const catalogFilter = targetTenantId ? `tenant = '${targetTenantId}'` : undefined

    const [u, c, v, r, locs] = await Promise.all([
      pb
        .collection('users')
        .getFullList({
          sort: 'name',
          filter: userFilter || undefined,
        })
        .catch((err) => {
          console.error('Erro ao carregar usuários:', err)
          return []
        }),
      pb
        .collection('categories')
        .getFullList({
          sort: 'order,name',
          filter: catalogFilter,
        })
        .catch(async () => {
          // Fallback seguro de ordenação por nome caso ocorra erro
          return pb
            .collection('categories')
            .getFullList({
              sort: 'name',
              filter: catalogFilter,
            })
            .catch((err) => {
              console.error('Erro ao carregar categorias:', err)
              return []
            })
        }),
      pb
        .collection('variations')
        .getFullList({
          sort: 'order,name',
          filter: catalogFilter,
        })
        .catch(async () => {
          // Fallback seguro de ordenação por nome caso ocorra erro
          return pb
            .collection('variations')
            .getFullList({
              sort: 'name',
              filter: catalogFilter,
            })
            .catch((err) => {
              console.error('Erro ao carregar variações:', err)
              return []
            })
        }),
      pb
        .collection('rental_periods')
        .getFullList({
          sort: 'order,days',
          filter: catalogFilter,
        })
        .catch(async () => {
          // Fallback seguro de ordenação por days/name caso ocorra erro
          return pb
            .collection('rental_periods')
            .getFullList({
              sort: 'name',
              filter: catalogFilter,
            })
            .catch((err) => {
              console.error('Erro ao carregar prazos de locação:', err)
              return []
            })
        }),
      pb
        .collection('pickup_locations')
        .getFullList({
          filter: catalogFilter,
        })
        .catch((err) => {
          console.error('Erro ao carregar locais:', err)
          return []
        }),
    ])
    setUsers(Array.isArray(u) ? u : [])
    setCategories(Array.isArray(c) ? c : [])
    setVariations(Array.isArray(v) ? v : [])
    setRentalPeriods(Array.isArray(r) ? r : [])
    setLocations(Array.isArray(locs) ? locs : [])
  }

  useEffect(() => {
    loadData()
    // Atualiza os campos da empresa caso o activeAdminTenant mude
    if (activeAdminTenant) {
      // Se for tenant novo ou tiver dados cadastrados, reflete as informações fornecidas;
      // se não houver dados preenchidos, permanece vazio
      setCompanyName(String(activeAdminTenant.name || ''))
      setCompanyCnpj(String(activeAdminTenant.document_cnpj || ''))
      setCompanyEmail(String(activeAdminTenant.email || ''))
      setCompanyPhone(String(activeAdminTenant.phone || ''))
    } else {
      setCompanyName('')
      setCompanyCnpj('')
      setCompanyEmail('')
      setCompanyPhone('')
    }
  }, [activeAdminTenant?.id, user?.id])

  useRealtime('users', () => {
    loadData()
  })
  useRealtime('categories', () => {
    loadData()
  })
  useRealtime('variations', () => {
    loadData()
  })
  useRealtime('rental_periods', () => {
    loadData()
  })
  useRealtime('pickup_locations', () => {
    loadData()
  })

  const deleteRecord = async (col: string, id: string) => {
    if (col === 'users') {
      const targetUser = users.find((u) => u.id === id)
      if (targetUser?.role === 'master' || targetUser?.email === 'marceloslepre@gmail.com') {
        toast({
          title: 'Ação não permitida',
          description: 'O usuário Master é único e não pode ser excluído.',
          variant: 'destructive',
        })
        return
      }
    }
    if (!confirm('Excluir?')) return
    try {
      await pb.collection(col).delete(id)
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err.message,
        variant: 'destructive',
      })
      return
    }

    toast({ title: 'Excluído' })
    try {
      loadData()
    } catch {
      // Ignora falha de refresh silenciosamente
    }
  }

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    try {
      const targetTenantId = activeAdminTenant?.id || user?.tenant || ''
      const email = fd.get('email') as string
      const password = fd.get('password') as string
      const name = fd.get('name') as string
      const role = fd.get('role') as string

      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name,
        role,
        tenant: targetTenantId || null,
        emailVisibility: true,
      })
    } catch (err: any) {
      const fieldErrors = extractFieldErrors(err)
      if (fieldErrors.email && err?.response?.data?.email?.code === 'validation_not_unique') {
        toast({
          title: 'E-mail já cadastrado',
          description: 'Este e-mail já está cadastrado no sistema.',
          variant: 'destructive',
        })
        return
      }
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
      return
    }

    toast({ title: 'Usuário Adicionado' })
    try {
      form?.reset?.()
    } catch {
      // Ignora falha secundária no reset
    }
    try {
      loadData()
    } catch {
      // Ignora falha de refresh silenciosamente
    }
  }

  const handleAddLocation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const targetTenantId = activeAdminTenant?.id || user?.tenant || ''
    if (targetTenantId) {
      fd.append('tenant', targetTenantId)
    }
    try {
      await pb.collection('pickup_locations').create(fd)
    } catch (err: any) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
      return
    }

    // Sucesso garantido: registrar notificação e atualizar dados/formulário sem quebrar o fluxo
    toast({ title: 'Local Adicionado' })
    try {
      form?.reset?.()
    } catch {
      // Ignora falha secundária no reset
    }
    try {
      loadData()
    } catch {
      // Ignora falha de refresh silenciosamente
    }
  }

  const openEditLocation = (loc: any) => {
    if (!loc) return
    setEditingLocation(loc)
    setEditForm({
      street: String(loc.street || ''),
      number: String(loc.number || ''),
      neighborhood: String(loc.neighborhood || ''),
      city: String(loc.city || ''),
      state: String(loc.state || ''),
      zip: String(loc.zip || ''),
      hours: String(loc.hours || ''),
      video_url: String(loc.video_url || ''),
    })
    setEditImageFile(null)
    setDeleteEditImage(false)
    setEditVideoFile(null)
    setDeleteEditVideo(false)
  }

  const closeEditLocation = () => {
    setEditingLocation(null)
  }

  const saveEditLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLocation) return
    setSavingLocation(true)
    try {
      const fd = new FormData()
      fd.append('street', editForm.street)
      fd.append('number', editForm.number)
      fd.append('neighborhood', editForm.neighborhood)
      fd.append('city', editForm.city)
      fd.append('state', editForm.state)
      fd.append('zip', editForm.zip)
      fd.append('hours', editForm.hours)
      fd.append('video_url', editForm.video_url)
      if (editImageFile) {
        fd.append('image', editImageFile)
      } else if (deleteEditImage) {
        fd.append('image', '')
      }
      if (editVideoFile) {
        fd.append('video_file', editVideoFile)
      } else if (deleteEditVideo) {
        fd.append('video_file', '')
      }
      await pb.collection('pickup_locations').update(editingLocation.id, fd)
    } catch (err: any) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
      setSavingLocation(false)
      return
    }

    toast({ title: 'Local Atualizado' })
    closeEditLocation()
    try {
      loadData()
    } catch {
      // Ignora falha de refresh silenciosamente
    }
    setSavingLocation(false)
  }

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetTenantId = activeAdminTenant?.id || user?.tenant || ''
    if (!targetTenantId) {
      toast({
        title: 'Empresa não identificada',
        description: 'Não foi possível identificar a empresa ativa para salvar os dados.',
        variant: 'destructive',
      })
      return
    }

    setSavingCompany(true)
    try {
      const payload: Record<string, any> = {
        name: companyName.trim(),
        document_cnpj: companyCnpj.trim(),
        email: companyEmail.trim(),
        phone: companyPhone.trim(),
      }

      await pb.collection('tenants').update(targetTenantId, payload)
      await refreshTenants()

      // Também sincronizar telefone/email em site_settings se existir
      try {
        const siteSettingsList = await pb.collection('site_settings').getList(1, 1, {
          filter: `tenant = '${targetTenantId}'`,
        })
        if (siteSettingsList.items.length > 0) {
          const ssId = siteSettingsList.items[0].id
          const ssUpdate: Record<string, string> = {}
          if (companyEmail !== undefined) ssUpdate.email = companyEmail.trim()
          if (companyPhone !== undefined) ssUpdate.phone = companyPhone.trim()
          if (Object.keys(ssUpdate).length > 0) {
            await pb.collection('site_settings').update(ssId, ssUpdate)
          }
        }
      } catch (err) {
        console.error('Erro ao sincronizar site_settings:', err)
      }

      toast({
        title: 'Dados da Empresa Salvos',
        description: 'Os dados da sua empresa foram atualizados com sucesso.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSavingCompany(false)
    }
  }

  const handleAddSimple = async (
    e: React.FormEvent<HTMLFormElement>,
    col: string,
    extra?: string,
  ) => {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const targetTenantId = activeAdminTenant?.id || user?.tenant || ''
    const data: any = { name: fd.get('name') }
    if (extra && fd.get(extra)) data[extra] = fd.get(extra)
    if (targetTenantId) {
      data.tenant = targetTenantId
    }
    try {
      await pb.collection(col).create(data)
    } catch (err: any) {
      const errObj = err.response?.data
      let errMsg = err.message
      if (errObj && typeof errObj === 'object') {
        errMsg =
          Object.values(errObj)
            .map((e: any) => e?.message)
            .filter(Boolean)
            .join(' ') || errMsg
      }
      toast({ title: 'Erro', description: errMsg, variant: 'destructive' })
      return
    }

    toast({ title: 'Adicionado' })
    try {
      form?.reset?.()
    } catch {
      // Ignora falha secundária no reset
    }
    try {
      loadData()
    } catch {
      // Ignora falha de refresh silenciosamente
    }
  }

  if (user?.role !== 'gestor' && user?.role !== 'master') {
    return <Navigate to="/admin/dashboard" />
  }

  const filteredUsers = users.filter((u) => {
    // Para usuários com papel 'gestor', o Master nunca deve vazar na tabela da empresa,
    // a não ser que o próprio usuário logado seja o Master
    if (!isMaster && (u.role === 'master' || u.email === 'marceloslepre@gmail.com')) {
      return false
    }

    if (roleFilter === 'all') return true
    return u.role === roleFilter
  })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Configurações Globais</h1>
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="variations">Variações</TabsTrigger>
          <TabsTrigger value="rental">Prazos</TabsTrigger>
          <TabsTrigger value="locations">Locais</TabsTrigger>
          <TabsTrigger value="company">Empresa</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-2">
            <form onSubmit={handleAddUser} className="flex gap-2 flex-1 max-w-2xl flex-wrap">
              <Input
                name="name"
                placeholder="Nome"
                required
                className="w-auto flex-1 min-w-[130px]"
              />
              <Input
                name="email"
                type="email"
                placeholder="E-mail"
                required
                className="w-auto flex-1 min-w-[140px]"
              />
              <Input
                name="password"
                type="password"
                placeholder="Senha"
                required
                className="w-auto flex-1 min-w-[100px]"
              />
              <Select name="role" defaultValue="funcionario">
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="funcionario">Funcionário</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </form>

            {/* Filtro por Perfil */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Filtrar perfil:</span>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os perfis</SelectItem>
                  {isMaster && <SelectItem value="master">Master</SelectItem>}
                  <SelectItem value="gestor">Gestores</SelectItem>
                  <SelectItem value="funcionario">Funcionários</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-white border rounded-md shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => {
                  const isUserMaster = u.role === 'master' || u.email === 'marceloslepre@gmail.com'

                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-gray-900">{u.name}</TableCell>
                      <TableCell className="text-gray-600">{u.email}</TableCell>
                      <TableCell>
                        {isUserMaster ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-600 text-white shadow-sm">
                            Master
                          </span>
                        ) : u.role === 'gestor' ? (
                          <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            Gestor
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                            Funcionário
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingUser(u)}
                          title="Editar dados do usuário"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRecord('users', u.id)}
                          disabled={isUserMaster}
                          title={
                            isUserMaster
                              ? 'O usuário Master é único e não pode ser excluído'
                              : 'Excluir usuário'
                          }
                        >
                          <Trash2
                            className={`h-4 w-4 ${
                              isUserMaster ? 'text-gray-300 cursor-not-allowed' : 'text-red-500'
                            }`}
                          />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4 pt-4">
          <form
            onSubmit={(e) => handleAddSimple(e, 'categories')}
            className="flex gap-2 mb-4 max-w-md"
          >
            <Input name="name" placeholder="Nova Categoria..." required />
            <Button type="submit">
              <Plus className="h-4 w-4" />
            </Button>
          </form>
          <div className="bg-white border rounded-md max-w-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRecord('categories', c.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="variations" className="space-y-4 pt-4">
          <form
            onSubmit={(e) => handleAddSimple(e, 'variations', 'category')}
            className="flex gap-2 mb-4 max-w-2xl"
          >
            <Input
              name="name"
              placeholder="Nova Variação (ex: Tam 44)..."
              required
              className="flex-1"
            />
            <select
              name="category"
              required
              className="flex h-9 w-[200px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              defaultValue=""
            >
              <option value="" disabled>
                Selecione a Categoria
              </option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <Button type="submit">
              <Plus className="h-4 w-4" />
            </Button>
          </form>
          <div className="bg-white border rounded-md max-w-2xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variations.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>
                      {categories.find((cat: any) => cat.id === c.category)?.name || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRecord('variations', c.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="rental" className="space-y-4 pt-4">
          <form
            onSubmit={(e) => handleAddSimple(e, 'rental_periods', 'days')}
            className="flex gap-2 mb-4 max-w-md"
          >
            <Input name="name" placeholder="Nome (ex: 1 Semana)" required />
            <Input name="days" type="number" placeholder="Dias (ex: 7)" required className="w-24" />
            <Button type="submit">
              <Plus className="h-4 w-4" />
            </Button>
          </form>
          <div className="bg-white border rounded-md max-w-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rentalPeriods.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.days}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRecord('rental_periods', c.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 3) ABA LOCAIS (transferida de Layout & Empresa) */}
        <TabsContent value="locations" className="space-y-4 pt-4">
          <form
            onSubmit={handleAddLocation}
            className="grid grid-cols-2 gap-4 bg-white p-4 border rounded-md mb-6 max-w-3xl"
          >
            <Input name="street" placeholder="Rua" required className="col-span-2 sm:col-span-1" />
            <Input name="number" placeholder="Número" required />
            <Input name="neighborhood" placeholder="Bairro" required />
            <Input name="city" placeholder="Cidade" required />
            <Input name="state" placeholder="Estado" required />
            <Input name="zip" placeholder="CEP" />
            <Input name="hours" placeholder="Horário de Func." className="col-span-2" />
            <div className="col-span-2">
              <Label className="mb-2 block">Imagem do Local</Label>
              <Input type="file" name="image" accept="image/*" />
            </div>
            <div className="col-span-2">
              <Label className="mb-2 block">Video URL (YouTube/Vimeo)</Label>
              <Input name="video_url" placeholder="https://www.youtube.com/watch?v=..." />
            </div>
            <div className="col-span-2">
              <Label className="mb-2 block">Upload de Vídeo</Label>
              <Input type="file" name="video_file" accept="video/*" />
            </div>
            <Button
              type="submit"
              className="col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" /> Adicionar Local
            </Button>
          </form>
          <div className="bg-white border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Imagem</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!locations || locations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-gray-500 py-6">
                      Nenhum local cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  locations.map((l) => {
                    if (!l) return null
                    const addressParts = [
                      l.street,
                      l.number ? `, ${l.number}` : '',
                      l.neighborhood ? ` - ${l.neighborhood}` : '',
                    ]
                      .filter(Boolean)
                      .join('')

                    return (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium text-gray-900">
                          {addressParts || '-'}
                        </TableCell>
                        <TableCell>
                          {l.city ? `${l.city}${l.state ? `/${l.state}` : ''}` : '-'}
                        </TableCell>
                        <TableCell>{l.hours || '-'}</TableCell>
                        <TableCell>
                          {l.image ? (
                            <img
                              src={pb.files.getURL(l, l.image)}
                              alt="Local"
                              className="h-10 w-16 object-cover rounded"
                            />
                          ) : (
                            <span className="text-xs text-gray-400">Sem imagem</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditLocation(l)}
                              title="Editar local"
                            >
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteRecord('pickup_locations', l.id)}
                              title="Excluir local"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 1) NOVA ABA EMPRESA: campos iguais ao PublicOnboarding, nascem vazios e são salváveis */}
        <TabsContent value="company" className="space-y-4 pt-4 max-w-2xl">
          <form
            onSubmit={handleSaveCompany}
            className="space-y-4 bg-white p-6 border rounded-md shadow-sm"
          >
            <div className="flex items-center gap-2 pb-2 border-b">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Dados da Empresa</h2>
                <p className="text-xs text-gray-500">
                  Preencha as informações cadastrais da sua empresa.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Razão Social / Nome da Empresa</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Sua Empresa LTDA ou Nome Fantasia"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={companyCnpj}
                  onChange={(e) => setCompanyCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="space-y-2">
                <Label>E-mail Corporativo</Label>
                <Input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="gestor@suaempresa.com.br"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>WhatsApp / Telefone</Label>
              <Input
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>

            {/* Subdomínio SOMENTE LEITURA conforme especificação */}
            <div className="space-y-2">
              <Label>Subdomínio (Somente leitura)</Label>
              <div className="flex items-center rounded-md border border-gray-200 bg-gray-50 overflow-hidden">
                <span className="bg-gray-100 border-r border-gray-200 text-gray-500 font-mono px-3 h-10 flex items-center text-xs font-medium shrink-0 select-none">
                  nuvvo.sholver.com.br/
                </span>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={activeAdminTenant?.subdomain || activeAdminTenant?.slug || ''}
                  placeholder="subdominio"
                  className="w-full bg-gray-50 text-gray-600 placeholder:text-gray-400 h-10 px-3 text-xs font-mono outline-none cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-gray-400">
                O subdomínio da empresa é fixo e definido na contratação/onboarding.
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={savingCompany}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {savingCompany ? 'Salvando...' : 'Salvar Dados da Empresa'}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>

      {/* Dialog para Editar Local (Locais de Retirada transferido) */}
      <Dialog open={!!editingLocation} onOpenChange={(open) => !open && closeEditLocation()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Local</DialogTitle>
          </DialogHeader>
          {editingLocation && (
            <form onSubmit={saveEditLocation} className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Rua"
                value={editForm.street}
                onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                required
                className="col-span-2 sm:col-span-1"
              />
              <Input
                placeholder="Número"
                value={editForm.number}
                onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                required
              />
              <Input
                placeholder="Bairro"
                value={editForm.neighborhood}
                onChange={(e) => setEditForm({ ...editForm, neighborhood: e.target.value })}
                required
              />
              <Input
                placeholder="Cidade"
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                required
              />
              <Input
                placeholder="Estado"
                value={editForm.state}
                onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                required
              />
              <Input
                placeholder="CEP"
                value={editForm.zip}
                onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })}
              />
              <Input
                placeholder="Horário de Func."
                value={editForm.hours}
                onChange={(e) => setEditForm({ ...editForm, hours: e.target.value })}
                className="col-span-2"
              />

              {/* Imagem do Local */}
              <div className="col-span-2 space-y-2">
                <Label>Imagem do Local</Label>
                {editingLocation.image && !deleteEditImage && !editImageFile && (
                  <div className="flex items-center gap-3 rounded-md border p-2">
                    <img
                      src={pb.files.getURL(editingLocation, editingLocation.image)}
                      alt="Preview"
                      className="h-20 w-full max-w-[180px] object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteEditImage(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2 text-red-500" /> Remover
                    </Button>
                  </div>
                )}
                {deleteEditImage && !editImageFile && (
                  <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-600">
                    A imagem será removida ao salvar.
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteEditImage(false)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" /> Desfazer
                    </Button>
                  </div>
                )}
                {editImageFile && (
                  <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-700">
                    {editImageFile.name} (novo)
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditImageFile(null)}
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
                {!editImageFile && !deleteEditImage && (
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setEditImageFile(e.target.files?.[0] || null)
                      setDeleteEditImage(false)
                    }}
                  />
                )}
              </div>

              {/* Video URL */}
              <div className="col-span-2 space-y-2">
                <Label>Video URL (YouTube/Vimeo)</Label>
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={editForm.video_url}
                  onChange={(e) => setEditForm({ ...editForm, video_url: e.target.value })}
                />
              </div>

              {/* Upload de Vídeo */}
              <div className="col-span-2 space-y-2">
                <Label>Upload de Vídeo</Label>
                {editingLocation.video_file && !deleteEditVideo && !editVideoFile && (
                  <div className="flex items-center gap-3 rounded-md border p-2 text-sm text-gray-600">
                    <span className="truncate max-w-[150px]">{editingLocation.video_file}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteEditVideo(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2 text-red-500" /> Remover
                    </Button>
                  </div>
                )}
                {deleteEditVideo && !editVideoFile && (
                  <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-600">
                    O vídeo será removido ao salvar.
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteEditVideo(false)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" /> Desfazer
                    </Button>
                  </div>
                )}
                {editVideoFile && (
                  <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-700">
                    {editVideoFile.name} (novo)
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditVideoFile(null)}
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
                {!editVideoFile && !deleteEditVideo && (
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      setEditVideoFile(e.target.files?.[0] || null)
                      setDeleteEditVideo(false)
                    }}
                  />
                )}
              </div>

              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeEditLocation}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingLocation}>
                  {savingLocation ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const form = e.currentTarget
                const fd = new FormData(form)
                try {
                  await pb.send(`/backend/v1/users/${editingUser.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                      name: fd.get('name'),
                      email: fd.get('email'),
                      role: fd.get('role'),
                    }),
                    headers: { 'Content-Type': 'application/json' },
                  })
                } catch (err: any) {
                  toast({
                    title: 'Erro',
                    description: getErrorMessage(err),
                    variant: 'destructive',
                  })
                  return
                }

                toast({ title: 'Usuário Atualizado' })
                setEditingUser(null)
                try {
                  form?.reset?.()
                } catch {
                  // Ignora falha secundária no reset
                }
                try {
                  loadData()
                } catch {
                  // Ignora falha de refresh silenciosamente
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input name="name" defaultValue={editingUser.name} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <Input name="email" type="email" defaultValue={editingUser.email} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Perfil</label>
                {editingUser.role === 'master' ? (
                  <div className="p-2 bg-red-50 text-red-700 text-xs font-bold rounded border border-red-200">
                    Master (Perfil único global e protegido)
                  </div>
                ) : (
                  <Select name="role" defaultValue={editingUser.role}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="funcionario">Funcionário</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
