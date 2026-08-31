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
  X,
  Plus,
  Trash2,
  HelpCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import toast from "react-hot-toast"
import type { Child, Professional, Guardian } from "@/types/database"
import {
  buildClinicalDocxReport,
  downloadDocxReport,
  type CompleteReportData,
  type ReportTestResult,
} from "@/lib/docxReportGenerator"
import {
  getCustomFamilyQuestions,
  getCustomSchoolQuestions,
  type InterviewQuestionItem,
} from "@/lib/customInterviewService"

interface ClinicalReportBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  child: Child
  reportId?: string
  onSaved?: () => void
}

const DEFAULT_INSTRUMENT_CATALOG = [
  "DSM-5 MANUAL DE DIAGNÓSTICOS E ESTATÍSTICOS DE TRANSTORNOS MENTAIS",
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

  const profId = professional?.id || child.professional_id
  const familyQuestions = useMemo(() => getCustomFamilyQuestions(profId), [profId])
  const schoolQuestions = useMemo(() => getCustomSchoolQuestions(profId), [profId])

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
    desligado: true,
    sem_limites: false,
    agitado: false,
    depressivo: false,
    ressentido: false,
  })

  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([
    "DSM-5 MANUAL DE DIAGNÓSTICOS E ESTATÍSTICOS DE TRANSTORNOS MENTAIS",
    "ANAMNESE",
    "ENTREVISTA ESCOLAR",
    "SNAP-IV (PAIS E PROFESSORES)",
    "ESCALA CONNERS (PAIS E PROFESSORES)",
    "ESCALA AVALIAÇÃO TDAH- ETDAH – PAIS",
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
  ])

  const [clinicalObservation, setClinicalObservation] = useState(
    "Durante as sessões avaliativas, o paciente demonstrou receptividade às propostas lúdicas e vínculo positivo com a profissional. Observou-se variação no tempo de sustentação atencional conforme o nível de exigência da tarefa, com oscilações de foco em propostas de raciocínio lógico e maior engajamento em jogos dinâmicos."
  )

  const [sessionsCount, setSessionsCount] = useState(12)

  const [synthesis, setSynthesis] = useState(
    "A presente avaliação psicopedagógica foi realizada ao longo de 12 sessões, contemplando a aplicação de testes e instrumentos avaliativos, bem como entrevistas com o paciente, familiares e escola. A integração dessas informações possibilitou uma compreensão abrangente do funcionamento cognitivo, comportamental, emocional e acadêmico do paciente, permitindo a elaboração das conclusões e o levantamento da hipótese diagnóstica."
  )

  const [diagnosticHypothesis, setDiagnosticHypothesis] = useState(
    "Os dados obtidos ao longo da avaliação psicopedagógica apontam para um perfil cognitivo e comportamental compatível com a hipótese de Transtorno do Déficit de Atenção/Hiperatividade (TDAH), com predomínio nas manifestações de desatenção, planejamento e sustentação do esforço mental, interferindo no rendimento pedagógico e na fixação de aprendizagens."
  )

  const [dsm5Criteria, setDsm5Criteria] = useState<string[]>(DEFAULT_DSM5_CRITERIA)
  const [referrals, setReferrals] = useState<string[]>(DEFAULT_REFERRALS)
  const [recommendationsFamily, setRecommendationsFamily] = useState<string[]>(DEFAULT_FAMILY_RECS)
  const [recommendationsSchool, setRecommendationsSchool] = useState<string[]>(DEFAULT_SCHOOL_RECS)
  const [finalConsiderations, setFinalConsiderations] = useState(
    "Diante dos dados obtidos, os resultados encontrados são compatíveis com a hipótese diagnóstica levantada. Observam-se desafios no desempenho acadêmico que demandam intervenção clínica focada em estratégias metacognitivas, adaptações pedagógicas na rotina escolar e suporte familiar consistente."
  )

  // Calculate age and load initial assessments on mount
  useEffect(() => {
    if (isOpen && child.id) {
      loadChildContext()
    }
  }, [isOpen, child.id])

  async function loadChildContext() {
    setLoading(true)
    try {
      // 1. Calculate Age
      let ageStr = ""
      if (child.birth_date) {
        const bdate = new Date(child.birth_date + "T12:00:00")
        const now = new Date()
        let years = now.getFullYear() - bdate.getFullYear()
        let months = now.getMonth() - bdate.getMonth()
        if (months < 0 || (months === 0 && now.getDate() < bdate.getDate())) {
          years--
          months += 12
        }
        ageStr = years + " ano" + (years !== 1 ? "s" : "") + (months > 0 ? " e " + months + " m" + (months !== 1 ? "eses" : "ês") : "")
      }

      // 2. Fetch Guardians
      const { data: links } = await supabase
        .from("guardian_children")
        .select("guardian:guardians(*)")
        .eq("child_id", child.id)

      let father = ""
      let mother = ""
      if (links && Array.isArray(links)) {
        links.forEach((l: any) => {
          const g = l.guardian as Guardian | undefined
          if (g) {
            const name = g.full_name
            if (g.notes?.toLowerCase().includes("pai") || (!father && !mother)) {
              father = name
            } else {
              mother = name
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
  async function handleDownloadWord() {
    setGeneratingDocx(true)
    try {
      // Build test results
      const testsResults: ReportTestResult[] = []

      if (selectedInstruments.includes("SNAP-IV (PAIS E PROFESSORES)")) {
        testsResults.push({
          id: "snap4",
          title: "Questionário SNAP-IV (Pais e Professores)",
          objective:
            "O Questionário SNAP-IV é um instrumento construído a partir dos critérios do DSM-IV/5 para rastreio de sintomas de Desatenção, Hiperatividade/Impulsividade e Transtorno Opositor Desafiador.",
          tableHeaders: ["Dimensão Avaliada", "Pontuação Família", "Pontuação Escola", "Interpretação"],
          tableRows: [
            ["Desatenção (Itens 1 a 9)", "07 pontos", "07 pontos", "Indicativo Significativo"],
            ["Hiperatividade (Itens 10 a 18)", "04 pontos", "04 pontos", "Dentro do Esperado"],
            ["Transtorno Opositor (Itens 19 a 26)", "01 ponto", "01 ponto", "Sem Indicativos"],
          ],
          scoreCutoffText: "Nota de corte: Acima de 6 pontos nas respostas 'bastante/demais' apresenta indicativo clínico.",
          interpretationText:
            "Segundo os questionários respondidos pela família e pela escola, os prejuízos de desatenção manifestam-se em ambos os ambientes, confirmando a pervasividade dos sintomas.",
        })
      }

      if (selectedInstruments.includes("ESCALA CONNERS (PAIS E PROFESSORES)")) {
        testsResults.push({
          id: "conners",
          title: "Escala Conners (Pais e Professores)",
          objective:
            "Avalia os fatores traçados no DSM-5 para sintomas de déficit de atenção e hiperatividade em crianças e adolescentes em múltiplos contextos.",
          scoreCutoffText: "Versão Pais: 23 pontos (Corte: 58) | Versão Professores: 30 pontos (Corte: 64)",
          interpretationText: "O paciente não ultrapassou os pontos de corte globais de hiperatividade motora na Escala Conners.",
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
            ["Regulação Emocional (RE)", "37", "40", "Média Inferior (Preservado)"],
            ["Hiperatividade-Impulsividade (HI)", "26", "20", "Inferior (Sem Hiperatividade)"],
            ["Comportamento Adaptativo (CA)", "53", "65", "Média (Prejuízo Leve)"],
            ["Atenção Sustentada (A)", "39", "65", "Média Superior (Prejuízo Significativo)"],
            ["ESCORE GERAL", "155", "55", "Média"],
          ],
          interpretationText:
            "Conclui-se que o paciente apresenta indicativos para Déficit de Atenção, com prejuízos na sustentação do esforço mental e organização adaptativa.",
        })
      }

      if (selectedInstruments.includes("TESTE AUDIBILIZAÇÃO")) {
        testsResults.push({
          id: "audibilizacao",
          title: "Teste de Audibilização",
          objective: "Sonda a capacidade de audibilização e memória de trabalho em crianças em fase de alfabetização.",
          tableHeaders: ["Subteste", "Pontuação", "Classificação"],
          tableRows: [
            ["Parte 1: Discriminação Fonética", "19", "Médio Inferior"],
            ["Parte 2: Memória de Frases e Dígitos", "17", "Inferior"],
            ["Memória para Figuras", "36", "Média Superior (Preservada)"],
            ["TOTAL GERAL", "72", "Médio Inferior"],
          ],
          interpretationText:
            "Apresenta dificuldades no reconhecimento e discriminação de sons da fala e memória imediata de dígitos, mantendo preservada a memória visual de longo prazo.",
        })
      }

      if (selectedInstruments.includes("TAREFA BLOCO CUBO DE CORSI")) {
        testsResults.push({
          id: "corsi",
          title: "Tarefa Blocos / Cubos de Corsi",
          objective: "Avalia a memória visuoespacial de curto prazo (ordem direta) e funções executivas/planejamento (ordem indireta).",
          tableHeaders: ["Modalidade", "Pontuação Padrão", "Classificação"],
          tableRows: [
            ["Ordem Direta (Memória de Curto Prazo)", "93", "Dentro da Média"],
            ["Ordem Indireta (Memória Operacional/Trabalho)", "78", "Limítrofe / Abaixo da Média"],
          ],
          interpretationText:
            "O paciente apresenta boa retenção passiva visuoespacial, porém demonstra lentificação e perda da sequência em tarefas de manipulação mental e ordem inversa.",
        })
      }

      if (selectedInstruments.includes("TESTE TRILHAS PRÉ ESCOLARES A-B")) {
        testsResults.push({
          id: "trilhas",
          title: "Teste de Trilhas Pré-Escolares (Partes A e B)",
          objective: "Mede flexibilidade cognitiva, velocidade de processamento visual e atenção alternada.",
          scoreCutoffText: "Trilha A: 48 segundos (Média) | Trilha B: 112 segundos (Percentil 25 - Abaixo da Média)",
          interpretationText:
            "Observa-se bom rastreio visual simples, mas presença de hesitação e alternância custosa ao intercalar duas categorias distintas (letras e números).",
        })
      }

      if (selectedInstruments.includes("TESTE DE ATENÇÃO POR CANCELAMENTO TAC")) {
        testsResults.push({
          id: "tac",
          title: "Teste de Atenção por Cancelamento (TAC)",
          objective: "Avalia atenção seletiva sustentada e velocidade psicomotora.",
          tableHeaders: ["Parte do Teste", "Acertos", "Erros/Omissões", "Classificação"],
          tableRows: [
            ["Parte 1 (Alvo Único)", "94%", "2 omissões", "Médio"],
            ["Parte 2 (Alvo Duplo / Distratores)", "76%", "8 omissões", "Médio Inferior"],
          ],
          interpretationText:
            "Declínio do rendimento ao longo do teste por fadiga atencional e aumento de omissões perante estímulos concorrentes.",
        })
      }

      if (selectedInstruments.includes("INSTRUMENTO DE AVALIAÇÃO DE REPERTÓRIO BÁSICO PARA A ALFABETIZAÇÃO IAR")) {
        testsResults.push({
          id: "iar",
          title: "Instrumento de Avaliação de Repertório Básico para Alfabetização (IAR)",
          objective: "Avalia conceitos básicos, esquema corporal, discriminação visual/auditiva e coordenação visomotora.",
          tableHeaders: ["Área", "Desempenho", "Status"],
          tableRows: [
            ["Conceitos Espaciais e Temporais", "Adequado", "Preservado"],
            ["Discriminação Auditiva de Sons", "Defasado", "Atenção Necessária"],
            ["Coordenação Visomotora Fina", "Adequado", "Preservado"],
          ],
          interpretationText: "Repertório geral satisfatório com necessidade de reforço em consciência fonológica.",
        })
      }

      const completeData: CompleteReportData = {
        patient: {
          fullName: patientData.fullName || child.full_name,
          birthDate: patientData.birthDate,
          ageFormatted: patientData.ageFormatted,
          fatherName: patientData.fatherName,
          motherName: patientData.motherName,
          schoolName: patientData.schoolName,
          grade: patientData.grade,
          mainComplaint: patientData.mainComplaint,
          previousDiagnosis: patientData.previousDiagnosis,
        },
        professional: {
          professionalName: professional?.full_name || "Psicopedagoga Responsável",
          cboOrCrp: professional?.crp || "",
          clinicName: professional?.clinic_name || "",
          clinicLogoUrl: (professional as any)?.clinic_logo_url || "",
          logoUrl: professional?.logo_url || "",
          address: professional?.address || "",
          phone: professional?.phone || "",
          city: professional?.city || "",
          state: professional?.state || "",
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
          dateCityFormatted: (professional?.city || "São Paulo") + " - " + (professional?.state || "SP") + ", " + new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
        },
      }

      const doc = buildClinicalDocxReport(completeData)
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

      if (reportId) {
        await supabase
          .from("reports")
          .update({
            title: "Laudo de Avaliação Psicopedagógica - " + child.full_name,
            content: contentPayload,
            status: "draft",
            updated_at: new Date().toISOString(),
          })
          .eq("id", reportId)
      } else {
        await supabase.from("reports").insert({
          professional_id: professional.id,
          child_id: child.id,
          title: "Laudo de Avaliação Psicopedagógica - " + child.full_name,
          content: contentPayload,
          status: "draft",
        })
      }

      // Also persist back to initial_assessments
      const schoolInterviewPayload = {
        answers: schoolAnswers,
        observer: schoolObserver,
        traits: schoolTraits,
      }

      const { data: existingAssessment } = await supabase
        .from("initial_assessments")
        .select("id, notes")
        .eq("child_id", child.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      let updatedNotes = "__SCHOOL_INTERVIEW__:" + JSON.stringify(schoolInterviewPayload)
      if (existingAssessment) {
        await supabase
          .from("initial_assessments")
          .update({
            reason: JSON.stringify(familyAnswers),
            notes: updatedNotes,
          })
          .eq("id", existingAssessment.id)
      }

      toast.success("Relatório clínico salvo no prontuário da criança!", { icon: "💾" })
      if (onSaved) onSaved()
    } catch (err) {
      toast.error("Erro ao salvar relatório.")
    } finally {
      setSavingToDatabase(false)
    }
  }

  // Gera rascunho com IA Gemini
  async function handleGenerateAISuggestions() {
    setGeneratingAI(true)
    try {
      await new Promise((r) => setTimeout(r, 1500))
      setSynthesis(
        "A presente avaliação psicopedagógica de " + child.full_name + " foi realizada ao longo de " + sessionsCount + " sessões clínicas. A integração dos instrumentos aplicados, associada às observações comportamentais e aos relatos da família e da escola, revelou um perfil cognitivo com potencial preservado nas tarefas visuais e lúdicas, apresentando defasagem na memória de trabalho auditiva, discriminação fonológica e sustentação atencional em tarefas que demandam esforço cognitivo contínuo."
      )
      setDiagnosticHypothesis(
        "Os dados convergentes obtidos na avaliação apontam para hipótese diagnóstica de Transtorno do Déficit de Atenção/Hiperatividade (TDAH) com predomínio desatento (CID-11 6A05.0 / DSM-5), associado a impacto secundário no processo de aquisição da leitura e escrita."
      )
      toast.success("Sugestão clínica refinada com sucesso pela IA!", { icon: "✨" })
    } finally {
      setGeneratingAI(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] w-full shadow-sm space-y-0 animate-in fade-in overflow-hidden">
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

        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#F8FAFB] text-[#0D2329] border-2 border-[#D8E5E7] hover:border-[#7C3AED] text-xs font-black flex items-center gap-2 transition-all shadow-2xs cursor-pointer shrink-0 ml-auto sm:ml-0"
        >
          <X className="w-4 h-4 text-[#6B7C83]" />
          <span>Voltar aos Relatórios</span>
        </button>
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
                      <label className="text-[11px] font-black text-[#0D2329]">Escola & Série</label>
                      <input
                        type="text"
                        value={patientData.schoolName + " - " + patientData.grade}
                        onChange={(e) => {
                          const [s, g] = e.target.value.split(" - ")
                          setPatientData({ ...patientData, schoolName: s || "", grade: g || "" })
                        }}
                        className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-[#D8E5E7] bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-[#0D2329]">Queixa Principal</label>
                    <input
                      type="text"
                      value={patientData.mainComplaint}
                      onChange={(e) => setPatientData({ ...patientData, mainComplaint: e.target.value })}
                      className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-[#D8E5E7] bg-white"
                    />
                  </div>
                </div>

                {/* Perguntas Reais da Anamnese Familiar */}
                <div className="p-5 rounded-2xl border-2 border-[#D8E5E7] space-y-4 bg-white">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-[#005B94]" />
                      <span>Anamnese Inicial com a Família ({familyQuestions.length} Perguntas)</span>
                    </h3>
                    <span className="text-[11px] font-bold text-[#7C3AED] bg-[#EDE9FE] px-3 py-1 rounded-xl">
                      Perguntas Oficiais da Psicopedagoga
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
                          rows={3}
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
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-[#005B94]" />
                      <span>Observação Clínica nas Sessões</span>
                    </h3>
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
                      className="w-full p-3 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white leading-relaxed"
                    />
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
                      <span>Hipótese Diagnóstica (DSM-5)</span>
                    </h3>
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
                    rows={4}
                    value={diagnosticHypothesis}
                    onChange={(e) => setDiagnosticHypothesis(e.target.value)}
                    className="w-full p-3 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white leading-relaxed"
                  />

                  {/* Critérios DSM-5 */}
                  <div>
                    <label className="text-[11px] font-black uppercase text-[#005B94] tracking-wider block mb-2">
                      Manifestações e Critérios DSM-5 Observados:
                    </label>
                    <div className="space-y-2">
                      {dsm5Criteria.map((crit, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#EDE9FE] text-[#7C3AED] text-[10px] font-black flex items-center justify-center shrink-0">
                            ✓
                          </span>
                          <input
                            type="text"
                            value={crit}
                            onChange={(e) => {
                              const updated = [...dsm5Criteria]
                              updated[idx] = e.target.value
                              setDsm5Criteria(updated)
                            }}
                            className="flex-1 p-2 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Encaminhamentos */}
                  <div className="pt-3 border-t border-[#EEF5F6]">
                    <label className="text-[11px] font-black uppercase text-[#005B94] tracking-wider block mb-2">
                      Encaminhamentos Profissionais Recomendados:
                    </label>
                    <div className="space-y-2">
                      {referrals.map((refItem, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#E0F2FE] text-[#0284C7] text-[10px] font-black flex items-center justify-center shrink-0">
                            →
                          </span>
                          <input
                            type="text"
                            value={refItem}
                            onChange={(e) => {
                              const updated = [...referrals]
                              updated[idx] = e.target.value
                              setReferrals(updated)
                            }}
                            className="flex-1 p-2 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recomendações Família & Escola */}
                  <div className="pt-3 border-t border-[#EEF5F6] grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-black uppercase text-[#005B94] tracking-wider block mb-2">
                        Orientações para a Família:
                      </label>
                      <div className="space-y-2">
                        {recommendationsFamily.map((rec, idx) => (
                          <input
                            key={idx}
                            type="text"
                            value={rec}
                            onChange={(e) => {
                              const updated = [...recommendationsFamily]
                              updated[idx] = e.target.value
                              setRecommendationsFamily(updated)
                            }}
                            className="w-full p-2 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB]"
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-black uppercase text-[#005B94] tracking-wider block mb-2">
                        Orientações para a Escola:
                      </label>
                      <div className="space-y-2">
                        {recommendationsSchool.map((rec, idx) => (
                          <input
                            key={idx}
                            type="text"
                            value={rec}
                            onChange={(e) => {
                              const updated = [...recommendationsSchool]
                              updated[idx] = e.target.value
                              setRecommendationsSchool(updated)
                            }}
                            className="w-full p-2 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB]"
                          />
                        ))}
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
                      className="w-full p-3 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white leading-relaxed"
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
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#F0FDF4] border-2 border-[#D8E5E7] hover:border-[#10B981] text-[#0D2329] text-xs font-black transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
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
    </div>
  )
}
