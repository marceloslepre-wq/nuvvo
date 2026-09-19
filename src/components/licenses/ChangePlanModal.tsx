import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plan, Tenant } from '@/types/tenant'
import { Check, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { changeTenantPlan } from '@/services/tenants'
import { toast } from '@/components/ui/use-toast'

interface ChangePlanModalProps {
  open: boolean
  onClose: () => void
  tenant: Tenant
  plans: Plan[]
  onSuccess: () => void
  currentUserName?: string
}

export const ChangePlanModal: React.FC<ChangePlanModalProps> = ({
  open,
  onClose,
  tenant,
  plans,
  onSuccess,
  currentUserName = 'Gestor',
}) => {
  const currentPlanId = tenant.plan || tenant.expand?.plan?.id
  const [selectedPlanId, setSelectedPlanId] = useState<string>(currentPlanId || '')
  const [loading, setLoading] = useState(false)

  React.useEffect(() => {
    if (open) {
      setSelectedPlanId(tenant.plan || tenant.expand?.plan?.id || '')
    }
  }, [open, tenant.plan, tenant.expand?.plan?.id])

  const activePlans = plans.filter((p) => p.status === 'active' && !p.is_master_exclusive)

  const handleConfirm = async () => {
    if (!selectedPlanId || selectedPlanId === currentPlanId) return
    const chosenPlan = plans.find((p) => p.id === selectedPlanId)
    if (!chosenPlan) return

    setLoading(true)
    try {
      await changeTenantPlan(tenant, chosenPlan, currentUserName)
      toast({
        title: 'Plano alterado com sucesso!',
        description: `Sua licença agora está no ${chosenPlan.name}.`,
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar plano',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const parseFeatures = (features: any): string[] => {
    if (!features) return []
    if (Array.isArray(features)) return features
    try {
      const parsed = JSON.parse(features)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">Mudar de Plano</DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Escolha o plano ideal para as necessidades de expansão da sua operação. A mudança
                entra em vigor imediatamente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-3">
          {activePlans.map((p) => {
            const isSelected = selectedPlanId === p.id
            const isCurrent = currentPlanId === p.id
            const features = parseFeatures(p.features)

            return (
              <div
                key={p.id}
                onClick={() => setSelectedPlanId(p.id)}
                className={`border rounded-xl p-4 cursor-pointer transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/20 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 text-base">{p.name}</h4>
                        {p.badge && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-slate-100 text-slate-700 border-slate-300"
                          >
                            {p.badge}
                          </Badge>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</p>
                      )}
                    </div>
                    {isCurrent ? (
                      <Badge className="bg-slate-200 text-slate-800 hover:bg-slate-200 text-[10px] border-none font-semibold shrink-0">
                        Plano Atual
                      </Badge>
                    ) : isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-gray-300 shrink-0" />
                    )}
                  </div>

                  <div className="my-3 pb-3 border-b border-gray-100">
                    <span className="text-2xl font-black text-gray-900">
                      R$ {p.price.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-xs text-gray-500 font-medium"> /mês</span>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600 mb-3">
                    <div className="flex items-center justify-between text-[11px] py-0.5">
                      <span className="text-gray-500">Limite de Usuários:</span>
                      <strong className="text-gray-800 font-semibold">
                        {p.user_limit ? `${p.user_limit} usuários` : 'Ilimitado'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px] py-0.5">
                      <span className="text-gray-500">Unidades / Produtos:</span>
                      <strong className="text-gray-800 font-semibold">
                        {p.unit_limit ? `${p.unit_limit} unidades` : 'Ilimitado'}
                      </strong>
                    </div>
                  </div>

                  {features.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-gray-50">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                        Recursos inclusos:
                      </span>
                      {features.slice(0, 4).map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="line-clamp-1">{f}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3">
                  <Button
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className={`w-full text-xs h-8 ${
                      isSelected
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    {isCurrent ? 'Plano Atual' : isSelected ? 'Selecionado' : 'Escolher este plano'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-start gap-2">
          <span className="font-semibold shrink-0">Nota:</span>
          <span>
            A transição para um novo plano preserva a vigência atual da sua licença e atualiza os
            limites de capacidade de imediato. A cobrança proporcional ou via fatura será processada
            conforme o ciclo normal da sua assinatura.
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t mt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={loading || !selectedPlanId || selectedPlanId === currentPlanId}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold text-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <ArrowRight className="w-3.5 h-3.5" />
                Confirmar Mudança de Plano
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
