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
import { toast } from '@/components/ui/use-toast'
import { RichTextEditor } from '@/components/RichTextEditor'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Pencil, Trash2, Plus, Search, PowerOff } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [categories, setCategories] = useState<any[]>([])
  const [rentalPeriods, setRentalPeriods] = useState<any[]>([])
  const [variations, setVariations] = useState<any[]>([])
  const [productMedia, setProductMedia] = useState<any[]>([])
  const [pvdList, setPvdList] = useState<any[]>([])

  const [variantDetails, setVariantDetails] = useState<Record<string, string>>({})

  const [newMediaVariation, setNewMediaVariation] = useState('geral')
  const [newMediaFile, setNewMediaFile] = useState<File | null>(null)

  const [pendingMedia, setPendingMedia] = useState<
    Array<{ tempId: string; variationId: string; file: File; variationName: string }>
  >([])

  const [formData, setFormData] = useState<any>({
    id: '',
    name: '',
    reference: '',
    description: '',
    detailed_description: '',
    price: 0,
    status: 'active',
    category: '',
    rental_period: [],
    external_link: '',
    order: 1,
    variations: [],
  })
  const [mainImage, setMainImage] = useState<File | null>(null)
  const [mainVideo, setMainVideo] = useState<File | null>(null)

  const loadData = async () => {
    try {
      const filter = search ? `name ~ "${search}"` : ''
      const [pRes, cRes, rRes, vRes, pvdRes] = await Promise.all([
        pb.collection('products').getFullList({ filter, sort: '-created', expand: 'variations' }),
        pb.collection('categories').getFullList(),
        pb.collection('rental_periods').getFullList(),
        pb.collection('variations').getFullList(),
        pb.collection('product_variant_details').getFullList(),
      ])

      const augmentedProducts = pRes.map((p: any) => ({
        ...p,
        originalName: p.name,
        name: (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 shrink-0 rounded-md overflow-hidden bg-gray-100 border flex items-center justify-center">
              {p.image ? (
                <img
                  src={pb.files.getURL(p, p.image)}
                  alt={p.originalName || p.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[10px] text-gray-400">Sem img</span>
              )}
            </div>
            <span className="font-medium">{p.name}</span>
          </div>
        ),
      }))
      setProducts(augmentedProducts)
      setCategories(cRes)
      setRentalPeriods(rRes)
      setVariations(vRes)
      setPvdList(pvdRes)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [search])

  useRealtime('products', () => {
    loadData()
  })
  useRealtime('categories', () => {
    loadData()
  })
  useRealtime('rental_periods', () => {
    loadData()
  })
  useRealtime('variations', () => {
    loadData()
  })
  useRealtime('product_variant_details', () => {
    loadData()
  })

  const handleEdit = async (p: any) => {
    setFormData({
      id: p.id || '',
      name: p.originalName || p.name || '',
      reference: p.reference || '',
      description: p.description || '',
      detailed_description: p.detailed_description || '',
      price: p.price || 0,
      status: p.status || 'active',
      category: p.category || '',
      rental_period: Array.isArray(p.rental_period)
        ? p.rental_period
        : p.rental_period
          ? [p.rental_period]
          : [],
      external_link: p.external_link || '',
      order: p.order || 1,
      variations: p.variations || [],
    })
    setMainImage(null)
    setMainVideo(null)
    setNewMediaVariation('geral')
    setNewMediaFile(null)
    setPendingMedia([])

    if (p.id) {
      try {
        const pm = await pb
          .collection('product_media')
          .getFullList({ filter: `product='${p.id}'`, expand: 'variation' })
        setProductMedia(pm)

        const pvd = await pb
          .collection('product_variant_details')
          .getFullList({ filter: `product='${p.id}'` })
        const vDetails: Record<string, string> = {}
        pvd.forEach((vd) => {
          vDetails[vd.variation] = vd.reference_code
        })
        setVariantDetails(vDetails)
      } catch {
        setProductMedia([])
        setVariantDetails({})
      }
    } else {
      setProductMedia([])
      setVariantDetails({})
    }

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

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleAddMedia = async () => {
    if (!newMediaVariation || !newMediaFile) return
    setLoading(true)
    try {
      const variationId = newMediaVariation === 'geral' ? '' : newMediaVariation
      if (formData.id) {
        const form = new FormData()
        form.append('product', formData.id)
        if (variationId) form.append('variation', variationId)
        form.append('file', newMediaFile)

        await pb.collection('product_media').create(form)

        const pm = await pb
          .collection('product_media')
          .getFullList({ filter: `product='${formData.id}'`, expand: 'variation' })
        setProductMedia(pm)
        toast({ title: 'Sucesso', description: 'Mídia adicionada!' })
      } else {
        const variationName =
          newMediaVariation === 'geral'
            ? 'Geral'
            : variations.find((v) => v.id === newMediaVariation)?.name || ''
        setPendingMedia([
          ...pendingMedia,
          {
            tempId: Math.random().toString(),
            variationId,
            file: newMediaFile,
            variationName,
          },
        ])
      }
      setNewMediaVariation('geral')
      setNewMediaFile(null)
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
    setLoading(false)
  }

  const handleDeleteMedia = async (id: string) => {
    if (!confirm('Excluir mídia?')) return
    try {
      await pb.collection('product_media').delete(id)
      const pm = await pb
        .collection('product_media')
        .getFullList({ filter: `product='${formData.id}'`, expand: 'variation' })
      setProductMedia(pm)
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleDeletePendingMedia = (tempId: string) => {
    setPendingMedia(pendingMedia.filter((m) => m.tempId !== tempId))
  }

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})
    try {
      const form = new FormData()
      Object.keys(formData).forEach((k) => {
        if (k === 'variations' || k === 'rental_period') {
          if (formData[k].length === 0) {
            form.append(k, '')
          } else {
            formData[k].forEach((vId: string) => form.append(k, vId))
          }
        } else if (k !== 'id') {
          form.append(k, formData[k])
        }
      })
      if (mainImage) form.append('image', mainImage)
      if (mainVideo) form.append('video', mainVideo)

      let savedProductId = formData.id
      if (formData.id) {
        await pb.collection('products').update(formData.id, form)
      } else {
        const newProd = await pb.collection('products').create(form)
        savedProductId = newProd.id
        for (const pm of pendingMedia) {
          const pmForm = new FormData()
          pmForm.append('product', newProd.id)
          if (pm.variationId) pmForm.append('variation', pm.variationId)
          pmForm.append('file', pm.file)
          await pb.collection('product_media').create(pmForm)
        }
      }

      const existingPvd = await pb
        .collection('product_variant_details')
        .getFullList({ filter: `product='${savedProductId}'` })
        .catch(() => [])
      const existingMap = new Map(existingPvd.map((vd) => [vd.variation, vd]))

      for (const vId of formData.variations) {
        const refCode = variantDetails[vId] || ''
        const existing = existingMap.get(vId)
        if (existing) {
          if (existing.reference_code !== refCode) {
            await pb
              .collection('product_variant_details')
              .update(existing.id, { reference_code: refCode })
          }
          existingMap.delete(vId)
        } else {
          await pb.collection('product_variant_details').create({
            product: savedProductId,
            variation: vId,
            reference_code: refCode,
          })
        }
      }
      for (const existing of Array.from(existingMap.values())) {
        await pb.collection('product_variant_details').delete(existing.id)
      }

      toast({ title: 'Sucesso', description: 'Produto salvo!' })
      setIsOpen(false)
      loadData()
    } catch (err: any) {
      const errs = extractFieldErrors(err)
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs)
        toast({
          title: 'Campos inválidos',
          description: 'Verifique os campos destacados.',
          variant: 'destructive',
        })
      } else {
        toast({ title: 'Erro', description: err.message, variant: 'destructive' })
      }
    }
    setLoading(false)
  }

  const availableVariationsForMedia = variations.filter((v) => formData.variations.includes(v.id))

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
              <TableHead className="w-16">Imagem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Valor Mensal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const hasVariations = p.variations && p.variations.length > 0
              const refs = hasVariations
                ? pvdList
                    .filter((vd) => vd.product === p.id && vd.reference_code)
                    .map((vd) => vd.reference_code)
                    .join(', ')
                : p.reference

              return (
                <TableRow key={p.id}>
                  <TableCell>{refs || '-'}</TableCell>
                  <TableCell>
                    {p.image ? (
                      <img
                        src={pb.files.getURL(p, p.image)}
                        alt={p.name}
                        className="w-10 h-10 object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded-md" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      Math.ceil(p.price * 30),
                    )}
                  </TableCell>
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
              )
            })}
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
                <Label>Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => {
                    const validVariations = (formData.variations || []).filter(
                      (vId: string) => variations.find((va: any) => va.id === vId)?.category === v,
                    )
                    const newVariantDetails = { ...variantDetails }
                    Object.keys(newVariantDetails).forEach((key) => {
                      if (!validVariations.includes(key)) {
                        delete newVariantDetails[key]
                      }
                    })
                    setVariantDetails(newVariantDetails)
                    setFormData({ ...formData, category: v, variations: validVariations })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Nome do Produto</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                {fieldErrors.name && (
                  <span className="text-red-500 text-xs">{fieldErrors.name}</span>
                )}
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Valor da Diária</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Variações</Label>
                {!formData.category ? (
                  <p className="text-sm text-gray-500 italic">
                    Selecione uma categoria primeiro para ver as variações.
                  </p>
                ) : (
                  <ToggleGroup
                    type="multiple"
                    value={formData.variations}
                    onValueChange={(v) => setFormData({ ...formData, variations: v })}
                    className="justify-start flex-wrap"
                  >
                    {variations
                      .filter((v: any) => v.category === formData.category)
                      .map((v: any) => (
                        <ToggleGroupItem key={v.id} value={v.id} className="border border-gray-200">
                          {v.name}
                        </ToggleGroupItem>
                      ))}
                    {variations.filter((v: any) => v.category === formData.category).length ===
                      0 && (
                      <p className="text-sm text-gray-500 italic">
                        Nenhuma variação encontrada para esta categoria.
                      </p>
                    )}
                  </ToggleGroup>
                )}
              </div>

              {(formData.variations || []).length === 0 && (
                <div className="space-y-2 col-span-2">
                  <Label>Referência do Produto</Label>
                  <Input
                    placeholder="Referência (opcional)"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  />
                </div>
              )}

              {(formData.variations || []).length > 0 && (
                <div className="space-y-3 col-span-2 mt-2 p-4 border border-dashed rounded-md bg-gray-50/50">
                  <Label>Referências por Variação</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(formData.variations || []).map((vId: string) => {
                      const vName = variations.find((v: any) => v.id === vId)?.name
                      return (
                        <div key={vId} className="space-y-1">
                          <Label className="text-xs text-gray-500">{vName}</Label>
                          <Input
                            placeholder="Referência (opcional)"
                            value={variantDetails[vId] || ''}
                            onChange={(e) =>
                              setVariantDetails({ ...variantDetails, [vId]: e.target.value })
                            }
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2 col-span-2">
                <Label>Prazos de Locação</Label>{' '}
                <ToggleGroup
                  type="multiple"
                  value={formData.rental_period}
                  onValueChange={(v) => setFormData({ ...formData, rental_period: v })}
                  className="justify-start flex-wrap"
                >
                  {rentalPeriods.map((r) => (
                    <ToggleGroupItem key={r.id} value={r.id} className="border border-gray-200">
                      {r.name} ({r.days}d)
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Descrição Curta</Label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(val) => setFormData({ ...formData, description: val })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Descrição Detalhada</Label>
                <RichTextEditor
                  value={formData.detailed_description}
                  onChange={(val) => setFormData({ ...formData, detailed_description: val })}
                  className="min-h-[150px]"
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

            <div className="mt-8 pt-6 border-t space-y-4">
              <h3 className="font-semibold text-lg">Galeria de Mídia</h3>

              <div className="grid grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Variação / Tipo</Label>
                  <Select value={newMediaVariation} onValueChange={setNewMediaVariation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="geral">Geral (Sem variação)</SelectItem>
                      {availableVariationsForMedia.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Arquivo (Imagem/Vídeo)</Label>
                  <Input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => setNewMediaFile(e.target.files?.[0] || null)}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAddMedia}
                  disabled={
                    loading || !newMediaVariation || !newMediaFile || newMediaVariation === '_empty'
                  }
                  className="col-span-2"
                >
                  <Plus className="h-4 w-4 mr-2" /> Adicionar Mídia
                </Button>
              </div>

              {(productMedia.length > 0 || pendingMedia.length > 0) && (
                <div className="mt-4 space-y-2">
                  {productMedia.map((pm) => (
                    <div
                      key={pm.id}
                      className="flex items-center justify-between p-2 border rounded text-sm"
                    >
                      <span className="font-medium">{pm.expand?.variation?.name || 'Geral'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 truncate max-w-[150px]">
                          {pm.file ? pm.file : 'Sem arquivo'}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMedia(pm.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pendingMedia.map((pm) => (
                    <div
                      key={pm.tempId}
                      className="flex items-center justify-between p-2 border rounded text-sm bg-gray-50"
                    >
                      <span className="font-medium">{pm.variationName} (Não salvo)</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 truncate max-w-[150px]">{pm.file.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePendingMedia(pm.tempId)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t mt-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Produto'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
