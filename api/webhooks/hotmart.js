/**
 * HOTMART WEBHOOK HANDLER — EVOLUIA
 * Endpoint Serverless Vercel: /api/webhooks/hotmart
 * 
 * Processa notificações de compra, renovação, troca de plano, cancelamento e reembolso da Hotmart
 * com validação de segurança (Hottok), auditoria e idempotência no Supabase.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://fporviwejryfxaoapowc.supabase.co"
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwb3J2aXdlanJ5Znhhb2Fwb3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2ODY5NzIsImV4cCI6MjEwMzI2Mjk3Mn0.JYfzqyrkaCyXGU8FVbJv3Bu4vmgo5gnhbq0gogmUDoA"
const HOTMART_HOTTOK = process.env.HOTMART_HOTTOK || ""

// Mapeamento oficial de Códigos de Oferta Hotmart para Planos Internos do EvoluIA
const OFFER_MAP = {
  imn95wux: { plan_id: "individual", max_professionals: 1, name: "EvoluIA Individual" },
  bc2cgf38: { plan_id: "duo", max_professionals: 2, name: "EvoluIA Duo" },
  liorml73: { plan_id: "trio", max_professionals: 3, name: "EvoluIA Trio" },
  bgstdxk6: { plan_id: "equipe", max_professionals: 4, name: "EvoluIA Equipe" },
  3ug8msdy: { plan_id: "clinica", max_professionals: 5, name: "EvoluIA Clínica" },
}

function resolvePlanFromOffer(offerCode) {
  if (!offerCode) return OFFER_MAP.imn95wux
  const clean = String(offerCode).trim().toLowerCase()
  return OFFER_MAP[clean] || OFFER_MAP.imn95wux
}

export default async function handler(req, res) {
  // CORS & Methods
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-hotmart-hottok")

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method === "GET") {
    return res.status(200).json({
      service: "EvoluIA Hotmart Webhook",
      status: "online",
      version: "2.0.0",
      product_id: "L107381113V",
    })
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" })
  }

  try {
    const payload = req.body || {}
    const headers = req.headers || {}

    // 1. Validação de Segurança (Hottok Token)
    const incomingHottok =
      headers["x-hotmart-hottok"] ||
      payload.hottok ||
      payload.token ||
      req.query.hottok ||
      ""

    if (HOTMART_HOTTOK && incomingHottok !== HOTMART_HOTTOK) {
      console.warn("Hotmart Webhook rejected: Invalid Hottok token")
      return res.status(401).json({ error: "Unauthorized: Invalid Hottok token" })
    }

    // 2. Extração dos dados do evento (Hotmart Webhook 2.0 e 1.0 compatibility)
    const eventType = payload.event || payload.event_type || payload.status || "PURCHASE_APPROVED"
    const data = payload.data || payload

    const buyer = data.buyer || payload.buyer || {}
    const buyerEmail = (buyer.email || data.email || payload.email || "").trim().toLowerCase()
    const buyerName = buyer.name || data.name || payload.name || "Cliente EvoluIA"

    const product = data.product || payload.product || {}
    const productId = String(product.id || payload.prod || "L107381113V")

    const offer = data.offer || payload.offer || {}
    const offerCode = offer.code || payload.off || data.offer_code || ""

    const purchase = data.purchase || payload.purchase || {}
    const transactionId = purchase.transaction || data.transaction || payload.transaction || `tx_${Date.now()}`
    const subscriptionData = data.subscription || payload.subscription || {}
    const subscriptionId = subscriptionData.subscriber?.code || data.subscription_id || null

    const eventId = payload.id || `${transactionId}_${eventType}_${Date.now()}`

    if (!buyerEmail) {
      return res.status(400).json({ error: "Buyer email is required" })
    }

    // 3. Idempotência: Checar se o evento já foi processado no Supabase
    const eventCheckRes = await fetch(
      `${SUPABASE_URL}/rest/v1/subscription_events?event_id=eq.${encodeURIComponent(eventId)}&select=id,processed`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    )
    const existingEvents = await eventCheckRes.json()

    if (Array.isArray(existingEvents) && existingEvents.length > 0 && existingEvents[0].processed) {
      return res.status(200).json({ status: "already_processed", event_id: eventId })
    }

    // 4. Identificar Plano correspondente à oferta
    const planInfo = resolvePlanFromOffer(offerCode)

    // 5. Determinar novo Status da Assinatura
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

    // 6. Buscar ou criar o usuário Master no Supabase
    let masterUserId = null

    const profSearchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/professionals?email=eq.${encodeURIComponent(buyerEmail)}&select=id,role,master_id`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    )
    const existingProfs = await profSearchRes.json()

    if (Array.isArray(existingProfs) && existingProfs.length > 0) {
      masterUserId = existingProfs[0].id
    } else {
      // Se a conta ainda não foi criada pelo usuário, gera um ID de profissional Master
      masterUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      await fetch(`${SUPABASE_URL}/rest/v1/professionals`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
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

    // 7. Atualizar ou Criar registro na tabela 'subscriptions'
    const subRecord = {
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
      ...(newStatus === "cancelled" ? { cancelled_at: new Date().toISOString() } : {}),
    }

    await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(subRecord),
    })

    // 8. Gravar log do evento para auditoria
    await fetch(`${SUPABASE_URL}/rest/v1/subscription_events`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_id: eventId,
        provider: "hotmart",
        event_type: eventType,
        payload: payload,
        processed: true,
        processed_at: new Date().toISOString(),
      }),
    })

    return res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
      plan: planInfo.name,
      max_professionals: planInfo.max_professionals,
      status: newStatus,
      email: buyerEmail,
    })
  } catch (error) {
    console.error("Error processing Hotmart webhook:", error)
    return res.status(500).json({ error: "Internal Server Error", message: error.message })
  }
}
