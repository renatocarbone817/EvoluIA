import { useState } from "react"
import { Link } from "react-router-dom"
import { Brain, Mail, ArrowLeft, CheckCircle2, ArrowRight, AlertCircle, Sparkles } from "lucide-react"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const cleanEmail = email.trim().toLowerCase()

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      })

      if (resetError) {
        throw resetError
      }

      setSent(true)
      toast.success("E-mail de recuperação enviado com sucesso!")
    } catch (err: any) {
      console.error(err)
      setError(err?.message || "Erro ao solicitar recuperação de senha. Verifique o e-mail informado.")
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
              Recuperar Acesso
            </h1>
            <p className="text-xs font-semibold text-[#6B7C83] mt-1">
              Digite o seu e-mail cadastrado para receber o link de redefinição de senha.
            </p>
          </div>
        </div>

        {/* FEEDBACK DE ENVIO */}
        {sent ? (
          <div className="space-y-5 animate-in zoom-in-95">
            <div className="p-6 rounded-2xl bg-[#F0FDF4] border-2 border-[#86EFAC] text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#DCFCE7] text-[#166534] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#166534]">E-mail Enviado com Sucesso!</h3>
                <p className="text-xs font-semibold text-[#15803D] mt-1 leading-relaxed">
                  Enviamos o link de redefinição para <strong>{email}</strong>.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#6B7C83] space-y-1.5 leading-relaxed">
              <p className="font-bold text-[#0D2329]">📬 O que fazer agora:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Abra a sua caixa de entrada de e-mails.</li>
                <li>Verifique também a pasta de <strong>Spam / Lixo Eletrônico</strong>.</li>
                <li>Clique no botão do e-mail para cadastrar sua nova senha.</li>
              </ul>
            </div>

            <button
              onClick={() => setSent(false)}
              className="w-full py-2.5 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs font-bold text-[#0D2329] transition-colors"
            >
              Tentar outro e-mail
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mensagem de Erro */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] text-xs font-bold text-[#DC2626] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
                <span>{error}</span>
              </div>
            )}

            {/* Campo de E-mail */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#0D2329]">E-mail de Cadastro</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-[#8CAAB1]" />
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all placeholder:text-[#8CAAB1]"
                />
              </div>
            </div>

            {/* Botão de Envio */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6366F1] hover:from-[#6D28D9] hover:to-[#4F46E5] text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Enviando link...</span>
              ) : (
                <>
                  <span>Enviar Link de Recuperação</span>
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
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B7C83] hover:text-[#0D2329] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para a tela de Login</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
