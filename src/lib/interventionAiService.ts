import { supabase } from "@/lib/supabase"

export interface GenerateInterventionAiParams {
  childName: string
  childAge?: string
  schoolName?: string
  grade?: string
  previousDiagnosis: string
  interventionPeriod: string
  sessionCount: number
  goalType: "alta" | "continuidade"
  sessionsSummary?: string
  goalsSummary?: string
  testsData?: {
    trilhas?: {
      tempoA?: string
      escoreA?: string
      percentilA?: string
      tempoB?: string
      escoreB?: string
      percentilB?: string
    }
    spanDigitos?: {
      direta?: string
      indireta?: string
    }
    tin?: {
      acertos?: string
      tempo?: string
    }
    audibilizacao?: {
      escore?: string
      classificacao?: string
    }
    popTt?: {
      escore?: string
      percentil?: string
      classificacao?: string
    }
    aritmetica?: {
      total?: string
      percentil?: string
      classificacao?: string
    }
  }
  semaforoData?: {
    alphabetSummary?: string
    phonologicalSummary?: string
    readingSummary?: string
    writingSummary?: string
  }
}

export interface InterventionAiResponse {
  briefHistory: string
  clinicalConclusion: string
  recsSchool: string
  recsFamily: string
}

/**
 * Monta o prompt clínico para o modelo Gemini redigir o parecer de reavaliação pós-intervenção
 */
function buildInterventionAiPrompt(params: GenerateInterventionAiParams): string {
  const isAlta = params.goalType === "alta"

  return `Você é um assistente de apoio clínico psicopedagógico especializado em elaboração de relatórios evolutivos e de reavaliação pós-intervenção, atuando em parceria com psicopedagogas clínicas no Brasil.

Sua tarefa é redigir o texto técnico, acolhedor e humanizado do "Relatório de Reavaliação Psicopedagógica - Pós Intervenção" para a criança "${params.childName}".

================================================================================
DADOS DO PACIENTE E CONTEXTO CLÍNICO:
================================================================================
- Criança: ${params.childName}
- Idade: ${params.childAge || "Não informada"}
- Escola: ${params.schoolName || "Não informada"} (${params.grade || "Série não informada"})
- Diagnóstico Anterior Informado / Hipótese Prévia: ${params.previousDiagnosis || "TDAH"}
- Período de Intervenção Realizado: ${params.interventionPeriod}
- Total de Sessões Realizadas no Período: ${params.sessionCount} sessões
- Decisão Clínica da Psicopedagoga: ${
    isAlta
      ? "ALTA DA INTERVENÇÃO (O paciente alcançou os objetivos terapêuticos propostos, adquiriu autonomia pedagógica e consolidou as habilidades prévias deficitárias)."
      : "CONTINUIDADE DA INTERVENÇÃO (O paciente demonstrou evolução significativa, mas ainda necessita de suporte continuado em metas específicas de consolidação)."
  }

================================================================================
METAS TRABALHADAS E SESSÕES REGISTRADAS:
================================================================================
${params.goalsSummary ? `METAS DO PLANO:\n${params.goalsSummary}\n` : "Metas gerais de intervenção: funções executivas, atenção sustentada, controle inibitório e alfabetização.\n"}
${params.sessionsSummary ? `RESUMO DAS SESSÕES:\n${params.sessionsSummary}\n` : "Sessões realizadas com foco em estimulação cognitiva, jogos estruturados e consciência fonológica.\n"}

================================================================================
RESULTADOS DA REAVALIAÇÃO (TESTES PADRONIZADOS):
================================================================================
- Teste de Trilhas A/B: Tempo A: ${params.testsData?.trilhas?.tempoA || "—"}, Escore A: ${params.testsData?.trilhas?.escoreA || "—"} (${params.testsData?.trilhas?.percentilA || "—"}) | Tempo B: ${params.testsData?.trilhas?.tempoB || "—"}, Escore B: ${params.testsData?.trilhas?.escoreB || "—"} (${params.testsData?.trilhas?.percentilB || "—"})
- Span de Dígitos (TSD): Ordem Direta: ${params.testsData?.spanDigitos?.direta || "—"}, Indireta: ${params.testsData?.spanDigitos?.indireta || "—"}
- Teste Infantil de Nomeação (TIN): Acertos: ${params.testsData?.tin?.acertos || "—"}, Tempo: ${params.testsData?.tin?.tempo || "—"}
- Teste de Audibilização: Escore: ${params.testsData?.audibilizacao?.escore || "—"} (${params.testsData?.audibilizacao?.classificacao || "—"})
- Protocolo Psicomotor POP-TT: Escore: ${params.testsData?.popTt?.escore || "—"} (${params.testsData?.popTt?.classificacao || "—"})
- Prova de Aritmética: Escore: ${params.testsData?.aritmetica?.total || "—"} (${params.testsData?.aritmetica?.classificacao || "—"})

================================================================================
SEMÁFORO DE DESEMPENHO (HABILIDADES PREDITORAS):
================================================================================
- Alfabeto: ${params.semaforoData?.alphabetSummary || "Predominantemente BOM (Verde)"}
- Consciência Fonológica: ${params.semaforoData?.phonologicalSummary || "Predominantemente BOM (Verde)"}
- Leitura: ${params.semaforoData?.readingSummary || "Predominantemente BOM (Verde)"}
- Escrita: ${params.semaforoData?.writingSummary || "Predominantemente BOM (Verde)"}

================================================================================
DIRETRIZES DE REDAÇÃO E ESTILO:
================================================================================
1. LINGUAGEM CLÍNICA, TÉCNICA E HUMANIZADA:
   - Empregue conceitos psicopedagógicos adequados: funções executivas, atenção sustentada, controle inibitório, princípio alfabético, rota fonológica e lexical, discriminação auditiva, motricidade fina, autonomia e repertório pedagógico.
   - O texto deve ser fluído, empático e valorizar o protagonismo e o esforço da criança.

2. HISTÓRICO BREVE / ANTECEDENTES (briefHistory):
   - Redija de 1 a 2 parágrafos contextualizando a trajetória da criança.
   - Narre que a criança iniciou acompanhamento inicialmente com queixas de reforço ou dificuldades escolares trazidas pela família/escola.
   - Destaque as dificuldades notadas inicialmente (ex: inquietação, facilidade em esquecer conteúdos, oscilação de foco).
   - Mencione a avaliação multidisciplinar / médica e o diagnóstico prévio (${params.previousDiagnosis}), que motivou o início do ciclo personalizado de intervenção.

3. CONCLUSÃO CLÍNICA ATUALIZADA (clinicalConclusion):
   - Redija de 2 a 3 parágrafos integrando os resultados dos testes e do semáforo.
   - Destaque a expressiva evolução da criança em relação ao ponto de partida inicial.
   - Cite explicitamente a segurança e autonomia adquiridas, e a consolidação do processo de alfabetização e funções executivas.
   - ${
     isAlta
       ? `FINALIZAÇÃO OBRIGATÓRIA PARA ALTA: Indicar conclusivamente a ALTA DA INTERVENÇÃO PSICOPEDAGÓGICA devido ao cumprimento dos objetivos, estabilização do quadro e consolidação das habilidades, recomendando acompanhamento periódico preventivo.`
       : `FINALIZAÇÃO OBRIGATÓRIA PARA CONTINUIDADE: Indicar a CONTINUIDADE DA ESTIMULAÇÃO PSICOPEDAGÓGICA, valorizando os ganhos já alcançados e delineando os próximos passos de consolidação.`
   }

4. RECOMENDAÇÕES PARA A ESCOLA (recsSchool):
   - Redija orientações práticas, acolhedoras e executáveis para os professores em sala de aula (ex: permanência próximo à mesa do professor, comandos objetivos fracionados, incentivo à leitura com recursos concretos, elogios ao esforço).

5. RECOMENDAÇÕES PARA A FAMÍLIA (recsFamily):
   - Redija orientações amorosas e estruturadas para o dia a dia no lar (rotina diária estável, estímulo positivo, leitura compartilhada e jogos de tabuleiro em família).
   - Conclua com a frase encorajadora de parceria: "Vocês fazem parte desse sucesso!".

================================================================================
FORMATO DA RESPOSTA (RETORNE APENAS UM JSON VÁLIDO):
================================================================================
{
  "briefHistory": "...",
  "clinicalConclusion": "...",
  "recsSchool": "...",
  "recsFamily": "..."
}`
}

/**
 * Chama o Google Gemini (com rotação atômica de chaves e fallback) para gerar o parecer
 */
export async function generateInterventionReportAi(
  params: GenerateInterventionAiParams
): Promise<InterventionAiResponse> {
  const prompt = buildInterventionAiPrompt(params)
  const MAX_RETRIES = 5
  let lastError: string | null = null

  // Modelos suportados em ordem de preferência
  const models = ["gemini-3.6-flash", "gemini-2.0-flash", "gemini-1.5-flash"]

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let apiKey = ""
    let keyId: number | null = null
    let projectName = "padrao"

    try {
      const { data: keyData } = await supabase.rpc("pick_next_gemini_key").single()
      const typedKey = keyData as any
      if (typedKey && typedKey.api_key) {
        apiKey = typedKey.api_key
        keyId = typedKey.key_id
        projectName = typedKey.project_name || "pool"
      }
    } catch {
      // Fallback
    }

    if (!apiKey) {
      apiKey =
        (import.meta.env.VITE_GEMINI_API_KEY as string) ||
        (import.meta.env.GEMINI_API_KEY as string) ||
        ""
    }

    if (!apiKey) {
      throw new Error(
        "Nenhuma chave de API do Gemini foi encontrada. Configure uma chave no painel de administração ou nas variáveis de ambiente."
      )
    }

    for (const model of models) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 4096,
                responseMimeType: "application/json",
              },
            }),
          }
        )

        if (!geminiRes.ok) {
          const errBody = await geminiRes.text()
          console.warn(`[Gemini ${model}] Erro ${geminiRes.status}: ${errBody}`)

          if ((geminiRes.status === 429 || geminiRes.status === 403) && keyId) {
            await supabase.from("gemini_api_keys").update({ is_active: false }).eq("id", keyId)
          }

          lastError = `Status ${geminiRes.status}: ${errBody}`
          if (geminiRes.status === 404) continue
          break
        }

        const geminiData = await geminiRes.json()
        const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
        if (rawText) {
          const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim()
          const parsed = JSON.parse(cleaned)

          return {
            briefHistory: parsed.briefHistory || "",
            clinicalConclusion: parsed.clinicalConclusion || "",
            recsSchool: parsed.recsSchool || "",
            recsFamily: parsed.recsFamily || "",
          }
        }
      } catch (err: any) {
        console.error(`Erro ao chamar Gemini (${model}):`, err)
        lastError = err?.message || String(err)
      }
    }
  }

  throw new Error(
    lastError ||
      "A IA está temporariamente indisponível para gerar o parecer. Por favor, tente novamente em instantes."
  )
}
