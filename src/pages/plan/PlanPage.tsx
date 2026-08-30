import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  CreditCard,
  CheckCircle2,
  Users,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Zap,
  Lock,
  ChevronRight,
  Info,
  HelpCircle,
} from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { isMasterUser } from "@/lib/teamAccess"
import {
  PLANS_LIST,
  HOTMART_MANAGE_SUBSCRIPTION_URL,
  getPlanConfig,
  getSubscriptionStatusLabel,
  type PlanConfig,
  type PlanId,
} from "@/lib/plans"
import {
  getSubscriptionDetails,
  checkDowngradeEligibility,
  type SubscriptionDetails,
} from "@/lib/subscriptionService"
import toast from "react-hot-toast"

export function PlanPage() {
  const navigate = useNavigate()
  const { user, professional } = useAuthStore()
  const isMaster = isMasterUser(professional)
  const masterId = professional?.id || user?.id || ""

  const [loading, setLoading] = useState(true)
  const [details, setDetails] = useState<SubscriptionDetails | null>(null)
  const [selectedPlanForAction, setSelectedPlanForAction] = useState<PlanConfig | null>(null)
  const [showDowngradeModal, setShowDowngradeModal] = useState(false)
  const [downgradeMessage, setDowngradeMessage] = useState("")

  const loadData = async () => {
    if (!masterId) return
    try {
      setLoading(true)
      const data = await getSubscriptionDetails(masterId)
      setDetails(data)
    } catch (err) {
      console.error("Failed to load plan details:", err)
      toast.error("Erro ao carregar informações do plano.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isMaster && !loading && professional) {
      toast.error("Apenas o usuário Master tem permissão para gerenciar a assinatura.")
      navigate("/dashboard")
      return
    }
    loadData()
  }, [masterId, isMaster])

  const handlePlanClick = (targetPlan: PlanConfig) => {
    if (!details) return

    // 1. Mesmo plano
    if (targetPlan.id === details.planConfig.id) {
      toast("Este já é o seu plano atual.", { icon: "ℹ️" })
      return
    }

    // 2. Upgrade (plano maior)
    if (targetPlan.maxProfessionals > details.planConfig.maxProfessionals) {
      window.open(targetPlan.hotmartCheckoutUrl, "_blank", "noopener,noreferrer")
      toast.success(`Redirecionando para o checkout do ${targetPlan.name} na Hotmart...`)
      return
    }

    // 3. Downgrade (plano menor): verificar se a equipe cabe
    const check = checkDowngradeEligibility(details.usedProfessionals, targetPlan)
    if (!check.allowed) {
      setDowngradeMessage(check.message || "Reduza o número de profissionais antes de mudar.")
      setSelectedPlanForAction(targetPlan)
      setShowDowngradeModal(true)
      return
    }

    // Se cabe, redireciona para a troca/checkout na Hotmart
    window.open(targetPlan.hotmartCheckoutUrl, "_blank", "noopener,noreferrer")
    toast.success(`Redirecionando para o ${targetPlan.name} na Hotmart...`)
  }

  const statusInfo = getSubscriptionStatusLabel(details?.subscription?.status)

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-[#0D2329] tracking-tight">
              Meu Plano & Assinatura
            </h1>
            <span className="px-2.5 py-1 rounded-xl bg-[#EDE9FE] text-[#7C3AED] font-black text-xs border border-[#DDD6FE]">
              PRO
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#6B7C83]">
            Acompanhe seu plano ativo, controle as vagas da sua equipe e gerencie sua assinatura.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="h-10 px-3.5 rounded-2xl bg-white hover:bg-[#F7FAFA] border-2 border-[#D8E5E7] text-[#0D2329] text-xs font-black flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
            title="Atualizar dados do plano"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#7C3AED]" : ""}`} />
            <span>Atualizar</span>
          </button>

          <a
            href={HOTMART_MANAGE_SUBSCRIPTION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-4 rounded-2xl bg-white hover:bg-[#FDFBFF] border-2 border-[#DDD6FE] text-[#7C3AED] text-xs font-black flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
          >
            <span>Gerenciar na Hotmart</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* 2. CARD DO PLANO ATUAL & UTILIZAÇÃO DE VAGAS */}
      {details && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0D2329] to-[#153A43] text-white p-6 sm:p-8 shadow-xl border-2 border-[#1E4D58]">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Lado Esquerdo: Dados do Plano */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#7DD3FC]">
                  MEU PLANO ATUAL
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${statusInfo.badgeBg} ${statusInfo.badgeText} border ${statusInfo.badgeBorder}`}
                >
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  {statusInfo.label}
                </span>
              </div>

              <div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                  {details.planConfig.name}
                </h2>
                <p className="text-sm font-semibold text-[#94A3B8] mt-1">
                  {details.planConfig.description}
                </p>
              </div>

              <div className="flex items-baseline gap-2 pt-2">
                <span className="text-3xl sm:text-4xl font-black text-[#10B981]">
                  {details.planConfig.formattedPrice}
                </span>
                <span className="text-xs font-bold text-[#94A3B8]">/mês</span>
              </div>
            </div>

            {/* Lado Direito: Barra de Ocupação da Equipe */}
            <div className="lg:col-span-6 bg-white/10 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#7DD3FC]" />
                  <span className="text-xs font-black uppercase tracking-wider text-white">
                    Profissionais na Equipe
                  </span>
                </div>
                <span className="text-sm font-black text-[#7DD3FC]">
                  {details.usedProfessionals} de {details.maxProfessionals} vagas utilizadas
                </span>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full bg-white/20 h-4 rounded-full overflow-hidden p-0.5 border border-white/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#34D399] transition-all duration-500 shadow-sm"
                  style={{
                    width: `${Math.min(
                      100,
                      (details.usedProfessionals / details.maxProfessionals) * 100
                    )}%`,
                  }}
                />
              </div>

              {/* Mensagem de Vagas */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#7DD3FC] shrink-0" />
                  {details.availableSeats > 0 ? (
                    <span>
                      Você ainda pode adicionar{" "}
                      <strong className="text-[#34D399] font-black">
                        {details.availableSeats} profissional
                        {details.availableSeats > 1 ? "ais" : ""}
                      </strong>{" "}
                      à sua equipe.
                    </span>
                  ) : (
                    <span className="text-[#FCA5A5] font-bold">
                      Todas as {details.maxProfessionals} vagas do seu plano estão preenchidas.
                    </span>
                  )}
                </p>

                <button
                  onClick={() => navigate("/configuracoes?aba=equipe")}
                  className="text-xs font-black text-[#7DD3FC] hover:underline flex items-center gap-0.5 shrink-0"
                >
                  <span>Gerenciar Equipe</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SEÇÃO: ALTERAR MEU PLANO (TABELA DE COMPARAÇÃO & UPGRADE) */}
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#7C3AED]" />
            <h2 className="text-xl sm:text-2xl font-black text-[#0D2329] tracking-tight">
              Alterar Meu Plano
            </h2>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#6B7C83]">
            Escolha o plano ideal para o tamanho da sua clínica. O upgrade é processado com total
            segurança pela Hotmart e aplicado automaticamente ao seu acesso.
          </p>
        </div>

        {/* Grid dos 5 Planos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch">
          {PLANS_LIST.map((plan) => {
            const isCurrent = details?.planConfig.id === plan.id
            const isUpgrade = (details?.planConfig.maxProfessionals || 1) < plan.maxProfessionals
            const isDowngrade = (details?.planConfig.maxProfessionals || 1) > plan.maxProfessionals

            // Validação de Downgrade
            const downgradeCheck = isDowngrade && details
              ? checkDowngradeEligibility(details.usedProfessionals, plan)
              : { allowed: true }

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 border-2 ${
                  isCurrent
                    ? "bg-gradient-to-b from-[#F5F3FF] to-white border-[#7C3AED] shadow-md ring-2 ring-[#7C3AED]/20"
                    : plan.isPopular
                    ? "bg-white border-[#DDD6FE] hover:border-[#7C3AED] shadow-sm hover:shadow-md"
                    : "bg-white border-[#D8E5E7] hover:border-[#DDD6FE] shadow-2xs hover:shadow-sm"
                }`}
              >
                {/* Badge Destaque */}
                {isCurrent ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#7C3AED] text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                    Plano Atual
                  </span>
                ) : plan.isPopular ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#10B981] text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                    Mais Escolhido
                  </span>
                ) : null}

                {/* Topo do Card */}
                <div className="space-y-4 pt-1">
                  <div>
                    <h3 className="text-base font-black text-[#0D2329]">{plan.name}</h3>
                    <p className="text-[11px] font-semibold text-[#6B7C83] mt-1 leading-snug">
                      {plan.description}
                    </p>
                  </div>

                  {/* Preço */}
                  <div className="p-3 rounded-2xl bg-[#F7FAFA] border border-[#EEF5F6]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-[#0D2329]">
                        {plan.formattedPrice}
                      </span>
                      <span className="text-[11px] font-bold text-[#6B7C83]">/mês</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-black text-[#7C3AED]">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {plan.maxProfessionals === 1
                          ? "1 Profissional (Master)"
                          : `Até ${plan.maxProfessionals} Profissionais`}
                      </span>
                    </div>
                  </div>

                  {/* Lista de Recursos */}
                  <div className="space-y-2 pt-2 border-t border-[#EEF5F6]">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
                      O que inclui:
                    </p>
                    <ul className="space-y-1.5">
                      {plan.features.slice(0, 4).map((feat, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-[11px] font-medium text-[#475569] leading-tight"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Botão de Ação */}
                <div className="pt-5 mt-4 border-t border-[#EEF5F6]">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full h-11 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] font-black text-xs flex items-center justify-center gap-1.5 cursor-default border border-[#DDD6FE]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Plano Atual</span>
                    </button>
                  ) : isUpgrade ? (
                    <button
                      onClick={() => handlePlanClick(plan)}
                      className="w-full h-11 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Fazer Upgrade</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePlanClick(plan)}
                      disabled={!downgradeCheck.allowed}
                      className={`w-full h-11 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
                        !downgradeCheck.allowed
                          ? "bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA] cursor-not-allowed opacity-80"
                          : "bg-white hover:bg-[#F7FAFA] border-2 border-[#D8E5E7] hover:border-[#7C3AED] text-[#0D2329] active:scale-95"
                      }`}
                      title={
                        !downgradeCheck.allowed
                          ? downgradeCheck.message
                          : `Mudar para o plano ${plan.name}`
                      }
                    >
                      {!downgradeCheck.allowed ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
                          <span>Vagas Excedidas</span>
                        </>
                      ) : (
                        <span>Escolher Plano</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. BLOCO INFORMATIVO & SEGURANÇA HOTMART */}
      <div className="rounded-3xl bg-[#F8FAFC] border-2 border-[#E2E8F0] p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[#10B981]" />
          <h3 className="text-sm font-black text-[#0D2329]">
            Garantia de Segurança e Cobrança Oficial Hotmart
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium text-[#64748B]">
          <div className="space-y-1">
            <strong className="text-[#0D2329] font-bold block">Cobrança Transparente</strong>
            <p>
              Suas assinaturas são gerenciadas com criptografia de ponta a ponta pela Hotmart, sem
              taxas ocultas.
            </p>
          </div>
          <div className="space-y-1">
            <strong className="text-[#0D2329] font-bold block">Liberação Automática</strong>
            <p>
              Assim que o pagamento for aprovado pela Hotmart, seu limite de vagas é liberado em
              tempo real no sistema.
            </p>
          </div>
          <div className="space-y-1">
            <strong className="text-[#0D2329] font-bold block">Suporte & Cancelamento</strong>
            <p>
              Você pode alterar ou cancelar sua assinatura a qualquer momento diretamente pelo
              portal do comprador da Hotmart.
            </p>
          </div>
        </div>
      </div>

      {/* MODAL DE BLOQUEIO DE DOWNGRADE POR EXCESSO DE EQUIPE */}
      {showDowngradeModal && selectedPlanForAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border-2 border-[#D8E5E7] shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center shrink-0 border border-[#FECACA]">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#0D2329]">
                  Limite de Equipe Excedido
                </h3>
                <p className="text-xs font-semibold text-[#6B7C83]">
                  Não é possível mudar para um plano menor agora
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FEF8EC] border border-[#FDE68A] text-xs font-medium text-[#92400E] space-y-2">
              <p>{downgradeMessage}</p>
              <p className="text-[11px] opacity-90">
                Para prosseguir com o downgrade, acesse a aba <strong>Equipe</strong> nas
                Configurações e remova membros até que sua equipe fique dentro do limite do plano{" "}
                <strong>{selectedPlanForAction.name}</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowDowngradeModal(false)}
                className="h-10 px-4 rounded-2xl bg-[#F7FAFA] hover:bg-[#EEF5F6] text-[#0D2329] font-bold text-xs"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setShowDowngradeModal(false)
                  navigate("/configuracoes?aba=equipe")
                }}
                className="h-10 px-4 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <span>Ir para Gestão de Equipe</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
