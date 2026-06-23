import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getFileUrl, Product } from '@/services/products'
import pb from '@/lib/pocketbase/client'

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>()
  const [products, setProducts] = useState<Product[]>([])
  const [category, setCategory] = useState<any>(null)
  const [rentalPrices, setRentalPrices] = useState<any[]>([])
  const [rentalPeriods, setRentalPeriods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCategory = async () => {
      try {
        setLoading(true)
        const cat = await pb.collection('categories').getOne(id!)
        setCategory(cat)

        const [prods, rPrices, rPeriods] = await Promise.all([
          pb.collection('products').getFullList({
            filter: `status='active' && category='${id}'`,
            sort: 'order',
          }),
          pb.collection('product_rental_prices').getFullList(),
          pb.collection('rental_periods').getFullList(),
        ])

        setProducts(prods as Product[])
        setRentalPrices(rPrices)
        setRentalPeriods(rPeriods)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    if (id) loadCategory()
  }, [id])

  const stripHtml = (html: string) => {
    if (!html) return ''
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-500 animate-fade-in">Carregando categoria...</div>
    )
  }

  if (!category) {
    return (
      <div className="container mx-auto py-20 text-center animate-fade-in">
        <h2 className="text-2xl font-bold mb-4 text-secondary">Categoria não encontrada</h2>
        <Button asChild>
          <Link to="/">Voltar para a Home</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        <nav className="flex items-center text-sm text-gray-500 mb-8 animate-fade-in">
          <Link to="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-secondary font-medium truncate">{category.name}</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-secondary mb-8">{category.name}</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            const imageUrl = product.image
              ? getFileUrl(product, product.image)
              : `https://img.usecurling.com/p/600/600?q=tech&color=gray&seed=${product.id}`
            const videoUrl = product.video ? getFileUrl(product, product.video) : null

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 group"
              >
                <Link
                  to={`/produto/${product.id}`}
                  className="block overflow-hidden rounded-xl mb-4 bg-gray-100 relative"
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
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    )}
                  </div>
                </Link>
                <div className="space-y-2">
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

                  <div className="flex gap-2 pt-4">
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
            <div className="col-span-full text-center py-20 text-gray-500 bg-white rounded-2xl shadow-sm">
              Nenhum produto encontrado nesta categoria no momento.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
