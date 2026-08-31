import { useState, useEffect } from "react"
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { validateUserAccess, getMasterSubscription, isTrialExpired } from "@/lib/subscriptionService"
import { PLANS_LIST, getPlanConfig, buildHotmartCheckoutUrl } from "@/lib/plans"
import { Brain, Lock, Sparkles, ShieldCheck, CheckCircle2, RefreshCw, Users, LogOut } from "lucide-react"
import toast from "react-hot-toast"

export function ProtectedRoute() {
  const { user, professional, loading, signOut } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [accessBlocked, setAccessBlocked] = useState(false)
  const [trialExpired, setTrialExpired] = useState(false)
  const [currentPlanConfig, setCurrentPlanConfig] = useState<any>(null)
  const [rechecking, setRechecking] = useState(false)

  useEffect(() => {
    async function checkQuota() {
      if (user && professional) {
        // 1. Se for membro de equipe
        if (professional.role === "professional" && professional.master_id) {
          const check = await validateUserAccess(professional)
          if (!check.allowed) {
            toast.error(check.reason || "Acesso suspenso por limite de plano.", { duration: 6000 })
            await signOut()
            setAccessBlocked(true)
          }
        }
        // 2. Se for Master, checa se o período de teste expirou
        else if (professional.role === "master" || !professional.master_id) {
          const sub = await getMasterSubscription(professional.id)
          const planConfig = getPlanConfig(sub.plan_id)
          setCurrentPlanConfig(planConfig)

          if (isTrialExpired(sub)) {
            setTrialExpired(true)
          } else {
            setTrialExpired(false)
          }
        }
      }
      setCheckingAccess(false)
    }

    if (!loading && user) {
      checkQuota()
    } else if (!loading) {
      setCheckingAccess(false)
    }
  }, [user, professional, loading])

  async function handleRecheck() {
    if (!professional) return
    setRechecking(true)
    try {
      const sub = await getMasterSubscription(professional.id)
      if (!isTrialExpired(sub)) {
        setTrialExpired(false)
        toast.success("Assinatura confirmada! Acesso liberado 🎉")
      } else {
        toast("Aguardando confirmação de pagamento da Hotmart...", { icon: "⏳" })
      }
    } finally {
      setRechecking(false)
    }
  }

  if (loading || checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-foreground rounded-xl flex items-center justify-center mx-auto animate-pulse">
            <Brain className="w-7 h-7 text-background" />
          </div>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user || accessBlocked) {
    return <Navigate to="/login" replace />
  }

  // Se o teste expirou e o usuário não está na página de planos
  if (trialExpired && location.pathname !== "/meu-plano") {
    const userEmail = (professional?.email || user?.email || "").trim()
    const userName = (professional?.full_name || user?.user_metadata?.full_name || "").trim()

    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-2xl bg-white rounded-3xl sm:rounded-[36px] text-slate-900 border-2 border-slate-200 shadow-2xl p-6 sm:p-10 space-y-6 animate-in zoom-in-95">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-amber-100 text-amber-600 border-2 border-amber-300 flex items-center justify-center mx-auto shadow-md">
              <Lock className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-[#0D2329] tracking-tight">
                Seu Período de Teste de 14 Dias Encerrou!
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-[#6B7C83] max-w-lg mx-auto">
                Esperamos que o <strong>EvoluIA</strong> tenha transformado a rotina do seu consultório.
              </p>
            </div>
          </div>

          {/* Banner de Garantia de Dados Salvos */}
          <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 space-y-1 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-black text-emerald-800 uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Seus Dados Continuam 100% Salvos & Seguros</span>
            </div>
            <p className="text-xs text-emerald-950 font-medium leading-relaxed">
              Todos os seus pacientes, anamneses, sessões e relatórios com IA estão guardados intactos. Escolha um plano abaixo para reativar seu acesso imediato:
            </p>
          </div>

          {/* Cards dos Planos Rápidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {PLANS_LIST.slice(0, 4).map((plan) => (
              <div
                key={plan.id}
                className="p-4 rounded-2xl border-2 border-slate-200 hover:border-[#7C3AED] bg-slate-50 hover:bg-purple-50/40 transition-all flex flex-col justify-between gap-3 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm text-[#0D2329]">{plan.name}</h3>
                    <span className="text-[10px] font-black text-[#7C3AED] px-2 py-0.5 rounded-lg bg-purple-100">
                      {plan.maxProfessionals === 1 ? "1 Vaga" : `${plan.maxProfessionals} Vagas`}
                    </span>
                  </div>
                  <p className="text-lg font-black text-slate-900 mt-1">
                    {plan.formattedPrice}<span className="text-xs font-bold text-slate-500">/mês</span>
                  </p>
                </div>

                <a
                  href={buildHotmartCheckoutUrl(plan.hotmartCheckoutUrl, userEmail, userName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all text-center"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Assinar {plan.name}</span>
                </a>
              </div>
            ))}
          </div>

          {/* Ações de Revalidação e Logout */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <button
              onClick={handleRecheck}
              disabled={rechecking}
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rechecking ? "animate-spin text-[#7C3AED]" : ""}`} />
              <span>{rechecking ? "Verificando..." : "Já realizei o pagamento"}</span>
            </button>

            <button
              onClick={() => signOut()}
              className="w-full sm:w-auto text-xs font-bold text-slate-400 hover:text-red-500 flex items-center justify-center gap-1 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair da conta</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <Outlet />
}
