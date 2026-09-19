import React, { useState } from 'react'
import { Link2, Copy, Check, Send, Mail, ExternalLink, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { Plan } from '@/types/tenant'

interface OnboardingLinkGeneratorProps {
  plans: Plan[]
}

export const OnboardingLinkGenerator: React.FC<OnboardingLinkGeneratorProps> = ({ plans }) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('none')
  const [copied, setCopied] = useState(false)

  // Monta URL pública /cadastro
  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://aluguelhospitalhome.sholver.com.br'
  const generatedUrl =
    selectedPlanId && selectedPlanId !== 'none'
      ? `${baseUrl}/cadastro?plano=${selectedPlanId}`
      : `${baseUrl}/cadastro`

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl)
    setCopied(true)
    toast({
      title: 'Link copiado!',
      description: 'URL de cadastro copiada para a área de transferência.',
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Olá! Segue seu link de acesso exclusivo para criar a conta da sua locadora com 15 dias de teste grátis:\n${generatedUrl}`,
    )
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
  }

  const handleEmailShare = () => {
    const subject = encodeURIComponent('Convite para cadastro na plataforma de locação')
    const body = encodeURIComponent(
      `Olá,\n\nVocê foi convidado para ativar sua licença com 15 dias de teste grátis.\nAcesse o link abaixo para concluir seu cadastro:\n\n${generatedUrl}\n\nAtenciosamente,\nEquipe Master`,
    )
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }

  const activePlans = plans.filter((p) => p.status === 'active' && !p.is_master_exclusive)

  return (
    <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-xl p-6 text-white shadow-lg border border-blue-600/30">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
            <Link2 className="w-5 h-5 text-blue-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Gerador de Link de Primeiro Cadastro</h2>
              <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                Página Pública /cadastro
              </span>
            </div>
            <p className="text-xs text-blue-100/80 mt-0.5">
              Gere links personalizados de convite para onboarding com pré-seleção de plano ativo e
              envie diretamente por WhatsApp, e-mail ou copie manualmente.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/15 border border-amber-300/30 text-amber-200 text-xs font-semibold self-start md:self-auto">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>15 dias de teste grátis</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-white/5 backdrop-blur-md p-4 rounded-lg border border-white/10">
        {/* Plano Pré-selecionado */}
        <div className="lg:col-span-5 space-y-1.5">
          <label className="text-xs font-medium text-blue-100 flex items-center gap-1.5">
            <span>Plano Pré-selecionado (Opcional)</span>
          </label>
          <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
            <SelectTrigger className="bg-white/95 text-gray-900 border-none h-10 text-xs font-medium focus:ring-2 focus:ring-blue-400">
              <SelectValue placeholder="Nenhum plano específico (cliente escolhe na tela)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">
                Nenhum plano específico (cliente escolhe na tela)
              </SelectItem>
              {activePlans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id} className="text-xs">
                  {plan.name} — R$ {plan.price.toFixed(2).replace('.', ',')}/mês
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-blue-200/70">
            O cliente poderá visualizar e escolher qualquer plano ativo no formulário.
          </p>
        </div>

        {/* Link Gerado para Envio */}
        <div className="lg:col-span-7 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-blue-100">
            <span className="flex items-center gap-1">
              <Link2 className="w-3.5 h-3.5" />
              Link Gerado para Envio
            </span>
            <a
              href={generatedUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-200 hover:text-white underline inline-flex items-center gap-1 text-[11px]"
            >
              Abrir página
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 bg-white/95 text-gray-800 text-xs font-mono px-3 py-2.5 rounded-md truncate select-all flex items-center">
              {generatedUrl}
            </div>
            <Button
              onClick={handleCopy}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 h-10 gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Compartilhamento Direto */}
      <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="text-blue-100/90 flex items-center gap-1.5">
          <Send className="w-3.5 h-3.5 text-blue-300" />
          <span>
            Compartilhamento Direto: envie a mensagem de convite com o link de cadastro em apenas 1
            clique:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={handleWhatsAppShare}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 gap-1.5 rounded-md"
          >
            <Send className="w-3.5 h-3.5" />
            WhatsApp
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleEmailShare}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-8 px-3 gap-1.5 rounded-md"
          >
            <Mail className="w-3.5 h-3.5" />
            E-mail
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-8 px-3 gap-1.5 rounded-md"
          >
            <Copy className="w-3.5 h-3.5" />
            Copiar Link
          </Button>
        </div>
      </div>
    </div>
  )
}
