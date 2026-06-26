import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'

const SLUG_MAP: Record<string, { title: string; field: string }> = {
  'sobre-nos': { title: 'Sobre Nós', field: 'about_us' },
  termos: { title: 'Termos de Serviço', field: 'terms' },
  privacidade: { title: 'Política de Privacidade', field: 'privacy' },
  trocas: { title: 'Trocas e Devoluções', field: 'returns' },
}

export default function ContentPage() {
  const { slug } = useParams()
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const pageInfo = slug ? SLUG_MAP[slug] : null

  useEffect(() => {
    if (!pageInfo) {
      setLoading(false)
      return
    }

    pb.collection('site_settings')
      .getFirstListItem('')
      .then((settings) => {
        setContent(settings[pageInfo.field] || '')
      })
      .catch(() => {
        setContent('')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [pageInfo])

  if (!pageInfo) return <Navigate to="/404" />

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16 min-h-[50vh]">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">{pageInfo.title}</h1>
        {content ? (
          <div
            className="prose prose-gray max-w-none prose-headings:font-bold prose-a:text-primary prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <p className="text-gray-500 italic">Conteúdo ainda não disponível.</p>
        )}
      </div>
    </div>
  )
}
