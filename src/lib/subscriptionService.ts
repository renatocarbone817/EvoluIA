import { supabase } from "@/lib/supabase"
import type { Subscription, PlanId, SubscriptionStatus } from "@/types/database"
import { getPlanConfig, type PlanConfig } from "@/lib/plans"

export interface SubscriptionDetails {
  subscription: Subscription
  planConfig: PlanConfig
  usedProfessionals: number // Inclui o Master (1) + membros adicionais ATIVOS
  maxProfessionals: number
  availableSeats: number
  isMaster: boolean
  isTrial: boolean
  trialDaysRemaining: number
  isTrialExpired: boolean
}

/**
 * Calcula os dias restantes de teste grátis (Trial)
 */
export function getTrialRemainingDays(subscription: Subscription): number {
  if (subscription.status !== "trial" || !subscription.subscription_expires_at) {
    return 0
  }
  const expiresAt = new Date(subscription.subscription_expires_at).getTime()
  const now = Date.now()
  const diffMs = expiresAt - now
  if (diffMs <= 0) return 0
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Verifica se o período de teste está ativo
 */
export function isTrialActive(subscription: Subscription): boolean {
  if (subscription.status !== "trial") return false
  if (!subscription.subscription_expires_at) return true
  return new Date(subscription.subscription_expires_at).getTime() > Date.now()
}

/**
 * Verifica se o período de teste expirou e não houve pagamento
 */
export function isTrialExpired(subscription: Subscription): boolean {
  if (subscription.status === "active") return false
  if (subscription.status === "trial") {
    if (!subscription.subscription_expires_at) return false
    return new Date(subscription.subscription_expires_at).getTime() <= Date.now()
  }
  return subscription.status === "expired" || subscription.status === "cancelled"
}

const SUBSCRIPTION_STORAGE_KEY_PREFIX = "evoluia_subscription_"

/**
 * Conta apenas os profissionais que estão realmente ATIVOS na equipe (Master + membros is_active: true)
 */
export async function getActiveTeamCount(masterId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("professionals")
      .select("id", { count: "exact", head: true })
      .eq("master_id", masterId)
      .eq("is_active", true)

    if (error) throw error

    // Total = 1 (o próprio Master) + membros convidados ativos
    return 1 + (count || 0)
  } catch (err) {
    // Fallback: verificar membros em cache
    const teamCache = localStorage.getItem(`evoluia_team_members_${masterId}`)
    if (teamCache) {
      try {
        const parsed = JSON.parse(teamCache)
        if (Array.isArray(parsed)) {
          return 1 + parsed.filter((m) => m.is_active === true).length
        }
      } catch {}
    }
    return 1
  }
}

/**
 * Busca a assinatura real do Master na tabela 'subscriptions'
 * O plano padrão contratado é SEMPRE o 'individual' (R$ 39,90 / 1 vaga) a menos que haja assinatura ativa diferente
 */
export async function getMasterSubscription(masterId: string): Promise<Subscription> {
  try {
    // 1. PRIMEIRO checa se há plano gravado no registro do profissional (tag [PLAN:planId:status])
    // Isso é soberano e garante sincronização em tempo real quando o Dono altera no Super Admin!
    try {
      const { data: profData } = await supabase
        .from("professionals")
        .select("bio, email")
        .eq("id", masterId)
        .maybeSingle()

      if (profData?.bio && profData.bio.includes("[PLAN:")) {
        const match = profData.bio.match(/\[PLAN:([a-zA-Z0-9_]+)(?::([a-zA-Z0-9_]+))?\]/)
        if (match) {
          const parsedPlanId = match[1] as PlanId
          const parsedStatus = (match[2] || "active") as SubscriptionStatus
          const planConfig = getPlanConfig(parsedPlanId)

          const subFromProf: Subscription = {
            id: `sub_${masterId}`,
            master_user_id: masterId,
            plan_id: parsedPlanId,
            max_professionals: planConfig.maxProfessionals,
            status: parsedStatus,
            hotmart_product_id: null,
            hotmart_offer_id: null,
            hotmart_subscription_id: "ADMIN_VIP_CORTESIA",
            hotmart_transaction_id: null,
            customer_email: profData.email || null,
            subscription_started_at: new Date().toISOString(),
            subscription_expires_at: null,
            last_payment_at: new Date().toISOString(),
            cancelled_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          localStorage.setItem(`${SUBSCRIPTION_STORAGE_KEY_PREFIX}${masterId}`, JSON.stringify(subFromProf))
          return subFromProf
        }
      }
    } catch (profErr) {
      console.warn("Could not check prof bio for plan:", profErr)
    }

    // 2. Busca na tabela subscriptions
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("master_user_id", masterId)
      .maybeSingle()

    if (error && error.code !== "PGRST116") {
      console.warn("Error fetching subscription from Supabase:", error)
    }

    if (data && data.plan_id) {
      localStorage.setItem(`${SUBSCRIPTION_STORAGE_KEY_PREFIX}${masterId}`, JSON.stringify(data))
      return data as Subscription
    }

    // Default soberano: Plano Individual (R$ 39,90 / 1 profissional)
    const planConfig = getPlanConfig("individual")

    const defaultSub: Subscription = {
      id: `sub_${masterId}`,
      master_user_id: masterId,
      plan_id: "individual",
      max_professionals: 1,
      status: "active",
      hotmart_product_id: "L107381113V",
      hotmart_offer_id: "imn95wux",
      hotmart_subscription_id: null,
      hotmart_transaction_id: null,
      customer_email: null,
      subscription_started_at: new Date().toISOString(),
      subscription_expires_at: null,
      last_payment_at: new Date().toISOString(),
      cancelled_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    localStorage.setItem(`${SUBSCRIPTION_STORAGE_KEY_PREFIX}${masterId}`, JSON.stringify(defaultSub))
    return defaultSub
  } catch (err) {
    console.error("Failed to load subscription:", err)
    const cached = localStorage.getItem(`${SUBSCRIPTION_STORAGE_KEY_PREFIX}${masterId}`)
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {}
    }

    return {
      id: `sub_${masterId}`,
      master_user_id: masterId,
      plan_id: "individual",
      max_professionals: 1,
      status: "active",
      hotmart_product_id: "L107381113V",
      hotmart_offer_id: "imn95wux",
      hotmart_subscription_id: null,
      hotmart_transaction_id: null,
      customer_email: null,
      subscription_started_at: new Date().toISOString(),
      subscription_expires_at: null,
      last_payment_at: new Date().toISOString(),
      cancelled_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
}

/**
 * Retorna todos os detalhes consolidados da assinatura e ocupação de vagas
 * Respeita estritamente o plano contratado e conta apenas profissionais ATIVOS
 */
export async function getSubscriptionDetails(masterId: string): Promise<SubscriptionDetails> {
  const [sub, usedCount] = await Promise.all([
    getMasterSubscription(masterId),
    getActiveTeamCount(masterId),
  ])

  const planConfig = getPlanConfig(sub.plan_id)
  const maxProfs = sub.max_professionals || planConfig.maxProfessionals || 1
  const availableSeats = Math.max(0, maxProfs - usedCount)
  const isTrial = sub.status === "trial"
  const trialDaysRemaining = getTrialRemainingDays(sub)
  const isTrialExp = isTrialExpired(sub)

  return {
    subscription: sub,
    planConfig,
    usedProfessionals: usedCount,
    maxProfessionals: maxProfs,
    availableSeats,
    isMaster: true,
    isTrial,
    trialDaysRemaining,
    isTrialExpired: isTrialExp,
  }
}

/**
 * Validação de Downgrade: verifica se a equipe atual cabe no novo plano
 */
export function checkDowngradeEligibility(
  usedProfessionals: number,
  targetPlanConfig: PlanConfig
): {
  allowed: boolean
  message?: string
} {
  if (usedProfessionals <= targetPlanConfig.maxProfessionals) {
    return { allowed: true }
  }

  const excess = usedProfessionals - targetPlanConfig.maxProfessionals
  return {
    allowed: false,
    message: `Você possui ${usedProfessionals} profissionais ativos na sua equipe. Para migrar para o plano ${targetPlanConfig.name} (limite de ${targetPlanConfig.maxProfessionals} profissionais), é necessário remover ou desativar ${excess} profissional(is) na aba Equipe.`,
  }
}

/**
 * Validação de Acesso: verifica se o usuário membro tem direito de usar a plataforma
 */
export async function validateUserAccess(professional: any): Promise<{
  allowed: boolean
  reason?: string
}> {
  if (!professional) return { allowed: false, reason: "Usuário não encontrado." }

  // Se for o próprio Master, tem acesso total garantido
  if (professional.role === "master" || !professional.master_id) {
    return { allowed: true }
  }

  // Se for membro de equipe, verificar status da assinatura do Master
  const masterId = professional.master_id
  const sub = await getMasterSubscription(masterId)

  if (sub.status === "cancelled" || sub.status === "expired") {
    return {
      allowed: false,
      reason: "O plano da clínica está inativo ou cancelado. Entre em contato com a psicopedagoga responsável.",
    }
  }

  // Se o membro foi excluído/desativado pela dona
  if (professional.is_active === false) {
    return {
      allowed: false,
      reason: "Seu acesso foi desativado pela administradora da clínica.",
    }
  }

  return { allowed: true }
}
