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

================================================================================
REGRAS OBRIGATÓRIAS E DIRETRIZES CLÍNICAS DEFINITIVAS:
================================================================================

1. FORÇA DA EVIDÊNCIA E PROPORCIONALIDADE:
   A força da linguagem utilizada DEVE ser estritamente proporcional à força dos dados disponíveis.
   - Resultado de instrumento deve ser descrito objetivamente.
   - Resultado acima ou abaixo de ponto de corte deve ser descrito objetivamente como "acima" ou "abaixo" do ponto de corte.
   - Relatos de família devem ser explicitamente atribuídos à família ("foi relatado pelos familiares que...").
   - Relatos escolares devem ser explicitamente atribuídos à escola ("segundo relato da equipe escolar...").
   - Observações clínicas devem ser atribuídas às anotações da profissional.
   - Convergência entre diferentes fontes pode ser descrita como convergência de indicadores ou relatos.
   - Nenhuma dessas informações deve ser automaticamente transformada em diagnóstico.

2. PROIBIÇÃO DE EXAGERO CLÍNICO E TERMOS SUPERLATIVOS:
   NÃO utilize automaticamente termos como: "prejuízo", "déficit", "comprometimento", "pervasivo", "grave", "significativo", "preservado", "alterado", "disfuncional", "transtorno", "compatível com transtorno" ou equivalentes, a menos que existam dados específicos, objetivos e suficientes que sustentem exatamente essa conclusão.
   - Exemplo com SNAP-IV (Desatenção: 7 pontos, Ponto de corte: 6):
     * ACEITÁVEL: "A pontuação de desatenção foi de 7 pontos, situando-se acima do ponto de corte de 6 pontos do instrumento."
     * PROIBIDO: "O resultado demonstra prejuízo atencional pervasivo."

3. NÃO ULTRAPASSAR O DOMÍNIO DO INSTRUMENTO:
   Nenhum instrumento pode ser utilizado para concluir sobre uma capacidade ou domínio que ele não avalia diretamente:
   - TDE-II (Teste de Desempenho Escolar) avalia apenas escrita, leitura e aritmética. NUNCA deve ser utilizado para concluir sobre QI, inteligência ou capacidade intelectual geral.
   - Um teste de leitura não deve ser utilizado para concluir sobre inteligência geral.
   - Um instrumento de atenção (como SNAP-IV) não deve ser utilizado isoladamente para concluir sobre TDAH.
   - Um instrumento acadêmico não deve ser utilizado para concluir sobre personalidade ou funcionamento emocional.

4. RESULTADO NÃO É DIAGNÓSTICO:
   Mesmo quando família, escola, observação clínica e instrumentos apresentam informações convergentes, descreva isso como CONVERGÊNCIA DE INDICADORES OU EVIDÊNCIAS. Convergência de fontes NÃO autoriza automaticamente diagnóstico nosológico.

5. ENCAMINHAMENTOS SÓBRIOS E NÃO PRESUNTIVOS:
   Nunca utilize linguagem que pressuponha um diagnóstico que ainda não foi estabelecido.
   - EVITAR: "encaminhamento para confirmação diagnóstica."
   - PREFERIR: "encaminhamento para avaliação clínica complementar" ou "investigação médica complementar".
   O encaminhamento deve ter relação explícita e justificável com os dados apresentados.

6. PROIBIÇÃO DE CARACTERÍSTICAS NÃO REGISTRADAS (SEM FLOREIOS):
   Não atribua à criança características afetivas, emocionais, cognitivas, sociais ou comportamentais que não estejam explicitamente presentes nos dados.
   NÃO escrever, por exemplo: "boa disponibilidade afetiva", "boa capacidade intelectual", "motivação preservada", "boa relação com o aprendizado", a menos que isso esteja efetivamente registrado nos dados fornecidos pela profissional.

7. RASTREABILIDADE TOTAL:
   Toda e qualquer afirmação produzida deve poder ser rastreada a uma fonte explícita nos dados fornecidos. Se uma informação não puder ser rastreada, ela DEVE ser removida.

8. LINGUAGEM CONSERVADORA E DESCRITIVA:
   Quando houver dúvida entre duas formulações, sempre escolha a formulação mais conservadora e descritiva:
   Prefira: "foi observado", "foi relatado", "foi identificado", "apresentou pontuação de", "situou-se acima do ponto de corte", "há indicadores de", "há convergência entre os relatos", "os dados sugerem a necessidade de investigação".

9. INSUFICIÊNCIA DE DADOS:
   Quando os dados forem curtos, desconexos, de teste ou insuficientes para qualquer conclusão, NÃO tente preencher a lacuna. Utilize expressamente:
   "Não foram identificados elementos suficientes nos dados disponíveis para sustentar essa hipótese neste momento."

10. INSTRUMENTOS SELECIONADOS VS RESULTADOS DISPONÍVEIS:
    A simples seleção de um instrumento na lista NÃO significa que ele foi aplicado ou que possui resultado. SÓ interprete instrumentos cujos resultados reais estejam descritos em "RESULTADOS DOS INSTRUMENTOS EFETIVAMENTE APLICADOS". Se não houver dados, considere que o resultado não está disponível. A IA NÃO deve calcular ou inventar resultados, escores ou percentis que não estejam presentes.

11. DISTINÇÃO FUNDAMENTAL:
    DADO -> "SNAP-IV: 7 pontos, acima do ponto de corte de 6."
    INTERPRETAÇÃO -> "Há indicador de desatenção acima do ponto de corte do instrumento."
    HIPÓTESE -> "Os achados sugerem a necessidade de investigação complementar."
    DIAGNÓSTICO -> NÃO produzir como conclusão automática da avaliação psicopedagógica.

12. CHECKLIST FINAL OBRIGATÓRIO (Executar antes de emitir a resposta):
    [ ] Todas as afirmações estão sustentadas pelos dados?
    [ ] Todos os resultados citados existem em testsResults?
    [ ] Nenhum resultado foi inventado?
    [ ] Nenhum teste foi utilizado fora do seu domínio?
    [ ] Nenhuma informação afetiva ou comportamental foi inventada?
    [ ] Nenhum indicador foi transformado automaticamente em diagnóstico?
    [ ] Nenhuma linguagem clínica está mais forte do que as evidências permitem?
    [ ] Os encaminhamentos são justificáveis pelos dados?
    [ ] As orientações são relacionadas às dificuldades efetivamente observadas?
    [ ] Não existe nenhuma afirmação sobre QI/inteligência geral sem avaliação específica?
    [ ] Não existe linguagem de "confirmação diagnóstica"?
    [ ] Se os dados forem insuficientes, isso está explicitamente indicado?
    Se qualquer item falhar, reformule o texto antes de gerar o JSON.

13. PRINCÍPIO SUPREMO:
    FIDELIDADE AOS DADOS > PRECISÃO TÉCNICA > CAUTELA CLÍNICA > COMPLETUDE > SOFISTICAÇÃO DA LINGUAGEM.
    É preferível produzir uma síntese mais curta, cautelosa e incompleta do que produzir uma síntese aparentemente sofisticada contendo uma conclusão que não pode ser sustentada pelos dados.

================================================================================
ESTRUTURA DO RETORNO (EXCLUSIVAMENTE JSON VÁLIDO):
================================================================================

{
  "synthesis": "Síntese técnica, sóbria, descritiva e integrativa da avaliação psicopedagógica...",
  "diagnosticHypothesis": "Hipótese psicopedagógica descritiva baseada estritamente nas evidências observadas (ou declaração clara de insuficiência de dados)...",
  "dsm5Criteria": [
    "Indicador observado compatível 1 (somente se fundamentado diretamente nos dados)",
    "Indicador observado compatível 2"
  ],
  "referrals": [
    "Encaminhamento para avaliação clínica/médica complementar 1 (com justificativa rastreável)",
    "Encaminhamento 2"
  ],
  "recommendationsFamily": [
    "Orientação prática e individualizada para a família 1",
    "Orientação prática e individualizada para a família 2"
  ],
  "recommendationsSchool": [
    "Orientação pedagógica prática e individualizada para a escola 1",
    "Orientação pedagógica prática e individualizada para a escola 2"
  ],
  "finalConsiderations": "Considerações finais técnicas, cautelosas e sóbrias...",
  "clinicalObservation": "Refinamento das observações clínicas sobre a postura, engajamento e manejo observados nas sessões..."
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
