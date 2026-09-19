import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Building2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Lock,
  Mail,
  User,
  Phone,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import pb from '@/lib/pocketbase/client'
import { Plan } from '@/types/tenant'
import { getPlans } from '@/services/tenants'

export default function PublicOnboarding() {
  const [searchParams] = useSearchParams()
  const preSelectedPlanId = searchParams.get('plano')
  const navigate = useNavigate()

  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [successData, setSuccessData] = useState<any | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [planId, setPlanId] = useState(preSelectedPlanId || '')

  useEffect(() => {
    getPlans()
      .then((list) => {
        const publicPlans = list.filter((p) => p.status === 'active' && !p.is_master_exclusive)
        setPlans(publicPlans)
        if (preSelectedPlanId && publicPlans.some((p) => p.id === preSelectedPlanId)) {
          setPlanId(preSelectedPlanId)
        } else if (publicPlans.length > 0) {
          setPlanId(publicPlans[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPlans(false))
  }, [preSelectedPlanId])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'Sua senha deve conter pelo menos 8 dígitos.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const res = await pb.send('/backend/v1/public/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim(),
          cnpj: cnpj.trim(),
          plan_id: planId,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      setSuccessData(res)
      toast({
        title: 'Cadastro concluído com sucesso!',
        description: 'Sua conta de teste de 15 dias está pronta.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro no cadastro',
        description: err.message || 'Não foi possível concluir o cadastro.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (successData) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Parabéns! Sua conta foi criada</h1>
            <p className="text-xs text-slate-400">
              Sua locadora <strong>{successData.tenant?.name}</strong> já está ativa com 15 dias de
              teste grátis liberados.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 text-left text-xs space-y-2 font-mono">
            <div>
              <span className="text-slate-400">Subdomínio:</span>{' '}
              <strong className="text-indigo-400">{successData.tenant?.slug}</strong>
            </div>
            <div>
              <span className="text-slate-400">E-mail:</span>{' '}
              <strong className="text-white">{successData.user?.email}</strong>
            </div>
            <div>
              <span className="text-slate-400">Status:</span>{' '}
              <strong className="text-emerald-400 uppercase">Trial (15 dias grátis)</strong>
            </div>
          </div>

          <Button
            onClick={() => navigate('/admin/login')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 text-xs gap-2"
          >
            Acessar Meu Painel Administrativo
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )
  }

  const selectedPlan = plans.find((p) => p.id === planId)

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-500" />
            <span className="font-extrabold text-lg text-white">Plataforma de Locação</span>
          </div>

          <Link
            to="/admin/login"
            className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
          >
            Já tenho conta
          </Link>
        </div>
      </header>

      {/* Hero Form */}
      <main className="max-w-3xl w-full mx-auto p-4 sm:p-6 my-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            15 Dias de Teste Grátis — Sem cartão de crédito
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Crie a conta da sua Empresa.
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            Comece em minutos com catálogo de produtos, controle de pedidos, integração com WhatsApp
            e painel completo de gestão.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-200 block mb-1">
                Nome da Locadora / Empresa
              </label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Aluguel Festas & Cia"
                required
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 h-10 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-200 block mb-1">Subdomínio Desejado</label>
              <div className="flex items-center">
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="minhalocadora"
                  required
                  className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 h-10 text-xs rounded-r-none font-mono"
                />
                <span className="bg-slate-800 border border-l-0 border-slate-700 text-slate-400 px-3 h-10 flex items-center text-[11px] rounded-r-md">
                  .sholver.com.br
                </span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-200 block mb-1">CNPJ (Opcional)</label>
              <Input
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 h-10 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-200 block mb-1">
                E-mail do Administrador
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@minhalocadora.com"
                required
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 h-10 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-200 block mb-1">WhatsApp / Telefone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(27) 99999-9999"
                required
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 h-10 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-200 block mb-1">
                Senha de Acesso ao Painel (mínimo 8 caracteres)
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Crie uma senha segura"
                required
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 h-10 text-xs"
              />
            </div>

            {/* SELEÇÃO DE PLANO */}
            <div className="sm:col-span-2 pt-2 border-t border-slate-800">
              <label className="font-semibold text-slate-200 block mb-2 flex items-center justify-between">
                <span>Escolha seu Plano para após os 15 dias de teste:</span>
                {selectedPlan && (
                  <span className="text-indigo-400 font-bold">
                    R$ {selectedPlan.price.toFixed(2).replace('.', ',')}/mês
                  </span>
                )}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {plans.map((p) => {
                  const isSelected = p.id === planId
                  return (
                    <div
                      key={p.id}
                      onClick={() => setPlanId(p.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-600/10 border-indigo-500 shadow-md shadow-indigo-950'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{p.name}</span>
                        {p.badge && (
                          <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-semibold">
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-black text-indigo-400 mt-1">
                        R$ {p.price.toFixed(2).replace('.', ',')}
                        <span className="text-[10px] text-slate-500 font-normal">/mês</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Até {p.unit_limit} unidades • {p.user_limit} usuários
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 text-sm shadow-lg shadow-indigo-900/40 gap-2"
            >
              {submitting ? 'Criando conta...' : 'Começar Meus 15 Dias de Teste Grátis'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-center text-[11px] text-slate-500 pt-2 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cancelamento a qualquer momento. Sem fidelidade nem letras miúdas.</span>
          </p>
        </form>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Plataforma Multi-Tenant • Todos os direitos reservados.
      </footer>
    </div>
  )
}
