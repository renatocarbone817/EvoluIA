import { useState, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Brain, Upload, X, Eye, EyeOff, CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import toast from "react-hot-toast"

type Step = 1 | 2 | 3

export function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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
    specialty: "Psicopedagogia",
    city: "",
    state: "",
    bio: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 2MB.")
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function validateStep1() {
    const errs: Record<string, string> = {}
    if (!form.full_name.trim()) errs.full_name = "Nome completo é obrigatório"
    if (!form.email.trim()) errs.email = "E-mail é obrigatório"
    if (!form.password) errs.password = "Senha é obrigatória"
    if (form.password.length < 8) errs.password = "Senha deve ter no mínimo 8 caracteres"
    if (form.password !== form.confirm_password) errs.confirm_password = "As senhas não conferem"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep2() {
    const errs: Record<string, string> = {}
    if (!form.crp.trim()) errs.crp = "CRP é obrigatório"
    if (!form.phone.trim()) errs.phone = "Telefone é obrigatório"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error("Usuário não criado")

      // Ensure active session on client
      if (!authData.session) {
        await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })
      }

      const userId = authData.user.id

      // 2. Upload logo if provided
      let logo_url: string | null = null
      if (logoFile) {
        const ext = logoFile.name.split(".").pop()
        const path = `${userId}/logo.${ext}`
        const { error: uploadError } = await supabase.storage
          .from("professionals")
          .upload(path, logoFile, { upsert: true })

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("professionals")
            .getPublicUrl(path)
          logo_url = urlData.publicUrl
        }
      }

      // 3. Create professional profile
      const { error: profileError } = await supabase.from("professionals").insert({
        id: userId,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || null,
        crp: form.crp || null,
        specialty: form.specialty || null,
        bio: form.bio || null,
        logo_url,
        clinic_name: form.clinic_name || null,
        city: form.city || null,
        state: form.state || null,
      })

      if (profileError) throw profileError

      toast.success("Conta criada com sucesso! Bem-vinda ao EvoluIA 🎉")
      navigate("/dashboard")
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Erro ao criar conta. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-foreground rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-background" />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">EvoluIA</p>
            <p className="text-muted-foreground text-xs">Gestão Psicopedagógica</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            {([1, 2, 3] as Step[]).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    s < step
                      ? "bg-foreground text-background"
                      : s === step
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s < step ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                {s < 3 && <div className={`flex-1 h-0.5 w-8 ${s < step ? "bg-foreground" : "bg-muted"}`} />}
              </div>
            ))}
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {step === 1 && "Criar sua conta"}
              {step === 2 && "Seu perfil profissional"}
              {step === 3 && "Toque final"}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {step === 1 && "Dados de acesso ao sistema"}
              {step === 2 && "Informações que aparecem no seu perfil"}
              {step === 3 && "Adicione seu logo e finalize"}
            </p>
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <Input
              label="Nome completo *"
              placeholder="Priscila Carbone"
              value={form.full_name}
              onChange={(e) => handleChange("full_name", e.target.value)}
              error={errors.full_name}
            />
            <Input
              label="Nome do consultório"
              placeholder="Consultório Carbone (opcional)"
              value={form.clinic_name}
              onChange={(e) => handleChange("clinic_name", e.target.value)}
            />
            <Input
              label="E-mail *"
              type="email"
              placeholder="priscila@email.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              error={errors.email}
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Senha *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <Input
              label="Confirmar senha *"
              type="password"
              placeholder="Repita a senha"
              value={form.confirm_password}
              onChange={(e) => handleChange("confirm_password", e.target.value)}
              error={errors.confirm_password}
            />
            <Button
              className="w-full mt-2"
              onClick={() => { if (validateStep1()) setStep(2) }}
            >
              Continuar
            </Button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <Input
              label="CRP *"
              placeholder="08/12345"
              value={form.crp}
              onChange={(e) => handleChange("crp", e.target.value)}
              error={errors.crp}
              hint="Número do seu registro profissional"
            />
            <Input
              label="Especialidade"
              placeholder="Psicopedagogia"
              value={form.specialty}
              onChange={(e) => handleChange("specialty", e.target.value)}
            />
            <Input
              label="Telefone / WhatsApp *"
              placeholder="(11) 99999-9999"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              error={errors.phone}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Cidade"
                placeholder="São Paulo"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
              />
              <Input
                label="Estado"
                placeholder="SP"
                value={form.state}
                onChange={(e) => handleChange("state", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mini bio (opcional)</label>
              <textarea
                placeholder="Psicopedagoga especializada em dificuldades de aprendizagem..."
                value={form.bio}
                onChange={(e) => handleChange("bio", e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={() => { if (validateStep2()) setStep(3) }}
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Logo upload */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Logo / Foto do consultório</label>
              <div
                className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-foreground/30 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-24 h-24 rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setLogoFile(null)
                        setLogoPreview(null)
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Clique para fazer upload</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG até 2MB</p>
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
              <p className="text-xs text-muted-foreground">
                Você pode pular esta etapa e adicionar o logo depois nas configurações.
              </p>
            </div>

            {/* Summary */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium mb-3">Resumo do cadastro</p>
              {[
                { label: "Nome", value: form.full_name },
                { label: "E-mail", value: form.email },
                { label: "CRP", value: form.crp },
                { label: "Telefone", value: form.phone },
                { label: "Cidade", value: form.city || "—" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                Voltar
              </Button>
              <Button className="flex-1" loading={loading} onClick={handleSubmit}>
                Criar minha conta
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <p className="text-sm text-muted-foreground text-center mt-6">
            Já tem uma conta?{" "}
            <Link to="/login" className="text-foreground font-medium hover:underline">
              Entrar
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
