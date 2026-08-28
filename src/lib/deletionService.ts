import { supabase } from "@/lib/supabase"
import type { Child, Guardian } from "@/types/database"

/**
 * Verifica quantos registros financeiros estão vinculados a uma criança.
 */
export async function checkChildFinancialRecords(childId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("financial_records")
      .select("*", { count: "exact", head: true })
      .eq("child_id", childId)

    if (error) {
      console.error("Erro ao contar registros financeiros:", error)
      return 0
    }
    return count || 0
  } catch (err) {
    console.error("Erro ao contar registros financeiros:", err)
    return 0
  }
}

/**
 * Exclui uma criança com segurança:
 * 1. Preserva todos os registros financeiros associados, salvando o nome da criança nas notas/descrição
 *    e desvinculando o child_id para que nunca sejam apagados em cascata.
 * 2. Remove a criança da tabela children (o que limpa em cascata avaliações, sessões, relatórios e documentos clínicos).
 * 3. Mantém os responsáveis e irmãos 100% intactos.
 */
export async function deleteChildSafely(
  childId: string,
  profId: string,
  childName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Obter o nome real da criança se não tiver sido passado
    let name = childName
    if (!name) {
      const { data: childData } = await supabase
        .from("children")
        .select("full_name")
        .eq("id", childId)
        .maybeSingle()
      name = childData?.full_name || "Paciente"
    }

    // 2. Buscar registros financeiros vinculados
    const { data: finRecords } = await supabase
      .from("financial_records")
      .select("id, notes")
      .eq("child_id", childId)

    // 3. Atualizar cada registro financeiro para preservar o nome do paciente e desvincular child_id
    if (finRecords && finRecords.length > 0) {
      for (const record of finRecords) {
        const currentNotes = (record.notes || "").trim()
        let updatedNotes = currentNotes

        // Se a nota não contiver o nome da criança, prefixar/anotar para clareza eterna
        if (!currentNotes.toLowerCase().includes(name.toLowerCase())) {
          if (currentNotes.startsWith("[RECEITA:")) {
            updatedNotes = currentNotes.replace(
              /\[RECEITA:\s*([^\]]+)\]\s*(.*)/,
              `[RECEITA: $1] ${name} (Histórico) - $2`
            )
          } else if (currentNotes) {
            updatedNotes = `${name} (Histórico): ${currentNotes}`
          } else {
            updatedNotes = `[RECEITA: Sessão] Atendimento - ${name} (Histórico)`
          }
        }

        await supabase
          .from("financial_records")
          .update({
            child_id: null,
            notes: updatedNotes,
          })
          .eq("id", record.id)
      }
    }

    // 4. Excluir a criança da tabela 'children'
    const { error: deleteError } = await supabase
      .from("children")
      .delete()
      .eq("id", childId)

    if (deleteError) {
      throw new Error(deleteError.message || "Erro ao excluir registro da criança.")
    }

    return { success: true }
  } catch (err: any) {
    console.error("Erro na exclusão da criança:", err)
    return { success: false, error: err.message || "Não foi possível excluir a criança." }
  }
}

/**
 * Retorna as crianças vinculadas a um responsável específico.
 */
export async function checkGuardianLinkedChildren(
  guardianId: string
): Promise<{ id: string; full_name: string }[]> {
  try {
    const { data, error } = await supabase
      .from("guardian_children")
      .select("child:children(id, full_name)")
      .eq("guardian_id", guardianId)

    if (error || !data) return []

    const children: { id: string; full_name: string }[] = []
    data.forEach((item: any) => {
      if (item.child && item.child.id) {
        children.push({
          id: item.child.id,
          full_name: item.child.full_name,
        })
      }
    })
    return children
  } catch (err) {
    console.error("Erro ao verificar crianças do responsável:", err)
    return []
  }
}

/**
 * Exclui um responsável com segurança:
 * 1. Remove os vínculos de parentesco em guardian_children.
 * 2. Exclui o registro da tabela guardians.
 * 3. NUNCA apaga nenhuma criança vinculada (as crianças continuam 100% salvas com seus históricos).
 */
export async function deleteGuardianSafely(
  guardianId: string,
  profId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Remover todos os vínculos em guardian_children
    await supabase
      .from("guardian_children")
      .delete()
      .eq("guardian_id", guardianId)

    // 2. Excluir o responsável
    const { error: deleteError } = await supabase
      .from("guardians")
      .delete()
      .eq("id", guardianId)

    if (deleteError) {
      throw new Error(deleteError.message || "Erro ao excluir responsável.")
    }

    return { success: true }
  } catch (err: any) {
    console.error("Erro na exclusão do responsável:", err)
    return { success: false, error: err.message || "Não foi possível excluir o responsável." }
  }
}
