import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import {
  Brain,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  Mail,
  User,
  AlertCircle,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  Users,
  Gift,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getPlanConfig, type PlanId } from "@/lib/plans"
import toast from "react-hot-toast"

export function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const planParam = (searchParams.get("plano") || searchParams.get("plan") || "individual").toLowerCase() as PlanId
  const targetPlan = getPlanConfig(planParam)

  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()

    const errs: Record<string, string> = {}
    const cleanEmail = form.email.trim().toLowerCase()

    if (!form.full_name.trim()) errs.full_name = "Informe seu nome completo"
    if (!cleanEmail) errs.email = "Informe seu melhor e-mail"
    else if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) errs.email = "E-mail inválido"

    if (!form.password) errs.password = "Crie uma senha"
    else if (form.password.length < 6) errs.password = "Mínimo de 6 caracteres"

    if (form.password !== form.confirm_password) {
      errs.confirm_password = "As senhas digitadas não coincidem"
    }

    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)

    try {
      // 1. Verificar se já comprou na Hotmart previamente
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("*")
        .ilike("customer_email", cleanEmail)
        .order("created_at", { ascending: false })
        .limit(1)

      const existingSub = subData && subData.length > 0 ? subData[0] : null
      const isAlreadyPaid = existingSub && existingSub.status === "active"

      // 2. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: form.password,
        options: {
          data: {
            full_name: form.full_name,
            role: "master",
          },
        },
      })

      if (authError) {
        if (
          authError.message.includes("already registered") ||
          authError.message.includes("User already registered")
        ) {
          throw new Error("Este e-mail já possui uma conta criada. Faça login com sua senha.")
        }
        throw authError
      }

      if (!authData.user) throw new Error("Não foi possível criar o usuário.")

      const userId = authData.user.id

      // 3. Garantir login ativo
      if (!authData.session) {
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: form.password,
        })
      }

      // Definir plano e status
      const assignedPlanId = isAlreadyPaid ? existingSub.plan_id : targetPlan.id
      const assignedMaxProfs = isAlreadyPaid ? existingSub.max_professionals : targetPlan.maxProfessionals
      const assignedStatus = isAlreadyPaid ? "active" : "trial"
      const trialExpiresAt = isAlreadyPaid
        ? null
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

      // 4. Criar perfil inicial de Master
      const { error: profileError } = await supabase.from("professionals").upsert({
        id: userId,
        full_name: form.full_name,
        email: cleanEmail,
        role: "master",
        is_active: true,
        specialty: "Psicopedagogia Clínica",
        bio: `[PLAN:${assignedPlanId}:${assignedStatus}]`,
      })

      if (profileError) throw profileError

      // 5. Vincular ou criar registro de assinatura
      if (existingSub) {
        await supabase
          .from("subscriptions")
          .update({
            master_user_id: userId,
            updated_at: new Date().toISOString(),
          })
          .ilike("customer_email", cleanEmail)
      } else {
        await supabase.from("subscriptions").insert({
          master_user_id: userId,
          plan_id: assignedPlanId,
          max_professionals: assignedMaxProfs,
          status: "trial",
          customer_email: cleanEmail,
          subscription_started_at: new Date().toISOString(),
          subscription_expires_at: trialExpiresAt,
        })
      }

      const planConfig = getPlanConfig(assignedPlanId)
      if (isAlreadyPaid) {
        toast.success(`Bem-vinda ao EvoluIA! Plano ${planConfig.name} ativado 🎉`, { duration: 5000 })
      } else {
        toast.success(
          `Conta criada com sucesso! 14 dias de teste grátis no plano ${planConfig.name} liberados 🎉`,
          { duration: 5000 }
        )
      }
      navigate("/dashboard")
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Erro ao criar conta. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F7F8] flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl sm:rounded-[32px] border border-[#E2E8F0] shadow-xl p-6 sm:p-8 relative overflow-hidden">
        {/* Header com Logo */}
        <div className="flex items-center justify-between pb-5 border-b border-[#EEF2F6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#7C3AED] flex items-center justify-center text-white shadow-md">
              <Brain className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0D2329] leading-none">
                Evolu<span className="text-[#7C3AED]">IA</span>
              </h2>
              <p className="text-[11px] font-semibold text-[#6B7C83] mt-0.5">Criar Conta</p>
            </div>
          </div>

          <Link
            to="/login"
            className="text-xs font-bold text-[#7C3AED] hover:text-[#5B21B6] flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Fazer Login</span>
          </Link>
        </div>

        {/* Card Destacado: 14 Dias Grátis do Plano Selecionado */}
        <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-[#EDE9FE] to-[#E0E7FF] border-2 border-[#DDD6FE] space-y-1 text-center shadow-2xs">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#7C3AED] text-[11px] font-black shadow-2xs">
            <Gift className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>14 Dias Grátis · Sem Cartão</span>
          </div>
          <h3 className="text-sm font-black text-[#4338CA] pt-1">
            Plano {targetPlan.name}
          </h3>
          <p className="text-[11px] font-semibold text-[#6366F1] flex items-center justify-center gap-1.5">
            <Users className="w-3 h-3" />
            <span>
              {targetPlan.maxProfessionals === 1
                ? "1 Vaga Profissional"
                : `Até ${targetPlan.maxProfessionals} Vagas para sua Equipe`}
            </span>
            <span>•</span>
            <span>Acesso Completo</span>
          </p>
        </div>

        {/* Título & Subtítulo */}
        <div className="pt-4 pb-3 text-center">
          <h1 className="text-lg sm:text-xl font-black text-[#0D2329] tracking-tight">Comece seu Teste Gratuito</h1>
          <p className="text-xs font-semibold text-[#6B7C83] mt-0.5">
            Cadastre-se e use 100% do sistema pelos próximos 14 dias.
          </p>
        </div>

        {/* FORMULÁRIO (NOME, EMAIL, SENHA E CONFIRMAÇÃO DE SENHA) */}
        <form onSubmit={handleRegister} className="space-y-3.5">
          {/* 1. Nome Completo */}
          <div className="space-y-1">
            <label className="text-xs font-black text-[#0D2329] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>Seu Nome Completo</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Priscila Carbone"
              value={form.full_name}
              onChange={(e) => handleChange("full_name", e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs placeholder:text-[#8CAAB1]"
            />
            {errors.full_name && (
              <p className="text-[11px] font-bold text-[#DC2626]">{errors.full_name}</p>
            )}
          </div>

          {/* 2. E-mail */}
          <div className="space-y-1">
            <label className="text-xs font-black text-[#0D2329] flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>Seu Melhor E-mail</span>
            </label>
            <input
              type="email"
              required
              placeholder="seu.email@exemplo.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs placeholder:text-[#8CAAB1]"
            />
            {errors.email && <p className="text-[11px] font-bold text-[#DC2626]">{errors.email}</p>}
          </div>

          {/* 3. Criar Senha */}
          <div className="space-y-1">
            <label className="text-xs font-black text-[#0D2329] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>Crie sua Senha</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Mínimo 6 dígitos"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className="w-full px-4 py-2.5 pr-10 rounded-2xl border border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs placeholder:text-[#8CAAB1]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8CAAB1] hover:text-[#0D2329]"
                title={showPassword ? "Ocultar senha" : "Ver senha"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] font-bold text-[#DC2626]">{errors.password}</p>
            )}
          </div>

          {/* 4. Confirmar Senha */}
          <div className="space-y-1">
            <label className="text-xs font-black text-[#0D2329] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>Confirmar Senha</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                placeholder="Repita sua senha"
                value={form.confirm_password}
                onChange={(e) => handleChange("confirm_password", e.target.value)}
                className="w-full px-4 py-2.5 pr-10 rounded-2xl border border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs placeholder:text-[#8CAAB1]"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8CAAB1] hover:text-[#0D2329]"
                title={showConfirmPassword ? "Ocultar senha" : "Ver senha"}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirm_password && (
              <p className="text-[11px] font-bold text-[#DC2626]">{errors.confirm_password}</p>
            )}
          </div>

          {/* Botão de Criação de Conta */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Criando seu Consultório...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Iniciar 14 Dias Grátis Agora</span>
              </>
            )}
          </button>

          {/* Rodapé Informativo */}
          <div className="pt-2 text-center space-y-1">
            <p className="text-[11px] font-semibold text-[#8CAAB1]">
              🔒 Sem cartão de crédito · Sem pegadinhas · Cancele a qualquer momento.
            </p>
            <p className="text-[10px] text-[#8CAAB1]">
              Deseja outro plano?{" "}
              <Link to="/planos" className="text-[#7C3AED] font-bold hover:underline">
                Ver todos os planos
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

