import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
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

    const prompt = `Você é um assistente de apoio clínico para uma psicopedagoga brasileira.

Analise as respostas da entrevista inicial realizada com os pais/responsáveis da criança "${child_name || "paciente"}" e gere uma análise estruturada com as seguintes seções:

## 📋 RESUMO DA ENTREVISTA
Síntese objetiva e clínica dos principais pontos relatados pelos responsáveis (3 a 4 parágrafos).

## 💡 HIPÓTESES INICIAIS
Liste de 3 a 5 hipóteses clínicas a investigar com base nas queixas e relatos dos pais. Use linguagem técnica psicopedagógica.

## 🎯 ÁREAS SUGERIDAS PARA AVALIAÇÃO
Quais áreas do desenvolvimento e aprendizagem merecem atenção prioritária nas próximas sessões de avaliação (ex: leitura, escrita, atenção, memória, comportamento, coordenação motora, linguagem, etc.).

Use linguagem clínica e objetiva, em português do Brasil. Este conteúdo é para uso interno da psicopedagoga — não será entregue aos pais ou à escola.

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
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${api_key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
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
