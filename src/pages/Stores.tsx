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
  street: string
  number: string
  neighborhood: string
  city: string
  state: string
  zip: string
  hours: string
  image: string
  video_url: string
  video_file: string
  tenant?: string
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
            <div className="text-center py-16 text-gray-500">
              Nenhuma loja disponível no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {locations.map((loc) => {
                const addressStr = `${loc.street || ''}, ${loc.number || ''} - ${loc.neighborhood || ''}, ${loc.city || ''} - ${loc.state || ''}`
                const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressStr)}`
                const videoSrc = loc.video_file
                  ? getFileUrl(loc as any, loc.video_file)
                  : loc.video_url || ''

                return (
                  <div
                    key={loc.id}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col"
                  >
                    <div className="aspect-video w-full overflow-hidden bg-gray-100">
                      {loc.image ? (
                        <img
                          src={pb.files.getURL(loc as any, loc.image)}
                          alt={`${loc.city} - ${loc.state}`}
                          className="w-full h-full object-cover"
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
                        <h3 className="text-xl font-bold text-secondary mb-3">
                          {loc.city} - {loc.state}
                        </h3>
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-start gap-2 text-sm text-gray-600 hover:text-primary transition-colors"
                        >
                          <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                          <span>
                            {loc.street}, {loc.number} - {loc.neighborhood}
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
