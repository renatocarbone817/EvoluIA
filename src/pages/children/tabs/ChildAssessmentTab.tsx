import { generateInitialAssessmentAI } from "@/lib/geminiAnalysis"
import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Plus,
  CheckCircle,
  Clock,
  Save,
  Edit3,
  BookOpen,
  Printer,
  Sparkles,
  RotateCcw,
  Loader2,
  AlertCircle,
  Calendar,
  School,
  User,
  Check,
  Download,
  Share2,
  CheckSquare,
} from "lucide-react"
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

export const DEFAULT_SCHOOL_QUESTIONS = [
  {
    id: "sq1",
    num: 1,
    title: "COMO É O DESENVOLVIMENTO DO ALUNO NA SALA DE AULA?",
    placeholder: "Descreva o ritmo de aprendizagem, participação e realização das propostas...",
  },
  {
    id: "sq2",
    num: 2,
    title: "COMO É O COMPORTAMENTO DO ALUNO NA SALA DE AULA?",
    placeholder: "Relacionamento com a professora e colegas, respeito às regras da sala...",
  },
  {
    id: "sq3",
    num: 3,
    title: "QUAIS AS PRINCIPAIS DIFICULDADES APRESENTADAS PELO ALUNO?",
    placeholder: "Leitura, escrita, matemática, raciocínio lógico, foco ou atenção...",
  },
  {
    id: "sq4",
    num: 4,
    title: "QUAIS AS SUAS CARACTERÍSTICAS QUANTO À APRENDIZAGEM E ASSIMILAÇÃO DE CONTEÚDOS?",
    placeholder: "Dificuldade na memorização, fixação de sílabas, compreensão de instruções...",
  },
  {
    id: "sq5",
    num: 5,
    title: "FAZ AS ATIVIDADES ESCOLARES EM SALA?",
    placeholder: "Conclui no tempo esperado, necessita de cobrança constante, desiste fácil...",
  },
  {
    id: "sq6",
    num: 6,
    title: "FAZ AS ATIVIDADES PARA CASA?",
    placeholder: "Traz os deveres feitos com regularidade, esquece os cadernos...",
  },
  {
    id: "sq7",
    num: 7,
    title: "COMO REAGE QUANDO É CONTRARIADO?",
    placeholder: "Aceita correções, chora, fecha a cara, reage com agressividade ou passividade...",
  },
  {
    id: "sq8",
    num: 8,
    title: "TEM DIFICULDADE DE TRABALHAR EM GRUPO? COMO SE MANIFESTA ESTA DIFICULDADE?",
    placeholder: "Isola-se, quer impor suas ideias, colabora bem com os colegas...",
  },
  {
    id: "sq9",
    num: 9,
    title: "TEM DIFICULDADE EM ORGANIZAR SUAS TAREFAS E ATIVIDADES PESSOAIS?",
    placeholder: "Organização da mochila, estojo, caderno de recados, cuidar dos seus pertences...",
  },
  {
    id: "sq10",
    num: 10,
    title: "OS COLEGAS DA TURMA O EVITAM?",
    placeholder: "É aceito no recreio e nos jogos, sofre rejeição ou prefere ficar sozinho...",
  },
  {
    id: "sq11",
    num: 11,
    title: "RELATE QUALQUER INFORMAÇÃO QUE NÃO TENHA SIDO ABORDADA OU QUE JULGUE IMPORTANTE:",
    placeholder: "Outras observações pedagógicas ou comportamentais relevantes...",
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

  // Sub-aba: "familiar" vs "escolar"
  const [activeSubTab, setActiveSubTab] = useState<"familiar" | "escolar">("familiar")

  const [assessment, setAssessment] = useState<InitialAssessment | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(true)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)

  // School Interview State (Modelo Priscila Carbone)
  const [schoolAnswers, setSchoolAnswers] = useState<Record<string, string>>({})
  const [schoolObserver, setSchoolObserver] = useState({
    name: "",
    role: "Professora Regente",
    date: new Date().toISOString().split("T")[0],
  })
  const [schoolTraits, setSchoolTraits] = useState<Record<string, boolean>>({
    agressivo: false,
    passivo: false,
    dependente: false,
    medroso: false,
    retraido: false,
    melancolico: false,
    calmo: false,
    desligado: false,
    sem_limites: false,
    agitado: false,
    depressivo: false,
    ressentido: false,
  })
  const [savingSchool, setSavingSchool] = useState(false)
  const [isEditingSchool, setIsEditingSchool] = useState(true)

  // AI analysis state
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [aiAnalyzedAt, setAiAnalyzedAt] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const aiSectionRef = useRef<HTMLDivElement>(null)

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
        .maybeSingle()

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

        // Parse School Interview if saved in notes
        try {
          if (assessmentData.notes && assessmentData.notes.includes("__SCHOOL_INTERVIEW__:")) {
            const raw = assessmentData.notes.split("__SCHOOL_INTERVIEW__:")[1]
            const parsedSchool = JSON.parse(raw)
            if (parsedSchool.answers) setSchoolAnswers(parsedSchool.answers)
            if (parsedSchool.observer) setSchoolObserver(parsedSchool.observer)
            if (parsedSchool.traits) setSchoolTraits(parsedSchool.traits)
            setIsEditingSchool(false)
          }
        } catch (e) {
          console.error("Error parsing school interview:", e)
        }

        setIsEditing(false)

        // Load existing AI analysis if available
        if ((assessmentData as any).ai_analysis) {
          setAiAnalysis((assessmentData as any).ai_analysis)
          setAiAnalyzedAt((assessmentData as any).ai_analyzed_at)
        }
      } else {
        setIsEditing(true)
        setIsEditingSchool(true)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAnalyzeWithAI() {
    if (!assessment?.id) return
    setAiLoading(true)

    setTimeout(() => {
      aiSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 50)

    try {
      const { data: childData } = await supabase
        .from("children")
        .select("full_name")
        .eq("id", childId)
        .maybeSingle()

      const childFullName = childName || childData?.full_name || "paciente"
      const result = await generateInitialAssessmentAI(assessment.id, childFullName, answers)

      setAiAnalysis(result.analysis)
      setAiAnalyzedAt(new Date().toISOString())
      toast.success("Análise gerada com sucesso com as novas diretrizes clínicas! ✨")

      setTimeout(() => {
        aiSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 100)
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
            status: "completed",
          })
          .eq("id", aId)

        if (error) throw error
      } else {
        const { data: newAss, error } = await supabase
          .from("initial_assessments")
          .insert({
            child_id: childId,
            professional_id: profId,
            date: baseForm.date,
            referral_source: baseForm.referral_source || null,
            school_name: baseForm.school_name || null,
            teacher_name: baseForm.teacher_name || null,
            reason: answersJsonString,
            status: "completed",
          })
          .select()
          .single()

        if (error) throw error
        setAssessment(newAss)
        aId = newAss.id
      }

      // Sync with assessment_answers table
      if (aId) {
        const answerEntries = Object.entries(answers)
          .filter(([_, text]) => text && text.trim() !== "")
          .map(([qId, text]) => ({
            assessment_id: aId,
            question_id: qId,
            answer_text: text.trim(),
          }))

        if (answerEntries.length > 0) {
          await supabase.from("assessment_answers").delete().eq("assessment_id", aId)
          await supabase.from("assessment_answers").insert(answerEntries)
        }
      }

      setIsEditing(false)
      toast.success("Anamnese Familiar salva com sucesso!", { icon: "✅" })
    } catch (err: any) {
      console.error(err)
      toast.error("Erro ao salvar avaliação.")
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveSchoolInterview() {
    if (!profId) return
    setSavingSchool(true)
    try {
      const schoolPayload = {
        answers: schoolAnswers,
        observer: schoolObserver,
        traits: schoolTraits,
        savedAt: new Date().toISOString(),
      }

      const schoolString = `__SCHOOL_INTERVIEW__:${JSON.stringify(schoolPayload)}`

      let aId = assessment?.id
      if (aId) {
        await supabase
          .from("initial_assessments")
          .update({
            notes: schoolString,
            teacher_name: schoolObserver.name || baseForm.teacher_name || null,
          })
          .eq("id", aId)
      } else {
        const { data: newAss } = await supabase
          .from("initial_assessments")
          .insert({
            child_id: childId,
            professional_id: profId,
            date: new Date().toISOString().split("T")[0],
            notes: schoolString,
            status: "completed",
          })
          .select()
          .single()

        if (newAss) setAssessment(newAss)
      }

      setIsEditingSchool(false)
      toast.success("Questionário de Visita Escolar salvo com sucesso!", { icon: "🏫" })
    } catch (err) {
      toast.error("Erro ao salvar questionário escolar.")
    } finally {
      setSavingSchool(false)
    }
  }

  function handlePrintSchoolForm() {
    const printWin = window.open("", "_blank", "width=850,height=900")
    if (!printWin) {
      toast.error("Por favor, permita pop-ups no navegador para imprimir o questionário.")
      return
    }

    const clinicTitle = professional?.clinic_name || "ESPAÇO MULTIDISCIPLINAR APRENDER ENSINANDO"
    const profName = professional?.full_name || "Priscila Carbone"
    const crpOrCbo = professional?.crp ? `CBO ${professional.crp}` : "CBO 2394-25"
    const cityState = `${professional?.city || "Votuporanga"} - ${professional?.state || "SP"}`
    const phone = professional?.phone || "(17) 99191-0452"
    const email = professional?.email || "psicopedagogapriscilacarbone@gmail.com"
    const address = professional?.address || "RUA BAHIA 3600 CENTRO VOTUPORANGA"

    const traitsList = [
      { key: "agressivo", label: "agressivo" },
      { key: "passivo", label: "passivo" },
      { key: "dependente", label: "dependente" },
      { key: "medroso", label: "medroso" },
      { key: "retraido", label: "retraído" },
      { key: "melancolico", label: "melancólico" },
      { key: "calmo", label: "calmo" },
      { key: "desligado", label: "desligado" },
      { key: "sem_limites", label: "sem limites" },
      { key: "agitado", label: "agitado" },
      { key: "depressivo", label: "depressivo" },
      { key: "ressentido", label: "ressentido" },
    ]

    const traitsHtml = traitsList
      .map(
        (t) => `
      <div style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
        <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #333; border-radius: 3px; text-align: center; line-height: 12px; font-weight: bold; font-size: 10px;">
          ${schoolTraits[t.key] ? "✓" : ""}
        </span>
        <span>${t.label}</span>
      </div>
    `
      )
      .join("")

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Questionário de Visita Escolar - ${childName || "Paciente"}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 14mm 10mm 14mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #111;
            margin: 0;
            padding: 0;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .page {
            height: 277mm;
            max-height: 277mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always;
            break-after: page;
          }
          .page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
          .header-banner {
            background-color: #005B94 !important;
            color: #ffffff !important;
            text-align: center;
            padding: 9px 10px;
            border-radius: 4px;
            margin-bottom: 12px;
          }
          .header-banner h1 { margin: 0; font-size: 13.5px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; }
          .header-banner h2 { margin: 3px 0 0; font-size: 11px; font-weight: 600; opacity: 0.95; }
          
          .title-section { text-align: center; margin-bottom: 10px; }
          .title-section h3 { margin: 0; font-size: 12.5px; font-weight: 800; color: #005B94; text-transform: uppercase; letter-spacing: 0.3px; }
          
          .patient-box {
            border: 1.5px solid #005B94;
            padding: 8px 12px;
            border-radius: 6px;
            margin-bottom: 10px;
            font-size: 11.5px;
            background: #F8FAFC;
          }
          .patient-box p { margin: 3px 0; }
          
          .intro-box {
            background: #F0F7FA;
            border-left: 3.5px solid #005B94;
            padding: 7px 10px;
            font-size: 10px;
            line-height: 1.35;
            color: #334155;
            margin-bottom: 12px;
            border-radius: 0 4px 4px 0;
          }

          .question-block {
            margin-bottom: 11px;
          }
          .question-title {
            font-size: 11px;
            font-weight: 700;
            color: #0F172A;
            margin: 0 0 4px 0;
          }
          .write-line {
            border-bottom: 1px solid #94A3B8;
            height: 19px;
            width: 100%;
          }
          .answer-text {
            font-size: 11px;
            color: #1E293B;
            line-height: 19px;
            min-height: 19px;
            border-bottom: 1px solid #64748B;
          }
          
          .checklist-box {
            border: 1px solid #CBD5E1;
            padding: 8px 10px;
            border-radius: 6px;
            background: #FAFAFA;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 7px;
          }

          .footer-signature {
            margin-top: 10px;
            font-size: 11px;
          }
          .sig-row {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            margin-top: 15px;
          }
          .sig-box {
            flex: 1;
            border-top: 1px solid #475569;
            padding-top: 4px;
            text-align: center;
            font-size: 10px;
            font-weight: 600;
            color: #334155;
          }

          .footer-banner {
            background-color: #005B94 !important;
            color: #ffffff !important;
            text-align: center;
            padding: 6px;
            font-size: 9.5px;
            font-weight: 600;
            border-radius: 4px;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>

        <!-- =========================================================================
             FOLHA 1 (PÁGINA 1 DE 2)
             ========================================================================= -->
        <div class="page">
          <div>
            <div class="header-banner">
              <h1>${clinicTitle}</h1>
              <h2>PSICOPEDAGOGA ${profName.toUpperCase()} ${crpOrCbo}</h2>
            </div>

            <div class="title-section">
              <h3>QUESTIONÁRIO VISITA PSICOPEDAGÓGICA NO ÂMBITO ESCOLAR</h3>
            </div>

            <div class="patient-box">
              <p><strong>PACIENTE:</strong> ${childName || "_________________________________________________________"}</p>
              <p><strong>ESCOLA:</strong> ${baseForm.school_name || "___________________________________________________________"}</p>
            </div>

            <div class="intro-box">
              <strong>Prezado observador:</strong> Ao responder este guia, relate com riqueza de detalhes as informações observadas. Por gentileza, registre seu nome e cargo (professor, coordenador, diretor, etc).
            </div>

            <!-- P1 -->
            <div class="question-block">
              <p class="question-title">1. Como é o desenvolvimento do aluno na sala de aula?</p>
              ${schoolAnswers.sq1 ? `<div class="answer-text">${schoolAnswers.sq1}</div>` : `<div class="write-line"></div><div class="write-line"></div><div class="write-line"></div><div class="write-line"></div>`}
            </div>

            <!-- P2 -->
            <div class="question-block">
              <p class="question-title">2. Como é o comportamento do aluno na sala de aula?</p>
              ${schoolAnswers.sq2 ? `<div class="answer-text">${schoolAnswers.sq2}</div>` : `<div class="write-line"></div><div class="write-line"></div><div class="write-line"></div><div class="write-line"></div>`}
            </div>

            <!-- P3 -->
            <div class="question-block">
              <p class="question-title">3. Quais as principais dificuldades apresentadas pelo aluno?</p>
              ${schoolAnswers.sq3 ? `<div class="answer-text">${schoolAnswers.sq3}</div>` : `<div class="write-line"></div><div class="write-line"></div><div class="write-line"></div><div class="write-line"></div>`}
            </div>

            <!-- P4 -->
            <div class="question-block">
              <p class="question-title">4. Quais as suas características quanto à aprendizagem e assimilação de conteúdos?</p>
              ${schoolAnswers.sq4 ? `<div class="answer-text">${schoolAnswers.sq4}</div>` : `<div class="write-line"></div><div class="write-line"></div><div class="write-line"></div><div class="write-line"></div>`}
            </div>

            <!-- P5 & P6 em Linhas Práticas -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 4px;">
              <div class="question-block">
                <p class="question-title">5. Faz as atividades escolares?</p>
                ${schoolAnswers.sq5 ? `<div class="answer-text">${schoolAnswers.sq5}</div>` : `<div class="write-line"></div><div class="write-line"></div>`}
              </div>
              <div class="question-block">
                <p class="question-title">6. Faz as atividades para casa?</p>
                ${schoolAnswers.sq6 ? `<div class="answer-text">${schoolAnswers.sq6}</div>` : `<div class="write-line"></div><div class="write-line"></div>`}
              </div>
            </div>
          </div>

          <div class="footer-banner">
            ${address} · TEL: ${phone} · EMAIL: ${email}
          </div>
        </div>

        <!-- =========================================================================
             FOLHA 2 (PÁGINA 2 DE 2)
             ========================================================================= -->
        <div class="page">
          <div>
            <div class="header-banner">
              <h1>${clinicTitle}</h1>
              <h2>PSICOPEDAGOGA ${profName.toUpperCase()} ${crpOrCbo} — AVALIAÇÃO ESCOLAR (CONTINUAÇÃO)</h2>
            </div>

            <!-- P7 -->
            <div class="question-block">
              <p class="question-title">7. Como reage quando é contrariado?</p>
              ${schoolAnswers.sq7 ? `<div class="answer-text">${schoolAnswers.sq7}</div>` : `<div class="write-line"></div><div class="write-line"></div><div class="write-line"></div>`}
            </div>

            <!-- P8 -->
            <div class="question-block">
              <p class="question-title">8. Tem dificuldade de trabalhar em grupo? Como se manifesta esta dificuldade?</p>
              ${schoolAnswers.sq8 ? `<div class="answer-text">${schoolAnswers.sq8}</div>` : `<div class="write-line"></div><div class="write-line"></div><div class="write-line"></div>`}
            </div>

            <!-- P9 -->
            <div class="question-block">
              <p class="question-title">9. Tem dificuldade em organizar suas tarefas e atividades pessoais?</p>
              ${schoolAnswers.sq9 ? `<div class="answer-text">${schoolAnswers.sq9}</div>` : `<div class="write-line"></div><div class="write-line"></div><div class="write-line"></div>`}
            </div>

            <!-- P10 -->
            <div class="question-block">
              <p class="question-title">10. Os colegas da turma o evitam?</p>
              ${schoolAnswers.sq10 ? `<div class="answer-text">${schoolAnswers.sq10}</div>` : `<div class="write-line"></div><div class="write-line"></div><div class="write-line"></div>`}
            </div>

            <!-- P11 Checklist -->
            <div class="question-block" style="margin-top: 6px;">
              <p class="question-title">11. Em qual ou quais dessas características o aluno se encaixa?</p>
              <div class="checklist-box">
                ${traitsHtml}
              </div>
              <div style="margin-top: 6px;">
                <p style="font-size: 10.5px; font-weight: 700; color: #334155; margin: 0 0 2px 0;">Observações sobre o comportamento:</p>
                <div class="write-line"></div>
                <div class="write-line"></div>
              </div>
            </div>

            <!-- P12 Outras Informações -->
            <div class="question-block" style="margin-top: 8px;">
              <p class="question-title">12. Relate qualquer informação que não tenha sido abordada ou que julgue importante:</p>
              ${schoolAnswers.sq11 ? `<div class="answer-text">${schoolAnswers.sq11}</div>` : `<div class="write-line"></div><div class="write-line"></div><div class="write-line"></div><div class="write-line"></div>`}
            </div>

            <!-- Assinatura & Data -->
            <div class="footer-signature" style="margin-top: 14px;">
              <p style="margin: 0; font-size: 11px; color: #334155; font-weight: 600;">
                ${cityState}, ______ de __________________________ de 2026.
              </p>

              <div class="sig-row" style="margin-top: 22px;">
                <div class="sig-box">
                  ${schoolObserver.name ? `${schoolObserver.name} (${schoolObserver.role})` : "Nome do Observador / Disciplina / Cargo"}
                </div>
                <div class="sig-box">
                  Assinatura do Observador / Equipe Pedagógica
                </div>
              </div>
            </div>
          </div>

          <div class="footer-banner">
            ${address} · TEL: ${phone} · EMAIL: ${email}
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 350);
          };
        </script>
      </body>
      </html>
    `

    printWin.document.open()
    printWin.document.write(htmlContent)
    printWin.document.close()
  }

  return (
    <div className="space-y-6">
      {/* Alternador de Abas: Familiar vs Escolar */}
      <div className="flex items-center justify-between gap-3 p-1.5 bg-[#F8FAFB] rounded-2xl border-2 border-[#D8E5E7] flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("familiar")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === "familiar"
                ? "bg-[#7C3AED] text-white shadow-xs"
                : "bg-white text-[#6B7C83] hover:text-[#0D2329] border border-[#D8E5E7]"
            }`}
          >
            <User className="w-4 h-4" />
            <span>👨‍👩‍👧 Anamnese Familiar (13 Perguntas)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("escolar")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === "escolar"
                ? "bg-[#0284C7] text-white shadow-xs"
                : "bg-white text-[#6B7C83] hover:text-[#0D2329] border border-[#D8E5E7]"
            }`}
          >
            <School className="w-4 h-4" />
            <span>🏫 Entrevista / Visita Escolar (Modelo Priscila Carbone)</span>
          </button>
        </div>

        {activeSubTab === "escolar" && (
          <button
            type="button"
            onClick={handlePrintSchoolForm}
            className="px-4 py-2 rounded-xl bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] text-xs font-black flex items-center gap-1.5 shadow-2xs transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>Imprimir Folha para a Escola</span>
          </button>
        )}
      </div>

      {/* =========================================================================
          ABA 1: ANAMNESE FAMILIAR (13 PERGUNTAS)
          ========================================================================= */}
      {activeSubTab === "familiar" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header Card */}
          <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE] flex items-center justify-center font-black shrink-0 shadow-2xs">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#0D2329]">
                  Anamnese Inicial com a Família
                </h3>
                <p className="text-xs font-semibold text-[#6B7C83]">
                  As 13 perguntas essenciais para investigação do histórico de desenvolvimento.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-xl bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#DDD6FE] text-xs font-black flex items-center gap-1.5 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar Respostas</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveAssessment}
                  className="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black flex items-center gap-2 shadow-xs transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Salvando..." : "Salvar Anamnese"}</span>
                </button>
              )}
            </div>
          </div>

          {/* As 13 Perguntas */}
          <div className="space-y-4">
            {DEFAULT_ASSESSMENT_QUESTIONS.map((q) => (
              <div key={q.id} className="p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] space-y-2 shadow-xs">
                <label className="text-xs font-black text-[#0D2329] flex items-start gap-2">
                  <span className="w-5 h-5 rounded-lg bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 text-[11px] font-black">
                    {q.num}
                  </span>
                  <span>{q.title}</span>
                </label>

                {isEditing ? (
                  <textarea
                    rows={3}
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder={q.placeholder}
                    className="w-full p-3 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white focus:outline-none focus:border-[#7C3AED] leading-relaxed resize-none"
                  />
                ) : (
                  <p className="text-xs font-semibold text-[#2E4A52] bg-[#F8FAFB] p-3 rounded-xl border border-[#EEF5F6] leading-relaxed italic">
                    "{answers[q.id] || "Não informado."}"
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Bloco de Análise IA */}
          <div ref={aiSectionRef} className="p-6 rounded-3xl bg-gradient-to-br from-[#EDE9FE] to-[#F0FDF4] border-2 border-[#DDD6FE] space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#7C3AED]" />
                <h3 className="text-sm font-black text-[#0D2329]">
                  Supervisão Clínica com IA Gemini
                </h3>
              </div>
              <button
                type="button"
                disabled={aiLoading || isEditing}
                onClick={handleAnalyzeWithAI}
                className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aiLoading ? "Gerando Análise..." : "Analisar Anamnese com IA"}</span>
              </button>
            </div>

            {aiAnalysis ? (
              <div className="p-5 rounded-2xl bg-white border border-[#D8E5E7] space-y-3 leading-relaxed">
                {renderFormattedMarkdown(aiAnalysis)}
              </div>
            ) : (
              <p className="text-xs font-semibold text-[#6B7C83] italic">
                Salve as respostas da anamnese e clique no botão acima para gerar uma síntese clínica completa com hipóteses de desenvolvimento.
              </p>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          ABA 2: ENTREVISTA / VISITA ESCOLAR (MODELO OFICIAL PRISCILA CARBONE)
          ========================================================================= */}
      {activeSubTab === "escolar" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header do Questionário Escolar */}
          <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD] flex items-center justify-center font-black shrink-0 shadow-2xs">
                <School className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#0D2329]">
                  Questionário de Visita Psicopedagógica no Âmbito Escolar
                </h3>
                <p className="text-xs font-semibold text-[#6B7C83]">
                  Modelo Oficial do Espaço Multidisciplinar Aprender Ensinando (Priscila Carbone CBO 2394-25).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isEditingSchool ? (
                <button
                  type="button"
                  onClick={() => setIsEditingSchool(true)}
                  className="px-4 py-2 rounded-xl bg-[#E0F2FE] text-[#0284C7] hover:bg-[#BAE6FD] text-xs font-black flex items-center gap-1.5 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar Respostas</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={savingSchool}
                  onClick={handleSaveSchoolInterview}
                  className="px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-black flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingSchool ? "Salvando..." : "Salvar Questionário Escolar"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Dados do Observador / Professora */}
          <div className="p-5 rounded-2xl bg-[#F8FAFB] border-2 border-[#D8E5E7] grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-black text-[#0D2329]">Nome do Observador / Professora</label>
              <input
                type="text"
                disabled={!isEditingSchool}
                value={schoolObserver.name}
                onChange={(e) => setSchoolObserver({ ...schoolObserver, name: e.target.value })}
                placeholder="Ex: Profª Ana Maria"
                className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-[#D8E5E7] bg-white disabled:bg-[#EEF5F6]"
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-[#0D2329]">Disciplina / Cargo</label>
              <input
                type="text"
                disabled={!isEditingSchool}
                value={schoolObserver.role}
                onChange={(e) => setSchoolObserver({ ...schoolObserver, role: e.target.value })}
                placeholder="Ex: Professora Regente / Coordenação"
                className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-[#D8E5E7] bg-white disabled:bg-[#EEF5F6]"
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-[#0D2329]">Data da Entrevista / Visita</label>
              <input
                type="date"
                disabled={!isEditingSchool}
                value={schoolObserver.date}
                onChange={(e) => setSchoolObserver({ ...schoolObserver, date: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-[#D8E5E7] bg-white disabled:bg-[#EEF5F6]"
              />
            </div>
          </div>

          {/* As 11 Perguntas da Priscila */}
          <div className="space-y-4">
            {DEFAULT_SCHOOL_QUESTIONS.map((q) => (
              <div key={q.id} className="p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] space-y-2 shadow-xs">
                <label className="text-xs font-black text-[#0D2329] flex items-start gap-2">
                  <span className="w-5 h-5 rounded-lg bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0 text-[11px] font-black">
                    {q.num}
                  </span>
                  <span>{q.title}</span>
                </label>

                {isEditingSchool ? (
                  <textarea
                    rows={2}
                    value={schoolAnswers[q.id] || ""}
                    onChange={(e) => setSchoolAnswers({ ...schoolAnswers, [q.id]: e.target.value })}
                    placeholder={q.placeholder}
                    className="w-full p-3 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white focus:outline-none focus:border-[#0284C7] leading-relaxed resize-none"
                  />
                ) : (
                  <p className="text-xs font-semibold text-[#2E4A52] bg-[#F8FAFB] p-3 rounded-xl border border-[#EEF5F6] leading-relaxed italic">
                    "{schoolAnswers[q.id] || "Não informado pela escola."}"
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Checklist dos 12 Traços Comportamentais (Página 3 da Priscila) */}
          <div className="p-6 rounded-2xl bg-white border-2 border-[#D8E5E7] space-y-4 shadow-xs">
            <h4 className="text-xs font-black uppercase text-[#0284C7] tracking-wider flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#0284C7]" />
              <span>Em qual ou quais dessas características o aluno se encaixa? (Checklist Oficial)</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {[
                { key: "agressivo", label: "Agressivo" },
                { key: "passivo", label: "Passivo" },
                { key: "dependente", label: "Dependente" },
                { key: "medroso", label: "Medroso" },
                { key: "retraido", label: "Retraído" },
                { key: "melancolico", label: "Melancólico" },
                { key: "calmo", label: "Calmo" },
                { key: "desligado", label: "Desligado" },
                { key: "sem_limites", label: "Sem limites" },
                { key: "agitado", label: "Agitado" },
                { key: "depressivo", label: "Depressivo" },
                { key: "ressentido", label: "Ressentido" },
              ].map((item) => (
                <label
                  key={item.key}
                  className={`p-3 rounded-xl border-2 flex items-center gap-2.5 transition-all select-none ${
                    isEditingSchool ? "cursor-pointer" : "cursor-default"
                  } ${
                    schoolTraits[item.key]
                      ? "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD] font-black"
                      : "bg-[#F8FAFB] text-[#6B7C83] border-[#D8E5E7] font-semibold"
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!isEditingSchool}
                    checked={Boolean(schoolTraits[item.key])}
                    onChange={(e) => setSchoolTraits({ ...schoolTraits, [item.key]: e.target.checked })}
                    className="accent-[#0284C7] w-4 h-4"
                  />
                  <span className="text-xs">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Botão de Salvar no Rodapé */}
          {isEditingSchool && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={savingSchool}
                onClick={handleSaveSchoolInterview}
                className="px-6 py-3 rounded-2xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-black flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{savingSchool ? "Salvando..." : "Salvar Questionário Escolar"}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
