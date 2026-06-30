import { getYouTubeEmbedUrl } from '@/lib/youtube'
import { cn } from '@/lib/utils'

interface VideoPreviewProps {
  url: string
  className?: string
}

export function VideoPreview({ url, className }: VideoPreviewProps) {
  const embedUrl = getYouTubeEmbedUrl(url)

  if (!url.trim()) return null

  if (!embedUrl) {
    return (
      <p className={cn('text-sm text-red-500 font-medium', className)}>Link de vídeo inválido</p>
    )
  }

  return (
    <div
      className={cn(
        'aspect-video w-full max-w-md rounded-lg overflow-hidden border border-gray-200 shadow-sm',
        className,
      )}
    >
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        frameBorder="0"
        title="Prévia do vídeo"
      />
    </div>
  )
}
