import { createClient } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import type { Professional } from "@/types/database"
import { getMasterSubscription } from "@/lib/subscriptionService"
import { getPlanConfig } from "@/lib/plans"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Cliente temporário sem persistência de sessão para registrar novos membros
 * sem deslogar a Master da sessão atual do navegador.
 */
function createTempAuthClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

export interface CreateTeamMemberParams {
  masterId: string
  fullName: string
  email: string
  password?: string
  allowMasterDataAccess: boolean
}

export interface UpdateTeamMemberParams {
  id: string
  fullName: string
  email: string
  password?: string
  allowMasterDataAccess: boolean
}

const TEAM_STORAGE_KEY_PREFIX = "evoluia_team_members_"

/**
 * Lista todas as psicopedagogas vinculadas à conta Master
 */
export async function listTeamMembers(masterId: string): Promise<Professional[]> {
  try {
    const { data, error } = await supabase
      .from("professionals")
      .select("*")
      .eq("master_id", masterId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })

    if (error) throw error

    if (data && data.length > 0) {
      localStorage.setItem(`${TEAM_STORAGE_KEY_PREFIX}${masterId}`, JSON.stringify(data))
      return data as Professional[]
    }

    // Fallback local se a tabela Supabase ainda não tiver os registros
    const local = localStorage.getItem(`${TEAM_STORAGE_KEY_PREFIX}${masterId}`)
    return local ? JSON.parse(local) : []
  } catch (e) {
    const local = localStorage.getItem(`${TEAM_STORAGE_KEY_PREFIX}${masterId}`)
    return local ? JSON.parse(local) : []
  }
}

/**
 * Cria uma nova psicopedagoga adicional na conta Master respeitando o limite do plano
 */
export async function createTeamMember(params: CreateTeamMemberParams): Promise<Professional> {
  const [currentMembers, subscription] = await Promise.all([
    listTeamMembers(params.masterId),
    getMasterSubscription(params.masterId),
  ])

  const planConfig = getPlanConfig(subscription.plan_id)
  const maxProfs = subscription.max_professionals || planConfig.maxProfessionals || 1
  const totalWithNew = 1 + currentMembers.length + 1 // Master (1) + existentes + novo

  if (totalWithNew > maxProfs) {
    throw new Error(
      `Você atingiu o limite de ${maxProfs} profissional${maxProfs > 1 ? "ais" : ""} do seu plano (${planConfig.name}). Acesse 'Meu Plano' para fazer upgrade e liberar mais vagas.`
    )
  }

  const tempAuth = createTempAuthClient()
  let authUserId = ""

  if (params.password) {
    const { data: authData, error: authError } = await tempAuth.auth.signUp({
      email: params.email.trim().toLowerCase(),
      password: params.password,
      options: {
        data: {
          full_name: params.fullName.trim(),
          role: "professional",
          master_id: params.masterId,
          allow_master_data_access: params.allowMasterDataAccess,
        },
      },
    })

    if (authError) {
      if (authError.message?.toLowerCase().includes("already registered") || authError.message?.toLowerCase().includes("duplicate")) {
        throw new Error("Este e-mail já está cadastrado no sistema.")
      }
      throw new Error(authError.message || "Erro ao criar conta de acesso")
    }

    authUserId = authData.user?.id || ""
  }

  if (!authUserId) {
    // Generate valid UUID fallback if needed
    authUserId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `prof_${Date.now()}`
  }

  const newProf: Partial<Professional> = {
    id: authUserId,
    full_name: params.fullName.trim(),
    email: params.email.trim().toLowerCase(),
    role: "professional",
    master_id: params.masterId,
    allow_master_data_access: params.allowMasterDataAccess,
    is_active: true,
    specialty: "Psicopedagogia",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    await supabase.from("professionals").upsert(newProf as any)
  } catch (err) {
    console.warn("Could not upsert directly to supabase professionals:", err)
  }

  // Update local storage cache
  const updated = [...currentMembers.filter(m => m.id !== authUserId), newProf as Professional]
  localStorage.setItem(`${TEAM_STORAGE_KEY_PREFIX}${params.masterId}`, JSON.stringify(updated))

  return newProf as Professional
}

/**
 * Atualiza os dados ou permissão de acesso da psicopedagoga
 */
export async function updateTeamMember(params: UpdateTeamMemberParams, masterId: string): Promise<Professional> {
  const currentMembers = await listTeamMembers(masterId)
  const existing = currentMembers.find(m => m.id === params.id)
  if (!existing) {
    throw new Error("Profissional não encontrada.")
  }

  const updatedProf: Professional = {
    ...existing,
    full_name: params.fullName.trim(),
    email: params.email.trim().toLowerCase(),
    allow_master_data_access: params.allowMasterDataAccess,
    updated_at: new Date().toISOString(),
  }

  try {
    await supabase
      .from("professionals")
      .update({
        full_name: updatedProf.full_name,
        email: updatedProf.email,
        allow_master_data_access: updatedProf.allow_master_data_access,
      })
      .eq("id", params.id)
  } catch (err) {
    console.warn("Supabase update error:", err)
  }

  const updatedList = currentMembers.map(m => (m.id === params.id ? updatedProf : m))
  localStorage.setItem(`${TEAM_STORAGE_KEY_PREFIX}${masterId}`, JSON.stringify(updatedList))

  return updatedProf
}

/**
 * Remove com segurança o acesso de uma psicopedagoga sem deletar em cascata os pacientes
 */
export async function removeTeamMember(id: string, masterId: string): Promise<void> {
  try {
    await supabase
      .from("professionals")
      .update({ is_active: false })
      .eq("id", id)
  } catch (err) {
    console.warn("Supabase deactivation error:", err)
  }

  const currentMembers = await listTeamMembers(masterId)
  const updatedList = currentMembers.filter(m => m.id !== id)
  localStorage.setItem(`${TEAM_STORAGE_KEY_PREFIX}${masterId}`, JSON.stringify(updatedList))
}
