import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Trash2, Pencil, X, RotateCcw } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { RichTextEditor } from '@/components/RichTextEditor'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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

export default function AdminLayoutSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<any>(null)
  const [locations, setLocations] = useState<any[]>([])
  const [aboutUs, setAboutUs] = useState('')
  const [terms, setTerms] = useState('')
  const [privacy, setPrivacy] = useState('')
  const [returns, setReturns] = useState('')

  // Contact form file state (explicit control so files are never cleared accidentally)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [deleteLogo, setDeleteLogo] = useState(false)
  const [heroFile, setHeroFile] = useState<File | null>(null)
  const [deleteHero, setDeleteHero] = useState(false)

  // Edit pickup location state
  const [editingLocation, setEditingLocation] = useState<any | null>(null)
  const [editForm, setEditForm] = useState<EditLocForm>(emptyEditForm)
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [deleteEditImage, setDeleteEditImage] = useState(false)
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null)
  const [deleteEditVideo, setDeleteEditVideo] = useState(false)
  const [savingLocation, setSavingLocation] = useState(false)

  const loadData = async () => {
    try {
      const res = await pb.collection('site_settings').getFirstListItem('')
      setSettings(res)
      setAboutUs(res.about_us || '')
      setTerms(res.terms || '')
      setPrivacy(res.privacy || '')
      setReturns(res.returns || '')
    } catch {
      const s = await pb.collection('site_settings').create({ phone: '', email: '' })
      setSettings(s)
      setAboutUs('')
      setTerms('')
      setPrivacy('')
      setReturns('')
    }
    const locs = await pb.collection('pickup_locations').getFullList()
    setLocations(locs)
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('site_settings', () => {
    loadData()
  })
  useRealtime('pickup_locations', () => {
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

  const handleAddLocation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await pb.collection('pickup_locations').create(fd)
      loadData()
      e.currentTarget.reset()
      toast({ title: 'Local Adicionado' })
    } catch (err: any) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  const delLocation = async (id: string) => {
    if (!confirm('Excluir?')) return
    await pb.collection('pickup_locations').delete(id)
    loadData()
  }

  const openEditLocation = (loc: any) => {
    setEditingLocation(loc)
    setEditForm({
      street: loc.street || '',
      number: loc.number || '',
      neighborhood: loc.neighborhood || '',
      city: loc.city || '',
      state: loc.state || '',
      zip: loc.zip || '',
      hours: loc.hours || '',
      video_url: loc.video_url || '',
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
      // Only touch file fields when a new file is selected or an explicit
      // removal is requested. Otherwise the field is omitted and the
      // existing file is preserved by PocketBase.
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
      closeEditLocation()
      loadData()
      toast({ title: 'Local Atualizado' })
    } catch (err: any) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    }
    setSavingLocation(false)
  }

  if (user?.role !== 'gestor') {
    return <Navigate to="/admin/dashboard" />
  }

  if (!settings) return null

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Layout da Página Principal</h1>
      <Tabs defaultValue="contact" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="contact">Contato & Mídia Hero</TabsTrigger>
          <TabsTrigger value="locations">Locais de Retirada</TabsTrigger>
          <TabsTrigger value="pages">Páginas de Conteúdo</TabsTrigger>
        </TabsList>

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

        <TabsContent value="locations" className="pt-4">
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
            <Button type="submit" className="col-span-2">
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
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      {l.street}, {l.number} - {l.neighborhood}
                    </TableCell>
                    <TableCell>
                      {l.city}/{l.state}
                    </TableCell>
                    <TableCell>{l.hours}</TableCell>
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
                        <Button variant="ghost" size="icon" onClick={() => openEditLocation(l)}>
                          <Pencil className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => delLocation(l.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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

      {/* Edit pickup location dialog — explicit file preservation & removal */}
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

              {/* Image — preserved unless a new file is chosen or removal is explicit */}
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

              {/* Video URL (text) */}
              <div className="col-span-2 space-y-2">
                <Label>Video URL (YouTube/Vimeo)</Label>
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={editForm.video_url}
                  onChange={(e) => setEditForm({ ...editForm, video_url: e.target.value })}
                />
              </div>

              {/* Video file — preserved unless a new file is chosen or removal is explicit */}
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
    </div>
  )
}
