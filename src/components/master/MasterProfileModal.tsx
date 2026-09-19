import React, { useState } from 'react'
import { ShieldAlert, User, Mail, Lock, KeyRound, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import pb from '@/lib/pocketbase/client'
import { toast } from '@/components/ui/use-toast'

interface MasterProfileModalProps {
  user: any
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export const MasterProfileModal: React.FC<MasterProfileModalProps> = ({
  user,
  open,
  onClose,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  React.useEffect(() => {
    if (user && open) {
      setName(user.name || '')
      setEmail(user.email || '')
      setPassword('')
      setPasswordConfirm('')
    }
  }, [user, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password && password.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A nova senha deve ter pelo menos 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    if (password && password !== passwordConfirm) {
      toast({
        title: 'Senhas não conferem',
        description: 'A confirmação de senha deve ser idêntica à nova senha.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
      }
      if (password) {
        payload.password = password
      }

      await pb.send(`/backend/v1/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      })

      // Se alterou dados da própria conta, atualiza token
      try {
        await pb.collection('users').authRefresh()
      } catch {
        /* intentionally ignored */
      }

      toast({
        title: 'Perfil Master atualizado!',
        description: 'Seus dados de acesso foram atualizados com sucesso.',
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar Master',
        description: err.message || 'Falha ao atualizar dados.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm">
              M
            </span>
            <DialogTitle>Meu Perfil Master</DialogTitle>
          </div>
          <DialogDescription>
            Edite seu nome de exibição, e-mail de login e altere sua senha padrão.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2 text-xs">
          <div>
            <label className="font-medium text-gray-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-500" />
              Nome de Exibição
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <div>
            <label className="font-medium text-gray-700 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-500" />
              E-mail de Login
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
              Alterar Senha de Acesso (Opcional)
            </span>

            <div className="space-y-2.5">
              <div>
                <label className="font-medium text-gray-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-gray-500" />
                  Nova Senha (mínimo 8 caracteres)
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Deixe em branco para não alterar"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="font-medium text-gray-700 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-gray-500" />
                  Confirmar Nova Senha
                </label>
                <Input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-800 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <strong>Segurança Máxima:</strong> Este usuário tem controle total sobre todas as
              instâncias de clientes e planos. Mantenha suas credenciais seguras.
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {submitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
