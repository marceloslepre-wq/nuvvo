import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/contexts/cart-context'
import { getActiveProducts, getFileUrl, Product } from '@/services/products'
import { useRealtime } from '@/hooks/use-realtime'

export default function Index() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { increment } = useCart()
  const [products, setProducts] = useState<Product[]>([])

  const loadProducts = async () => {
    try {
      const data = await getActiveProducts()
      setProducts(data)
    } catch (error) {
      console.error('Failed to load products:', error)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  useRealtime('products', () => {
    loadProducts()
  })

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 350
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  const handleAddToCart = (productName: string) => {
    increment()
    toast({
      title: 'Produto adicionado ao carrinho',
      description: `${productName} foi adicionado com sucesso!`,
      duration: 3000,
    })
  }

  return (
    <div className="w-full">
      <section className="relative h-[80vh] min-h-[500px] max-h-[800px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://img.usecurling.com/p/1920/1080?q=tech&color=black&dpr=2"
            alt="Hero Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60"></div>
        </div>

        <div className="container mx-auto px-4 z-10 text-center text-white">
          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Tecnologia e Estilo em um <span className="text-primary">Só Lugar</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-200">
              Descubra nossa seleção premium de produtos projetados para elevar seu dia a dia.
              Qualidade excepcional com ofertas imperdíveis.
            </p>
            <div className="pt-4">
              <Button
                size="lg"
                className="text-base px-8 h-14 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg transition-transform scale-100 hover:scale-105 active:scale-95"
                asChild
              >
                <Link to="/#destaques">Ver Ofertas</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="destaques" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-secondary mb-2">Destaques</h2>
              <p className="text-gray-600">Os produtos mais desejados do momento.</p>
            </div>

            <div className="hidden md:flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => scroll('left')}
                className="rounded-full hover:bg-gray-100 hover:text-primary transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => scroll('right')}
                className="rounded-full hover:bg-gray-100 hover:text-primary transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0"
          >
            {products.map((product) => {
              const imageUrl = product.image
                ? getFileUrl(product, product.image)
                : `https://img.usecurling.com/p/600/600?q=tech&color=gray&seed=${product.id}`
              return (
                <div
                  key={product.id}
                  className="min-w-[280px] md:min-w-[320px] max-w-[320px] flex-none bg-white rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 snap-center group"
                >
                  <Link
                    to={`/produto/${product.id}`}
                    className="block overflow-hidden rounded-xl mb-4 bg-gray-100"
                  >
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  </Link>
                  <div className="space-y-2">
                    <Link to={`/produto/${product.id}`}>
                      <h3 className="font-semibold text-lg text-secondary line-clamp-1 group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-gray-500 line-clamp-2 min-h-[40px]">
                      {product.description}
                    </p>
                    <div className="text-xl font-bold text-secondary pt-2">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(product.price)}
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        className="flex-1 border-gray-300 text-secondary hover:bg-gray-50"
                        asChild
                      >
                        <Link to={`/produto/${product.id}`}>Saiba Mais</Link>
                      </Button>
                      <Button
                        className="flex-1 bg-primary hover:bg-primary/90 text-white active:scale-95 transition-transform"
                        onClick={() => handleAddToCart(product.name)}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Adquira
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}

            {products.length === 0 && (
              <div className="w-full text-center py-10 text-gray-500">
                Nenhum produto disponível no momento.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
