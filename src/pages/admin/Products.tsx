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
import { sanitizeVideoUrl } from '@/lib/youtube'
import { VideoPreview } from '@/components/VideoPreview'

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
  const [prpList, setPrpList] = useState<any[]>([])
  const [pickupLocations, setPickupLocations] = useState<any[]>([])

  const [variantDetails, setVariantDetails] = useState<Record<string, string>>({})
  const [rentalPrices, setRentalPrices] = useState<Record<string, number>>({})

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
    status: 'active',
    category: '',
    rental_period: [],
    external_link: '',
    order: 1,
    variations: [],
    available_locations: [],
  })
  const [mainImage, setMainImage] = useState<File | null>(null)
  const [mainVideo, setMainVideo] = useState<File | null>(null)
  const [deleteMainImage, setDeleteMainImage] = useState(false)
  const [deleteMainVideo, setDeleteMainVideo] = useState(false)
  const [extraImageFiles, setExtraImageFiles] = useState<File[]>([])
  const [extraVideoFiles, setExtraVideoFiles] = useState<File[]>([])

  const loadData = async () => {
    try {
      const filter = search ? `name ~ "${search}"` : ''
      const [pRes, cRes, rRes, vRes, pvdRes, prpRes, plRes] = await Promise.all([
        pb.collection('products').getFullList({ filter, sort: '-created', expand: 'variations' }),
        pb.collection('categories').getFullList(),
        pb.collection('rental_periods').getFullList(),
        pb.collection('variations').getFullList(),
        pb.collection('product_variant_details').getFullList(),
        pb.collection('product_rental_prices').getFullList(),
        pb.collection('pickup_locations').getFullList(),
      ])

      const augmentedProducts = pRes.map((p: any) => ({
        ...p,
        originalName: p.name,
      }))
      setProducts(augmentedProducts)
      setCategories(cRes)
      setRentalPeriods(rRes)
      setVariations(vRes)
      setPvdList(pvdRes)
      setPrpList(prpRes)
      setPickupLocations(plRes)
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
  useRealtime('product_rental_prices', () => {
    loadData()
  })

  const handleEdit = async (p: any) => {
    setFormData({
      id: p.id || '',
      name: p.originalName || p.name || '',
      reference: p.reference || '',
      description: p.description || '',
      detailed_description: p.detailed_description || '',
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
      available_locations: p.available_locations || [],
      image: p.image || '',
      video: p.video || '',
    })
    setMainImage(null)
    setMainVideo(null)
    setDeleteMainImage(false)
    setDeleteMainVideo(false)
    setExtraImageFiles([])
    setExtraVideoFiles([])
    setNewMediaVariation('')
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

        const prp = await pb
          .collection('product_rental_prices')
          .getFullList({ filter: `product='${p.id}'` })
        const rPrices: Record<string, number> = {}
        prp.forEach((r) => {
          rPrices[r.rental_period] = r.price
        })
        setRentalPrices(rPrices)
      } catch {
        setProductMedia([])
        setVariantDetails({})
        setRentalPrices({})
      }
    } else {
      setProductMedia([])
      setVariantDetails({})
      setRentalPrices({})
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
    if (!newMediaVariation || !newMediaFile || newMediaVariation === '_empty') return
    setLoading(true)
    try {
      const variationId = newMediaVariation
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
        const variationName = variations.find((v) => v.id === newMediaVariation)?.name || ''
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
      setNewMediaFile(null)
      setNewMediaVariation('')
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
      const hasFileChanges = !!(mainImage || deleteMainImage || mainVideo || deleteMainVideo)

      let savedProductId = formData.id

      if (formData.id) {
        // Step 1: Always update metadata via JSON PATCH (more reliable than FormData for text/relation fields)
        await pb.collection('products').update(formData.id, {
          name: String(formData.name ?? ''),
          reference: String(formData.reference ?? ''),
          description: String(formData.description ?? ''),
          detailed_description: String(formData.detailed_description ?? ''),
          status: String(formData.status ?? 'active'),
          category: formData.category || null,
          order: Number(formData.order ?? 1),
          external_link: formData.external_link || null,
          variations: formData.variations || [],
          rental_period: formData.rental_period || [],
          available_locations: formData.available_locations || [],
        })

        // Step 2: If there are file changes, send a separate FormData PATCH with ONLY file fields.
        // PocketBase keeps all omitted fields as-is when updating via FormData.
        if (hasFileChanges) {
          const fileForm = new FormData()
          if (mainImage) {
            fileForm.append('image', mainImage)
          } else if (deleteMainImage) {
            fileForm.append('image', '')
          }
          if (mainVideo) {
            fileForm.append('video', mainVideo)
          } else if (deleteMainVideo) {
            fileForm.append('video', '')
          }
          await pb.collection('products').update(formData.id, fileForm)
        }
      } else {
        // Create new product — must send everything in one FormData request
        const form = new FormData()
        form.append('name', String(formData.name ?? ''))
        form.append('reference', String(formData.reference ?? ''))
        form.append('description', String(formData.description ?? ''))
        form.append('detailed_description', String(formData.detailed_description ?? ''))
        form.append('status', String(formData.status ?? 'active'))
        form.append('external_link', sanitizeVideoUrl(String(formData.external_link ?? '')))
        form.append('order', String(formData.order ?? 1))
        form.append('category', String(formData.category ?? ''))
        if (formData.variations && formData.variations.length > 0) {
          formData.variations.forEach((vId: string) => form.append('variations', vId))
        } else {
          form.append('variations', '')
        }
        if (formData.rental_period && formData.rental_period.length > 0) {
          formData.rental_period.forEach((rpId: string) => form.append('rental_period', rpId))
        } else {
          form.append('rental_period', '')
        }
        if (formData.available_locations && formData.available_locations.length > 0) {
          formData.available_locations.forEach((lId: string) =>
            form.append('available_locations', lId),
          )
        } else {
          form.append('available_locations', '')
        }
        if (mainImage) {
          form.append('image', mainImage)
        }
        if (mainVideo) {
          form.append('video', mainVideo)
        }
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

      for (const file of extraImageFiles) {
        const pmForm = new FormData()
        pmForm.append('product', savedProductId)
        pmForm.append('file', file)
        await pb.collection('product_media').create(pmForm)
      }
      for (const file of extraVideoFiles) {
        const pmForm = new FormData()
        pmForm.append('product', savedProductId)
        pmForm.append('file', file)
        await pb.collection('product_media').create(pmForm)
      }

      const existingPvd = await pb
        .collection('product_variant_details')
        .getFullList<any>({ filter: `product='${savedProductId}'` })
        .catch(() => [])
      const existingMap = new Map<string, any>(existingPvd.map((vd: any) => [vd.variation, vd]))

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

      const existingPrp = await pb
        .collection('product_rental_prices')
        .getFullList<any>({ filter: `product='${savedProductId}'` })
        .catch(() => [])
      const existingPrpMap = new Map<string, any>(existingPrp.map((r: any) => [r.rental_period, r]))

      for (const rpId of formData.rental_period) {
        const pValue = rentalPrices[rpId] || 0
        const existing = existingPrpMap.get(rpId)
        if (existing) {
          if (existing.price !== pValue) {
            await pb.collection('product_rental_prices').update(existing.id, { price: pValue })
          }
          existingPrpMap.delete(rpId)
        } else {
          await pb.collection('product_rental_prices').create({
            product: savedProductId,
            rental_period: rpId,
            price: pValue,
          })
        }
      }
      for (const existing of Array.from(existingPrpMap.values())) {
        await pb.collection('product_rental_prices').delete(existing.id)
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
              <TableHead className="w-20">Miniatura</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Link</TableHead>
              <TableHead>A partir de</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    {(() => {
                      const pvds = pvdList.filter((vd) => vd.product === p.id && vd.reference_code)
                      if (pvds.length > 0) {
                        return (
                          <div className="flex flex-col gap-1 text-xs">
                            {p.reference && <span className="font-semibold">{p.reference}</span>}
                            {pvds.map((vd) => {
                              const varName =
                                variations.find((v) => v.id === vd.variation)?.name || 'Var'
                              return (
                                <span key={vd.id} className="text-gray-500 whitespace-nowrap">
                                  {varName}: {vd.reference_code}
                                </span>
                              )
                            })}
                          </div>
                        )
                      }
                      return p.reference || '-'
                    })()}
                  </TableCell>
                  <TableCell>
                    {p.image ? (
                      <img
                        src={pb.files.getURL(p, p.image)}
                        alt={p.originalName || p.name}
                        className="w-10 h-10 object-cover rounded-md block"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded-md block" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{p.originalName || p.name}</TableCell>
                  <TableCell>
                    {p.external_link ? (
                      <a
                        href={p.external_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline truncate max-w-[100px] block"
                      >
                        Link
                      </a>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const prices = prpList.filter((prp) => prp.product === p.id)
                      if (prices.length === 0) return '-'
                      const minPrice = Math.min(...prices.map((prp) => prp.price))
                      return new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(minPrice)
                    })()}
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

              <div className="space-y-2 col-span-2">
                <Label>Cidades Disponíveis</Label>
                <ToggleGroup
                  type="multiple"
                  value={formData.available_locations}
                  onValueChange={(v) => setFormData({ ...formData, available_locations: v })}
                  className="justify-start flex-wrap"
                >
                  {pickupLocations.map((loc: any) => (
                    <ToggleGroupItem key={loc.id} value={loc.id} className="border border-gray-200">
                      {loc.city}
                    </ToggleGroupItem>
                  ))}
                  {pickupLocations.length === 0 && (
                    <p className="text-sm text-gray-500 italic">
                      Nenhuma cidade cadastrada. Cadastre locais de retirada primeiro.
                    </p>
                  )}
                </ToggleGroup>
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
                <Label>Prazos de Locação</Label>
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

              {formData.rental_period.length > 0 && (
                <div className="space-y-3 col-span-2 mt-2 p-4 border border-dashed rounded-md bg-gray-50/50">
                  <Label>Preços por Prazo de Locação</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {formData.rental_period.map((rpId: string) => {
                      const rpName = rentalPeriods.find((r: any) => r.id === rpId)?.name
                      return (
                        <div key={rpId} className="space-y-1">
                          <Label className="text-xs text-gray-500">{rpName}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            placeholder="Valor"
                            value={rentalPrices[rpId] !== undefined ? rentalPrices[rpId] : ''}
                            onChange={(e) =>
                              setRentalPrices({
                                ...rentalPrices,
                                [rpId]: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

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
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                {formData.external_link && (
                  <VideoPreview url={formData.external_link} className="mt-2" />
                )}
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Imagem Principal</Label>
                <Input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => {
                    setMainImage(e.target.files?.[0] || null)
                    setDeleteMainImage(false)
                  }}
                />

                {formData.image && !deleteMainImage && !mainImage && (
                  <div className="flex items-center justify-between p-2 border rounded text-sm mt-2 bg-blue-50/50">
                    <span className="text-gray-600 truncate max-w-[200px] font-medium">
                      {formData.image}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => {
                        setDeleteMainImage(true)
                        setMainImage(null)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
                {mainImage && (
                  <div className="flex items-center justify-between p-2 border rounded text-sm mt-2 bg-green-50/50">
                    <span className="text-gray-600 truncate max-w-[200px] font-medium">
                      {mainImage.name} (novo)
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => setMainImage(null)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}

                {productMedia
                  .filter(
                    (pm) => !pm.expand?.variation && pm.file?.match(/\.(jpg|jpeg|png|webp)$/i),
                  )
                  .map((pm) => (
                    <div
                      key={pm.id}
                      className="flex items-center justify-between p-2 border rounded text-sm mt-2"
                    >
                      <span className="text-gray-500 truncate max-w-[200px]">{pm.file}</span>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteMedia(pm.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                {extraImageFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 border rounded text-sm mt-2"
                  >
                    <span className="text-gray-500 truncate max-w-[200px]">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setExtraImageFiles(extraImageFiles.filter((_, i) => i !== idx))
                      }
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}

                {(formData.image && !deleteMainImage ? 1 : 0) +
                  productMedia.filter(
                    (pm) => !pm.expand?.variation && pm.file?.match(/\.(jpg|jpeg|png|webp)$/i),
                  ).length +
                  extraImageFiles.length <
                  5 && (
                  <div className="mt-2">
                    <Input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="hidden"
                      id="extra-image-upload"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setExtraImageFiles([...extraImageFiles, e.target.files[0]])
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      type="button"
                      size="sm"
                      onClick={() => document.getElementById('extra-image-upload')?.click()}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Adicionar Imagem
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Vídeo Principal</Label>
                <Input
                  type="file"
                  accept=".mp4,.webm"
                  onChange={(e) => {
                    setMainVideo(e.target.files?.[0] || null)
                    setDeleteMainVideo(false)
                  }}
                />

                {formData.video && !deleteMainVideo && !mainVideo && (
                  <div className="flex items-center justify-between p-2 border rounded text-sm mt-2 bg-blue-50/50">
                    <span className="text-gray-600 truncate max-w-[200px] font-medium">
                      {formData.video}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => {
                        setDeleteMainVideo(true)
                        setMainVideo(null)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
                {mainVideo && (
                  <div className="flex items-center justify-between p-2 border rounded text-sm mt-2 bg-green-50/50">
                    <span className="text-gray-600 truncate max-w-[200px] font-medium">
                      {mainVideo.name} (novo)
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => setMainVideo(null)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}

                {productMedia
                  .filter((pm) => !pm.expand?.variation && pm.file?.match(/\.(mp4|webm)$/i))
                  .map((pm) => (
                    <div
                      key={pm.id}
                      className="flex items-center justify-between p-2 border rounded text-sm mt-2"
                    >
                      <span className="text-gray-500 truncate max-w-[200px]">{pm.file}</span>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteMedia(pm.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                {extraVideoFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 border rounded text-sm mt-2"
                  >
                    <span className="text-gray-500 truncate max-w-[200px]">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setExtraVideoFiles(extraVideoFiles.filter((_, i) => i !== idx))
                      }
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}

                {(formData.video && !deleteMainVideo ? 1 : 0) +
                  productMedia.filter(
                    (pm) => !pm.expand?.variation && pm.file?.match(/\.(mp4|webm)$/i),
                  ).length +
                  extraVideoFiles.length <
                  3 && (
                  <div className="mt-2">
                    <Input
                      type="file"
                      accept=".mp4,.webm"
                      className="hidden"
                      id="extra-video-upload"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setExtraVideoFiles([...extraVideoFiles, e.target.files[0]])
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      type="button"
                      size="sm"
                      onClick={() => document.getElementById('extra-video-upload')?.click()}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Adicionar Vídeo
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t space-y-4">
              <h3 className="font-semibold text-lg">Mídia por Variação</h3>

              <div className="grid grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Variação / Tipo</Label>
                  <Select value={newMediaVariation} onValueChange={setNewMediaVariation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVariationsForMedia.length === 0 && (
                        <SelectItem value="_empty" disabled>
                          Nenhuma variação
                        </SelectItem>
                      )}
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

              {(productMedia.filter((pm) => pm.expand?.variation).length > 0 ||
                pendingMedia.filter((pm) => pm.variationId).length > 0) && (
                <div className="mt-4 space-y-2">
                  {productMedia
                    .filter((pm) => pm.expand?.variation)
                    .map((pm) => (
                      <div
                        key={pm.id}
                        className="flex items-center justify-between p-2 border rounded text-sm"
                      >
                        <span className="font-medium">{pm.expand?.variation?.name}</span>
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
                  {pendingMedia
                    .filter((pm) => pm.variationId)
                    .map((pm) => (
                      <div
                        key={pm.tempId}
                        className="flex items-center justify-between p-2 border rounded text-sm bg-gray-50"
                      >
                        <span className="font-medium">{pm.variationName} (Não salvo)</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 truncate max-w-[150px]">
                            {pm.file.name}
                          </span>
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
