import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  ShieldAlert,
  Search,
  Plus,
  Layers,
  Calendar,
  Clock,
  MoreVertical,
  History,
  Sliders,
  DollarSign,
  TrendingUp,
  RotateCw,
  LogOut,
  ExternalLink,
  Edit,
  Trash2,
  Phone,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  UserCheck,
  Smartphone,
  Eye,
  KeyRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import { useTenant } from '@/contexts/tenant-context'
import { Tenant, Plan, PlanStatus } from '@/types/tenant'
import {
  getTenants,
  getPlans,
  deleteTenant,
  deletePlan,
  quickRenew30Days,
} from '@/services/tenants'
import { toast } from '@/components/ui/use-toast'
import { OnboardingLinkGenerator } from '@/components/master/OnboardingLinkGenerator'
import { RenewalHistoryModal } from '@/components/master/RenewalHistoryModal'
import { EditLicenseModal, EditModalType } from '@/components/master/EditLicenseModal'
import { PlanFormModal } from '@/components/master/PlanFormModal'
import { NewLicenseModal } from '@/components/master/NewLicenseModal'
import { MasterProfileModal } from '@/components/master/MasterProfileModal'

export default function MasterDashboard() {
  const { user, signOut } = useAuth()
  const { setSelectedAdminTenantId } = useTenant()
  const navigate = useNavigate()

  const [tenants, setTenants] = useState<Tenant[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros de licenças
  const [activeTab, setActiveTab] = useState<'licenses' | 'plans'>('licenses')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'trial' | 'expired' | 'suspended'
  >('all')

  // Modais
  const [selectedTenantForRenewals, setSelectedTenantForRenewals] = useState<Tenant | null>(null)
  const [editModalData, setEditModalData] = useState<{
    tenant: Tenant
    type: EditModalType
  } | null>(null)
  const [planModalData, setPlanModalData] = useState<{ plan: Plan | null; open: boolean }>({
    plan: null,
    open: false,
  })
  const [newLicenseModalOpen, setNewLicenseModalOpen] = useState(false)
  const [masterProfileModalOpen, setMasterProfileModalOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [tList, pList] = await Promise.all([getTenants(), getPlans()])
      setTenants(tList)
      setPlans(pList)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Métricas gerais calculadas
  const metrics = useMemo(() => {
    const totalTenants = tenants.length
    const now = new Date().getTime()

    let activeLicenses = 0
    let expiredLicenses = 0
    let trialLicenses = 0
    let totalMRR = 0

    tenants.forEach((t) => {
      const isExp = t.expiration_date ? new Date(t.expiration_date).getTime() < now : false

      if (t.plan_status === 'suspended' || t.plan_status === 'canceled' || isExp) {
        if (isExp && !t.is_origin) expiredLicenses++
      } else {
        activeLicenses++
      }

      if (t.plan_status === 'trial') {
        trialLicenses++
      }

      // Soma de MRR (mensalidades ativas ou contratadas)
      if (t.plan_status === 'active') {
        totalMRR += Number(t.effective_value ?? 0)
      }
    })

    return {
      totalTenants,
      activeLicenses,
      expiredLicenses,
      trialLicenses,
      totalMRR,
      totalPlans: plans.length,
    }
  }, [tenants, plans])

  // Filtragem de licenças
  const filteredTenants = useMemo(() => {
    const now = new Date().getTime()
    return tenants.filter((t) => {
      // Busca
      const q = search.toLowerCase().trim()
      const matchesSearch =
        !q ||
        t.name?.toLowerCase().includes(q) ||
        t.slug?.toLowerCase().includes(q) ||
        t.document_cnpj?.toLowerCase().includes(q) ||
        t.id?.toLowerCase().includes(q) ||
        t.expand?.plan?.name?.toLowerCase().includes(q)

      if (!matchesSearch) return false

      // Status
      const isExp = t.expiration_date ? new Date(t.expiration_date).getTime() < now : false

      if (statusFilter === 'active') {
        return t.plan_status === 'active' && !isExp
      }
      if (statusFilter === 'trial') {
        return t.plan_status === 'trial' && !isExp
      }
      if (statusFilter === 'expired') {
        return isExp && !t.is_origin
      }
      if (statusFilter === 'suspended') {
        return t.plan_status === 'suspended' || t.plan_status === 'canceled'
      }

      return true
    })
  }, [tenants, search, statusFilter])

  // Ação de Impersonação (Entrar no painel do cliente como se fosse ele)
  const handleImpersonate = (tenant: Tenant) => {
    setSelectedAdminTenantId(tenant.id)
    localStorage.setItem('admin_selected_tenant_id', tenant.id)
    localStorage.setItem('master_impersonating_from', 'true')
    toast({
      title: `Acessando instância: ${tenant.name}`,
      description: 'Você está no painel gerencial desta locadora.',
    })
    navigate('/admin/dashboard')
  }

  // Renovação rápida +30 dias
  const handleQuickRenew = async (tenant: Tenant) => {
    try {
      await quickRenew30Days(tenant, user?.name || 'Master')
      toast({
        title: 'Renovação rápida +30d aplicada!',
        description: `Validade de ${tenant.name} foi estendida em 30 dias.`,
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro na renovação',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Excluir licença
  const handleDeleteTenant = async (tenant: Tenant) => {
    if (tenant.is_origin) {
      alert('A instância de origem (Hospital Home) é protegida e não pode ser excluída.')
      return
    }

    const confirmName = prompt(
      `ATENÇÃO: A exclusão da licença removerá os dados vinculados.\nDigite o nome da empresa "${tenant.name}" para confirmar a exclusão:`,
    )
    if (confirmName !== tenant.name) {
      if (confirmName !== null) alert('Nome incorreto. Exclusão cancelada.')
      return
    }

    try {
      await deleteTenant(tenant.id)
      toast({ title: 'Licença excluída com sucesso!' })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir licença',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Excluir plano comercial
  const handleDeletePlan = async (plan: Plan) => {
    if (plan.is_master_exclusive) {
      alert('O Plano Master exclusivo não pode ser excluído.')
      return
    }
    if (!confirm(`Deseja realmente excluir o plano "${plan.name}"?`)) return

    try {
      await deletePlan(plan.id)
      toast({ title: 'Plano excluído com sucesso!' })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir plano',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR')
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* 1. HEADER ESCURO GLOBAL COND PACK */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">CondPack</span>
                <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  MASTER MULTI-TENANT
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Painel de Administração Global</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Perfil Master */}
            <button
              onClick={() => setMasterProfileModalOpen(true)}
              className="text-right hidden sm:block hover:bg-slate-900 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-slate-800"
              title="Clique para editar seu perfil Master, e-mail e senha"
            >
              <div className="text-xs font-bold text-white flex items-center justify-end gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Admin Master
              </div>
              <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                {user?.email || 'marceloslepre@gmail.com'}
              </div>
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/dashboard')}
              className="bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800 hover:text-white h-9 px-3 gap-1.5 text-xs font-semibold"
            >
              <span>Ir ao Painel Gerencial</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800 hover:text-white h-9 px-3 gap-1.5 text-xs font-semibold"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Atualizar</span>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => signOut()}
              className="bg-red-600/90 hover:bg-red-600 text-white h-9 px-3 gap-1.5 text-xs font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 2. CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* GERADOR DE LINK DE PRIMEIRO CADASTRO /cadastro */}
        <OnboardingLinkGenerator plans={plans} />

        {/* PAINEL MASTER DE OPERAÇÕES + CARDS DE MÉTRICAS */}
        <div className="bg-slate-900 rounded-xl p-6 text-white border border-slate-800 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Painel Master de Operações
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Gestão completa de locadoras, planos comerciais e controle total de licenças. Edite
                limites específicos de cada cliente, altere prazos de validade, pause, reative ou
                substitua planos em tempo real.
              </p>
            </div>

            {/* Metric counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3 text-center min-w-[95px]">
                <div className="text-[11px] font-medium text-slate-400">Locadoras</div>
                <div className="text-xl font-black text-indigo-400 mt-0.5">
                  {metrics.totalTenants}
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3 text-center min-w-[95px]">
                <div className="text-[11px] font-medium text-slate-400">Licenças Ativas</div>
                <div className="text-xl font-black text-emerald-400 mt-0.5">
                  {metrics.activeLicenses}
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3 text-center min-w-[95px]">
                <div className="text-[11px] font-medium text-slate-400">Expiradas</div>
                <div className="text-xl font-black text-red-400 mt-0.5">
                  {metrics.expiredLicenses}
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3 text-center min-w-[95px]">
                <div className="text-[11px] font-medium text-slate-400">Planos</div>
                <div className="text-xl font-black text-amber-400 mt-0.5">{metrics.totalPlans}</div>
              </div>
            </div>
          </div>

          {/* Subcard de MRR e Trial */}
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-slate-300">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>MRR Total Ativo:</span>
                <strong className="text-white text-sm">
                  R$ {metrics.totalMRR.toFixed(2).replace('.', ',')}/mês
                </strong>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Clientes em Trial:</span>
                <strong className="text-white text-sm">{metrics.trialLicenses}</strong>
              </div>
            </div>

            <div className="text-[11px] text-slate-400">
              * Cobrança comercial gerenciada manualmente pelo Master.
            </div>
          </div>
        </div>

        {/* TABS E AÇÕES GERAIS */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Tabs
            value={activeTab}
            onValueChange={(val: any) => setActiveTab(val)}
            className="w-full sm:w-auto"
          >
            <TabsList className="bg-white border shadow-sm">
              <TabsTrigger value="licenses" className="gap-2 text-xs font-semibold">
                <Building2 className="w-4 h-4" />
                Licenças de Clientes ({tenants.length})
              </TabsTrigger>
              <TabsTrigger value="plans" className="gap-2 text-xs font-semibold">
                <Layers className="w-4 h-4" />
                Catálogo de Planos ({plans.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {activeTab === 'licenses' ? (
              <Button
                onClick={() => setNewLicenseModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 h-9 shadow-sm"
              >
                <Plus className="w-4 h-4" />+ Nova Licença
              </Button>
            ) : (
              <Button
                onClick={() => setPlanModalData({ plan: null, open: true })}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 h-9 shadow-sm"
              >
                <Plus className="w-4 h-4" />+ Novo Plano
              </Button>
            )}
          </div>
        </div>

        {/* CONTEÚDO TAB LICENÇAS */}
        {activeTab === 'licenses' && (
          <div className="space-y-4">
            {/* Barra de Busca e Filtros de Status */}
            <div className="bg-white p-3 rounded-lg border shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <Input
                  placeholder="Buscar por cliente, CNPJ, plano ou ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-gray-500 mr-1 uppercase tracking-wider">
                  STATUS:
                </span>
                <Button
                  size="sm"
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('all')}
                  className={`h-7 text-xs px-2.5 ${
                    statusFilter === 'all' ? 'bg-indigo-600 text-white' : ''
                  }`}
                >
                  Todos ({tenants.length})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'active' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('active')}
                  className={`h-7 text-xs px-2.5 ${
                    statusFilter === 'active' ? 'bg-indigo-600 text-white' : ''
                  }`}
                >
                  Ativas ({metrics.activeLicenses})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'trial' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('trial')}
                  className={`h-7 text-xs px-2.5 ${
                    statusFilter === 'trial' ? 'bg-indigo-600 text-white' : ''
                  }`}
                >
                  Trial ({metrics.trialLicenses})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'expired' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('expired')}
                  className={`h-7 text-xs px-2.5 ${
                    statusFilter === 'expired'
                      ? 'bg-red-600 text-white'
                      : 'text-red-600 border-red-200 hover:bg-red-50'
                  }`}
                >
                  Expiradas ({metrics.expiredLicenses})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'suspended' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('suspended')}
                  className={`h-7 text-xs px-2.5 ${
                    statusFilter === 'suspended' ? 'bg-amber-600 text-white' : ''
                  }`}
                >
                  Pausadas
                </Button>
              </div>
            </div>

            {/* TABELA DE LICENÇAS */}
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50 text-[11px] uppercase tracking-wider">
                  <TableRow>
                    <TableHead className="w-[120px]">Número / ID</TableHead>
                    <TableHead>Cliente (Empresa)</TableHead>
                    <TableHead>Plano Contratado</TableHead>
                    <TableHead>Limites Efetivos</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Expiração / Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {filteredTenants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-gray-400">
                        Nenhuma licença encontrada para os filtros aplicados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTenants.map((t) => {
                      const now = new Date().getTime()
                      const isExp = t.expiration_date
                        ? new Date(t.expiration_date).getTime() < now
                        : false

                      const planName =
                        t.expand?.plan?.name || (t.is_origin ? 'Plano Master' : 'Básico')
                      const isConnected = t.whatsapp_status === 'connected'

                      return (
                        <TableRow key={t.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* ID */}
                          <TableCell className="font-mono text-[11px] text-gray-500">
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded border">{t.id}</span>
                          </TableCell>

                          {/* Cliente */}
                          <TableCell>
                            <div className="font-bold text-gray-900 flex items-center gap-1.5">
                              {t.name}
                              {t.is_origin && (
                                <span className="bg-red-100 text-red-700 text-[9px] font-bold px-1.5 py-0.2 rounded border border-red-300">
                                  ORIGEM
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {t.document_cnpj ? `CNPJ: ${t.document_cnpj}` : `slug: ${t.slug}`}
                            </div>
                          </TableCell>

                          {/* Plano */}
                          <TableCell>
                            <div className="font-semibold text-gray-800">{planName}</div>
                            {t.is_origin && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.2 rounded">
                                Master
                              </span>
                            )}
                          </TableCell>

                          {/* Limites Efetivos */}
                          <TableCell className="text-gray-600 text-[11px]">
                            <div>
                              Usuários:{' '}
                              <strong>
                                {t.effective_user_limit && t.effective_user_limit > 50000
                                  ? 'Ilimitado'
                                  : t.effective_user_limit || 200}
                              </strong>
                            </div>
                            <div>
                              Unidades:{' '}
                              <strong>
                                {t.effective_unit_limit && t.effective_unit_limit > 50000
                                  ? 'Ilimitado'
                                  : t.effective_unit_limit || 50}
                              </strong>
                            </div>
                          </TableCell>

                          {/* Valor */}
                          <TableCell className="font-semibold text-gray-800">
                            {t.effective_value === 0 || t.is_origin ? (
                              <span className="text-emerald-700">Isento</span>
                            ) : (
                              `R$ ${(t.effective_value ?? 0).toFixed(2).replace('.', ',')}/mês`
                            )}
                          </TableCell>

                          {/* Expiração */}
                          <TableCell>
                            <div className="flex items-center gap-1 text-gray-700">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span>{formatDate(t.expiration_date)}</span>
                            </div>
                            {isExp && !t.is_origin && (
                              <span className="text-[10px] text-red-600 font-bold">Vencido</span>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            {isExp && !t.is_origin ? (
                              <Badge
                                variant="destructive"
                                className="text-[10px] uppercase font-bold"
                              >
                                Expirada
                              </Badge>
                            ) : t.plan_status === 'suspended' ? (
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300 text-[10px]">
                                Pausada
                              </Badge>
                            ) : t.plan_status === 'canceled' ? (
                              <Badge variant="destructive" className="text-[10px]">
                                Cancelada
                              </Badge>
                            ) : t.plan_status === 'trial' ? (
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300 text-[10px]">
                                Trial
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-300 text-[10px]">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Ativa
                              </Badge>
                            )}
                          </TableCell>

                          {/* WhatsApp */}
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {isConnected ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  Conectado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                  Desconectado
                                </span>
                              )}
                            </div>
                            {t.phone && (
                              <div className="text-[10px] text-gray-400 mt-0.5">{t.phone}</div>
                            )}
                          </TableCell>

                          {/* Ações */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botão de Renovação Rápida +30d */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuickRenew(t)}
                                className="h-7 text-[11px] px-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-semibold gap-1"
                                title="Adicionar rapidamente +30 dias de validade a esta licença"
                              >
                                <RotateCw className="w-3 h-3 text-indigo-600" />
                                +30d
                              </Button>

                              {/* Menu ⋮ com todas as ações exigidas */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4 text-gray-600" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 text-xs">
                                  <DropdownMenuLabel className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">
                                    PODERES DA LICENÇA
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />

                                  {/* Impersonar / Entrar no painel do cliente */}
                                  <DropdownMenuItem
                                    onClick={() => handleImpersonate(t)}
                                    className="gap-2 font-semibold text-indigo-600 focus:text-indigo-700 focus:bg-indigo-50 cursor-pointer"
                                  >
                                    <UserCheck className="w-4 h-4" />
                                    Acessar Painel (Impersonar)
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  {/* Histórico de Renovações */}
                                  <DropdownMenuItem
                                    onClick={() => setSelectedTenantForRenewals(t)}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <History className="w-4 h-4 text-gray-500" />
                                    Histórico de Renovações
                                  </DropdownMenuItem>

                                  {/* Editar limites desta licença */}
                                  <DropdownMenuItem
                                    onClick={() => setEditModalData({ tenant: t, type: 'limits' })}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <Sliders className="w-4 h-4 text-gray-500" />
                                    Editar limites desta licença
                                  </DropdownMenuItem>

                                  {/* Editar data de expiração */}
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setEditModalData({ tenant: t, type: 'expiration' })
                                    }
                                    className="gap-2 cursor-pointer"
                                  >
                                    <Calendar className="w-4 h-4 text-gray-500" />
                                    Editar data de expiração
                                  </DropdownMenuItem>

                                  {/* Alterar plano do cliente */}
                                  <DropdownMenuItem
                                    onClick={() => setEditModalData({ tenant: t, type: 'plan' })}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <Layers className="w-4 h-4 text-gray-500" />
                                    Alterar plano do cliente
                                  </DropdownMenuItem>

                                  {/* Pausar / Ativar licença */}
                                  <DropdownMenuItem
                                    onClick={() => setEditModalData({ tenant: t, type: 'status' })}
                                    className="gap-2 cursor-pointer"
                                  >
                                    {t.plan_status === 'suspended' ? (
                                      <>
                                        <PlayCircle className="w-4 h-4 text-emerald-600" />
                                        Reativar licença
                                      </>
                                    ) : (
                                      <>
                                        <PauseCircle className="w-4 h-4 text-amber-600" />
                                        Pausar licença
                                      </>
                                    )}
                                  </DropdownMenuItem>

                                  {/* Editar dados gerais */}
                                  <DropdownMenuItem
                                    onClick={() => setEditModalData({ tenant: t, type: 'general' })}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <Edit className="w-4 h-4 text-gray-500" />
                                    Editar dados gerais
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  {/* Excluir licença */}
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteTenant(t)}
                                    disabled={t.is_origin}
                                    className="gap-2 text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                    Excluir licença
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* CONTEÚDO TAB CATÁLOGO DE PLANOS */}
        {activeTab === 'plans' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const isMaster = plan.is_master_exclusive

                return (
                  <div
                    key={plan.id}
                    className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-bold text-base text-gray-900">{plan.name}</h3>
                          {plan.badge && (
                            <span className="inline-block text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded mt-1">
                              {plan.badge}
                            </span>
                          )}
                        </div>

                        <Badge
                          className={
                            plan.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-300 text-[10px]'
                              : 'bg-gray-100 text-gray-600 text-[10px]'
                          }
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {plan.status === 'active' ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>

                      <p className="text-xs text-gray-500 mt-2 min-h-[36px]">
                        {plan.description || 'Nenhuma descrição informada.'}
                      </p>

                      <div className="my-4 pt-3 border-t border-gray-100 space-y-2 text-xs">
                        <div className="flex items-baseline justify-between">
                          <span className="text-gray-500">Valor Mensal</span>
                          <span className="text-lg font-black text-indigo-600">
                            {plan.is_free || plan.price === 0
                              ? 'Grátis / Master'
                              : `R$ ${plan.price.toFixed(2).replace('.', ',')}`}
                            <span className="text-xs font-normal text-gray-400">/mês</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-gray-600 pt-1">
                          <span>Limite de Unidades:</span>
                          <strong className="text-gray-900">
                            {plan.unit_limit && plan.unit_limit > 50000
                              ? 'Ilimitado'
                              : `${plan.unit_limit || 50} unidades`}
                          </strong>
                        </div>

                        <div className="flex items-center justify-between text-gray-600">
                          <span>Limite de Usuários:</span>
                          <strong className="text-gray-900">
                            {plan.user_limit && plan.user_limit > 50000
                              ? 'Ilimitado'
                              : `${plan.user_limit || 200} usuários`}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPlanModalData({ plan, open: true })}
                        className="h-8 text-xs gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePlan(plan)}
                        disabled={isMaster}
                        className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* MODAIS MASTER */}
      {/* 1. Histórico de Renovações */}
      <RenewalHistoryModal
        tenant={selectedTenantForRenewals}
        open={!!selectedTenantForRenewals}
        onClose={() => setSelectedTenantForRenewals(null)}
        onSuccess={loadData}
        currentUserName={user?.name || 'Master'}
      />

      {/* 2. Edição de Licença (Limites, Expiração, Plano, Status, Dados Gerais) */}
      <EditLicenseModal
        tenant={editModalData?.tenant || null}
        plans={plans}
        type={editModalData?.type || null}
        open={!!editModalData}
        onClose={() => setEditModalData(null)}
        onSuccess={loadData}
      />

      {/* 3. Criar / Editar Plano Comercial */}
      <PlanFormModal
        plan={planModalData.plan}
        open={planModalData.open}
        onClose={() => setPlanModalData({ plan: null, open: false })}
        onSuccess={loadData}
      />

      {/* 4. Nova Licença de Cliente */}
      <NewLicenseModal
        plans={plans}
        open={newLicenseModalOpen}
        onClose={() => setNewLicenseModalOpen(false)}
        onSuccess={loadData}
      />

      {/* 5. Edição do Perfil Master (Nome, E-mail e Senha) */}
      <MasterProfileModal
        user={user}
        open={masterProfileModalOpen}
        onClose={() => setMasterProfileModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  )
}
