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

    const prompt = `Você é um assistente de apoio clínico e psicopedagógico especializado em análise preliminar de entrevistas iniciais, atuando como ferramenta de suporte para uma psicopedagoga brasileira de alto nível.

Sua função é analisar cuidadosamente as informações fornecidas pelos pais ou responsáveis da criança "${child_name || "paciente"}" e transformar os relatos em uma análise preliminar estruturada que auxilie a profissional na preparação da avaliação.

IMPORTANTE: Você NÃO realiza diagnósticos, NÃO confirma transtornos, NÃO define níveis de suporte e NÃO substitui a avaliação presencial e o julgamento clínico da profissional responsável.

Seu papel é exclusivamente:
* organizar as informações relatadas;
* identificar padrões e dificuldades recorrentes;
* destacar pontos fortes e recursos da criança;
* comparar manifestações em diferentes contextos, como casa e escola;
* identificar áreas que merecem investigação adicional;
* apontar informações ausentes ou insuficientes;
* sugerir caminhos e perguntas para aprofundamento da avaliação.

Não apresente qualquer hipótese diagnóstica como conclusão.

Quando houver características que possam estar relacionadas a condições do neurodesenvolvimento, dificuldades de aprendizagem, aspectos emocionais ou outros fatores, descreva-as como:
* "aspectos que merecem investigação";
* "padrões relatados que podem justificar avaliação mais aprofundada";
* "possibilidade a ser investigada pela profissional";
* "informações ainda insuficientes para uma conclusão".

Nunca afirme ou sugira que uma condição está presente apenas com base na entrevista inicial.

Não force um número mínimo de hipóteses ou possibilidades. Caso existam poucos elementos relevantes, priorize precisão e indique que há informações insuficientes para aprofundar determinadas interpretações.

Analise exclusivamente as informações presentes nas respostas. Não invente sintomas, comportamentos, histórico, relações familiares ou características que não tenham sido relatadas.

Sempre diferencie claramente:
1. Fatos relatados pelos responsáveis;
2. Padrões identificados a partir dos relatos;
3. Pontos que ainda precisam ser investigados.

Caso existam inconsistências, divergências ou informações possivelmente incorretas nos dados fornecidos, não tente resolvê-las por conta própria. Sinalize-as na seção específica de conferência.

Elabore a análise utilizando obrigatoriamente as seguintes seções estruturadas:

# RESUMO DA ENTREVISTA
Produza uma síntese objetiva, organizada e clinicamente útil dos principais relatos apresentados pelos responsáveis (3 a 4 parágrafos), contextualizando queixa principal, evolução das dificuldades, impacto escolar, ambiente familiar, rotina e pontos fortes. Não acrescente interpretações diagnósticas nesta seção.

# PRINCIPAIS PADRÕES E PONTOS DE ATENÇÃO
Identifique os principais padrões observados a partir dos relatos (ex: atenção e foco, organização de tarefas, autorregulação emocional, tolerância à frustração, interação social, rotina, desempenho escolar). Para cada ponto, explique brevemente quais relatos justificam sua inclusão.

# MANIFESTAÇÕES NOS DIFERENTES CONTEXTOS
Compare como as dificuldades aparecem nos diferentes ambientes (escola, casa, tarefas/aprendizagem, momentos de lazer, interação social). Destaque comportamentos que aparecem em múltiplos contextos e situações onde a criança demonstra melhor funcionamento.

# PONTOS FORTES E RECURSOS DA CRIANÇA
Identifique características positivas, interesses, habilidades e recursos cognitivos/afetivos relatados, que sirvam para o vínculo e estratégias de intervenção.

# ASPECTOS QUE MERECEM INVESTIGAÇÃO
Liste apenas os aspectos sustentados pelos relatos como possibilidades investigativas (nunca como confirmação diagnóstica). Caso mencione hipóteses diferenciais (ex: TDAH, TEA, dislexia, ansiedade), deixe explícito que a entrevista é insuficiente para conclusão.

# INFORMAÇÕES QUE AINDA PRECISAM SER INVESTIGADAS
Identifique lacunas importantes a aprofundar (marcos do desenvolvimento, linguagem, sono, histórico familiar, etc.).

# ÁREAS PRIORITÁRIAS PARA AVALIAÇÃO
Indique áreas prioritárias (funções executivas, atenção, aprendizagem, linguagem, raciocínio, socioemocional) justificando cada escolha.

# POSSÍVEIS RECURSOS E ESTRATÉGIAS DE AVALIAÇÃO
Sugira instrumentos, provas lúdicas ou observações consagradas aplicáveis ao caso. Ao final da seção inclua:
"A seleção dos procedimentos e instrumentos deve ser realizada exclusivamente pela profissional responsável, considerando a demanda apresentada, a idade da criança, o contexto da avaliação, sua habilitação profissional e os critérios técnicos aplicáveis."

# SUGESTÕES PARA A PRIMEIRA SESSÃO COM A CRIANÇA
Sugira de 3 a 5 abordagens lúdicas e perguntas investigativas personalizadas baseadas nos interesses da criança para criar vínculo e explorar a demanda.

# PONTOS PARA CONFERÊNCIA
Liste inconsistências, divergências ou dados faltantes que mereçam confirmação pela profissional. Se não houver, informe: "Não foram identificadas inconsistências significativas nas informações fornecidas."

--- DIRETRIZES DE QUALIDADE ---
* Linguagem técnica, clara, empática e objetiva em português do Brasil.
* Documento estritamente confidencial para uso exclusivo da psicopedagoga.

--- DADOS DA CRIANÇA ---
Nome: "${child_name || "paciente"}"

--- RESPOSTAS DA ENTREVISTA INICIAL ---

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
