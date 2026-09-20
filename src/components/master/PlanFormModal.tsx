import React, { useState } from 'react'
import { Package, Layers, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Plan } from '@/types/tenant'
import { createPlan, updatePlan } from '@/services/tenants'
import { toast } from '@/components/ui/use-toast'

interface PlanFormModalProps {
  plan: Plan | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export const PlanFormModal: React.FC<PlanFormModalProps> = ({ plan, open, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false)
  const isEditing = !!plan

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [badge, setBadge] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState<number>(0)
  const [isFree, setIsFree] = useState(false)
  const [productLimit, setProductLimit] = useState<number>(200)
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [isMasterExclusive, setIsMasterExclusive] = useState(false)
  const [order, setOrder] = useState<number>(1)

  React.useEffect(() => {
    if (plan && open) {
      setName(plan.name || '')
      setSlug(plan.slug || '')
      setBadge(plan.badge || '')
      setDescription(plan.description || '')
      setPrice(plan.price ?? 0)
      setIsFree(Boolean(plan.is_free))
      setProductLimit(plan.product_limit ?? plan.user_limit ?? 200)
      setStatus(plan.status || 'active')
      setIsMasterExclusive(Boolean(plan.is_master_exclusive))
      setOrder(plan.order ?? 1)
    } else if (open) {
      setName('')
      setSlug('')
      setBadge('')
      setDescription('')
      setPrice(199.9)
      setIsFree(false)
      setProductLimit(200)
      setStatus('active')
      setIsMasterExclusive(false)
      setOrder(10)
    }
  }, [plan, open])

  const handleNameChange = (val: string) => {
    setName(val)
    if (!isEditing) {
      const generatedSlug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setSlug(generatedSlug)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const payload: Partial<Plan> = {
        name,
        slug: slug.trim().toLowerCase(),
        badge,
        description,
        price: isFree ? 0 : Number(price),
        is_free: isFree,
        unit_limit: 0,
        user_limit: Number(productLimit),
        product_limit: Number(productLimit),
        status,
        is_master_exclusive: isMasterExclusive,
        order: Number(order),
      }

      if (isEditing && plan) {
        await updatePlan(plan.id, payload)
        toast({ title: 'Plano atualizado com sucesso!' })
      } else {
        await createPlan(payload)
        toast({ title: 'Novo plano criado com sucesso!' })
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar plano',
        description: err.message,
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
            <Package className="w-5 h-5 text-indigo-600" />
            <DialogTitle>
              {isEditing ? 'Editar Plano Comercial' : '+ Novo Plano Comercial'}
            </DialogTitle>
          </div>
          <DialogDescription>
            Configure os limites, valores e recursos do catálogo de planos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 pt-2 text-xs">
          <div>
            <label className="font-medium text-gray-700">Nome do Plano</label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Plano Gold"
              required
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium text-gray-700">Identificador / Slug</label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="plano-gold"
                required
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium text-gray-700">Badge em Destaque</label>
              <Input
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="Ex: Mais Popular"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-gray-700">Descrição Comercial</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva para qual porte de cliente este plano é indicado..."
              className="mt-1 h-16 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium text-gray-700">Valor Mensal (R$)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={price}
                disabled={isFree}
                onChange={(e) => setPrice(Number(e.target.value))}
                required
                className="mt-1"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>Gratuito / Isento</span>
              </label>
            </div>
          </div>

          <div>
            <label className="font-medium text-gray-700">Limite de Produtos Cadastrados</label>
            <Input
              type="number"
              min="1"
              value={productLimit}
              onChange={(e) => setProductLimit(Number(e.target.value))}
              required
              className="mt-1"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Quantidade máxima de produtos que o cliente pode cadastrar neste plano (ex: 200, 600,
              1200, 2000, ou 999999 para ilimitado).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium text-gray-700">Status</label>
              <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo no Catálogo</SelectItem>
                  <SelectItem value="inactive">Inativo / Oculto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-medium text-gray-700">Ordem de Exibição</label>
              <Input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isMasterExclusive}
                onChange={(e) => setIsMasterExclusive(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Exclusivo Master (não visível para clientes comuns na tela de onboarding)
              </span>
            </label>
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
              {submitting ? 'Salvando...' : isEditing ? 'Salvar Plano' : 'Criar Plano'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
