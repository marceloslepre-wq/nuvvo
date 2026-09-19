import React, { useState } from 'react'
import { Calendar, History, Clock, User, DollarSign, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tenant, LicenseRenewal } from '@/types/tenant'
import { getRenewalsByTenant, createRenewal, updateTenant } from '@/services/tenants'
import { toast } from '@/components/ui/use-toast'

interface RenewalHistoryModalProps {
  tenant: Tenant | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
  currentUserName?: string
}

export const RenewalHistoryModal: React.FC<RenewalHistoryModalProps> = ({
  tenant,
  open,
  onClose,
  onSuccess,
  currentUserName = 'Master',
}) => {
  const [renewals, setRenewals] = useState<LicenseRenewal[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [daysToAdd, setDaysToAdd] = useState(30)
  const [amountPaid, setAmountPaid] = useState<number>(tenant?.effective_value || 0)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  React.useEffect(() => {
    if (open && tenant) {
      loadHistory()
      setAmountPaid(tenant.effective_value || 0)
      setShowAddForm(false)
      setNotes('')
    }
  }, [open, tenant?.id])

  const loadHistory = async () => {
    if (!tenant) return
    setLoading(true)
    try {
      const list = await getRenewalsByTenant(tenant.id)
      setRenewals(list)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar histórico',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant) return
    setSubmitting(true)

    try {
      const currentExp = tenant.expiration_date ? new Date(tenant.expiration_date) : new Date()
      const baseDate = currentExp.getTime() > Date.now() ? currentExp : new Date()
      const newExp = new Date(baseDate.getTime() + Number(daysToAdd) * 24 * 60 * 60 * 1000)

      await createRenewal({
        tenant: tenant.id,
        previous_expiration: tenant.expiration_date,
        new_expiration: newExp.toISOString(),
        days_added: Number(daysToAdd),
        amount_paid: Number(amountPaid) || 0,
        notes: notes.trim() || `Renovação manual de +${daysToAdd} dias`,
        renewed_by: currentUserName,
      })

      await updateTenant(tenant.id, {
        expiration_date: newExp.toISOString(),
        plan_status: 'active',
      })

      toast({
        title: 'Licença renovada!',
        description: `Validade estendida até ${newExp.toLocaleDateString('pt-BR')}`,
      })

      setShowAddForm(false)
      loadHistory()
      onSuccess()
    } catch (err: any) {
      toast({
        title: 'Erro ao renovar',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!tenant) return null

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDateOnly = (dateStr?: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR')
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <DialogTitle>Histórico de Renovações</DialogTitle>
          </div>
          <DialogDescription>
            Cliente: <strong className="text-gray-900">{tenant.name}</strong> ({tenant.slug})
          </DialogDescription>
        </DialogHeader>

        {/* Status Atual da Licença */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-gray-500">Expiração atual:</span>{' '}
            <strong className="text-gray-900">{formatDateOnly(tenant.expiration_date)}</strong>
          </div>
          <div>
            <span className="text-gray-500">Valor mensal:</span>{' '}
            <strong className="text-gray-900">
              R$ {(tenant.effective_value ?? 0).toFixed(2).replace('.', ',')}
            </strong>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {showAddForm ? 'Fechar formulário' : 'Registrar Renovação'}
          </Button>
        </div>

        {/* Formulário de Registro de Renovação */}
        {showAddForm && (
          <form
            onSubmit={handleRenew}
            className="bg-indigo-50/50 border border-indigo-200 rounded-lg p-4 space-y-3"
          >
            <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Nova Renovação Manual
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-gray-700">Dias a adicionar</label>
                <div className="flex gap-1.5">
                  <Input
                    type="number"
                    min="1"
                    value={daysToAdd}
                    onChange={(e) => setDaysToAdd(Number(e.target.value))}
                    required
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDaysToAdd(30)}
                    className="h-8 text-[11px] px-2"
                  >
                    +30d
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDaysToAdd(365)}
                    className="h-8 text-[11px] px-2"
                  >
                    +1 ano
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-gray-700">Valor Pago (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-medium text-gray-700">Anotações / Comprovante</label>
                <Input
                  placeholder="Ex: Pago via PIX pelo WhatsApp, fatura #1234"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(false)}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {submitting ? 'Salvando...' : 'Confirmar Renovação'}
              </Button>
            </div>
          </form>
        )}

        {/* Lista de Renovações */}
        <div className="space-y-2 mt-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Histórico Registrado ({renewals.length})
          </h4>

          {loading ? (
            <div className="text-center py-6 text-gray-400 text-xs">Carregando histórico...</div>
          ) : renewals.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs border rounded-lg bg-gray-50/50">
              Nenhuma renovação registrada para esta licença ainda.
            </div>
          ) : (
            <div className="divide-y border rounded-lg bg-white overflow-hidden">
              {renewals.map((item) => (
                <div key={item.id} className="p-3 text-xs hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                      <Clock className="w-3.5 h-3.5" />+{item.days_added || 30} dias de extensão
                    </span>
                    <span className="text-gray-900 font-semibold">
                      R$ {(item.amount_paid ?? 0).toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5 text-gray-500 text-[11px]">
                    <div>
                      <span>Expiração anterior: </span>
                      <strong className="text-gray-700">
                        {formatDateOnly(item.previous_expiration)}
                      </strong>
                    </div>
                    <div>
                      <span>Nova expiração: </span>
                      <strong className="text-emerald-700">
                        {formatDateOnly(item.new_expiration)}
                      </strong>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-gray-400" />
                      <span>Por: {item.renewed_by || 'Master'}</span>
                    </div>
                    <div>
                      <span>Em: {formatDateTime(item.created)}</span>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="mt-2 text-[11px] text-gray-600 bg-gray-50 p-1.5 rounded border border-gray-100 italic">
                      "{item.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
