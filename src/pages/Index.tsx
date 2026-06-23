import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getActiveProducts, getFileUrl, Product } from '@/services/products'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { Image } from '@/components/Image'
import { Skeleton } from '@/components/ui/skeleton'

export default function Index() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [rentalPrices, setRentalPrices] = useState<any[]>([])
  const [rentalPeriods, setRentalPeriods] = useState<any[]>([])
  const [heroMedia, setHeroMedia] = useState<string>('')
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)

  const loadData = async () => {
    try {
      const data = await getActiveProducts()
      setProducts(data)
      const cats = await pb.collection('categories').getFullList()
      setCategories(cats)
      const rPrices = await pb.collection('product_rental_prices').getFullList()
      setRentalPrices(rPrices)
      const rPeriods = await pb.collection('rental_periods').getFullList()
      setRentalPeriods(rPeriods)
      const settings = await pb
        .collection('site_settings')
        .getFirstListItem('')
        .catch(() => null)
      if (settings && settings.hero_media) {
        const url = pb.files.getURL(settings, settings.hero_media)
        setHeroMedia((prev) => {
          if (prev !== url) setImageLoaded(false)
          return url
        })
      } else {
        setHeroMedia('')
        setImageLoaded(true)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      setImageLoaded(true)
    } finally {
      setIsDataLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('products', () => {
    loadData()
  })

  useRealtime('product_rental_prices', () => {
    loadData()
  })

  useRealtime('site_settings', () => {
    loadData()
  })

  const stripHtml = (html: string) => {
    if (!html) return ''
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  return (
    <div className="w-full">
      {heroMedia && <link rel="preload" as="image" href={heroMedia} fetchPriority="high" />}
      <section className="relative w-full min-h-[300px] flex items-center justify-center bg-gray-100 overflow-hidden">
        {(isDataLoading || (heroMedia && !imageLoaded)) && (
          <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
        )}
        {heroMedia && (
          <img
            src={heroMedia}
            alt="Hero Background"
            className={`w-full h-auto max-h-[50vh] sm:max-h-[70vh] lg:max-h-[80vh] object-contain transition-opacity duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="eager"
            fetchPriority="high"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
          />
        )}
      </section>

      {categories.length > 0 && (
        <section className="py-8 bg-white border-b">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap gap-4 justify-center pb-4">
              {categories.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/categoria/${c.id}`)}
                  className="whitespace-nowrap px-6 py-2 bg-gray-100 rounded-full font-medium text-gray-700 hover:bg-primary hover:text-white transition-colors cursor-pointer"
                >
                  {c.name}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="destaques" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-secondary mb-2">Todos os Produtos</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const imageUrl = product.image
                ? getFileUrl(product, product.image)
                : `https://img.usecurling.com/p/600/600?q=tech&color=gray&seed=${product.id}`
              const videoUrl = product.video ? getFileUrl(product, product.video) : null

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col"
                >
                  <Link
                    to={`/produto/${product.id}`}
                    className="block overflow-hidden rounded-xl mb-4 bg-gray-100"
                  >
                    <div className="aspect-square relative overflow-hidden">
                      {videoUrl ? (
                        <video
                          src={videoUrl}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          muted
                          loop
                          playsInline
                          onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                          onMouseLeave={(e) => {
                            const target = e.target as HTMLVideoElement
                            target.pause()
                            target.currentTime = 0
                          }}
                        />
                      ) : (
                        <Image
                          src={imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          containerClassName="w-full h-full"
                          lazy={true}
                        />
                      )}
                    </div>
                  </Link>
                  <div className="space-y-2 flex-1 flex flex-col">
                    <Link to={`/produto/${product.id}`}>
                      <h3 className="font-semibold text-lg text-secondary line-clamp-1 group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-gray-500 line-clamp-2 min-h-[40px]">
                      {stripHtml(product.description)}
                    </p>
                    <div className="text-xl font-bold text-secondary pt-2">
                      {(() => {
                        const prices = rentalPrices.filter((prp) => prp.product === product.id)
                        if (prices.length === 0) return 'Sob consulta'
                        const minPrice = Math.min(...prices.map((prp) => prp.price))
                        const periodId = prices.find((prp) => prp.price === minPrice)?.rental_period
                        const periodName =
                          rentalPeriods.find((r) => r.id === periodId)?.name || 'período'
                        return (
                          <>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(minPrice)}
                            <span className="text-sm font-normal text-gray-500 ml-1">
                              / {periodName}
                            </span>
                          </>
                        )
                      })()}
                    </div>

                    <div className="flex gap-2 pt-4 mt-auto">
                      <Button
                        className="w-full bg-primary hover:bg-primary/90 text-white transition-colors"
                        asChild
                      >
                        <Link to={`/produto/${product.id}`}>Saiba Mais</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}

            {products.length === 0 && (
              <div className="w-full text-center py-10 text-gray-500 col-span-full">
                Nenhum produto disponível no momento.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
