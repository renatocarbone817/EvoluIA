import { useState, useEffect } from "react"
import {
  FileText,
  Trash2,
  Sparkles,
  Clock,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { formatDate } from "@/lib/utils"
import toast from "react-hot-toast"
import type { Report, Child } from "@/types/database"
import { ClinicalReportBuilderModal } from "@/components/reports/ClinicalReportBuilderModal"

interface ChildReportsTabProps {
  child: Child
  onReloadChild?: () => void
}

export function ChildReportsTab({ child, onReloadChild }: ChildReportsTabProps) {
  const { professional } = useAuthStore()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [showClinicalModal, setShowClinicalModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingReport, setDeletingReport] = useState(false)

  useEffect(() => {
    loadReports()
  }, [child.id])

  async function loadReports() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .eq("child_id", child.id)
        .order("created_at", { ascending: false })

      setReports(data || [])
    } finally {
      setLoading(false)
    }
  }

  // EXCLUIR RELATÓRIO
  async function handleDeleteReport() {
    if (!activeReport) return
    setDeletingReport(true)
    try {
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("id", activeReport.id)

      if (error) throw error

      toast.success("Laudo excluído com sucesso! Agora você pode criar um novo.", { icon: "🗑️" })
      setShowDeleteModal(false)
      onReloadChild?.()
      await loadReports()
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir laudo")
    } finally {
      setDeletingReport(false)
    }
  }

  const activeReport = reports[0] || null

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-[#F7FAFA] animate-pulse rounded-3xl border-2 border-[#D8E5E7]" />
      </div>
    )
  }

  if (showClinicalModal) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <ClinicalReportBuilderModal
          isOpen={true}
          onClose={() => setShowClinicalModal(false)}
          child={child}
          reportId={activeReport?.id}
          onSaved={() => {
            loadReports()
            if (onReloadChild) onReloadChild()
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* CENÁRIO 1: A CRIANÇA AINDA NÃO POSSUI RELATÓRIO */}
      {!activeReport ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-white border-2 border-dashed border-[#D8E5E7] text-center space-y-5 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-[#EDE9FE] border-2 border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center mx-auto shadow-xs">
            <FileText className="w-8 h-8" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-black text-[#0D2329]">Laudo Psicopedagógico Completo</h3>
            <p className="text-xs font-semibold text-[#6B7C83] leading-relaxed">
              Gere o laudo psicopedagógico oficial de <strong>{child.full_name}</strong> com Anamnese Familiar, Entrevista Escolar, Instrumentos de Avaliação e exportação direta em Microsoft Word (.docx).
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowClinicalModal(true)}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#2563EB] via-[#6366F1] to-[#7C3AED] hover:from-[#1D4ED8] hover:to-[#6D28D9] text-white text-xs font-black inline-flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>✨ Gerar Laudo Completo em Word (.docx)</span>
            </button>
          </div>
        </div>
      ) : (
        /* CENÁRIO 2: RELATÓRIO JÁ CADASTRADO / EM ELABORAÇÃO */
        <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-6">
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEF5F6] pb-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] border-2 border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center font-bold shrink-0 shadow-xs">
                <FileText className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-[#0D2329]">
                    Laudo Psicopedagógico Clínico
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE]">
                    📝 Laudo Ativo
                  </span>
                </div>

                <p className="text-xs font-semibold text-[#6B7C83] flex items-center gap-3 flex-wrap">
                  <span>Iniciado em: <strong>{formatDate(activeReport.created_at)}</strong></span>
                  {activeReport.updated_at && (
                    <span>• Última atualização: <strong>{formatDate(activeReport.updated_at)}</strong></span>
                  )}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => setShowClinicalModal(true)}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#2563EB] via-[#6366F1] to-[#7C3AED] hover:from-[#1D4ED8] hover:to-[#6D28D9] text-white text-xs font-black flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>✨ Abrir Gerador de Laudo em Word (.docx)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-3 rounded-2xl bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                title="Excluir este laudo para criar outro"
              >
                <Trash2 className="w-4 h-4 text-[#DC2626]" />
                <span>Excluir</span>
              </button>
            </div>
          </div>

          {/* Report Information Card */}
          <div className="p-5 rounded-2xl bg-[#F8FAFB] border border-[#D8E5E7] space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#6B7C83]">
              Informações do Documento
            </h4>
            <p className="text-sm font-black text-[#0D2329]">{activeReport.title}</p>
            <p className="text-xs font-semibold text-[#6B7C83] leading-relaxed">
              Clique no botão <strong>"Abrir Gerador de Laudo em Word"</strong> acima para preencher ou revisar as etapas da Anamnese, Entrevista Escolar, Instrumentos Avaliativos, Hipótese Diagnóstica e exportar diretamente para o arquivo Word (.docx) com a identidade visual da clínica.
            </p>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DO LAUDO
          ========================================================================= */}
      {showDeleteModal && activeReport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[#FECACA] max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF2F2] border-2 border-[#FECACA] text-[#DC2626] flex items-center justify-center mx-auto shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-[#0D2329]">Excluir Laudo?</h3>
              <p className="text-xs font-semibold text-[#6B7C83] leading-relaxed">
                Tem certeza que deseja excluir o laudo de <strong>{child.full_name}</strong>? Este registro será removido para que você possa iniciar um novo laudo do zero.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#6B7C83] hover:bg-[#F7FAFA] border border-[#D8E5E7] transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={deletingReport}
                onClick={handleDeleteReport}
                className="px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {deletingReport ? <Clock className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{deletingReport ? "Excluindo..." : "Sim, Excluir Laudo"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
