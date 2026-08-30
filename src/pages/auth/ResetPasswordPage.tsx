import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Brain, Lock, Eye, EyeOff, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    // Escuta evento de recuperação de senha do Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        toast("Sessão de recuperação autorizada. Defina sua nova senha.", { icon: "🔑" })
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (newPassword.length < 6) {
      setError("A senha deve conter no mínimo 6 caracteres.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("As duas senhas não coincidem. Digite novamente com atenção.")
      return
    }

    try {
      setLoading(true)
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        throw updateError
      }

      setSuccess(true)
      toast.success("Senha redefinida com sucesso! Acessando sua conta...")

      setTimeout(() => {
        navigate("/dashboard")
      }, 2000)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Erro ao redefinir a senha. O link pode ter expirado.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#E5EEF1] flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      {/* CARD PRINCIPAL */}
      <div className="w-full max-w-md bg-white rounded-3xl border-2 border-[#A0BDC6] shadow-md p-6 sm:p-8 space-y-6 relative overflow-hidden">
        {/* LOGO & CABEÇALHO */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#08333D] flex items-center justify-center text-[#00C48C] shadow-sm">
            <Brain className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#0D2329] tracking-tight">
              Criar Nova Senha
            </h1>
            <p className="text-xs font-semibold text-[#6B7C83] mt-1">
              Defina sua nova senha para acessar o seu consultório no EvoluIA.
            </p>
          </div>
        </div>

        {/* FEEDBACK DE SUCESSO */}
        {success ? (
          <div className="p-6 rounded-2xl bg-[#F0FDF4] border-2 border-[#86EFAC] text-center space-y-3 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-[#DCFCE7] text-[#166534] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#166534]">Senha Alterada com Sucesso!</h3>
              <p className="text-xs font-semibold text-[#15803D] mt-1">
                Você será redirecionada para o seu Dashboard em instantes...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* Mensagem de Erro */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] text-xs font-bold text-[#DC2626] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
                <span>{error}</span>
              </div>
            )}

            {/* Campo 1: Nova Senha */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#0D2329]">Nova Senha</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-[#8CAAB1]" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="No mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all placeholder:text-[#8CAAB1]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-[#8CAAB1] hover:text-[#0D2329]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Campo 2: Confirmar Nova Senha */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#0D2329]">Confirmar Nova Senha</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-[#8CAAB1]" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all placeholder:text-[#8CAAB1]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 text-[#8CAAB1] hover:text-[#0D2329]"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botão de Submissão */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6366F1] hover:from-[#6D28D9] hover:to-[#4F46E5] text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Salvando nova senha...</span>
              ) : (
                <>
                  <span>Salvar Nova Senha & Entrar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Link Voltar ao Login */}
        <div className="pt-2 text-center border-t border-[#EEF2F6]">
          <Link
            to="/login"
            className="text-xs font-bold text-[#6B7C83] hover:text-[#0D2329] transition-colors"
          >
            ← Voltar para a tela de Login
          </Link>
        </div>
      </div>
    </div>
  )
}
