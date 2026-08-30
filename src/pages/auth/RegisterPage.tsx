import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
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
  CheckCircle2,
  ArrowLeft,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getPlanConfig } from "@/lib/plans"
import toast from "react-hot-toast"

export function RegisterPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [purchaseNotFound, setPurchaseNotFound] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
    if (field === "email") setPurchaseNotFound(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setPurchaseNotFound(false)

    const errs: Record<string, string> = {}
    const cleanEmail = form.email.trim().toLowerCase()

    if (!form.full_name.trim()) errs.full_name = "Informe seu nome completo"
    if (!cleanEmail) errs.email = "Informe seu e-mail de compra"
    else if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) errs.email = "E-mail inválido"

    if (!form.password) errs.password = "Crie uma senha"
    else if (form.password.length < 6) errs.password = "Mínimo de 6 caracteres"

    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)

    try {
      // 1. 🔒 TRAVA ZERO-TRUST: Verificar se comprou na Hotmart
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .ilike("customer_email", cleanEmail)
        .order("created_at", { ascending: false })
        .limit(1)

      if (subError) throw subError

      const sub = subData && subData.length > 0 ? subData[0] : null

      // Se não houver compra aprovada para este e-mail
      if (!sub || (sub.status !== "active" && sub.status !== "trial")) {
        setPurchaseNotFound(true)
        setLoading(false)
        return
      }

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

      // 4. Criar perfil inicial de Master
      const { error: profileError } = await supabase.from("professionals").upsert({
        id: userId,
        full_name: form.full_name,
        email: cleanEmail,
        role: "master",
        is_active: true,
        specialty: "Psicopedagogia Clínica",
      })

      if (profileError) throw profileError

      // 5. Vincular assinatura da Hotmart ao novo Master
      await supabase
        .from("subscriptions")
        .update({
          master_user_id: userId,
          updated_at: new Date().toISOString(),
        })
        .ilike("customer_email", cleanEmail)

      const planConfig = getPlanConfig(sub.plan_id)
      toast.success(`Bem-vinda ao EvoluIA! Plano ${planConfig.name} ativado 🎉`, { duration: 5000 })
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
              <p className="text-[11px] font-semibold text-[#6B7C83] mt-0.5">Primeiro Acesso</p>
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

        {/* Título & Subtítulo */}
        <div className="pt-5 pb-4 text-center">
          <h1 className="text-xl font-black text-[#0D2329] tracking-tight">Ativar sua Conta</h1>
          <p className="text-xs font-semibold text-[#6B7C83] mt-1">
            Preencha seus dados para liberar seu acesso ao sistema.
          </p>
        </div>

        {/* FORMULÁRIO ULTRA SIMPLES (1 ÚNICA TELA: NOME, EMAIL, SENHA) */}
        <form onSubmit={handleRegister} className="space-y-4">
          {/* Alerta de Compra Não Encontrada na Hotmart */}
          {purchaseNotFound && (
            <div className="p-4 rounded-2xl bg-[#FEF2F2] border-2 border-[#FECACA] space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black text-[#991B1B]">Compra Não Identificada</h3>
                  <p className="text-[11px] font-semibold text-[#B91C1C] leading-relaxed">
                    O e-mail <strong>{form.email}</strong> não possui uma assinatura na Hotmart. Use
                    o mesmo e-mail do pagamento.
                  </p>
                </div>
              </div>

              <div className="pt-1 flex flex-col gap-2">
                <a
                  href="https://pay.hotmart.com/L107381113V?off=imn95wux"
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black text-center flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <span>Adquirir Plano na Hotmart</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* 1. Nome Completo */}
          <div className="space-y-1.5">
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
              className="w-full px-4 py-3 rounded-2xl border border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs placeholder:text-[#8CAAB1]"
            />
            {errors.full_name && (
              <p className="text-[11px] font-bold text-[#DC2626]">{errors.full_name}</p>
            )}
          </div>

          {/* 2. E-mail de Compra */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#0D2329] flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>E-mail da Compra (Hotmart)</span>
            </label>
            <input
              type="email"
              required
              placeholder="mesmo.email@comprado.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs placeholder:text-[#8CAAB1]"
            />
            {errors.email && <p className="text-[11px] font-bold text-[#DC2626]">{errors.email}</p>}
          </div>

          {/* 3. Criar Senha */}
          <div className="space-y-1.5">
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
                className="w-full px-4 py-3 pr-10 rounded-2xl border border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs placeholder:text-[#8CAAB1]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8CAAB1] hover:text-[#0D2329]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] font-bold text-[#DC2626]">{errors.password}</p>
            )}
          </div>

          {/* Botão de Criação de Conta */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Validando e Ativando...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Ativar Minha Conta & Entrar</span>
              </>
            )}
          </button>

          {/* Rodapé Informativo */}
          <div className="pt-2 text-center">
            <p className="text-[11px] font-semibold text-[#8CAAB1]">
              Os dados do seu consultório e logo podem ser personalizados a qualquer momento nas{" "}
              <strong>Configurações</strong> do sistema.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
