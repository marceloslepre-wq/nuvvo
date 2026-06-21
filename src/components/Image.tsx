import { useState, useEffect, useRef } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string
  lazy?: boolean
  containerClassName?: string
}

export function Image({
  src,
  alt,
  className,
  fallbackSrc = 'https://img.usecurling.com/p/800/800?q=placeholder&color=gray',
  lazy = true,
  containerClassName,
  ...props
}: ImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [inView, setInView] = useState(!lazy)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!lazy) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [lazy])

  const currentSrc = hasError ? fallbackSrc : inView ? src : undefined

  return (
    <div
      className={cn(
        'relative overflow-hidden flex items-center justify-center',
        containerClassName,
      )}
    >
      {(!isLoaded || !inView) && !hasError && (
        <Skeleton className="absolute inset-0 w-full h-full z-10" />
      )}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300 w-full h-full object-cover',
          !isLoaded && !hasError ? 'opacity-0' : 'opacity-100',
          className,
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true)
          setIsLoaded(true)
        }}
        {...props}
      />
    </div>
  )
}
