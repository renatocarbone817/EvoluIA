/**
 * API SERVERLESS VERCEL — /api/admin/reset-password (ES Module)
 * Redefinição e recuperação de senha de clínica pelo Dono
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://fporviwejryfxaoapowc.supabase.co"
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwb3J2aXdlanJ5Znhhb2Fwb3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2ODY5NzIsImV4cCI6MjEwMzI2Mjk3Mn0.JYfzqyrkaCyXGU8FVbJv3Bu4vmgo5gnhbq0gogmUDoA"

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

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
    const { email, newPassword, userId } = req.body || {}

    const cleanEmail = (email || "").trim().toLowerCase()
    const cleanPassword = (newPassword || "").trim()

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return res.status(400).json({ error: "E-mail inválido." })
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      return res.status(400).json({ error: "A nova senha deve ter no mínimo 6 caracteres." })
    }

    let updatedDirectly = false

    // 1. Tentar redefinir diretamente via Supabase Auth Admin se disponível
    try {
      if (supabase.auth.admin && typeof supabase.auth.admin.updateUserById === "function" && userId) {
        const { error: adminErr } = await supabase.auth.admin.updateUserById(userId, {
          password: cleanPassword,
        })
        if (!adminErr) {
          updatedDirectly = true
        }
      }
    } catch (e) {
      console.warn("Falha no admin.updateUserById:", e.message)
    }

    // 2. Enviar e-mail oficial de redefinição de senha para a psicopedagoga
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: "https://evolu-ia-seven.vercel.app/redefinir-senha",
    })

    if (resetErr && !updatedDirectly) {
      console.error("Erro ao enviar email de reset:", resetErr)
      return res.status(500).json({ error: resetErr.message || "Erro ao processar redefinição de senha." })
    }

    return res.status(200).json({
      success: true,
      updatedDirectly,
      emailSent: !resetErr,
      email: cleanEmail,
      tempPassword: cleanPassword,
      message: updatedDirectly
        ? `Senha de ${cleanEmail} alterada com sucesso!`
        : `Link de redefinição enviado com sucesso para ${cleanEmail}!`,
    })
  } catch (err) {
    console.error("Erro no handler /api/admin/reset-password:", err)
    return res.status(500).json({ error: err.message || "Erro interno do servidor" })
  }
}
