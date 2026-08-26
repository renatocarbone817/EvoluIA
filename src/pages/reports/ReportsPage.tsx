import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  FileText,
  Eye,
  Printer,
  Search,
  Paperclip,
  Download,
  Calendar,
  User,
  ExternalLink,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { formatDate } from "@/lib/utils"
import type { Report } from "@/types/database"

interface ReportWithChild extends Report {
  child?: {
    id: string
    full_name: string
  }
}

export function ReportsPage() {
  const navigate = useNavigate()
  const { professional } = useAuthStore()
  const [reports, setReports] = useState<ReportWithChild[]>([])
  const [selectedReport, setSelectedReport] = useState<ReportWithChild | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (professional) loadReports()
  }, [professional])

  async function loadReports() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from("reports")
        .select("*, child:children(id, full_name)")
        .eq("professional_id", professional!.id)
        .order("created_at", { ascending: false })

      setReports((data || []) as ReportWithChild[])
    } finally {
      setLoading(false)
    }
  }

  const filtered = reports.filter((r) => {
    const text = `${r.title} ${r.child?.full_name || ""}`.toLowerCase()
    return text.includes(search.toLowerCase())
  })

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-[#19323A] tracking-tight">
          Central de Relatórios & Pareceres
        </h1>
        <p className="text-xs font-semibold text-[#6B7C83] uppercase tracking-wider mt-1">
          Consulte, imprima e visualize todos os relatórios emitidos com seus anexos de atividades e provas
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8DA3A8]" />
        <input
          type="text"
          placeholder="Buscar por título do relatório ou paciente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 h-11 rounded-xl border-2 border-[#D8E5E7] bg-white text-sm font-semibold text-[#19323A] focus-visible:outline-none focus-visible:border-[#245C6B] transition-all placeholder:text-[#8DA3A8]"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[#EEF5F6] animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-2 border-dashed border-[#D8E5E7] text-center py-12">
          <CardContent className="space-y-3">
            <FileText className="w-10 h-10 text-[#8DA3A8] mx-auto opacity-50" />
            <p className="font-black text-base text-[#19323A]">Nenhum relatório emitido ainda</p>
            <p className="text-xs text-[#6B7C83] max-w-sm mx-auto">
              Você pode emitir relatórios completos na aba "Relatórios" do perfil de cada criança.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((rep) => {
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
                    Paciente: <strong className="text-[#245C6B]">{rep.child?.full_name || "Paciente"}</strong> · Emitido em <strong>{formatDate(rep.created_at)}</strong>
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
                    Visualizar Relatório
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/criancas/${rep.child_id}`)}
                    className="font-bold text-xs text-[#6B7C83] hover:text-[#19323A]"
                  >
                    Abrir Ficha
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Visualizar Relatório */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:block print:inset-auto print:z-auto print:overflow-visible">
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl print:border-none print:shadow-none print:max-h-none print:h-auto print:w-full print:block print:overflow-visible">
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

            <div className="p-8 sm:p-10 overflow-y-auto space-y-6 text-sm print:overflow-visible print:p-0 print:h-auto print:max-h-none print:block">
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
                  Paciente: <strong>{selectedReport.child?.full_name}</strong> · Data de Emissão: <strong>{formatDate(selectedReport.created_at)}</strong>
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
                          {(selectedReport.content as any).attachments.map((att: any, idx: number) => {
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
