import { useState, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Brain,
  Upload,
  X,
  Eye,
  EyeOff,
  CheckCircle,
  ShieldCheck,
  Sparkles,
  Lock,
  Mail,
  User,
  Building,
  Phone,
  Award,
  MapPin,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Check,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getPlanConfig } from "@/lib/plans"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import toast from "react-hot-toast"

type Step = 1 | 2 | 3

export function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [verifyingEmail, setVerifyingEmail] = useState(false)
  const [verifiedPlan, setVerifiedPlan] = useState<any>(null)
  const [purchaseNotFound, setPurchaseNotFound] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    full_name: "",
    clinic_name: "",
    email: "",
    password: "",
    confirm_password: "",
    phone: "",
    crp: "",
    specialty: "Psicopedagogia Clínica & Neuroaprendizagem",
    city: "",
    state: "",
    bio: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
    if (field === "email") {
      setPurchaseNotFound(false)
      setVerifiedPlan(null)
    }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB.")
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  // Validação do Passo 1 com verificação na Hotmart
  async function handleVerifyAndProceedStep1() {
    const errs: Record<string, string> = {}
    const cleanEmail = form.email.trim().toLowerCase()

    if (!cleanEmail) errs.email = "E-mail de compra é obrigatório"
    else if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) errs.email = "E-mail inválido"

    if (!form.full_name.trim()) errs.full_name = "Nome completo é obrigatório"
    if (!form.password) errs.password = "Senha é obrigatória"
    else if (form.password.length < 6) errs.password = "Mínimo de 6 caracteres"

    if (form.password !== form.confirm_password) {
      errs.confirm_password = "As senhas não conferem"
    }

    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    // 🔒 TRAVA ZERO-TRUST: Verificar se o e-mail comprou na Hotmart
    setVerifyingEmail(true)
    setPurchaseNotFound(false)

    try {
      // 1. Buscar assinatura correspondente ao e-mail
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .ilike("customer_email", cleanEmail)
        .order("created_at", { ascending: false })
        .limit(1)

      if (subError) throw subError

      const sub = subData && subData.length > 0 ? subData[0] : null

      // Se não comprou ou a compra foi cancelada/reembolsada
      if (!sub || (sub.status !== "active" && sub.status !== "trial")) {
        setPurchaseNotFound(true)
        setVerifyingEmail(false)
        return
      }

      // Compra confirmada!
      const planConfig = getPlanConfig(sub.plan_id)
      setVerifiedPlan({ ...planConfig, subscription: sub })
      toast.success(`Assinatura confirmada: ${planConfig.name}! 🎉`)
      setStep(2)
    } catch (err: any) {
      console.error("Erro ao validar compra:", err)
      toast.error("Erro ao validar e-mail na Hotmart. Tente novamente.")
    } finally {
      setVerifyingEmail(false)
    }
  }

  function validateStep2() {
    const errs: Record<string, string> = {}
    if (!form.phone.trim()) errs.phone = "WhatsApp / Telefone é obrigatório"
    if (!form.crp.trim()) errs.crp = "CBO / CRP é obrigatório"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    setLoading(true)
    const cleanEmail = form.email.trim().toLowerCase()

    try {
      // 1. Criar usuário no Supabase Auth
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
        if (authError.message.includes("already registered") || authError.message.includes("User already registered")) {
          throw new Error("Este e-mail já possui uma conta criada no EvoluIA. Faça login diretamente.")
        }
        throw authError
      }

      if (!authData.user) throw new Error("Não foi possível criar o usuário.")

      const userId = authData.user.id

      // 2. Garantir sessão ativa
      if (!authData.session) {
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: form.password,
        })
      }

      // 3. Fazer upload de logo (se selecionado)
      let logo_url: string | null = null
      if (logoFile) {
        const ext = logoFile.name.split(".").pop()
        const path = `${userId}/logo.${ext}`
        const { error: uploadError } = await supabase.storage
          .from("professionals")
          .upload(path, logoFile, { upsert: true })

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("professionals").getPublicUrl(path)
          logo_url = urlData.publicUrl
        }
      }

      // 4. Criar ou atualizar perfil da Master em 'professionals'
      const { error: profileError } = await supabase
        .from("professionals")
        .upsert({
          id: userId,
          full_name: form.full_name,
          email: cleanEmail,
          phone: form.phone || null,
          crp: form.crp || null,
          specialty: form.specialty || "Psicopedagogia Clínica",
          bio: form.bio || null,
          logo_url,
          clinic_name: form.clinic_name || "Espaço Psicopedagógico",
          city: form.city || null,
          state: form.state || null,
          role: "master",
          is_active: true,
        })

      if (profileError) throw profileError

      // 5. Vincular a assinatura da Hotmart ao novo userId
      await supabase
        .from("subscriptions")
        .update({
          master_user_id: userId,
          updated_at: new Date().toISOString(),
        })
        .ilike("customer_email", cleanEmail)

      toast.success("Conta criada e plano ativado com sucesso! Bem-vinda ao EvoluIA 🎉", {
        duration: 5000,
      })
      navigate("/dashboard")
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Erro ao concluir cadastro. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F7F8] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-10 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-3xl sm:rounded-[36px] border border-[#E2E8F0] shadow-xl p-6 sm:p-10 relative overflow-hidden">
        {/* Header Branding */}
        <div className="flex items-center justify-between pb-6 border-b border-[#EEF2F6]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#7C3AED] flex items-center justify-center text-white shadow-md">
              <Brain className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#0D2329] leading-none">
                Evolu<span className="text-[#7C3AED]">IA</span>
              </h2>
              <p className="text-xs font-semibold text-[#6B7C83] mt-0.5">
                Primeiro Acesso • Ativação de Conta
              </p>
            </div>
          </div>

          <Link
            to="/login"
            className="text-xs font-bold text-[#7C3AED] hover:text-[#5B21B6] flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Já tem conta? Entrar</span>
          </Link>
        </div>

        {/* Progress Steps Indicator */}
        <div className="py-6">
          <div className="flex items-center justify-between max-w-sm mx-auto mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-black transition-all ${
                    s < step
                      ? "bg-[#10B981] text-white shadow-xs"
                      : s === step
                      ? "bg-[#7C3AED] text-white shadow-md scale-110"
                      : "bg-[#F1F5F9] text-[#94A3B8]"
                  }`}
                >
                  {s < step ? <Check className="w-4 h-4 stroke-[3]" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-12 sm:w-16 h-1 rounded-full ${
                      s < step ? "bg-[#10B981]" : "bg-[#E2E8F0]"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="text-center">
            <h1 className="text-lg sm:text-xl font-black text-[#0D2329]">
              {step === 1 && "Verificação do E-mail de Compra"}
              {step === 2 && "Dados do seu Consultório"}
              {step === 3 && "Personalização & Finalização"}
            </h1>
            <p className="text-xs font-semibold text-[#6B7C83] mt-1">
              {step === 1 && "Informe o mesmo e-mail que você utilizou ao assinar na Hotmart."}
              {step === 2 && "Essas informações serão utilizadas em seus relatórios e recibos."}
              {step === 3 && "Adicione seu logotipo para os relatórios clínicos."}
            </p>
          </div>
        </div>

        {/* =========================================================================
            PASSO 1: E-MAIL, SENHA & VALIDAÇÃO ZERO-TRUST DA HOTMART
            ========================================================================= */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Aviso de Bloqueio se o E-mail não comprou na Hotmart */}
            {purchaseNotFound && (
              <div className="p-4 rounded-2xl bg-[#FEF2F2] border-2 border-[#FECACA] space-y-3 animate-in fade-in">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-[#991B1B]">
                      Nenhuma compra ativa encontrada para este e-mail
                    </h3>
                    <p className="text-[11px] font-semibold text-[#B91C1C] leading-relaxed">
                      O e-mail <strong>{form.email}</strong> não possui uma assinatura aprovada na Hotmart.
                      Certifique-se de digitar o mesmo e-mail que utilizou no checkout da compra.
                    </p>
                  </div>
                </div>

                <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <a
                    href="https://pay.hotmart.com/L107381113V?off=imn95wux"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black text-center flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <span>Adquirir Plano na Hotmart</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setPurchaseNotFound(false)}
                    className="py-2.5 px-4 rounded-xl bg-white border border-[#FECACA] text-[#DC2626] text-xs font-bold hover:bg-[#FFF1F2]"
                  >
                    Digitar outro e-mail
                  </button>
                </div>
              </div>
            )}

            {/* E-mail da Hotmart */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#0D2329] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span>E-mail utilizado na compra (Hotmart) *</span>
              </label>
              <input
                type="email"
                required
                placeholder="exemplo@gmail.com"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs placeholder:text-[#8CAAB1]"
              />
              {errors.email && <p className="text-[11px] font-bold text-[#DC2626]">{errors.email}</p>}
            </div>

            {/* Nome Completo */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#0D2329] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span>Seu Nome Completo *</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Dra. Priscila Carbone"
                value={form.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs placeholder:text-[#8CAAB1]"
              />
              {errors.full_name && (
                <p className="text-[11px] font-bold text-[#DC2626]">{errors.full_name}</p>
              )}
            </div>

            {/* Senha e Confirmação de Senha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0D2329] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#7C3AED]" />
                  <span>Crie sua Senha *</span>
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

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0D2329] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#7C3AED]" />
                  <span>Confirmar Senha *</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Repita a senha"
                    value={form.confirm_password}
                    onChange={(e) => handleChange("confirm_password", e.target.value)}
                    className="w-full px-4 py-3 pr-10 rounded-2xl border border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs placeholder:text-[#8CAAB1]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8CAAB1] hover:text-[#0D2329]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirm_password && (
                  <p className="text-[11px] font-bold text-[#DC2626]">{errors.confirm_password}</p>
                )}
              </div>
            </div>

            {/* Botão de Validação e Avançar */}
            <button
              type="button"
              disabled={verifyingEmail}
              onClick={handleVerifyAndProceedStep1}
              className="w-full mt-4 py-3.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {verifyingEmail ? (
                <span>Consultando Hotmart...</span>
              ) : (
                <>
                  <span>Verificar Compra & Continuar</span>
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>
        )}

        {/* =========================================================================
            PASSO 2: DADOS DO CONSULTÓRIO & PROFISSIONAL
            ========================================================================= */}
        {step === 2 && (
          <div className="space-y-4">
            {verifiedPlan && (
              <div className="p-3.5 rounded-2xl bg-[#EDE9FE] border border-[#DDD6FE] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#7C3AED]">
                      Plano Vinculado com Sucesso
                    </p>
                    <p className="text-xs font-black text-[#0D2329]">
                      {verifiedPlan.name} • {verifiedPlan.priceLabel}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#10B981] text-white">
                  Aprovado
                </span>
              </div>
            )}

            {/* Nome do Consultório */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#0D2329] flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span>Nome do Consultório / Espaço</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Aprender Ensinando - Espaço Psicopedagógico"
                value={form.clinic_name}
                onChange={(e) => handleChange("clinic_name", e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs placeholder:text-[#8CAAB1]"
              />
            </div>

            {/* CRP / CBO e WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0D2329] flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#7C3AED]" />
                  <span>CBO / Registro Profissional *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 2394-25"
                  value={form.crp}
                  onChange={(e) => handleChange("crp", e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs placeholder:text-[#8CAAB1]"
                />
                {errors.crp && <p className="text-[11px] font-bold text-[#DC2626]">{errors.crp}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0D2329] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#7C3AED]" />
                  <span>WhatsApp / Telefone *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="(11) 99999-9999"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs placeholder:text-[#8CAAB1]"
                />
                {errors.phone && (
                  <p className="text-[11px] font-bold text-[#DC2626]">{errors.phone}</p>
                )}
              </div>
            </div>

            {/* Cidade e Estado */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-black text-[#0D2329] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#7C3AED]" />
                  <span>Cidade</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo"
                  value={form.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs placeholder:text-[#8CAAB1]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0D2329]">Estado</label>
                <input
                  type="text"
                  placeholder="SP"
                  maxLength={2}
                  value={form.state}
                  onChange={(e) => handleChange("state", e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-2xl border border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs placeholder:text-[#8CAAB1]"
                />
              </div>
            </div>

            {/* Botões Voltar e Avançar */}
            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3.5 rounded-2xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0D2329] font-black text-xs sm:text-sm transition-all"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (validateStep2()) setStep(3)
                }}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Avançar para Logo</span>
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            PASSO 3: LOGO / FOTO & FINALIZAR CONTA
            ========================================================================= */}
        {step === 3 && (
          <div className="space-y-5">
            {/* Upload de Logo */}
            <div className="space-y-2 text-center">
              <label className="text-xs font-black text-[#0D2329]">
                Logo ou Foto Profissional (Opcional)
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#DDD6FE] hover:border-[#7C3AED] bg-[#FAF5FF]/50 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all active:scale-98"
              >
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-24 h-24 rounded-2xl object-cover shadow-md border-2 border-white"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setLogoFile(null)
                        setLogoPreview(null)
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-[#DC2626] text-white rounded-full flex items-center justify-center shadow-sm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shadow-xs">
                      <Upload className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-[#0D2329]">
                        Clique para enviar sua foto ou logotipo
                      </p>
                      <p className="text-[10px] font-semibold text-[#8CAAB1] mt-0.5">
                        Formatos PNG ou JPG até 5MB
                      </p>
                    </div>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>

            {/* Resumo do Cadastro */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#6B7C83]">
                Resumo da sua conta
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#8CAAB1]">Titular:</span>{" "}
                  <strong className="text-[#0D2329]">{form.full_name}</strong>
                </div>
                <div>
                  <span className="text-[#8CAAB1]">E-mail:</span>{" "}
                  <strong className="text-[#0D2329] truncate">{form.email}</strong>
                </div>
                <div>
                  <span className="text-[#8CAAB1]">Consultório:</span>{" "}
                  <strong className="text-[#0D2329]">{form.clinic_name || "Espaço Clínico"}</strong>
                </div>
                <div>
                  <span className="text-[#8CAAB1]">Plano Ativo:</span>{" "}
                  <strong className="text-[#7C3AED]">{verifiedPlan?.name || "EvoluIA"}</strong>
                </div>
              </div>
            </div>

            {/* Botão Finalizar */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-3.5 rounded-2xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0D2329] font-black text-xs sm:text-sm transition-all"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSubmit}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <span>Criando conta...</span>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                    <span>Concluir Cadastro & Entrar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
