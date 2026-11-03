import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Building2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import pb from '@/lib/pocketbase/client'
import { Plan } from '@/types/tenant'
import { getPlans } from '@/services/tenants'
import {
  ensureSholverPixelLoaded,
  getPlanTrackingInfo,
  trackSholverInitiateCheckout,
  trackSholverSuccessfulRegistration,
} from '@/lib/nuvvo-pixel'
import {
  ensureNuvvoGoogleAdsLoaded,
  getNuvvoPlanValue,
  trackNuvvoAdsConversion,
} from '@/lib/nuvvo-google-ads'
import { maskCpfOrCnpj, validateCpfOrCnpj } from '@/lib/document-validation'

export default function PublicOnboarding() {
  const [searchParams] = useSearchParams()
  const preSelectedPlanId = searchParams.get('plano')
  const navigate = useNavigate()

  const [plans, setPlans] = useState<Plan[]>([])
  const [, setLoadingPlans] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [successData, setSuccessData] = useState<any | null>(null)

  // Form states — SEMPRE inicializam vazios a cada carregamento/mount
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [planId, setPlanId] = useState('')

  // Erros por campo individual
  const [errors, setErrors] = useState<{
    name?: string
    slug?: string
    cnpj?: string
    email?: string
    phone?: string
    password?: string
    planId?: string
  }>({})

  // Refs para cada campo para scroll suave ao primeiro erro
  const fieldRefs = {
    name: useRef<HTMLDivElement>(null),
    slug: useRef<HTMLDivElement>(null),
    cnpj: useRef<HTMLDivElement>(null),
    email: useRef<HTMLDivElement>(null),
    phone: useRef<HTMLDivElement>(null),
    password: useRef<HTMLDivElement>(null),
    planId: useRef<HTMLDivElement>(null),
  }

  // Garante explicitamente que qualquer rascunho de navegador / autofill residual seja limpo no mount
  useEffect(() => {
    setName('')
    setSlug('')
    setEmail('')
    setPassword('')
    setPhone('')
    setCnpj('')
    setPlanId('')
    setErrors({})

    // Limpa eventuais chaves de rascunho se existirem em storages
    try {
      localStorage.removeItem('onboarding_draft')
      localStorage.removeItem('onboarding_email')
      sessionStorage.removeItem('onboarding_draft')
      sessionStorage.removeItem('onboarding_email')
    } catch {
      /* intentionally ignored */
    }

    // Carregar Pixel Sholver e Tag Google Ads (AW-18513891486) na página /cadastro
    ensureSholverPixelLoaded()
    ensureNuvvoGoogleAdsLoaded()

    getPlans()
      .then((list) => {
        const publicPlans = list.filter((p) => p.status === 'active' && !p.is_master_exclusive)
        setPlans(publicPlans)
        // Se o usuário passou explicitamente ?plano= na URL pelo link de convite, honra o parâmetro
        if (preSelectedPlanId && publicPlans.some((p) => p.id === preSelectedPlanId)) {
          setPlanId(preSelectedPlanId)
        } else if (publicPlans.length > 0) {
          // Mantém primeiro plano público como padrão se nenhum selecionado
          setPlanId(publicPlans[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPlans(false))
  }, [preSelectedPlanId])

  const selectedPlan = plans.find((p) => p.id === planId) || plans[0]

  const handleNameChange = (val: string) => {
    setName(val)
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }))
    }
    if (val.trim().length > 0) {
      // Dispara UMA VEZ InitiateCheckout ao preencher Nome da Empresa pela primeira vez
      const planInfo = getPlanTrackingInfo(selectedPlan)
      trackSholverInitiateCheckout(planInfo)
    }
  }

  const handleSlugChange = (val: string) => {
    const sanitized = val.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlug(sanitized)
    if (errors.slug) {
      setErrors((prev) => ({ ...prev, slug: undefined }))
    }
  }

  const handleDocumentChange = (val: string) => {
    const masked = maskCpfOrCnpj(val)
    setCnpj(masked)
    if (errors.cnpj) {
      setErrors((prev) => ({ ...prev, cnpj: undefined }))
    }
  }

  const handleEmailChange = (val: string) => {
    setEmail(val)
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }))
    }
  }

  const handlePhoneChange = (val: string) => {
    setPhone(val)
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: undefined }))
    }
  }

  const handlePasswordChange = (val: string) => {
    setPassword(val)
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }))
    }
  }

  const handlePlanSelect = (id: string) => {
    setPlanId(id)
    if (errors.planId) {
      setErrors((prev) => ({ ...prev, planId: undefined }))
    }
  }

  const scrollToFirstError = (newErrors: Record<string, string | undefined>) => {
    const order: Array<keyof typeof fieldRefs> = [
      'name',
      'slug',
      'cnpj',
      'email',
      'phone',
      'password',
      'planId',
    ]
    for (const key of order) {
      if (newErrors[key]) {
        const ref = fieldRefs[key]
        if (ref?.current) {
          ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Focar no input correspondente se existir
          const input = ref.current.querySelector('input, select') as HTMLElement | null
          if (input) {
            setTimeout(() => input.focus(), 250)
          }
        }
        break
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: Record<string, string | undefined> = {}

    // 1. Validações de campos obrigatórios
    if (!name.trim()) {
      newErrors.name = 'Nome da empresa é obrigatório.'
    }

    if (!slug.trim()) {
      newErrors.slug = 'Subdomínio desejado é obrigatório.'
    }

    if (!email.trim()) {
      newErrors.email = 'E-mail do administrador é obrigatório.'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Por favor, informe um e-mail válido.'
      }
    }

    if (!phone.trim()) {
      newErrors.phone = 'WhatsApp / Telefone é obrigatório.'
    }

    if (!password) {
      newErrors.password = 'Senha de acesso é obrigatória.'
    } else if (password.length < 8) {
      newErrors.password = 'Sua senha deve conter pelo menos 8 caracteres.'
    }

    if (!planId) {
      newErrors.planId = 'Selecione um plano para continuar.'
    }

    // 2. Validação do Documento (CPF ou CNPJ) — OPCIONAL
    if (cnpj.trim()) {
      const docValidation = validateCpfOrCnpj(cnpj.trim(), false)
      if (!docValidation.isValid) {
        newErrors.cnpj =
          docValidation.error || 'Documento inválido. Verifique os números digitados.'
      }
    }

    // Se houver erros no cliente, cancela envio e rola até o primeiro erro
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      scrollToFirstError(newErrors)
      toast({
        title: 'Verifique os campos com erro',
        description: 'Corrija os campos destacados em vermelho para continuar.',
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

      // Item 4b: SOMENTE após o backend confirmar que a conta foi criada com sucesso:
      const chosenPlan = plans.find((p) => p.id === planId)
      const planInfo = getPlanTrackingInfo(chosenPlan)
      trackSholverSuccessfulRegistration({
        email: email.trim(),
        phone: phone.trim(),
        planInfo,
      })

      // DISPARO DE CONVERSÃO GOOGLE ADS (AW-18513891486):
      // SOMENTE após backend confirmar criação com sucesso (mesmo momento de CompleteRegistration).
      // Nunca no clique, nunca em erro.
      const tenantId = res?.tenant?.id || res?.user?.id || `nuvvo-${slug.trim().toLowerCase()}`
      const planNumericValue = getNuvvoPlanValue(chosenPlan)
      trackNuvvoAdsConversion({
        transactionId: String(tenantId),
        value: planNumericValue,
      })
    } catch (err: any) {
      const rawMsg = err?.message || 'Não foi possível concluir o cadastro.'
      const lowerMsg = rawMsg.toLowerCase()

      const backendErrors: Record<string, string | undefined> = {}

      // Mapeamento inteligente de erros do backend para os campos correspondentes
      if (
        lowerMsg.includes('subdomínio') ||
        lowerMsg.includes('subdominio') ||
        lowerMsg.includes('endereço') ||
        lowerMsg.includes('endereco') ||
        lowerMsg.includes('slug') ||
        lowerMsg.includes('já está em uso') ||
        lowerMsg.includes('ja esta em uso')
      ) {
        backendErrors.slug = 'Este subdomínio já está em uso. Escolha outro.'
      } else if (
        lowerMsg.includes('e-mail') ||
        lowerMsg.includes('email') ||
        lowerMsg.includes('cadastrado')
      ) {
        backendErrors.email = 'Este e-mail já está cadastrado.'
      } else if (
        lowerMsg.includes('cpf') ||
        lowerMsg.includes('cnpj') ||
        lowerMsg.includes('documento')
      ) {
        backendErrors.cnpj = rawMsg
      } else if (lowerMsg.includes('senha') || lowerMsg.includes('password')) {
        backendErrors.password = rawMsg
      } else if (lowerMsg.includes('nome')) {
        backendErrors.name = rawMsg
      } else if (
        lowerMsg.includes('telefone') ||
        lowerMsg.includes('whatsapp') ||
        lowerMsg.includes('phone')
      ) {
        backendErrors.phone = rawMsg
      }

      if (Object.keys(backendErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...backendErrors }))
        scrollToFirstError(backendErrors)
      }

      toast({
        title: 'Erro no cadastro',
        description: rawMsg,
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
          noValidate
          autoComplete="off"
          className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl shadow-slate-200/50"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* 1. Nome da Empresa */}
            <div className="sm:col-span-2" ref={fieldRefs.name}>
              <label className="font-semibold text-slate-800 block mb-1.5">Nome da Empresa</label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                autoComplete="off"
                placeholder="Ex: Minha Empresa Locações"
                className={`bg-white text-slate-900 placeholder:text-slate-400 h-10 text-xs focus-visible:ring-indigo-500 ${
                  errors.name ? 'border-red-500 focus-visible:ring-red-500' : 'border-slate-300'
                }`}
              />
              {errors.name && (
                <p className="text-red-600 text-[11px] mt-1 font-medium">{errors.name}</p>
              )}
            </div>

            {/* 2. Subdomínio Desejado */}
            <div ref={fieldRefs.slug}>
              <label className="font-semibold text-slate-800 block mb-1.5">
                Subdomínio Desejado
              </label>
              <div
                className={`flex items-center rounded-md border overflow-hidden focus-within:ring-2 focus-within:border-transparent ${
                  errors.slug
                    ? 'border-red-500 focus-within:ring-red-500'
                    : 'border-slate-300 focus-within:ring-indigo-500'
                }`}
              >
                <span className="bg-slate-100 border-r border-slate-300 text-slate-600 font-mono px-3 h-10 flex items-center text-[11px] font-medium shrink-0 select-none">
                  nuvvo.sholver.com.br/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  autoComplete="off"
                  placeholder="minhaempresa"
                  className="w-full bg-white text-slate-900 placeholder:text-slate-400 h-10 px-3 text-xs font-mono outline-none"
                />
              </div>
              {errors.slug ? (
                <p className="text-red-600 text-[11px] mt-1 font-medium">{errors.slug}</p>
              ) : (
                <span className="text-[10px] text-slate-500 mt-1 block">
                  URL provisória:{' '}
                  <strong className="text-indigo-600 font-mono">
                    nuvvo.sholver.com.br/{slug || 'empresa'}
                  </strong>
                </span>
              )}
            </div>

            {/* 3. CNPJ ou CPF (opcional) */}
            <div ref={fieldRefs.cnpj}>
              <label className="font-semibold text-slate-800 block mb-1.5">
                CNPJ ou CPF (opcional)
              </label>
              <Input
                value={cnpj}
                onChange={(e) => handleDocumentChange(e.target.value)}
                autoComplete="off"
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                className={`bg-white text-slate-900 placeholder:text-slate-400 h-10 text-xs focus-visible:ring-indigo-500 ${
                  errors.cnpj ? 'border-red-500 focus-visible:ring-red-500' : 'border-slate-300'
                }`}
              />
              {errors.cnpj && (
                <p className="text-red-600 text-[11px] mt-1 font-medium">{errors.cnpj}</p>
              )}
            </div>

            {/* 4. E-mail do Administrador */}
            <div ref={fieldRefs.email}>
              <label className="font-semibold text-slate-800 block mb-1.5">
                E-mail do Administrador
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                autoComplete="new-password"
                placeholder="seuemail@empresa.com"
                className={`bg-white text-slate-900 placeholder:text-slate-400 h-10 text-xs focus-visible:ring-indigo-500 ${
                  errors.email ? 'border-red-500 focus-visible:ring-red-500' : 'border-slate-300'
                }`}
              />
              {errors.email && (
                <p className="text-red-600 text-[11px] mt-1 font-medium">{errors.email}</p>
              )}
            </div>

            {/* 5. WhatsApp / Telefone (OBRIGATÓRIO) */}
            <div ref={fieldRefs.phone}>
              <label className="font-semibold text-slate-800 block mb-1.5">
                WhatsApp / Telefone
              </label>
              <Input
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                autoComplete="off"
                placeholder="(00) 00000-0000"
                className={`bg-white text-slate-900 placeholder:text-slate-400 h-10 text-xs focus-visible:ring-indigo-500 ${
                  errors.phone ? 'border-red-500 focus-visible:ring-red-500' : 'border-slate-300'
                }`}
              />
              {errors.phone && (
                <p className="text-red-600 text-[11px] mt-1 font-medium">{errors.phone}</p>
              )}
            </div>

            {/* 6. Senha com botão de mostrar/ocultar */}
            <div className="sm:col-span-2" ref={fieldRefs.password}>
              <label className="font-semibold text-slate-800 block mb-1.5">
                Senha de Acesso ao Painel (mínimo 8 caracteres)
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={`bg-white text-slate-900 placeholder:text-slate-400 h-10 text-xs pr-10 focus-visible:ring-indigo-500 ${
                    errors.password
                      ? 'border-red-500 focus-visible:ring-red-500'
                      : 'border-slate-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-700 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-600 text-[11px] mt-1 font-medium">{errors.password}</p>
              )}
            </div>

            {/* 7. SELEÇÃO DE PLANO */}
            <div className="sm:col-span-2 pt-3 border-t border-slate-200" ref={fieldRefs.planId}>
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
                      onClick={() => handlePlanSelect(p.id)}
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
              {errors.planId && (
                <p className="text-red-600 text-[11px] mt-2 font-medium">{errors.planId}</p>
              )}
            </div>
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 text-sm shadow-lg shadow-indigo-600/20 gap-2 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando sua conta...
                </>
              ) : (
                <>
                  Começar Meus 15 Dias de Teste Grátis
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
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
