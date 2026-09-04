import { useState, useEffect, useMemo } from "react"
import {
  FileText,
  Download,
  Sparkles,
  CheckCircle2,
  Calendar,
  School,
  Brain,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Trash2,
  Clock,
  Target,
  Activity,
  Heart,
  Loader2,
  BookOpen,
  HelpCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { formatDate, calculateDetailedAge } from "@/lib/utils"
import toast from "react-hot-toast"
import type { Child } from "@/types/database"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/Dialog"
import {
  buildInterventionDocxReport,
  downloadInterventionDocxReport,
  type InterventionReportData,
  type PredictorItem,
  type RatingLevel,
} from "@/lib/interventionDocxGenerator"
import { generateInterventionReportAi } from "@/lib/interventionAiService"

interface InterventionReportBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  child: Child
  reportId?: string
  onSaved?: () => void
}

const DEFAULT_PREDICTORS_ALPHABET: PredictorItem[] = [
  { item: "Nomeação", total: 26, hits: 26, rating: "bom" },
  { item: "Reconhecimento", total: 26, hits: 26, rating: "bom" },
  { item: "Sons das letras", total: 26, hits: 26, rating: "bom" },
  { item: "Memória visual", total: 26, hits: 25, rating: "bom" },
]

const DEFAULT_PREDICTORS_PHONOLOGICAL: PredictorItem[] = [
  { item: "Consciência de Palavras", total: 6, hits: 6, rating: "bom" },
  { item: "Consciência de Sílabas", total: 3, hits: 3, rating: "bom" },
  { item: "Síntese silábica", total: 3, hits: 3, rating: "bom" },
  { item: "Análise silábica", total: 3, hits: 3, rating: "bom" },
  { item: "Manipulação silábica", total: 3, hits: 3, rating: "bom" },
  { item: "Aliteração", total: 6, hits: 5, rating: "bom" },
  { item: "Rima", total: 6, hits: 4, rating: "bom" },
  { item: "Síntese Fonêmica", total: 3, hits: 3, rating: "bom" },
  { item: "Análise fonêmica", total: 3, hits: 2, rating: "bom" },
]

const DEFAULT_PREDICTORS_READING: PredictorItem[] = [
  {
    item: "Leitura de palavras",
    total: 24,
    hits: 14,
    rating: "regular",
    note: "Ainda não lê palavras com sílabas complexas onde ainda não lhe foi apresentado.",
  },
  { item: "Leitura de pseudopalavras", total: 24, hits: 20, rating: "bom" },
  { item: "Leitura e compreensão de frases", total: 3, hits: 3, rating: "bom" },
]

const DEFAULT_PREDICTORS_WRITING: PredictorItem[] = [
  { item: "Escrita de palavras ouvidas", total: 15, hits: 9, rating: "bom" },
  { item: "Escrita de palavras copiadas", total: 15, hits: 15, rating: "bom" },
]

export function InterventionReportBuilderModal({
  isOpen,
  onClose,
  child,
  reportId,
  onSaved,
}: InterventionReportBuilderModalProps) {
  const { professional, user } = useAuthStore()
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1)
  const [loading, setLoading] = useState(false)
  const [generatingDocx, setGeneratingDocx] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [goalType, setGoalType] = useState<"alta" | "continuidade">("alta")
  const [currentReportId, setCurrentReportId] = useState<string | undefined>(reportId)
  const [interventionSessions, setInterventionSessions] = useState<any[]>([])
  const [interventionGoals, setInterventionGoals] = useState<any[]>([])

  // Step 1: Período & Identificação
  const todayISO = new Date().toISOString().split("T")[0]
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const [startDate, setStartDate] = useState(sixMonthsAgo)
  const [endDate, setEndDate] = useState(todayISO)
  const [sessionCount, setSessionCount] = useState<number>(0)
  const [motherName, setMotherName] = useState("")
  const [fatherName, setFatherName] = useState("")
  const [schoolName, setSchoolName] = useState(child.school || "")
  const [previousDiagnosis, setPreviousDiagnosis] = useState<string>(
    (child as any).diagnosis || child.main_complaint || "TRANSTORNO DE ATENÇÃO E HIPERATIVIDADE (TDAH)"
  )
  const [reassessmentReason, setReassessmentReason] = useState(
    "O presente relatório tem como objetivo apresentar dados atualizados após o período de intervenção, bem como verificar a possibilidade de alta da intervenção, considerando os avanços alcançados e o sucesso obtido no programa de intervenção personalizado."
  )

  // Step 2: Instrumentos & Testes
  const [usedInstruments, setUsedInstruments] = useState<string[]>([
    "PROVA DE ARITMÉTICA (Seabra, Montiel e Capovilla)",
    "TESTE DE DISCRIMINAÇÃO FONOLÓGICA (Seabra e Capovilla)",
    "TESTE INFANTIL DE NOMEAÇÃO - TIN (Seabra, Trevisan e Capovilla)",
    "TESTE DE AUDIBILIZAÇÃO",
    "TESTE DE TRILHAS A/B (Montiel e Seabra)",
    "SPAN DE DÍGITOS (TSD)",
    "PROTOCOLO DE OBSERVAÇÃO PSICOMOTORA – POP TT",
    "OBSERVAÇÕES PSICOPEDAGÓGICA / FAMILIAR / ESCOLAR",
  ])

  const [trilhas, setTrilhas] = useState({
    enabled: true,
    rawA: "24",
    rawB: "3",
    percentilA: "111",
    percentilB: "93",
    classA: "Média",
    classB: "Média",
    observation: "Resultado: Atenção e flexibilidade cognitiva preservados em bom funcionamento.",
  })

  const [spanDigitos, setSpanDigitos] = useState({
    enabled: true,
    directScore: "6",
    directPercentil: "112",
    directClass: "Dentro da média",
    inverseScore: "8",
    inversePercentil: "126",
    inverseClass: "Alta",
    observation:
      "No referido teste, o paciente obteve dentro da média para direta e acima do esperado para indireta (memória auditiva, memória de curto prazo e memória de trabalho).",
  })

  const [tin, setTin] = useState({
    enabled: true,
    score: "60",
    percentil: "112",
    classification: "Média",
    observation: "Resultado: Memória de longo prazo dentro do esperado para idade.",
  })

  const [discriminacao, setDiscriminacao] = useState({
    enabled: true,
    score: "94",
    classification: "Média",
    observation: "Conhecimento fonológico adquirido dentro do esperado para idade.",
  })

  const [audibilizacao, setAudibilizacao] = useState({
    enabled: true,
    part1Score: "23",
    part1Class: "SUPERIOR",
    part2Score: "26",
    part2Class: "MÉDIA SUPERIOR",
    figuresScore: "33",
    figuresClass: "MÉDIA SUPERIOR",
    totalScore: "82",
    totalClass: "MÉDIA SUPERIOR",
    observation:
      "Habilidade de discriminação fonética superior para idade. Memória de frases, dígitos e relatos dentro da média superior.",
  })

  const [popTT, setPopTT] = useState({
    enabled: true,
    cenestesica: "Excelente",
    lateralidade: "Excelente",
    proprioceptiva: "Bom",
    imitacaoGestos: "Excelente",
    tracosAr: "Excelente",
    praxiaGlobal: "Excelente",
    praxiaFina: "Excelente",
    coordenacaoTesoura: "Excelente",
    observation: "Em todos outros quesitos observados se encontra excelente para idade.",
  })

  const [arithmetic, setArithmetic] = useState({
    enabled: true,
    points: "15",
    score: "103",
    classification: "Média",
    observation: "Arthur está dentro do esperado para sua idade e série.",
  })

  // Step 3: O Semáforo de Preditoras de Leitura e Escrita
  const [alphabetList, setAlphabetList] = useState<PredictorItem[]>(DEFAULT_PREDICTORS_ALPHABET)
  const [phonologicalList, setPhonologicalList] = useState<PredictorItem[]>(DEFAULT_PREDICTORS_PHONOLOGICAL)
  const [readingList, setReadingList] = useState<PredictorItem[]>(DEFAULT_PREDICTORS_READING)
  const [writingList, setWritingList] = useState<PredictorItem[]>(DEFAULT_PREDICTORS_WRITING)

  // Step 4: Textos Clínicos
  const [briefHistory, setBriefHistory] = useState(
    `${child.full_name.split(" ")[0]} iniciou seu acompanhamento em nosso espaço inicialmente para reforço escolar devido a dificuldades apresentadas no processo de aprendizagem. Durante o trabalho inicial, identificou-se facilidade em esquecer o conteúdo, baixo controle inibitório e inquietação. Após avaliação multiprofissional com equipe e neuropediatra, fechou-se o diagnóstico clínico e iniciou-se o ciclo de intervenção psicopedagógica personalizada focada nas habilidades faltosas.`
  )
  const [clinicalConclusion, setClinicalConclusion] = useState(
    `Após o período de intervenção focada nas habilidades cognitivas, funções executivas e consolidação da alfabetização, fica evidente o notável progresso do paciente para sua nova fase escolar e familiar, com autonomia e consolidação de repertório.`
  )
  const [recsSchool, setRecsSchool] = useState(
    "Mantê-lo longe de distratores (portas e janelas), permanecer na carteira da frente, valorizá-lo pelo esforço e progresso, e garantir acolhimento para novos desafios."
  )
  const [recsFamily, setRecsFamily] = useState(
    "Manter a rotina estruturada de horários e sono, reforçar estímulos positivos e brincadeiras em família."
  )

  // Carregar dados de responsáveis e sessões realizadas no período
  useEffect(() => {
    async function loadSessionsAndGuardians() {
      if (!child.id) return

      try {
        const { data: gLinks } = await supabase
          .from("guardian_children")
          .select("relationship, guardian:guardians(full_name)")
          .eq("child_id", child.id)

        if (gLinks && gLinks.length > 0) {
          let f = ""
          let m = ""
          gLinks.forEach((item: any) => {
            const g = item.guardian
            if (g?.full_name) {
              const rel = (item.relationship || "").toLowerCase()
              if (rel.includes("pai") || rel === "pai") f = g.full_name
              else if (rel.includes("mãe") || rel.includes("mae") || rel === "mãe" || rel === "mae") m = g.full_name
              else if (!m) m = g.full_name
              else if (!f) f = g.full_name
            }
          })
          if (m) setMotherName(m)
          if (f) setFatherName(f)
        }
      } catch (err) {
        console.error("Erro ao carregar responsáveis:", err)
      }

      try {
        if (startDate && endDate) {
          const { data: sessData, count } = await supabase
            .from("intervention_sessions")
            .select("*, intervention_session_areas(*)", { count: "exact" })
            .eq("child_id", child.id)
            .gte("date", startDate)
            .lte("date", endDate)
            .order("date", { ascending: true })

          setSessionCount(count || 0)
          if (sessData) setInterventionSessions(sessData)
        }

        const { data: goalsData } = await supabase
          .from("intervention_goals")
          .select("*")
          .eq("child_id", child.id)

        if (goalsData) setInterventionGoals(goalsData)
      } catch (err) {
        console.error("Erro ao carregar sessões no período:", err)
      }
    }
    loadSessionsAndGuardians()
  }, [child.id, startDate, endDate])

  // Carregar dados salvos caso esteja editando um relatório existente
  useEffect(() => {
    async function loadReportById() {
      if (!reportId) {
        setCurrentReportId(undefined)
        return
      }
      setCurrentReportId(reportId)
      try {
        const { data: rep } = await supabase
          .from("reports")
          .select("*")
          .eq("id", reportId)
          .single()

        if (rep && rep.content) {
          const c = rep.content as any
          if (c.patient) {
            if (c.patient.previousDiagnosis) setPreviousDiagnosis(c.patient.previousDiagnosis)
            if (c.patient.motherName) setMotherName(c.patient.motherName)
            if (c.patient.fatherName) setFatherName(c.patient.fatherName)
            if (c.patient.schoolName) setSchoolName(c.patient.schoolName)
          }
          if (rep.period_start) setStartDate(rep.period_start)
          if (rep.period_end) setEndDate(rep.period_end)
          if (c.clinical) {
            if (c.clinical.reassessmentReason) setReassessmentReason(c.clinical.reassessmentReason)
            if (c.clinical.briefHistory) setBriefHistory(c.clinical.briefHistory)
            if (c.clinical.clinicalConclusion || c.clinical.conclusion) {
              setClinicalConclusion(c.clinical.clinicalConclusion || c.clinical.conclusion)
            }
            const schoolRecs = c.clinical.recommendationsSchool || c.clinical.schoolRecommendations
            if (schoolRecs) {
              setRecsSchool(Array.isArray(schoolRecs) ? schoolRecs.join("\n") : schoolRecs)
            }
            const familyRecs = c.clinical.recommendationsFamily || c.clinical.familyRecommendations
            if (familyRecs) {
              setRecsFamily(Array.isArray(familyRecs) ? familyRecs.join("\n") : familyRecs)
            }
            if (c.clinical.usedInstruments) setUsedInstruments(c.clinical.usedInstruments)

            // Testes padronizados dentro de clinical
            if (c.clinical.trilhas) setTrilhas((prev) => ({ ...prev, ...c.clinical.trilhas }))
            if (c.clinical.spanDigitos) setSpanDigitos((prev) => ({ ...prev, ...c.clinical.spanDigitos }))
            if (c.clinical.tin) setTin((prev) => ({ ...prev, ...c.clinical.tin }))
            if (c.clinical.phonologicalDiscrimination) {
              setDiscriminacao((prev) => ({ ...prev, ...c.clinical.phonologicalDiscrimination }))
            }
            if (c.clinical.audibilizacao) setAudibilizacao((prev) => ({ ...prev, ...c.clinical.audibilizacao }))
            if (c.clinical.popTT) setPopTT((prev) => ({ ...prev, ...c.clinical.popTT }))
            if (c.clinical.arithmetic) setArithmetic((prev) => ({ ...prev, ...c.clinical.arithmetic }))

            // Preditores de leitura e escrita (Semáforo)
            const preds = c.clinical.readingWritingPredictors || c.predictors
            if (preds) {
              if (preds.alphabet) setAlphabetList(preds.alphabet)
              if (preds.phonologicalAwareness || preds.phonological) {
                setPhonologicalList(preds.phonologicalAwareness || preds.phonological)
              }
              if (preds.reading) setReadingList(preds.reading)
              if (preds.writing) setWritingList(preds.writing)
            }
          }
          if (c.tests) {
            if (c.tests.trilhas) setTrilhas((prev) => ({ ...prev, ...c.tests.trilhas }))
            if (c.tests.spanDigitos) setSpanDigitos((prev) => ({ ...prev, ...c.tests.spanDigitos }))
            if (c.tests.tin) setTin((prev) => ({ ...prev, ...c.tests.tin }))
            if (c.tests.discriminacao) setDiscriminacao((prev) => ({ ...prev, ...c.tests.discriminacao }))
            if (c.tests.audibilizacao) setAudibilizacao((prev) => ({ ...prev, ...c.tests.audibilizacao }))
            if (c.tests.popTT) setPopTT((prev) => ({ ...prev, ...c.tests.popTT }))
            if (c.tests.arithmetic) setArithmetic((prev) => ({ ...prev, ...c.tests.arithmetic }))
          }
          if (c.predictors) {
            if (c.predictors.alphabet) setAlphabetList(c.predictors.alphabet)
            if (c.predictors.phonological) setPhonologicalList(c.predictors.phonological)
            if (c.predictors.reading) setReadingList(c.predictors.reading)
            if (c.predictors.writing) setWritingList(c.predictors.writing)
          }
        }
      } catch (err) {
        console.error("Erro ao carregar relatório:", err)
      }
    }
    loadReportById()
  }, [reportId])

  // Gerar Parecer Clínico com IA Gemini
  async function handleGenerateWithAi() {
    setGeneratingAI(true)
    const toastId = toast.loading("🤖 IA analisando sessões e gerando parecer evolutivo...")

    try {
      // 1. Resumo das metas
      const goalsSummary =
        interventionGoals.length > 0
          ? interventionGoals
              .map(
                (g) =>
                  `• ${g.title} (${g.area || "Geral"}): status ${
                    g.status === "achieved"
                      ? "CONCLUÍDA / ALCANÇADA"
                      : g.status === "in_progress"
                      ? "EM ANDAMENTO"
                      : "PLANEJADA"
                  }`
              )
              .join("\n")
          : "Metas de intervenção voltadas a funções executivas, atenção sustentada, controle inibitório e alfabetização."

      // 2. Resumo das sessões
      const sessionsSummary =
        interventionSessions.length > 0
          ? interventionSessions
              .slice(-12)
              .map((s, idx) => {
                const areas = (s.intervention_session_areas || [])
                  .map((a: any) => `${a.area}: ${a.what_was_worked || ""}`)
                  .filter(Boolean)
                  .join(" | ")
                return `Sessão ${s.session_number || idx + 1} (${s.date}): Comportamento: ${
                  s.behavior || "Colaborativo"
                }. ${areas ? `Atividades: ${areas}.` : ""} ${s.general_notes ? `Notas: ${s.general_notes}` : ""}`
              })
              .join("\n")
          : `Total de ${sessionCount} sessões de intervenção realizadas com foco em estimulação neuropsicopedagógica e jogos estruturados.`

      // 3. Resumo do Semáforo
      const alphabetBom = alphabetList.filter((i) => i.rating === "bom").length
      const alphabetTotal = alphabetList.length
      const phonologicalBom = phonologicalList.filter((i) => i.rating === "bom").length
      const phonologicalTotal = phonologicalList.length
      const readingBom = readingList.filter((i) => i.rating === "bom").length
      const readingTotal = readingList.length
      const writingBom = writingList.filter((i) => i.rating === "bom").length
      const writingTotal = writingList.length

      const semaforoData = {
        alphabetSummary: `${alphabetBom} de ${alphabetTotal} habilidades em nível BOM (Verde)`,
        phonologicalSummary: `${phonologicalBom} de ${phonologicalTotal} habilidades em nível BOM (Verde)`,
        readingSummary: `${readingBom} de ${readingTotal} habilidades em nível BOM (Verde)`,
        writingSummary: `${writingBom} de ${writingTotal} habilidades em nível BOM (Verde)`,
      }

      // 4. Testes Data
      const testsData = {
        trilhas: {
          tempoA: trilhas.rawA ? `${trilhas.rawA} erros/tempo` : undefined,
          escoreA: trilhas.classA || undefined,
          percentilA: trilhas.percentilA || undefined,
          tempoB: trilhas.rawB ? `${trilhas.rawB} erros/tempo` : undefined,
          escoreB: trilhas.classB || undefined,
          percentilB: trilhas.percentilB || undefined,
        },
        spanDigitos: {
          direta: `${spanDigitos.directScore} (${spanDigitos.directClass})`,
          indireta: `${spanDigitos.inverseScore} (${spanDigitos.inverseClass})`,
        },
        tin: {
          acertos: tin.score || undefined,
          tempo: `${tin.percentil} percentil - ${tin.classification}`,
        },
        audibilizacao: {
          escore: audibilizacao.totalScore || undefined,
          classificacao: audibilizacao.totalClass || undefined,
        },
        popTt: {
          escore: popTT.praxiaFina || undefined,
          percentil: popTT.praxiaGlobal || undefined,
          classificacao: popTT.observation || undefined,
        },
        aritmetica: {
          total: arithmetic.points || undefined,
          percentil: arithmetic.score || undefined,
          classificacao: arithmetic.classification || undefined,
        },
      }

      const res = await generateInterventionReportAi({
        childName: child.full_name,
        childAge: calculateDetailedAge(child.birth_date),
        schoolName: schoolName || child.school || undefined,
        grade: child.grade || undefined,
        previousDiagnosis: previousDiagnosis,
        interventionPeriod: periodLabel,
        sessionCount: sessionCount,
        goalType: goalType,
        goalsSummary,
        sessionsSummary,
        semaforoData,
        testsData,
      })

      setBriefHistory(res.briefHistory)
      setClinicalConclusion(res.clinicalConclusion)
      setRecsSchool(res.recsSchool)
      setRecsFamily(res.recsFamily)

      toast.success("✨ Parecer e Conclusão gerados com sucesso pela IA!", { id: toastId })
    } catch (err: any) {
      console.error("Erro na geração com IA:", err)
      toast.error(err?.message || "Erro ao conectar com a IA. Verifique as configurações.", { id: toastId })
    } finally {
      setGeneratingAI(false)
    }
  }

  // Atalho de período formatado para o box
  const periodLabel = useMemo(() => {
    try {
      const [startYear, startMonth] = startDate.split("-")
      const [endYear, endMonth] = endDate.split("-")
      const totalMonths = Math.max(
        1,
        (parseInt(endYear) - parseInt(startYear)) * 12 + (parseInt(endMonth) - parseInt(startMonth))
      )
      return `${String(totalMonths).padStart(2, "0")} MESES DE ${startMonth}/${startYear} A ${endMonth}/${endYear}`
    } catch {
      return "PERÍODO DE INTERVENÇÃO"
    }
  }, [startDate, endDate])

  // Manipulação rápida do Semáforo
  function updateItemRating(
    category: "alphabet" | "phonological" | "reading" | "writing",
    index: number,
    newRating: RatingLevel
  ) {
    if (category === "alphabet") {
      setAlphabetList((prev) => prev.map((it, i) => (i === index ? { ...it, rating: newRating } : it)))
    } else if (category === "phonological") {
      setPhonologicalList((prev) => prev.map((it, i) => (i === index ? { ...it, rating: newRating } : it)))
    } else if (category === "reading") {
      setReadingList((prev) => prev.map((it, i) => (i === index ? { ...it, rating: newRating } : it)))
    } else if (category === "writing") {
      setWritingList((prev) => prev.map((it, i) => (i === index ? { ...it, rating: newRating } : it)))
    }
  }

  function markCategoryAllBom(category: "alphabet" | "phonological" | "reading" | "writing") {
    if (category === "alphabet") {
      setAlphabetList((prev) => prev.map((it) => ({ ...it, rating: "bom" })))
    } else if (category === "phonological") {
      setPhonologicalList((prev) => prev.map((it) => ({ ...it, rating: "bom" })))
    } else if (category === "reading") {
      setReadingList((prev) => prev.map((it) => ({ ...it, rating: "bom" })))
    } else if (category === "writing") {
      setWritingList((prev) => prev.map((it) => ({ ...it, rating: "bom" })))
    }
    toast.success("Todos marcados como BOM nesta seção!")
  }

  // Montar objeto de dados para o gerador DOCX
  const compiledReportData: InterventionReportData = useMemo(() => {
    return {
      patient: {
        fullName: child.full_name,
        birthDate: child.birth_date ? formatDate(child.birth_date) : undefined,
        ageFormatted: calculateDetailedAge(child.birth_date),
        motherName: motherName || undefined,
        fatherName: fatherName || undefined,
        schoolName: schoolName || child.school || undefined,
        grade: child.grade || undefined,
        previousDiagnosis: previousDiagnosis,
        interventionPeriod: periodLabel,
      },
      professional: {
        clinicName: professional?.clinic_name || "ESPAÇO MULTIDISCIPLINAR APRENDER ENSINANDO",
        professionalName: professional?.full_name || "Psicopedagoga",
        cbo: professional?.crp || "2394-25",
        phone: professional?.phone || undefined,
        address: professional?.address || undefined,
        email: professional?.email || user?.email || undefined,
        city: professional?.city || "Votuporanga",
        date: formatDate(new Date(), "dd 'de' MMMM 'de' yyyy"),
      },
      clinical: {
        reassessmentReason,
        briefHistory,
        usedInstruments,
        trilhas: trilhas.enabled ? trilhas : undefined,
        spanDigitos: spanDigitos.enabled ? spanDigitos : undefined,
        tin: tin.enabled ? tin : undefined,
        phonologicalDiscrimination: discriminacao.enabled ? discriminacao : undefined,
        audibilizacao: audibilizacao.enabled ? audibilizacao : undefined,
        popTT: popTT.enabled ? popTT : undefined,
        arithmetic: arithmetic.enabled ? arithmetic : undefined,
        readingWritingPredictors: {
          alphabet: alphabetList,
          phonologicalAwareness: phonologicalList,
          reading: readingList,
          writing: writingList,
        },
        clinicalConclusion,
        recommendationsSchool: recsSchool,
        recommendationsFamily: recsFamily,
      },
    }
  }, [
    child,
    professional,
    user,
    previousDiagnosis,
    periodLabel,
    reassessmentReason,
    briefHistory,
    usedInstruments,
    trilhas,
    spanDigitos,
    tin,
    discriminacao,
    audibilizacao,
    popTT,
    arithmetic,
    alphabetList,
    phonologicalList,
    readingList,
    writingList,
    clinicalConclusion,
    recsSchool,
    recsFamily,
  ])

  // Baixar documento Word diretamente
  async function handleDownloadDocx() {
    setGeneratingDocx(true)
    const toastId = toast.loading("Gerando arquivo Word formatado...")
    try {
      const doc = await buildInterventionDocxReport(compiledReportData)
      const filename = `Reavaliacao_Intervencao_${child.full_name.replace(/\s+/g, "_")}.docx`
      await downloadInterventionDocxReport(doc, filename)
      toast.success("Relatório baixado com sucesso!", { id: toastId })
    } catch (err: any) {
      console.error(err)
      toast.error("Erro ao gerar Word: " + (err?.message || "Tente novamente"), { id: toastId })
    } finally {
      setGeneratingDocx(false)
    }
  }

  // Salvar no prontuário do paciente (tabela reports)
  async function handleSaveReport() {
    setLoading(true)
    const toastId = toast.loading("Salvando relatório no prontuário...")
    try {
      const profId = professional?.id || user?.id
      const title = `Reavaliação Pós-Intervenção (${periodLabel})`

      if (currentReportId) {
        const { error } = await supabase
          .from("reports")
          .update({
            title,
            period_start: startDate,
            period_end: endDate,
            content: compiledReportData as any,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentReportId)

        if (error) throw error
      } else {
        const { data: inserted, error } = await supabase
          .from("reports")
          .insert({
            professional_id: profId,
            child_id: child.id,
            title,
            period_start: startDate,
            period_end: endDate,
            status: "final",
            content: compiledReportData as any,
          })
          .select()
          .single()

        if (error) throw error
        if (inserted) setCurrentReportId(inserted.id)
      }

      toast.success("Relatório salvo no prontuário com sucesso!", { id: toastId })
      if (onSaved) onSaved()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error("Erro ao salvar: " + (err?.message || "Tente novamente"), { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl w-[96vw] lg:w-[1160px] h-[92vh] max-h-[95vh] p-0 flex flex-col overflow-hidden rounded-3xl border-2 border-[#D8E5E7] bg-white shadow-2xl">
        {/* HEADER & ETAPAS */}
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-[#EEF5F6] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] border-2 border-[#DDD6FE] flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-black text-[#0D2329]">
                Relatório de Reavaliação Pós-Intervenção
              </DialogTitle>
              <p className="text-xs font-semibold text-[#6B7C83] mt-0.5">
                Paciente: <strong className="text-[#0D2329]">{child.full_name}</strong> • {calculateDetailedAge(child.birth_date)}
              </p>
            </div>
          </div>

          {/* Stepper Tabs */}
          <div className="flex items-center p-1 bg-[#F7FAFA] rounded-2xl border-2 border-[#D8E5E7] gap-1 self-start sm:self-auto overflow-x-auto">
            {[
              { num: 1, label: "Período" },
              { num: 2, label: "Testes" },
              { num: 3, label: "Semáforo" },
              { num: 4, label: "Parecer & Word" },
            ].map((step) => (
              <button
                key={step.num}
                type="button"
                onClick={() => setActiveStep(step.num as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeStep === step.num
                    ? "bg-[#7C3AED] text-white shadow-xs"
                    : "text-[#6B7C83] hover:bg-white/60"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
                  {step.num}
                </span>
                <span>{step.label}</span>
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* CORPO MODAL (ALTO, COMPRIDO E SEM SCROLLBAR LATERAL) */}
        <DialogBody className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto min-h-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* =========================================================================
              ETAPA 1: PERÍODO & IDENTIFICAÇÃO DO PACIENTE
              ========================================================================= */}
          {activeStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Box de Identificação Visual (Idêntico à Página 1 da Priscila) */}
              <div className="p-5 rounded-3xl border-2 border-[#004080]/30 bg-[#F8FAFC] space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
                  <span className="text-xs font-black text-[#004080] uppercase tracking-wider">
                    Dados Cadastrais do Paciente
                  </span>
                  <span className="text-[11px] font-bold text-[#64748B] bg-white px-2.5 py-0.5 rounded-full border border-[#CBD5E1]">
                    Página 1 do Relatório Oficial
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-[#004080]">PACIENTE: </span>
                    <span className="font-black text-[#0F172A]">{child.full_name}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#004080]">DATA DE NASCIMENTO: </span>
                    <span className="font-semibold text-[#0F172A]">
                      {child.birth_date ? formatDate(child.birth_date) : "—"} (
                      <strong className="text-[#005B94]">{calculateDetailedAge(child.birth_date)}</strong>)
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-[#004080]">FILIAÇÃO: </span>
                    <span className="font-semibold text-[#0F172A]">
                      {[motherName, fatherName].filter(Boolean).join(" / ") || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-[#004080]">ESCOLA / SÉRIE: </span>
                    <span className="font-semibold text-[#0F172A]">
                      {(schoolName || child.school) ? `“${schoolName || child.school}”` : "—"} • {child.grade || "1º ano"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Seletor de Período e Diagnóstico Anterior */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Coluna 1: Período de Intervenção */}
                <div className="p-5 rounded-3xl border-2 border-[#D8E5E7] bg-[#F7FAFA] space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase text-[#0D2329] flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#7C3AED]" />
                      <span>Período da Intervenção *</span>
                    </label>
                    <span className="text-[11px] font-bold text-[#7C3AED] bg-[#EDE9FE] px-2 py-0.5 rounded-full">
                      {sessionCount} {sessionCount === 1 ? "aula realizada" : "aulas realizadas"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#6B7C83]">Data de Início</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#6B7C83]">Data de Término</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                      />
                    </div>
                  </div>

                  {/* Atalhos Rápidos */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] font-bold text-[#6B7C83]">Atalhos:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date()
                        d.setMonth(d.getMonth() - 3)
                        setStartDate(d.toISOString().split("T")[0])
                        setEndDate(new Date().toISOString().split("T")[0])
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white border border-[#D8E5E7] hover:border-[#7C3AED] text-[#0D2329] cursor-pointer"
                    >
                      3 Meses
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date()
                        d.setMonth(d.getMonth() - 6)
                        setStartDate(d.toISOString().split("T")[0])
                        setEndDate(new Date().toISOString().split("T")[0])
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white border border-[#D8E5E7] hover:border-[#7C3AED] text-[#0D2329] cursor-pointer"
                    >
                      6 Meses
                    </button>
                  </div>

                  {/* Frase que vai sair no relatório */}
                  <div className="p-3 rounded-2xl bg-[#EDE9FE] border border-[#DDD6FE] text-xs font-bold text-[#7C3AED] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>No relatório sairá: <strong>{periodLabel}</strong></span>
                  </div>
                </div>

                {/* Coluna 2: Diagnóstico Anterior & Motivo */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#0D2329] flex items-center justify-between">
                      <span>Diagnóstico Anterior (Editável) *</span>
                      <span className="text-[10px] text-[#DC2626] font-bold">Como a criança chegou</span>
                    </label>
                    <input
                      type="text"
                      value={previousDiagnosis}
                      onChange={(e) => setPreviousDiagnosis(e.target.value)}
                      placeholder="Ex: TRANSTORNO DE ATENÇÃO E HIPERATIVIDADE (TDAH)"
                      className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#0D2329]">
                      Motivo da Reavaliação (Editável)
                    </label>
                    <textarea
                      rows={4}
                      value={reassessmentReason}
                      onChange={(e) => setReassessmentReason(e.target.value)}
                      className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-semibold text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              ETAPA 2: INSTRUMENTOS & TESTES APLICADOS
              ========================================================================= */}
          {activeStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-[#EEF5F6] pb-3">
                <div>
                  <h3 className="text-sm font-black text-[#0D2329]">Testes Aplicados na Reavaliação</h3>
                  <p className="text-xs text-[#6B7C83]">
                    Marque os testes utilizados e preencha os escores obtidos pelo paciente.
                  </p>
                </div>
              </div>

              {/* Grid dos Testes da Priscila */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Teste Trilhas */}
                <div className="p-4 rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-[#0D2329] flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={trilhas.enabled}
                        onChange={(e) => setTrilhas({ ...trilhas, enabled: e.target.checked })}
                        className="w-4 h-4 rounded text-[#7C3AED] accent-[#7C3AED]"
                      />
                      <span>1. Teste Trilhas A/B (Atenção / Flexibilidade)</span>
                    </label>
                  </div>
                  {trilhas.enabled && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EEF5F6]">
                      <div>
                        <label className="text-[10px] font-bold text-[#6B7C83]">Parte A (Escore / Percentil)</label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="Bruto"
                            value={trilhas.rawA}
                            onChange={(e) => setTrilhas({ ...trilhas, rawA: e.target.value })}
                            className="w-1/2 p-2 rounded-xl border border-[#D8E5E7] bg-white text-xs font-bold"
                          />
                          <input
                            type="text"
                            placeholder="Perc."
                            value={trilhas.percentilA}
                            onChange={(e) => setTrilhas({ ...trilhas, percentilA: e.target.value })}
                            className="w-1/2 p-2 rounded-xl border border-[#D8E5E7] bg-white text-xs font-bold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#6B7C83]">Parte B (Escore / Percentil)</label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="Bruto"
                            value={trilhas.rawB}
                            onChange={(e) => setTrilhas({ ...trilhas, rawB: e.target.value })}
                            className="w-1/2 p-2 rounded-xl border border-[#D8E5E7] bg-white text-xs font-bold"
                          />
                          <input
                            type="text"
                            placeholder="Perc."
                            value={trilhas.percentilB}
                            onChange={(e) => setTrilhas({ ...trilhas, percentilB: e.target.value })}
                            className="w-1/2 p-2 rounded-xl border border-[#D8E5E7] bg-white text-xs font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Span de Dígitos */}
                <div className="p-4 rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-[#0D2329] flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={spanDigitos.enabled}
                        onChange={(e) => setSpanDigitos({ ...spanDigitos, enabled: e.target.checked })}
                        className="w-4 h-4 rounded text-[#7C3AED] accent-[#7C3AED]"
                      />
                      <span>2. Tarefa Span de Dígitos (Memória de Trabalho)</span>
                    </label>
                  </div>
                  {spanDigitos.enabled && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EEF5F6]">
                      <div>
                        <label className="text-[10px] font-bold text-[#6B7C83]">Ordem Direta (Score / Perc)</label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={spanDigitos.directScore}
                            onChange={(e) => setSpanDigitos({ ...spanDigitos, directScore: e.target.value })}
                            className="w-1/2 p-2 rounded-xl border border-[#D8E5E7] bg-white text-xs font-bold"
                          />
                          <input
                            type="text"
                            value={spanDigitos.directPercentil}
                            onChange={(e) => setSpanDigitos({ ...spanDigitos, directPercentil: e.target.value })}
                            className="w-1/2 p-2 rounded-xl border border-[#D8E5E7] bg-white text-xs font-bold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#6B7C83]">Ordem Indireta (Score / Perc)</label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={spanDigitos.inverseScore}
                            onChange={(e) => setSpanDigitos({ ...spanDigitos, inverseScore: e.target.value })}
                            className="w-1/2 p-2 rounded-xl border border-[#D8E5E7] bg-white text-xs font-bold"
                          />
                          <input
                            type="text"
                            value={spanDigitos.inversePercentil}
                            onChange={(e) => setSpanDigitos({ ...spanDigitos, inversePercentil: e.target.value })}
                            className="w-1/2 p-2 rounded-xl border border-[#D8E5E7] bg-white text-xs font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. TIN Nomeação & Discriminação Fonológica */}
                <div className="p-4 rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-[#0D2329] flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tin.enabled}
                        onChange={(e) => setTin({ ...tin, enabled: e.target.checked })}
                        className="w-4 h-4 rounded text-[#7C3AED] accent-[#7C3AED]"
                      />
                      <span>3. Teste Infantil de Nomeação (TIN)</span>
                    </label>
                  </div>
                  {tin.enabled && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EEF5F6]">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#6B7C83]">Pontos / 60</label>
                        <input
                          type="text"
                          value={tin.score}
                          onChange={(e) => setTin({ ...tin, score: e.target.value })}
                          className="w-full p-2 rounded-xl border border-[#D8E5E7] bg-white text-xs font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#6B7C83]">Classificação</label>
                        <input
                          type="text"
                          value={tin.classification}
                          onChange={(e) => setTin({ ...tin, classification: e.target.value })}
                          className="w-full p-2 rounded-xl border border-[#D8E5E7] bg-white text-xs font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Prova de Aritmética */}
                <div className="p-4 rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-[#0D2329] flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={arithmetic.enabled}
                        onChange={(e) => setArithmetic({ ...arithmetic, enabled: e.target.checked })}
                        className="w-4 h-4 rounded text-[#7C3AED] accent-[#7C3AED]"
                      />
                      <span>4. Prova de Aritmética (Capovilla / Seabra)</span>
                    </label>
                  </div>
                  {arithmetic.enabled && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EEF5F6]">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#6B7C83]">Pontos / Escore</label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="Pontos"
                            value={arithmetic.points}
                            onChange={(e) => setArithmetic({ ...arithmetic, points: e.target.value })}
                            className="w-1/2 p-2 rounded-xl border border-[#D8E5E7] bg-white text-xs font-bold"
                          />
                          <input
                            type="text"
                            placeholder="Score"
                            value={arithmetic.score}
                            onChange={(e) => setArithmetic({ ...arithmetic, score: e.target.value })}
                            className="w-1/2 p-2 rounded-xl border border-[#D8E5E7] bg-white text-xs font-bold"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#6B7C83]">Classificação</label>
                        <input
                          type="text"
                          value={arithmetic.classification}
                          onChange={(e) => setArithmetic({ ...arithmetic, classification: e.target.value })}
                          className="w-full p-2 rounded-xl border border-[#D8E5E7] bg-white text-xs font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              ETAPA 3: O SEMÁFORO DE LEITURA & ESCRITA (MARCA DA PRISCILA!)
              ========================================================================= */}
          {activeStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF5F6] pb-3">
                <div>
                  <h3 className="text-sm font-black text-[#0D2329] flex items-center gap-2">
                    <span>Tabela Semáforo de Preditoras de Leitura e Escrita</span>
                    <span className="text-xs font-bold text-[#10B981] bg-[#DCFCE7] px-2.5 py-0.5 rounded-full border border-[#BBF7D0]">
                      Visual & Intuitivo
                    </span>
                  </h3>
                  <p className="text-xs text-[#6B7C83]">
                    Selecione o nível de cada habilidade: 🟢 BOM | 🟡 REGULAR | 🔴 ABAIXO.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      markCategoryAllBom("alphabet")
                      markCategoryAllBom("phonological")
                      markCategoryAllBom("reading")
                      markCategoryAllBom("writing")
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#15803D] font-black text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Marcar Todos como BOM</span>
                  </button>
                </div>
              </div>

              {/* Blocos do Semáforo */}
              <div className="space-y-5">
                {/* 1. Conhecimento do Alfabeto */}
                <div className="p-4 rounded-2xl border-2 border-[#D8E5E7] bg-white space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#0D2329] uppercase tracking-wider">
                      1. Conhecimento do Alfabeto
                    </span>
                    <button
                      type="button"
                      onClick={() => markCategoryAllBom("alphabet")}
                      className="text-[10px] font-bold text-[#10B981] hover:underline cursor-pointer"
                    >
                      Todos BOM
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {alphabetList.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl border border-[#EEF5F6] bg-[#F8FAFB] flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#0D2329]">{item.item}</span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateItemRating("alphabet", idx, "abaixo")}
                            className={`w-7 h-7 rounded-lg text-xs font-black cursor-pointer transition-all ${
                              item.rating === "abaixo"
                                ? "bg-[#EF4444] text-white shadow-xs scale-105"
                                : "bg-white text-[#94A3B8] border border-[#CBD5E1]"
                            }`}
                          >
                            🔴
                          </button>
                          <button
                            type="button"
                            onClick={() => updateItemRating("alphabet", idx, "regular")}
                            className={`w-7 h-7 rounded-lg text-xs font-black cursor-pointer transition-all ${
                              item.rating === "regular"
                                ? "bg-[#F59E0B] text-white shadow-xs scale-105"
                                : "bg-white text-[#94A3B8] border border-[#CBD5E1]"
                            }`}
                          >
                            🟡
                          </button>
                          <button
                            type="button"
                            onClick={() => updateItemRating("alphabet", idx, "bom")}
                            className={`w-7 h-7 rounded-lg text-xs font-black cursor-pointer transition-all ${
                              item.rating === "bom"
                                ? "bg-[#10B981] text-white shadow-xs scale-105"
                                : "bg-white text-[#94A3B8] border border-[#CBD5E1]"
                            }`}
                          >
                            🟢
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Consciência Fonológica */}
                <div className="p-4 rounded-2xl border-2 border-[#D8E5E7] bg-white space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#0D2329] uppercase tracking-wider">
                      2. Consciência Fonológica
                    </span>
                    <button
                      type="button"
                      onClick={() => markCategoryAllBom("phonological")}
                      className="text-[10px] font-bold text-[#10B981] hover:underline cursor-pointer"
                    >
                      Todos BOM
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {phonologicalList.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl border border-[#EEF5F6] bg-[#F8FAFB] flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#0D2329] truncate">{item.item}</span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateItemRating("phonological", idx, "abaixo")}
                            className={`w-6 h-6 rounded-lg text-xs font-black cursor-pointer transition-all ${
                              item.rating === "abaixo"
                                ? "bg-[#EF4444] text-white scale-105"
                                : "bg-white text-[#94A3B8] border border-[#CBD5E1]"
                            }`}
                          >
                            🔴
                          </button>
                          <button
                            type="button"
                            onClick={() => updateItemRating("phonological", idx, "regular")}
                            className={`w-6 h-6 rounded-lg text-xs font-black cursor-pointer transition-all ${
                              item.rating === "regular"
                                ? "bg-[#F59E0B] text-white scale-105"
                                : "bg-white text-[#94A3B8] border border-[#CBD5E1]"
                            }`}
                          >
                            🟡
                          </button>
                          <button
                            type="button"
                            onClick={() => updateItemRating("phonological", idx, "bom")}
                            className={`w-6 h-6 rounded-lg text-xs font-black cursor-pointer transition-all ${
                              item.rating === "bom"
                                ? "bg-[#10B981] text-white scale-105"
                                : "bg-white text-[#94A3B8] border border-[#CBD5E1]"
                            }`}
                          >
                            🟢
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Leitura e Escrita */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border-2 border-[#D8E5E7] bg-white space-y-3 shadow-2xs">
                    <span className="text-xs font-black text-[#0D2329] uppercase tracking-wider">
                      3. Habilidades de Leitura
                    </span>
                    <div className="space-y-2">
                      {readingList.map((item, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl border border-[#EEF5F6] bg-[#F8FAFB] flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#0D2329]">{item.item}</span>
                            <div className="flex gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => updateItemRating("reading", idx, "abaixo")}
                                className={`w-6 h-6 rounded-lg text-xs font-black cursor-pointer ${
                                  item.rating === "abaixo" ? "bg-[#EF4444] text-white" : "bg-white text-[#94A3B8] border"
                                }`}
                              >
                                🔴
                              </button>
                              <button
                                type="button"
                                onClick={() => updateItemRating("reading", idx, "regular")}
                                className={`w-6 h-6 rounded-lg text-xs font-black cursor-pointer ${
                                  item.rating === "regular" ? "bg-[#F59E0B] text-white" : "bg-white text-[#94A3B8] border"
                                }`}
                              >
                                🟡
                              </button>
                              <button
                                type="button"
                                onClick={() => updateItemRating("reading", idx, "bom")}
                                className={`w-6 h-6 rounded-lg text-xs font-black cursor-pointer ${
                                  item.rating === "bom" ? "bg-[#10B981] text-white" : "bg-white text-[#94A3B8] border"
                                }`}
                              >
                                🟢
                              </button>
                            </div>
                          </div>
                          {item.note && (
                            <p className="text-[10px] text-[#B45309] font-medium italic">Obs: {item.note}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border-2 border-[#D8E5E7] bg-white space-y-3 shadow-2xs">
                    <span className="text-xs font-black text-[#0D2329] uppercase tracking-wider">
                      4. Habilidades de Escrita
                    </span>
                    <div className="space-y-2">
                      {writingList.map((item, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl border border-[#EEF5F6] bg-[#F8FAFB] flex items-center justify-between">
                          <span className="text-xs font-bold text-[#0D2329]">{item.item}</span>
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateItemRating("writing", idx, "abaixo")}
                              className={`w-6 h-6 rounded-lg text-xs font-black cursor-pointer ${
                                item.rating === "abaixo" ? "bg-[#EF4444] text-white" : "bg-white text-[#94A3B8] border"
                              }`}
                            >
                              🔴
                            </button>
                            <button
                              type="button"
                              onClick={() => updateItemRating("writing", idx, "regular")}
                              className={`w-6 h-6 rounded-lg text-xs font-black cursor-pointer ${
                                item.rating === "regular" ? "bg-[#F59E0B] text-white" : "bg-white text-[#94A3B8] border"
                              }`}
                            >
                              🟡
                            </button>
                            <button
                              type="button"
                              onClick={() => updateItemRating("writing", idx, "bom")}
                              className={`w-6 h-6 rounded-lg text-xs font-black cursor-pointer ${
                                item.rating === "bom" ? "bg-[#10B981] text-white" : "bg-white text-[#94A3B8] border"
                              }`}
                            >
                              🟢
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              ETAPA 4: PARECER CLÍNICO, RECOMENDAÇÕES & DOWNLOAD WORD
              ========================================================================= */}
          {activeStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* ASSISTENTE CLÍNICO DE IA GEMINI */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-[#FAF5FF] via-[#F3E8FF] to-[#EDE9FE] border-2 border-[#DDD6FE] shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#9333EA] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-black text-[#581C87]">
                          Assistente Clínico IA (Gemini)
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#7C3AED] text-white text-[10px] font-black uppercase tracking-wider">
                          Auto-Análise das Sessões
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#6B7280] leading-relaxed">
                        A IA analisa as sessões de intervenção reais ({sessionCount} registradas), as metas trabalhadas e o Semáforo de Desempenho para redigir o parecer completo com linguagem humanizada.
                      </p>
                    </div>
                  </div>

                  {/* Botão de Ação */}
                  <button
                    type="button"
                    disabled={generatingAI}
                    onClick={handleGenerateWithAi}
                    className="h-11 px-5 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white font-black text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {generatingAI ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#FDE68A]" />
                        <span>Redigindo Parecer com IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-[#FDE68A]" />
                        <span>✨ Redigir Parecer com IA</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Seletor de Parecer Final: Alta vs Continuidade */}
                <div className="pt-3 border-t border-[#E9D5FF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-[#581C87] uppercase tracking-wider">
                      Parecer e Encaminhamento da Reavaliação:
                    </span>
                    <p className="text-[11px] text-[#6B7280] font-medium">
                      Defina o direcionamento clínico desejado para o fechamento do relatório:
                    </p>
                  </div>

                  <div className="inline-flex rounded-2xl p-1 bg-white border-2 border-[#DDD6FE] shadow-2xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setGoalType("alta")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        goalType === "alta"
                          ? "bg-[#10B981] text-white shadow-xs"
                          : "text-[#6B7280] hover:text-[#0D2329]"
                      }`}
                    >
                      <span>🟢 Indicar Alta da Intervenção</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoalType("continuidade")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        goalType === "continuidade"
                          ? "bg-[#0284C7] text-white shadow-xs"
                          : "text-[#6B7280] hover:text-[#0D2329]"
                      }`}
                    >
                      <span>🔵 Indicar Continuidade</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Histórico Breve */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0D2329]">
                    1. Histórico Breve / Antecedentes
                  </label>
                  <textarea
                    rows={3}
                    value={briefHistory}
                    onChange={(e) => setBriefHistory(e.target.value)}
                    className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-semibold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                {/* Conclusão Clínica */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0D2329]">
                    2. Conclusão Clínica Atualizada e Fechamento do Quadro
                  </label>
                  <textarea
                    rows={3}
                    value={clinicalConclusion}
                    onChange={(e) => setClinicalConclusion(e.target.value)}
                    className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-semibold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                {/* Recomendações Escola & Família */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#0D2329] flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-[#005B94]" />
                      <span>3. Recomendações para a Escola</span>
                    </label>
                    <textarea
                      rows={3}
                      value={recsSchool}
                      onChange={(e) => setRecsSchool(e.target.value)}
                      className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-semibold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#0D2329] flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-[#DC2626]" />
                      <span>4. Recomendações para a Família</span>
                    </label>
                    <textarea
                      rows={3}
                      value={recsFamily}
                      onChange={(e) => setRecsFamily(e.target.value)}
                      className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-semibold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogBody>

        {/* RODAPÉ COM NAVEGAÇÃO & AÇÃO DE DOWNLOAD */}
        <DialogFooter className="p-4 sm:p-5 bg-[#F8FAFB] border-t-2 border-[#EEF5F6] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 z-10">
          <div className="flex items-center gap-2">
            {activeStep > 1 && (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => (prev - 1) as any)}
                className="h-10 px-4 rounded-2xl border-2 border-[#D8E5E7] hover:border-[#7C3AED] bg-white text-xs font-black text-[#0D2329] flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
            )}
            <span className="text-xs font-bold text-[#6B7C83]">
              Etapa {activeStep} de 4
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-2xl border-2 border-[#D8E5E7] hover:bg-white text-xs font-bold text-[#6B7C83] transition-all cursor-pointer"
            >
              Cancelar
            </button>

            {activeStep < 4 ? (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => (prev + 1) as any)}
                className="h-10 px-6 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <span>Avançar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSaveReport}
                  className="h-10 px-5 rounded-2xl bg-white border-2 border-[#7C3AED] text-[#7C3AED] hover:bg-[#F5F3FF] font-black text-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Salvar no Prontuário</span>
                </button>

                <button
                  type="button"
                  disabled={generatingDocx}
                  onClick={handleDownloadDocx}
                  className="h-10 px-6 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-black text-xs flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  {generatingDocx ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 stroke-[2.5]" />}
                  <span>Baixar em Word (.docx)</span>
                </button>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
