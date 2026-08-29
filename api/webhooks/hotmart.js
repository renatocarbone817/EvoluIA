/**
 * HOTMART WEBHOOK HANDLER — EVOLUIA
 * Endpoint Serverless Vercel: /api/webhooks/hotmart
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://fporviwejryfxaoapowc.supabase.co"
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwb3J2aXdlanJ5Znhhb2Fwb3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2ODY5NzIsImV4cCI6MjEwMzI2Mjk3Mn0.JYfzqyrkaCyXGU8FVbJv3Bu4vmgo5gnhbq0gogmUDoA"

const HOTMART_HOTTOK =
  process.env.HOTMART_HOTTOK || "4diYjRNnV9paWJ8uOmNsOXcp6uI02E19e17e00-103d-4517-8c50-25fcc13ec9c1"

const OFFER_MAP = {
  "imn95wux": { plan_id: "individual", max_professionals: 1, name: "EvoluIA Individual" },
  "bc2cgf38": { plan_id: "duo", max_professionals: 2, name: "EvoluIA Duo" },
  "liorml73": { plan_id: "trio", max_professionals: 3, name: "EvoluIA Trio" },
  "bgstdxk6": { plan_id: "equipe", max_professionals: 4, name: "EvoluIA Equipe" },
  "3ug8msdy": { plan_id: "clinica", max_professionals: 5, name: "EvoluIA Clínica" },
}

function resolvePlan(offerCode) {
  if (!offerCode) return OFFER_MAP.imn95wux
  const clean = String(offerCode).trim().toLowerCase()
  return OFFER_MAP[clean] || OFFER_MAP.imn95wux
}

async function getRawBody(req) {
  if (req.body) {
    if (typeof req.body === "object") return req.body
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body)
      } catch {
        // Might be URL encoded
        const params = new URLSearchParams(req.body)
        const obj = {}
        for (const [k, v] of params.entries()) {
          try {
            obj[k] = JSON.parse(v)
          } catch {
            obj[k] = v
          }
        }
        return obj
      }
    }
  }

  return new Promise((resolve) => {
    let str = ""
    req.on("data", (chunk) => {
      str += chunk
    })
    req.on("end", () => {
      if (!str) return resolve({})
      try {
        resolve(JSON.parse(str))
      } catch {
        try {
          const params = new URLSearchParams(str)
          const obj = {}
          for (const [k, v] of params.entries()) {
            try {
              obj[k] = JSON.parse(v)
            } catch {
              obj[k] = v
            }
          }
          resolve(obj)
        } catch {
          resolve({})
        }
      }
    })
    req.on("error", () => resolve({}))
  })
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "*")
  res.setHeader("Content-Type", "application/json")

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      service: "EvoluIA Hotmart Webhook",
      timestamp: new Date().toISOString(),
    })
  }

  try {
    const payload = await getRawBody(req)
    const eventType = payload.event || payload.event_type || payload.status || "TEST_EVENT"
    const data = payload.data || payload

    const buyer = data.buyer || payload.buyer || {}
    const buyerEmail = (buyer.email || data.email || payload.email || "").trim().toLowerCase()
    const buyerName = buyer.name || data.name || payload.name || "Cliente Hotmart"

    const offer = data.offer || payload.offer || {}
    const offerCode = offer.code || payload.off || data.offer_code || ""
    const planInfo = resolvePlan(offerCode)

    const product = data.product || payload.product || {}
    const productId = String(product.id || payload.prod || "8415366")

    const purchase = data.purchase || payload.purchase || {}
    const transactionId = purchase.transaction || data.transaction || payload.transaction || `tx_${Date.now()}`
    const subscriptionData = data.subscription || payload.subscription || {}
    const subscriptionId = subscriptionData.subscriber?.code || data.subscription_id || null

    let newStatus = "active"
    const eventUpper = String(eventType).toUpperCase()
    if (
      eventUpper.includes("CANCEL") ||
      eventUpper.includes("REFUND") ||
      eventUpper.includes("CHARGEBACK") ||
      eventUpper.includes("EXPIRED")
    ) {
      newStatus = "cancelled"
    } else if (eventUpper.includes("DELAY") || eventUpper.includes("PENDING")) {
      newStatus = "pending"
    }

    // Se tiver e-mail do comprador, tenta sincronizar no Supabase
    if (buyerEmail) {
      try {
        let masterUserId = null

        // 1. Buscar profissional por email
        const profRes = await fetch(
          `${SUPABASE_URL}/rest/v1/professionals?email=eq.${encodeURIComponent(buyerEmail)}&select=id`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
          }
        )
        if (profRes.ok) {
          const profs = await profRes.json()
          if (Array.isArray(profs) && profs.length > 0) {
            masterUserId = profs[0].id
          }
        }

        // 2. Se não existir, criar registro de profissional
        if (!masterUserId) {
          masterUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
          await fetch(`${SUPABASE_URL}/rest/v1/professionals`, {
            method: "POST",
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json",
              Prefer: "resolution=merge-duplicates",
            },
            body: JSON.stringify({
              id: masterUserId,
              email: buyerEmail,
              full_name: buyerName,
              role: "master",
              is_active: true,
              specialty: "Psicopedagogia",
            }),
          })
        }

        // 3. Atualizar Assinatura
        await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify({
            master_user_id: masterUserId,
            plan_id: planInfo.plan_id,
            max_professionals: planInfo.max_professionals,
            status: newStatus,
            hotmart_product_id: productId,
            hotmart_offer_id: offerCode || null,
            hotmart_subscription_id: subscriptionId,
            hotmart_transaction_id: transactionId,
            customer_email: buyerEmail,
            last_payment_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        })

        // 4. Log de auditoria
        await fetch(`${SUPABASE_URL}/rest/v1/subscription_events`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event_id: payload.id || `${transactionId}_${eventType}`,
            provider: "hotmart",
            event_type: eventType,
            payload: payload,
            processed: true,
            processed_at: new Date().toISOString(),
          }),
        })
      } catch (dbError) {
        console.warn("DB Warning in Webhook:", dbError)
      }
    }

    // Sempre retorna 200 OK com confirmação
    return res.status(200).json({
      success: true,
      event: eventType,
      plan: planInfo.name,
      max_professionals: planInfo.max_professionals,
      status: newStatus,
      email: buyerEmail || "test_mode",
    })
  } catch (err) {
    console.error("Webhook processing error:", err)
    return res.status(200).json({
      success: true,
      test: true,
      message: "Acknowledged with fallback",
    })
  }
}
