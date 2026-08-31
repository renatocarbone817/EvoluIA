import { useState, useEffect, useRef } from "react"
import {
  FileText,
  Plus,
  Download,
  Printer,
  Eye,
  Paperclip,
  Upload,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  FileCheck,
  Calendar,
  Clock,
  Check,
  Edit2,
  AlertCircle,
  ArrowRight,
  BookOpen,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/Button"
import { Input, Textarea } from "@/components/ui/Input"
import { formatDate } from "@/lib/utils"
import toast from "react-hot-toast"
import type { Report, Document, Child } from "@/types/database"
import { addDashboardTask, completeDashboardTaskForChild } from "@/lib/dashboardTasks"
import { ClinicalReportBuilderModal } from "@/components/reports/ClinicalReportBuilderModal"

interface ChildReportsTabProps {
  child: Child
  onReloadChild?: () => void
}

interface Attachment {
  name: string
  url: string
  type?: string
  size?: number
}

const DEFAULT_INTRO = "O presente relatório tem como objetivo apresentar a evolução psicopedagógica, os aspectos cognitivos observados e o desempenho nas atividades propostas durante o período de atendimento."
const DEFAULT_DEV = "Durante os atendimentos realizados no período, foram trabalhadas habilidades de leitura, escrita, raciocínio lógico-matemático, atenção concentrada e funções executivas. A criança demonstrou engajamento nas intervenções lúdicas e psicopedagógicas."
const DEFAULT_CONCL = "Com base nas atividades e estímulos aplicados, recomenda-se a continuidade dos atendimentos psicopedagógicos com foco no fortalecimento da autonomia e estratégias de aprendizagem."

export function ChildReportsTab({ child, onReloadChild }: ChildReportsTabProps) {
  const { professional } = useAuthStore()
  const [reports, setReports] = useState<Report[]>([])
  const [existingDocs, setExistingDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [startingReport, setStartingReport] = useState(false)
  const [showClinicalModal, setShowClinicalModal] = useState(false)
  const [showEditorModal, setShowEditorModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showFinalizeModal, setShowFinalizeModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [saving, setSaving] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const todayStr = new Date().toISOString().split("T")[0]
  const twoDaysAheadStr = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const [form, setForm] = useState({
    title: `Relatório Psicopedagógico - ${child.full_name}`,
    period_start: todayStr,
    period_end: twoDaysAheadStr,
    introduction: "",
    development: "",
    conclusion: "",
    attachments: [] as Attachment[],
  })

  useEffect(() => {
    loadReports()
    loadExistingDocuments()
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
      if (data && data.length > 0) {
        const active = data[0]
        setSelectedReport(active)
        const content = (active.content as any) || {}
        setForm({
          title: active.title || `Relatório Psicopedagógico - ${child.full_name}`,
          period_start: active.period_start || (child.created_at ? child.created_at.split("T")[0] : ""),
          period_end: active.period_end || new Date().toISOString().split("T")[0],
          introduction: content.introduction || "",
          development: content.development || "",
          conclusion: content.conclusion || "",
          attachments: Array.isArray(content.attachments) ? content.attachments : [],
        })
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadExistingDocuments() {
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("child_id", child.id)
      .order("created_at", { ascending: false })

    setExistingDocs(data || [])
  }

  // 1. INICIAR RELATÓRIO
  async function handleStartReport() {
    if (!professional) return
    setStartingReport(true)
    try {
      const contentJson = {
        introduction: form.introduction || "",
        development: form.development || "",
        conclusion: form.conclusion || "",
        attachments: form.attachments,
      }

      // PASSO 1: Criar o registro de relatório vinculado à criança
      const { data: newReport, error: reportError } = await supabase
        .from("reports")
        .insert({
          professional_id: professional.id,
          child_id: child.id,
          title: form.title,
          period_start: form.period_start || null,
          period_end: form.period_end || null,
          content: contentJson,
          status: "draft",
        })
        .select()
        .single()

      if (reportError) throw reportError

      // PASSO 2: Alterar status da criança para EM RELATÓRIO (report_in_progress)
      const { error: childError } = await supabase
        .from("children")
        .update({ status: "report_in_progress" })
        .eq("id", child.id)

      if (childError) console.warn("Could not update child status:", childError)

      // PASSO 3: Criar automaticamente a tarefa na Clínica com data limite de finalização
      const reportDueDate = form.period_end || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      addDashboardTask(professional?.id, {
        text: `Finalizar relatório ${child.full_name}`,
        dueDate: reportDueDate,
      })

      toast.success(`Relatório iniciado! Tarefa "Finalizar relatório ${child.full_name}" criada no painel da clínica.`, { icon: "📝" })
      onReloadChild?.()
      await loadReports()
      setShowEditorModal(true)
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar relatório")
    } finally {
      setStartingReport(false)
    }
  }

  // 2. SALVAR ALTERAÇÕES NO RELATÓRIO (SEM FINALIZAR)
  async function handleSaveReport() {
    if (!selectedReport) return
    setSaving(true)
    try {
      const contentJson = {
        introduction: form.introduction,
        development: form.development,
        conclusion: form.conclusion,
        attachments: form.attachments,
      }

      const { error } = await supabase
        .from("reports")
        .update({
          title: form.title,
          period_start: form.period_start || null,
          period_end: form.period_end || null,
          content: contentJson,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedReport.id)

      if (error) throw error

      toast.success("Progresso do relatório salvo com sucesso!", { icon: "💾" })
      setShowEditorModal(false)
      await loadReports()
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar relatório")
    } finally {
      setSaving(false)
    }
  }

  // 3. FINALIZAR RELATÓRIO
  async function handleConfirmFinalize() {
    if (!selectedReport) return
    setFinalizing(true)
    try {
      const contentJson = {
        introduction: form.introduction,
        development: form.development,
        conclusion: form.conclusion,
        attachments: form.attachments,
      }

      // PASSO 1: Atualizar status do relatório para finalizado (final)
      const { error: reportError } = await supabase
        .from("reports")
        .update({
          title: form.title,
          period_start: form.period_start || null,
          period_end: form.period_end || null,
          content: contentJson,
          status: "final",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedReport.id)

      if (reportError) throw reportError

      // PASSO 2: Alterar status principal da criança para RELATÓRIO FINALIZADO (report_completed)
      const { error: childError } = await supabase
        .from("children")
        .update({ status: "report_completed" })
        .eq("id", child.id)

      if (childError) console.warn("Could not update child status:", childError)

      // Completar automaticamente a tarefa de finalizar relatório da criança
      completeDashboardTaskForChild(professional?.id, child.full_name)

      toast.success("Relatório finalizado com sucesso! Tarefa concluída no painel.", { icon: "🎉" })
      setShowFinalizeModal(false)
      setShowEditorModal(false)
      onReloadChild?.()
      await loadReports()
    } catch (err: any) {
      toast.error(err.message || "Erro ao finalizar relatório")
    } finally {
      setFinalizing(false)
    }
  }

  // File Upload for Attachments
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0 || !professional) return

    setUploadingAttachment(true)
    try {
      const newAttachments: Attachment[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileExt = file.name.split(".").pop()?.toLowerCase() || ""
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
        const fileName = `${Date.now()}_${cleanName}`
        const filePath = `${professional.id}/${child.id}/relatorios/${fileName}`

        const { error: storageError } = await supabase.storage
          .from("child-documents")
          .upload(filePath, file)

        if (storageError) throw storageError

        const { data: publicUrlData } = supabase.storage
          .from("child-documents")
          .getPublicUrl(filePath)

        newAttachments.push({
          name: file.name,
          url: publicUrlData.publicUrl,
          type: fileExt,
          size: file.size,
        })
      }

      setForm((prev) => ({
        ...prev,
        attachments: [...prev.attachments, ...newAttachments],
      }))

      toast.success(`${newAttachments.length} anexo(s) adicionado(s) com sucesso!`)
    } catch (err: any) {
      toast.error(err.message || "Erro no upload")
    } finally {
      setUploadingAttachment(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function handleAttachExistingDoc(doc: Document) {
    const alreadyAttached = form.attachments.some((a) => a.url === doc.file_url)
    if (alreadyAttached) {
      toast.error("Este documento já está anexado ao relatório.")
      return
    }

    setForm((prev) => ({
      ...prev,
      attachments: [
        ...prev.attachments,
        {
          name: doc.file_name,
          url: doc.file_url,
          type: doc.file_type || undefined,
          size: doc.file_size || undefined,
        },
      ],
    }))
    toast.success(`"${doc.file_name}" anexado ao relatório!`)
  }

  function handleRemoveAttachment(index: number) {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }))
  }

  const activeReport = reports[0] || null
  const isFinalized = activeReport?.status === "final" || activeReport?.status === "completed" || child.status === "report_completed"
  const isDraft = activeReport && !isFinalized

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-[#F7FAFA] animate-pulse rounded-3xl border-2 border-[#D8E5E7]" />
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
            <h3 className="text-lg font-black text-[#0D2329]">Relatório / Laudo Clínico</h3>
            <p className="text-xs font-semibold text-[#6B7C83] leading-relaxed">
              Gere o laudo psicopedagógico completo de <strong>{child.full_name}</strong> com as 13 perguntas da Anamnese, os 21 instrumentos clínicos e exportação direta para Microsoft Word (.docx).
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setShowClinicalModal(true)}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#2563EB] via-[#6366F1] to-[#7C3AED] hover:from-[#1D4ED8] hover:to-[#6D28D9] text-white text-xs font-black inline-flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>✨ Gerar Laudo Completo em Word (.docx)</span>
            </button>

            <button
              type="button"
              disabled={startingReport}
              onClick={handleStartReport}
              className="px-5 py-3.5 rounded-2xl bg-white hover:bg-[#F8FAFB] border-2 border-[#D8E5E7] hover:border-[#7C3AED] text-[#0D2329] text-xs font-black inline-flex items-center gap-2 shadow-2xs active:scale-95 transition-all"
            >
              {startingReport ? <Clock className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 stroke-[3]" />}
              <span>{startingReport ? "Iniciando..." : "+ Iniciar Rascunho Simples"}</span>
            </button>
          </div>
        </div>
      ) : (
        /* CENÁRIOS 2 & 3: RELATÓRIO EM ELABORAÇÃO OU FINALIZADO */
        <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-6">
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEF5F6] pb-5">
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-xs border-2 ${
                  isFinalized
                    ? "bg-[#E0F2FE] border-[#BAE6FD] text-[#0284C7]"
                    : "bg-[#EDE9FE] border-[#DDD6FE] text-[#7C3AED]"
                }`}
              >
                {isFinalized ? <FileCheck className="w-7 h-7" /> : <FileText className="w-7 h-7" />}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-[#0D2329]">
                    {isFinalized ? "Relatório Finalizado" : "Relatório em Elaboração"}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                      isFinalized
                        ? "bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]"
                        : "bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE]"
                    }`}
                  >
                    {isFinalized ? "✅ Relatório Finalizado" : "📝 Em Relatório"}
                  </span>
                </div>

                <p className="text-xs font-semibold text-[#6B7C83] flex items-center gap-3 flex-wrap">
                  <span>Iniciado em: <strong>{formatDate(activeReport.created_at)}</strong></span>
                  {isFinalized && activeReport.updated_at && (
                    <span>• Finalizado em: <strong>{formatDate(activeReport.updated_at)}</strong></span>
                  )}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => setShowClinicalModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-[#1D4ED8] hover:to-[#6D28D9] text-white text-xs font-black flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Gerar Laudo Word (.docx)</span>
              </button>

              {isDraft && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowEditorModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#F8FAFB] hover:bg-[#EDE9FE] border-2 border-[#D8E5E7] hover:border-[#7C3AED] text-[#0D2329] text-xs font-black flex items-center gap-2 shadow-2xs transition-all active:scale-95"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edição Simples</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFinalizeModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#E8F8F5] hover:bg-[#10B981] text-[#065F46] hover:text-white border border-[#10B981]/30 text-xs font-black flex items-center gap-2 transition-all shadow-2xs active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Finalizar</span>
                  </button>
                </>
              )}

              {isFinalized && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-black flex items-center gap-2 shadow-xs transition-all active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Visualizar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowPreviewModal(true)
                      setTimeout(() => window.print(), 300)
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F7FAFA] text-[#0D2329] border-2 border-[#D8E5E7] text-xs font-black flex items-center gap-2 transition-all shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#6B7C83]" />
                    <span>Imprimir / PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowEditorModal(true)}
                    className="px-3.5 py-2.5 rounded-xl bg-[#F7FAFA] hover:bg-[#EDE9FE] text-[#6B7C83] hover:text-[#7C3AED] border border-[#D8E5E7] text-xs font-bold transition-all"
                    title="Editar informações do relatório"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Report Summary Card Preview */}
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-2xl bg-[#F7FAFA] border border-[#D8E5E7] space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#6B7C83]">
                Título do Relatório
              </h4>
              <p className="text-sm font-black text-[#0D2329]">{activeReport.title}</p>
            </div>

            {/* Quick sections preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-white border border-[#D8E5E7] space-y-1">
                <p className="text-[10px] font-black uppercase text-[#6B7C83] tracking-wider">1. Introdução</p>
                <p className="text-[#0D2329] font-medium line-clamp-3 italic">
                  "{form.introduction || DEFAULT_INTRO}"
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-[#D8E5E7] space-y-1">
                <p className="text-[10px] font-black uppercase text-[#6B7C83] tracking-wider">2. Desenvolvimento</p>
                <p className="text-[#0D2329] font-medium line-clamp-3 italic">
                  "{form.development || DEFAULT_DEV}"
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-[#D8E5E7] space-y-1">
                <p className="text-[10px] font-black uppercase text-[#6B7C83] tracking-wider">3. Conclusão</p>
                <p className="text-[#0D2329] font-medium line-clamp-3 italic">
                  "{form.conclusion || DEFAULT_CONCL}"
                </p>
              </div>
            </div>

            {/* Attachments preview */}
            {form.attachments.length > 0 && (
              <div className="pt-2 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#6B7C83] flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5 text-[#7C3AED]" />
                  <span>Anexos vinculados ({form.attachments.length}):</span>
                </span>
                {form.attachments.map((att, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE] text-[11px] font-bold"
                  >
                    📄 {att.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL DE EDIÇÃO / ELABORAÇÃO DO RELATÓRIO
          ========================================================================= */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
            <div className="p-6 border-b border-[#EEF5F6] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0D2329]">
                    {isFinalized ? "Editar Relatório" : "Elaboração do Relatório"}
                  </h3>
                  <p className="text-xs font-semibold text-[#6B7C83]">
                    Paciente: <strong>{child.full_name}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="w-8 h-8 rounded-full bg-[#F7FAFA] text-[#6B7C83] hover:text-[#0D2329] flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0D2329]">Título do Relatório *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] text-[#0D2329]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#0D2329]">Início do Período Avaliado</label>
                  <input
                    type="date"
                    value={form.period_start}
                    onChange={(e) => setForm({ ...form, period_start: e.target.value })}
                    className="w-full px-4 py-2 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] text-[#0D2329]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#0D2329]">Fim do Período Avaliado</label>
                  <input
                    type="date"
                    value={form.period_end}
                    onChange={(e) => setForm({ ...form, period_end: e.target.value })}
                    className="w-full px-4 py-2 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] text-[#0D2329]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0D2329]">1. Introdução / Objetivos do Atendimento</label>
                <textarea
                  rows={3}
                  value={form.introduction}
                  onChange={(e) => setForm({ ...form, introduction: e.target.value })}
                  placeholder={DEFAULT_INTRO}
                  className="w-full p-3.5 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] text-[#0D2329] placeholder:text-[#8DA3A8]/75 placeholder:font-normal resize-none leading-relaxed transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0D2329]">2. Desenvolvimento & Análise das Habilidades</label>
                <textarea
                  rows={4}
                  value={form.development}
                  onChange={(e) => setForm({ ...form, development: e.target.value })}
                  placeholder={DEFAULT_DEV}
                  className="w-full p-3.5 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] text-[#0D2329] placeholder:text-[#8DA3A8]/75 placeholder:font-normal resize-none leading-relaxed transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0D2329]">3. Conclusão & Recomendações Pedagógicas</label>
                <textarea
                  rows={3}
                  value={form.conclusion}
                  onChange={(e) => setForm({ ...form, conclusion: e.target.value })}
                  placeholder={DEFAULT_CONCL}
                  className="w-full p-3.5 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] text-[#0D2329] placeholder:text-[#8DA3A8]/75 placeholder:font-normal resize-none leading-relaxed transition-all"
                />
              </div>

              {/* Seção de Anexos */}
              <div className="p-5 rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#0D2329] flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-[#7C3AED]" />
                      <span>Anexos (Atividades, Provas, Fotos & Laudos)</span>
                    </h4>
                    <p className="text-[11px] font-semibold text-[#6B7C83]">
                      Vincule fotos e documentos comprobatórios ao relatório.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <button
                      type="button"
                      disabled={uploadingAttachment}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black flex items-center gap-1.5 shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Fazer Upload</span>
                    </button>
                  </div>
                </div>

                {/* Lista de Anexos */}
                {form.attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {form.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-[#D8E5E7] bg-white flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <p className="text-xs font-bold text-[#0D2329] truncate">{att.name}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="p-1 text-[#DC2626] hover:bg-[#FEF2F2] rounded-md"
                          title="Remover anexo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-[#8CAAB1] italic bg-white rounded-xl border border-[#D8E5E7]">
                    Nenhum anexo adicionado ainda.
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-[#EEF5F6] flex items-center justify-between gap-3 bg-[#F7FAFA] rounded-b-3xl">
              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B7C83] hover:bg-white"
              >
                Fechar sem Salvar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveReport}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE] text-xs font-black shadow-2xs transition-all"
                >
                  {saving ? "Salvando..." : "Salvar Rascunho"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowFinalizeModal(true)}
                  className="px-5 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Finalizar Relatório</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL DE CONFIRMAÇÃO PARA FINALIZAR O RELATÓRIO
          ========================================================================= */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[#10B981]/40 max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F8F5] border border-[#A7F3D0] text-[#10B981] flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-[#0D2329]">Finalizar Relatório?</h3>
              <p className="text-xs font-semibold text-[#6B7C83] leading-relaxed">
                Após finalizar, o relatório será marcado como <strong>concluído</strong> e o status principal da criança <strong>{child.full_name}</strong> mudará para <strong>Relatório Finalizado</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EEF5F6]">
              <button
                type="button"
                onClick={() => setShowFinalizeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B7C83] hover:bg-[#F7FAFA]"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={finalizing}
                onClick={handleConfirmFinalize}
                className="px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5"
              >
                {finalizing ? <Clock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                <span>{finalizing ? "Finalizando..." : "Sim, Finalizar Relatório"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL DE VISUALIZAÇÃO COMPLETA DO RELATÓRIO (PRINT/PDF)
          ========================================================================= */}
      {showPreviewModal && selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:block print:inset-auto print:z-auto print:overflow-visible">
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl print:border-none print:shadow-none print:max-h-none print:h-auto print:w-full print:block print:overflow-visible">
            <div className="p-6 border-b border-[#EEF5F6] flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2 text-[#7C3AED]">
                <FileText className="w-5 h-5" />
                <span className="font-black text-sm uppercase tracking-wider">Visualização de Parecer Clínico</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-[#6B7C83] hover:bg-[#F7FAFA]"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="p-8 sm:p-10 overflow-y-auto space-y-6 text-sm printable-report print:overflow-visible print:p-0 print:h-auto print:max-h-none print:block">
              {/* Header */}
              <div className="text-center border-b-2 border-[#0D2329] pb-6 space-y-1.5">
                <h1 className="text-2xl font-black uppercase tracking-wide text-[#0D2329]">
                  {form.title}
                </h1>
                <p className="text-xs font-bold text-[#7C3AED]">
                  Clínica: {professional?.clinic_name || "EvoluIA — Gestão Psicopedagógica"}
                </p>
                <p className="text-xs font-semibold text-[#6B7C83]">
                  Profissional: <strong>{professional?.full_name}</strong> {professional?.crp ? `· CBO: ${professional.crp}` : ""}
                </p>
                <p className="text-xs font-semibold text-[#6B7C83]">
                  Paciente: <strong>{child.full_name}</strong> · Emissão: <strong>{formatDate(selectedReport.created_at)}</strong>
                </p>
              </div>

              {/* Sections */}
              <div className="space-y-6 leading-relaxed">
                <div className="space-y-1.5">
                  <h4 className="font-black text-xs uppercase text-[#7C3AED] tracking-wider border-b border-[#D8E5E7] pb-1">
                    1. Introdução & Objetivos
                  </h4>
                  <p className="whitespace-pre-wrap text-[#0D2329] text-justify leading-relaxed">
                    {form.introduction || DEFAULT_INTRO}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-black text-xs uppercase text-[#7C3AED] tracking-wider border-b border-[#D8E5E7] pb-1">
                    2. Desenvolvimento das Sessões & Habilidades
                  </h4>
                  <p className="whitespace-pre-wrap text-[#0D2329] text-justify leading-relaxed">
                    {form.development || DEFAULT_DEV}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-black text-xs uppercase text-[#7C3AED] tracking-wider border-b border-[#D8E5E7] pb-1">
                    3. Conclusão & Recomendações Pedagógicas
                  </h4>
                  <p className="whitespace-pre-wrap text-[#0D2329] text-justify leading-relaxed">
                    {form.conclusion || DEFAULT_CONCL}
                  </p>
                </div>

                {/* Anexos */}
                {form.attachments.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="font-black text-xs uppercase text-[#7C3AED] tracking-wider border-b border-[#D8E5E7] pb-1 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5" />
                      4. Anexos & Evidências Clínicas
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {form.attachments.map((att, idx) => (
                        <div key={idx} className="p-3 rounded-2xl border border-[#D8E5E7] bg-[#F7FAFA] space-y-2">
                          <p className="text-xs font-black text-[#0D2329] truncate">{att.name}</p>
                          {att.url && (
                            <img src={att.url} alt={att.name} className="object-contain max-h-48 w-full rounded-xl" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Signature */}
              <div className="pt-12 text-center border-t-2 border-[#D8E5E7] mt-12 space-y-1">
                <p className="font-black text-base text-[#0D2329]">{professional?.full_name}</p>
                <p className="text-xs font-semibold text-[#6B7C83]">
                  Psicopedagoga Clínica · CBO {professional?.crp || ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONSTRUÇÃO DO LAUDO COMPLETO (.DOCX) */}
      <ClinicalReportBuilderModal
        isOpen={showClinicalModal}
        onClose={() => setShowClinicalModal(false)}
        child={child}
        reportId={activeReport?.id}
        onSaved={() => {
          loadReports()
          loadExistingDocuments()
          if (onReloadChild) onReloadChild()
        }}
      />
    </div>
  )
}
