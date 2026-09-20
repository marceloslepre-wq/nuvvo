import React, { useState } from 'react'
import { Calendar, Layers, Sliders, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tenant, Plan, PlanStatus, WhatsAppStatus } from '@/types/tenant'
import { updateTenant } from '@/services/tenants'
import { toast } from '@/components/ui/use-toast'

export type EditModalType = 'limits' | 'expiration' | 'plan' | 'status' | 'general'

interface EditLicenseModalProps {
  tenant: Tenant | null
  plans: Plan[]
  type: EditModalType | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export const EditLicenseModal: React.FC<EditLicenseModalProps> = ({
  tenant,
  plans,
  type,
  open,
  onClose,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [planId, setPlanId] = useState('')
  const [planStatus, setPlanStatus] = useState<PlanStatus>('active')
  const [whatsAppStatus, setWhatsAppStatus] = useState<WhatsAppStatus>('disconnected')
  const [expirationDate, setExpirationDate] = useState('')
  const [effectiveValue, setEffectiveValue] = useState<number>(0)
  const [effectiveProductLimit, setEffectiveProductLimit] = useState<number>(200)

  React.useEffect(() => {
    if (tenant && open) {
      setName(tenant.name || '')
      setSlug(tenant.slug || '')
      setPhone(tenant.phone || '')
      setEmail(tenant.email || '')
      setCnpj(tenant.document_cnpj || '')
      setPlanId(tenant.plan || '')
      setPlanStatus(tenant.plan_status || 'active')
      setWhatsAppStatus(tenant.whatsapp_status || 'disconnected')
      setEffectiveValue(tenant.effective_value ?? 0)
      setEffectiveProductLimit(tenant.effective_product_limit ?? tenant.effective_user_limit ?? 200)

      if (tenant.expiration_date) {
        // Formato para input type="date" YYYY-MM-DD
        const d = new Date(tenant.expiration_date)
        setExpirationDate(d.toISOString().split('T')[0])
      } else {
        setExpirationDate('')
      }
    }
  }, [tenant, open, type])

  if (!tenant || !type) return null

  const handlePlanChange = (newPlanId: string) => {
    setPlanId(newPlanId)
    const sel = plans.find((p) => p.id === newPlanId)
    if (sel) {
      setEffectiveValue(sel.price ?? 0)
      setEffectiveProductLimit(sel.product_limit ?? sel.user_limit ?? 200)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const payload: Partial<Tenant> = {}

      if (type === 'limits') {
        payload.effective_unit_limit = 0
        payload.effective_product_limit = Number(effectiveProductLimit)
        payload.effective_user_limit = Number(effectiveProductLimit)
        payload.effective_value = Number(effectiveValue)
      } else if (type === 'expiration') {
        if (expirationDate) {
          payload.expiration_date = new Date(expirationDate + 'T23:59:59.000Z').toISOString()
        }
      } else if (type === 'plan') {
        payload.plan = planId
        payload.effective_value = Number(effectiveValue)
        payload.effective_unit_limit = 0
        payload.effective_product_limit = Number(effectiveProductLimit)
        payload.effective_user_limit = Number(effectiveProductLimit)
      } else if (type === 'status') {
        payload.plan_status = planStatus
      } else if (type === 'general') {
        payload.name = name
        payload.slug = slug
        payload.phone = phone
        payload.email = email
        payload.document_cnpj = cnpj
        payload.whatsapp_status = whatsAppStatus
        payload.plan_status = planStatus
        payload.effective_value = Number(effectiveValue)
      }

      await updateTenant(tenant.id, payload)
      toast({
        title: 'Licença atualizada!',
        description: 'As alterações foram salvas com sucesso.',
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar licença',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getTitleAndDesc = () => {
    switch (type) {
      case 'limits':
        return {
          title: 'Editar Limites Efetivos desta Licença',
          desc: 'Ajuste o limite de produtos cadastrados e valor mensal específico para este cliente.',
        }
      case 'expiration':
        return {
          title: 'Editar Data de Expiração da Licença',
          desc: 'Defina a nova data de vencimento da mensalidade do cliente.',
        }
      case 'plan':
        return {
          title: 'Alterar Plano Comercial do Cliente',
          desc: 'Selecione o novo plano contratado e atualize os limites correspondentes.',
        }
      case 'status':
        return {
          title: 'Alterar Status da Licença',
          desc: 'Pause, ative ou suspenda o acesso do cliente ao painel.',
        }
      case 'general':
      default:
        return {
          title: 'Editar Dados Gerais da Licença',
          desc: 'Atualize dados cadastrais da empresa/locadora e do responsável.',
        }
    }
  }

  const meta = getTitleAndDesc()

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <DialogTitle>{meta.title}</DialogTitle>
          </div>
          <DialogDescription>
            {tenant.name} ({tenant.slug}) — {meta.desc}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* LIMITES */}
          {type === 'limits' && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-gray-700">Limite de Produtos Cadastrados</label>
                <Input
                  type="number"
                  min="1"
                  value={effectiveProductLimit}
                  onChange={(e) => setEffectiveProductLimit(Number(e.target.value))}
                  required
                  className="mt-1"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Ex: 200, 600, 1200, 2000, ou 999999 para ilimitado
                </p>
              </div>

              <div>
                <label className="font-medium text-gray-700">Valor Mensal Efetivo (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={effectiveValue}
                  onChange={(e) => setEffectiveValue(Number(e.target.value))}
                  required
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* EXPIRAÇÃO */}
          {type === 'expiration' && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-gray-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Nova Data de Expiração
                </label>
                <Input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = new Date()
                    d.setDate(d.getDate() + 30)
                    setExpirationDate(d.toISOString().split('T')[0])
                  }}
                  className="text-xs flex-1"
                >
                  +30 Dias
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = new Date()
                    d.setDate(d.getDate() + 90)
                    setExpirationDate(d.toISOString().split('T')[0])
                  }}
                  className="text-xs flex-1"
                >
                  +90 Dias
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = new Date()
                    d.setFullYear(d.getFullYear() + 1)
                    setExpirationDate(d.toISOString().split('T')[0])
                  }}
                  className="text-xs flex-1"
                >
                  +1 Ano
                </Button>
              </div>
            </div>
          )}

          {/* PLANO */}
          {type === 'plan' && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-gray-700 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Plano Comercial Contratado
                </label>
                <Select value={planId} onValueChange={handlePlanChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name} — R$ {p.price.toFixed(2).replace('.', ',')}/mês
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-medium text-gray-700">Valor Mensal (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={effectiveValue}
                  onChange={(e) => setEffectiveValue(Number(e.target.value))}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="font-medium text-gray-700">Limite de Produtos Cadastrados</label>
                <Input
                  type="number"
                  value={effectiveProductLimit}
                  onChange={(e) => setEffectiveProductLimit(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* STATUS / PAUSA */}
          {type === 'status' && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-gray-700 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  Status da Licença
                </label>
                <Select
                  value={planStatus}
                  onValueChange={(val) => setPlanStatus(val as PlanStatus)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="trial">Trial (Período de Teste)</SelectItem>
                    <SelectItem value="suspended">Suspensa (Pausada)</SelectItem>
                    <SelectItem value="canceled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-[11px] text-gray-500">
                Atenção: Ao pausar ou cancelar, o cliente visualiza a tela amigável de renovação e o
                acesso ao painel gerencial é bloqueado, sem perda de nenhum dado cadastrado.
              </p>
            </div>
          )}

          {/* DADOS GERAIS */}
          {type === 'general' && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-medium text-gray-700">Nome da Empresa / Locadora</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700">Subdomínio / Slug</label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700">CNPJ</label>
                  <Input
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700">WhatsApp / Telefone</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700">E-mail de Contato</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700">Status do Plano</label>
                  <Select
                    value={planStatus}
                    onValueChange={(val) => setPlanStatus(val as PlanStatus)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="suspended">Suspensa</SelectItem>
                      <SelectItem value="canceled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="font-medium text-gray-700">WhatsApp Status</label>
                  <Select
                    value={whatsAppStatus}
                    onValueChange={(val) => setWhatsAppStatus(val as WhatsAppStatus)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="connected">WhatsApp Conectado</SelectItem>
                      <SelectItem value="disconnected">Desconectado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

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
