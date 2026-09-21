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

  // Form states — SEMPRE inicializam vazios a cada carregamento/mount
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [planId, setPlanId] = useState('')

  // Garante explicitamente que qualquer rascunho de navegador / autofill residual seja limpo no mount
  useEffect(() => {
    setName('')
    setSlug('')
    setEmail('')
    setPassword('')
    setPhone('')
    setCnpj('')
    setPlanId('')

    // Limpa eventuais chaves de rascunho se existirem em storages
    try {
      localStorage.removeItem('onboarding_draft')
      localStorage.removeItem('onboarding_email')
      sessionStorage.removeItem('onboarding_draft')
      sessionStorage.removeItem('onboarding_email')
    } catch {
      /* intentionally ignored */
    }

    getPlans()
      .then((list) => {
        const publicPlans = list.filter((p) => p.status === 'active' && !p.is_master_exclusive)
        setPlans(publicPlans)
        // Se o usuário passou explicitamente ?plano= na URL pelo link de convite, honra o parâmetro
        if (preSelectedPlanId && publicPlans.some((p) => p.id === preSelectedPlanId)) {
          setPlanId(preSelectedPlanId)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPlans(false))
  }, [preSelectedPlanId])

  const handleNameChange = (val: string) => {
    setName(val)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const missingFields: string[] = []
    if (!name.trim()) missingFields.push('Nome da Empresa')
    if (!slug.trim()) missingFields.push('Subdomínio Desejado')
    if (!cnpj.trim()) missingFields.push('CNPJ')
    if (!email.trim()) missingFields.push('E-mail do Administrador')
    if (!phone.trim()) missingFields.push('WhatsApp / Telefone')
    if (!password) missingFields.push('Senha de Acesso')
    if (!planId) missingFields.push('Plano')

    if (missingFields.length > 0) {
      toast({
        title: 'Preencha todos os campos obrigatórios',
        description: `Por favor, preencha: ${missingFields.join(', ')}.`,
        variant: 'destructive',
      })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      toast({
        title: 'E-mail inválido',
        description: 'Por favor, informe um endereço de e-mail válido.',
        variant: 'destructive',
      })
      return
    }

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
    const createdSlug = successData.tenant?.slug || ''
    const publicUrl = `https://nuvvo.sholver.com.br/${createdSlug}`

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Parabéns! Sua conta foi criada</h1>
            <p className="text-xs text-slate-600">
              Sua empresa <strong>{successData.tenant?.name}</strong> já está ativa com 15 dias de
              teste grátis liberados.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs space-y-2.5">
            <div>
              <span className="text-slate-500 block text-[11px]">
                Endereço provisório do seu site:
              </span>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:text-indigo-700 font-mono font-bold underline break-all"
              >
                nuvvo.sholver.com.br/{createdSlug}
              </a>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">E-mail de acesso:</span>
              <strong className="text-slate-800 font-mono">{successData.user?.email}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Status da licença:</span>
              <strong className="text-emerald-600 font-semibold uppercase">
                Trial (15 dias grátis)
              </strong>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => navigate('/admin/login')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 text-xs gap-2 shadow-md shadow-indigo-600/20"
            >
              Acessar Meu Painel Administrativo
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(publicUrl, '_blank')}
              className="w-full text-xs h-10 border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Visualizar Meu Site Público
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const selectedPlan = plans.find((p) => p.id === planId)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Header com estilo clean */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="font-extrabold text-base sm:text-lg text-slate-900">
              Site institucional para Leads e whatsapp
            </span>
          </div>

          <Link
            to="/admin/login"
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 px-3.5 py-1.5 rounded-lg border border-slate-300 shadow-sm transition-colors"
          >
            Já tenho conta
          </Link>
        </div>
      </header>

      {/* Hero Form — Layout leve e clean */}
      <main className="max-w-3xl w-full mx-auto p-4 sm:p-6 my-6 sm:my-10 space-y-6">
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            15 Dias de Teste Grátis — Sem cartão de crédito
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Crie a conta da sua Empresa.
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Comece em minutos com catálogo de produtos, controle de pedidos, integração com WhatsApp
            e painel completo de gestão.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          autoComplete="off"
          className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl shadow-slate-200/50"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-800 block mb-1.5">Nome da Empresa</label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                autoComplete="off"
                placeholder="Ex: Minha Empresa Locações"
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-10 text-xs focus-visible:ring-indigo-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1.5">
                Subdomínio Desejado
              </label>
              {/* ORDEM INVERTIDA: Prefixo do domínio padrão à esquerda e input do slug à direita */}
              <div className="flex items-center rounded-md border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
                <span className="bg-slate-100 border-r border-slate-300 text-slate-600 font-mono px-3 h-10 flex items-center text-[11px] font-medium shrink-0 select-none">
                  nuvvo.sholver.com.br/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  required
                  autoComplete="off"
                  placeholder="minhaempresa"
                  className="w-full bg-white text-slate-900 placeholder:text-slate-400 h-10 px-3 text-xs font-mono outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                URL provisória:{' '}
                <strong className="text-indigo-600 font-mono">
                  nuvvo.sholver.com.br/{slug || 'empresa'}
                </strong>
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1.5">CNPJ</label>
              <Input
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                required
                autoComplete="off"
                placeholder="00.000.000/0000-00"
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-10 text-xs focus-visible:ring-indigo-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1.5">
                E-mail do Administrador
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="seuemail@empresa.com"
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-10 text-xs focus-visible:ring-indigo-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1.5">
                WhatsApp / Telefone
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="off"
                placeholder="(00) 00000-0000"
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-10 text-xs focus-visible:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-800 block mb-1.5">
                Senha de Acesso ao Painel (mínimo 8 caracteres)
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-10 text-xs focus-visible:ring-indigo-500"
              />
            </div>

            {/* SELEÇÃO DE PLANO */}
            <div className="sm:col-span-2 pt-3 border-t border-slate-200">
              <label className="font-semibold text-slate-800 block mb-2.5 flex items-center justify-between">
                <span>Escolha seu Plano para após os 15 dias de teste:</span>
                {selectedPlan && (
                  <span className="text-indigo-600 font-bold">
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
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{p.name}</span>
                        {p.badge && (
                          <span className="text-[9px] bg-indigo-100 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-semibold">
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-black text-indigo-600 mt-1.5">
                        R$ {p.price.toFixed(2).replace('.', ',')}
                        <span className="text-[10px] text-slate-500 font-normal">/mês</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {(p.product_limit ?? p.user_limit) &&
                        (p.product_limit ?? p.user_limit ?? 0) < 99999
                          ? `Até ${p.product_limit ?? p.user_limit} produtos`
                          : 'Produtos ilimitados'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 text-sm shadow-lg shadow-indigo-600/20 gap-2 transition-colors"
            >
              {submitting ? 'Criando conta...' : 'Começar Meus 15 Dias de Teste Grátis'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-center text-[11px] text-slate-500 pt-1 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cancelamento a qualquer momento. Sem fidelidade nem letras miúdas.</span>
          </p>
        </form>
      </main>

      {/* Footer Clean */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white">
        © {new Date().getFullYear()} Plataforma Multi-Tenant • Todos os direitos reservados.
      </footer>
    </div>
  )
}
