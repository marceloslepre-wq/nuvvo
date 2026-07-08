import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { RichTextEditor } from '@/components/RichTextEditor'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export default function AdminLayoutSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<any>(null)
  const [locations, setLocations] = useState<any[]>([])
  const [aboutUs, setAboutUs] = useState('')
  const [terms, setTerms] = useState('')
  const [privacy, setPrivacy] = useState('')
  const [returns, setReturns] = useState('')

  const loadData = async () => {
    try {
      const res = await pb.collection('site_settings').getFirstListItem('')
      setSettings(res)
      setAboutUs(res.about_us || '')
      setTerms(res.terms || '')
      setPrivacy(res.privacy || '')
      setReturns(res.returns || '')
    } catch (e) {
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

  const saveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await pb.collection('site_settings').update(settings.id, fd)
      toast({ title: 'Sucesso', description: 'Configurações salvas.' })
      loadData()
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

  const handleAddLocation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await pb.collection('pickup_locations').create(fd)
      loadData()
      e.currentTarget.reset()
      toast({ title: 'Local Adicionado' })
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

  const delLocation = async (id: string) => {
    if (!confirm('Excluir?')) return
    await pb.collection('pickup_locations').delete(id)
    loadData()
  }

  const handleEditLocation = async (id: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await pb.collection('pickup_locations').update(id, fd)
      loadData()
      toast({ title: 'Local Atualizado' })
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
          <form onSubmit={saveSettings} className="space-y-4 bg-white p-4 border rounded-md">
            <div className="space-y-2">
              <Label>Telefone / WhatsApp</Label>
              <Input name="phone" defaultValue={settings.phone} />
            </div>
            <div className="space-y-2">
              <Label>E-mail de Contato</Label>
              <Input name="email" defaultValue={settings.email} />
            </div>
            <div className="space-y-2">
              <Label>Logomarca da Empresa</Label>
              {settings.logo && (
                <div className="mb-2">
                  <img
                    src={pb.files.getURL(settings, settings.logo)}
                    alt="Logo"
                    className="h-12 object-contain"
                  />
                </div>
              )}
              <Input type="file" name="logo" accept="image/*" />
            </div>
            <div className="space-y-2">
              <Label>Hero Media (Fundo da Home)</Label>
              {settings.hero_media && (
                <div className="mb-2 text-sm text-gray-500">Mídia atual salva.</div>
              )}
              <Input type="file" name="hero_media" accept="image/*,video/*" />
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
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Editar Local</DialogTitle>
                            </DialogHeader>
                            <form
                              onSubmit={(e) => handleEditLocation(l.id, e)}
                              className="grid grid-cols-2 gap-4"
                            >
                              <Input
                                name="street"
                                placeholder="Rua"
                                defaultValue={l.street}
                                required
                                className="col-span-2 sm:col-span-1"
                              />
                              <Input
                                name="number"
                                placeholder="Número"
                                defaultValue={l.number}
                                required
                              />
                              <Input
                                name="neighborhood"
                                placeholder="Bairro"
                                defaultValue={l.neighborhood}
                                required
                              />
                              <Input
                                name="city"
                                placeholder="Cidade"
                                defaultValue={l.city}
                                required
                              />
                              <Input
                                name="state"
                                placeholder="Estado"
                                defaultValue={l.state}
                                required
                              />
                              <Input name="zip" placeholder="CEP" defaultValue={l.zip} />
                              <Input
                                name="hours"
                                placeholder="Horário de Func."
                                defaultValue={l.hours}
                                className="col-span-2"
                              />
                              <div className="col-span-2">
                                <Label className="mb-2 block">Imagem do Local</Label>
                                {l.image && (
                                  <img
                                    src={pb.files.getURL(l, l.image)}
                                    alt="Preview"
                                    className="h-20 w-full object-cover rounded mb-2"
                                  />
                                )}
                                <Input type="file" name="image" accept="image/*" />
                              </div>
                              <div className="col-span-2">
                                <Label className="mb-2 block">Video URL (YouTube/Vimeo)</Label>
                                <Input
                                  name="video_url"
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  defaultValue={l.video_url}
                                />
                              </div>
                              <div className="col-span-2">
                                <Label className="mb-2 block">Upload de Vídeo</Label>
                                <Input type="file" name="video_file" accept="video/*" />
                              </div>
                              <Button type="submit" className="col-span-2">
                                Salvar Alterações
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
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
          <form onSubmit={saveSettings} className="space-y-6 bg-white p-4 border rounded-md">
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
    </div>
  )
}
