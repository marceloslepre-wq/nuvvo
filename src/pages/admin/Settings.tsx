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
import { Plus, Trash2, Pencil } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useTenant } from '@/contexts/tenant-context'

export default function AdminSettings() {
  const { user } = useAuth()
  const { activeAdminTenant } = useTenant()
  const [users, setUsers] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [variations, setVariations] = useState<any[]>([])
  const [rentalPeriods, setRentalPeriods] = useState<any[]>([])
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [roleFilter, setRoleFilter] = useState<string>('all')

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

    const [u, c, v, r] = await Promise.all([
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
          sort: 'order',
          filter: catalogFilter,
        })
        .catch((err) => {
          console.error('Erro ao carregar categorias:', err)
          return []
        }),
      pb
        .collection('variations')
        .getFullList({
          sort: 'order',
          filter: catalogFilter,
        })
        .catch((err) => {
          console.error('Erro ao carregar variações:', err)
          return []
        }),
      pb
        .collection('rental_periods')
        .getFullList({
          sort: 'order',
          filter: catalogFilter,
        })
        .catch((err) => {
          console.error('Erro ao carregar prazos de locação:', err)
          return []
        }),
    ])
    setUsers(u)
    setCategories(c)
    setVariations(v)
    setRentalPeriods(r)
  }

  useEffect(() => {
    loadData()
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
      loadData()
      toast({ title: 'Excluído' })
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err.message,
        variant: 'destructive',
      })
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
      loadData()
      form.reset()
      toast({ title: 'Usuário Adicionado' })
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
      loadData()
      form.reset()
      toast({ title: 'Adicionado' })
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
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="variations">Variações</TabsTrigger>
          <TabsTrigger value="rental">Prazos de Locação</TabsTrigger>
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
      </Tabs>

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
                  loadData()
                  setEditingUser(null)
                  form.reset()
                  toast({ title: 'Usuário Atualizado' })
                } catch (err: any) {
                  toast({
                    title: 'Erro',
                    description: getErrorMessage(err),
                    variant: 'destructive',
                  })
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
