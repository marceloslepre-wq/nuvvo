import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { getProduct, getFileUrl, Product } from '@/services/products'
import pb from '@/lib/pocketbase/client'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  const [activeMedia, setActiveMedia] = useState<'image' | 'video'>('image')

  const [productMedia, setProductMedia] = useState<any[]>([])
  const [productVariantDetails, setProductVariantDetails] = useState<any[]>([])
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null)
  const [selectedRentalPeriod, setSelectedRentalPeriod] = useState<string | null>(null)

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return
      try {
        setLoading(true)
        const p = await getProduct(id)
        setProduct(p)
        setActiveMedia('image')
        setSelectedRentalPeriod(null)

        try {
          const pm = await pb
            .collection('product_media')
            .getFullList({ filter: `product='${id}'`, expand: 'variation' })
          setProductMedia(pm)
        } catch (e) {
          setProductMedia([])
        }
        try {
          const pvd = await pb
            .collection('product_variant_details')
            .getFullList({ filter: `product='${id}'` })
          setProductVariantDetails(pvd)
        } catch (e) {
          setProductVariantDetails([])
        }
        setSelectedVariation(null)
      } catch (error) {
        console.error('Product not found', error)
        setProduct(null)
      } finally {
        setLoading(false)
      }
    }
    loadProduct()
  }, [id])

  const selectedMediaRecord = selectedVariation
    ? productMedia.find((m) => m.variation === selectedVariation && m.file)
    : null

  useEffect(() => {
    if (selectedMediaRecord) {
      const isVideo = selectedMediaRecord.file.match(/\.(mp4|webm|ogg)$/i)
      setActiveMedia(isVideo ? 'video' : 'image')
    } else if (selectedVariation) {
      setActiveMedia('image')
    }
  }, [selectedVariation, selectedMediaRecord])

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

  const availableVariations = product.expand?.variations || []
  const availableRentalPeriods = product.expand?.rental_period
    ? Array.isArray(product.expand.rental_period)
      ? product.expand.rental_period
      : [product.expand.rental_period]
    : []

  const currentVariantDetail = selectedVariation
    ? productVariantDetails.find((vd) => vd.variation === selectedVariation)
    : null

  const selectedPeriodObj = availableRentalPeriods.find((rp: any) => rp.id === selectedRentalPeriod)
  const displayPrice = selectedPeriodObj
    ? Math.ceil(product.price * selectedPeriodObj.days)
    : product.price

  const canRent =
    (!availableVariations.length || selectedVariation) &&
    (!availableRentalPeriods.length || selectedRentalPeriod)

  let imageUrl = product.image
    ? getFileUrl(product, product.image)
    : `https://img.usecurling.com/p/800/800?q=tech&color=gray&seed=${product.id}`
  let videoUrl = product.video ? getFileUrl(product, product.video) : ''

  if (selectedMediaRecord) {
    const isVideo = selectedMediaRecord.file.match(/\.(mp4|webm|ogg)$/i)
    if (isVideo) {
      videoUrl = pb.files.getURL(selectedMediaRecord, selectedMediaRecord.file)
    } else {
      imageUrl = pb.files.getURL(selectedMediaRecord, selectedMediaRecord.file)
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
            <Tabs
              defaultValue="image"
              value={activeMedia}
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
            <h1 className="text-3xl md:text-4xl font-bold text-secondary mb-2">{product.name}</h1>

            <div className="text-4xl font-bold text-primary mb-6">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                displayPrice,
              )}
              {!selectedPeriodObj && (
                <span className="text-sm text-gray-500 font-normal block mt-1">por diária</span>
              )}
            </div>

            {availableVariations.length > 0 && (
              <div className="mb-8 animate-fade-in">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Selecione uma opção:</h3>
                <div className="flex flex-wrap gap-2">
                  {availableVariations.map((v: any) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariation(selectedVariation === v.id ? null : v.id)}
                      className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                        selectedVariation === v.id
                          ? 'bg-primary border-primary text-white shadow-md'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableRentalPeriods.length > 0 && (
              <div className="mb-8 animate-fade-in">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Prazo de Locação:</h3>
                <div className="flex flex-wrap gap-2">
                  {availableRentalPeriods.map((rp: any) => (
                    <button
                      key={rp.id}
                      onClick={() =>
                        setSelectedRentalPeriod(selectedRentalPeriod === rp.id ? null : rp.id)
                      }
                      className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                        selectedRentalPeriod === rp.id
                          ? 'bg-primary border-primary text-white shadow-md'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
                      }`}
                    >
                      {rp.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div id="product-description" className="scroll-mt-24 mb-8">
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
              {(currentVariantDetail?.reference_code || product.reference) && (
                <p className="text-sm text-gray-500 mt-4 font-medium tracking-wide">
                  Referência: {currentVariantDetail?.reference_code || product.reference}
                </p>
              )}
            </div>

            <Separator className="mb-8" />

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button
                size="lg"
                className="flex-1 h-12 text-base bg-primary hover:bg-primary/90 text-white active:scale-95 transition-transform shadow-md"
                disabled={!canRent}
                asChild={!!canRent}
              >
                {canRent ? (
                  <Link to={`/produto/${product.id}/compra`}>
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Alugue Agora
                  </Link>
                ) : (
                  <span>
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Alugue Agora
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {product.detailed_description && (
          <div className="pt-12 border-t border-gray-200 animate-fade-in mb-12">
            <h2 className="text-2xl font-bold text-secondary mb-8">Descrição Detalhada</h2>
            <div
              className="prose max-w-none text-gray-600"
              dangerouslySetInnerHTML={{ __html: product.detailed_description }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
