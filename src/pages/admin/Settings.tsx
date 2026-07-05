import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
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
import { Plus, Trash2 } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

export default function AdminSettings() {
  const { user } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [variations, setVariations] = useState<any[]>([])
  const [rentalPeriods, setRentalPeriods] = useState<any[]>([])

  const loadData = async () => {
    const [u, c, v, r] = await Promise.all([
      pb.collection('users').getFullList(),
      pb.collection('categories').getFullList(),
      pb.collection('variations').getFullList(),
      pb.collection('rental_periods').getFullList(),
    ])
    setUsers(u)
    setCategories(c)
    setVariations(v)
    setRentalPeriods(r)
  }

  useEffect(() => {
    loadData()
  }, [])

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
    if (!confirm('Excluir?')) return
    await pb.collection(col).delete(id)
    loadData()
    toast({ title: 'Excluído' })
  }

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await pb.collection('users').create({
        email: fd.get('email'),
        password: fd.get('password'),
        passwordConfirm: fd.get('password'),
        name: fd.get('name'),
        role: fd.get('role'),
      })
      loadData()
      e.currentTarget.reset()
      toast({ title: 'Usuário Adicionado' })
    } catch (err: any) {
      const errObj = err?.response?.data
      if (errObj && typeof errObj === 'object' && errObj.email?.code === 'validation_not_unique') {
        toast({
          title: 'E-mail já cadastrado',
          description: 'Este e-mail já está cadastrado no sistema.',
          variant: 'destructive',
        })
        return
      }
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

  const handleAddSimple = async (
    e: React.FormEvent<HTMLFormElement>,
    col: string,
    extra?: string,
  ) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data: any = { name: fd.get('name') }
    if (extra && fd.get(extra)) data[extra] = fd.get(extra)
    try {
      await pb.collection(col).create(data)
      loadData()
      e.currentTarget.reset()
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

  if (user?.role !== 'gestor') {
    return <Navigate to="/admin/dashboard" />
  }

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
          <form onSubmit={handleAddUser} className="flex gap-2 mb-4 max-w-3xl flex-wrap">
            <Input name="name" placeholder="Nome" required className="w-auto flex-1" />
            <Input
              name="email"
              type="email"
              placeholder="E-mail"
              required
              className="w-auto flex-1"
            />
            <Input
              name="password"
              type="password"
              placeholder="Senha"
              required
              className="w-auto flex-1"
            />
            <Select name="role" defaultValue="funcionario">
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="funcionario">Funcionário</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">
              <Plus className="h-4 w-4" />
            </Button>
          </form>
          <div className="bg-white border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRecord('users', u.id)}
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
    </div>
  )
}
