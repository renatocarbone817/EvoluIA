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
      // 1. Carregar relatórios clínicos
      const { data: repData } = await supabase
        .from("reports")
        .select("*")
        .eq("child_id", child.id)
        .order("created_at", { ascending: false })

      // Limpar e ignorar rascunhos fantasmas vazios (criados por uploads antigos sem conteúdo real de IA)
      const validReports = (repData || []).filter((r: any) => {
        if (!r.content || typeof r.content !== "object") return false
        const keys = Object.keys(r.content)
        if (keys.length === 0) return false
        return Boolean(
          r.content.anamneseAxes ||
          r.content.synthesis ||
          r.content.patientData ||
          r.content.diagnosticHypothesis ||
          r.content.selectedInstruments ||
          r.content.clinicalObservation ||
          r.content.introduction ||
          r.content.development ||
          r.content.conclusion
        )
      })

      // Se houver rascunhos 100% vazios antigos, limpa silenciosamente no banco
      const emptyReports = (repData || []).filter((r: any) => !validReports.includes(r))
      if (emptyReports.length > 0) {
        emptyReports.forEach((er: any) => {
          supabase.from("reports").delete().eq("id", er.id).then()
        })
      }

      setReports(validReports)

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

      // 3. Se houver rascunho de IA real, marca como 'final'. Se NÃO houver, NÃO cria registro vazio na tabela reports!
      if (hasRealAiDraft && activeReport) {
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

      toast.success("Laudo final anexado com sucesso! Marcado como Relatório Finalizado.", { id: toastId, icon: "🟢" })
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

      const remaining = finalDocuments.filter((d) => d.id !== docId)
      setFinalDocuments(remaining)

      if (remaining.length === 0) {
        if (hasRealAiDraft && activeReport) {
          await supabase
            .from("reports")
            .update({ status: "draft", updated_at: new Date().toISOString() })
            .eq("id", activeReport.id)
          await supabase
            .from("children")
            .update({ status: "report_in_progress" })
            .eq("id", child.id)
        } else {
          await supabase
            .from("children")
            .update({ status: "in_progress" })
            .eq("id", child.id)
        }
      }

      toast.success("Documento removido com sucesso!")
      if (onReloadChild) onReloadChild()
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover documento.")
    }
  }

  // Alternar status do relatório (Em Elaboração <-> Finalizado)
  async function handleToggleStatus(newStatus: "draft" | "final") {
    try {
      if (hasRealAiDraft && activeReport) {
        await supabase
          .from("reports")
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", activeReport.id)
      }

      await supabase
        .from("children")
        .update({
          status: newStatus === "final" ? "report_completed" : "report_in_progress",
        })
        .eq("id", child.id)

      toast.success(newStatus === "final" ? "Laudo marcado como Relatório Finalizado!" : "Laudo reaberto para Em Elaboração.")
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
  const contentObj = (activeReport?.content || {}) as any
  const hasRealAiDraft = Boolean(
    activeReport &&
    activeReport.content &&
    typeof activeReport.content === "object" &&
    Object.keys(activeReport.content).length > 0 &&
    (
      contentObj.anamneseAxes ||
      contentObj.synthesis ||
      contentObj.patientData ||
      contentObj.diagnosticHypothesis ||
      contentObj.selectedInstruments ||
      contentObj.clinicalObservation ||
      contentObj.introduction ||
      contentObj.development ||
      contentObj.conclusion
    )
  )

  const isCompleted =
    finalDocuments.length > 0 ||
    (hasRealAiDraft && (activeReport?.status === "final" || activeReport?.status === "completed")) ||
    child.status === "report_completed"

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

      {/* CENÁRIO 1: A CRIANÇA NÃO POSSUI NENHUM RASCUNHO REAL DE IA NEM DOCUMENTO ANEXADO */}
      {!hasRealAiDraft && finalDocuments.length === 0 ? (
        <div className="space-y-4 animate-in fade-in">
          <div className="text-center space-y-1 max-w-lg mx-auto pb-2">
            <h3 className="text-lg sm:text-xl font-black text-[#0D2329]">
              Como você deseja registrar o laudo de {child.full_name}?
            </h3>
            <p className="text-xs font-semibold text-[#6B7C83]">
              Escolha entre gerar com apoio da Inteligência Artificial ou anexar diretamente o arquivo que você já tem pronto.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* CARD 1 (ESQUERDA): GERAR COM IA */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-[#D8E5E7] hover:border-[#7C3AED] hover:shadow-lg transition-all flex flex-col items-center justify-between text-center space-y-6 group">
              <div className="space-y-4 flex flex-col items-center w-full">
                <div className="w-16 h-16 rounded-3xl bg-[#EDE9FE] border-2 border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform mx-auto">
                  <Sparkles className="w-8 h-8" />
                </div>

                <div className="space-y-2 max-w-sm mx-auto">
                  <h4 className="text-base sm:text-lg font-black text-[#0D2329] group-hover:text-[#7C3AED] transition-colors">
                    Gerar laudo com ajuda da IA no sistema
                  </h4>
                  <p className="text-xs font-semibold text-[#6B7C83] leading-relaxed">
                    Gere o começo do laudo e deixe ele pronto em formato Word, só para alterar algumas informações e finalizar.
                  </p>
                </div>
              </div>

              <div className="pt-2 w-full">
                <button
                  type="button"
                  onClick={() => setShowClinicalModal(true)}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#2563EB] via-[#6366F1] to-[#7C3AED] hover:from-[#1D4ED8] hover:to-[#6D28D9] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>✨ Abrir Gerador de Laudo com IA (.docx)</span>
                </button>
              </div>
            </div>

            {/* CARD 2 (DIREITA): UPAR DIRETO */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-[#D8E5E7] hover:border-[#10B981] hover:shadow-lg transition-all flex flex-col items-center justify-between text-center space-y-6 group">
              <div className="space-y-4 flex flex-col items-center w-full">
                <div className="w-16 h-16 rounded-3xl bg-[#F0FDF4] border-2 border-[#BBF7D0] text-[#16A34A] flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform mx-auto">
                  <Upload className="w-8 h-8" />
                </div>

                <div className="space-y-2 max-w-sm mx-auto">
                  <h4 className="text-base sm:text-lg font-black text-[#0D2329] group-hover:text-[#16A34A] transition-colors">
                    Já tenho laudo pronto, upar direto
                  </h4>
                  <p className="text-xs font-semibold text-[#6B7C83] leading-relaxed">
                    Se você já possui o arquivo do laudo pronto no seu computador (PDF ou Word), anexe diretamente aqui para arquivar no prontuário.
                  </p>
                </div>
              </div>

              <div className="pt-2 w-full">
                <button
                  type="button"
                  disabled={uploadingDoc}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {uploadingDoc ? <Clock className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 stroke-[2.5]" />}
                  <span>{uploadingDoc ? "Enviando arquivo..." : "📎 Clique para Upar Relatório Pronto (.pdf ou .docx)"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CENÁRIO 2: RELATÓRIO JÁ CADASTRADO OU ARQUIVO ANEXADO */
        <div className="space-y-6">
          {/* =========================================================================
              SEÇÃO 1: ARQUIVAMENTO DO LAUDO FINAL ASSINADO (PDF / WORD)
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

              {/* Botão de Upload no topo */}
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
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                isCompleted
                  ? "bg-[#F0FDF4] border-[#BBF7D0]"
                  : "bg-[#EDE9FE] border-[#DDD6FE]"
              }`}
            >
              <div className="space-y-0.5">
                <p
                  className={`text-xs font-black ${
                    isCompleted ? "text-[#166534]" : "text-[#7C3AED]"
                  }`}
                >
                  Status do Relatório / Laudo: {isCompleted ? "🟢 Relatório Finalizado" : "🟣 Relatório em elaboração"}
                </p>
                <p
                  className={`text-[11px] font-medium ${
                    isCompleted ? "text-[#15803D]" : "text-[#6D28D9]"
                  }`}
                >
                  {isCompleted
                    ? `O laudo final foi concluído com sucesso e está disponível no prontuário de ${child.full_name}.`
                    : "O laudo ainda está em elaboração. Ao anexar a via final assinada ou concluir no gerador, o status passará para Relatório Finalizado."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(isCompleted ? "draft" : "final")}
                  className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs shrink-0 cursor-pointer active:scale-95 ${
                    isCompleted
                      ? "bg-white text-[#6B7C83] hover:text-[#0D2329] border border-[#D8E5E7]"
                      : "bg-[#16A34A] hover:bg-[#15803D] text-white shadow-sm"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isCompleted ? "Reabrir para Elaboração" : "Marcar como Relatório Finalizado 🟢"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              SEÇÃO 2: CARD DO LAUDO EDITÁVEL NO SISTEMA (GERADOR COM IA)
              ========================================================================= */}
          {hasRealAiDraft && activeReport ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEF5F6] pb-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] border-2 border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center font-bold shrink-0 shadow-xs">
                    <FileText className="w-7 h-7" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-[#0D2329]">
                        Laudo Editável no Sistema
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${
                          isCompleted
                            ? "bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]"
                            : "bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE]"
                        }`}
                      >
                        {isCompleted ? "✅ Registrado" : "📝 Rascunho Ativo"}
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

                {/* Ações do Gerador */}
                <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowClinicalModal(true)}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#2563EB] via-[#6366F1] to-[#7C3AED] hover:from-[#1D4ED8] hover:to-[#6D28D9] text-white text-xs font-black flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>✏️ Abrir / Continuar Editando no Gerador (.docx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="px-4 py-3 rounded-2xl bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                    title="Excluir este rascunho de laudo"
                  >
                    <Trash2 className="w-4 h-4 text-[#DC2626]" />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>

              {/* Informações do Documento */}
              <div className="p-5 rounded-2xl bg-[#F8FAFB] border border-[#D8E5E7] space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#6B7C83]">
                  Informações da Estrutura Clínica
                </h4>
                <p className="text-sm font-black text-[#0D2329]">{activeReport.title}</p>
                <p className="text-xs font-semibold text-[#6B7C83] leading-relaxed">
                  Você pode abrir o gerador a qualquer momento para revisar Anamnese, Instrumentos, Hipótese Diagnóstica e baixar uma nova via atualizada em Word (.docx) sem perder nada do que já digitou.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-3xl bg-white border-2 border-dashed border-[#D8E5E7] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#0D2329]">Deseja gerar também um laudo com auxílio da IA?</h4>
                  <p className="text-xs font-semibold text-[#6B7C83]">Você pode usar o modelo oficial do sistema a qualquer momento.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClinicalModal(true)}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#2563EB] via-[#6366F1] to-[#7C3AED] hover:from-[#1D4ED8] hover:to-[#6D28D9] text-white text-xs font-black flex items-center gap-2 shadow-xs cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>✨ Abrir Gerador de Laudo com IA</span>
              </button>
            </div>
          )}
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

