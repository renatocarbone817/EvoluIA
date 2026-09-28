import { supabase } from "@/lib/supabase"

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type LeadStatus =
  | "novo"
  | "contatado"
  | "respondeu"
  | "testando"
  | "cliente"
  | "sem_interesse"

export interface Lead {
  id: string
  professional_id: string
  nome: string
  telefone?: string | null
  whatsapp?: string | null
  instagram?: string | null
  site?: string | null
  cidade?: string | null
  estado?: string | null
  endereco?: string | null
  status: LeadStatus
  observacao?: string | null
  created_at: string
  updated_at: string
}

export type LeadInsert = Omit<Lead, "id" | "created_at" | "updated_at">
export type LeadUpdate = Partial<Omit<Lead, "id" | "professional_id" | "created_at">>

// ─── Status config ─────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; emoji: string; color: string; bg: string }
> = {
  novo:          { label: "Novo",           emoji: "🟡", color: "text-yellow-700",  bg: "bg-yellow-50 border-yellow-200" },
  contatado:     { label: "Contatado",      emoji: "🔵", color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  respondeu:     { label: "Respondeu",      emoji: "🟣", color: "text-purple-700",  bg: "bg-purple-50 border-purple-200" },
  testando:      { label: "Testando EvoluIA", emoji: "🟠", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  cliente:       { label: "Cliente",        emoji: "🟢", color: "text-green-700",   bg: "bg-green-50 border-green-200" },
  sem_interesse: { label: "Sem interesse",  emoji: "🔴", color: "text-red-700",     bg: "bg-red-50 border-red-200" },
}

export const SEEDED_VOTUPORANGA_LEADS: Lead[] = [
  {
    id: "lead_votu_1",
    professional_id: "00000000-0000-0000-0000-000000000001",
    nome: "Dra. Rosemary Morais - M&M Clínica Integrada",
    telefone: "(17) 99732-4386",
    whatsapp: "(17) 99732-4386",
    instagram: null,
    site: null,
    cidade: "Votuporanga",
    estado: "SP",
    endereco: "Rua Ponta Porã, 3190 – Bairro San Remo",
    status: "novo",
    observacao: "Psicóloga, Neuropsicóloga e Psicopedagoga Clínica (Especialista em TEA, ABA, Denver)",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "lead_votu_2",
    professional_id: "00000000-0000-0000-0000-000000000001",
    nome: "Adriana Ricci - Neuropsicopedagoga",
    telefone: "(17) 99736-0906",
    whatsapp: "(17) 99736-0906",
    instagram: null,
    site: null,
    cidade: "Votuporanga",
    estado: "SP",
    endereco: "Votuporanga - SP (Atendimento Clínico e Domiciliar)",
    status: "novo",
    observacao: "Neuropsicopedagogia, ABA, AEE, Libras. Foco em TEA e dificuldades de aprendizagem.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "lead_votu_3",
    professional_id: "00000000-0000-0000-0000-000000000001",
    nome: "Mônica Sartori Tavares da Silva - Psicopedagogia",
    telefone: "(17) 99751-3269",
    whatsapp: "(17) 99751-3269",
    instagram: null,
    site: null,
    cidade: "Votuporanga",
    estado: "SP",
    endereco: "Rua Minas Gerais, 3419",
    status: "novo",
    observacao: "Psicopedagoga Clínica com consultório em Votuporanga",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "lead_votu_4",
    professional_id: "00000000-0000-0000-0000-000000000001",
    nome: "Centro Especializado de Desenvolvimento Infantil",
    telefone: "(17) 99243-1833",
    whatsapp: "(17) 99243-1833",
    instagram: null,
    site: null,
    cidade: "Votuporanga",
    estado: "SP",
    endereco: "Rua Tibagi, 2906 – Vila Nova",
    status: "novo",
    observacao: "Clínica especializada em desenvolvimento infantil, psicologia e psicopedagogia",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "lead_votu_5",
    professional_id: "00000000-0000-0000-0000-000000000001",
    nome: "Núcleo de Psicologia, Neuropsicologia e Reabilitação",
    telefone: "(17) 99636-0544",
    whatsapp: "(17) 99636-0544",
    instagram: null,
    site: null,
    cidade: "Votuporanga",
    estado: "SP",
    endereco: "Rua Tibagi, 3072 – Patrimônio Novo",
    status: "novo",
    observacao: "Núcleo de avaliação e intervenção neuropsicopedagógica e reabilitação",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "lead_votu_6",
    professional_id: "00000000-0000-0000-0000-000000000001",
    nome: "Ariadne Ribeiro Mariotti - Psicopedagoga",
    telefone: "(17) 99745-8331",
    whatsapp: "(17) 99745-8331",
    instagram: null,
    site: null,
    cidade: "Votuporanga",
    estado: "SP",
    endereco: "Votuporanga - SP",
    status: "novo",
    observacao: "Psicopedagoga Clínica",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "lead_votu_7",
    professional_id: "00000000-0000-0000-0000-000000000001",
    nome: "Vanessa Ribeiro Rodrigues Dacal - Neuropsicopedagogia",
    telefone: null,
    whatsapp: null,
    instagram: null,
    site: "https://consultaspsi.com.br",
    cidade: "Votuporanga",
    estado: "SP",
    endereco: "Votuporanga - SP",
    status: "novo",
    observacao: "Atendimento neuropsicopedagógico presencial e online em Votuporanga (TEA, TDAH)",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
]

const LOCAL_STORAGE_KEY = "evoluia_leads_cache"

function getLocalLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
    // Se o cache estiver vazio, inicia com os leads reais de Votuporanga
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEEDED_VOTUPORANGA_LEADS))
    return SEEDED_VOTUPORANGA_LEADS
  } catch {
    return SEEDED_VOTUPORANGA_LEADS
  }
}

function saveLocalLeads(leads: Lead[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(leads))
  } catch (e) {
    console.warn("Could not save leads to localStorage:", e)
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Normaliza telefone para comparação de deduplicação */
function normalizePhone(phone?: string | null): string {
  if (!phone) return ""
  return phone.replace(/\D/g, "").trim()
}

/** Extrai handle do Instagram (remove @, URL etc.) */
export function normalizeInstagram(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return null
  const s = raw.trim()
  const match = s.match(/instagram\.com\/([^/?#\s]+)/i)
  if (match) return match[1].replace(/\/$/, "")
  if (s.startsWith("@")) return s.slice(1).trim()
  return s
}

/** Formata número de telefone para link do WhatsApp */
export function formatWhatsAppLink(phone?: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, "")
  if (!digits) return null
  const number = digits.startsWith("55") ? digits : `55${digits}`
  return `https://wa.me/${number}`
}

// ─── CRUD (Supabase com fallback LocalStorage transparente) ───────────────────

export async function listLeads(professionalId: string): Promise<Lead[]> {
  try {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    if (data) {
      saveLocalLeads(data as Lead[])
      return data as Lead[]
    }
  } catch (err) {
    console.warn("Supabase fetch leads failed, using local cache:", err)
  }

  return getLocalLeads()
}

export async function createLead(lead: LeadInsert): Promise<Lead> {
  const newLead: Lead = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ...lead,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Tentar salvar no Supabase
  try {
    const { data, error } = await supabase
      .from("leads")
      .insert(lead)
      .select()
      .single()

    if (!error && data) {
      const all = [data as Lead, ...getLocalLeads().filter((l) => l.id !== data.id)]
      saveLocalLeads(all)
      return data as Lead
    }
  } catch (err) {
    console.warn("Supabase insert lead failed, saving locally:", err)
  }

  // Fallback local
  const current = getLocalLeads()
  saveLocalLeads([newLead, ...current])
  return newLead
}

export async function updateLead(id: string, updates: LeadUpdate): Promise<Lead> {
  let updatedRecord: Lead | null = null

  try {
    const { data, error } = await supabase
      .from("leads")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (!error && data) {
      updatedRecord = data as Lead
    }
  } catch (err) {
    console.warn("Supabase update lead failed, updating locally:", err)
  }

  const current = getLocalLeads()
  const next = current.map((l) => {
    if (l.id === id) {
      return updatedRecord || { ...l, ...updates, updated_at: new Date().toISOString() }
    }
    return l
  })
  saveLocalLeads(next)

  const found = next.find((l) => l.id === id)
  if (!found) throw new Error("Lead não encontrado")
  return found
}

export async function deleteLead(id: string): Promise<void> {
  try {
    await supabase.from("leads").delete().eq("id", id)
  } catch (err) {
    console.warn("Supabase delete lead failed, deleting locally:", err)
  }

  const current = getLocalLeads()
  saveLocalLeads(current.filter((l) => l.id !== id))
}

// ─── Importação CSV Flexível ───────────────────────────────────────────────────

export interface ImportResult {
  imported: number
  duplicates: number
  errors: number
  total: number
}

/** Detecta delimitador (, ou ; ou \t) */
function detectDelimiter(firstLine: string): string {
  const semicolons = (firstLine.match(/;/g) || []).length
  const commas = (firstLine.match(/,/g) || []).length
  const tabs = (firstLine.match(/\t/g) || []).length

  if (semicolons > commas && semicolons > tabs) return ";"
  if (tabs > commas && tabs > semicolons) return "\t"
  return ","
}

/**
 * Parse CSV flexível com detecção automática de delimitador (, ; \t)
 */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const delimiter = detectDelimiter(lines[0])

  const headers = lines[0]
    .split(delimiter)
    .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase())

  return lines.slice(1).map((line) => {
    const values: string[] = []
    let current = ""
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
    values.push(current.trim())

    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").replace(/^"|"$/g, "").trim()
    })
    return row
  })
}

export async function importLeadsFromCSV(
  csvText: string,
  professionalId: string
): Promise<ImportResult> {
  const rows = parseCSV(csvText)
  const result: ImportResult = { imported: 0, duplicates: 0, errors: 0, total: rows.length }

  const existingLeads = await listLeads(professionalId)
  const existingPhones = new Set(
    existingLeads
      .map((l) => normalizePhone(l.telefone || l.whatsapp))
      .filter(Boolean)
  )
  const existingNameAddr = new Set(
    existingLeads.map((l) =>
      `${(l.nome || "").toLowerCase()}|${(l.endereco || "").toLowerCase()}|${(l.site || "").toLowerCase()}`
    )
  )

  for (const row of rows) {
    try {
      // Suporte a formatos do Google Maps Scraper Kit (title, phone, full_address, website, etc.)
      const nome =
        row["nome"] ||
        row["name"] ||
        row["title"] ||
        row["empresa"] ||
        row["business_name"] ||
        row["place_name"] ||
        row["razao_social"] ||
        ""

      if (!nome) {
        result.errors++
        continue
      }

      const telefone =
        row["telefone"] ||
        row["phone"] ||
        row["phone_number"] ||
        row["tel"] ||
        row["celular"] ||
        row["phone_1"] ||
        null

      const whatsapp =
        row["whatsapp"] ||
        row["zap"] ||
        row["wa"] ||
        telefone ||
        null

      const instagram = normalizeInstagram(
        row["instagram"] || row["insta"] || row["ig"] || row["social_instagram"] || null
      )

      const site =
        row["site"] ||
        row["website"] ||
        row["url"] ||
        row["link"] ||
        row["web"] ||
        null

      const cidade =
        row["cidade"] ||
        row["city"] ||
        row["municipio"] ||
        row["município"] ||
        null

      const estado =
        row["estado"] ||
        row["state"] ||
        row["uf"] ||
        null

      const endereco =
        row["endereco"] ||
        row["endereço"] ||
        row["address"] ||
        row["full_address"] ||
        row["street"] ||
        row["logradouro"] ||
        null

      // Deduplicação por telefone
      const phoneNorm = normalizePhone(telefone || whatsapp)
      if (phoneNorm && existingPhones.has(phoneNorm)) {
        result.duplicates++
        continue
      }

      // Deduplicação por nome + endereço/site
      if (!phoneNorm) {
        const nameAddrKey = `${nome.toLowerCase()}|${(endereco || "").toLowerCase()}|${(site || "").toLowerCase()}`
        if (existingNameAddr.has(nameAddrKey)) {
          result.duplicates++
          continue
        }
      }

      const newLead: LeadInsert = {
        professional_id: professionalId,
        nome,
        telefone: telefone || null,
        whatsapp: whatsapp || null,
        instagram: instagram || null,
        site: site || null,
        cidade: cidade || null,
        estado: estado || null,
        endereco: endereco || null,
        status: "novo",
        observacao: null,
      }

      await createLead(newLead)

      if (phoneNorm) existingPhones.add(phoneNorm)
      const nameAddrKey = `${nome.toLowerCase()}|${(endereco || "").toLowerCase()}|${(site || "").toLowerCase()}`
      existingNameAddr.add(nameAddrKey)

      result.imported++
    } catch {
      result.errors++
    }
  }

  return result
}
