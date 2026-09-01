import { useState, useEffect, useRef } from "react"
import {
  FileText,
  Trash2,
  Sparkles,
  Clock,
  Upload,
  Download,
  CheckCircle2,
  FileCheck,
  Paperclip,
  ExternalLink,
  RefreshCw,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { formatDate } from "@/lib/utils"
import toast from "react-hot-toast"
import type { Report, Child, Document } from "@/types/database"
import { ClinicalReportBuilderModal } from "@/components/reports/ClinicalReportBuilderModal"

interface ChildReportsTabProps {
  child: Child
  onReloadChild?: () => void
}

export function ChildReportsTab({ child, onReloadChild }: ChildReportsTabProps) {
  const { professional, user } = useAuthStore()
  const [reports, setReports] = useState<Report[]>([])
  const [finalDocuments, setFinalDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [showClinicalModal, setShowClinicalModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingReport, setDeletingReport] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const profId = professional?.id || user?.id || child.professional_id

  useEffect(() => {
    loadData()
  }, [child.id])

  async function loadData() {
    setLoading(true)
    try {
      // 1. Carregar relatórios
      const { data: repData } = await supabase
        .from("reports")
        .select("*")
        .eq("child_id", child.id)
        .order("created_at", { ascending: false })

      setReports(repData || [])

      // 2. Carregar documentos de laudo final anexados
      const { data: docData } = await supabase
        .from("documents")
        .select("*")
        .eq("child_id", child.id)
        .eq("category", "relatorios")
        .order("created_at", { ascending: false })

      setFinalDocuments(docData || [])
    } finally {
      setLoading(false)
    }
  }

  // Upload do Laudo Final Editado/Assinado pelo computador
  async function handleUploadFinalDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profId) return

    setUploadingDoc(true)
    const toastId = toast.loading("Enviando laudo final...")
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
      const filePath = `${profId}/${child.id}/${fileName}`

      // 1. Upload para o Supabase Storage
      const { error: storageError } = await supabase.storage
        .from("child-documents")
        .upload(filePath, file)

      if (storageError) throw storageError

      const { data: publicUrlData } = supabase.storage
        .from("child-documents")
        .getPublicUrl(filePath)

      // 2. Grava registro na tabela documents (categoria: relatorios)
      const { error: dbError } = await supabase.from("documents").insert({
        professional_id: profId,
        child_id: child.id,
        file_name: file.name,
        file_url: publicUrlData.publicUrl,
        file_type: fileExt || null,
        file_size: file.size,
        category: "relatorios",
      })

      if (dbError) throw dbError

      // 3. Atualiza o status do relatório para 'final' e da criança para 'report_completed'
      if (activeReport) {
        await supabase
          .from("reports")
          .update({
            status: "final",
            updated_at: new Date().toISOString(),
          })
          .eq("id", activeReport.id)
      }

      await supabase
        .from("children")
        .update({ status: "report_completed" })
        .eq("id", child.id)

      toast.success("Laudo final anexado com sucesso! Paciente marcado como Concluído.", { id: toastId, icon: "📎" })
      if (onReloadChild) onReloadChild()
      await loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Erro ao anexar laudo final.", { id: toastId })
    } finally {
      setUploadingDoc(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Excluir documento de laudo final anexado
  async function handleDeleteFinalDoc(docId: string) {
    if (!confirm("Deseja realmente remover este laudo final anexado?")) return
    try {
      await supabase.from("documents").delete().eq("id", docId)
      toast.success("Documento removido com sucesso!")
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover documento.")
    }
  }

  // Alternar status do relatório (Em Elaboração <-> Finalizado)
  async function handleToggleStatus(newStatus: "draft" | "final") {
    if (!activeReport) return
    try {
      await supabase
        .from("reports")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeReport.id)

      await supabase
        .from("children")
        .update({
          status: newStatus === "final" ? "report_completed" : "report_in_progress",
        })
        .eq("id", child.id)

      toast.success(newStatus === "final" ? "Laudo marcado como Finalizado!" : "Laudo reaberto para Em Elaboração.")
      if (onReloadChild) onReloadChild()
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar status.")
    }
  }

  // Excluir relatório completo
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
      await loadData()
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir laudo")
    } finally {
      setDeletingReport(false)
    }
  }

  const activeReport = reports[0] || null
  const isCompleted = activeReport?.status === "final" || child.status === "report_completed"

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
            loadData()
            if (onReloadChild) onReloadChild()
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Input de arquivo oculto para upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleUploadFinalDoc}
      />

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
        <div className="space-y-6">
          {/* Card Principal do Gerador de Laudo */}
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
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${
                        isCompleted
                          ? "bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]"
                          : "bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE]"
                      }`}
                    >
                      {isCompleted ? "✅ Laudo Finalizado" : "📝 Em Elaboração"}
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

            {/* Informações do Documento */}
            <div className="p-5 rounded-2xl bg-[#F8FAFB] border border-[#D8E5E7] space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#6B7C83]">
                Informações do Documento
              </h4>
              <p className="text-sm font-black text-[#0D2329]">{activeReport.title}</p>
              <p className="text-xs font-semibold text-[#6B7C83] leading-relaxed">
                Clique no botão <strong>"Abrir Gerador de Laudo em Word"</strong> acima para preencher ou revisar as etapas da Anamnese, Entrevista Escolar, Instrumentos Avaliativos, Hipótese Diagnóstica e exportar diretamente para o arquivo Word (.docx).
              </p>
            </div>
          </div>

          {/* =========================================================================
              SEÇÃO EXCLUSIVA: ARQUIVAMENTO DO LAUDO FINAL ASSINADO (PDF / WORD)
              ========================================================================= */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF5F6] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] text-[#16A34A] flex items-center justify-center font-black shrink-0 shadow-2xs">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0D2329]">
                    Laudo Final Assinado & Arquivos Definitivos
                  </h3>
                  <p className="text-xs font-semibold text-[#6B7C83]">
                    Faça upload da versão final editada no seu computador (em PDF ou Word assinado) para arquivar no prontuário de {child.full_name}.
                  </p>
                </div>
              </div>

              {/* Botão de Upload */}
              <button
                type="button"
                disabled={uploadingDoc}
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                {uploadingDoc ? <Clock className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 stroke-[2.5]" />}
                <span>{uploadingDoc ? "Enviando arquivo..." : "📎 Anexar Laudo Final (.pdf ou .docx)"}</span>
              </button>
            </div>

            {/* Lista de Documentos Finais Anexados */}
            {finalDocuments.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#F8FAFB] border-2 border-dashed border-[#D8E5E7] text-center space-y-2">
                <p className="text-xs font-black text-[#0D2329]">
                  Nenhum arquivo de laudo final anexado ainda
                </p>
                <p className="text-[11px] font-semibold text-[#6B7C83] max-w-md mx-auto">
                  Após revisar e assinar o documento no seu computador, clique no botão verde acima para anexar a via definitiva no prontuário.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {finalDocuments.map((doc) => {
                  const isPdf = doc.file_name.toLowerCase().endsWith(".pdf")
                  return (
                    <div
                      key={doc.id}
                      className="p-4 rounded-2xl bg-[#F8FAFB] border-2 border-[#D8E5E7] hover:border-[#10B981] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border shadow-2xs ${
                            isPdf
                              ? "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]"
                              : "bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]"
                          }`}
                        >
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-black text-[#0D2329] truncate" title={doc.file_name}>
                            {doc.file_name}
                          </p>
                          <p className="text-[11px] font-semibold text-[#6B7C83] flex items-center gap-2 mt-0.5">
                            <span>Anexado em: <strong>{formatDate(doc.created_at)}</strong></span>
                            {doc.file_size && (
                              <span>• {(doc.file_size / (1024 * 1024)).toFixed(2)} MB</span>
                            )}
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                              ✓ Versão Oficial
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Ações: Visualizar/Baixar e Remover */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] hover:border-[#16A34A] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir / Baixar</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleDeleteFinalDoc(doc.id)}
                          className="p-2 rounded-xl text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2] border border-transparent hover:border-[#FECACA] transition-all"
                          title="Remover este arquivo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Alternador de Status do Relatório */}
            <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-black text-[#166534]">
                  Status do Atendimento Clínico: {isCompleted ? "Concluído" : "Em Elaboração"}
                </p>
                <p className="text-[11px] font-medium text-[#15803D]">
                  {isCompleted
                    ? "Este laudo está marcado como finalizado. O prontuário e os relatórios constam como concluídos."
                    : "O laudo ainda está em elaboração. Ao anexar o documento final assinado, ele será finalizado automaticamente."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleToggleStatus(isCompleted ? "draft" : "final")}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs shrink-0 cursor-pointer active:scale-95 ${
                  isCompleted
                    ? "bg-white text-[#6B7C83] hover:text-[#0D2329] border border-[#D8E5E7]"
                    : "bg-[#16A34A] hover:bg-[#15803D] text-white"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isCompleted ? "Reabrir para Elaboração" : "Marcar como Finalizado ✅"}</span>
              </button>
            </div>
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

