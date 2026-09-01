import { useState, useEffect, useMemo } from "react"
import {
  FileText,
  Download,
  Sparkles,
  CheckCircle2,
  Calendar,
  Building2,
  User,
  GraduationCap,
  ListChecks,
  School,
  Brain,
  Stethoscope,
  Lightbulb,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Trash2,
  HelpCircle,
  Copy,
  Clock,
  Target,
  Activity,
  Heart,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { formatDate, calculateDetailedAge } from "@/lib/utils"
import toast from "react-hot-toast"
import type { Child, Professional, Guardian } from "@/types/database"
import {
  buildClinicalDocxReport,
  downloadDocxReport,
  type CompleteReportData,
  type ReportTestResult,
  type ReportAnamneseData,
} from "@/lib/docxReportGenerator"
import {
  getCustomFamilyQuestions,
  getCustomSchoolQuestions,
  type InterviewQuestionItem,
} from "@/lib/customInterviewService"
import { generateClinicalReportAI } from "@/lib/geminiAnalysis"

interface ClinicalReportBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  child: Child
  reportId?: string
  onSaved?: () => void
}

const DEFAULT_INSTRUMENT_CATALOG = [
  "DSM-5-TR MANUAL DE DIAGNÓSTICOS E ESTATÍSTICOS DE TRANSTORNOS MENTAIS",
  "ANAMNESE",
  "ENTREVISTA ESCOLAR",
  "SNAP-IV (PAIS E PROFESSORES)",
  "ESCALA CONNERS (PAIS E PROFESSORES)",
  "ESCALA AVALIAÇÃO TDAH- ETDAH – PAIS",
  "ESCALA AVALIAÇÃO TDAH- ETDAH – CRIANÇA",
  "TESTE AUDIBILIZAÇÃO",
  "TAREFA BLOCO CUBO DE CORSI",
  "TAREFA SPAN DE DIGITOS",
  "TESTE TRILHAS PRÉ ESCOLARES A-B",
  "TESTE DISCRIMINAÇÃO FONOLÓGICA",
  "TESTE DE ATENÇÃO POR CANCELAMENTO TAC",
  "INSTRUMENTO DE AVALIAÇÃO DE REPERTÓRIO BÁSICO PARA A ALFABETIZAÇÃO IAR",
  "TIN TESTE DE NOMEAÇÃO (VERSÃO REDUZIDA)",
  "PROTOCOLO DE OBSERVAÇÃO PSICOMOTORA (POP-TT)",
  "QUESTIONÁRIO PARA TRIAGEM DE DISTÚRBIO DO PROCESSAMENTO AUDITIVO CENTRAL (DPAC)",
  "ESCALA DE AUTISMO VERSÃO INFANTIL 04 A 11 ANOS (AQ-10)",
  "EOCA - ENTREVISTA OPERATIVA CENTRADA NA APRENDIZAGEM",
  "PROVAS OPERATÓRIAS DE JEAN PIAGET",
  "TDE-II - TESTE DE DESEMPENHO ESCOLAR",
]

const DEFAULT_DSM5_CRITERIA = [
  "Frequentemente comete erros por descuido ou apresenta dificuldade em manter a atenção aos detalhes;",
  "Frequentemente demonstra dificuldade para manter a atenção durante atividades e tarefas;",
  "Frequentemente parece não escutar quando alguém lhe dirige a palavra diretamente;",
  "Apresenta dificuldade em seguir instruções até o final, deixando de concluir atividades escolares e tarefas domésticas;",
  "Frequentemente apresenta dificuldades para organizar atividades, materiais e tarefas;",
  "Frequentemente evita, demonstra resistência ou apresenta pouco interesse em atividades que exigem esforço mental prolongado.",
]

const DEFAULT_REFERRALS = [
  "Avaliação com Neuropediatra / Psiquiatra Infantil",
  "Avaliação do Processamento Auditivo Central (PAC) com Fonoaudiólogo",
  "Continuidade da Intervenção Psicopedagógica Clínica",
  "Orientação sistemática à família e à equipe pedagógica escolar",
  "Suporte de rotina, organização e adaptações curriculares",
]

const DEFAULT_FAMILY_RECS = [
  "Diminuir tempo de telas e eletrônicos (celular, tablet e TV).",
  "Rotina e Previsibilidade: Manter horários fixos e claros para tarefas, sono e alimentação.",
  "Comunicação Específica: Dar comandos curtos, claros e com contato visual. Pedir para a criança repetir.",
  "Reforço Positivo: Elogiar o esforço e as pequenas conquistas mais do que o resultado final.",
  "Pausas de Movimento: Permitir momentos de pausa ativa e descompressão entre tarefas de estudo.",
]

const DEFAULT_SCHOOL_RECS = [
  "Ambiente Estruturado: Sentar o aluno próximo ao professor e longe de distratores (janelas/portas).",
  "Apoio no Movimento: Permitir tarefas com movimento controlado (apagar a lousa, distribuir folhas).",
  "Instruções Divididas: Apresentar tarefas complexas fracionadas em pequenos passos sucessivos.",
  "Sinais Não-Verbais: Combinar um código discreto para lembrá-lo de retomar o foco sem constrangimento.",
  "Mediação e Lúdico: Utilizar recursos visuais e concretos para facilitar a assimilação dos conteúdos.",
]

export function ClinicalReportBuilderModal({
  isOpen,
  onClose,
  child,
  reportId,
  onSaved,
}: ClinicalReportBuilderModalProps) {
  const { professional } = useAuthStore()
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [loading, setLoading] = useState(true)
  const [generatingDocx, setGeneratingDocx] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [savingToDatabase, setSavingToDatabase] = useState(false)
  const [currentReportId, setCurrentReportId] = useState<string | undefined>(reportId)
  const [childSessions, setChildSessions] = useState<any[]>([])
  const [showSessionsDrawer, setShowSessionsDrawer] = useState(false)
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)

  const profId = professional?.id || child.professional_id
  const familyQuestions = useMemo(() => getCustomFamilyQuestions(profId), [profId])
  const schoolQuestions = useMemo(() => getCustomSchoolQuestions(profId), [profId])

  const initialLocalLogo =
    (profId && typeof window !== "undefined" ? localStorage.getItem(`evoluia_clinic_logo_${profId}`) : "") ||
    (typeof window !== "undefined"
      ? localStorage.getItem("evoluia_clinic_logo") || localStorage.getItem("clinic_logo") || ""
      : "")

  const [profInfo, setProfInfo] = useState({
    professionalName: professional?.full_name || "Psicopedagoga Responsável",
    cboOrCrp: professional?.crp || "2394-25",
    clinicName: professional?.clinic_name || "Aprender Ensinando",
    clinicLogoUrl:
      (professional as any)?.clinic_logo_url || initialLocalLogo || "",
    logoUrl: professional?.logo_url || "",
    address: (professional as any)?.address || "",
    phone: professional?.phone || "",
    city: professional?.city || "São Paulo",
    state: professional?.state || "SP",
  })

  // Form State
  const [patientData, setPatientData] = useState({
    fullName: child.full_name,
    birthDate: child.birth_date ? new Date(child.birth_date + "T12:00:00").toLocaleDateString("pt-BR") : "",
    ageFormatted: "",
    fatherName: "",
    motherName: "",
    schoolName: child.school || "",
    grade: child.grade || "",
    mainComplaint: child.main_complaint || "Dificuldades de atenção e aprendizagem escolar.",
    previousDiagnosis: "Nenhum",
  })

  // Dynamic answers state
  const [familyAnswers, setFamilyAnswers] = useState<Record<string, string>>({})
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

  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([])

  const [schoolType, setSchoolType] = useState<string>("Municipal")
  const [anamneseAxes, setAnamneseAxes] = useState<ReportAnamneseData>({
    family: "",
    conceptionAndPregnancy: "",
    breastfeedingAndDiet: "",
    psychomotorAndLanguage: "",
    sleep: "",
    familyHealthHistory: "",
    schooling: "",
    relationshipsAndSociability: "",
  })

  const [clinicalObservation, setClinicalObservation] = useState("")

  const [sessionsCount, setSessionsCount] = useState(0)

  const [synthesis, setSynthesis] = useState("")

  const [diagnosticHypothesis, setDiagnosticHypothesis] = useState("")

  const [dsm5Criteria, setDsm5Criteria] = useState<string[]>([])
  const [referrals, setReferrals] = useState<string[]>([])
  const [recommendationsFamily, setRecommendationsFamily] = useState<string[]>([])
  const [recommendationsSchool, setRecommendationsSchool] = useState<string[]>([])
  const [finalConsiderations, setFinalConsiderations] = useState("")

  // Calculate age and load initial assessments on mount
  useEffect(() => {
    if (isOpen && child.id) {
      loadChildContext()
    }
  }, [isOpen, child.id])

  async function loadChildContext() {
    setLoading(true)
    try {
      // 1. Calculate Age with accurate precision
      const ageStr = calculateDetailedAge(child.birth_date)

      // 2. Fetch Guardians (Pai e Mãe)
      const { data: links } = await supabase
        .from("guardian_children")
        .select("relationship, is_primary, guardian:guardians(*)")
        .eq("child_id", child.id)

      let father = ""
      let mother = ""
      if (links && Array.isArray(links)) {
        links.forEach((l: any) => {
          const g = l.guardian as Guardian | undefined
          if (g) {
            const name = g.full_name?.trim() || ""
            const rel = ((l.relationship || g.notes || "") as string).toLowerCase().trim()

            if (rel.includes("pai") || rel === "pai") {
              father = name
            } else if (rel.includes("mãe") || rel.includes("mae") || rel === "mãe" || rel === "mae") {
              mother = name
            } else {
              // Se não estiver categorizado explicitamente como pai ou mãe
              if (!mother) {
                mother = name
              } else if (!father) {
                father = name
              }
            }
          }
        })
      }

      setPatientData((prev) => ({
        ...prev,
        fullName: child.full_name,
        birthDate: child.birth_date ? new Date(child.birth_date + "T12:00:00").toLocaleDateString("pt-BR") : "",
        ageFormatted: ageStr || "Não informada",
        fatherName: father || prev.fatherName,
        motherName: mother || prev.motherName,
        schoolName: child.school || prev.schoolName,
        grade: child.grade || prev.grade,
        mainComplaint: child.main_complaint || prev.mainComplaint,
      }))

      // Fetch Professional and Clinic Details
      const targetProfId = professional?.id || child.professional_id
      if (targetProfId) {
        const { data: pData } = await supabase
          .from("professionals")
          .select("*")
          .eq("id", targetProfId)
          .maybeSingle()

        const localLogo =
          (typeof window !== "undefined" ? localStorage.getItem(`evoluia_clinic_logo_${targetProfId}`) : "") ||
          (typeof window !== "undefined" ? localStorage.getItem("evoluia_clinic_logo") || localStorage.getItem("clinic_logo") : "") ||
          ""

        if (pData) {
          setProfInfo({
            professionalName: pData.full_name || professional?.full_name || "Psicopedagoga Responsável",
            cboOrCrp: pData.crp || professional?.crp || "2394-25",
            clinicName: pData.clinic_name || professional?.clinic_name || "Aprender Ensinando",
            clinicLogoUrl:
              (pData as any).clinic_logo_url ||
              (professional as any)?.clinic_logo_url ||
              localLogo ||
              "",
            logoUrl: pData.logo_url || professional?.logo_url || "",
            address: (pData as any).address || (professional as any)?.address || "",
            phone: pData.phone || professional?.phone || "",
            city: pData.city || professional?.city || "São Paulo",
            state: pData.state || professional?.state || "SP",
          })
        } else if (localLogo) {
          setProfInfo((prev) => ({ ...prev, clinicLogoUrl: localLogo }))
        }
      }

      // 3. Fetch Initial Assessment Answers (Anamnese)
      const { data: assessments } = await supabase
        .from("initial_assessments")
        .select("*, answers:assessment_answers(*, question:assessment_questions(*))")
        .eq("child_id", child.id)
        .order("created_at", { ascending: false })

      if (assessments && assessments.length > 0) {
        const latest = assessments[0]

        // Parse answers from reason JSON (saved from ChildAssessmentTab)
        let loadedFamilyAnswers: Record<string, string> = {}
        if (latest.reason) {
          try {
            if (latest.reason.startsWith("{")) {
              loadedFamilyAnswers = JSON.parse(latest.reason)
            }
          } catch (e) {}
        }

        const answersList = latest.answers || []
        if (answersList.length > 0) {
          answersList.forEach((a: any) => {
            const qId = a.question_id || a.question?.id || ""
            if (qId && a.answer_text && !loadedFamilyAnswers[qId]) {
              loadedFamilyAnswers[qId] = a.answer_text
            }
          })
        }

        setFamilyAnswers(loadedFamilyAnswers)

        // If q1 exists, set mainComplaint
        if (loadedFamilyAnswers["q1"] && loadedFamilyAnswers["q1"].trim()) {
          setPatientData((prev) => ({ ...prev, mainComplaint: loadedFamilyAnswers["q1"] }))
        }

        // Parse School Interview if saved in notes
        if (latest.notes && latest.notes.includes("__SCHOOL_INTERVIEW__:")) {
          try {
            const raw = latest.notes.split("__SCHOOL_INTERVIEW__:")[1]
            const parsedSchool = JSON.parse(raw)
            if (parsedSchool.answers) setSchoolAnswers(parsedSchool.answers)
            if (parsedSchool.observer) setSchoolObserver(parsedSchool.observer)
            if (parsedSchool.traits) setSchoolTraits(parsedSchool.traits)
          } catch (e) {
            console.error("Error parsing school interview in modal:", e)
          }
        }
      }

      // 4. Fetch Actual Sessions from database
      const { data: sessionList } = await supabase
        .from("sessions")
        .select("*")
        .eq("child_id", child.id)
        .order("session_number", { ascending: true })

      let realCount = 0
      let autoCompiledObservation = ""

      if (sessionList && sessionList.length > 0) {
        setChildSessions(sessionList)
        setExpandedSessionId(sessionList[0].id)
        realCount = sessionList.length

        // Compila anotações clínicas reais das sessões cadastradas
        const sessionNotes = sessionList
          .map((s: any, idx: number) => {
            const dateStr = s.session_date ? new Date(s.session_date + "T12:00:00").toLocaleDateString("pt-BR") : ""
            const parts: string[] = []
            if (s.objective) parts.push(`Objetivo: ${s.objective}`)
            if (s.activities) parts.push(`Trabalhado: ${s.activities}`)
            if (s.notes) parts.push(`Observações: ${s.notes}`)
            if (parts.length === 0) return null
            return `Sessão #${s.session_number || idx + 1}${dateStr ? ` (${dateStr})` : ""}:\n${parts.join("\n")}`
          })
          .filter(Boolean)
          .join("\n\n")

        if (sessionNotes) {
          autoCompiledObservation = sessionNotes
        }
      } else {
        const { count: appCount } = await supabase
          .from("appointments")
          .select("id", { count: "exact" })
          .eq("child_id", child.id)
        if (appCount && appCount > 0) realCount = appCount
      }

      setSessionsCount(realCount)
      if (autoCompiledObservation) {
        setClinicalObservation(autoCompiledObservation)
      }

      // 5. Carrega Relatório e Instrumentos Salvos da tabela 'reports'
      let reportQuery = supabase
        .from("reports")
        .select("*")
        .eq("child_id", child.id)
        .order("created_at", { ascending: false })

      if (reportId || currentReportId) {
        reportQuery = supabase
          .from("reports")
          .select("*")
          .eq("id", reportId || currentReportId)
      }

      const { data: savedReports } = await reportQuery

      if (savedReports && savedReports.length > 0) {
        const rep = savedReports[0]
        setCurrentReportId(rep.id)
        const content = rep.content as any

        if (content) {
          if (content.selectedInstruments && Array.isArray(content.selectedInstruments)) {
            setSelectedInstruments(content.selectedInstruments)
          }
          if (content.patientData) {
            setPatientData((prev) => ({ ...prev, ...content.patientData }))
          }
          if (content.familyAnswers && Object.keys(content.familyAnswers).length > 0) {
            setFamilyAnswers((prev) => ({ ...prev, ...content.familyAnswers }))
          }
          if (content.schoolAnswers && Object.keys(content.schoolAnswers).length > 0) {
            setSchoolAnswers((prev) => ({ ...prev, ...content.schoolAnswers }))
          }
          if (content.schoolObserver) {
            setSchoolObserver((prev) => ({ ...prev, ...content.schoolObserver }))
          }
          if (content.schoolTraits) {
            setSchoolTraits(content.schoolTraits)
          }
          if (content.clinicalObservation) {
            setClinicalObservation(content.clinicalObservation)
          }
          if (content.sessionsCount) {
            setSessionsCount(content.sessionsCount)
          }
          if (content.synthesis) {
            setSynthesis(content.synthesis)
          }
          if (content.diagnosticHypothesis) {
            setDiagnosticHypothesis(content.diagnosticHypothesis)
          }
          if (content.dsm5Criteria && Array.isArray(content.dsm5Criteria)) {
            setDsm5Criteria(content.dsm5Criteria)
          }
          if (content.finalConsiderations) {
            setFinalConsiderations(content.finalConsiderations)
          }
          if (content.schoolType) {
            setSchoolType(content.schoolType)
          }
          if (content.anamneseAxes) {
            setAnamneseAxes((prev) => ({ ...prev, ...content.anamneseAxes }))
          }
          if (content.referrals && Array.isArray(content.referrals)) {
            setReferrals(content.referrals)
          }
          if (content.recommendationsFamily && Array.isArray(content.recommendationsFamily)) {
            setRecommendationsFamily(content.recommendationsFamily)
          }
          if (content.recommendationsSchool && Array.isArray(content.recommendationsSchool)) {
            setRecommendationsSchool(content.recommendationsSchool)
          }
        }
      }
    } catch (err) {
      console.error("Erro ao carregar contexto da criança:", err)
    } finally {
      setLoading(false)
    }
  }

  function toggleInstrument(instName: string) {
    if (selectedInstruments.includes(instName)) {
      setSelectedInstruments(selectedInstruments.filter((i) => i !== instName))
    } else {
      setSelectedInstruments([...selectedInstruments, instName])
    }
  }

  // Gera o docx e faz o download
  
  function getGeneratedTestsResults(): ReportTestResult[] {
    const testsResults: ReportTestResult[] = []

    if (selectedInstruments.includes("SNAP-IV (PAIS E PROFESSORES)")) {
      testsResults.push({
        id: "snap4",
        title: "Questionário SNAP-IV (Pais e Professores)",
        objective:
          "O Questionário SNAP-IV é um instrumento construído a partir dos critérios do DSM-5-TR para rastreio de sintomas de Desatenção, Hiperatividade/Impulsividade e Transtorno Opositor Desafiador.",
        tableHeaders: ["Dimensão Avaliada", "Pontuação Família", "Pontuação Escola", "Interpretação"],
        tableRows: [
          ["Desatenção (Itens 1 a 9)", "—", "—", "A preencher"],
          ["Hiperatividade (Itens 10 a 18)", "—", "—", "A preencher"],
          ["Transtorno Opositor (Itens 19 a 26)", "—", "—", "A preencher"],
        ],
        scoreCutoffText: "Nota de corte: Acima de 6 pontos nas respostas 'bastante/demais' apresenta indicativo clínico.",
        interpretationText: "A preencher pela profissional após apuração dos questionários.",
      })
    }

    if (selectedInstruments.includes("ESCALA CONNERS (PAIS E PROFESSORES)")) {
      testsResults.push({
        id: "conners",
        title: "Escala Conners (Pais e Professores)",
        objective:
          "Avalia os fatores traçados no DSM-5-TR para sintomas de déficit de atenção e hiperatividade em crianças e adolescentes em múltiplos contextos.",
        scoreCutoffText: "Versão Pais: ___ pontos (Corte: 58) | Versão Professores: ___ pontos (Corte: 64)",
        interpretationText: "A preencher pela profissional após aplicação.",
      })
    }

    if (selectedInstruments.includes("ESCALA AVALIAÇÃO TDAH- ETDAH – PAIS")) {
      testsResults.push({
        id: "etdah",
        title: "Escala de Avaliação de TDAH (ETDAH - Pais)",
        objective:
          "Mapeia os fatores de Regulação Emocional (RE), Hiperatividade-Impulsividade (HI), Comportamento Adaptativo (CA) e Atenção (A).",
        tableHeaders: ["Fatores Avaliados", "Pontos Brutos", "Percentil", "Classificação Clínica"],
        tableRows: [
          ["Regulação Emocional (RE)", "—", "—", "A preencher"],
          ["Hiperatividade-Impulsividade (HI)", "—", "—", "A preencher"],
          ["Comportamento Adaptativo (CA)", "—", "—", "A preencher"],
          ["Atenção Sustentada (A)", "—", "—", "A preencher"],
          ["ESCORE GERAL", "—", "—", "A preencher"],
        ],
        interpretationText: "A preencher pela profissional após correção normativa.",
      })
    }

    if (selectedInstruments.includes("TESTE AUDIBILIZAÇÃO")) {
      testsResults.push({
        id: "audibilizacao",
        title: "Teste de Audibilização",
        objective: "Sonda a capacidade de audibilização e memória de trabalho em crianças em fase de alfabetização.",
        tableHeaders: ["Subteste", "Pontuação", "Classificação"],
        tableRows: [
          ["Parte 1: Discriminação Fonética", "—", "A preencher"],
          ["Parte 2: Memória de Frases e Dígitos", "—", "A preencher"],
          ["Memória para Figuras", "—", "A preencher"],
          ["TOTAL GERAL", "—", "A preencher"],
        ],
        interpretationText: "A preencher pela profissional após aplicação do teste.",
      })
    }

    if (selectedInstruments.includes("TAREFA BLOCO CUBO DE CORSI")) {
      testsResults.push({
        id: "corsi",
        title: "Tarefa Blocos / Cubos de Corsi",
        objective: "Avalia a memória visuoespacial de curto prazo (ordem direta) e funções executivas/planejamento (ordem indireta).",
        tableHeaders: ["Modalidade", "Pontuação Padrão", "Classificação"],
        tableRows: [
          ["Ordem Direta (Memória de Curto Prazo)", "—", "A preencher"],
          ["Ordem Indireta (Memória Operacional/Trabalho)", "—", "A preencher"],
        ],
        interpretationText: "A preencher pela profissional após apuração dos blocos.",
      })
    }

    if (selectedInstruments.includes("TESTE TRILHAS PRÉ ESCOLARES A-B")) {
      testsResults.push({
        id: "trilhas",
        title: "Teste de Trilhas Pré-Escolares (Partes A e B)",
        objective: "Mede flexibilidade cognitiva, velocidade de processamento visual e atenção alternada.",
        scoreCutoffText: "Trilha A: ___ segundos | Trilha B: ___ segundos (Percentil: ___)",
        interpretationText: "A preencher pela profissional após cronometragem.",
      })
    }

    if (selectedInstruments.includes("TESTE DE ATENÇÃO POR CANCELAMENTO TAC")) {
      testsResults.push({
        id: "tac",
        title: "Teste de Atenção por Cancelamento (TAC)",
        objective: "Avalia atenção seletiva sustentada e velocidade psicomotora.",
        tableHeaders: ["Parte do Teste", "Acertos", "Erros/Omissões", "Classificação"],
        tableRows: [
          ["Parte 1 (Alvo Único)", "—", "—", "A preencher"],
          ["Parte 2 (Alvo Duplo / Distratores)", "—", "—", "A preencher"],
        ],
        interpretationText: "A preencher pela profissional após correção do TAC.",
      })
    }

    if (selectedInstruments.includes("INSTRUMENTO DE AVALIAÇÃO DE REPERTÓRIO BÁSICO PARA A ALFABETIZAÇÃO IAR")) {
      testsResults.push({
        id: "iar",
        title: "Instrumento de Avaliação de Repertório Básico para Alfabetização (IAR)",
        objective: "Avalia conceitos básicos, esquema corporal, discriminação visual/auditiva e coordenação visomotora.",
        tableHeaders: ["Área", "Desempenho", "Status"],
        tableRows: [
          ["Conceitos Espaciais e Temporais", "—", "A preencher"],
          ["Discriminação Auditiva de Sons", "—", "A preencher"],
          ["Coordenação Visomotora Fina", "—", "A preencher"],
        ],
        interpretationText: "A preencher pela profissional após aplicação.",
      })
    }

    if (selectedInstruments.includes("TAREFA SPAN DE DIGITOS")) {
      testsResults.push({
        id: "span_digitos",
        title: "Tarefa Span de Dígitos (Memória Operacional Auditiva)",
        objective: "Avalia a capacidade de retenção imediata da alça fonológica da memória de trabalho (ordem direta) e a manipulação ativa da memória operacional (ordem inversa).",
        tableHeaders: ["Modalidade", "Span Atingido", "Classificação Clínica"],
        tableRows: [
          ["Ordem Direta (Memória Imediata)", "—", "A preencher"],
          ["Ordem Inversa (Memória Operacional)", "—", "A preencher"],
        ],
        interpretationText: "A preencher pela profissional após aplicação.",
      })
    }

    if (selectedInstruments.includes("PROTOCOLO DE OBSERVAÇÃO PSICOMOTORA (POP-TT)")) {
      testsResults.push({
        id: "pop_tt",
        title: "Protocolo de Observação Psicomotora (POP-TT)",
        objective: "Mapeia os fatores psicomotores essenciais para a aprendizagem escolar: tônus, equilíbrio, lateralidade, noção do corpo, estruturação espaço-temporal, praxia global e praxia fina.",
        tableHeaders: ["Fator Psicomotor", "Pontuação", "Perfil / Desempenho"],
        tableRows: [
          ["Tônus e Equilíbrio", "—", "A preencher"],
          ["Lateralidade e Noção de Corpo", "—", "A preencher"],
          ["Estruturação Espaço-Temporal", "—", "A preencher"],
          ["Praxia Global e Praxia Fina", "—", "A preencher"],
        ],
        interpretationText: "A preencher pela profissional após avaliação psicomotora.",
      })
    }

    if (selectedInstruments.includes("ESCALA AVALIAÇÃO TDAH- ETDAH – CRIANÇA")) {
      testsResults.push({
        id: "etdah_crianca",
        title: "Escala de Avaliação de TDAH (ETDAH - Criança)",
        objective: "Autoavaliação do paciente quanto à sua percepção de atenção, impulsividade e dificuldades nas rotinas diárias e escolares.",
        tableHeaders: ["Fator Avaliado", "Pontos Brutos", "Percentil", "Classificação"],
        tableRows: [
          ["Fator 1: Atenção e Foco", "—", "—", "A preencher"],
          ["Fator 2: Hiperatividade/Impulsividade", "—", "—", "A preencher"],
        ],
        interpretationText: "A preencher pela profissional após autoaplicação.",
      })
    }

    if (selectedInstruments.includes("TESTE DISCRIMINAÇÃO FONOLÓGICA")) {
      testsResults.push({
        id: "discriminacao_fonologica",
        title: "Teste de Discriminação Fonológica",
        objective: "Avalia a habilidade de diferenciar pares mínimos de fonemas da língua portuguesa essenciais para a alfabetização e ortografia.",
        tableHeaders: ["Subteste", "Acertos", "Percentual", "Classificação"],
        tableRows: [
          ["Pares de Palavras Diferentes", "—", "—", "A preencher"],
          ["Pares de Palavras Semelhantes / P-B, T-D, F-V", "—", "—", "A preencher"],
        ],
        interpretationText: "A preencher pela profissional após aplicação.",
      })
    }

    if (selectedInstruments.includes("TIN TESTE DE NOMEAÇÃO (VERSÃO REDUZIDA)")) {
      testsResults.push({
        id: "tin_nomeacao",
        title: "Teste de Nomeação Rápida e Automática (TIN)",
        objective: "Mede o acesso lexical, a velocidade de recuperação de informações fonológicas na memória de longo prazo e a fluência verbal.",
        tableHeaders: ["Prancha / Estímulo", "Tempo de Execução", "Erros", "Classificação"],
        tableRows: [
          ["Nomeação de Figuras / Objetos", "—", "—", "A preencher"],
          ["Nomeação de Letras e Cores", "—", "—", "A preencher"],
        ],
        interpretationText: "A preencher pela profissional após cronometragem.",
      })
    }

    if (selectedInstruments.includes("QUESTIONÁRIO PARA TRIAGEM DE DISTÚRBIO DO PROCESSAMENTO AUDITIVO CENTRAL (DPAC)")) {
      testsResults.push({
        id: "dpac_triagem",
        title: "Questionário de Rastreio de DPAC (Triagem Auditiva Central)",
        objective: "Investiga comportamentos auditivos em ambientes ruidosos, compreensão de ordens verbais sequenciais e localização sonora.",
        tableHeaders: ["Área Comportamental", "Pontuação", "Indicativo"],
        tableRows: [
          ["Audição em Ambiente Ruidoso", "—", "A preencher"],
          ["Compreensão de Mensagens Rápidas", "—", "A preencher"],
          ["Memória Sequencial Auditiva", "—", "A preencher"],
        ],
        interpretationText: "A preencher pela profissional após triagem de DPAC.",
      })
    }

    if (selectedInstruments.includes("ESCALA DE AUTISMO VERSÃO INFANTIL 04 A 11 ANOS (AQ-10)")) {
      testsResults.push({
        id: "aq10",
        title: "Escala de Rastreio do Espectro Autista Infantil (AQ-10)",
        objective: "Rastreio breve de traços e características do espectro autista em crianças de 4 a 11 anos.",
        tableHeaders: ["Instrumento", "Pontuação Obtida", "Ponto de Corte", "Classificação"],
        tableRows: [
          ["AQ-10 Versão Infantil", "—", "06 ou mais pontos", "A preencher"],
        ],
        interpretationText: "A preencher pela profissional após correção do AQ-10.",
      })
    }

    if (selectedInstruments.includes("EOCA - ENTREVISTA OPERATIVA CENTRADA NA APRENDIZAGEM")) {
      testsResults.push({
        id: "eoca",
        title: "EOCA - Entrevista Operativa Centrada na Aprendizagem",
        objective: "Observa a postura da criança frente ao material escolar, modalidade de aprendizagem (assimilativa/acomodativa), vínculo com o aprender e autonomia.",
        tableHeaders: ["Aspecto Observado", "Manifestação Clínica"],
        tableRows: [
          ["Modalidade de Aprendizagem", "A preencher pela profissional"],
          ["Vínculo com o Objeto do Conhecimento", "A preencher pela profissional"],
          ["Organização do Espaço e Materiais", "A preencher pela profissional"],
        ],
        interpretationText: "A preencher pela profissional a partir da observação da sessão da EOCA.",
      })
    }

    if (selectedInstruments.includes("PROVAS OPERATÓRIAS DE JEAN PIAGET")) {
      testsResults.push({
        id: "provas_piaget",
        title: "Provas Operatórias de Jean Piaget (Diagnóstico do Pensamento Lógico)",
        objective: "Avalia a estrutura do pensamento cognitivo, conservação de quantidades (líquida, massa, comprimento), seriação e classificação.",
        tableHeaders: ["Prova Aplicada", "Estágio Operatório Atingido", "Interpretação"],
        tableRows: [
          ["Conservação de Matéria / Massa", "—", "A preencher"],
          ["Conservação de Líquidos", "—", "A preencher"],
          ["Seriação e Classificação", "—", "A preencher"],
        ],
        interpretationText: "A preencher pela profissional após aplicação das provas piagetianas.",
      })
    }

    if (selectedInstruments.includes("TDE-II - TESTE DE DESEMPENHO ESCOLAR")) {
      testsResults.push({
        id: "tde2",
        title: "TDE-II - Teste de Desempenho Escolar (2ª Edição)",
        objective: "Avalia as habilidades acadêmicas fundamentais em três subtestes: Escrita (ortografia), Leitura (decodificação/fluência) e Aritmética (cálculo matemático).",
        tableHeaders: ["Subteste", "Escore Bruto", "Percentil", "Classificação Normativa"],
        tableRows: [
          ["Subteste de Escrita", "—", "—", "A preencher"],
          ["Subteste de Aritmética", "—", "—", "A preencher"],
          ["Subteste de Leitura", "—", "—", "A preencher"],
          ["ESCORE TOTAL TDE-II", "—", "—", "A preencher"],
        ],
        interpretationText: "A preencher pela profissional após aplicação e correção pelas tabelas normativas do TDE-II.",
      })
    }

    return testsResults
  }

  async function handleDownloadWord() {
    setGeneratingDocx(true)
    try {
      const testsResults = getGeneratedTestsResults()
      const completeData: CompleteReportData = {
        patient: {
          fullName: patientData.fullName || child.full_name,
          birthDate: patientData.birthDate,
          ageFormatted: patientData.ageFormatted,
          fatherName: patientData.fatherName,
          motherName: patientData.motherName,
          schoolName: patientData.schoolName ? `${patientData.schoolName} — Escola ${schoolType.toUpperCase()}` : "",
          grade: patientData.grade,
          mainComplaint: patientData.mainComplaint,
          previousDiagnosis: patientData.previousDiagnosis,
        },
        professional: {
          professionalName: profInfo.professionalName,
          cboOrCrp: profInfo.cboOrCrp,
          clinicName: profInfo.clinicName,
          clinicLogoUrl: profInfo.clinicLogoUrl,
          logoUrl: profInfo.logoUrl,
          address: profInfo.address,
          phone: profInfo.phone,
          city: profInfo.city,
          state: profInfo.state,
        },
        clinical: {
          selectedInstruments,
          familyQuestions: familyQuestions.map((q) => ({
            id: q.id,
            num: q.num,
            title: q.title,
            answer: familyAnswers[q.id] || "",
          })),
          schoolQuestions: schoolQuestions.map((q) => ({
            id: q.id,
            num: q.num,
            title: q.title,
            answer: schoolAnswers[q.id] || "",
          })),
          schoolObserver,
          schoolTraits,
          tests: testsResults,
          clinicalObservation,
          sessionsCount,
          synthesis,
          diagnosticHypothesis,
          dsm5Criteria,
          finalConsiderations,
          referrals,
          recommendationsFamily,
          recommendationsSchool,
          anamnese: anamneseAxes,
          dateCityFormatted: (professional?.city || "São Paulo") + " - " + (professional?.state || "SP") + ", " + new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
        },
      }

      const doc = await buildClinicalDocxReport(completeData)
      await downloadDocxReport(doc, "Laudo_Psicopedagogico_" + child.full_name.replace(/\s+/g, "_"))
      toast.success("Documento Word (.docx) gerado com sucesso!", { icon: "📥", duration: 5000 })
    } catch (err: any) {
      console.error("Erro ao gerar DOCX:", err)
      toast.error("Erro ao gerar arquivo Word (.docx).")
    } finally {
      setGeneratingDocx(false)
    }
  }

  // Salva no banco de dados Supabase
  async function handleSaveToSupabase() {
    if (!professional) return
    setSavingToDatabase(true)
    try {
      const contentPayload = {
        patientData,
        schoolType,
        anamneseAxes,
        familyAnswers,
        schoolAnswers,
        schoolObserver,
        schoolTraits,
        selectedInstruments,
        clinicalObservation,
        sessionsCount,
        synthesis,
        diagnosticHypothesis,
        dsm5Criteria,
        finalConsiderations,
        referrals,
        recommendationsFamily,
        recommendationsSchool,
      }

      const activeRepId = currentReportId || reportId

      if (activeRepId) {
        await supabase
          .from("reports")
          .update({
            title: "Laudo de Avaliação Psicopedagógica - " + child.full_name,
            content: contentPayload,
            status: "draft",
            updated_at: new Date().toISOString(),
          })
          .eq("id", activeRepId)
      } else {
        const { data: newRep } = await supabase
          .from("reports")
          .insert({
            professional_id: professional.id,
            child_id: child.id,
            title: "Laudo de Avaliação Psicopedagógica - " + child.full_name,
            content: contentPayload,
            status: "draft",
            type: "clinical_report",
          })
          .select()
          .single()

        if (newRep) {
          setCurrentReportId(newRep.id)
        }
      }

      toast.success("Prontuário e laudo salvos com sucesso!", { icon: "💾" })
    } catch (err: any) {
      console.error(err)
      toast.error("Erro ao salvar no banco de dados.")
    } finally {
      setSavingToDatabase(false)
    }
  }

  // Gera rascunho com IA Gemini Real baseada nos dados do paciente
  async function handleGenerateAISuggestions() {
    setGeneratingAI(true)
    const toastId = toast.loading("Analisando dados clínicos com IA...")
    try {
      const familyPayload = familyQuestions.map((q) => ({
        num: q.num,
        title: q.title,
        answer: familyAnswers[q.id] || "",
      }))

      const schoolPayload = schoolQuestions.map((q) => ({
        num: q.num,
        title: q.title,
        answer: schoolAnswers[q.id] || "",
      }))

      const aiResult = await generateClinicalReportAI({
        childName: child.full_name,
        ageFormatted: patientData.ageFormatted || "Não informada",
        mainComplaint: patientData.mainComplaint || child.main_complaint || "",
        familyAnswers: familyPayload,
        schoolAnswers: schoolPayload,
        schoolTraits,
        sessionsCount,
        selectedInstruments,
        testsResults: [],
        clinicalObservation,
      })

      if (aiResult.anamneseAxes) setAnamneseAxes(aiResult.anamneseAxes)
      if (aiResult.synthesis) setSynthesis(aiResult.synthesis)
      if (aiResult.diagnosticHypothesis) setDiagnosticHypothesis(aiResult.diagnosticHypothesis)
      if (aiResult.dsm5Criteria && aiResult.dsm5Criteria.length > 0) setDsm5Criteria(aiResult.dsm5Criteria)
      if (aiResult.referrals && aiResult.referrals.length > 0) setReferrals(aiResult.referrals)
      if (aiResult.recommendationsFamily && aiResult.recommendationsFamily.length > 0) setRecommendationsFamily(aiResult.recommendationsFamily)
      if (aiResult.recommendationsSchool && aiResult.recommendationsSchool.length > 0) setRecommendationsSchool(aiResult.recommendationsSchool)
      if (aiResult.finalConsiderations) setFinalConsiderations(aiResult.finalConsiderations)
      if (aiResult.clinicalObservation) setClinicalObservation(aiResult.clinicalObservation)

      toast.success("Anamnese e hipótese geradas com sucesso pela IA!", { id: toastId, icon: "✨" })
    } catch (err: any) {
      console.error("Erro ao gerar sugestão com IA:", err)
      toast.error(err?.message || "Não foi possível gerar com IA no momento. Digite manualmente.", { id: toastId })
    } finally {
      setGeneratingAI(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] w-full shadow-sm space-y-0 animate-in fade-in overflow-hidden relative">
      {/* Header do Gerador */}
      <div className="p-5 sm:p-6 border-b border-[#EEF5F6] flex items-center justify-between bg-gradient-to-r from-[#F0FDF4] to-[#EDE9FE] rounded-t-3xl gap-4 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#7C3AED] text-white flex items-center justify-center shadow-md font-bold shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-[#0D2329]">
                Gerador de Laudo / Relatório Clínico (.docx)
              </h2>
              <span className="text-[10px] bg-white/80 border border-[#DDD6FE] text-[#7C3AED] font-black px-2.5 py-0.5 rounded-full">
                Padrão Oficial · CBO 2394-25
              </span>
            </div>
            <p className="text-xs font-semibold text-[#6B7C83]">
              Paciente: <strong>{child.full_name}</strong> · Idade: <strong>{patientData.ageFormatted || "Calculando..."}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 ml-auto sm:ml-0 shrink-0">
          <button
            type="button"
            disabled={generatingDocx}
            onClick={handleDownloadWord}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white text-xs font-black flex items-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{generatingDocx ? "Gerando Word..." : "Baixar Word (.docx)"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
          className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#F8FAFB] text-[#0D2329] border-2 border-[#D8E5E7] hover:border-[#7C3AED] text-xs font-black flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
        >
          <X className="w-4 h-4 text-[#6B7C83]" />
          <span>Voltar aos Relatórios</span>
          </button>
        </div>
      </div>

      {/* Barra de Etapas / Abas do Relatório (Grid 5 Colunas Sem Scroll) */}
      <div className="px-4 sm:px-6 py-2.5 bg-[#F8FAFB] border-b border-[#EEF5F6] grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { step: 1, label: "1. Anamnese (" + familyQuestions.length + " Perguntas)", icon: User },
          { step: 2, label: "2. Entrevista Escolar (" + schoolQuestions.length + " Perguntas)", icon: School },
          { step: 3, label: "3. Instrumentos & Testes", icon: Brain },
          { step: 4, label: "4. Observação & Síntese", icon: Stethoscope },
          { step: 5, label: "5. Hipótese & Encaminhamentos", icon: Lightbulb },
        ].map((item) => {
          const Icon = item.icon
          const isCurrent = activeStep === item.step
          const isDone = activeStep > item.step
          return (
            <button
              key={item.step}
              type="button"
              onClick={() => setActiveStep(item.step as any)}
              className={"px-3 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer text-center " + (
                isCurrent
                  ? "bg-[#7C3AED] text-white shadow-xs"
                  : isDone
                  ? "bg-[#EDE9FE] text-[#6D28D9]"
                  : "bg-white text-[#6B7C83] border border-[#D8E5E7] hover:border-[#7C3AED]"
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{item.label}</span>
              {isDone && <Check className="w-3.5 h-3.5 text-[#10B981] shrink-0" />}
            </button>
          )
        })}
      </div>

      {/* Conteúdo da Etapa Ativa */}
      <div className="p-6 space-y-6 text-xs">
        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-[#6B7C83] animate-pulse">
            Carregando dados do paciente e perguntas da anamnese...
          </div>
        ) : (
          <>
            {/* =========================================================================
                ETAPA 1: IDENTIFICAÇÃO & ANAMNESE FAMILIAR REAL
                ========================================================================= */}
            {activeStep === 1 && (
              <div className="space-y-6 animate-in fade-in">
                <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-[#166534]">
                      ✓ Respostas Puxadas Automaticamente da Entrevista Inicial
                    </p>
                    <p className="text-[11px] font-medium text-[#15803D]">
                      Todas as {familyQuestions.length} perguntas ativas do seu modelo de Anamnese Familiar foram carregadas abaixo. Você pode editar ou complementar qualquer resposta antes de gerar o laudo.
                    </p>
                  </div>
                </div>

                {/* Identificação */}
                <div className="p-5 rounded-2xl border-2 border-[#D8E5E7] space-y-4 bg-[#F8FAFB]">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2">
                    <User className="w-4 h-4 text-[#005B94]" />
                    <span>Identificação do Paciente</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-black text-[#0D2329]">Nome do Paciente</label>
                      <input
                        type="text"
                        value={patientData.fullName}
                        onChange={(e) => setPatientData({ ...patientData, fullName: e.target.value })}
                        className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-[#D8E5E7] bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-[#0D2329]">Data de Nascimento</label>
                      <input
                        type="text"
                        value={patientData.birthDate}
                        onChange={(e) => setPatientData({ ...patientData, birthDate: e.target.value })}
                        className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-[#D8E5E7] bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-[#0D2329]">Idade Calculada</label>
                      <input
                        type="text"
                        value={patientData.ageFormatted}
                        onChange={(e) => setPatientData({ ...patientData, ageFormatted: e.target.value })}
                        className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-[#D8E5E7] bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-[#0D2329]">Nome do Pai</label>
                      <input
                        type="text"
                        value={patientData.fatherName}
                        onChange={(e) => setPatientData({ ...patientData, fatherName: e.target.value })}
                        placeholder="Nome completo do pai"
                        className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-[#D8E5E7] bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-[#0D2329]">Nome da Mãe</label>
                      <input
                        type="text"
                        value={patientData.motherName}
                        onChange={(e) => setPatientData({ ...patientData, motherName: e.target.value })}
                        placeholder="Nome completo da mãe"
                        className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-[#D8E5E7] bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-[#0D2329]">Nome da Escola</label>
                      <input
                        type="text"
                        value={patientData.schoolName}
                        onChange={(e) => setPatientData({ ...patientData, schoolName: e.target.value })}
                        placeholder="Ex: CEM Profº Faustino Pedroso"
                        className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-[#D8E5E7] bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-[#0D2329]">Rede de Ensino / Tipo</label>
                      <select
                        value={schoolType}
                        onChange={(e) => setSchoolType(e.target.value)}
                        className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-[#D8E5E7] bg-white text-[#0D2329]"
                      >
                        <option value="Municipal">Municipal (Escola Municipal)</option>
                        <option value="Estadual">Estadual (Escola Estadual)</option>
                        <option value="Particular">Particular / Privada</option>
                        <option value="Federal">Federal</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-[#0D2329]">Ano / Série</label>
                      <input
                        type="text"
                        value={patientData.grade}
                        onChange={(e) => setPatientData({ ...patientData, grade: e.target.value })}
                        placeholder="Ex: 1º Ano do Ensino Fundamental"
                        className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-[#D8E5E7] bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2 md:col-span-2">
                      <label className="text-[11px] font-black text-[#0D2329]">Queixa Principal</label>
                      <input
                        type="text"
                        value={patientData.mainComplaint}
                        onChange={(e) => setPatientData({ ...patientData, mainComplaint: e.target.value })}
                        placeholder="Queixa ou motivo do encaminhamento"
                        className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-[#D8E5E7] bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* ANAMNESE CLÍNICA OFICIAL (8 EIXOS NOBRES) */}
                <div className="p-5 rounded-2xl border-2 border-[#D8E5E7] space-y-4 bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2">
                        <Heart className="w-4 h-4 text-[#005B94]" />
                        <span>Anamnese Clínica Oficial (8 Eixos Temáticos)</span>
                      </h3>
                      <p className="text-[11px] text-[#6B7C83] mt-0.5">
                        Síntese temática oficial que constará no laudo Word (.docx), redigida automaticamente a partir das respostas da família.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={generatingAI}
                      onClick={handleGenerateAISuggestions}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0 w-fit ${
                        generatingAI
                          ? "bg-[#DDD6FE] text-[#6D28D9] animate-pulse cursor-not-allowed"
                          : "bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#DDD6FE]"
                      }`}
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${generatingAI ? "animate-spin" : ""}`} />
                      <span>{generatingAI ? "✨ Estruturando com IA..." : "Sugerir Eixos com IA"}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-[#0D2329] flex items-center gap-1">
                        <span>👨‍👩‍👧 1. Família & Dinâmica Familiar</span>
                      </label>
                      <textarea
                        rows={3}
                        value={anamneseAxes.family || ""}
                        onChange={(e) => setAnamneseAxes({ ...anamneseAxes, family: e.target.value })}
                        placeholder={generatingAI ? "✨ Estruturando dinâmica familiar com IA..." : "Constituição familiar, rotina e dinâmica relacional..."}
                        className={`w-full p-2.5 text-xs rounded-xl border leading-relaxed transition-all duration-500 ${
                          generatingAI
                            ? "border-2 border-[#7C3AED] bg-[#F5F3FF] shadow-[0_0_20px_rgba(124,58,237,0.25)] animate-pulse ring-2 ring-[#7C3AED]/40 text-[#4C1D95]"
                            : "border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-[#0D2329]"
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-[#0D2329] flex items-center gap-1">
                        <span>🤰 2. Concepção, Gestação e Parto</span>
                      </label>
                      <textarea
                        rows={3}
                        value={anamneseAxes.conceptionAndPregnancy || ""}
                        onChange={(e) => setAnamneseAxes({ ...anamneseAxes, conceptionAndPregnancy: e.target.value })}
                        placeholder={generatingAI ? "✨ Sintetizando histórico gestacional e parto com IA..." : "Histórico gestacional, condições de parto e primeiras semanas..."}
                        className={`w-full p-2.5 text-xs rounded-xl border leading-relaxed transition-all duration-500 ${
                          generatingAI
                            ? "border-2 border-[#7C3AED] bg-[#F5F3FF] shadow-[0_0_20px_rgba(124,58,237,0.25)] animate-pulse ring-2 ring-[#7C3AED]/40 text-[#4C1D95]"
                            : "border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-[#0D2329]"
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-[#0D2329] flex items-center gap-1">
                        <span>🍼 3. Amamentação e Alimentação</span>
                      </label>
                      <textarea
                        rows={3}
                        value={anamneseAxes.breastfeedingAndDiet || ""}
                        onChange={(e) => setAnamneseAxes({ ...anamneseAxes, breastfeedingAndDiet: e.target.value })}
                        placeholder={generatingAI ? "✨ Sintetizando aleitamento e introdução alimentar com IA..." : "Aleitamento, introdução de sólidos e seletividade alimentar..."}
                        className={`w-full p-2.5 text-xs rounded-xl border leading-relaxed transition-all duration-500 ${
                          generatingAI
                            ? "border-2 border-[#7C3AED] bg-[#F5F3FF] shadow-[0_0_20px_rgba(124,58,237,0.25)] animate-pulse ring-2 ring-[#7C3AED]/40 text-[#4C1D95]"
                            : "border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-[#0D2329]"
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-[#0D2329] flex items-center gap-1">
                        <span>🏃 4. Desenvolvimento Psicomotor e Linguagem</span>
                      </label>
                      <textarea
                        rows={3}
                        value={anamneseAxes.psychomotorAndLanguage || ""}
                        onChange={(e) => setAnamneseAxes({ ...anamneseAxes, psychomotorAndLanguage: e.target.value })}
                        placeholder={generatingAI ? "✨ Sintetizando marcos motores e aquisição da fala com IA..." : "Marcos motores (marcha, sustentação) e aquisição da fala..."}
                        className={`w-full p-2.5 text-xs rounded-xl border leading-relaxed transition-all duration-500 ${
                          generatingAI
                            ? "border-2 border-[#7C3AED] bg-[#F5F3FF] shadow-[0_0_20px_rgba(124,58,237,0.25)] animate-pulse ring-2 ring-[#7C3AED]/40 text-[#4C1D95]"
                            : "border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-[#0D2329]"
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-[#0D2329] flex items-center gap-1">
                        <span>🌙 5. Padrão de Sono</span>
                      </label>
                      <textarea
                        rows={3}
                        value={anamneseAxes.sleep || ""}
                        onChange={(e) => setAnamneseAxes({ ...anamneseAxes, sleep: e.target.value })}
                        placeholder={generatingAI ? "✨ Analisando rotina e qualidade do sono com IA..." : "Qualidade do sono noturno e rotina de descanso..."}
                        className={`w-full p-2.5 text-xs rounded-xl border leading-relaxed transition-all duration-500 ${
                          generatingAI
                            ? "border-2 border-[#7C3AED] bg-[#F5F3FF] shadow-[0_0_20px_rgba(124,58,237,0.25)] animate-pulse ring-2 ring-[#7C3AED]/40 text-[#4C1D95]"
                            : "border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-[#0D2329]"
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-[#0D2329] flex items-center gap-1">
                        <span>🩺 6. Histórico de Saúde & Antecedentes Familiares</span>
                      </label>
                      <textarea
                        rows={3}
                        value={anamneseAxes.familyHealthHistory || ""}
                        onChange={(e) => setAnamneseAxes({ ...anamneseAxes, familyHealthHistory: e.target.value })}
                        placeholder={generatingAI ? "✨ Estruturando antecedentes clínicos e histórico familiar com IA..." : "Histórico clínico e antecedentes de dificuldades na família..."}
                        className={`w-full p-2.5 text-xs rounded-xl border leading-relaxed transition-all duration-500 ${
                          generatingAI
                            ? "border-2 border-[#7C3AED] bg-[#F5F3FF] shadow-[0_0_20px_rgba(124,58,237,0.25)] animate-pulse ring-2 ring-[#7C3AED]/40 text-[#4C1D95]"
                            : "border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-[#0D2329]"
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-[#0D2329] flex items-center gap-1">
                        <span>📚 7. Escolaridade & Histórico Escolar</span>
                      </label>
                      <textarea
                        rows={3}
                        value={anamneseAxes.schooling || ""}
                        onChange={(e) => setAnamneseAxes({ ...anamneseAxes, schooling: e.target.value })}
                        placeholder={generatingAI ? "✨ Estruturando trajetória acadêmica e queixas escolares com IA..." : "Início escolar, adaptação e surgimento das dificuldades..."}
                        className={`w-full p-2.5 text-xs rounded-xl border leading-relaxed transition-all duration-500 ${
                          generatingAI
                            ? "border-2 border-[#7C3AED] bg-[#F5F3FF] shadow-[0_0_20px_rgba(124,58,237,0.25)] animate-pulse ring-2 ring-[#7C3AED]/40 text-[#4C1D95]"
                            : "border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-[#0D2329]"
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-[#0D2329] flex items-center gap-1">
                        <span>🤝 8. Sociabilidade & Relações Interpessoais</span>
                      </label>
                      <textarea
                        rows={3}
                        value={anamneseAxes.relationshipsAndSociability || ""}
                        onChange={(e) => setAnamneseAxes({ ...anamneseAxes, relationshipsAndSociability: e.target.value })}
                        placeholder={generatingAI ? "✨ Estruturando sociabilidade e interação com pares com IA..." : "Interação com amigos, convivência e brincadeiras..."}
                        className={`w-full p-2.5 text-xs rounded-xl border leading-relaxed transition-all duration-500 ${
                          generatingAI
                            ? "border-2 border-[#7C3AED] bg-[#F5F3FF] shadow-[0_0_20px_rgba(124,58,237,0.25)] animate-pulse ring-2 ring-[#7C3AED]/40 text-[#4C1D95]"
                            : "border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-[#0D2329]"
                        }`}
                      />
                    </div>
                  </div>

                  {generatingAI && (
                    <div className="flex items-center gap-2 mt-2 px-3.5 py-2.5 rounded-xl bg-[#EDE9FE] border border-[#DDD6FE] text-[#7C3AED] text-xs font-black animate-pulse shadow-xs">
                      <Sparkles className="w-4 h-4 animate-spin text-[#7C3AED] shrink-0" />
                      <span>✨ A IA está analisando as 13 perguntas da família e estruturando os 8 eixos temáticos em tempo real...</span>
                    </div>
                  )}
                </div>

                {/* Perguntas Reais da Anamnese Familiar */}
                <div className="p-5 rounded-2xl border-2 border-[#D8E5E7] space-y-4 bg-white">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-[#005B94]" />
                      <span>Respostas da Entrevista Familiar Original ({familyQuestions.length} Perguntas)</span>
                    </h3>
                    <span className="text-[11px] font-bold text-[#7C3AED] bg-[#EDE9FE] px-3 py-1 rounded-xl">
                      Fonte de Dados Primária
                    </span>
                  </div>

                  <div className="space-y-4">
                    {familyQuestions.map((q) => (
                      <div key={q.id} className="p-4 rounded-2xl border-2 border-[#D8E5E7] bg-[#F8FAFB] space-y-2">
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-[#EDE9FE] text-[#7C3AED] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {q.num}
                          </span>
                          <label className="text-xs font-black text-[#0D2329] uppercase leading-tight pt-1">
                            {q.title}
                          </label>
                        </div>
                        <textarea
                          rows={2}
                          value={familyAnswers[q.id] || ""}
                          onChange={(e) => setFamilyAnswers({ ...familyAnswers, [q.id]: e.target.value })}
                          placeholder={q.placeholder || "Digite o relato da família para esta pergunta..."}
                          className="w-full p-3 text-xs rounded-xl border border-[#D8E5E7] bg-white focus:outline-none focus:border-[#7C3AED] resize-y leading-relaxed text-[#0D2329]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                ETAPA 2: ENTREVISTA / VISITA ESCOLAR REAL
                ========================================================================= */}
            {activeStep === 2 && (
              <div className="space-y-5 animate-in fade-in">
                {/* Identificação do Relato Escolar */}
                <div className="p-5 rounded-2xl border-2 border-[#D8E5E7] space-y-4 bg-[#F8FAFB]">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2">
                    <School className="w-4 h-4 text-[#005B94]" />
                    <span>Identificação da Equipe Escolar / Observador</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-black text-[#0D2329]">Nome do Profissional / Professor</label>
                      <input
                        type="text"
                        value={schoolObserver.name}
                        onChange={(e) => setSchoolObserver({ ...schoolObserver, name: e.target.value })}
                        placeholder="Ex: Professora Maria Silva"
                        className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-[#D8E5E7] bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-[#0D2329]">Cargo / Função</label>
                      <input
                        type="text"
                        value={schoolObserver.role}
                        onChange={(e) => setSchoolObserver({ ...schoolObserver, role: e.target.value })}
                        placeholder="Ex: Professora Regente / Coordenação"
                        className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-[#D8E5E7] bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-[#0D2329]">Data do Relato Escolar</label>
                      <input
                        type="date"
                        value={schoolObserver.date}
                        onChange={(e) => setSchoolObserver({ ...schoolObserver, date: e.target.value })}
                        className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-[#D8E5E7] bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Perguntas Reais da Entrevista Escolar */}
                <div className="p-5 rounded-2xl border-2 border-[#D8E5E7] space-y-4 bg-white">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2">
                      <School className="w-4 h-4 text-[#005B94]" />
                      <span>Questionário da Entrevista Escolar ({schoolQuestions.length} Perguntas)</span>
                    </h3>
                    <span className="text-[11px] font-bold text-[#0284C7] bg-[#E0F2FE] px-3 py-1 rounded-xl">
                      Relato do Ambiente Escolar
                    </span>
                  </div>

                  <div className="space-y-4">
                    {schoolQuestions.map((q) => (
                      <div key={q.id} className="p-4 rounded-2xl border-2 border-[#D8E5E7] bg-[#F8FAFB] space-y-2">
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-[#E0F2FE] text-[#0284C7] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {q.num}
                          </span>
                          <label className="text-xs font-black text-[#0D2329] uppercase leading-tight pt-1">
                            {q.title}
                          </label>
                        </div>
                        <textarea
                          rows={3}
                          value={schoolAnswers[q.id] || ""}
                          onChange={(e) => setSchoolAnswers({ ...schoolAnswers, [q.id]: e.target.value })}
                          placeholder={q.placeholder || "Digite o relato da escola para esta pergunta..."}
                          className="w-full p-3 text-xs rounded-xl border border-[#D8E5E7] bg-white focus:outline-none focus:border-[#7C3AED] resize-y leading-relaxed text-[#0D2329]"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Características Comportamentais (Checklist) */}
                  <div className="pt-4 border-t border-[#EEF5F6]">
                    <label className="text-[11px] font-black uppercase text-[#005B94] tracking-wider block mb-2">
                      Características Observadas pela Professora (Marque as que se aplicam):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {[
                        { key: "desligado", label: "Desligado" },
                        { key: "agitado", label: "Agitado" },
                        { key: "retraido", label: "Retraído" },
                        { key: "dependente", label: "Dependente" },
                        { key: "calmo", label: "Calmo" },
                        { key: "passivo", label: "Passivo" },
                        { key: "agressivo", label: "Agressivo" },
                        { key: "sem_limites", label: "Sem limites" },
                        { key: "medroso", label: "Medroso" },
                        { key: "melancolico", label: "Melancólico" },
                        { key: "depressivo", label: "Depressivo" },
                        { key: "ressentido", label: "Ressentido" },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className={"p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 transition-all select-none " + (
                            schoolTraits[item.key]
                              ? "bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE] font-black"
                              : "bg-[#F8FAFB] text-[#6B7C83] border-[#D8E5E7] font-semibold hover:bg-white"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(schoolTraits[item.key])}
                            onChange={(e) =>
                              setSchoolTraits({
                                ...schoolTraits,
                                [item.key]: e.target.checked,
                              })
                            }
                            className="accent-[#7C3AED]"
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                ETAPA 3: INSTRUMENTOS & TESTES (Páginas 5 a 15)
                ========================================================================= */}
            {activeStep === 3 && (
              <div className="space-y-5 animate-in fade-in">
                <div className="p-4 rounded-2xl bg-[#EDE9FE] border border-[#DDD6FE] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-[#6D28D9]">
                      Catálogo Oficial de 21 Testes e Instrumentos da Psicopedagogia
                    </p>
                    <p className="text-[11px] font-medium text-[#7C3AED]">
                      Selecione quais instrumentos foram aplicados para constar no relatório Word com suas tabelas e notas de corte.
                    </p>
                  </div>
                  <span className="text-xs font-black px-3 py-1 bg-white text-[#7C3AED] rounded-xl border border-[#DDD6FE]">
                    {selectedInstruments.length} selecionados
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {DEFAULT_INSTRUMENT_CATALOG.map((inst, idx) => {
                    const isChecked = selectedInstruments.includes(inst)
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleInstrument(inst)}
                        className={"p-3 rounded-2xl border-2 cursor-pointer flex items-start gap-3 transition-all select-none " + (
                          isChecked
                            ? "bg-white border-[#7C3AED] shadow-xs"
                            : "bg-[#F8FAFB] border-[#D8E5E7] opacity-75 hover:opacity-100 hover:border-[#8DA3A8]"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by div
                          className="mt-0.5 w-4 h-4 accent-[#7C3AED]"
                        />
                        <span className={"text-xs font-bold " + (isChecked ? "text-[#0D2329]" : "text-[#6B7C83]")}>
                          {inst}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* =========================================================================
                ETAPA 4: OBSERVAÇÃO CLÍNICA & SÍNTESE (Páginas 15 a 17)
                ========================================================================= */}
            {activeStep === 4 && (
              <div className="space-y-5 animate-in fade-in">
                <div className="p-5 rounded-2xl border-2 border-[#D8E5E7] space-y-4 bg-white">
                  <div className="flex items-center justify-between flex-wrap gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-[#005B94]" />
                        <span>Observação Clínica nas Sessões</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowSessionsDrawer(!showSessionsDrawer)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 ${
                          showSessionsDrawer
                            ? "bg-[#7C3AED] text-white"
                            : "bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#7C3AED] border border-[#DDD6FE]"
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{showSessionsDrawer ? "✕ Fechar Painel de Sessões" : `📋 Consultar Sessões (${childSessions.length})`}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-[#6B7C83]">Total de Sessões Realizadas:</label>
                      <input
                        type="number"
                        value={sessionsCount}
                        onChange={(e) => setSessionsCount(Number(e.target.value) || 1)}
                        className="w-16 px-2 py-1 text-xs font-black rounded-lg border border-[#D8E5E7] text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-[#0D2329]">
                      Postura, Engajamento, Lúdico e Tolerância à Frustração
                    </label>
                    <textarea
                      rows={5}
                      value={clinicalObservation}
                      onChange={(e) => setClinicalObservation(e.target.value)}
                      className="w-full mt-1 p-3 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white leading-relaxed"
                    />
                  </div>

                  <div className="pt-3 border-t border-[#EEF5F6]">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-black uppercase text-[#005B94] tracking-wider">
                        Síntese da Avaliação Psicopedagógica
                      </label>
                      <button
                        type="button"
                        disabled={generatingAI}
                        onClick={handleGenerateAISuggestions}
                        className="px-3 py-1 rounded-lg bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#DDD6FE] text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{generatingAI ? "Aprimorando..." : "Sugerir com IA"}</span>
                      </button>
                    </div>
                    <textarea
                      rows={5}
                      value={synthesis}
                      onChange={(e) => setSynthesis(e.target.value)}
                      placeholder={generatingAI ? "✨ A Inteligência Artificial está analisando os dados e redigindo a síntese clínica..." : "Digite ou aprimore a síntese clínica..."}
                      className={`w-full p-3 text-xs rounded-xl border leading-relaxed transition-all duration-500 ${
                        generatingAI
                          ? "border-2 border-[#7C3AED] bg-[#F5F3FF] shadow-[0_0_25px_rgba(124,58,237,0.30)] animate-pulse ring-2 ring-[#7C3AED]/40 text-[#4C1D95]"
                          : "border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-[#0D2329]"
                      }`}
                    />
                    {generatingAI && (
                      <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-[#EDE9FE] border border-[#DDD6FE] text-[#7C3AED] text-xs font-black animate-pulse shadow-xs">
                        <Sparkles className="w-4 h-4 animate-spin text-[#7C3AED]" />
                        <span>✨ A IA está analisando os dados e redigindo a síntese clínica em tempo real...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                ETAPA 5: HIPÓTESE DIAGNÓSTICA & RECOMENDAÇÕES (Páginas 17 a 20)
                ========================================================================= */}
            {activeStep === 5 && (
              <div className="space-y-5 animate-in fade-in">
                <div className="p-5 rounded-2xl border-2 border-[#D8E5E7] space-y-4 bg-white">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-[#005B94]" />
                      <span>Hipótese Diagnóstica (DSM-5-TR)</span>
                    </h3>
                    <button
                      type="button"
                      disabled={generatingAI}
                      onClick={handleGenerateAISuggestions}
                      className="px-3 py-1 rounded-lg bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#DDD6FE] text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{generatingAI ? "Aprimorando..." : "Sugerir com IA"}</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={diagnosticHypothesis}
                    onChange={(e) => setDiagnosticHypothesis(e.target.value)}
                    placeholder={generatingAI ? "✨ A Inteligência Artificial está correlacionando as evidências e redigindo a hipótese clínica..." : "Digite ou aprimore a hipótese diagnóstica..."}
                    className={`w-full p-3 text-xs rounded-xl border leading-relaxed transition-all duration-500 ${
                      generatingAI
                        ? "border-2 border-[#7C3AED] bg-[#F5F3FF] shadow-[0_0_25px_rgba(124,58,237,0.30)] animate-pulse ring-2 ring-[#7C3AED]/40 text-[#4C1D95]"
                        : "border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-[#0D2329]"
                    }`}
                  />
                  {generatingAI && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#EDE9FE] border border-[#DDD6FE] text-[#7C3AED] text-xs font-black animate-pulse shadow-xs">
                      <Sparkles className="w-4 h-4 animate-spin text-[#7C3AED]" />
                      <span>✨ A IA está correlacionando critérios DSM-5, encaminhamentos e orientações...</span>
                    </div>
                  )}

                  {/* Critérios DSM-5-TR */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-black uppercase text-[#005B94] tracking-wider">
                        Manifestações e Critérios DSM-5-TR Observados:
                      </label>
                      <button
                        type="button"
                        onClick={() => setDsm5Criteria([...dsm5Criteria, ""])}
                        className="px-2.5 py-1 rounded-lg bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#DDD6FE] text-xs font-black flex items-center gap-1 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Critério</span>
                      </button>
                    </div>
                    <div className="space-y-2">
                      {dsm5Criteria.map((crit, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#EDE9FE] text-[#7C3AED] text-[10px] font-black flex items-center justify-center shrink-0">
                            ✓
                          </span>
                          <input
                            type="text"
                            placeholder="Descreva o critério ou manifestação observada..."
                            value={crit}
                            onChange={(e) => {
                              const updated = [...dsm5Criteria]
                              updated[idx] = e.target.value
                              setDsm5Criteria(updated)
                            }}
                            className="flex-1 p-2 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setDsm5Criteria(dsm5Criteria.filter((_, i) => i !== idx))}
                            className="p-2 rounded-xl text-[#EF4444] hover:bg-[#FEF2F2] transition-all"
                            title="Remover critério"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {dsm5Criteria.length === 0 && (
                        <p className="text-xs text-[#6B7C83] italic py-2">Nenhum critério adicionado. Clique em "+ Adicionar Critério" acima.</p>
                      )}
                    </div>
                  </div>

                  {/* Encaminhamentos */}
                  <div className="pt-3 border-t border-[#EEF5F6]">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-black uppercase text-[#005B94] tracking-wider">
                        Encaminhamentos Profissionais Recomendados:
                      </label>
                      <button
                        type="button"
                        onClick={() => setReferrals([...referrals, ""])}
                        className="px-2.5 py-1 rounded-lg bg-[#E0F2FE] text-[#0284C7] hover:bg-[#BAE6FD] text-xs font-black flex items-center gap-1 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Encaminhamento</span>
                      </button>
                    </div>
                    <div className="space-y-2">
                      {referrals.map((refItem, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#E0F2FE] text-[#0284C7] text-[10px] font-black flex items-center justify-center shrink-0">
                            →
                          </span>
                          <input
                            type="text"
                            placeholder="Ex: Avaliação com Neuropediatra..."
                            value={refItem}
                            onChange={(e) => {
                              const updated = [...referrals]
                              updated[idx] = e.target.value
                              setReferrals(updated)
                            }}
                            className="flex-1 p-2 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setReferrals(referrals.filter((_, i) => i !== idx))}
                            className="p-2 rounded-xl text-[#EF4444] hover:bg-[#FEF2F2] transition-all"
                            title="Remover encaminhamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {referrals.length === 0 && (
                        <p className="text-xs text-[#6B7C83] italic py-2">Nenhum encaminhamento adicionado. Clique em "+ Adicionar Encaminhamento" acima.</p>
                      )}
                    </div>
                  </div>

                  {/* Recomendações Família & Escola */}
                  <div className="pt-3 border-t border-[#EEF5F6] grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-black uppercase text-[#005B94] tracking-wider">
                          Orientações para a Família:
                        </label>
                        <button
                          type="button"
                          onClick={() => setRecommendationsFamily([...recommendationsFamily, ""])}
                          className="px-2 py-0.5 rounded-lg bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#DDD6FE] text-[11px] font-black flex items-center gap-1 transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Adicionar</span>
                        </button>
                      </div>
                      <div className="space-y-2">
                        {recommendationsFamily.map((rec, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="Ex: Estabelecer rotina diária de estudos..."
                              value={rec}
                              onChange={(e) => {
                                const updated = [...recommendationsFamily]
                                updated[idx] = e.target.value
                                setRecommendationsFamily(updated)
                              }}
                              className="flex-1 p-2 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => setRecommendationsFamily(recommendationsFamily.filter((_, i) => i !== idx))}
                              className="p-1.5 rounded-xl text-[#EF4444] hover:bg-[#FEF2F2] transition-all"
                              title="Remover orientação"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {recommendationsFamily.length === 0 && (
                          <p className="text-xs text-[#6B7C83] italic py-1">Nenhuma orientação adicionada.</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-black uppercase text-[#005B94] tracking-wider">
                          Orientações para a Escola:
                        </label>
                        <button
                          type="button"
                          onClick={() => setRecommendationsSchool([...recommendationsSchool, ""])}
                          className="px-2 py-0.5 rounded-lg bg-[#E0F2FE] text-[#0284C7] hover:bg-[#BAE6FD] text-[11px] font-black flex items-center gap-1 transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Adicionar</span>
                        </button>
                      </div>
                      <div className="space-y-2">
                        {recommendationsSchool.map((rec, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="Ex: Posicionar próximo à professora..."
                              value={rec}
                              onChange={(e) => {
                                const updated = [...recommendationsSchool]
                                updated[idx] = e.target.value
                                setRecommendationsSchool(updated)
                              }}
                              className="flex-1 p-2 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => setRecommendationsSchool(recommendationsSchool.filter((_, i) => i !== idx))}
                              className="p-1.5 rounded-xl text-[#EF4444] hover:bg-[#FEF2F2] transition-all"
                              title="Remover orientação"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {recommendationsSchool.length === 0 && (
                          <p className="text-xs text-[#6B7C83] italic py-1">Nenhuma orientação adicionada.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Considerações Finais */}
                  <div className="pt-3 border-t border-[#EEF5F6]">
                    <label className="text-[11px] font-black uppercase text-[#005B94] tracking-wider block mb-2">
                      Considerações Finais
                    </label>
                    <textarea
                      rows={3}
                      value={finalConsiderations}
                      onChange={(e) => setFinalConsiderations(e.target.value)}
                      placeholder={generatingAI ? "✨ A Inteligência Artificial está formulando as considerações finais..." : ""}
                      className={`w-full p-3 text-xs rounded-xl border leading-relaxed transition-all duration-500 ${
                        generatingAI
                          ? "border-2 border-[#7C3AED] bg-[#F5F3FF] shadow-[0_0_25px_rgba(124,58,237,0.30)] animate-pulse ring-2 ring-[#7C3AED]/40 text-[#4C1D95]"
                          : "border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-[#0D2329]"
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer do Gerador: Navegação & Ações Principais */}
      <div className="p-4 sm:p-6 border-t border-[#EEF5F6] bg-[#F8FAFB] rounded-b-3xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeStep > 1 && (
            <button
              type="button"
              onClick={() => setActiveStep((activeStep - 1) as any)}
              className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#EDE9FE] border-2 border-[#D8E5E7] hover:border-[#7C3AED] text-[#0D2329] text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          )}

          {activeStep < 5 && (
            <button
              type="button"
              onClick={() => setActiveStep((activeStep + 1) as any)}
              className="px-5 py-2.5 rounded-2xl bg-[#0D2329] hover:bg-[#1E3A40] text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-xs ml-auto sm:ml-0 cursor-pointer"
            >
              <span>Avançar Etapa</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            disabled={savingToDatabase}
            onClick={handleSaveToSupabase}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#F0FDF4] border-2 border-[#D8E5E7] hover:border-[#10B981] text-[#0D2329] text-xs font-black transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            <span>{savingToDatabase ? "Salvando..." : "Salvar Prontuário"}</span>
          </button>

          <button
            type="button"
            disabled={generatingDocx}
            onClick={handleDownloadWord}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white text-xs font-black flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{generatingDocx ? "Gerando Word..." : "Baixar Relatório Word (.docx)"}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          DRAWER LATERAL: CONSULTA DE SESSÕES CLÍNICAS (LADO A LADO)
          ========================================================================= */}
      {showSessionsDrawer && (
        <aside className="absolute right-0 top-0 bottom-0 w-full sm:w-[460px] bg-white border-l-2 border-[#D8E5E7] shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-4 bg-[#F8FAFB] border-b border-[#EEF5F6] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#0D2329]">
                  Histórico de Sessões ({childSessions.length})
                </h4>
                <p className="text-[10px] font-semibold text-[#6B7C83]">
                  {childSessions.length > 0
                    ? `1ª sessão em ${childSessions[0].date ? formatDate(childSessions[0].date) : "..."} até a última em ${childSessions[childSessions.length - 1].date ? formatDate(childSessions[childSessions.length - 1].date) : "..."}`
                    : "Nenhuma sessão registrada"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSessionsDrawer(false)}
              className="w-7 h-7 rounded-full bg-white hover:bg-[#FEE2E2] text-[#6B7C83] hover:text-[#DC2626] border border-[#D8E5E7] flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Drawer Body: Lista de Sessões */}
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            {childSessions.length === 0 ? (
              <div className="p-8 text-center bg-[#F8FAFB] rounded-2xl border border-dashed border-[#D8E5E7] space-y-2">
                <Calendar className="w-8 h-8 text-[#8DA3A8] mx-auto opacity-50" />
                <p className="text-xs font-bold text-[#6B7C83]">
                  Nenhuma sessão individual encontrada para {child.full_name}.
                </p>
              </div>
            ) : (
              childSessions.map((sess, idx) => {
                const isExpanded = expandedSessionId === sess.id || (!expandedSessionId && idx === 0)
                const sessNum = sess.session_number || idx + 1
                const sessDate = sess.date ? formatDate(sess.date) : "Data não informada"

                return (
                  <div
                    key={sess.id || idx}
                    className={`rounded-2xl border-2 transition-all ${
                      isExpanded
                        ? "border-[#7C3AED] bg-white shadow-sm"
                        : "border-[#D8E5E7] bg-[#F8FAFB] hover:border-[#7C3AED]/40"
                    }`}
                  >
                    {/* Session Header Item */}
                    <button
                      type="button"
                      onClick={() => setExpandedSessionId(isExpanded ? null : sess.id)}
                      className="w-full p-3 flex items-center justify-between text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#EDE9FE] text-[#7C3AED] text-[10px] font-black uppercase tracking-wider">
                          Sessão {sessNum}
                        </span>
                        <span className="text-xs font-bold text-[#0D2329]">
                          📅 {sessDate}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#7C3AED]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#6B7C83]" />
                      )}
                    </button>

                    {/* Session Expanded Content */}
                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 pt-1 border-t border-[#EEF5F6] space-y-2.5 text-xs">
                        {sess.objective && (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#005B94] flex items-center gap-1">
                              🎯 Objetivo da Sessão:
                            </span>
                            <p className="text-xs font-semibold text-[#0D2329] bg-[#F8FAFB] p-2 rounded-xl border border-[#EEF5F6]">
                              {sess.objective}
                            </p>
                          </div>
                        )}

                        {sess.what_was_worked && (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#7C3AED] flex items-center gap-1">
                              🧠 O que foi trabalhado:
                            </span>
                            <p className="text-xs font-semibold text-[#0D2329] bg-[#F8FAFB] p-2 rounded-xl border border-[#EEF5F6]">
                              {sess.what_was_worked}
                            </p>
                          </div>
                        )}

                        {sess.activities && (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#059669] flex items-center gap-1">
                              🎲 Atividades Realizadas:
                            </span>
                            <p className="text-xs font-semibold text-[#0D2329] bg-[#F8FAFB] p-2 rounded-xl border border-[#EEF5F6]">
                              {sess.activities}
                            </p>
                          </div>
                        )}

                        {sess.professional_notes && (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#D97706] flex items-center gap-1">
                              📝 Observações Clínicas da Profissional:
                            </span>
                            <p className="text-xs font-semibold text-[#0D2329] bg-[#FEF3C7]/40 p-2 rounded-xl border border-[#FDE68A]">
                              {sess.professional_notes}
                            </p>
                          </div>
                        )}

                        {/* Button: Append to clinicalObservation */}
                        <button
                          type="button"
                          onClick={() => {
                            const noteToAdd = sess.professional_notes || sess.what_was_worked || sess.activities
                            if (noteToAdd) {
                              setClinicalObservation((prev) =>
                                prev ? `${prev}\n\n[Sessão ${sessNum} - ${sessDate}]: ${noteToAdd}` : `[Sessão ${sessNum} - ${sessDate}]: ${noteToAdd}`
                              )
                              toast.success(`Anotação da Sessão ${sessNum} adicionada à observação!`, { icon: "📥" })
                            } else {
                              toast("Nenhuma anotação específica registrada nesta sessão.", { icon: "ℹ️" })
                            }
                          }}
                          className="w-full mt-2 py-2 px-3 rounded-xl bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#7C3AED] font-black text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar anotações para o campo de Observação</span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </aside>
      )}
    </div>
  )
}
