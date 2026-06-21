import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/contexts/cart-context'
import { getActiveProducts, getFileUrl, Product } from '@/services/products'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { Image } from '@/components/Image'
import { Skeleton } from '@/components/ui/skeleton'

export default function Index() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { increment } = useCart()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [heroMedia, setHeroMedia] = useState<string>('')
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)

  const loadData = async () => {
    try {
      const data = await getActiveProducts()
      setProducts(data)
      const cats = await pb.collection('categories').getFullList()
      setCategories(cats)
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

  useRealtime('site_settings', () => {
    loadData()
  })

  const handleAddToCart = (productName: string) => {
    increment()
    toast({
      title: 'Produto adicionado ao carrinho',
      description: `${productName} foi adicionado com sucesso!`,
      duration: 3000,
    })
  }

  const stripHtml = (html: string) => {
    if (!html) return ''
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  return (
    <div className="w-full">
      {heroMedia && <link rel="preload" as="image" href={heroMedia} fetchPriority="high" />}
      <section className="relative w-full min-h-[500px] max-h-[800px] aspect-[16/9] lg:aspect-[3/2] flex items-center justify-center overflow-hidden bg-gray-100">
        {(isDataLoading || (heroMedia && !imageLoaded)) && (
          <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
        )}
        {heroMedia && (
          <img
            src={heroMedia}
            alt="Hero Background"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="eager"
            fetchPriority="high"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
          />
        )}
        <div className="container mx-auto px-4 z-10 text-center text-white"></div>
      </section>

      {categories.length > 0 && (
        <section className="py-8 bg-white border-b">
          <div className="container mx-auto px-4">
            <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x pb-4">
              {categories.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/categoria/${c.id}`)}
                  className="snap-center whitespace-nowrap px-6 py-2 bg-gray-100 rounded-full font-medium text-gray-700 hover:bg-primary hover:text-white transition-colors cursor-pointer"
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
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(Math.ceil(product.price * 30))}
                      <span className="text-sm font-normal text-gray-500 ml-1">/mês</span>
                    </div>

                    <div className="flex gap-2 pt-4 mt-auto">
                      <Button
                        variant="outline"
                        className="flex-1 border-gray-300 text-secondary hover:bg-gray-50"
                        asChild
                      >
                        <Link to={`/produto/${product.id}`}>Saiba Mais</Link>
                      </Button>
                      <Button
                        className="flex-1 bg-primary hover:bg-primary/90 text-white active:scale-95 transition-transform"
                        asChild
                      >
                        <Link to={`/produto/${product.id}/compra`}>
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Adquira Agora
                        </Link>
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
