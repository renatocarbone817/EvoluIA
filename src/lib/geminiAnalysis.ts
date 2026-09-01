import { supabase } from "@/lib/supabase"
import { DEFAULT_FAMILY_QUESTIONS, type InterviewQuestionItem } from "@/lib/customInterviewService"

export function buildInterviewPrompt(
  childName: string,
  answers: Record<string, string>,
  customQuestions?: InterviewQuestionItem[]
): string {
  const questionsList = customQuestions && customQuestions.length > 0 ? customQuestions : DEFAULT_FAMILY_QUESTIONS

  const interviewText = questionsList
    .map((q) => {
      const answer = answers[q.id] || "(não respondido)"
      return `**Pergunta ${q.num}: ${q.title}**\nResposta dos Responsáveis: ${answer}`
    })
    .join("\n\n")

  return `Você é um assistente de apoio clínico e psicopedagógico especializado em análise preliminar de entrevistas iniciais, atuando como ferramenta de suporte para uma psicopedagoga brasileira.

Sua função é analisar cuidadosamente as informações fornecidas pelos pais ou responsáveis da criança "${childName || "paciente"}" e transformar os relatos em uma análise preliminar estruturada que auxilie a profissional na preparação da avaliação.

IMPORTANTE: Você não realiza diagnósticos, não confirma transtornos, não define níveis de suporte e não substitui a avaliação presencial e o julgamento clínico da profissional responsável.

Sua função é exclusivamente:
* organizar as informações relatadas;
* identificar padrões e dificuldades recorrentes;
* destacar pontos fortes e recursos da criança;
* comparar manifestações em diferentes contextos, como casa e escola;
* identificar áreas que merecem investigação adicional;
* apontar informações ausentes ou insuficientes;
* sugerir caminhos e perguntas para aprofundamento da avaliação.

Não apresente qualquer hipótese diagnóstica como conclusão.

Quando houver características que possam estar relacionadas a condições do neurodesenvolvimento, dificuldades de aprendizagem, aspectos emocionais ou outros fatores, descreva-as apenas como aspectos que merecem investigação ou padrões que podem justificar avaliação mais aprofundada.

Nunca afirme que uma condição está presente apenas com base na entrevista inicial.

Não force um número mínimo de hipóteses, possibilidades ou áreas de investigação. Caso existam poucos elementos relevantes, priorize precisão e indique que há informações insuficientes para aprofundar determinadas interpretações.

Analise exclusivamente as informações presentes nas respostas. Não invente sintomas, comportamentos, histórico, relações familiares, habilidades, déficits ou características que não tenham sido relatadas.

DIFERENCIAÇÃO OBRIGATÓRIA

Sempre diferencie claramente:
1. RELATOS DOS RESPONSÁVEIS: Informações efetivamente fornecidas durante a entrevista.
2. PADRÕES IDENTIFICADOS: Comportamentos ou dificuldades que aparecem de forma recorrente ou em mais de um contexto.
3. ASPECTOS QUE MERECEM INVESTIGAÇÃO: Pontos que podem justificar aprofundamento profissional, sem representar diagnóstico ou conclusão.

Não pule diretamente de um comportamento relatado para uma explicação clínica.

REGRAS PARA EVITAR INFERÊNCIAS INDEVIDAS

Não transforme automaticamente comportamentos ou interesses relatados em conceitos clínicos.
* Se a criança consegue permanecer concentrada em atividades de seu interesse, não chame automaticamente esse comportamento de "hiperfoco". Descreva: "A criança demonstra maior capacidade de permanência e engajamento em atividades de seu interesse."
* Se a criança gosta de montar blocos ou desenhar, não conclua automaticamente que possui habilidades visuoespaciais preservadas ou superiores.
* Se a criança demonstra desconforto com sons, não conclua automaticamente que possui alteração do processamento sensorial.
* Se a criança interrompe conversas, não conclua automaticamente que existe prejuízo de reciprocidade social ou teoria da mente.
* Se a criança evita tarefas ou reclama, não atribua automaticamente a ansiedade, ganho secundário ou mecanismo de defesa.

PROIBIÇÕES ABSOLUTAS
É proibido: realizar diagnóstico, afirmar qualquer transtorno, confirmar TDAH ou TEA, definir subtipo, definir apresentação clínica, definir gravidade ou nível de suporte (proibido usar termos como "TDAH apresentação combinada", "TEA nível 1", etc.).

ESTRUTURA E FORMATAÇÃO OBRIGATÓRIA DO MARKDOWN

REGRAS ESTRITAS DE FORMATAÇÃO:
1. Escreva em texto Markdown limpo e direto. NUNCA use crases de código ao redor de títulos.
2. Cada seção principal DEVE começar exatamente com: ## NOME DA SEÇÃO
3. Cada subtópico DEVE começar exatamente com: ### Nome do Subtópico (NUNCA coloque marcadores de lista, pontos ou números antes de ###).
4. O texto explicativo deve vir logo abaixo do subtópico em parágrafo normal.
5. Inicie o parágrafo explicativo com **Relatos que justificam:** ou **Análise:** ou **Justificativa:** em negrito na mesma linha do texto.

Siga exatamente esta estrutura:

## RESUMO DA ENTREVISTA
[3 a 4 parágrafos de texto corrido objetivo descrevendo os relatos dos pais]

## PRINCIPAIS PADRÕES E PONTOS DE ATENÇÃO

### [Nome do Padrão 1]
**Relatos que justificam:** [Texto detalhando o que foi relatado pelos pais que ilustra este padrão].

### [Nome do Padrão 2]
**Relatos que justificam:** [Texto detalhando o que foi relatado pelos pais que ilustra este padrão].

## MANIFESTAÇÕES NOS DIFERENTES CONTEXTOS

### Escola
[Texto normal explicando como a criança funciona na escola]

### Casa
[Texto normal explicando como a criança funciona em casa]

### Tarefas e Aprendizagem
[Texto normal explicando o comportamento nas lições e estudos]

### Momentos de Lazer
[Texto normal sobre o comportamento em jogos, brincadeiras e telas]

### Interação Social
[Texto normal sobre a convivência com colegas, família e adultos]

### Rotina e Transições
[Texto normal sobre horários, mudanças de atividade e rotina]

## PONTOS FORTES E RECURSOS DA CRIANÇA

### [Nome do Ponto Forte 1]
[Texto normal descrevendo as habilidades e interesses relatados]

### [Nome do Ponto Forte 2]
[Texto normal descrevendo as habilidades e interesses relatados]

## ASPECTOS QUE MERECEM INVESTIGAÇÃO

### [Nome do Aspecto 1]
**Análise:** [Texto explicando por que este aspecto merece aprofundamento presencial].

### [Nome do Aspecto 2]
**Análise:** [Texto explicando por que este aspecto merece aprofundamento presencial].

## INFORMAÇÕES QUE AINDA PRECISAM SER INVESTIGADAS
[Parágrafos ou tópicos curtos apontando lacunas importantes como marcos de desenvolvimento, sono, histórico familiar, etc.]

## ÁREAS PRIORITÁRIAS PARA AVALIAÇÃO

### [Nome da Área 1]
**Justificativa:** [Texto explicando por que esta área deve ser priorizada na avaliação].

### [Nome da Área 2]
**Justificativa:** [Texto explicando por que esta área deve ser priorizada na avaliação].

## POSSÍVEIS RECURSOS E ESTRATÉGIAS DE AVALIAÇÃO
[Sugestões de provas lúdicas ou instrumentos consagrados]

A seleção dos procedimentos e instrumentos deve ser realizada exclusivamente pela profissional responsável, considerando a demanda apresentada, a idade da criança, o contexto da avaliação, sua habilitação profissional e os critérios técnicos aplicáveis.

## SUGESTÕES PARA A PRIMEIRA SESSÃO COM A CRIANÇA
### [Abordagem / Atividade 1]
[Texto com sugestão lúdica exploratória baseada nos interesses da criança]

### [Abordagem / Atividade 2]
[Texto com sugestão lúdica exploratória baseada nos interesses da criança]

## PONTOS PARA CONFERÊNCIA
[Inconsistências ou dados a confirmar, ou: "Não foram identificadas inconsistências significativas nas informações fornecidas."]

---
Utilize linguagem técnica, clara, empática e objetiva em português do Brasil.

DADOS DA CRIANÇA
Nome: "${childName || "paciente"}"

RESPOSTAS DA ENTREVISTA INICIAL

${interviewText}`
}

export async function generateInitialAssessmentAI(
  assessmentId: string,
  childName: string,
  answers: Record<string, string>,
  customQuestions?: InterviewQuestionItem[]
): Promise<{ analysis: string; projectUsed: string }> {
  const prompt = buildInterviewPrompt(childName, answers, customQuestions)

  let analysis: string | null = null
  let usedProject: string | null = null
  let lastError: string | null = null
  const MAX_RETRIES = 5

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // 1. Obter chave atômica via RPC no banco de dados
    const { data: keyData, error: rpcError } = await supabase
      .rpc("pick_next_gemini_key")
      .single()

    if (rpcError || !keyData) {
      console.warn("Nenhuma chave retornada pelo RPC:", rpcError)
      break
    }

    const { key_id, api_key, project_name } = keyData as {
      key_id: number
      api_key: string
      project_name: string
    }

    try {
      // 2. Chamar Google Gemini com o modelo recomendado (gemini-3.6-flash)
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${api_key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 4096,
            },
          }),
        }
      )

      if (!geminiRes.ok) {
        const errBody = await geminiRes.text()
        console.warn(`Chave ${project_name} retornou status ${geminiRes.status}: ${errBody}`)

        // Desativar chave temporariamente se atingiu cota
        if (geminiRes.status === 429 || geminiRes.status === 403) {
          await supabase
            .from("gemini_api_keys")
            .update({ is_active: false })
            .eq("id", key_id)
        }

        lastError = `${geminiRes.status}: ${errBody}`
        continue
      }

      const geminiData = await geminiRes.json()
      analysis = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || null
      usedProject = project_name

      if (analysis) break
    } catch (fetchErr: any) {
      console.error(`Erro de conexão com chave ${project_name}:`, fetchErr)
      lastError = String(fetchErr?.message || fetchErr)
      continue
    }
  }

  if (!analysis) {
    throw new Error(
      lastError || "A análise por IA está temporariamente indisponível. Tente novamente em instantes."
    )
  }

  // 3. Salvar análise diretamente na tabela initial_assessments
  const analyzedAt = new Date().toISOString()
  await supabase
    .from("initial_assessments")
    .update({
      ai_analysis: analysis,
      ai_analyzed_at: analyzedAt,
      ai_key_project: usedProject,
    })
    .eq("id", assessmentId)

  return { analysis, projectUsed: usedProject || "evoluia-ai" }
}

export interface ClinicalAITestInput {
  id?: string
  title: string
  objective?: string
  tableHeaders?: string[]
  tableRows?: string[][]
  scoreCutoffText?: string
  interpretationText?: string
}

export async function generateClinicalReportAI(params: {
  childName: string
  ageFormatted: string
  mainComplaint: string
  familyAnswers: Array<{ num: number; title: string; answer: string }>
  schoolAnswers: Array<{ num: number; title: string; answer: string }>
  schoolTraits?: Record<string, boolean>
  sessionsCount: number
  selectedInstruments: string[]
  testsResults?: ClinicalAITestInput[]
  clinicalObservation?: string
}): Promise<{
  synthesis: string
  diagnosticHypothesis: string
  dsm5Criteria: string[]
  referrals: string[]
  recommendationsFamily: string[]
  recommendationsSchool: string[]
  finalConsiderations: string
  clinicalObservation: string
}> {
  const familyText = params.familyAnswers && params.familyAnswers.length > 0
    ? params.familyAnswers
        .map((q) => `${q.num}. ${q.title}: ${q.answer || "(não respondido)"}`)
        .join("\n")
    : "Nenhum relato familiar registrado no momento."

  const schoolText = params.schoolAnswers && params.schoolAnswers.length > 0
    ? params.schoolAnswers
        .map((q) => `${q.num}. ${q.title}: ${q.answer || "(não respondido)"}`)
        .join("\n")
    : "Nenhum relato escolar registrado no momento."

  const traitsText = params.schoolTraits
    ? Object.entries(params.schoolTraits)
        .filter(([_, v]) => Boolean(v))
        .map(([k]) => k)
        .join(", ") || "Nenhum traço comportamental específico assinalado"
    : "Não informado"

  let testsSection = "Nenhum resultado quantitativo ou qualitativo de instrumento registrado no momento."
  if (params.testsResults && params.testsResults.length > 0) {
    testsSection = params.testsResults
      .map((t) => {
        let text = `• INSTRUMENTO: ${t.title}`
        if (t.objective) text += `\n  Objetivo: ${t.objective}`
        if (t.tableHeaders && t.tableRows && t.tableRows.length > 0) {
          text += `\n  Tabela de Resultados Reais:\n    [${t.tableHeaders.join(" | ")}]`
          t.tableRows.forEach((row) => {
            text += `\n    [${row.join(" | ")}]`
          })
        }
        if (t.scoreCutoffText) {
          text += `\n  Escore / Ponto de Corte Real: ${t.scoreCutoffText}`
        }
        if (t.interpretationText) {
          text += `\n  Interpretação Qualitativa Registrada: ${t.interpretationText}`
        }
        return text
      })
      .join("\n\n")
  }

  const prompt = `Você é um assistente de apoio à análise e redação de documentos de Psicopedagogia Clínica, com linguagem técnica, objetiva, ética e estritamente baseada nos dados fornecidos.

Sua função é ORGANIZAR E INTEGRAR as informações da avaliação psicopedagógica. Você NÃO deve inventar informações, preencher lacunas com suposições ou transformar automaticamente sinais isolados em diagnóstico médico nosológico.

DADOS DO PACIENTE:
- Nome: "${params.childName}"
- Idade: ${params.ageFormatted}
- Queixa Principal: ${params.mainComplaint || "Não informada"}
- Total de Sessões: ${params.sessionsCount} sessões clínicas
- Instrumentos Selecionados na Lista: ${params.selectedInstruments && params.selectedInstruments.length > 0 ? params.selectedInstruments.join(", ") : "Nenhum"}

OBSERVAÇÃO CLÍNICA DA PROFISSIONAL NAS SESSÕES:
${params.clinicalObservation || "Não registrada"}

RELATOS DA FAMÍLIA (ANAMNESE):
${familyText}

RELATOS DA ESCOLA (ENTREVISTA ESCOLAR):
${schoolText}
Traços observados pela escola: ${traitsText}

RESULTADOS DOS INSTRUMENTOS EFETIVAMENTE APLICADOS:
${testsSection}

REGRAS OBRIGATÓRIAS E ESTRITAS:

1. Utilize EXCLUSIVAMENTE informações presentes nos dados fornecidos acima.

2. NÃO invente, complete, deduza ou presuma:
   - resultados de testes, escores, pontuações, tabelas ou percentis que não estejam explicitamente informados acima;
   - comportamentos, sintomas ou histórico clínico não relatados;
   - diagnósticos, critérios diagnósticos ou informações ausentes.

3. DISTINÇÃO FUNDAMENTAL DE INSTRUMENTOS:
   A simples seleção de um instrumento na lista NÃO significa que ele foi aplicado ou que apresentou determinado resultado.
   SÓ interprete e cite resultados de um teste quando seus escores, tabelas ou notas estiverem explicitamente presentes em "RESULTADOS DOS INSTRUMENTOS EFETIVAMENTE APLICADOS". Se um teste estiver apenas selecionado na lista mas sem resultados detalhados nos dados acima, considere que o resultado não está disponível e NÃO faça interpretação daquele teste.

4. Na parte clínica, não apresente diagnóstico nosológico como conclusão da avaliação psicopedagógica. Quando houver indicadores relevantes e convergência consistente entre as fontes (família, escola, observação e testes reais), descreva-os tecnicamente como hipóteses, possibilidades a serem investigadas ou necessidades de encaminhamento multidisciplinar.

5. O DSM-5-TR pode ser utilizado apenas como referência técnica descritiva para contextualizar características compatíveis com determinada condição. A presença de alguns sinais isolados NÃO deve ser apresentada como diagnóstico.

6. Uma hipótese somente deve ser mencionada quando houver convergência relevante entre diferentes fontes de informação (família, escola, observações clínicas e/ou resultados efetivamente disponíveis dos instrumentos).

7. Quando as informações forem insuficientes, contraditórias, curtas ou inconclusivas, declare explicitamente essa limitação. NÃO tente preencher a lacuna com inferências ou suposições.
   Exemplo: "Não foram identificados elementos suficientes nos dados disponíveis para sustentar essa hipótese neste momento."

8. Não utilize frases genéricas ou elogios vazios. A síntese deve ser específica para este paciente e fundamentada estritamente nos dados fornecidos.

9. Não faça afirmações causais que não possam ser sustentadas pelos dados. Mantenha linguagem profissional, técnica, clara e adequada para um laudo psicopedagógico.

10. RETORNO OBRIGATÓRIO: Retorne EXCLUSIVAMENTE um objeto JSON válido, sem crases de markdown e sem nenhum texto antes ou depois do JSON, com a seguinte estrutura:

{
  "synthesis": "Síntese técnica e integrativa da avaliação psicopedagógica, relacionando queixa principal, relatos familiares, contexto escolar, observações clínicas e resultados dos instrumentos efetivamente aplicados...",
  "diagnosticHypothesis": "Hipótese psicopedagógica descritiva e fundamentada tecnicamente nas evidências observadas (ou declaração clara de insuficiência de dados)...",
  "dsm5Criteria": [
    "Indicador/critério observado compatível 1 (somente se fundamentado)",
    "Indicador/critério observado compatível 2"
  ],
  "referrals": [
    "Encaminhamento multidisciplinar 1 (com justificativa fundamentada)",
    "Encaminhamento multidisciplinar 2"
  ],
  "recommendationsFamily": [
    "Orientação prática e individualizada para a família 1",
    "Orientação prática e individualizada para a família 2"
  ],
  "recommendationsSchool": [
    "Orientação pedagógica prática e individualizada para a escola 1",
    "Orientação pedagógica prática e individualizada para a escola 2"
  ],
  "finalConsiderations": "Considerações finais técnicas e fechamento da avaliação...",
  "clinicalObservation": "Refinamento das observações clínicas sobre a postura, engajamento e vínculo observados nas sessões..."
}`

  const MAX_RETRIES = 5
  let lastError: string | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { data: keyData, error: rpcError } = await supabase
      .rpc("pick_next_gemini_key")
      .single()

    if (rpcError || !keyData) break

    const { key_id, api_key, project_name } = keyData as {
      key_id: number
      api_key: string
      project_name: string
    }

    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${api_key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2, // Temperatura baixa para máxima precisão factual e zero alucinações
              maxOutputTokens: 4096,
              responseMimeType: "application/json",
            },
          }),
        }
      )

      if (!geminiRes.ok) {
        if (geminiRes.status === 429 || geminiRes.status === 403) {
          await supabase.from("gemini_api_keys").update({ is_active: false }).eq("id", key_id)
        }
        continue
      }

      const geminiData = await geminiRes.json()
      const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
      if (rawText) {
        const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim()
        const parsed = JSON.parse(cleaned)
        return {
          synthesis: parsed.synthesis || "",
          diagnosticHypothesis: parsed.diagnosticHypothesis || "",
          dsm5Criteria: Array.isArray(parsed.dsm5Criteria) ? parsed.dsm5Criteria : [],
          referrals: Array.isArray(parsed.referrals) ? parsed.referrals : [],
          recommendationsFamily: Array.isArray(parsed.recommendationsFamily) ? parsed.recommendationsFamily : [],
          recommendationsSchool: Array.isArray(parsed.recommendationsSchool) ? parsed.recommendationsSchool : [],
          finalConsiderations: parsed.finalConsiderations || "",
          clinicalObservation: parsed.clinicalObservation || "",
        }
      }
    } catch (err: any) {
      lastError = err?.message || String(err)
      continue
    }
  }

  throw new Error(lastError || "Não foi possível conectar à IA no momento.")
}
