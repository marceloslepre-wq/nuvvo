import { useLocation, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('Erro 404: Usuário tentou acessar rota inexistente:', location.pathname)
  }, [location.pathname])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 animate-fade-in">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4 text-secondary">404</h1>
        <p className="text-xl text-gray-600 mb-8">Oops! Página não encontrada.</p>
        <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white">
          <Link to="/">Voltar para o Início</Link>
        </Button>
      </div>
    </div>
  )
}

export default NotFound
