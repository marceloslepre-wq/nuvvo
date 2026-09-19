import React from 'react'
import {
  AlertTriangle,
  Clock,
  ShieldCheck,
  Send,
  Building2,
  Mail,
  ExternalLink,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tenant } from '@/types/tenant'

interface TenantBlockedScreenProps {
  tenant: Tenant
  reason?: string | null
}

export const TenantBlockedScreen: React.FC<TenantBlockedScreenProps> = ({
  tenant,
  reason = 'Licença pendente de renovação',
}) => {
  const masterWhatsApp = '5527999046961'
  const supportEmail = 'marceloslepre@gmail.com'

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Olá! Sou da locadora ${tenant.name} (${tenant.slug}) e gostaria de renovar a assinatura da nossa licença na plataforma.`,
    )
    window.open(`https://api.whatsapp.com/send?phone=${masterWhatsApp}&text=${text}`, '_blank')
  }

  const handleEmail = () => {
    const subject = encodeURIComponent(`Renovação de Licença - ${tenant.name}`)
    const body = encodeURIComponent(
      `Olá Equipe Master,\n\nSolicitamos a renovação da licença da locadora ${tenant.name} (ID: ${tenant.id}).\n\nAtenciosamente,\n${tenant.email || tenant.name}`,
    )
    window.open(`mailto:${supportEmail}?subject=${subject}&body=${body}`, '_blank')
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR')
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800/90 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
            Acesso Temporariamente Suspenso
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Hora de Renovar sua Licença
          </h1>
          <p className="text-xs text-slate-300">
            Olá, equipe da <strong>{tenant.name}</strong>. O período de validade do seu plano
            encerrou em <strong>{formatDate(tenant.expiration_date)}</strong>.
          </p>
        </div>

        {/* Quadro informativo de segurança de dados */}
        <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 text-left space-y-2.5 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Seus dados continuam 100% seguros</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Nenhum produto, configuração ou foto foi excluído. Assim que a renovação for confirmada
            pelo administrador Master, seu acesso será reativado instantaneamente com tudo pronto.
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={handleWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 text-xs gap-2 shadow-lg shadow-emerald-900/30"
          >
            <Send className="w-4 h-4" />
            Falar no WhatsApp para Renovar
          </Button>

          <Button
            variant="outline"
            onClick={handleEmail}
            className="w-full bg-slate-700/60 hover:bg-slate-700 text-slate-200 border-slate-600 font-medium h-10 text-xs gap-2"
          >
            <Mail className="w-4 h-4" />
            Contatar por E-mail
          </Button>
        </div>

        <div className="pt-4 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          <span>Plataforma Master Multi-Tenant</span>
        </div>
      </div>
    </div>
  )
}
