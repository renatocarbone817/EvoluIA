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

    if (data) {
      localStorage.setItem(`${SUBSCRIPTION_STORAGE_KEY_PREFIX}${masterId}`, JSON.stringify(data))
      return data as Subscription
    }

    // Se não encontrou no banco, verificar cache local
    const cached = localStorage.getItem(`${SUBSCRIPTION_STORAGE_KEY_PREFIX}${masterId}`)
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {}
    }

    // Default seguro: Plano Individual ativo
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
 * Conta o total de profissionais reais (1 Master + membros adicionais ativos)
 */
export async function getActiveTeamCount(masterId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("professionals")
      .select("id", { count: "exact", head: true })
      .eq("master_id", masterId)
      .eq("is_active", true)

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
          return 1 + parsed.filter((m) => m.is_active !== false).length
        }
      } catch {}
    }
    return 1
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

  const planConfig = getPlanConfig(sub.plan_id)
  const maxProfs = sub.max_professionals || planConfig.maxProfessionals || 1
  const availableSeats = Math.max(0, maxProfs - usedCount)

  return {
    subscription: sub,
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
    message: `Para mudar para o plano ${targetPlanConfig.name}, reduza sua equipe para no máximo ${targetPlanConfig.maxProfessionals} profissional${
      targetPlanConfig.maxProfessionals > 1 ? "ais" : ""
    } antes de continuar (atualmente você possui ${usedProfessionals} profissionais cadastrados).`,
  }
}

/**
 * Valida se um profissional tem permissão para logar e usar o sistema com base no plano ativo da Master
 */
export async function validateUserAccess(
  userProf: any
): Promise<{ allowed: boolean; reason?: string }> {
  if (!userProf) return { allowed: true }

  // 1. Se for o usuário Master, o acesso é sempre liberado
  if (userProf.role === "master" || !userProf.master_id) {
    return { allowed: true }
  }

  try {
    const masterId = userProf.master_id
    const sub = await getMasterSubscription(masterId)

    // 2. Verificar se a assinatura da Master está ativa
    if (sub.status === "cancelled" || sub.status === "expired") {
      return {
        allowed: false,
        reason:
          "Acesso suspenso: a assinatura da sua clínica está inativa na Hotmart. Peça para a administradora da conta regularizar a assinatura.",
      }
    }

    // 3. Verificar se o membro está dentro do limite de vagas contratadas
    const maxAllowedSubMembers = Math.max(0, (sub.max_professionals || 1) - 1)

    if (maxAllowedSubMembers === 0) {
      const planConfig = getPlanConfig(sub.plan_id)
      return {
        allowed: false,
        reason: `Acesso bloqueado: sua clínica está no plano ${planConfig.name} (que permite apenas 1 usuário Master). Peça para a administradora da conta fazer upgrade para o plano Duo, Trio ou Equipe na Hotmart para liberar seu acesso.`,
      }
    }

    const { data: team, error } = await supabase
      .from("professionals")
      .select("id, created_at")
      .eq("master_id", masterId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })

    if (error) throw error

    const teamList = team || []
    const memberIndex = teamList.findIndex((m) => m.id === userProf.id)

    // Se o membro estiver além do número de vagas permitidas
    if (memberIndex === -1 || memberIndex >= maxAllowedSubMembers) {
      const planConfig = getPlanConfig(sub.plan_id)
      return {
        allowed: false,
        reason: `Acesso bloqueado por limite de plano: o plano da sua clínica (${planConfig.name}) cobre até ${sub.max_professionals} profissionais. Como você é a ${memberIndex + 1}ª psicopedagoga cadastrada, peça para a administradora fazer upgrade para reativar seu acesso.`,
      }
    }

    return { allowed: true }
  } catch (err) {
    console.error("Error validating user access quota:", err)
    return { allowed: true }
  }
}
