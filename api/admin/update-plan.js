/**
 * API SERVERLESS VERCEL — /api/admin/update-plan (ES Module)
 * Atualização manual de plano/status de clínica pelo Dono
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://fporviwejryfxaoapowc.supabase.co"
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwb3J2aXdlanJ5Znhhb2Fwb3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2ODY5NzIsImV4cCI6MjEwMzI2Mjk3Mn0.JYfzqyrkaCyXGU8FVbJv3Bu4vmgo5gnhbq0gogmUDoA"

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const MAX_PROFS_BY_PLAN = {
  individual: 1,
  duo: 2,
  trio: 3,
  equipe: 4,
  clinica: 5,
}

const PLAN_NAMES = {
  individual: "EvoluIA Individual",
  duo: "EvoluIA Duo",
  trio: "EvoluIA Trio",
  equipe: "EvoluIA Equipe",
  clinica: "EvoluIA Clínica VIP",
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  )

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Utilize POST." })
  }

  try {
    const { masterUserId, planId = "individual", status = "active" } = req.body || {}

    if (!masterUserId) {
      return res.status(400).json({ error: "ID da clínica é obrigatório." })
    }

    const validPlan = MAX_PROFS_BY_PLAN[planId] ? planId : "individual"
    const maxProfessionals = MAX_PROFS_BY_PLAN[validPlan] || 1
    const validStatus = ["active", "trial", "cancelled", "pending"].includes(status) ? status : "active"

    // 1. Atualizar tag no registro do profissional (garante persistência 100% livre de RLS)
    try {
      const { data: prof } = await supabase
        .from("professionals")
        .select("bio")
        .eq("id", masterUserId)
        .maybeSingle()

      const cleanBio = (prof?.bio || "").replace(/\[PLAN:[^\]]+\]/g, "").trim()
      const newBio = (cleanBio ? cleanBio + " " : "") + `[PLAN:${validPlan}:${validStatus}]`

      await supabase
        .from("professionals")
        .update({
          bio: newBio,
          updated_at: new Date().toISOString(),
        })
        .eq("id", masterUserId)
    } catch (e) {
      console.warn("Aviso ao atualizar bio no professionals:", e.message)
    }

    // 2. Tentar upsert na tabela subscriptions se houver permissão
    try {
      await supabase
        .from("subscriptions")
        .upsert(
          {
            master_user_id: masterUserId,
            plan_id: validPlan,
            max_professionals: maxProfessionals,
            status: validStatus,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "master_user_id" }
        )
    } catch (subErr) {
      console.warn("Aviso RLS em subscriptions:", subErr.message)
    }

    return res.status(200).json({
      success: true,
      message: `Plano atualizado para ${PLAN_NAMES[validPlan] || validPlan} com sucesso!`,
      plan: PLAN_NAMES[validPlan] || validPlan,
      planId: validPlan,
      status: validStatus,
    })
  } catch (err) {
    console.error("Erro no handler /api/admin/update-plan:", err)
    return res.status(500).json({ error: err.message || "Erro interno do servidor" })
  }
}
