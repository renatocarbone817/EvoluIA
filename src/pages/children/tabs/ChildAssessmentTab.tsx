import { generateInitialAssessmentAI } from "@/lib/geminiAnalysis"
import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Plus, CheckCircle, Clock, Save, Edit3, BookOpen, Printer, Sparkles, RotateCcw, Loader2, AlertCircle, Calendar } from "lucide-react"
import { NewAppointmentDialog } from "@/pages/appointments/NewAppointmentDialog"
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
  childName?: string
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

function parseInlineMarkdown(text: string) {
  const clean = text.replace(/^`+|`+$/g, "")
  const tokens = clean.split(/(\*\*.*?\*\*|\*[^*]+?\*)/g)
  return tokens.map((token, idx) => {
    if (token.startsWith("**") && token.endsWith("**")) {
      return (
        <strong key={idx} className="font-black text-[#0D2329]">
          {token.slice(2, -2)}
        </strong>
      )
    }
    if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
      return (
        <span key={idx} className="font-bold text-[#7C3AED] bg-[#EDE9FE]/50 px-1 py-0.5 rounded text-[12px]">
          {token.slice(1, -1)}
        </span>
      )
    }
    return token
  })
}

function renderFormattedMarkdown(text: string) {
  if (!text) return null

  const normalized = text
    .replace(/^[\s•*–-]*`+(#{1,4}\s*[^`\n]+)`+/gm, "$1")
    .replace(/^[\s•*–-]+(#{1,4}\s+)/gm, "$1")
    .replace(/`+(#{1,4}\s*[^`\n]+)`+/g, "$1")
    .replace(/^(#{1,4}\s+[^`\n]+)`+/gm, "$1")
    .replace(/^`+(#{1,4}\s+)/gm, "$1")
    .replace(/^[\s•*–-]+\s*(#{1,4}\s+)/gm, "$1")
    .replace(/^\*\s+([^:\n]+):\s*\n\s*\*\s+Relatos que justificam:/gm, "### $1\n**Relatos que justificam:**")
    .replace(/^\*\s+([^:\n]+):\s*\n\s*\*\s+Análise:/gm, "### $1\n**Análise:**")
    .replace(/^\*\s+([^:\n]+):\s*$/gm, "### $1")

  const lines = normalized.split("\n")
  return lines.map((line, lineIdx) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed === "---") return null

    if (trimmed.startsWith("# ") || trimmed.startsWith("## ")) {
      const cleanTitle = trimmed.replace(/^#{1,2}\s*/, "").replace(/^`+|`+$/g, "")
      return (
        <div key={lineIdx} className="pt-6 pb-2 mt-6 border-b-2 border-[#D8E5E7] first:mt-0 first:pt-0">
          <h3 className="font-black text-sm sm:text-base text-[#0D2329] tracking-tight uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] inline-block shrink-0" />
            <span>{parseInlineMarkdown(cleanTitle)}</span>
          </h3>
        </div>
      )
    }

    if (trimmed.startsWith("### ")) {
      const cleanSub = trimmed.replace(/^###\s*/, "").replace(/^`+|`+$/g, "")
      return (
        <div key={lineIdx} className="mt-4 mb-1">
          <h4 className="font-black text-xs sm:text-sm text-[#7C3AED] flex items-center gap-1.5">
            <span>{parseInlineMarkdown(cleanSub)}</span>
          </h4>
        </div>
      )
    }

    const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ")
    const isNumbered = /^\d+\.\s/.test(trimmed)
    const cleanLine = isBullet ? trimmed.replace(/^[\*\-•]\s+/, "") : trimmed

    if (isBullet) {
      return (
        <li key={lineIdx} className="ml-4 list-disc text-xs sm:text-sm text-[#2E4A52] leading-relaxed my-1 pl-1 font-medium">
          {parseInlineMarkdown(cleanLine)}
        </li>
      )
    }

    if (isNumbered) {
      return (
        <div key={lineIdx} className="text-xs sm:text-sm text-[#2E4A52] leading-relaxed my-1.5 font-bold">
          {parseInlineMarkdown(cleanLine)}
        </div>
      )
    }

    return (
      <p key={lineIdx} className="text-xs sm:text-sm text-[#2E4A52] leading-relaxed my-1.5 font-medium">
        {parseInlineMarkdown(cleanLine)}
      </p>
    )
  })
}

export function ChildAssessmentTab({ childId, childName }: ChildAssessmentTabProps) {
  const { user, professional } = useAuthStore()
  const [searchParams] = useSearchParams()
  const appointmentId = searchParams.get("appointmentId")

  const [assessment, setAssessment] = useState<InitialAssessment | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(true)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)

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
      const { data: childData } = await supabase
        .from("children")
        .select("full_name")
        .eq("id", childId)
        .maybeSingle()

      const childFullName = childName || childData?.full_name || "paciente"

      // Chama diretamente o serviço Gemini com rotação de chaves e o novo prompt oficial
      const result = await generateInitialAssessmentAI(assessment.id, childFullName, answers)

      setAiAnalysis(result.analysis)
      setAiAnalyzedAt(new Date().toISOString())
      toast.success("Análise gerada com sucesso com as novas diretrizes clínicas! ✨")
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
    <div className="printable-report space-y-6 max-w-4xl print:max-w-none print:w-full print:p-0">
      {/* Print-only Formal Header */}
      <div className="hidden print:block text-center border-b-2 border-[#19323A] pb-6 mb-6 space-y-1.5">
        <h1 className="text-2xl font-black uppercase tracking-wide text-[#19323A]">
          Entrevista Inicial — Anamnese com os Pais
        </h1>
        <p className="text-xs font-bold text-[#245C6B]">
          Clínica: {professional?.clinic_name || "EvoluIA — Gestão Psicopedagógica"}
        </p>
        <p className="text-xs font-semibold text-[#6B7C83]">
          Profissional: <strong>{professional?.full_name}</strong> {professional?.crp ? `· CBO: ${professional.crp}` : ""}
        </p>
        <p className="text-xs font-semibold text-[#6B7C83]">
          Paciente: <strong>{childName || "Paciente"}</strong> · Data da Entrevista: <strong>{baseForm.date ? formatDate(baseForm.date) : formatDate(new Date().toISOString())}</strong>
        </p>
        {(baseForm.school_name || baseForm.referral_source) && (
          <p className="text-xs font-medium text-[#6B7C83]">
            {baseForm.school_name ? `Escola: ${baseForm.school_name}` : ""} {baseForm.referral_source ? `· Indicação: ${baseForm.referral_source}` : ""}
          </p>
        )}
      </div>

      {/* Top action bar (hidden on print) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b-2 border-[#EEF5F6] print:hidden">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-[#0D2329] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#7C3AED]" />
            <span>Entrevista Inicial (Anamnese com os Pais)</span>
          </h2>
          <p className="text-xs font-semibold text-[#6B7C83] mt-0.5">
            13 perguntas estruturadas para a primeira entrevista com os pais e responsáveis.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {assessment && !isEditing ? (
            <>
              {/* Botão para Agendar Sessões com a Criança Imediatamente */}
              <button
                type="button"
                onClick={() => setShowAppointmentModal(true)}
                className="px-3.5 py-2 rounded-2xl bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0284C7] border-2 border-[#BAE6FD] text-xs font-black transition-all shadow-2xs active:scale-95 flex items-center gap-1.5"
                title="Agendar sessões para esta criança"
              >
                <Calendar className="w-4 h-4" />
                <span>+ Agendar Sessões</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-2xl bg-white border-2 border-[#D8E5E7] hover:border-[#7C3AED] hover:bg-[#F8FAFB] text-xs font-black text-[#0D2329] transition-all shadow-2xs active:scale-95 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-[#6B7C83]" />
                <span>Imprimir</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-2 rounded-2xl bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#7C3AED] border-2 border-[#C4B5FD] font-black text-xs transition-all shadow-2xs active:scale-95 flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" />
                <span>Editar Respostas</span>
              </button>

              <button
                type="button"
                onClick={handleAnalyzeWithAI}
                disabled={aiLoading}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white font-black text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {aiLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{aiLoading ? "Analisando..." : aiAnalysis ? "Reanalisar com IA" : "✨ Analisar com IA"}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveAssessment}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#00C48C] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Salvar Entrevista</span>
            </button>
          )}
        </div>
      </div>

      {/* General info card */}
      <Card className="print:border print:border-[#D8E5E7] print:shadow-none">
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
              className={`transition-colors print:break-inside-avoid print:border print:border-[#D8E5E7] print:shadow-none print:bg-white ${
                isEditing ? "hover:border-foreground/40" : ""
              }`}
            >
              <CardContent className="p-5 space-y-2.5 print:p-3.5">
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground text-background font-bold text-xs flex items-center justify-center mt-0.5 print:bg-[#19323A] print:text-white">
                    {q.num}
                  </span>
                  <label className="text-sm font-bold text-foreground leading-snug print:text-[#19323A]">
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
                  <div className="pl-8 pt-1 print:pl-7 print:pt-0">
                    {value ? (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/50 print:bg-[#F7FAFA] print:text-[#19323A] print:border-[#D8E5E7] print:p-2.5">
                        {value}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic print:text-[#8DA3A8]">
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

      {/* ✨ AI ANALYSIS RESULT CARD (Design Moderno & Hierárquico) */}
      {aiAnalysis && (
        <div className="rounded-3xl border-2 border-[#D8E5E7] bg-white p-6 sm:p-8 space-y-6 shadow-sm print:hidden">
          {/* Card Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b-2 border-[#EEF5F6]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 shadow-2xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-[#0D2329] text-base sm:text-lg tracking-tight">
                    Análise Clínica Preliminar — Apoio Psicopedagógico
                  </h3>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#E8F8F5] text-[#065F46] border border-[#A7F3D0]">
                    Gemini 3.6 Flash
                  </span>
                </div>
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
              className="flex items-center gap-1.5 text-xs font-black text-[#7C3AED] bg-[#F7FAFA] hover:bg-[#EDE9FE] border-2 border-[#D8E5E7] hover:border-[#7C3AED] px-3.5 py-2 rounded-2xl transition-all shadow-2xs shrink-0 active:scale-95"
            >
              {aiLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              <span>Reanalisar</span>
            </button>
          </div>

          {/* AI Content — Hierarchical Clean Container */}
          <div className="bg-[#F8FAFB] rounded-3xl p-5 sm:p-7 border-2 border-[#D8E5E7] shadow-inner space-y-1">
            {renderFormattedMarkdown(aiAnalysis)}
          </div>

          <p className="text-[11px] text-[#8CAAB1] font-bold border-t border-[#EEF5F6] pt-3 flex items-center gap-1.5">
            <span>🔒</span>
            <span>Documento preliminar gerado por IA para apoio ao planejamento da psicopedagoga. Não substitui a avaliação clínica presencial.</span>
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
        <div className="flex justify-end gap-3 pt-4 border-t border-border sticky bottom-4 bg-background/90 backdrop-blur-sm p-3 rounded-xl border print:hidden">
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
      {/* Dialog de Novo Agendamento Direto da Entrevista Inicial */}
      <NewAppointmentDialog
        open={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        onSuccess={() => {
          setShowAppointmentModal(false)
          toast.success("Sessão agendada com sucesso! 📅", { icon: "🎉" })
        }}
        defaultChildId={childId}
      />
    </div>
  )
}
