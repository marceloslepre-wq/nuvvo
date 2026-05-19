import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight, ShoppingCart, Truck, Check, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/contexts/cart-context'
import { mockProducts } from '@/lib/mock-data'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const product = mockProducts.find((p) => p.id === id)
  const relatedProducts = mockProducts.filter((p) => p.id !== id).slice(0, 4)

  const [mainImage, setMainImage] = useState(product?.imageUrl || '')
  const [quantity, setQuantity] = useState(1)
  const [cep, setCep] = useState('')
  const [freight, setFreight] = useState<{ value: number; days: number } | null>(null)

  const { toast } = useToast()
  const { increment } = useCart()

  useEffect(() => {
    if (product) {
      setMainImage(product.imageUrl)
      setQuantity(1)
      setFreight(null)
      setCep('')
    }
  }, [id, product])

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
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
              <img
                src={mainImage}
                alt={product.name}
                className="w-full h-full object-cover animate-fade-in"
                key={mainImage}
              />
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setMainImage(product.imageUrl)}
                className={`flex-none w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${mainImage === product.imageUrl ? 'border-primary' : 'border-transparent hover:border-gray-300'}`}
              >
                <img
                  src={product.imageUrl}
                  alt="Thumbnail main"
                  className="w-full h-full object-cover"
                />
              </button>
              {product.thumbnails.map((thumb, idx) => (
                <button
                  key={idx}
                  onClick={() => setMainImage(thumb)}
                  className={`flex-none w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${mainImage === thumb ? 'border-primary' : 'border-transparent hover:border-gray-300'}`}
                >
                  <img
                    src={thumb}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
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

            <p className="text-gray-600 mb-8 leading-relaxed">{product.fullDescription}</p>

            <Separator className="mb-8" />

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="flex items-center border border-gray-300 rounded-md h-12 w-32">
                <button
                  className="px-3 h-full text-gray-600 hover:text-primary hover:bg-gray-50 transition-colors rounded-l-md"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex-1 text-center font-medium">{quantity}</div>
                <button
                  className="px-3 h-full text-gray-600 hover:text-primary hover:bg-gray-50 transition-colors rounded-r-md"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <Button
                size="lg"
                variant="outline"
                className="flex-1 h-12 text-base border-primary text-primary hover:bg-primary/5 active:scale-95 transition-transform"
                onClick={handleAddToCart}
              >
                Adicionar ao Carrinho
              </Button>
              <Button
                size="lg"
                className="flex-1 h-12 text-base bg-primary hover:bg-primary/90 text-white active:scale-95 transition-transform shadow-md"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Comprar Agora
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
              {relatedProducts.map((product) => (
                <div key={product.id} className="group cursor-pointer">
                  <Link
                    to={`/produto/${product.id}`}
                    className="block overflow-hidden rounded-xl bg-gray-100 mb-4 aspect-square"
                  >
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </Link>
                  <Link to={`/produto/${product.id}`}>
                    <h3 className="font-medium text-secondary line-clamp-2 group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="font-bold text-secondary mt-2">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      product.price,
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
