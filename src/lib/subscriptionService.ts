import { supabase } from "@/lib/supabase"
import type { Subscription, PlanId, SubscriptionStatus } from "@/types/database"
import { getPlanConfig, type PlanConfig } from "@/lib/plans"

export interface SubscriptionDetails {
  subscription: Subscription
  planConfig: PlanConfig
  usedProfessionals: number // Inclui o Master (1) + membros adicionais
  maxProfessionals: number
  availableSeats: number
  isMaster: boolean
}

const SUBSCRIPTION_STORAGE_KEY_PREFIX = "evoluia_subscription_"

/**
 * Conta o total de profissionais reais (1 Master + membros adicionais)
 */
export async function getActiveTeamCount(masterId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("professionals")
      .select("id", { count: "exact", head: true })
      .eq("master_id", masterId)

    if (error) throw error

    // Total = 1 (o próprio Master) + membros convidados
    return 1 + (count || 0)
  } catch (err) {
    // Fallback: verificar membros em cache
    const teamCache = localStorage.getItem(`evoluia_team_members_${masterId}`)
    if (teamCache) {
      try {
        const parsed = JSON.parse(teamCache)
        if (Array.isArray(parsed)) {
          return 1 + parsed.length
        }
      } catch {}
    }
    return 1
  }
}

/**
 * Busca a assinatura real do Master na tabela 'subscriptions'
 */
export async function getMasterSubscription(masterId: string): Promise<Subscription> {
  try {
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

    // Se não encontrou no banco, calcula o plano baseado no tamanho da equipe
    const teamCount = await getActiveTeamCount(masterId)
    let autoPlanId: PlanId = "individual"
    if (teamCount >= 5) autoPlanId = "clinica"
    else if (teamCount >= 4) autoPlanId = "equipe"
    else if (teamCount >= 3) autoPlanId = "trio"
    else if (teamCount >= 2) autoPlanId = "duo"

    const planConfig = getPlanConfig(autoPlanId)

    const defaultSub: Subscription = {
      id: `sub_${masterId}`,
      master_user_id: masterId,
      plan_id: planConfig.id,
      max_professionals: planConfig.maxProfessionals,
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
      plan_id: "clinica",
      max_professionals: 5,
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
 */
export async function getSubscriptionDetails(masterId: string): Promise<SubscriptionDetails> {
  const [sub, usedCount] = await Promise.all([
    getMasterSubscription(masterId),
    getActiveTeamCount(masterId),
  ])

  // Sincronização inteligente: garante que o plano cubra a equipe existente
  let effectivePlanId: PlanId = sub.plan_id as PlanId
  let maxProfs = sub.max_professionals || getPlanConfig(effectivePlanId).maxProfessionals

  if (usedCount > maxProfs) {
    if (usedCount >= 5) effectivePlanId = "clinica"
    else if (usedCount >= 4) effectivePlanId = "equipe"
    else if (usedCount >= 3) effectivePlanId = "trio"
    else if (usedCount >= 2) effectivePlanId = "duo"

    maxProfs = getPlanConfig(effectivePlanId).maxProfessionals
  }

  const planConfig = getPlanConfig(effectivePlanId)
  const availableSeats = Math.max(0, maxProfs - usedCount)

  return {
    subscription: {
      ...sub,
      plan_id: effectivePlanId,
      max_professionals: maxProfs,
    },
    planConfig,
    usedProfessionals: usedCount,
    maxProfessionals: maxProfs,
    availableSeats,
    isMaster: true,
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
    message: `Você possui ${usedProfessionals} profissionais cadastrados na sua equipe. Para migrar para o plano ${targetPlanConfig.name} (limite de ${targetPlanConfig.maxProfessionals} profissionais), é necessário remover ou desativar ${excess} profissional(is) na aba Equipe.`,
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

  // Verificar se o profissional está ativo
  if (professional.is_active === false) {
    return {
      allowed: false,
      reason: "Seu acesso foi desativado pela administradora da clínica.",
    }
  }

  return { allowed: true }
}
