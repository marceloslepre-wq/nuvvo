export function getYouTubeEmbedUrl(rawUrl: string): string | null {
  if (!rawUrl) return null
  const url = rawUrl.trim()
  if (!url) return null
  try {
    const normalized =
      url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`
    const urlObj = new URL(normalized)
    const host = urlObj.hostname.replace(/^www\./, '').toLowerCase()

    if (host === 'youtu.be') {
      const id = urlObj.pathname.slice(1).split('/')[0]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const shortsMatch = urlObj.pathname.match(/\/shorts\/([^/?#]+)/)
      if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`

      const embedMatch = urlObj.pathname.match(/\/embed\/([^/?#]+)/)
      if (embedMatch) return `https://www.youtube.com/embed/${embedMatch[1]}`

      const v = urlObj.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`

      const liveMatch = urlObj.pathname.match(/\/live\/([^/?#]+)/)
      if (liveMatch) return `https://www.youtube.com/embed/${liveMatch[1]}`
    }

    if (host.includes('loom.com') && urlObj.pathname.includes('/share/')) {
      return url.replace('/share/', '/embed/')
    }

    if (host.includes('vimeo.com')) {
      const id = urlObj.pathname.split('/').filter(Boolean)[0]
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`
    }

    return null
  } catch {
    return null
  }
}

export function sanitizeVideoUrl(rawUrl: string): string {
  if (!rawUrl) return ''
  const url = rawUrl.trim()
  if (!url) return ''
  const embed = getYouTubeEmbedUrl(url)
  return embed || url
}

export function isValidVideoUrl(rawUrl: string): boolean {
  return !!getYouTubeEmbedUrl(rawUrl)
}
