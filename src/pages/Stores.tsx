import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useTenant } from '@/contexts/tenant-context'
import { Skeleton } from '@/components/ui/skeleton'
import { VideoPreview } from '@/components/VideoPreview'
import { MapPin, Clock, Store } from 'lucide-react'
import { getFileUrl } from '@/services/products'

interface LocationRecord {
  id: string
  street?: string
  number?: string
  neighborhood?: string
  city?: string
  state?: string
  zip?: string
  hours?: string
  image?: string
  video_url?: string
  video_file?: string
  tenant?: string
  collectionId?: string
  collectionName?: string
}

export default function StoresPage() {
  const { currentTenant } = useTenant()
  const [locations, setLocations] = useState<LocationRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!currentTenant) return
    try {
      const data = await pb.collection('pickup_locations').getFullList<LocationRecord>({
        filter: `tenant = '${currentTenant.id}'`,
      })
      setLocations(data)
    } catch (e) {
      setLocations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentTenant) {
      loadData()
    }
  }, [currentTenant?.id])

  useRealtime('pickup_locations', () => {
    loadData()
  })

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <section className="bg-secondary text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Nossas Lojas</h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Conheça nossos pontos de retirada e encontre a unidade mais próxima de você.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-96 rounded-2xl" />
              ))}
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-16 px-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 text-gray-400">
                <Store className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-semibold text-secondary mb-2">Nenhuma loja cadastrada</h2>
              <p className="text-sm text-gray-500 mb-6">
                Nenhum ponto de retirada cadastrado no momento para esta empresa.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {locations.map((loc) => {
                const cityState =
                  [loc.city, loc.state].filter(Boolean).join(' - ') || 'Nossa Unidade'
                const streetPart = [loc.street, loc.number].filter(Boolean).join(', ')
                const addressMain = [streetPart, loc.neighborhood].filter(Boolean).join(' - ')
                const addressStr = `${loc.street || ''}, ${loc.number || ''} - ${loc.neighborhood || ''}, ${loc.city || ''} - ${loc.state || ''}`
                const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressStr)}`

                let imageUrl = ''
                if (loc.image) {
                  try {
                    imageUrl = pb.files.getURL(loc as any, loc.image)
                  } catch {
                    imageUrl = ''
                  }
                }

                let videoSrc = ''
                if (loc.video_file) {
                  try {
                    videoSrc = getFileUrl(loc as any, loc.video_file)
                  } catch {
                    videoSrc = ''
                  }
                } else if (loc.video_url && typeof loc.video_url === 'string') {
                  videoSrc = loc.video_url.trim()
                }

                return (
                  <div
                    key={loc.id}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col"
                  >
                    <div className="aspect-video w-full overflow-hidden bg-gray-100">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={cityState}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            ;(e.currentTarget as HTMLElement).style.display = 'none'
                            const parent = e.currentTarget.parentElement
                            if (parent) {
                              parent.innerHTML = `
                                <div class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400">
                                  <svg class="h-12 w-12 mb-2 stroke-current fill-none" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
                                  <span class="text-sm font-medium">Sem imagem</span>
                                </div>
                              `
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400">
                          <Store className="h-12 w-12 mb-2" />
                          <span className="text-sm font-medium">Sem imagem</span>
                        </div>
                      )}
                    </div>

                    <div className="p-6 flex-1 flex flex-col gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-secondary mb-3">{cityState}</h3>
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-start gap-2 text-sm text-gray-600 hover:text-primary transition-colors"
                        >
                          <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                          <span>
                            {addressMain || 'Endereço sob consulta'}
                            {loc.zip && <br />}
                            {loc.zip && `CEP: ${loc.zip}`}
                          </span>
                        </a>
                        {loc.hours && (
                          <div className="flex items-start gap-2 text-sm text-gray-600 mt-2">
                            <Clock className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                            <span>{loc.hours}</span>
                          </div>
                        )}
                      </div>

                      {videoSrc && (
                        <div className="mt-2">
                          {loc.video_file ? (
                            <video
                              src={videoSrc}
                              controls
                              className="w-full rounded-lg border border-gray-200"
                            />
                          ) : (
                            <VideoPreview url={videoSrc} />
                          )}
                        </div>
                      )}

                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-auto inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        Ver no Mapa
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
