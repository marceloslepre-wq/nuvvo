import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight, ShoppingCart, Truck, Check, Minus, Plus, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/contexts/cart-context'
import { getProduct, getActiveProducts, getFileUrl, Product } from '@/services/products'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const [activeMedia, setActiveMedia] = useState<'image' | 'video'>('image')
  const [quantity, setQuantity] = useState(1)
  const [cep, setCep] = useState('')
  const [freight, setFreight] = useState<{ value: number; days: number } | null>(null)

  const { toast } = useToast()
  const { increment } = useCart()

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return
      try {
        setLoading(true)
        const p = await getProduct(id)
        setProduct(p)
        setActiveMedia('image')
        setQuantity(1)
        setFreight(null)
        setCep('')

        const allProducts = await getActiveProducts()
        setRelatedProducts(allProducts.filter((item) => item.id !== id).slice(0, 4))
      } catch (error) {
        console.error('Product not found', error)
        setProduct(null)
      } finally {
        setLoading(false)
      }
    }
    loadProduct()
  }, [id])

  if (loading) {
    return (
      <div className="container mx-auto py-20 text-center animate-fade-in">
        <h2 className="text-2xl font-medium mb-4 text-gray-500">Carregando produto...</h2>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container mx-auto py-20 text-center animate-fade-in">
        <h2 className="text-2xl font-bold mb-4 text-secondary">Produto não encontrado</h2>
        <Button asChild>
          <Link to="/">Voltar para a Home</Link>
        </Button>
      </div>
    )
  }

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      increment()
    }
    toast({
      title: 'Adicionado ao carrinho',
      description: `${quantity}x ${product.name} adicionado com sucesso!`,
    })
  }

  const handleCalculateFreight = (e: React.FormEvent) => {
    e.preventDefault()
    if (cep.length >= 8) {
      setFreight({ value: 15.9, days: 3 })
    }
  }

  const imageUrl = product.image
    ? getFileUrl(product, product.image)
    : `https://img.usecurling.com/p/800/800?q=tech&color=gray&seed=${product.id}`
  const videoUrl = product.video ? getFileUrl(product, product.video) : ''

  return (
    <div className="bg-white min-h-screen py-8">
      <div className="container mx-auto px-4">
        <nav className="flex items-center text-sm text-gray-500 mb-8 animate-fade-in">
          <Link to="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <Link to="/#destaques" className="hover:text-primary transition-colors">
            Produtos
          </Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-secondary font-medium truncate">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          <div className="space-y-4">
            <Tabs
              defaultValue="image"
              className="w-full"
              onValueChange={(v) => setActiveMedia(v as 'image' | 'video')}
            >
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="image">Imagem</TabsTrigger>
                <TabsTrigger value="video" disabled={!videoUrl}>
                  Vídeo MP4
                </TabsTrigger>
              </TabsList>

              <TabsContent value="image" className="mt-0">
                <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                  <img
                    src={imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover animate-fade-in"
                    key={imageUrl}
                  />
                </div>
              </TabsContent>

              <TabsContent value="video" className="mt-0">
                <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                  {videoUrl && (
                    <video
                      src={videoUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-cover bg-black animate-fade-in"
                    />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex flex-col animate-fade-in-up">
            <h1 className="text-3xl md:text-4xl font-bold text-secondary mb-4">{product.name}</h1>

            <div className="text-4xl font-bold text-primary mb-6">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                product.price,
              )}
              <span className="text-sm text-gray-500 font-normal block mt-1">
                em até 12x de{' '}
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  product.price / 12,
                )}{' '}
                sem juros
              </span>
            </div>

            <div id="product-description" className="scroll-mt-24">
              <p className="text-gray-600 mb-8 leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            </div>

            <Separator className="mb-8" />

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button
                size="lg"
                variant="outline"
                className="flex-1 h-12 text-base border-primary text-primary hover:bg-primary/5 active:scale-95 transition-transform"
                onClick={() => {
                  document
                    .getElementById('product-description')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Saiba Mais
              </Button>
              <Button
                size="lg"
                className="flex-1 h-12 text-base bg-primary hover:bg-primary/90 text-white active:scale-95 transition-transform shadow-md"
                asChild
              >
                <Link to={`/produto/${product.id}/compra`}>
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Adquira Agora
                </Link>
              </Button>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <h3 className="flex items-center gap-2 font-medium text-secondary mb-4">
                <Truck className="w-5 h-5 text-gray-500" />
                Calcular Frete e Prazo
              </h3>
              <form onSubmit={handleCalculateFreight} className="flex gap-2">
                <Input
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => setCep(e.target.value.replace(/\D/g, '').substring(0, 8))}
                  className="max-w-[150px] bg-white focus-visible:ring-primary"
                />
                <Button
                  variant="secondary"
                  type="submit"
                  className="bg-secondary text-white hover:bg-secondary/90"
                >
                  Calcular
                </Button>
              </form>

              {freight && (
                <div className="mt-4 flex items-center justify-between text-sm bg-green-50 text-green-800 p-3 rounded-md border border-green-200 animate-fade-in-up">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Frete Padrão - até {freight.days} dias úteis</span>
                  </div>
                  <span className="font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      freight.value,
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className="pt-12 border-t border-gray-200 animate-fade-in">
            <h2 className="text-2xl font-bold text-secondary mb-8">Você também pode gostar</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((p) => {
                const thumbUrl = p.image
                  ? getFileUrl(p, p.image)
                  : `https://img.usecurling.com/p/800/800?q=tech&color=gray&seed=${p.id}`
                return (
                  <div key={p.id} className="group cursor-pointer">
                    <Link
                      to={`/produto/${p.id}`}
                      className="block overflow-hidden rounded-xl bg-gray-100 mb-4 aspect-square"
                    >
                      <img
                        src={thumbUrl}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </Link>
                    <Link to={`/produto/${p.id}`}>
                      <h3 className="font-medium text-secondary line-clamp-2 group-hover:text-primary transition-colors">
                        {p.name}
                      </h3>
                    </Link>
                    <div className="font-bold text-secondary mt-2">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(p.price)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
