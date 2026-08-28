import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 })
  }

  try {
    const { assessment_id, child_name } = await req.json()

    if (!assessment_id) {
      return new Response(
        JSON.stringify({ error: "assessment_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Use service role to access gemini_api_keys (never exposed to frontend)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Fetch the interview data
    const { data: assessment, error: assessmentError } = await supabase
      .from("initial_assessments")
      .select("*")
      .eq("id", assessment_id)
      .single()

    if (assessmentError || !assessment) {
      return new Response(
        JSON.stringify({ error: "Assessment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Parse the answers JSON
    let answers: Record<string, string> = {}
    try {
      if (assessment.reason && assessment.reason.startsWith("{")) {
        answers = JSON.parse(assessment.reason)
      }
    } catch (e) {
      console.error("Failed to parse answers:", e)
    }

    // Build the structured interview text from the 13 questions
    const QUESTIONS: Record<string, string> = {
      q1: "QUEIXA LIVRE: Em que posso ajudá-los? O que os trouxe até aqui?",
      q2: "Quando começou o problema?",
      q3: "Como vocês se sentem diante dessa dificuldade?",
      q4: "O que a escola relata sobre essa dificuldade?",
      q5: "Em casa, como é essa dificuldade relatada pela escola?",
      q6: "Fale-me em detalhes como é a rotina de seu filho desde a hora de acordar até a hora de dormir, durante uma semana.",
      q7: "Como ele se comporta ao fazer as lições de casa?",
      q8: "E como vocês reagem a esse comportamento?",
      q9: "Existe outro problema além desse?",
      q10: "Quais as qualidades de seu filho?",
      q11: "Tem outros filhos? Como eles são?",
      q12: "O que vocês esperam de mim e do meu trabalho?",
      q13: "Gostariam de acrescentar algo?",
    }

    const interviewText = Object.entries(QUESTIONS)
      .map(([key, question]) => {
        const answer = answers[key] || "(não respondido)"
        return `**${question}**\nResposta: ${answer}`
      })
      .join("\n\n")

    const prompt = `Você é um assistente de apoio clínico e psicopedagógico especializado em análise preliminar de entrevistas iniciais, atuando como ferramenta de suporte para uma psicopedagoga brasileira.

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

ATENÇÃO: Respeite rigorosamente a hierarquia Markdown abaixo:
- Use '## ' para as Seções Principais.
- Use '### ' para os Subtópicos (NÃO use bullets '*' ou listas numeradas para títulos de subtópicos).
- Coloque o texto normal logo abaixo do subtópico.
- 'Relatos que justificam:' e 'Análise:' devem aparecer em negrito (**Relatos que justificam:** e **Análise:**) no início do parágrafo de texto normal, NUNCA como um bullet separado.

Siga este formato estrutural:

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

    // Try keys with fallback
    let analysis: string | null = null
    let usedProject: string | null = null
    let lastError: string | null = null
    const MAX_RETRIES = 5

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // Atomically pick the next key (FOR UPDATE SKIP LOCKED prevents race conditions)
      const { data: keyData, error: rpcError } = await supabase
        .rpc("pick_next_gemini_key")
        .single()

      if (rpcError || !keyData) {
        console.error("No available keys:", rpcError)
        break
      }

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
                temperature: 0.7,
                maxOutputTokens: 4096,
              },
            }),
          }
        )

        if (!geminiRes.ok) {
          const errBody = await geminiRes.text()
          console.error(`Key ${project_name} failed (${geminiRes.status}):`, errBody)

          // Increment error_count for this key
          await supabase
            .from("gemini_api_keys")
            .update({ error_count: supabase.rpc("increment_error_count", { key_id }) })
            .eq("id", key_id)

          // If quota exceeded, deactivate temporarily
          if (geminiRes.status === 429 || geminiRes.status === 403) {
            await supabase
              .from("gemini_api_keys")
              .update({ is_active: false })
              .eq("id", key_id)
          }

          lastError = `${geminiRes.status}: ${errBody}`
          continue // try next key
        }

        const geminiData = await geminiRes.json()
        analysis = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || null
        usedProject = project_name

        if (analysis) break
      } catch (fetchError) {
        console.error(`Network error with key ${project_name}:`, fetchError)
        lastError = String(fetchError)
        continue
      }
    }

    if (!analysis) {
      return new Response(
        JSON.stringify({
          error: "A análise por IA está temporariamente indisponível. Tente novamente em alguns minutos.",
          detail: lastError,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Save the analysis back to the assessment
    await supabase
      .from("initial_assessments")
      .update({
        ai_analysis: analysis,
        ai_analyzed_at: new Date().toISOString(),
        ai_key_project: usedProject,
      })
      .eq("id", assessment_id)

    return new Response(
      JSON.stringify({ analysis, project_used: usedProject }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("Unexpected error:", err)
    return new Response(
      JSON.stringify({ error: "Erro interno. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
