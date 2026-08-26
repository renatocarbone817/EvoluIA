import { useState, useEffect } from "react"
import { FileText, Plus, Download, Printer, Eye } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Textarea } from "@/components/ui/Input"
import { formatDate } from "@/lib/utils"
import toast from "react-hot-toast"
import type { Report } from "@/types/database"

interface ChildReportsTabProps {
  childId: string
  childName: string
}

export function ChildReportsTab({ childId, childName }: ChildReportsTabProps) {
  const { professional } = useAuthStore()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: `Relatório de Evolução Psicopedagógica - ${childName}`,
    period_start: "",
    period_end: new Date().toISOString().split("T")[0],
    introduction: "O presente relatório tem como objetivo apresentar a evolução e o desempenho psicopedagógico...",
    development: "Durante os atendimentos realizados no período, foram trabalhadas habilidades de...",
    conclusion: "Com base nas atividades e estímulos aplicados, recomenda-se a continuidade dos atendimentos...",
  })

  useEffect(() => {
    loadReports()
  }, [childId])

  async function loadReports() {
    setLoading(true)
    const { data } = await supabase
      .from("reports")
      .select("*")
      .eq("child_id", childId)
      .order("created_at", { ascending: false })

    setReports(data || [])
    setLoading(false)
  }

  async function handleCreateReport() {
    if (!professional) return
    setSaving(true)
    try {
      const contentJson = {
        introduction: form.introduction,
        development: form.development,
        conclusion: form.conclusion,
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Relatórios & Pareceres</h2>
          <p className="text-sm text-muted-foreground">
            Elabore e exporte relatórios consolidados da trajetória da criança.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Gerar Novo Relatório
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold text-base">Nenhum relatório elaborado</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Crie relatórios com síntese das sessões para enviar para escolas e famílias.
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Criar Primeiro Relatório
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((rep) => (
            <Card key={rep.id} className="hover:border-foreground/30 transition-colors">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-sm">{rep.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Criado em: {formatDate(rep.created_at)}
                    {rep.period_end ? ` · Período até ${formatDate(rep.period_end)}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedReport(rep)}>
                    <Eye className="w-4 h-4 mr-1.5" />
                    Visualizar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => window.print()}>
                    <Printer className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Criar Relatório */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border border-border max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold">Novo Relatório / Parecer</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowCreateModal(false)}>
                Fechar
              </Button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-sm">
              <Input
                label="Título do Documento"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Início do Período"
                  type="date"
                  value={form.period_start}
                  onChange={(e) => setForm({ ...form, period_start: e.target.value })}
                />
                <Input
                  label="Fim do Período"
                  type="date"
                  value={form.period_end}
                  onChange={(e) => setForm({ ...form, period_end: e.target.value })}
                />
              </div>

              <Textarea
                label="Introdução / Objetivo"
                value={form.introduction}
                onChange={(e) => setForm({ ...form, introduction: e.target.value })}
                rows={3}
              />

              <Textarea
                label="Desenvolvimento & Análise das Habilidades"
                value={form.development}
                onChange={(e) => setForm({ ...form, development: e.target.value })}
                rows={4}
              />

              <Textarea
                label="Considerações Finais & Encaminhamentos"
                value={form.conclusion}
                onChange={(e) => setForm({ ...form, conclusion: e.target.value })}
                rows={3}
              />
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button loading={saving} onClick={handleCreateReport}>
                Salvar & Emitir Relatório
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visualizar Relatório */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white">
          <div className="bg-background rounded-xl border border-border max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl print:border-none print:shadow-none">
            <div className="p-6 border-b border-border flex items-center justify-between print:hidden">
              <span className="font-bold text-sm">Visualização de Documento</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-1.5" />
                  Imprimir / Salvar PDF
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedReport(null)}>
                  Fechar
                </Button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto space-y-6 text-sm">
              <div className="text-center border-b pb-6 space-y-1">
                <h1 className="text-xl font-bold uppercase tracking-wide">
                  {selectedReport.title}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Profissional: {professional?.full_name} {professional?.crp ? `(CRP: ${professional.crp})` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Criança: {childName} · Emitido em: {formatDate(selectedReport.created_at)}
                </p>
              </div>

              {selectedReport.content && typeof selectedReport.content === "object" && (
                <div className="space-y-6 leading-relaxed">
                  {(selectedReport.content as any).introduction && (
                    <div>
                      <h4 className="font-bold text-xs uppercase text-muted-foreground tracking-wider mb-1">
                        1. Introdução
                      </h4>
                      <p className="whitespace-pre-wrap">{(selectedReport.content as any).introduction}</p>
                    </div>
                  )}

                  {(selectedReport.content as any).development && (
                    <div>
                      <h4 className="font-bold text-xs uppercase text-muted-foreground tracking-wider mb-1">
                        2. Desenvolvimento das Sessões
                      </h4>
                      <p className="whitespace-pre-wrap">{(selectedReport.content as any).development}</p>
                    </div>
                  )}

                  {(selectedReport.content as any).conclusion && (
                    <div>
                      <h4 className="font-bold text-xs uppercase text-muted-foreground tracking-wider mb-1">
                        3. Conclusão & Recomendações
                      </h4>
                      <p className="whitespace-pre-wrap">{(selectedReport.content as any).conclusion}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-12 text-center border-t mt-12 space-y-1">
                <p className="font-bold">{professional?.full_name}</p>
                <p className="text-xs text-muted-foreground">Psicopedagoga · CRP {professional?.crp || ""}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
