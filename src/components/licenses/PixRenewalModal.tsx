import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tenant } from '@/types/tenant'
import {
  QrCode,
  Copy,
  Check,
  Loader2,
  Clock,
  AlertCircle,
  CheckCircle2,
  RotateCw,
} from 'lucide-react'
import { createPixPayment, getPaymentStatus, CreatePixResponse } from '@/services/tenants'
import { toast } from '@/components/ui/use-toast'

interface PixRenewalModalProps {
  open: boolean
  onClose: () => void
  tenant: Tenant
  onSuccess: () => void
}

export const PixRenewalModal: React.FC<PixRenewalModalProps> = ({
  open,
  onClose,
  tenant,
  onSuccess,
}) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [pixData, setPixData] = useState<CreatePixResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [paymentApproved, setPaymentApproved] = useState(false)
  const handledApprovalRef = useRef(false)

  const planName = tenant.expand?.plan?.name || 'Plano Pratinum'
  const amountToPay = tenant.effective_value ?? (tenant.expand?.plan?.price || 799.0)

  // Dispara o fluxo de pós-aprovação do pagamento:
  // 1. Exibe feedback de sucesso ("Pagamento confirmado! Licença renovada por 30 dias")
  // 2. Invoca onSuccess() para recarregar dados
  // 3. Aguarda ~2 segundos para o usuário ver o feedback
  // 4. Fecha o modal e redireciona automaticamente para a página /admin/licenses
  const handleApprovedSuccess = () => {
    if (handledApprovalRef.current) return
    handledApprovalRef.current = true

    setPaymentApproved(true)
    toast({
      title: 'Pagamento confirmado!',
      description: 'Licença renovada por 30 dias com sucesso.',
    })

    try {
      onSuccess()
    } catch (_) {
      // Ignora erro de callback
    }

    setTimeout(() => {
      onClose()
      navigate('/admin/licenses')
    }, 2000)
  }

  useEffect(() => {
    if (open && tenant) {
      handledApprovalRef.current = false
      setPaymentApproved(false)
      loadPix()
    } else {
      handledApprovalRef.current = false
      setPixData(null)
      setCopied(false)
      setPaymentApproved(false)
    }
  }, [open, tenant?.id])

  // Polling automático para verificar o status do pagamento no Mercado Pago a cada 4 segundos por até 15 minutos
  useEffect(() => {
    if (!open || !pixData?.payment_id || paymentApproved || pixData.mode === 'demo') {
      return
    }

    let isSubscribed = true
    let pollCount = 0
    const maxPolls = 225 // ~15 minutos com intervalo de 4s

    const interval = setInterval(async () => {
      if (!isSubscribed) return
      pollCount++

      if (pollCount > maxPolls) {
        clearInterval(interval)
        return
      }

      try {
        const res = await getPaymentStatus(pixData.payment_id)
        if (!isSubscribed) return

        if (res.status === 'approved' || res.renewed) {
          clearInterval(interval)
          handleApprovedSuccess()
        }
      } catch (err) {
        // Ignora erros transitórios de rede no polling
      }
    }, 4000)

    return () => {
      isSubscribed = false
      clearInterval(interval)
    }
  }, [open, pixData?.payment_id, paymentApproved, pixData?.mode])

  // Consulta manual forçada pelo usuário ("Atualizar")
  const handleCheckStatusManual = async () => {
    if (!pixData?.payment_id || checkingStatus || paymentApproved) return

    setCheckingStatus(true)
    try {
      const res = await getPaymentStatus(pixData.payment_id)

      if (res.status === 'approved' || res.renewed) {
        handleApprovedSuccess()
      } else {
        toast({
          title: 'Pagamento ainda não identificado',
          description:
            'Aguardando compensação pelo banco. Se você já realizou o pagamento no app do banco, aguarde alguns instantes (a compensação PIX costuma levar de alguns segundos a até 2 minutos).',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Não foi possível atualizar o status',
        description: err?.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      })
    } finally {
      setCheckingStatus(false)
    }
  }

  const loadPix = async () => {
    setLoading(true)
    try {
      const res = await createPixPayment(tenant.id)
      setPixData(res)
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar PIX',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = async () => {
    if (!pixData?.qr_code) return
    try {
      await navigator.clipboard.writeText(pixData.qr_code)
      setCopied(true)
      toast({
        title: 'Código PIX copiado!',
        description: 'Cole o código no aplicativo do seu banco para pagar.',
      })
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Selecione o código manualmente e copie.',
        variant: 'destructive',
      })
    }
  }

  // Gera URL do QR code caso não venha base64 pronta da API
  const getQrImageUrl = (code: string) => {
    if (pixData?.qr_code_base64) {
      return `data:image/png;base64,${pixData.qr_code_base64}`
    }
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
      code || 'https://nuvvo.com.br',
    )}`
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md p-6 overflow-hidden">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Renovação via PIX (30 dias)
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-gray-500 pt-1 leading-relaxed">
            Pagamento instantâneo via Mercado Pago. Sua licença é reativada automaticamente assim
            que o PIX for concluído.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs text-gray-500 font-medium">Gerando QR Code PIX...</p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Box Status de Pagamento (Aguardando ou Aprovado) com botão Atualizar */}
            {paymentApproved ? (
              <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-4 py-3 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">Pagamento confirmado!</p>
                    <p className="text-[11px] font-normal text-emerald-700">
                      Licença renovada por 30 dias.
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[11px] px-2.5 py-0.5"
                >
                  Aprovado
                </Badge>
              </div>
            ) : (
              <div className="bg-amber-50/70 border border-amber-200 rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                  <Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
                  <span>Aguardando Pagamento do PIX...</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCheckStatusManual}
                    disabled={checkingStatus}
                    className="h-7 px-2.5 text-[11px] font-semibold bg-white border-amber-300 text-amber-900 hover:bg-amber-100/60 gap-1.5 shadow-2xs"
                    title="Forçar consulta imediata do status de pagamento"
                  >
                    <RotateCw className={`w-3 h-3 ${checkingStatus ? 'animate-spin' : ''}`} />
                    <span>{checkingStatus ? 'Consultando...' : 'Atualizar'}</span>
                  </Button>
                  <Badge
                    variant="outline"
                    className="bg-amber-100/80 text-amber-800 border-amber-300 font-bold text-[11px] px-2.5 py-0.5"
                  >
                    Pendente
                  </Badge>
                </div>
              </div>
            )}

            {/* Bloco Plano Selecionado e Valor */}
            <div className="border border-gray-200 rounded-lg p-3 bg-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase block">
                  Plano Selecionado
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {pixData?.plan_name || planName}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase block">
                  Valor a Pagar
                </span>
                <span className="text-lg font-black text-emerald-600">
                  R$ {(pixData?.amount ?? amountToPay).toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 rounded-xl shadow-xs">
              <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-xs">
                <img
                  src={getQrImageUrl(pixData?.qr_code || '')}
                  alt="QR Code PIX"
                  className="w-48 h-48 object-contain"
                />
              </div>
              <p className="text-xs text-gray-500 font-medium mt-3 text-center">
                Abra o app do seu banco e escaneie o código acima
              </p>
            </div>

            {/* Código PIX Copia e Cola */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">
                Código PIX Copia e Cola:
              </label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={pixData?.qr_code || ''}
                  className="h-9 text-xs font-mono bg-gray-50 text-gray-600 border-gray-200"
                />
                <Button
                  type="button"
                  onClick={handleCopyCode}
                  className="h-9 px-3 bg-slate-900 hover:bg-slate-800 text-white shrink-0 text-xs font-semibold gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar Código
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Aviso quando em modo demonstração */}
            {pixData?.mode === 'demo' && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Ambiente de Demonstração:</strong> O token do Mercado Pago ainda não está
                  configurado. A liberação automática será ativada após a inserção do token no
                  sistema. Para renovações imediatas, o Master pode atualizar a licença manualmente.
                </span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
