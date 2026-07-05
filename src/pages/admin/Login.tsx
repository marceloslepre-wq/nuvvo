import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isForgot, setIsForgot] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      toast({ title: 'Erro', description: 'E-mail ou senha inválidos.', variant: 'destructive' })
    } else {
      navigate('/admin/dashboard')
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast({ title: 'Atenção', description: 'Preencha o e-mail.' })
      return
    }
    setLoading(true)
    try {
      const res = await pb.send('/backend/v1/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      toast({
        title: 'Recuperação',
        description: res.temp_password
          ? `Senha temporária: ${res.temp_password}`
          : 'Se o e-mail existir, uma senha foi enviada.',
        duration: 10000,
      })
      setIsForgot(false)
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Falha ao solicitar recuperação.',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isForgot ? 'Recuperar Senha' : 'Login Administrativo'}</CardTitle>
          <CardDescription>
            {isForgot
              ? 'Informe seu e-mail para receber uma senha temporária.'
              : 'Acesse o painel para gerenciar a plataforma.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isForgot ? handleForgot : handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {!isForgot && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Senha</Label>
                  <button
                    type="button"
                    onClick={() => setIsForgot(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Aguarde...' : isForgot ? 'Solicitar' : 'Entrar'}
            </Button>
            {isForgot && (
              <Button
                type="button"
                variant="ghost"
                className="w-full mt-2"
                onClick={() => setIsForgot(false)}
              >
                Voltar ao Login
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
