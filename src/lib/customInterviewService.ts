import { supabase } from "@/lib/supabase"

export interface InterviewQuestionItem {
  id: string
  num: number
  title: string
  placeholder: string
}

export const DEFAULT_FAMILY_QUESTIONS: InterviewQuestionItem[] = [
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

export const DEFAULT_SCHOOL_QUESTIONS: InterviewQuestionItem[] = [
  {
    id: "sq1",
    num: 1,
    title: "Como é o desenvolvimento do aluno na sala de aula?",
    placeholder: "Descreva o ritmo de aprendizagem, participação e realização das propostas...",
  },
  {
    id: "sq2",
    num: 2,
    title: "Como é o comportamento do aluno na sala de aula?",
    placeholder: "Relacionamento com a professora e colegas, respeito às regras da sala...",
  },
  {
    id: "sq3",
    num: 3,
    title: "Quais as principais dificuldades apresentadas pelo aluno?",
    placeholder: "Leitura, escrita, matemática, raciocínio lógico, foco ou atenção...",
  },
  {
    id: "sq4",
    num: 4,
    title: "Quais as suas características quanto à aprendizagem e assimilação de conteúdos?",
    placeholder: "Dificuldade na memorização, fixação de sílabas, compreensão de instruções...",
  },
  {
    id: "sq5",
    num: 5,
    title: "Faz as atividades escolares?",
    placeholder: "Conclui no tempo esperado, necessita de cobrança constante, desiste fácil...",
  },
  {
    id: "sq6",
    num: 6,
    title: "Faz as atividades para casa?",
    placeholder: "Traz os deveres feitos com regularidade, esquece os cadernos...",
  },
  {
    id: "sq7",
    num: 7,
    title: "Como reage quando é contrariado?",
    placeholder: "Aceita correções, chora, fecha a cara, reage com agressividade ou passividade...",
  },
  {
    id: "sq8",
    num: 8,
    title: "Tem dificuldade de trabalhar em grupo? Como se manifesta esta dificuldade?",
    placeholder: "Isola-se, quer impor suas ideias, colabora bem com os colegas...",
  },
  {
    id: "sq9",
    num: 9,
    title: "Tem dificuldade em organizar suas tarefas e atividades pessoais?",
    placeholder: "Organização da mochila, estojo, caderno de recados, cuidar dos seus pertences...",
  },
  {
    id: "sq10",
    num: 10,
    title: "Os colegas da turma o evitam?",
    placeholder: "É aceito no recreio e nos jogos, sofre rejeição ou prefere ficar sozinho...",
  },
  {
    id: "sq11",
    num: 11,
    title: "Relate qualquer informação que não tenha sido abordada ou que julgue importante:",
    placeholder: "Outras observações pedagógicas ou comportamentais relevantes...",
  },
]

// Chaves locais para velocidade e redundância
const FAMILY_STORAGE_PREFIX = "evoluia_custom_family_q_"
const SCHOOL_STORAGE_PREFIX = "evoluia_custom_school_q_"

export function getCustomFamilyQuestions(profId?: string): InterviewQuestionItem[] {
  if (profId) {
    const raw = localStorage.getItem(`${FAMILY_STORAGE_PREFIX}${profId}`)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch (e) {
        console.error("Error reading custom family questions:", e)
      }
    }
  }
  return DEFAULT_FAMILY_QUESTIONS
}

export function saveCustomFamilyQuestions(profId: string, questions: InterviewQuestionItem[]): void {
  const normalized = questions.map((q, idx) => ({ ...q, num: idx + 1 }))
  localStorage.setItem(`${FAMILY_STORAGE_PREFIX}${profId}`, JSON.stringify(normalized))
}

export function resetCustomFamilyQuestions(profId: string): InterviewQuestionItem[] {
  localStorage.removeItem(`${FAMILY_STORAGE_PREFIX}${profId}`)
  return DEFAULT_FAMILY_QUESTIONS
}

export function getCustomSchoolQuestions(profId?: string): InterviewQuestionItem[] {
  if (profId) {
    const raw = localStorage.getItem(`${SCHOOL_STORAGE_PREFIX}${profId}`)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch (e) {
        console.error("Error reading custom school questions:", e)
      }
    }
  }
  return DEFAULT_SCHOOL_QUESTIONS
}

export function saveCustomSchoolQuestions(profId: string, questions: InterviewQuestionItem[]): void {
  const normalized = questions.map((q, idx) => ({ ...q, num: idx + 1 }))
  localStorage.setItem(`${SCHOOL_STORAGE_PREFIX}${profId}`, JSON.stringify(normalized))
}

export function resetCustomSchoolQuestions(profId: string): InterviewQuestionItem[] {
  localStorage.removeItem(`${SCHOOL_STORAGE_PREFIX}${profId}`)
  return DEFAULT_SCHOOL_QUESTIONS
}
