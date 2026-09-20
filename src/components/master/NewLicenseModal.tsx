import React, { useState } from 'react'
import { Building2, Plus, ShieldCheck } from 'lucide-react'
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
import { Tenant, Plan, PlanStatus } from '@/types/tenant'
import { createTenant } from '@/services/tenants'
import { toast } from '@/components/ui/use-toast'

interface NewLicenseModalProps {
  plans: Plan[]
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export const NewLicenseModal: React.FC<NewLicenseModalProps> = ({
  plans,
  open,
  onClose,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [planId, setPlanId] = useState('')
  const [planStatus, setPlanStatus] = useState<PlanStatus>('trial')
  const [trialDays, setTrialDays] = useState(15)
  const [effectiveValue, setEffectiveValue] = useState<number>(0)
  const [effectiveProductLimit, setEffectiveProductLimit] = useState<number>(200)

  const handleNameChange = (val: string) => {
    setName(val)
    const genSlug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    setSlug(genSlug)
  }

  const handlePlanChange = (pId: string) => {
    setPlanId(pId)
    const sel = plans.find((p) => p.id === pId)
    if (sel) {
      setEffectiveValue(sel.price ?? 0)
      setEffectiveProductLimit(sel.product_limit ?? sel.user_limit ?? 200)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const now = new Date()
      const expiration = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)

      await createTenant({
        name,
        slug: slug.trim().toLowerCase(),
        subdomain: slug.trim().toLowerCase(),
        phone,
        email,
        document_cnpj: cnpj,
        plan: planId || undefined,
        plan_status: planStatus,
        trial_days: Number(trialDays),
        start_date: now.toISOString(),
        expiration_date: expiration.toISOString(),
        effective_value: Number(effectiveValue),
        effective_unit_limit: 0,
        effective_user_limit: Number(effectiveProductLimit),
        effective_product_limit: Number(effectiveProductLimit),
        status: 'active',
        whatsapp_status: 'disconnected',
      })

      toast({
        title: 'Nova licença criada!',
        description: `A locadora ${name} foi cadastrada com sucesso.`,
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      toast({
        title: 'Erro ao cadastrar locadora',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <DialogTitle>+ Nova Licença de Cliente</DialogTitle>
          </div>
          <DialogDescription>
            Cadastre uma nova empresa / locadora no sistema com plano e limites atribuídos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 pt-2 text-xs">
          <div>
            <label className="font-medium text-gray-700">Nome da Empresa / Locadora</label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Locadora Alpha"
              required
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium text-gray-700">Subdomínio / Slug</label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="locadoraalpha"
                required
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium text-gray-700">CNPJ (Opcional)</label>
              <Input
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium text-gray-700">WhatsApp / Telefone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="27999000000"
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium text-gray-700">E-mail Principal</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@empresa.com"
                required
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium text-gray-700">Plano Comercial</label>
              <Select value={planId} onValueChange={handlePlanChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o plano" />
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
              <label className="font-medium text-gray-700">Status Inicial</label>
              <Select value={planStatus} onValueChange={(val) => setPlanStatus(val as PlanStatus)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial (15 dias grátis)</SelectItem>
                  <SelectItem value="active">Ativa (Mensalidade em dia)</SelectItem>
                  <SelectItem value="suspended">Suspensa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
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
              <label className="font-medium text-gray-700">Lim. Produtos</label>
              <Input
                type="number"
                value={effectiveProductLimit}
                onChange={(e) => setEffectiveProductLimit(Number(e.target.value))}
                className="mt-1"
              />
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
              {submitting ? 'Criando...' : 'Cadastrar Licença'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
