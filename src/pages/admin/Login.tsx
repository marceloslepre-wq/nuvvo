import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import nuvvoLogo from '@/assets/logomarca-nuvvo-87c9b.png'
import { isNuvvoOfficialHost } from '@/types/tenant'

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
      // Todos os usuários (inclusive Master) entram no painel gerencial normal do sistema
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

  const isNuvvo = isNuvvoOfficialHost()

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg border border-slate-200">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <div className="h-12 px-3 py-1.5 rounded-xl bg-slate-950 flex items-center justify-center shadow-sm">
              <img src={nuvvoLogo} alt="Nuvvo" className="h-8 w-auto object-contain" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">
            {isForgot ? 'Recuperar Senha' : isNuvvo ? 'Painel Nuvvo' : 'Login Administrativo'}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            {isForgot
              ? 'Informe seu e-mail para receber uma senha temporária.'
              : isNuvvo
                ? 'Acesse com suas credenciais para gerenciar sua plataforma.'
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
