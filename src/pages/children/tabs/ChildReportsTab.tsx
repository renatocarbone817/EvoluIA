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
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Textarea } from "@/components/ui/Input"
import { formatDate } from "@/lib/utils"
import toast from "react-hot-toast"
import type { Report, Document } from "@/types/database"

interface ChildReportsTabProps {
  childId: string
  childName: string
}

interface Attachment {
  name: string
  url: string
  type?: string
  size?: number
}

export function ChildReportsTab({ childId, childName }: ChildReportsTabProps) {
  const { professional } = useAuthStore()
  const [reports, setReports] = useState<Report[]>([])
  const [existingDocs, setExistingDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: `Relatório de Evolução Psicopedagógica - ${childName}`,
    period_start: "",
    period_end: new Date().toISOString().split("T")[0],
    introduction:
      "O presente relatório tem como objetivo apresentar a evolução psicopedagógica, os aspectos cognitivos observados e o desempenho nas atividades propostas durante o período de atendimento.",
    development:
      "Durante os atendimentos realizados no período, foram trabalhadas habilidades de leitura, escrita, raciocínio lógico-matemático, atenção concentrada e funções executivas. A criança demonstrou engajamento nas intervenções lúdicas e psicopedagógicas.",
    conclusion:
      "Com base nas atividades e estímulos aplicados, recomenda-se a continuidade dos atendimentos psicopedagógicos com foco no fortalecimento da autonomia e estratégias de aprendizagem.",
    attachments: [] as Attachment[],
  })

  useEffect(() => {
    loadReports()
    loadExistingDocuments()
  }, [childId])

  async function loadReports() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .eq("child_id", childId)
        .order("created_at", { ascending: false })

      setReports(data || [])
    } finally {
      setLoading(false)
    }
  }

  async function loadExistingDocuments() {
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("child_id", childId)
      .order("created_at", { ascending: false })

    setExistingDocs(data || [])
  }

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
        const filePath = `${professional.id}/${childId}/relatorios/${fileName}`

        // Upload to Supabase Storage
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
      toast.error(err.message || "Erro ao fazer upload dos anexos")
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

  async function handleCreateReport() {
    if (!professional) return
    setSaving(true)
    try {
      const contentJson = {
        introduction: form.introduction,
        development: form.development,
        conclusion: form.conclusion,
        attachments: form.attachments,
      }

      const { error } = await supabase.from("reports").insert({
        professional_id: professional.id,
        child_id: childId,
        title: form.title,
        period_start: form.period_start || null,
        period_end: form.period_end || null,
        content: contentJson,
        status: "final",
      })

      if (error) throw error
      toast.success("Relatório gerado com sucesso!")
      setShowCreateModal(false)
      loadReports()
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar relatório")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#19323A]">Relatórios & Pareceres Clínicos</h2>
          <p className="text-xs font-semibold text-[#6B7C83] mt-0.5">
            Elabore relatórios estruturados com anexos de atividades, provas e laudos para escolas e famílias.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2 shadow-[0_4px_0_0_#143741]">
          <Plus className="w-4 h-4" />
          Gerar Novo Relatório
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-[#EEF5F6] animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card className="border-2 border-dashed border-[#D8E5E7] text-center py-12">
          <CardContent className="space-y-3">
            <FileText className="w-10 h-10 text-[#8DA3A8] mx-auto" />
            <p className="font-black text-base text-[#19323A]">Nenhum relatório elaborado</p>
            <p className="text-xs text-[#6B7C83] max-w-sm mx-auto">
              Crie relatórios com síntese das sessões e anexe fotos de atividades e provas aplicadas.
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="mt-2">
              <Plus className="w-4 h-4 mr-1.5" />
              Criar Primeiro Relatório
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((rep) => {
            const content = rep.content as any
            const attachmentsCount = content?.attachments?.length || 0

            return (
              <div
                key={rep.id}
                className="p-5 rounded-2xl border-2 border-[#D8E5E7] bg-white hover:border-[#245C6B] hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-black text-base text-[#19323A]">{rep.title}</h3>
                    {attachmentsCount > 0 && (
                      <span className="text-xs px-2.5 py-0.5 rounded-lg font-black uppercase bg-[#E8F8F5] text-[#20836F] border border-[#63C7B2]/40 flex items-center gap-1">
                        <Paperclip className="w-3 h-3" />
                        {attachmentsCount} anexo{attachmentsCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-[#6B7C83]">
                    Emitido em: <strong>{formatDate(rep.created_at)}</strong>
                    {rep.period_end ? ` · Período avaliado até ${formatDate(rep.period_end)}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#EEF5F6]">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedReport(rep)}
                    className="font-bold text-xs border-2 gap-1.5"
                  >
                    <Eye className="w-4 h-4 text-[#245C6B]" />
                    Visualizar & Anexos
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedReport(rep)
                      setTimeout(() => window.print(), 300)
                    }}
                    className="font-bold text-xs bg-[#245C6B] text-white gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir / PDF
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Criar Relatório com Anexo de Documentos */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in-50 duration-200">
            <div className="p-6 border-b-2 border-[#EEF5F6] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-[#19323A]">Novo Relatório / Parecer Clínico</h3>
                <p className="text-xs font-bold text-[#6B7C83]">Paciente: {childName}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowCreateModal(false)}>
                Fechar
              </Button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              <Input
                label="Título do Documento *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Início do Período Avaliado"
                  type="date"
                  value={form.period_start}
                  onChange={(e) => setForm({ ...form, period_start: e.target.value })}
                />
                <Input
                  label="Fim do Período Avaliado"
                  type="date"
                  value={form.period_end}
                  onChange={(e) => setForm({ ...form, period_end: e.target.value })}
                />
              </div>

              <Textarea
                label="1. Introdução / Objetivos do Atendimento"
                value={form.introduction}
                onChange={(e) => setForm({ ...form, introduction: e.target.value })}
                rows={3}
              />

              <Textarea
                label="2. Desenvolvimento & Análise das Habilidades Trabalhadas"
                value={form.development}
                onChange={(e) => setForm({ ...form, development: e.target.value })}
                rows={4}
              />

              <Textarea
                label="3. Considerações Finais & Encaminhamentos Pedagógicos"
                value={form.conclusion}
                onChange={(e) => setForm({ ...form, conclusion: e.target.value })}
                rows={3}
              />

              {/* SEÇÃO DE ANEXOS E DOCUMENTOS */}
              <div className="p-5 rounded-2xl border-2 border-[#63C7B2]/40 bg-[#E8F8F5]/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#19323A] flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-[#20836F]" />
                      Anexos do Relatório (Atividades, Provas, Fotos & Laudos)
                    </h4>
                    <p className="text-[11px] text-[#6B7C83] mt-0.5">
                      Anexe evidências e documentos que serão vinculados a este relatório.
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
                    <Button
                      type="button"
                      size="sm"
                      loading={uploadingAttachment}
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-[#20836F] hover:bg-[#186857] text-white font-bold text-xs gap-1.5 shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Fazer Upload de Anexos
                    </Button>
                  </div>
                </div>

                {/* Attachments List */}
                {form.attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {form.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border-2 border-[#D8E5E7] bg-white flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#EEF5F6] flex items-center justify-center shrink-0">
                            {att.type === "png" || att.type === "jpg" || att.type === "jpeg" ? (
                              <ImageIcon className="w-4 h-4 text-[#245C6B]" />
                            ) : (
                              <FileText className="w-4 h-4 text-[#245C6B]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#19323A] truncate">{att.name}</p>
                            {att.size && (
                              <p className="text-[10px] text-[#8DA3A8]">
                                {(att.size / 1024).toFixed(0)} KB
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-[#6B7C83] hover:text-[#245C6B]"
                            title="Ver anexo"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(idx)}
                            className="p-1.5 text-[#D96C6C] hover:bg-[#FDF0F0] rounded-lg"
                            title="Remover anexo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border-2 border-dashed border-[#63C7B2]/50 text-center bg-white/60">
                    <p className="text-xs font-semibold text-[#6B7C83]">
                      Nenhum anexo adicionado ainda. Clique em "Fazer Upload" ou selecione da pasta da criança abaixo.
                    </p>
                  </div>
                )}

                {/* Import from Child's existing docs */}
                {existingDocs.length > 0 && (
                  <div className="pt-2 border-t border-[#63C7B2]/30 space-y-1.5">
                    <p className="text-[11px] font-black uppercase text-[#20836F]">
                      Ou selecione arquivos já salvos na ficha de {childName}:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {existingDocs.map((doc) => {
                        const isAttached = form.attachments.some((a) => a.url === doc.file_url)
                        return (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => handleAttachExistingDoc(doc)}
                            disabled={isAttached}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border-2 transition-all flex items-center gap-1 ${
                              isAttached
                                ? "bg-[#E8F8F5] text-[#20836F] border-[#63C7B2]/60 opacity-60 cursor-default"
                                : "bg-white text-[#19323A] border-[#D8E5E7] hover:border-[#245C6B]"
                            }`}
                          >
                            <FileCheck className="w-3 h-3 text-[#20836F]" />
                            <span className="truncate max-w-40">{doc.file_name}</span>
                            {isAttached && " (Anexado)"}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t-2 border-[#EEF5F6] bg-[#F7FAFA] flex justify-end gap-3 rounded-b-3xl">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button loading={saving} onClick={handleCreateReport} className="shadow-[0_4px_0_0_#143741]">
                Salvar & Emitir Relatório
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visualizar Relatório com Anexos e Evidências */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white">
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl print:border-none print:shadow-none">
            <div className="p-6 border-b-2 border-[#EEF5F6] flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2 text-[#245C6B]">
                <FileText className="w-5 h-5" />
                <span className="font-black text-sm uppercase tracking-wider">Visualização de Parecer Clínico</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => window.print()} className="font-bold border-2">
                  <Printer className="w-4 h-4 mr-1.5" />
                  Imprimir / Salvar PDF
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedReport(null)}>
                  Fechar
                </Button>
              </div>
            </div>

            <div className="p-8 sm:p-10 overflow-y-auto space-y-6 text-sm">
              {/* Header */}
              <div className="text-center border-b-2 border-[#19323A] pb-6 space-y-1.5">
                <h1 className="text-2xl font-black uppercase tracking-wide text-[#19323A]">
                  {selectedReport.title}
                </h1>
                <p className="text-xs font-bold text-[#245C6B]">
                  Clínica: {professional?.clinic_name || "EvoluIA — Gestão Psicopedagógica"}
                </p>
                <p className="text-xs font-semibold text-[#6B7C83]">
                  Profissional: <strong>{professional?.full_name}</strong> {professional?.crp ? `· CRP: ${professional.crp}` : ""}
                </p>
                <p className="text-xs font-semibold text-[#6B7C83]">
                  Paciente: <strong>{childName}</strong> · Data de Emissão: <strong>{formatDate(selectedReport.created_at)}</strong>
                </p>
              </div>

              {/* Sections */}
              {selectedReport.content && typeof selectedReport.content === "object" && (
                <div className="space-y-6 leading-relaxed">
                  {(selectedReport.content as any).introduction && (
                    <div className="space-y-1.5">
                      <h4 className="font-black text-xs uppercase text-[#245C6B] tracking-wider border-b border-[#D8E5E7] pb-1">
                        1. Introdução & Objetivos
                      </h4>
                      <p className="whitespace-pre-wrap text-[#19323A] text-justify leading-relaxed">
                        {(selectedReport.content as any).introduction}
                      </p>
                    </div>
                  )}

                  {(selectedReport.content as any).development && (
                    <div className="space-y-1.5">
                      <h4 className="font-black text-xs uppercase text-[#245C6B] tracking-wider border-b border-[#D8E5E7] pb-1">
                        2. Desenvolvimento das Sessões & Habilidades
                      </h4>
                      <p className="whitespace-pre-wrap text-[#19323A] text-justify leading-relaxed">
                        {(selectedReport.content as any).development}
                      </p>
                    </div>
                  )}

                  {(selectedReport.content as any).conclusion && (
                    <div className="space-y-1.5">
                      <h4 className="font-black text-xs uppercase text-[#245C6B] tracking-wider border-b border-[#D8E5E7] pb-1">
                        3. Conclusão & Recomendações Pedagógicas
                      </h4>
                      <p className="whitespace-pre-wrap text-[#19323A] text-justify leading-relaxed">
                        {(selectedReport.content as any).conclusion}
                      </p>
                    </div>
                  )}

                  {/* 4. ANEXOS / ATIVIDADES / PROVAS */}
                  {Array.isArray((selectedReport.content as any).attachments) &&
                    (selectedReport.content as any).attachments.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <h4 className="font-black text-xs uppercase text-[#245C6B] tracking-wider border-b border-[#D8E5E7] pb-1 flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5" />
                          4. Anexos & Evidências Clínicas (Atividades, Provas & Laudos)
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(selectedReport.content as any).attachments.map((att: Attachment, idx: number) => {
                            const isImg =
                              att.type === "png" ||
                              att.type === "jpg" ||
                              att.type === "jpeg" ||
                              att.url?.match(/\.(png|jpg|jpeg|webp)/i)

                            return (
                              <div
                                key={idx}
                                className="p-3 rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-black text-[#19323A] truncate">
                                    {att.name}
                                  </span>
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] font-bold text-[#20836F] hover:underline flex items-center gap-1 shrink-0 print:hidden"
                                  >
                                    <Download className="w-3 h-3" />
                                    Baixar
                                  </a>
                                </div>

                                {isImg && (
                                  <div className="rounded-xl overflow-hidden border border-[#D8E5E7] bg-white max-h-48 flex items-center justify-center">
                                    <img
                                      src={att.url}
                                      alt={att.name}
                                      className="object-contain max-h-48 w-full"
                                    />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Signature */}
              <div className="pt-12 text-center border-t-2 border-[#D8E5E7] mt-12 space-y-1">
                <p className="font-black text-base text-[#19323A]">{professional?.full_name}</p>
                <p className="text-xs font-semibold text-[#6B7C83]">
                  Psicopedagoga Clínica · CRP {professional?.crp || ""}
                </p>
                <p className="text-[10px] text-[#8DA3A8] mt-2">
                  Documento emitido eletronicamente via Sistema EvoluIA.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
