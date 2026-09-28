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
  // Se for URL: https://instagram.com/handle ou https://www.instagram.com/handle/
  const match = s.match(/instagram\.com\/([^/?#\s]+)/i)
  if (match) return match[1].replace(/\/$/, "")
  // Se começar com @
  if (s.startsWith("@")) return s.slice(1).trim()
  return s
}

/** Formata número de telefone para link do WhatsApp (remove não-dígitos, adiciona +55 se necessário) */
export function formatWhatsAppLink(phone?: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, "")
  if (!digits) return null
  const number = digits.startsWith("55") ? digits : `55${digits}`
  return `https://wa.me/${number}`
}

// ─── CRUD ──────────────────────────────────────────────────────────────────────

export async function listLeads(professionalId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("professional_id", professionalId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as Lead[]
}

export async function createLead(lead: LeadInsert): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .insert(lead)
    .select()
    .single()

  if (error) throw error
  return data as Lead
}

export async function updateLead(id: string, updates: LeadUpdate): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as Lead
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from("leads").delete().eq("id", id)
  if (error) throw error
}

// ─── Importação CSV ────────────────────────────────────────────────────────────

export interface ImportResult {
  imported: number
  duplicates: number
  errors: number
  total: number
}

/**
 * Parse CSV simples (suporta campos com vírgula entre aspas)
 */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase())

  return lines.slice(1).map((line) => {
    // Handle quoted fields
    const values: string[] = []
    let current = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes
      } else if (line[i] === "," && !inQuotes) {
        values.push(current.trim())
        current = ""
      } else {
        current += line[i]
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

  // Carregar leads existentes para deduplicação
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
      const nome = row["nome"] || row["name"] || row["razao_social"] || row["empresa"] || ""
      if (!nome) { result.errors++; continue }

      const telefone = row["telefone"] || row["phone"] || row["tel"] || null
      const whatsapp = row["whatsapp"] || row["zap"] || telefone || null
      const instagram = normalizeInstagram(row["instagram"] || null)
      const site = row["site"] || row["website"] || row["url"] || null
      const cidade = row["cidade"] || row["city"] || null
      const estado = row["estado"] || row["state"] || row["uf"] || null
      const endereco = row["endereco"] || row["endereço"] || row["address"] || null

      // Verificar duplicata por telefone
      const phoneNorm = normalizePhone(telefone || whatsapp)
      if (phoneNorm && existingPhones.has(phoneNorm)) {
        result.duplicates++
        continue
      }

      // Verificar duplicata por nome+endereço/site (quando sem telefone)
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

      // Adicionar ao set para não duplicar dentro do mesmo CSV
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
