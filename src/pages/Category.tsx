import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getFileUrl, Product } from '@/services/products'
import { useSelectedCity } from '@/hooks/use-selected-city'
import { useRealtime } from '@/hooks/use-realtime'
import { useTenant } from '@/contexts/tenant-context'
import pb from '@/lib/pocketbase/client'

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>()
  const { currentTenant, tenantBasePath } = useTenant()
  const { selectedCityId, setSelectedCityId } = useSelectedCity()
  const [products, setProducts] = useState<Product[]>([])
  const [category, setCategory] = useState<any>(null)
  const [rentalPrices, setRentalPrices] = useState<any[]>([])
  const [rentalPeriods, setRentalPeriods] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [variantDetails, setVariantDetails] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCategory = async () => {
      try {
        setLoading(true)
        const cat = await pb.collection('categories').getOne(id!)
        if (currentTenant && cat.tenant && cat.tenant !== currentTenant.id) {
          setCategory(null)
          return
        }
        setCategory(cat)

        const tenantFilter = currentTenant ? `tenant = '${currentTenant.id}'` : ''
        const [rPrices, rPeriods, locs, vDetails] = await Promise.all([
          pb
            .collection('product_rental_prices')
            .getFullList()
            .catch(() => []),
          pb
            .collection('rental_periods')
            .getFullList({ filter: tenantFilter, sort: 'order,days' })
            .catch(async () => {
              return pb
                .collection('rental_periods')
                .getFullList({ filter: tenantFilter, sort: 'name' })
                .catch(() => [])
            }),
          pb
            .collection('pickup_locations')
            .getFullList({ filter: tenantFilter })
            .catch(() => []),
          pb
            .collection('product_variant_details')
            .getFullList()
            .catch(() => []),
        ])
        setRentalPrices(rPrices)
        setRentalPeriods(rPeriods)
        setLocations(locs)
        setVariantDetails(vDetails)

        if (!selectedCityId || !currentTenant) {
          setProducts([])
          return
        }

        const prods = await pb.collection('products').getFullList({
          filter: `status='active' && tenant='${currentTenant.id}' && category='${id}' && available_locations~'${selectedCityId}'`,
          sort: 'order',
        })
        setProducts(prods as Product[])
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    if (id && currentTenant) loadCategory()
  }, [id, selectedCityId, currentTenant?.id])

  useRealtime('product_rental_prices', () => {
    pb.collection('product_rental_prices')
      .getFullList()
      .then(setRentalPrices)
      .catch(() => {})
  })

  useRealtime('product_variant_details', () => {
    pb.collection('product_variant_details')
      .getFullList()
      .then(setVariantDetails)
      .catch(() => {})
  })

  useRealtime('products', () => {
    if (id && currentTenant) {
      pb.collection('categories')
        .getOne(id)
        .then((cat) => {
          if (currentTenant && cat.tenant && cat.tenant !== currentTenant.id) return
          if (!selectedCityId) {
            setProducts([])
            return
          }
          pb.collection('products')
            .getFullList({
              filter: `status='active' && tenant='${currentTenant.id}' && category='${id}' && available_locations~'${selectedCityId}'`,
              sort: 'order',
            })
            .then((prods) => setProducts(prods as Product[]))
            .catch(() => {})
        })
        .catch(() => {})
    }
  })

  useRealtime('pickup_locations', () => {
    if (currentTenant) {
      pb.collection('pickup_locations')
        .getFullList({ filter: `tenant = '${currentTenant.id}'` })
        .then(setLocations)
        .catch(() => {})
    }
  })

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
          <Link to={tenantBasePath || '/'}>Voltar para a Home</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        <nav className="flex items-center text-sm text-gray-500 mb-8 animate-fade-in">
          <Link to={tenantBasePath || '/'} className="hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-secondary font-medium truncate">{category.name}</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-secondary mb-8">{category.name}</h1>

        {!selectedCityId ? (
          <div className="w-full py-16 px-6 text-center text-gray-500 col-span-full bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <MapPin className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold text-secondary mb-2">
              Onde você precisa do equipamento?
            </h3>
            <p className="text-base text-gray-600 max-w-md mx-auto mb-6">
              Selecione uma cidade para ver os produtos disponíveis.
            </p>
            <div className="w-full max-w-sm">
              <Select
                value={selectedCityId || '_none'}
                onValueChange={(v) => setSelectedCityId(v === '_none' ? '' : v)}
              >
                <SelectTrigger className="w-full h-12 text-base shadow-sm border-gray-300">
                  <SelectValue placeholder="Selecione sua cidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Selecione sua cidade</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
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
                    to={`${tenantBasePath || ''}/produto/${product.id}`}
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
                    <Link to={`${tenantBasePath || ''}/produto/${product.id}`}>
                      <h3 className="font-semibold text-lg text-secondary line-clamp-1 group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-gray-500 line-clamp-2 min-h-[40px]">
                      {stripHtml(product.description)}
                    </p>
                    <div className="text-xl font-bold text-secondary pt-2">
                      {(() => {
                        const hasRentalPeriods =
                          Array.isArray(product.rental_period) && product.rental_period.length > 0
                        if (hasRentalPeriods) {
                          const prices = rentalPrices.filter((prp) => prp.product === product.id)
                          if (prices.length === 0) return 'Sob consulta'
                          const minPrice = Math.min(...prices.map((prp) => prp.price))
                          const periodId = prices.find(
                            (prp) => prp.price === minPrice,
                          )?.rental_period
                          const periodName =
                            rentalPeriods.find((r) => r.id === periodId)?.name || 'período'
                          return (
                            <>
                              <span className="text-xs font-normal text-gray-500 mr-1">
                                A partir de
                              </span>
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(minPrice)}
                              <span className="text-sm font-normal text-gray-500 ml-1">
                                / {periodName}
                              </span>
                            </>
                          )
                        }

                        // Produto de VENDA / SERVIÇO:
                        // 1. Preços nas variações (campo numérico price ou texto em reference_code)
                        const pvds = variantDetails.filter((vd) => vd.product === product.id)
                        const numericPrices: number[] = []
                        for (const vd of pvds) {
                          if (vd.price !== undefined && vd.price !== null && vd.price > 0) {
                            numericPrices.push(Number(vd.price))
                          } else if (vd.reference_code) {
                            const cleaned = String(vd.reference_code)
                              .replace(/[^0-9,.-]/g, '')
                              .trim()
                            if (cleaned) {
                              let n = NaN
                              if (cleaned.includes(',')) {
                                n = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
                              } else {
                                n = parseFloat(cleaned)
                              }
                              if (!isNaN(n) && n > 0) numericPrices.push(n)
                            }
                          }
                        }

                        if (numericPrices.length > 0) {
                          const minVarPrice = Math.min(...numericPrices)
                          return (
                            <>
                              <span className="text-xs font-normal text-gray-500 mr-1">
                                A partir de
                              </span>
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(minVarPrice)}
                            </>
                          )
                        }

                        // 2. Preço único direto do produto
                        if (
                          product.price !== undefined &&
                          product.price !== null &&
                          product.price > 0
                        ) {
                          return new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(product.price)
                        }

                        return 'Sob consulta'
                      })()}
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        className="w-full bg-primary hover:bg-primary/90 text-white transition-colors"
                        asChild
                      >
                        <Link to={`${tenantBasePath || ''}/produto/${product.id}`}>Saiba Mais</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}

            {products.length === 0 && (
              <div className="col-span-full text-center py-20 text-gray-500 bg-white rounded-2xl shadow-sm">
                Nenhum produto encontrado nesta categoria para a cidade selecionada.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
