import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Lock, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { getProduct, getFileUrl, Product } from '@/services/products'

export default function Checkout() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return
      try {
        setLoading(true)
        const p = await getProduct(id)
        setProduct(p)
      } catch (error) {
        console.error('Product not found', error)
      } finally {
        setLoading(false)
      }
    }
    loadProduct()
  }, [id])

  if (loading) {
    return (
      <div className="container mx-auto py-20 text-center animate-fade-in">
        <h2 className="text-2xl font-medium mb-4 text-gray-500">Preparando checkout...</h2>
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

  if (success) {
    return (
      <div className="container mx-auto py-20 text-center animate-fade-in">
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-secondary mb-2">Compra Confirmada!</h2>
          <p className="text-gray-600 mb-8">
            Seu pedido para o <strong>{product.name}</strong> foi processado com sucesso. Você
            receberá os detalhes no seu e-mail em breve.
          </p>
          <Button asChild className="w-full bg-primary hover:bg-primary/90 text-white">
            <Link to="/">Voltar para a Home</Link>
          </Button>
        </div>
      </div>
    )
  }

  const imageUrl = product.image
    ? getFileUrl(product, product.image)
    : `https://img.usecurling.com/p/400/400?q=tech&color=gray&seed=${product.id}`

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      setSuccess(true)
      toast({
        title: 'Sucesso!',
        description: 'Seu pagamento foi aprovado.',
      })
    }, 1500)
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <nav className="flex items-center text-sm text-gray-500 mb-8 animate-fade-in">
          <Link to="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <Link
            to={`/produto/${product.id}`}
            className="hover:text-primary transition-colors truncate"
          >
            {product.name}
          </Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-secondary font-medium">Checkout</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 order-2 lg:order-1 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6 text-secondary">
                <Lock className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-bold">Pagamento Seguro</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Dados Pessoais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome Completo</Label>
                      <Input id="nome" required placeholder="João da Silva" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" type="email" required placeholder="joao@exemplo.com" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Pagamento</h3>
                  <div className="space-y-2">
                    <Label htmlFor="cartao">Número do Cartão</Label>
                    <div className="relative">
                      <Input
                        id="cartao"
                        required
                        placeholder="0000 0000 0000 0000"
                        className="pl-10"
                      />
                      <CreditCard className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vencimento">Validade</Label>
                      <Input id="vencimento" required placeholder="MM/AA" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input id="cvv" required placeholder="123" maxLength={4} />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-lg mt-4 bg-primary hover:bg-primary/90 text-white"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processando...' : 'Confirmar Compra'}
                </Button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-1 order-1 lg:order-2 animate-fade-in-down">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h3 className="font-bold text-lg text-secondary mb-4">Resumo do Pedido</h3>

              <div className="flex gap-4 mb-6">
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-medium text-secondary line-clamp-2">{product.name}</h4>
                  <p className="text-sm text-gray-500 mt-1">Plano vitalício</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      product.price,
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Taxas</span>
                  <span>R$ 0,00</span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between font-bold text-lg text-secondary mb-2">
                <span>Total</span>
                <span className="text-primary">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    product.price,
                  )}
                </span>
              </div>
              <p className="text-xs text-gray-500 text-center mt-4">
                Pagamento 100% seguro com criptografia de ponta a ponta.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
