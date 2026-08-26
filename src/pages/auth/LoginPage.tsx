import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Brain, Eye, EyeOff } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import toast from "react-hot-toast"

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError("E-mail ou senha incorretos. Verifique seus dados e tente novamente.")
      setLoading(false)
      return
    }

    navigate("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <p className="text-background font-bold text-lg leading-tight">EvoluIA</p>
            <p className="text-white/50 text-xs">Gestão Psicopedagógica</p>
          </div>
        </div>
        <div>
          <blockquote className="text-white/80 text-2xl font-light leading-relaxed mb-6">
            "Cada criança tem uma história única. Organize, acompanhe e transforme cada trajetória."
          </blockquote>
          <p className="text-white/40 text-sm">Plataforma de gestão psicopedagógica profissional</p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: "Atendimentos", value: "Organizados" },
            { label: "Histórico", value: "Completo" },
            { label: "Evolução", value: "Visível" },
          ].map((item) => (
            <div key={item.label} className="bg-white/5 rounded-xl p-4">
              <p className="text-background font-semibold text-sm">{item.value}</p>
              <p className="text-white/40 text-xs mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-foreground rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-background" />
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">EvoluIA</p>
              <p className="text-muted-foreground text-xs">Gestão Psicopedagógica</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold">Bem-vinda de volta</h1>
            <p className="text-muted-foreground text-sm mt-1">Entre na sua conta para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            <div className="flex justify-end">
              <Link to="/esqueci-senha" className="text-xs text-muted-foreground hover:text-foreground">
                Esqueci minha senha
              </Link>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Entrar
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Primeira vez aqui?{" "}
              <Link to="/cadastro" className="text-foreground font-medium hover:underline">
                Criar minha conta
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
