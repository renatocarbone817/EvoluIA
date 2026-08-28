import type { Professional } from "@/types/database"

/**
 * Retorna os IDs de profissionais cujos dados o usuário logado tem permissão para visualizar.
 *
 * REGRAS DE COMPARTILHAMENTO EM TEMPO REAL (ZERO-COPY / SEM DUPLICAÇÃO):
 *
 * 1. MASTER:
 *    - Visualiza os próprios dados
 *    - MAIS os dados de todas as psicopedagogas da equipe com [allow_master_data_access = true]
 *    - NÃO visualiza os dados das psicopedagogas com compartilhamento desativado (100% isoladas).
 *
 * 2. PSICOPEDAGOGA COM COMPARTILHAMENTO ATIVADO (allow_master_data_access = true):
 *    - Visualiza seus próprios dados
 *    - MAIS os dados da MASTER
 *    - NÃO visualiza os dados de outras psicopedagogas da equipe.
 *
 * 3. PSICOPEDAGOGA COM COMPARTILHAMENTO DESATIVADO (allow_master_data_access = false):
 *    - Visualiza APENAS seus próprios dados (espaço 100% isolado).
 */
export function getAccessibleProfessionalIds(
  professional: Professional | null,
  userId?: string | null
): string[] {
  const currentId = professional?.id || userId
  if (!currentId) return []

  // CASO 1: PSICOPEDAGOGA ADICIONAL
  if (professional?.role === "professional" && professional?.master_id) {
    if (professional.allow_master_data_access) {
      return Array.from(new Set([currentId, professional.master_id]))
    }
    return [currentId]
  }

  // CASO 2: MASTER / PROPRIETÁRIA DA CONTA
  // A Master visualiza seus próprios dados + dados das psicopedagogas com compartilhamento ativado
  const teamCacheKey = `evoluia_team_members_${currentId}`
  try {
    const raw = localStorage.getItem(teamCacheKey)
    if (raw) {
      const members = JSON.parse(raw) as Professional[]
      const sharedMemberIds = members
        .filter((m) => m.allow_master_data_access && m.is_active !== false)
        .map((m) => m.id)

      return Array.from(new Set([currentId, ...sharedMemberIds]))
    }
  } catch (e) {
    // fallback seguro
  }

  return [currentId]
}

/**
 * Retorna se o profissional atual é a MASTER / Proprietária original da conta.
 */
export function isMasterUser(professional: Professional | null): boolean {
  if (!professional) return false
  if (professional.role === "professional" || professional.master_id) {
    return false
  }
  return true
}
