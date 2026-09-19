import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useTenant } from '@/contexts/tenant-context'
import { Tenant, Plan, LicenseRenewal } from '@/types/tenant'
import { getTenantById, getPlans, getRenewalsByTenant } from '@/services/tenants'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  RotateCw,
  QrCode,
  ArrowUpRight,
  Clock,
  Check,
  Users,
  Building,
  Info,
  Calendar,
  FileText,
  Loader2,
} from 'lucide-react'
import { PixRenewalModal } from '@/components/licenses/PixRenewalModal'
import { ChangePlanModal } from '@/components/licenses/ChangePlanModal'
import { toast } from '@/components/ui/use-toast'

export default function LicensesPage() {
  const { user } = useAuth()
  const { activeAdminTenant, refreshTenants } = useTenant()

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [renewals, setRenewals] = useState<LicenseRenewal[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Métricas de uso real da instância
  const [userCount, setUserCount] = useState<number>(0)

  // Modais
  const [pixModalOpen, setPixModalOpen] = useState(false)
  const [changePlanModalOpen, setChangePlanModalOpen] = useState(false)

  const tenantId = activeAdminTenant?.id || user?.tenant || ''

  const loadAllData = async (isManualRefresh = false) => {
    if (!tenantId) {
      setLoading(false)
      return
    }

    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const [tData, pData, rData, usersList] = await Promise.all([
        getTenantById(tenantId).catch(() => activeAdminTenant),
        getPlans().catch(() => [] as Plan[]),
        getRenewalsByTenant(tenantId).catch(() => [] as LicenseRenewal[]),
        pb
          .collection('users')
          .getFullList({
            filter: `tenant = '${tenantId}' || tenant = '' || tenant = null`,
          })
          .catch(() => []),
      ])

      if (tData) setTenant(tData)
      setPlans(pData)
      setRenewals(rData)
      setUserCount(usersList.length)

      if (isManualRefresh) {
        await refreshTenants()
        toast({ title: 'Dados atualizados com sucesso!' })
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados da licença:', err)
      toast({
        title: 'Erro ao carregar informações',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [tenantId])

  // Cálculo de vigência / expiração
  const expirationInfo = useMemo(() => {
    if (!tenant)
      return {
        daysRemaining: 0,
        dateFormatted: '-',
        progressPercent: 100,
        isExpired: false,
        isWarning: false,
        isCritical: false,
      }

    const expStr = tenant.expiration_date
    if (!expStr) {
      return {
        daysRemaining: 999,
        dateFormatted: 'Vitalício',
        progressPercent: 100,
        isExpired: false,
        isWarning: false,
        isCritical: false,
      }
    }

    const expDate = new Date(expStr)
    const now = new Date()
    const diffMs = expDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    const isExpired = diffDays <= 0
    const isCritical = diffDays <= 5
    const isWarning = diffDays <= 15

    // Para a barra de progresso: ciclo de 30 dias padrão
    // Se restar 30 dias -> 100%, se 15 dias -> 50%, etc.
    const progress = Math.max(0, Math.min(100, Math.round((Math.max(0, diffDays) / 30) * 100)))

    const dateFormatted = expDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    return {
      daysRemaining: diffDays,
      dateFormatted,
      progressPercent: progress,
      isExpired,
      isWarning,
      isCritical,
    }
  }, [tenant?.expiration_date])

  // Plano associado
  const currentPlan = useMemo(() => {
    if (!tenant) return null
    if (tenant.expand?.plan) return tenant.expand.plan
    if (tenant.plan && plans.length > 0) {
      return plans.find((p) => p.id === tenant.plan) || null
    }
    return null
  }, [tenant, plans])

  const planName = currentPlan?.name || 'Plano Pratinum'
  const planDescription = currentPlan?.description || 'Maior expansão de moradias e torres'
  const monthlyPrice = tenant?.effective_value ?? currentPlan?.price ?? 799.0

  // Recursos incluídos
  const includedFeatures = useMemo(() => {
    const rawFeatures = currentPlan?.features
    let list: string[] = []
    if (Array.isArray(rawFeatures)) {
      list = rawFeatures
    } else if (rawFeatures) {
      try {
        const parsed = JSON.parse(rawFeatures)
        if (Array.isArray(parsed)) list = parsed
      } catch {
        list = []
      }
    }

    if (list.length === 0) {
      return [
        'Notificações via WhatsApp automáticas',
        'Triagem e recebimentos na portaria',
        'Liberação segura por QR Code / Token',
        'Gestão completa de unidades e moradores',
      ]
    }
    return list
  }, [currentPlan])

  // Limites e uso
  const userLimit = tenant?.effective_user_limit ?? currentPlan?.user_limit ?? 2000
  const isUserUnlimited = userLimit >= 99999
  const userRemaining = Math.max(0, userLimit - userCount)
  const userPercent = isUserUnlimited
    ? 0
    : Math.min(100, Math.round((userCount / (userLimit || 1)) * 100))

  // Status Badge
  const renderStatusBadge = () => {
    const status = tenant?.plan_status || 'active'
    if (expirationInfo.isExpired) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
          Expirada
        </span>
      )
    }
    if (status === 'suspended') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          Suspensa
        </span>
      )
    }
    if (status === 'trial') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
          Trial ({tenant?.trial_days || 15} dias)
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Ativa
      </span>
    )
  }

  // Formatador de tipo de evento para a tabela
  const formatEventType = (ev?: string) => {
    switch (ev) {
      case 'renewal_pix':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none font-semibold text-[11px]">
            Renovação PIX
          </Badge>
        )
      case 'renewal_manual':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none font-semibold text-[11px]">
            Renovação Manual
          </Badge>
        )
      case 'plan_change':
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-none font-semibold text-[11px]">
            Mudança de Plano
          </Badge>
        )
      case 'license_created':
        return (
          <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 border-none font-semibold text-[11px]">
            Criação de Licença
          </Badge>
        )
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-none font-semibold text-[11px]">
            Renovação
          </Badge>
        )
    }
  }

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Carregando informações da licença...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Cabeçalho superior da página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Licenças e Planos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Informações sobre o plano contratado, vigência, limites de capacidade e histórico de
            renovações.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAllData(true)}
            disabled={refreshing}
            className="h-9 px-3.5 text-xs font-semibold text-gray-700 bg-white border-gray-200 hover:bg-gray-50 gap-2 shadow-xs"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            size="sm"
            onClick={() => setPixModalOpen(true)}
            className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs"
          >
            <QrCode className="w-4 h-4" />
            Renovar por 30 dias (PIX)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setChangePlanModalOpen(true)}
            className="h-9 px-3.5 text-xs font-semibold text-indigo-600 bg-white border-indigo-200 hover:bg-indigo-50/50 gap-1.5 shadow-xs"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Mudar de Plano
          </Button>
        </div>
      </div>

      {/* Grid Principal: Coluna Esquerda (Licença + Vigência + Plano) + Coluna Direita (Limites) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda (7 de 12 colunas) */}
        <div className="lg:col-span-8 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
          {/* Topo do card: ID da Licença, Nome do Condomínio / Empresa e Badge */}
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
              <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase block">
                Número da Licença
              </span>
              <h2 className="text-2xl font-bold font-mono text-indigo-950 mt-0.5">
                {tenant?.id || '6g8bko83focnbse'}
              </h2>
              <p className="text-xs text-gray-500 mt-1 font-medium">
                Condomínio:{' '}
                <strong className="text-gray-800 uppercase">
                  {tenant?.name || 'CONDOMINIO RESIDENCIAL JARDINS'}
                </strong>
              </p>
            </div>
            {renderStatusBadge()}
          </div>

          {/* Bloco Vigência & Expiração */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">
                Vigência & Expiração
              </span>
              <span className="text-gray-700 font-semibold">{expirationInfo.dateFormatted}</span>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>
                {expirationInfo.isExpired
                  ? 'Licença vencida'
                  : `Vence em ${expirationInfo.daysRemaining} dias`}
              </span>
            </div>

            {/* Barra de progresso */}
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  expirationInfo.isCritical
                    ? 'bg-red-500'
                    : expirationInfo.isWarning
                      ? 'bg-amber-500'
                      : 'bg-amber-500'
                }`}
                style={{ width: `${Math.max(5, expirationInfo.progressPercent)}%` }}
              />
            </div>
          </div>

          {/* Cards Lado a Lado: Plano Atual e Valor da Assinatura */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/40">
              <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase block">
                Plano Atual
              </span>
              <h3 className="text-xl font-bold text-gray-900 mt-1">{planName}</h3>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{planDescription}</p>
            </div>

            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/40">
              <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase block">
                Valor da Assinatura
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-indigo-600">
                  R$ {monthlyPrice.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-xs text-gray-500 font-medium">/mês</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Cobrança e renovação mensal recorrente</p>
            </div>
          </div>

          {/* Recursos Incluídos */}
          <div className="space-y-3 pt-2">
            <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase block">
              Recursos Incluídos
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {includedFeatures.map((feat, idx) => (
                <div
                  key={idx}
                  className="bg-emerald-50/60 border border-emerald-100/80 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-emerald-900 font-medium"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna Direita: Uso Atual vs. Limite (4 de 12 colunas) */}
        <div className="lg:col-span-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div>
            <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
              <Users className="w-4 h-4 text-indigo-600" />
              <h3>Uso Atual vs. Limite</h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Capacidade utilizada pelo condomínio em relação ao plano contratado.
            </p>
          </div>

          {/* Limite de Usuários */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-700 font-semibold">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <span>Usuários Cadastrados</span>
              </div>
              <span className="font-bold text-gray-900 font-mono">
                {userCount} / {isUserUnlimited ? 'Ilimitado' : userLimit}
              </span>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full"
                style={{ width: `${userPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
              <span>
                {isUserUnlimited ? 'Capacidade ilimitada' : `${userRemaining} vagas restantes`}
              </span>
              <span>{isUserUnlimited ? '0%' : `${userPercent}% ocupado`}</span>
            </div>
          </div>

          {/* Box Informativo Azul */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-950">
              <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Precisa de mais capacidade?</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Precisa cadastrar novos usuários? Você pode mudar para um plano superior a qualquer
              momento.
            </p>
          </div>

          {/* Botões de Ação na Coluna Direita */}
          <div className="space-y-2 pt-2">
            <Button
              size="sm"
              onClick={() => setPixModalOpen(true)}
              className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-xs"
            >
              <QrCode className="w-4 h-4" />
              Renovar por 30 dias (PIX)
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setChangePlanModalOpen(true)}
              className="w-full h-9 border-indigo-200 text-indigo-600 hover:bg-indigo-50/50 font-semibold text-xs gap-1.5 shadow-xs"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Mudar de Plano
            </Button>
          </div>
        </div>
      </div>

      {/* Seção Inferior: Histórico de Renovações e Períodos */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-gray-900 text-base">
                Histórico de Renovações e Períodos
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Registros de vigência, reativações e alterações de planos contratados.
            </p>
          </div>
          <span className="text-xs text-gray-400 font-medium">
            Total de registros: {renewals.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                <TableHead className="text-xs font-bold text-gray-600">Licença</TableHead>
                <TableHead className="text-xs font-bold text-gray-600">Tipo de Evento</TableHead>
                <TableHead className="text-xs font-bold text-gray-600">Plano</TableHead>
                <TableHead className="text-xs font-bold text-gray-600">
                  Período / Validade
                </TableHead>
                <TableHead className="text-xs font-bold text-gray-600">Descrição</TableHead>
                <TableHead className="text-xs font-bold text-gray-600 text-right">
                  Data do Registro
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renewals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-xs text-gray-400">
                    Nenhum histórico registrado até o momento.
                  </TableCell>
                </TableRow>
              ) : (
                renewals.map((r) => {
                  const periodText =
                    r.period_display ||
                    (r.days_added
                      ? `+${r.days_added} dias (até ${formatDateOnly(r.new_expiration)})`
                      : formatDateOnly(r.new_expiration))

                  return (
                    <TableRow key={r.id} className="text-xs hover:bg-gray-50/50">
                      <TableCell className="font-mono font-semibold text-gray-900">
                        {tenant?.id || r.tenant}
                      </TableCell>
                      <TableCell>{formatEventType(r.event_type)}</TableCell>
                      <TableCell className="font-medium text-gray-800">
                        {r.plan_name || planName}
                      </TableCell>
                      <TableCell className="text-gray-600">{periodText}</TableCell>
                      <TableCell className="text-gray-600 max-w-xs truncate">
                        {r.description || r.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right text-gray-500 font-mono">
                        {formatDateTime(r.created)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modais */}
      {tenant && (
        <>
          <PixRenewalModal
            open={pixModalOpen}
            onClose={() => setPixModalOpen(false)}
            tenant={tenant}
            onSuccess={() => loadAllData()}
          />

          <ChangePlanModal
            open={changePlanModalOpen}
            onClose={() => setChangePlanModalOpen(false)}
            tenant={tenant}
            plans={plans}
            currentUserName={user?.name || user?.email || 'Gestor'}
            onSuccess={() => loadAllData()}
          />
        </>
      )}
    </div>
  )
}
