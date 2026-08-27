import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Plus, CheckCircle, Clock, Save, Edit3, BookOpen, Printer, Sparkles, RotateCcw, Loader2, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Textarea } from "@/components/ui/Input"
import { formatDate } from "@/lib/utils"
import toast from "react-hot-toast"
import type { InitialAssessment } from "@/types/database"

interface ChildAssessmentTabProps {
  childId: string
}

export const DEFAULT_ASSESSMENT_QUESTIONS = [
  {
    id: "q1",
    num: 1,
    title: "QUEIXA LIVRE: EM QUE POSSO AJUDÁ-LOS? OU O QUE OS TROUXE ATÉ AQUI?",
    placeholder: "Relato livre dos pais sobre a queixa principal...",
  },
  {
    id: "q2",
    num: 2,
    title: "QUANDO COMEÇOU O PROBLEMA?",
    placeholder: "Quando os pais ou a escola começaram a notar as primeiras dificuldades...",
  },
  {
    id: "q3",
    num: 3,
    title: "COMO VOCÊS SE SENTEM DIANTE DESSA DIFICULDADE?",
    placeholder: "Sentimentos da família, angústias, expectativas...",
  },
  {
    id: "q4",
    num: 4,
    title: "O QUE A ESCOLA RELATA SOBRE ESSA DIFICULDADE?",
    placeholder: "Parecer da professora, coordenação ou relatórios escolares...",
  },
  {
    id: "q5",
    num: 5,
    title: "EM CASA, COMO É ESSA DIFICULDADE RELATADA PELA ESCOLA?",
    placeholder: "Percepção dos pais sobre as mesmas dificuldades no ambiente familiar...",
  },
  {
    id: "q6",
    num: 6,
    title: "FALE-ME EM DETALHES COMO É A ROTINA DE SEU FILHO DESDE A HORA DE ACORDAR ATÉ A HORA DE DORMIR, DURANTE UMA SEMANA.",
    placeholder: "Horários de acordar, escola, alimentação, telas, brincadeiras e sono...",
  },
  {
    id: "q7",
    num: 7,
    title: "COMO ELE SE COMPORTA AO FAZER AS LIÇÕES DE CASA?",
    placeholder: "Autonomia, frustração, tempo gasto, necessidade de auxílio...",
  },
  {
    id: "q8",
    num: 8,
    title: "E COMO VOCÊS REAGEM A ESSE COMPORTAMENTO?",
    placeholder: "Paciência, conflitos, estratégias que a família adota...",
  },
  {
    id: "q9",
    num: 9,
    title: "EXISTE OUTRO PROBLEMA ALÉM DESSE?",
    placeholder: "Questões de saúde, emocionais, relacionamento social, histórico familiar...",
  },
  {
    id: "q10",
    num: 10,
    title: "QUAIS AS QUALIDADES DE SEU FILHO?",
    placeholder: "Pontos fortes, habilidades, interesses, do que ele mais gosta...",
  },
  {
    id: "q11",
    num: 11,
    title: "TEM OUTROS FILHOS? COMO ELES SÃO?",
    placeholder: "Irmãos, idades, dinâmica entre eles, comparação de desenvolvimento...",
  },
  {
    id: "q12",
    num: 12,
    title: "O QUE VOCÊS ESPERAM DE MIM E DO MEU TRABALHO?",
    placeholder: "Expectativas da família com o acompanhamento psicopedagógico...",
  },
  {
    id: "q13",
    num: 13,
    title: "GOSTARIAM DE ACRESCENTAR ALGO?",
    placeholder: "Outras informações relevantes trazidas na entrevista inicial...",
  },
]

function renderFormattedMarkdown(text: string) {
  const lines = text.split("\n")
  return lines.map((line, lineIdx) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed === "---") return null

    const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ")
    const cleanLine = isBullet ? trimmed.substring(2) : trimmed

    // Split on **bold text**
    const parts = cleanLine.split(/(\*\*.*?\*\*)/g)
    const content = parts.map((part, partIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={partIdx} className="font-black text-[#19323A]">
            {part.slice(2, -2)}
          </strong>
        )
      }
      return part
    })

    if (isBullet) {
      return (
        <li key={lineIdx} className="ml-5 list-disc text-sm text-[#2E4A52] leading-relaxed my-1 pl-1">
          {content}
        </li>
      )
    }

    return (
      <p key={lineIdx} className="text-sm text-[#2E4A52] leading-relaxed my-2">
        {content}
      </p>
    )
  })
}

export function ChildAssessmentTab({ childId }: ChildAssessmentTabProps) {
  const { user, professional } = useAuthStore()
  const [searchParams] = useSearchParams()
  const appointmentId = searchParams.get("appointmentId")

  const [assessment, setAssessment] = useState<InitialAssessment | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(true)

  // AI analysis state
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [aiAnalyzedAt, setAiAnalyzedAt] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)


  // Base info
  const [baseForm, setBaseForm] = useState({
    date: new Date().toISOString().split("T")[0],
    referral_source: "",
    school_name: "",
    teacher_name: "",
    notes: "",
  })

  const profId = professional?.id || user?.id

  useEffect(() => {
    loadAssessmentData()
  }, [childId, profId])

  async function loadAssessmentData() {
    if (!profId) return
    setLoading(true)
    try {
      const { data: assessmentData } = await supabase
        .from("initial_assessments")
        .select("*")
        .eq("child_id", childId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (assessmentData) {
        setAssessment(assessmentData)
        setBaseForm({
          date: assessmentData.date || new Date().toISOString().split("T")[0],
          referral_source: assessmentData.referral_source || "",
          school_name: assessmentData.school_name || "",
          teacher_name: assessmentData.teacher_name || "",
          notes: assessmentData.notes || "",
        })

        // Parse answers from notes or assessment_answers
        try {
          if (assessmentData.reason && assessmentData.reason.startsWith("{")) {
            const parsed = JSON.parse(assessmentData.reason)
            setAnswers(parsed)
          } else {
            // Check assessment_answers table
            const { data: answersData } = await supabase
              .from("assessment_answers")
              .select("*")
              .eq("assessment_id", assessmentData.id)

            if (answersData && answersData.length > 0) {
              const map: Record<string, string> = {}
              answersData.forEach((a) => {
                map[a.question_id] = a.answer_text || ""
              })
              setAnswers(map)
            }
          }
        } catch (e) {
          console.error(e)
        }

        setIsEditing(false)

        // Load existing AI analysis if available
        if ((assessmentData as any).ai_analysis) {
          setAiAnalysis((assessmentData as any).ai_analysis)
          setAiAnalyzedAt((assessmentData as any).ai_analyzed_at)
        }
      } else {
        setIsEditing(true)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAnalyzeWithAI() {
    if (!assessment?.id) return
    setAiLoading(true)
    try {
      // Get child name from the parent component context via childId
      const { data: childData } = await supabase
        .from("children")
        .select("full_name")
        .eq("id", childId)
        .single()

      const { data, error } = await supabase.functions.invoke("ai-analyze-interview", {
        body: {
          assessment_id: assessment.id,
          child_name: childData?.full_name || "paciente",
        },
      })

      if (error) {
        console.error("Supabase function error:", error)
        throw new Error(error.message || "Erro ao invocar a função de IA")
      }

      if (data?.error) {
        toast.error(data.error || "Erro ao gerar análise. Tente novamente.")
        return
      }

      setAiAnalysis(data.analysis)
      setAiAnalyzedAt(new Date().toISOString())
      toast.success("Análise gerada com sucesso! ✨")
    } catch (err: any) {
      console.error("AI Analysis error:", err)
      toast.error(err.message || "Erro ao conectar com a IA. Tente novamente.")
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSaveAssessment() {
    if (!profId) {
      toast.error("Sessão não identificada")
      return
    }

    setSaving(true)
    try {
      const answersJsonString = JSON.stringify(answers)
      let aId = assessment?.id

      if (aId) {
        const { error } = await supabase
          .from("initial_assessments")
          .update({
            date: baseForm.date,
            referral_source: baseForm.referral_source || null,
            school_name: baseForm.school_name || null,
            teacher_name: baseForm.teacher_name || null,
            reason: answersJsonString,
            notes: baseForm.notes || null,
            status: "completed",
          })
          .eq("id", aId)

        if (error) throw error
      } else {
        const { data: newAssessment, error } = await supabase
          .from("initial_assessments")
          .insert({
            professional_id: profId,
            child_id: childId,
            date: baseForm.date,
            referral_source: baseForm.referral_source || null,
            school_name: baseForm.school_name || null,
            teacher_name: baseForm.teacher_name || null,
            reason: answersJsonString,
            notes: baseForm.notes || null,
            status: "completed",
          })
          .select()
          .single()

        if (error) throw error
        setAssessment(newAssessment)
      }

      toast.success("Entrevista Inicial salva com sucesso! ✅")
      setIsEditing(false)

      // If came from agenda (has appointmentId in URL), mark appointment as realizado
      if (appointmentId) {
        await supabase
          .from("appointments")
          .update({ status: "done" })
          .eq("id", appointmentId)
      }

      loadAssessmentData()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Erro ao salvar avaliação inicial")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-muted animate-pulse rounded-xl" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Entrevista Inicial (Anamnese com os Pais)
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            13 perguntas estruturadas para a primeira entrevista com os pais e responsáveis.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {assessment && !isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-1.5" />
                Imprimir
              </Button>
              <Button size="sm" onClick={() => setIsEditing(true)}>
                <Edit3 className="w-4 h-4 mr-1.5" />
                Editar Respostas
              </Button>
              {/* AI Analyze Button */}
              <Button
                size="sm"
                onClick={handleAnalyzeWithAI}
                disabled={aiLoading}
                className="gap-1.5 bg-gradient-to-r from-[#245C6B] to-[#1a4a58] hover:from-[#1a4a58] hover:to-[#132f3a] text-white border-0"
              >
                {aiLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {aiLoading ? "Analisando..." : aiAnalysis ? "Reanalisar com IA" : "✨ Analisar com IA"}
              </Button>
            </>
          ) : (
            <Button loading={saving} onClick={handleSaveAssessment}>
              <Save className="w-4 h-4 mr-1.5" />
              Salvar Entrevista
            </Button>
          )}
        </div>
      </div>

      {/* General info card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
            Dados da Entrevista Inicial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <Input
              label="Data da Entrevista"
              type="date"
              disabled={!isEditing}
              value={baseForm.date}
              onChange={(e) => setBaseForm({ ...baseForm, date: e.target.value })}
            />
            <Input
              label="Origem da Indicação"
              placeholder="Ex: Escola, Professora, Neuropediatra..."
              disabled={!isEditing}
              value={baseForm.referral_source}
              onChange={(e) => setBaseForm({ ...baseForm, referral_source: e.target.value })}
            />
            <Input
              label="Escola / Contato"
              placeholder="Nome da escola ou professora..."
              disabled={!isEditing}
              value={baseForm.school_name}
              onChange={(e) => setBaseForm({ ...baseForm, school_name: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* 13 Structured Questions */}
      <div className="space-y-4">
        {DEFAULT_ASSESSMENT_QUESTIONS.map((q) => {
          const value = answers[q.id] || ""
          return (
            <Card
              key={q.id}
              className={`transition-colors ${
                isEditing ? "hover:border-foreground/40" : ""
              }`}
            >
              <CardContent className="p-5 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground text-background font-bold text-xs flex items-center justify-center mt-0.5">
                    {q.num}
                  </span>
                  <label className="text-sm font-bold text-foreground leading-snug">
                    {q.title}
                  </label>
                </div>

                {isEditing ? (
                  <Textarea
                    placeholder={q.placeholder}
                    value={value}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    rows={2}
                    className="mt-1"
                  />
                ) : (
                  <div className="pl-8 pt-1">
                    {value ? (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/50">
                        {value}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic">
                        Não respondido.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ✨ AI ANALYSIS RESULT CARD */}
      {aiAnalysis && (
        <div className="rounded-2xl border-2 border-[#245C6B]/30 bg-gradient-to-br from-[#EAF3F5] to-[#F0F7F9] p-6 space-y-5">
          {/* Card Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#245C6B] flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-black text-[#19323A] text-base">Análise IA — Entrevista Inicial</h3>
                {aiAnalyzedAt && (
                  <p className="text-[11px] text-[#6B7C83] font-semibold mt-0.5">
                    Gerada em {new Date(aiAnalyzedAt).toLocaleDateString("pt-BR")} às{" "}
                    {new Date(aiAnalyzedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleAnalyzeWithAI}
              disabled={aiLoading}
              className="flex items-center gap-1.5 text-[11px] font-bold text-[#245C6B] hover:bg-[#245C6B]/10 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              {aiLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              Reanalisar
            </button>
          </div>

          {/* AI Content — rendered as formatted markdown-like text */}
          <div className="space-y-4">
            {aiAnalysis.split(/\n(?=##\s)/).map((section, i) => {
              const lines = section.trim().split("\n")
              const title = lines[0].replace(/^##\s*/, "").trim()
              const body = lines.slice(1).join("\n").trim()

              return (
                <div key={i} className="space-y-2">
                  {title && (
                    <h4 className="font-black text-sm text-[#19323A] flex items-center gap-1.5">
                      {title}
                    </h4>
                  )}
                  <div className="bg-white/70 rounded-xl p-4 border border-[#245C6B]/15">
                    {renderFormattedMarkdown(body || section)}
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-[10px] text-[#8DA3A8] font-semibold border-t border-[#245C6B]/10 pt-3">
            🔒 Conteúdo gerado por IA para uso interno clínico. Revisão profissional obrigatória antes de qualquer uso.
          </p>
        </div>
      )}

      {/* AI Loading skeleton */}
      {aiLoading && !aiAnalysis && (
        <div className="rounded-2xl border-2 border-[#245C6B]/20 bg-[#EAF3F5]/50 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#245C6B]/20 animate-pulse" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-48 bg-[#245C6B]/20 rounded animate-pulse" />
              <div className="h-3 w-32 bg-[#245C6B]/10 rounded animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-[#245C6B]/10 rounded animate-pulse" />
            <div className="h-3 w-4/5 bg-[#245C6B]/10 rounded animate-pulse" />
            <div className="h-3 w-3/4 bg-[#245C6B]/10 rounded animate-pulse" />
          </div>
          <p className="text-xs text-[#6B7C83] font-semibold text-center animate-pulse">
            ✨ A IA está analisando a entrevista...
          </p>
        </div>
      )}

      {/* Bottom save bar */}
      {isEditing && (
        <div className="flex justify-end gap-3 pt-4 border-t border-border sticky bottom-4 bg-background/90 backdrop-blur-sm p-3 rounded-xl border">
          {assessment && (
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
          )}
          <Button size="lg" loading={saving} onClick={handleSaveAssessment} className="gap-2">
            <Save className="w-4 h-4" />
            Salvar Avaliação Inicial
          </Button>
        </div>
      )}
    </div>
  )
}
