import { useState } from "react"
import { Link } from "react-router-dom"
import { Brain, ArrowLeft, CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import toast from "react-hot-toast"

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    setLoading(false)
    if (error) {
      toast.error("Erro ao enviar e-mail. Verifique o endereço.")
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-foreground rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-background" />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">EvoluIA</p>
            <p className="text-muted-foreground text-xs">Gestão Psicopedagógica</p>
          </div>
        </div>

        {!sent ? (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold">Esqueceu a senha?</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Digite seu e-mail e enviaremos as instruções para redefinir sua senha.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" loading={loading}>
                Enviar instruções
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">E-mail enviado!</h2>
              <p className="text-muted-foreground text-sm mt-2">
                Verifique sua caixa de entrada em <strong>{email}</strong> e siga as instruções para redefinir sua senha.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  )
}
