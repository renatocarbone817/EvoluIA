export type PlanId = "individual" | "duo" | "trio" | "equipe" | "clinica"
export type SubscriptionStatus = "active" | "trial" | "pending" | "cancelled" | "expired"

export interface PlanConfig {
  id: PlanId
  name: string
  priceMonthly: number
  formattedPrice: string
  maxProfessionals: number
  description: string
  hotmartOfferCode: string
  hotmartCheckoutUrl: string
  features: string[]
  isPopular?: boolean
}

export const HOTMART_PRODUCT_ID = "L107381113V"

export const PLANS: Record<PlanId, PlanConfig> = {
  individual: {
    id: "individual",
    name: "EvoluIA Individual",
    priceMonthly: 39.9,
    formattedPrice: "R$ 39,90",
    maxProfessionals: 1,
    description: "Ideal para psicopedagogas autônomas e consultórios solo.",
    hotmartOfferCode: "imn95wux",
    hotmartCheckoutUrl: "https://pay.hotmart.com/L107381113V?off=imn95wux",
    features: [
      "1 Usuário Profissional (Master)",
      "Pacientes e Anamneses ilimitados",
      "Agenda completa com lembretes",
      "Prontuários e sessões psicopedagógicas",
      "Controle financeiro e relatórios",
      "IA para análise e apoio clínico",
    ],
  },
  duo: {
    id: "duo",
    name: "EvoluIA Duo",
    priceMonthly: 49.9,
    formattedPrice: "R$ 49,90",
    maxProfessionals: 2,
    description: "Para duplas de profissionais ou consultório compartilhado.",
    hotmartOfferCode: "bc2cgf38",
    hotmartCheckoutUrl: "https://pay.hotmart.com/L107381113V?off=bc2cgf38",
    features: [
      "Até 2 Profissionais (Master + 1)",
      "Gestão de equipe e permissões",
      "Pacientes e Anamneses ilimitados",
      "Agenda compartilhada ou individual",
      "Prontuários e sessões completas",
      "IA para análise e apoio clínico",
    ],
    isPopular: true,
  },
  trio: {
    id: "trio",
    name: "EvoluIA Trio",
    priceMonthly: 59.9,
    formattedPrice: "R$ 59,90",
    maxProfessionals: 3,
    description: "Para pequenas equipes multidisciplinares e clínicas em crescimento.",
    hotmartOfferCode: "liorml73",
    hotmartCheckoutUrl: "https://pay.hotmart.com/L107381113V?off=liorml73",
    features: [
      "Até 3 Profissionais (Master + 2)",
      "Gestão de equipe e permissões",
      "Pacientes e Anamneses ilimitados",
      "Agenda compartilhada ou individual",
      "Prontuários e sessões completas",
      "IA para análise e apoio clínico",
    ],
  },
  equipe: {
    id: "equipe",
    name: "EvoluIA Equipe",
    priceMonthly: 69.9,
    formattedPrice: "R$ 69,90",
    maxProfessionals: 4,
    description: "Para clínicas estruturadas com até 4 profissionais ativas.",
    hotmartOfferCode: "bgstdxk6",
    hotmartCheckoutUrl: "https://pay.hotmart.com/L107381113V?off=bgstdxk6",
    features: [
      "Até 4 Profissionais (Master + 3)",
      "Gestão de equipe e permissões",
      "Pacientes e Anamneses ilimitados",
      "Agenda compartilhada ou individual",
      "Prontuários e sessões completas",
      "IA para análise e apoio clínico",
    ],
  },
  clinica: {
    id: "clinica",
    name: "EvoluIA Clínica",
    priceMonthly: 79.9,
    formattedPrice: "R$ 79,90",
    maxProfessionals: 5,
    description: "Para clínicas consolidadas com até 5 profissionais no consultório.",
    hotmartOfferCode: "3ug8msdy",
    hotmartCheckoutUrl: "https://pay.hotmart.com/L107381113V?off=3ug8msdy",
    features: [
      "Até 5 Profissionais (Master + 4)",
      "Gestão de equipe e permissões",
      "Pacientes e Anamneses ilimitados",
      "Agenda compartilhada ou individual",
      "Prontuários e sessões completas",
      "IA para análise e apoio clínico",
    ],
  },
}

export const PLANS_LIST: PlanConfig[] = [
  PLANS.individual,
  PLANS.duo,
  PLANS.trio,
  PLANS.equipe,
  PLANS.clinica,
]

export const HOTMART_MANAGE_SUBSCRIPTION_URL = "https://consumer.hotmart.com/purchase"

export function getPlanConfig(planId?: string | null): PlanConfig {
  if (!planId) return PLANS.individual
  const normalized = planId.toLowerCase().trim() as PlanId
  return PLANS[normalized] || PLANS.individual
}

export function getPlanByOfferCode(offerCode?: string | null): PlanConfig | null {
  if (!offerCode) return null
  const clean = offerCode.trim().toLowerCase()
  return (
    PLANS_LIST.find((p) => p.hotmartOfferCode.toLowerCase() === clean) || null
  )
}

export function getSubscriptionStatusLabel(status?: SubscriptionStatus | string | null): {
  label: string
  colorClass: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
  iconColor: string
} {
  switch (status) {
    case "active":
      return {
        label: "Assinatura Ativa",
        colorClass: "text-[#10B981]",
        badgeBg: "bg-[#E8F8F5]",
        badgeText: "text-[#065F46]",
        badgeBorder: "border-[#A7F3D0]",
        iconColor: "text-[#10B981]",
      }
    case "trial":
      return {
        label: "Período de Teste",
        colorClass: "text-[#F59E0B]",
        badgeBg: "bg-[#FEF8EC]",
        badgeText: "text-[#B8871E]",
        badgeBorder: "border-[#FDE68A]",
        iconColor: "text-[#F59E0B]",
      }
    case "pending":
      return {
        label: "Pagamento Pendente",
        colorClass: "text-[#F97316]",
        badgeBg: "bg-[#FFF7ED]",
        badgeText: "text-[#EA580C]",
        badgeBorder: "border-[#FED7AA]",
        iconColor: "text-[#F97316]",
      }
    case "cancelled":
      return {
        label: "Assinatura Cancelada",
        colorClass: "text-[#EF4444]",
        badgeBg: "bg-[#FEF2F2]",
        badgeText: "text-[#DC2626]",
        badgeBorder: "border-[#FECACA]",
        iconColor: "text-[#EF4444]",
      }
    case "expired":
      return {
        label: "Assinatura Expirada",
        colorClass: "text-[#6B7C83]",
        badgeBg: "bg-[#F7FAFA]",
        badgeText: "text-[#6B7C83]",
        badgeBorder: "border-[#D8E5E7]",
        iconColor: "text-[#6B7C83]",
      }
    default:
      return {
        label: "Assinatura Ativa",
        colorClass: "text-[#10B981]",
        badgeBg: "bg-[#E8F8F5]",
        badgeText: "text-[#065F46]",
        badgeBorder: "border-[#A7F3D0]",
        iconColor: "text-[#10B981]",
      }
  }
}

export const PLANS_CONFIG = PLANS_LIST


