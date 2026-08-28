import type { Professional } from "@/types/database"

/**
 * Retorna os IDs de profissionais cujos dados o usuário logado tem permissão para visualizar.
 *
 * REGRAS DE NEGÓCIO:
 * 1. MASTER: Vê APENAS os próprios dados -> [currentUser.id]
 * 2. PSICOPEDAGOGA com allow_master_data_access = false: Vê APENAS os próprios dados -> [currentUser.id]
 * 3. PSICOPEDAGOGA com allow_master_data_access = true: Vê os próprios dados + dados da MASTER -> [currentUser.id, currentUser.master_id]
 */
export function getAccessibleProfessionalIds(
  professional: Professional | null,
  userId?: string | null
): string[] {
  const currentId = professional?.id || userId
  if (!currentId) return []

  // Se for uma psicopedagoga adicional E tiver acesso liberado aos dados da master
  if (
    professional?.role === "professional" &&
    professional?.master_id &&
    professional?.allow_master_data_access
  ) {
    return [currentId, professional.master_id]
  }

  // Caso padrão (MASTER ou psicopedagoga com acesso independente):
  return [currentId]
}

/**
 * Retorna se o profissional atual é a MASTER / Proprietária da conta.
 */
export function isMasterUser(professional: Professional | null): boolean {
  if (!professional) return true
  return professional.role === "master" || !professional.master_id
}
