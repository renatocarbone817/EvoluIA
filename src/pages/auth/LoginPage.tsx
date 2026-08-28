import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Brain,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Users,
  ClipboardList,
  BarChart3,
  ShieldCheck,
  Check,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError("E-mail ou senha incorretos. Verifique seus dados e tente novamente.")
        setLoading(false)
        return
      }

      toast.success("Login realizado com sucesso! Bem-vinda(o).")
      navigate("/dashboard")
    } catch (err: any) {
      setError(err?.message || "Erro ao realizar login.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F7F8] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-10 font-sans">
      {/* MAIN LARGE CARD */}
      <div className="w-full max-w-5xl bg-white rounded-3xl sm:rounded-[36px] border border-[#E2E8F0] shadow-xl p-6 sm:p-10 lg:p-14 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-12">
        {/* LEFT COLUMN: BRANDING & FEATURES */}
        <div className="flex-1 w-full flex flex-col justify-between relative z-10">
          {/* Header & Dot Matrix */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#08333D] flex items-center justify-center text-[#00C48C] shadow-sm shrink-0">
                <Brain className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#0D2329] leading-none">
                  Evolu<span className="text-[#00C48C]">IA</span>
                </h2>
                <p className="text-[11px] sm:text-xs font-semibold text-[#6B7C83] mt-0.5">
                  Gestão Psicopedagógica
                </p>
              </div>
            </div>

            {/* Dotted pattern decoration */}
            <div className="hidden sm:grid grid-cols-5 gap-1 opacity-20 pr-4" aria-hidden="true">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="w-1 h-1 rounded-full bg-[#0D2329]" />
              ))}
            </div>
          </div>

          {/* Headline & Subtext */}
          <div className="mt-8 sm:mt-10">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0D2329] leading-tight tracking-tight">
              Organize cada <span className="text-[#00C48C]">trajetória</span>.
              <br />
              Acompanhe cada <span className="text-[#00B4D8]">evolução</span>.
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7C83] font-medium max-w-md mt-4 leading-relaxed">
              Gestão psicopedagógica completa para acompanhar seus pacientes, avaliações e atendimentos em um só lugar.
            </p>
          </div>

          {/* 3 Pillars */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-8 sm:mt-12">
            {/* 1. Pacientes */}
            <div className="space-y-2 text-center sm:text-left flex flex-col items-center sm:items-start">
              <div className="w-11 h-11 rounded-2xl bg-[#E8F8F5] text-[#065F46] flex items-center justify-center shadow-2xs">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-xs font-black text-[#0D2329]">Pacientes</p>
              <p className="text-[10px] text-[#6B7C83] font-medium leading-tight hidden sm:block">
                Cadastre e acompanhe seus pacientes
              </p>
            </div>

            {/* 2. Avaliações */}
            <div className="space-y-2 text-center sm:text-left flex flex-col items-center sm:items-start">
              <div className="w-11 h-11 rounded-2xl bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center shadow-2xs">
                <ClipboardList className="w-5 h-5" />
              </div>
              <p className="text-xs font-black text-[#0D2329]">Avaliações</p>
              <p className="text-[10px] text-[#6B7C83] font-medium leading-tight hidden sm:block">
                Organize entrevistas, avaliações e relatórios
              </p>
            </div>

            {/* 3. Acompanhamento */}
            <div className="space-y-2 text-center sm:text-left flex flex-col items-center sm:items-start">
              <div className="w-11 h-11 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shadow-2xs">
                <BarChart3 className="w-5 h-5" />
              </div>
              <p className="text-xs font-black text-[#0D2329]">Acompanhamento</p>
              <p className="text-[10px] text-[#6B7C83] font-medium leading-tight hidden sm:block">
                Monitore evolução e resultados ao longo do tempo
              </p>
            </div>
          </div>

          {/* Faint Background Trajectory Curve (SVG) */}
          <div className="absolute bottom-[-20px] left-[-20px] w-80 h-40 pointer-events-none opacity-25 z-[-1]" aria-hidden="true">
            <svg viewBox="0 0 300 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#00C48C]">
              <path d="M10 130 C 70 120, 90 90, 140 100 C 190 110, 220 50, 280 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="50" cy="125" r="4" fill="white" stroke="currentColor" strokeWidth="2" />
              <circle cx="140" cy="100" r="4" fill="white" stroke="currentColor" strokeWidth="2" />
              <circle cx="210" cy="65" r="4" fill="white" stroke="currentColor" strokeWidth="2" />
              <polygon points="280,20 270,22 278,30" fill="currentColor" />
            </svg>
          </div>
        </div>

        {/* RIGHT COLUMN: LOGIN FORM CARD */}
        <div className="w-full lg:max-w-[400px] bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-5 shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#0D2329] tracking-tight">
              Bem-vindo de volta 👋
            </h2>
            <p className="text-xs font-medium text-[#6B7C83] mt-1">
              Acesse sua conta e continue acompanhando as trajetórias dos seus pacientes.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* E-mail */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#0D2329]">E-mail</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-[#8CAAB1]" />
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#08333D] transition-all shadow-2xs placeholder:text-[#8CAAB1]"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#0D2329]">Senha</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-[#8CAAB1]" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-2xl border border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#08333D] transition-all shadow-2xs placeholder:text-[#8CAAB1]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-[#8CAAB1] hover:text-[#0D2329] transition-colors"
                  title={showPassword ? "Ocultar senha" : "Ver senha"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl text-xs font-bold text-[#DC2626] animate-in fade-in">
                {error}
              </div>
            )}

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#0D2329] select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded-md border-[#D8E5E7] text-[#08333D] focus:ring-[#08333D] w-4 h-4 cursor-pointer"
                />
                <span>Lembrar de mim</span>
              </label>

              <Link
                to="/esqueci-senha"
                className="text-xs font-bold text-[#008080] hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#08333D] hover:bg-[#0D2329] text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-3 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#EEF2F6]" />
            </div>
            <div className="relative bg-white px-3 text-[11px] font-semibold text-[#8CAAB1] rounded-full border border-[#EEF2F6]">
              ou
            </div>
          </div>

          {/* Sign Up Section */}
          <div className="space-y-2.5 text-center">
            <p className="text-xs font-semibold text-[#6B7C83]">
              Ainda não possui uma conta?
            </p>
            <Link
              to="/cadastro"
              className="w-full py-3 rounded-2xl bg-white border-2 border-[#DDD6FE] text-[#7C3AED] hover:bg-[#F3E8FF]/30 font-black text-xs sm:text-sm text-center block transition-all active:scale-[0.98]"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="text-center mt-6 space-y-1">
        <p className="text-xs font-semibold text-[#6B7C83] flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-[#8CAAB1]" />
          <span>Seus dados estão protegidos com segurança de nível profissional.</span>
        </p>
        <p className="text-[11px] text-[#8CAAB1] font-medium">
          EvoluIA © 2026 – Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}
