import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pencil, Trash2, Plus, Search, PowerOff } from 'lucide-react'

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [categories, setCategories] = useState<any[]>([])
  const [rentalPeriods, setRentalPeriods] = useState<any[]>([])

  const [formData, setFormData] = useState<any>({
    id: '',
    name: '',
    reference: '',
    description: '',
    detailed_description: '',
    price: 0,
    status: 'active',
    category: '',
    rental_period: '',
    external_link: '',
    order: 1,
  })
  const [mainImage, setMainImage] = useState<File | null>(null)
  const [mainVideo, setMainVideo] = useState<File | null>(null)

  const loadData = async () => {
    try {
      const filter = search ? `name ~ "${search}" || reference ~ "${search}"` : ''
      const [pRes, cRes, rRes] = await Promise.all([
        pb.collection('products').getFullList({ filter, sort: '-created' }),
        pb.collection('categories').getFullList(),
        pb.collection('rental_periods').getFullList(),
      ])
      setProducts(pRes)
      setCategories(cRes)
      setRentalPeriods(rRes)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [search])

  const handleEdit = (p: any) => {
    setFormData({
      id: p.id || '',
      name: p.name || '',
      reference: p.reference || '',
      description: p.description || '',
      detailed_description: p.detailed_description || '',
      price: p.price || 0,
      status: p.status || 'active',
      category: p.category || '',
      rental_period: p.rental_period || '',
      external_link: p.external_link || '',
      order: p.order || 1,
    })
    setMainImage(null)
    setMainVideo(null)
    setIsOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir produto?')) return
    await pb.collection('products').delete(id)
    loadData()
    toast({ title: 'Excluído' })
  }

  const handleToggleStatus = async (p: any) => {
    await pb
      .collection('products')
      .update(p.id, { status: p.status === 'active' ? 'inactive' : 'active' })
    loadData()
  }

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const form = new FormData()
      Object.keys(formData).forEach((k) => {
        if (k !== 'id') form.append(k, formData[k])
      })
      if (mainImage) form.append('image', mainImage)
      if (mainVideo) form.append('video', mainVideo)

      if (formData.id) {
        await pb.collection('products').update(formData.id, form)
      } else {
        await pb.collection('products').create(form)
      }
      toast({ title: 'Sucesso', description: 'Produto salvo!' })
      setIsOpen(false)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
        <Button onClick={() => handleEdit({})}>
          <Plus className="h-4 w-4 mr-2" /> Novo Produto
        </Button>
      </div>

      <div className="flex gap-2 max-w-sm">
        <Input
          placeholder="Buscar por nome ou ref..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button variant="outline" size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <div className="bg-white rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.reference || '-'}</TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>R$ {p.price}</TableCell>
                <TableCell>{p.status === 'active' ? 'Ativo' : 'Suspenso'}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(p)}>
                    <PowerOff
                      className={`h-4 w-4 ${p.status === 'active' ? 'text-green-500' : 'text-gray-400'}`}
                    />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(p.id)}
                    className="text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-[400px] sm:w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{formData.id ? 'Editar Produto' : 'Novo Produto'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={saveProduct} className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Nome</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Referência</Label>
                <Input
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prazo de Locação</Label>
                <Select
                  value={formData.rental_period}
                  onValueChange={(v) => setFormData({ ...formData, rental_period: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {rentalPeriods.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} ({r.days}d)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Descrição Curta</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Descrição Detalhada</Label>
                <Textarea
                  value={formData.detailed_description}
                  onChange={(e) =>
                    setFormData({ ...formData, detailed_description: e.target.value })
                  }
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Link Externo (YouTube/Loom)</Label>
                <Input
                  type="url"
                  value={formData.external_link}
                  onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Imagem Principal</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setMainImage(e.target.files?.[0] || null)}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Vídeo Principal</Label>
                <Input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setMainVideo(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <div className="pt-4 border-t">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
