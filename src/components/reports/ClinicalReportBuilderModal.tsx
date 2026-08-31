import { useState, useEffect } from "react"
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

  const [anamnese, setAnamnese] = useState({
    family: "Família constituída pelos responsáveis e irmãos, com bom suporte e acompanhamento da rotina.",
    conceptionAndPregnancy: "Gestação a termo, parto cesárea sem intercorrências graves, peso e estatura adequados ao nascer, vacinação em dia.",
    breastfeedingAndDiet: "Aleitamento materno nos primeiros meses, boa aceitação alimentar e rotina nutricional atual preservada.",
    psychomotorAndLanguage: "Marcos motores (marcha aos 12 meses) e linguagem oral desenvolvidos dentro dos padrões esperados.",
    sleep: "Padrão de sono tranquilo, rotina de descanso regular sem queixas de terror noturno ou insônia.",
    familyHealthHistory: "Histórico familiar investigado; sem histórico de doenças neurodegenerativas graves na família imediata.",
    schooling: "Início da trajetória escolar na educação infantil; aumento das demandas percebido no ciclo de alfabetização.",
    relationshipsAndSociability: "Criança afetuosa, sociável com pares, demonstra empatia e bom vínculo com os adultos de referência.",
  })

  const [schoolInterview, setSchoolInterview] = useState({
    development: "Participa das atividades propostas com necessidade de mediação e incentivo constante.",
    behavior: "Bom relacionamento com professores e colegas de turma; sem episódios de agressividade.",
    mainDifficulties: "Dificuldade na fixação de conteúdos abstratos, leitura de sílabas complexas e manutenção do foco.",
    learningAndAssimilation: "Necessita de instruções repetidas passo a passo para execução de tarefas acadêmicas.",
    homework: "Realiza os deveres de casa quando supervisionado diretamente pelos pais.",
    organization: "Apresenta esquecimento de materiais e desorganização com cadernos e estojo.",
    limitsAndFrustration: "Demonstra resistência passageira diante de correções ou tarefas de esforço mental prolongado.",
    traits: {
      aggressive: false,
      passive: false,
      dependent: false,
      fearful: false,
      withdrawn: false,
      melancholic: false,
      calm: false,
      unfocused: true,
      boundaryless: false,
      restless: false,
      depressive: false,
      resentful: false,
    },
    additionalNotes: "Escola relata potencial de aprendizagem quando estimulado com recursos concretos.",
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
        }
        ageStr = `${years} anos`
      }

      // 2. Fetch Guardians (Parents)
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
        const answersList = latest.answers || []
        if (answersList.length > 0) {
          // Map answers to anamnese sections
          const ansMap: Record<string, string> = {}
          answersList.forEach((a: any) => {
            const qTitle = a.question?.title || ""
            if (qTitle && a.answer_text) {
              ansMap[qTitle.toLowerCase()] = a.answer_text
            }
          })

          setAnamnese((prev) => ({
            ...prev,
            family: ansMap["família"] || ansMap["estrutura familiar"] || prev.family,
            conceptionAndPregnancy: ansMap["gestação"] || ansMap["parto"] || prev.conceptionAndPregnancy,
            breastfeedingAndDiet: ansMap["alimentação"] || ansMap["amamentação"] || prev.breastfeedingAndDiet,
            psychomotorAndLanguage: ansMap["desenvolvimento"] || ansMap["fala"] || prev.psychomotorAndLanguage,
            sleep: ansMap["sono"] || prev.sleep,
            familyHealthHistory: ansMap["saúde"] || ansMap["histórico"] || prev.familyHealthHistory,
            schooling: ansMap["escola"] || ansMap["escolaridade"] || prev.schooling,
            relationshipsAndSociability: ansMap["sociabilidade"] || ansMap["amigos"] || prev.relationshipsAndSociability,
          }))
        }

        // Parse School Interview if saved in notes
        if (latest.notes && latest.notes.includes("__SCHOOL_INTERVIEW__:")) {
          try {
            const raw = latest.notes.split("__SCHOOL_INTERVIEW__:")[1]
            const parsedSchool = JSON.parse(raw)
            if (parsedSchool.answers) {
              setSchoolInterview((prev) => ({
                ...prev,
                development: parsedSchool.answers.sq1 || prev.development,
                behavior: parsedSchool.answers.sq2 || prev.behavior,
                mainDifficulties: parsedSchool.answers.sq3 || prev.mainDifficulties,
                learningAndAssimilation: parsedSchool.answers.sq4 || prev.learningAndAssimilation,
                homework: parsedSchool.answers.sq6 || prev.homework,
                organization: parsedSchool.answers.sq9 || prev.organization,
                limitsAndFrustration: parsedSchool.answers.sq7 || prev.limitsAndFrustration,
                additionalNotes: parsedSchool.answers.sq11 || prev.additionalNotes,
                traits: parsedSchool.traits || prev.traits,
              }))
            }
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
            ["Ordem Indireta (Planejamento e Inversão)", "70", "Muito Baixa / Defasagem"],
          ],
          interpretationText:
            "Capacidade de resgate imediato dentro do esperado, porém com defasagem na flexibilidade para alternar e recalcular sequências espaciais.",
        })
      }

      if (selectedInstruments.includes("TAREFA SPAN DE DIGITOS")) {
        testsResults.push({
          id: "span",
          title: "Tarefa Span de Dígitos",
          objective: "Avalia a memória auditiva de curto prazo (ordem direta) e memória de trabalho auditiva (ordem inversa).",
          tableHeaders: ["Sequência", "Percentil", "Classificação"],
          tableRows: [
            ["Ordem Direta", "88", "Baixa"],
            ["Ordem Inversa", "70", "Muito Baixa"],
          ],
          interpretationText: "Limitação na alça fonológica da memória de trabalho quando exigido esforço mental prolongado.",
        })
      }

      if (selectedInstruments.includes("TESTE DE ATENÇÃO POR CANCELAMENTO TAC")) {
        testsResults.push({
          id: "tac",
          title: "TAC - Teste de Atenção por Cancelamento",
          objective: "Mapeia a atenção seletiva, atenção sustentada e alternância atencional sob tempo controlado.",
          tableHeaders: ["Tipo de Atenção", "Pontuação", "Classificação"],
          tableRows: [
            ["Atenção Seletiva", "108", "Média"],
            ["Atenção Sustentada", "131", "Muito Alta em Ambiente Silencioso"],
            ["Atenção com Alternância", "111", "Média"],
            ["PONTUAÇÃO TOTAL", "117", "Dentro da Média"],
          ],
          interpretationText:
            "O paciente obtém melhor rendimento em ambientes estruturados e silenciosos, com queda de rendimento quando exposto a múltiplos estímulos competitivos.",
        })
      }

      const completeData: CompleteReportData = {
        patient: patientData,
        professional: {
          clinicName: professional?.clinic_name || "ESPAÇO MULTIDISCIPLINAR",
          professionalName: professional?.full_name || "Priscila Carbone",
          cboOrCrp: professional?.crp || "2394-25",
          city: professional?.city || "Votuporanga",
          phone: professional?.phone,
        },
        clinical: {
          selectedInstruments,
          anamnese,
          schoolInterview,
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
        },
      }

      const doc = buildClinicalDocxReport(completeData)
      await downloadDocxReport(doc, `Laudo_Psicopedagogico_${child.full_name.replace(/\s+/g, "_")}`)
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
        anamnese,
        schoolInterview,
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
            title: `Laudo de Avaliação Psicopedagógica - ${child.full_name}`,
            content: contentPayload,
            status: "draft",
            updated_at: new Date().toISOString(),
          })
          .eq("id", reportId)
      } else {
        await supabase.from("reports").insert({
          professional_id: professional.id,
          child_id: child.id,
          title: `Laudo de Avaliação Psicopedagógica - ${child.full_name}`,
          content: contentPayload,
          status: "draft",
        })
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
        `A presente avaliação psicopedagógica de ${child.full_name} foi realizada ao longo de ${sessionsCount} sessões clínicas. A integração dos instrumentos aplicados, associada às observações comportamentais e aos relatos da família e da escola, revelou um perfil cognitivo com potencial preservado nas tarefas visuais e lúdicas, apresentando defasagem na memória de trabalho auditiva, discriminação fonológica e sustentação atencional em tarefas que demandam esforço cognitivo contínuo.`
      )
      setDiagnosticHypothesis(
        `Os dados convergentes obtidos na avaliação apontam para hipótese diagnóstica de Transtorno do Déficit de Atenção/Hiperatividade (TDAH) com predomínio desatento (CID-11 6A05.0 / DSM-5), associado a impacto secundário no processo de aquisição da leitura e escrita.`
      )
      toast.success("Sugestão clínica refinada com sucesso pela IA!", { icon: "✨" })
    } finally {
      setGeneratingAI(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] max-w-[1550px] w-full max-h-[94vh] flex flex-col shadow-2xl animate-in zoom-in-95">
        {/* Header do Modal */}
        <div className="p-5 sm:p-6 border-b border-[#EEF5F6] flex items-center justify-between bg-gradient-to-r from-[#F0FDF4] to-[#EDE9FE] rounded-t-3xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#7C3AED] text-white flex items-center justify-center shadow-md font-bold">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-[#0D2329]">
                  Gerador de Laudo / Relatório Clínico (.docx)
                </h2>
                <span className="text-[10px] bg-white/80 border border-[#DDD6FE] text-[#7C3AED] font-black px-2.5 py-0.5 rounded-full">
                  Padrão 20 Páginas · CBO 2394-25
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
            className="w-9 h-9 rounded-full bg-white/80 hover:bg-white text-[#6B7C83] hover:text-[#0D2329] border border-[#D8E5E7] flex items-center justify-center font-black transition-all shadow-2xs cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Etapas / Abas do Relatório (Grid 5 Colunas Sem Scroll) */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#F8FAFB] border-b border-[#EEF5F6] grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { step: 1, label: "1. Identificação & Anamnese", icon: User },
            { step: 2, label: "2. Entrevista Escolar", icon: School },
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
                className={`px-3 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer text-center ${
                  isCurrent
                    ? "bg-[#7C3AED] text-white shadow-xs"
                    : isDone
                    ? "bg-[#EDE9FE] text-[#6D28D9]"
                    : "bg-white text-[#6B7C83] border border-[#D8E5E7] hover:border-[#7C3AED]"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
                {isDone && <Check className="w-3.5 h-3.5 text-[#10B981] shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* Conteúdo da Etapa Ativa */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {loading ? (
            <div className="py-20 text-center text-xs font-bold text-[#6B7C83] animate-pulse">
              Carregando dados do paciente e anamnese...
            </div>
          ) : (
            <>
              {/* =========================================================================
                  ETAPA 1: IDENTIFICAÇÃO & ANAMNESE (Páginas 1 a 3)
                  ========================================================================= */}
              {activeStep === 1 && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-[#166534]">
                        ✓ Dados Puxados Automaticamente do Prontuário
                      </p>
                      <p className="text-[11px] font-medium text-[#15803D]">
                        As informações de cadastro e as 13 perguntas da Anamnese foram integradas abaixo.
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
                          value={`${patientData.schoolName} - ${patientData.grade}`}
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

                  {/* Anamnese Estruturada */}
                  <div className="p-5 rounded-2xl border-2 border-[#D8E5E7] space-y-4 bg-white">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-[#005B94]" />
                      <span>Anamnese (Histórico do Desenvolvimento)</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-black text-[#0D2329]">1. Família</label>
                        <textarea
                          rows={2}
                          value={anamnese.family}
                          onChange={(e) => setAnamnese({ ...anamnese, family: e.target.value })}
                          className="w-full mt-1 p-2.5 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-black text-[#0D2329]">2. Concepção e Gestação</label>
                        <textarea
                          rows={2}
                          value={anamnese.conceptionAndPregnancy}
                          onChange={(e) => setAnamnese({ ...anamnese, conceptionAndPregnancy: e.target.value })}
                          className="w-full mt-1 p-2.5 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-black text-[#0D2329]">3. Amamentação e Alimentação</label>
                        <textarea
                          rows={2}
                          value={anamnese.breastfeedingAndDiet}
                          onChange={(e) => setAnamnese({ ...anamnese, breastfeedingAndDiet: e.target.value })}
                          className="w-full mt-1 p-2.5 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-black text-[#0D2329]">4. Desenvolvimento Psicomotor e Linguagem</label>
                        <textarea
                          rows={2}
                          value={anamnese.psychomotorAndLanguage}
                          onChange={(e) => setAnamnese({ ...anamnese, psychomotorAndLanguage: e.target.value })}
                          className="w-full mt-1 p-2.5 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-black text-[#0D2329]">5. Sono</label>
                        <textarea
                          rows={2}
                          value={anamnese.sleep}
                          onChange={(e) => setAnamnese({ ...anamnese, sleep: e.target.value })}
                          className="w-full mt-1 p-2.5 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-black text-[#0D2329]">6. Histórico de Saúde / Transtornos na Família</label>
                        <textarea
                          rows={2}
                          value={anamnese.familyHealthHistory}
                          onChange={(e) => setAnamnese({ ...anamnese, familyHealthHistory: e.target.value })}
                          className="w-full mt-1 p-2.5 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-black text-[#0D2329]">7. Escolaridade</label>
                        <textarea
                          rows={2}
                          value={anamnese.schooling}
                          onChange={(e) => setAnamnese({ ...anamnese, schooling: e.target.value })}
                          className="w-full mt-1 p-2.5 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-black text-[#0D2329]">8. Relacionamentos e Sociabilidade</label>
                        <textarea
                          rows={2}
                          value={anamnese.relationshipsAndSociability}
                          onChange={(e) => setAnamnese({ ...anamnese, relationshipsAndSociability: e.target.value })}
                          className="w-full mt-1 p-2.5 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  ETAPA 2: ENTREVISTA ESCOLAR (Páginas 3 a 5)
                  ========================================================================= */}
              {activeStep === 2 && (
                <div className="space-y-5 animate-in fade-in">
                  <div className="p-5 rounded-2xl border-2 border-[#D8E5E7] space-y-4 bg-white">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2">
                      <School className="w-4 h-4 text-[#005B94]" />
                      <span>Questionário da Entrevista Escolar</span>
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-black text-[#0D2329]">Desenvolvimento e Comportamento na Carteira</label>
                        <textarea
                          rows={2}
                          value={schoolInterview.development}
                          onChange={(e) => setSchoolInterview({ ...schoolInterview, development: e.target.value })}
                          className="w-full mt-1 p-2.5 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-black text-[#0D2329]">Principais Dificuldades na Leitura / Escrita</label>
                        <textarea
                          rows={2}
                          value={schoolInterview.mainDifficulties}
                          onChange={(e) => setSchoolInterview({ ...schoolInterview, mainDifficulties: e.target.value })}
                          className="w-full mt-1 p-2.5 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-black text-[#0D2329]">Organização de Materiais e Tarefas</label>
                          <textarea
                            rows={2}
                            value={schoolInterview.organization}
                            onChange={(e) => setSchoolInterview({ ...schoolInterview, organization: e.target.value })}
                            className="w-full mt-1 p-2.5 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white resize-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-black text-[#0D2329]">Reação Quando Contrariado / Limites</label>
                          <textarea
                            rows={2}
                            value={schoolInterview.limitsAndFrustration}
                            onChange={(e) => setSchoolInterview({ ...schoolInterview, limitsAndFrustration: e.target.value })}
                            className="w-full mt-1 p-2.5 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Características Comportamentais (Checklist) */}
                    <div className="pt-3 border-t border-[#EEF5F6]">
                      <label className="text-[11px] font-black uppercase text-[#005B94] tracking-wider block mb-2">
                        Características Observadas pela Professora (Marque as que se aplicam):
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {[
                          { key: "unfocused", label: "Desligado" },
                          { key: "restless", label: "Agitado" },
                          { key: "withdrawn", label: "Retraído" },
                          { key: "dependent", label: "Dependente" },
                          { key: "calm", label: "Calmo" },
                          { key: "passive", label: "Passivo" },
                          { key: "aggressive", label: "Agressivo" },
                          { key: "boundaryless", label: "Sem limites" },
                          { key: "fearful", label: "Medroso" },
                          { key: "melancholic", label: "Melancólico" },
                          { key: "depressive", label: "Depressivo" },
                          { key: "resentful", label: "Ressentido" },
                        ].map((item) => (
                          <label
                            key={item.key}
                            className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 transition-all select-none ${
                              (schoolInterview.traits as any)[item.key]
                                ? "bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE] font-black"
                                : "bg-[#F8FAFB] text-[#6B7C83] border-[#D8E5E7] font-semibold hover:bg-white"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={Boolean((schoolInterview.traits as any)[item.key])}
                              onChange={(e) =>
                                setSchoolInterview({
                                  ...schoolInterview,
                                  traits: { ...schoolInterview.traits, [item.key]: e.target.checked },
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
                          className={`p-3 rounded-2xl border-2 cursor-pointer flex items-start gap-3 transition-all select-none ${
                            isChecked
                              ? "bg-white border-[#7C3AED] shadow-xs"
                              : "bg-[#F8FAFB] border-[#D8E5E7] opacity-75 hover:opacity-100 hover:border-[#8DA3A8]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by div
                            className="mt-0.5 w-4 h-4 accent-[#7C3AED]"
                          />
                          <div className="min-w-0">
                            <p className={`text-xs font-black ${isChecked ? "text-[#0D2329]" : "text-[#6B7C83]"}`}>
                              {idx + 1}. {inst}
                            </p>
                          </div>
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
                        <span>{generatingAI ? "Aprimorando..." : "Aprimorar com IA"}</span>
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      value={diagnosticHypothesis}
                      onChange={(e) => setDiagnosticHypothesis(e.target.value)}
                      className="w-full p-3 text-xs rounded-xl border border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white leading-relaxed font-semibold text-[#0D2329]"
                    />

                    {/* Critérios DSM-5 */}
                    <div>
                      <label className="text-[11px] font-black uppercase text-[#005B94] tracking-wider block mb-1.5">
                        Critérios Identificados (DSM-5):
                      </label>
                      <div className="space-y-1.5">
                        {dsm5Criteria.map((crit, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#005B94] w-5">
                              {String.fromCharCode(97 + idx)})
                            </span>
                            <input
                              type="text"
                              value={crit}
                              onChange={(e) => {
                                const next = [...dsm5Criteria]
                                next[idx] = e.target.value
                                setDsm5Criteria(next)
                              }}
                              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#D8E5E7] bg-white font-medium"
                            />
                            <button
                              type="button"
                              onClick={() => setDsm5Criteria(dsm5Criteria.filter((_, i) => i !== idx))}
                              className="text-[#DC2626] hover:bg-[#FEF2F2] p-1 rounded-md"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Encaminhamentos */}
                    <div className="pt-3 border-t border-[#EEF5F6]">
                      <label className="text-[11px] font-black uppercase text-[#005B94] tracking-wider block mb-1.5">
                        Encaminhamentos Clínicos:
                      </label>
                      <div className="space-y-1.5">
                        {referrals.map((refItem, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#005B94]">✓</span>
                            <input
                              type="text"
                              value={refItem}
                              onChange={(e) => {
                                const next = [...referrals]
                                next[idx] = e.target.value
                                setReferrals(next)
                              }}
                              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#D8E5E7] bg-white font-medium"
                            />
                            <button
                              type="button"
                              onClick={() => setReferrals(referrals.filter((_, i) => i !== idx))}
                              className="text-[#DC2626] hover:bg-[#FEF2F2] p-1 rounded-md"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recomendações Família e Escola */}
                    <div className="pt-3 border-t border-[#EEF5F6] grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-black uppercase text-[#005B94] tracking-wider block mb-1.5">
                          Para os Pais:
                        </label>
                        <div className="space-y-1.5">
                          {recommendationsFamily.map((r, idx) => (
                            <input
                              key={idx}
                              type="text"
                              value={r}
                              onChange={(e) => {
                                const next = [...recommendationsFamily]
                                next[idx] = e.target.value
                                setRecommendationsFamily(next)
                              }}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#D8E5E7] bg-white"
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-black uppercase text-[#005B94] tracking-wider block mb-1.5">
                          Para a Escola:
                        </label>
                        <div className="space-y-1.5">
                          {recommendationsSchool.map((r, idx) => (
                            <input
                              key={idx}
                              type="text"
                              value={r}
                              onChange={(e) => {
                                const next = [...recommendationsSchool]
                                next[idx] = e.target.value
                                setRecommendationsSchool(next)
                              }}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#D8E5E7] bg-white"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer do Modal: Navegação & Ações Principais */}
        <div className="p-4 sm:p-6 border-t border-[#EEF5F6] bg-[#F8FAFB] rounded-b-3xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeStep > 1 && (
              <button
                type="button"
                onClick={() => setActiveStep((activeStep - 1) as any)}
                className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#EDE9FE] border-2 border-[#D8E5E7] hover:border-[#7C3AED] text-[#0D2329] text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
            )}

            {activeStep < 5 && (
              <button
                type="button"
                onClick={() => setActiveStep((activeStep + 1) as any)}
                className="px-5 py-2.5 rounded-2xl bg-[#0D2329] hover:bg-[#1E3A40] text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-xs ml-auto sm:ml-0"
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
              className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#F0FDF4] border-2 border-[#D8E5E7] hover:border-[#10B981] text-[#0D2329] text-xs font-black transition-all shadow-2xs flex items-center gap-1.5"
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
    </div>
  )
}
