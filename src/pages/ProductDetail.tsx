import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { trackWhatsAppConversion, buildWhatsAppLink } from '@/lib/whatsapp'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { getProduct, getFileUrl, Product } from '@/services/products'
import { useTenant } from '@/contexts/tenant-context'
import pb from '@/lib/pocketbase/client'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Image } from '@/components/Image'
import { getYouTubeEmbedUrl } from '@/lib/youtube'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const { currentTenant, tenantBasePath } = useTenant()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  const [activeMedia, setActiveMedia] = useState<'image' | 'video'>('image')
  const [mainViewerItem, setMainViewerItem] = useState<{
    type: 'image' | 'video'
    url: string
  } | null>(null)

  const [productMedia, setProductMedia] = useState<any[]>([])
  const [productVariantDetails, setProductVariantDetails] = useState<any[]>([])
  const [rentalPrices, setRentalPrices] = useState<any[]>([])
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null)
  const [selectedRentalPeriod, setSelectedRentalPeriod] = useState<string | null>(null)
  const [siteSettings, setSiteSettings] = useState<any>(null)

  useEffect(() => {
    const loadProduct = async () => {
      if (!id || !currentTenant) return
      try {
        setLoading(true)
        const p = await getProduct(id)
        // Se o produto pertencer a outro tenant, bloqueia exibição
        if (p.tenant && p.tenant !== currentTenant.id) {
          setProduct(null)
          return
        }
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
        try {
          const prp = await pb
            .collection('product_rental_prices')
            .getFullList({ filter: `product='${id}'` })
          setRentalPrices(prp)
        } catch (e) {
          setRentalPrices([])
        }
        try {
          const settings = await pb
            .collection('site_settings')
            .getFirstListItem(`tenant = '${currentTenant.id}'`)
          setSiteSettings(settings)
        } catch (e) {
          // Se o tenant atual não possuir site_settings, usa dados do próprio tenant ou null
          setSiteSettings({
            phone: currentTenant.phone || '',
            email: currentTenant.email || '',
          })
        }
        setSelectedVariation(null)
        setMainViewerItem(null)
      } catch (error) {
        console.error('Product not found', error)
        setProduct(null)
      } finally {
        setLoading(false)
      }
    }
    loadProduct()
  }, [id, currentTenant?.id])

  const selectedMediaRecords = selectedVariation
    ? productMedia.filter((m) => m.variation === selectedVariation && m.file)
    : []
  const hasVariationMedia = selectedMediaRecords.length > 0
  const primaryVariationMedia = hasVariationMedia ? selectedMediaRecords[0] : null

  useEffect(() => {
    setMainViewerItem(null)
    if (primaryVariationMedia) {
      const isVideo = primaryVariationMedia.file.match(/\.(mp4|webm|ogg)$/i)
      setActiveMedia(isVideo ? 'video' : 'image')
    } else {
      setActiveMedia('image')
    }
  }, [selectedVariation, primaryVariationMedia])

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
          <Link to={tenantBasePath || '/'}>Voltar para a Home</Link>
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

  const isRentalMode = availableRentalPeriods.length > 0

  const currentVariantDetail = selectedVariation
    ? productVariantDetails.find((vd) => vd.variation === selectedVariation)
    : null

  const currentPriceRecord = selectedRentalPeriod
    ? rentalPrices.find((rp) => rp.rental_period === selectedRentalPeriod)
    : null

  // Cálculo do preço:
  // Se for locação: usa tabela de preços por prazo
  // Se for venda/serviço:
  //   1) Se houver variação selecionada e tiver preço no reference_code, usa ele.
  //   2) Senão se o produto tiver price base > 0, usa ele.
  //   3) Senão pega o menor preço numérico entre as variações cadastradas.
  const parseNumericPrice = (str: string | undefined | null) => {
    if (!str) return null
    const cleaned = String(str)
      .replace(/[^0-9,.-]/g, '')
      .trim()
    if (!cleaned) return null
    let n = NaN
    if (cleaned.includes(',')) {
      n = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
    } else {
      n = parseFloat(cleaned)
    }
    return !isNaN(n) && n > 0 ? n : null
  }

  let displayPrice = 0
  if (isRentalMode) {
    displayPrice = currentPriceRecord
      ? currentPriceRecord.price
      : rentalPrices.length > 0
        ? Math.min(...rentalPrices.map((r) => r.price))
        : 0
  } else {
    // Venda / Serviço
    const selectedVarPrice = parseNumericPrice(currentVariantDetail?.reference_code)
    if (selectedVarPrice !== null) {
      displayPrice = selectedVarPrice
    } else if (product.price !== undefined && product.price !== null && product.price > 0) {
      displayPrice = product.price
    } else {
      const allVarPrices = productVariantDetails
        .map((vd) => parseNumericPrice(vd.reference_code))
        .filter((n): n is number => n !== null)
      if (allVarPrices.length > 0) {
        displayPrice = Math.min(...allVarPrices)
      } else {
        displayPrice = 0
      }
    }
  }

  const selectedPeriodObj = availableRentalPeriods.find(
    (rp: any) =>
      rp.id ===
      (selectedRentalPeriod || rentalPrices.find((r) => r.price === displayPrice)?.rental_period),
  )

  const canRent =
    (!availableVariations.length || selectedVariation) && (!isRentalMode || selectedRentalPeriod)

  let imageUrl = product.image ? getFileUrl(product, product.image) : ''
  let videoUrl = product.video ? getFileUrl(product, product.video) : ''

  if (primaryVariationMedia) {
    const isVideo = primaryVariationMedia.file.match(/\.(mp4|webm|ogg)$/i)
    if (isVideo) {
      videoUrl = pb.files.getURL(primaryVariationMedia, primaryVariationMedia.file)
    } else {
      imageUrl = pb.files.getURL(primaryVariationMedia, primaryVariationMedia.file)
    }
  }

  if (mainViewerItem) {
    if (mainViewerItem.type === 'video') {
      videoUrl = mainViewerItem.url
      imageUrl = ''
    } else {
      imageUrl = mainViewerItem.url
      videoUrl = ''
    }
  }

  const galleryItems: { type: 'image' | 'video'; url: string; id: string }[] = []

  if (hasVariationMedia) {
    selectedMediaRecords.forEach((m) => {
      const isVideo = m.file.match(/\.(mp4|webm|ogg)$/i)
      galleryItems.push({
        type: isVideo ? 'video' : 'image',
        url: pb.files.getURL(m, m.file),
        id: m.id,
      })
    })
  } else {
    if (product.image) {
      galleryItems.push({ type: 'image', url: getFileUrl(product, product.image), id: 'main-img' })
    }
    if (product.video) {
      galleryItems.push({ type: 'video', url: getFileUrl(product, product.video), id: 'main-vid' })
    }
    const generalMedia = productMedia.filter((m) => !m.variation && m.file)
    generalMedia.forEach((m) => {
      const isVideo = m.file.match(/\.(mp4|webm|ogg)$/i)
      galleryItems.push({
        type: isVideo ? 'video' : 'image',
        url: pb.files.getURL(m, m.file),
        id: m.id,
      })
    })
  }

  const handleRentClick = () => {
    if (!canRent) return

    trackWhatsAppConversion('product_rent_click')

    const phoneRaw = siteSettings?.phone?.trim() || currentTenant?.phone?.trim() || ''

    const productRef = currentVariantDetail?.reference_code || product.reference || ''
    const periodName = selectedPeriodObj?.name || ''
    const pageUrl = window.location.href
    const mainImageUrl = imageUrl || (product.image ? getFileUrl(product, product.image) : '')
    const variationName = availableVariations.find((v: any) => v.id === selectedVariation)?.name

    let text = ''
    if (isRentalMode) {
      text = `Olá! Gostaria de solicitar a locação do seguinte equipamento:\nProduto: ${product.name}\n`
      if (variationName) text += `Variação: ${variationName}\n`
      if (productRef) text += `Referência: ${productRef}\n`
      if (periodName) text += `Período: ${periodName}\n`
    } else {
      text = `Olá! Gostaria de mais informações sobre:\nProduto/Serviço: ${product.name}\n`
      if (variationName) text += `Opção/Variação: ${variationName}\n`
      if (productRef) text += `Detalhes/Valor: ${productRef}\n`
      if (displayPrice > 0) {
        text += `Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(displayPrice)}\n`
      }
    }
    text += `Link da página: ${pageUrl}\n`
    if (mainImageUrl) text += `Link da imagem: ${mainImageUrl}`

    const waUrl = buildWhatsAppLink(phoneRaw, text)
    if (waUrl) {
      window.open(waUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const embedUrl = product.external_link ? getYouTubeEmbedUrl(product.external_link) : null

  return (
    <div className="bg-white min-h-screen py-8">
      <div className="container mx-auto px-4">
        <nav className="flex items-center text-sm text-gray-500 mb-8 animate-fade-in">
          <Link to={tenantBasePath || '/'} className="hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <Link
            to={`${tenantBasePath || ''}/#destaques`}
            className="hover:text-primary transition-colors"
          >
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
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 relative">
                  {imageUrl && <link rel="preload" href={imageUrl} as="image" />}
                  <Image
                    src={imageUrl || ''}
                    alt={product.name}
                    lazy={false}
                    loading="eager"
                    className="w-full h-full object-cover"
                    key={imageUrl}
                  />
                </div>
              </TabsContent>

              <TabsContent value="video" className="mt-0">
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                  {videoUrl ? (
                    <video
                      src={videoUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-cover bg-black animate-fade-in"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100" />
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {galleryItems.length > 1 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Galeria</h3>
                <Carousel className="w-full">
                  <CarouselContent className="-ml-2 md:-ml-4">
                    {galleryItems.map((item, idx) => (
                      <CarouselItem
                        key={item.id + idx}
                        className="pl-2 md:pl-4 basis-1/3 md:basis-1/4"
                      >
                        <div
                          className="aspect-square rounded-xl overflow-hidden bg-gray-100 border-2 border-transparent hover:border-primary transition-colors cursor-pointer"
                          onClick={() => {
                            setMainViewerItem(item)
                            setActiveMedia(item.type)
                          }}
                        >
                          {item.type === 'video' ? (
                            <video
                              src={item.url}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                            />
                          ) : (
                            <Image
                              src={item.url}
                              className="w-full h-full object-cover"
                              alt=""
                              lazy={true}
                            />
                          )}
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </Carousel>
              </div>
            )}
          </div>

          <div className="flex flex-col animate-fade-in-up">
            <h1 className="text-3xl md:text-4xl font-bold text-secondary mb-2">{product.name}</h1>

            <div className="text-4xl font-bold text-primary mb-6">
              {displayPrice > 0
                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    displayPrice,
                  )
                : 'Sob consulta'}
              {displayPrice > 0 && isRentalMode && selectedPeriodObj && (
                <span className="text-sm text-gray-500 font-normal block mt-1">
                  / {selectedPeriodObj.name}
                </span>
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
              <div
                className="prose prose-sm max-w-none text-gray-600 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
              {(() => {
                const refVal = currentVariantDetail?.reference_code || product.reference
                if (!refVal) return null
                const label = isRentalMode ? 'Referência' : 'Opção / Preço'
                return (
                  <p className="text-sm text-gray-500 mt-4 font-medium tracking-wide">
                    {label}: {refVal}
                  </p>
                )
              })()}
            </div>

            <Separator className="mb-8" />

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button
                size="lg"
                className="flex-1 h-12 text-base bg-[#25D366] hover:bg-[#1ebe5d] text-white active:scale-95 transition-transform shadow-md"
                disabled={!canRent}
                onClick={handleRentClick}
              >
                <WhatsAppIcon className="w-5 h-5 mr-2" />
                {isRentalMode ? 'Continuar pelo WhatsApp' : 'Solicitar pelo WhatsApp'}
              </Button>
            </div>
          </div>
        </div>

        {(product.external_link || product.detailed_description) && (
          <div className="pt-12 border-t border-gray-200 animate-fade-in mb-12">
            {embedUrl && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-secondary mb-8">Vídeo Demonstrativo</h2>
                <div className="aspect-video w-full max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-lg border border-gray-100">
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allowFullScreen
                    frameBorder="0"
                  ></iframe>
                </div>
              </div>
            )}

            {product.detailed_description && (
              <div>
                <h2 className="text-2xl font-bold text-secondary mb-8">Descrição Detalhada</h2>
                <div
                  className="prose max-w-none text-gray-600"
                  dangerouslySetInnerHTML={{ __html: product.detailed_description }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
