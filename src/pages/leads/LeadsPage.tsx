import { useState, useEffect, useRef, useMemo } from "react"
import {
  Search, Upload, Plus, MessageCircle, Link2, ChevronDown,
  X, Loader2, Filter, Trash2, Check, MapPin, Globe, Phone,
  TrendingUp, Users, UserCheck, Zap, Star
} from "lucide-react"
import { toast } from "react-hot-toast"
import { useAuthStore } from "@/store/authStore"
import {
  listLeads, createLead, updateLead, deleteLead, importLeadsFromCSV,
  formatWhatsAppLink, normalizeInstagram,
  STATUS_CONFIG,
  type Lead, type LeadStatus, type LeadInsert
} from "@/lib/leadsService"

// ─── Helpers ───────────────────────────────────────────────────────────────────

const ALL_STATUSES = Object.entries(STATUS_CONFIG) as [LeadStatus, typeof STATUS_CONFIG[LeadStatus]][]

function StatusBadge({ status, small }: { status: LeadStatus; small?: boolean }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1 border rounded-full font-bold whitespace-nowrap
        ${small ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"}
        ${cfg.bg} ${cfg.color}`}
    >
      {cfg.emoji} {cfg.label}
    </span>
  )
}

// ─── Modal: Editar / Novo Lead ─────────────────────────────────────────────────

interface LeadModalProps {
  lead?: Lead | null
  professionalId: string
  onClose: () => void
  onSaved: (lead: Lead) => void
}

function LeadModal({ lead, professionalId, onClose, onSaved }: LeadModalProps) {
  const isEdit = !!lead
  const [form, setForm] = useState<Partial<LeadInsert>>({
    nome: lead?.nome ?? "",
    telefone: lead?.telefone ?? "",
    whatsapp: lead?.whatsapp ?? "",
    instagram: lead?.instagram ?? "",
    site: lead?.site ?? "",
    cidade: lead?.cidade ?? "",
    estado: lead?.estado ?? "",
    endereco: lead?.endereco ?? "",
    status: lead?.status ?? "novo",
    observacao: lead?.observacao ?? "",
    professional_id: professionalId,
  })
  const [saving, setSaving] = useState(false)

  function set(key: keyof LeadInsert, val: string) {
    setForm((f) => ({ ...f, [key]: val || null }))
  }

  async function handleSave() {
    if (!form.nome?.trim()) { toast.error("Nome é obrigatório"); return }
    setSaving(true)
    try {
      let saved: Lead
      const payload = { ...form, nome: form.nome!.trim(), professional_id: professionalId }
      if (isEdit && lead) {
        saved = await updateLead(lead.id, payload)
      } else {
        saved = await createLead(payload as LeadInsert)
      }
      toast.success(isEdit ? "Lead atualizado!" : "Lead adicionado!")
      onSaved(saved)
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar lead")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-black text-[#0D2329]">
            {isEdit ? "✏️ Editar Lead" : "➕ Novo Lead"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="text-xs font-black text-[#0D2329] mb-1 block">Nome / Empresa *</label>
            <input
              className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              placeholder="Ex: Psicopedagoga Maria Silva"
              value={form.nome ?? ""}
              onChange={(e) => set("nome", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-[#0D2329] mb-1 block">Telefone</label>
              <input
                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                placeholder="(11) 99999-9999"
                value={form.telefone ?? ""}
                onChange={(e) => set("telefone", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-black text-[#0D2329] mb-1 block">WhatsApp</label>
              <input
                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                placeholder="(11) 99999-9999"
                value={form.whatsapp ?? ""}
                onChange={(e) => set("whatsapp", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-[#0D2329] mb-1 block">Instagram</label>
              <input
                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                placeholder="@psicopedagoga"
                value={form.instagram ?? ""}
                onChange={(e) => set("instagram", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-black text-[#0D2329] mb-1 block">Site</label>
              <input
                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                placeholder="https://..."
                value={form.site ?? ""}
                onChange={(e) => set("site", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-[#0D2329] mb-1 block">Cidade</label>
              <input
                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                placeholder="São Paulo"
                value={form.cidade ?? ""}
                onChange={(e) => set("cidade", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-black text-[#0D2329] mb-1 block">Estado</label>
              <input
                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                placeholder="SP"
                maxLength={2}
                value={form.estado ?? ""}
                onChange={(e) => set("estado", e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-[#0D2329] mb-1 block">Endereço</label>
            <input
              className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              placeholder="Rua, número, bairro"
              value={form.endereco ?? ""}
              onChange={(e) => set("endereco", e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-black text-[#0D2329] mb-1 block">Status</label>
            <select
              className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              {ALL_STATUSES.map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-black text-[#0D2329] mb-1 block">Observação</label>
            <textarea
              rows={3}
              className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              placeholder="Ex: Disse que usa planilhas. Interessada em demonstração."
              value={form.observacao ?? ""}
              onChange={(e) => set("observacao", e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-2xl text-sm font-black bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dropdown de Status inline ─────────────────────────────────────────────────

function StatusDropdown({ lead, onUpdate }: { lead: Lead; onUpdate: (l: Lead) => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  async function changeStatus(status: LeadStatus) {
    setOpen(false)
    setLoading(true)
    try {
      const updated = await updateLead(lead.id, { status })
      onUpdate(updated)
    } catch {
      toast.error("Erro ao atualizar status")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="flex items-center gap-1 group"
      >
        <StatusBadge status={lead.status} small />
        {loading
          ? <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
          : <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
        }
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-2xl shadow-xl py-1.5 min-w-[180px]">
          {ALL_STATUSES.map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => changeStatus(key)}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-bold hover:bg-gray-50 transition-colors
                ${lead.status === key ? "opacity-60" : ""}`}
            >
              <span>{cfg.emoji}</span>
              <span className={cfg.color}>{cfg.label}</span>
              {lead.status === key && <Check className="w-3 h-3 ml-auto text-gray-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Linha da tabela ───────────────────────────────────────────────────────────

function LeadRow({
  lead,
  onUpdate,
  onDelete,
  onEdit,
}: {
  lead: Lead
  onUpdate: (l: Lead) => void
  onDelete: (id: string) => void
  onEdit: (l: Lead) => void
}) {
  const [editObs, setEditObs] = useState(false)
  const [obs, setObs] = useState(lead.observacao ?? "")
  const [savingObs, setSavingObs] = useState(false)

  async function saveObs() {
    setSavingObs(true)
    try {
      const updated = await updateLead(lead.id, { observacao: obs || null })
      onUpdate(updated)
      setEditObs(false)
    } catch {
      toast.error("Erro ao salvar observação")
    } finally {
      setSavingObs(false)
    }
  }

  const waLink = formatWhatsAppLink(lead.whatsapp || lead.telefone)
  const instaHandle = normalizeInstagram(lead.instagram)

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors group">
      {/* Nome + Localização */}
      <td className="px-4 py-3 min-w-[180px]">
        <div className="font-bold text-sm text-[#0D2329] truncate max-w-[200px]" title={lead.nome}>
          {lead.nome}
        </div>
        {(lead.cidade || lead.estado) && (
          <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
            <MapPin className="w-2.5 h-2.5 shrink-0" />
            {[lead.cidade, lead.estado].filter(Boolean).join(", ")}
          </div>
        )}
      </td>

      {/* Contatos */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1.5">
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1 rounded-full transition-colors whitespace-nowrap"
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              Abrir WhatsApp
            </a>
          )}
          {instaHandle && (
            <a
              href={`https://instagram.com/${instaHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-600 bg-pink-50 hover:bg-pink-100 border border-pink-200 px-2.5 py-1 rounded-full transition-colors whitespace-nowrap"
            >
              <Link2 className="w-3.5 h-3.5 shrink-0" />
              Instagram
            </a>
          )}
          {!waLink && !instaHandle && lead.telefone && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <Phone className="w-3 h-3" /> {lead.telefone}
            </span>
          )}
          {lead.site && (
            <a
              href={lead.site.startsWith("http") ? lead.site : `https://${lead.site}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 transition-colors truncate max-w-[140px]"
              title={lead.site}
            >
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate">{lead.site.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
            </a>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusDropdown lead={lead} onUpdate={onUpdate} />
      </td>

      {/* Observação */}
      <td className="px-4 py-3 min-w-[200px] max-w-[260px]">
        {editObs ? (
          <div className="flex flex-col gap-1.5">
            <textarea
              autoFocus
              rows={2}
              className="w-full text-xs border border-gray-200 rounded-xl px-3 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setEditObs(false) }}
            />
            <div className="flex gap-1.5">
              <button
                onClick={saveObs}
                disabled={savingObs}
                className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#7C3AED] text-white hover:opacity-90"
              >
                {savingObs ? "..." : "Salvar"}
              </button>
              <button
                onClick={() => { setEditObs(false); setObs(lead.observacao ?? "") }}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditObs(true)}
            className="text-left text-xs text-gray-500 hover:text-gray-800 leading-snug transition-colors w-full group/obs"
          >
            {lead.observacao ? (
              <span className="line-clamp-2">{lead.observacao}</span>
            ) : (
              <span className="italic text-gray-300 group-hover/obs:text-gray-500">
                Clique para adicionar observação...
              </span>
            )}
          </button>
        )}
      </td>

      {/* Data + ações */}
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end gap-2">
          <span className="text-[10px] text-gray-400">
            {new Date(lead.created_at).toLocaleDateString("pt-BR")}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(lead)}
              className="p-1 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors"
              title="Editar lead"
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Excluir "${lead.nome}"? Esta ação não pode ser desfeita.`)) {
                  onDelete(lead.id)
                }
              }}
              className="p-1 rounded-lg hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors"
              title="Excluir lead"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ─── Página Principal ──────────────────────────────────────────────────────────

export function LeadsPage() {
  const { user, professional } = useAuthStore()
  const professionalId = professional?.id || user?.id || ""

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [modalLead, setModalLead] = useState<Lead | null | undefined>(undefined) // undefined = fechado

  // Filtros
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "">("")
  const [filterCidade, setFilterCidade] = useState("")
  const [filterEstado, setFilterEstado] = useState("")

  // CSV import
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!professionalId) return
    setLoading(true)
    listLeads(professionalId)
      .then(setLeads)
      .catch(() => toast.error("Erro ao carregar leads"))
      .finally(() => setLoading(false))
  }, [professionalId])

  // ── Dashboard stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: leads.length,
    novos: leads.filter((l) => l.status === "novo").length,
    contatados: leads.filter((l) => l.status === "contatado").length,
    testando: leads.filter((l) => l.status === "testando").length,
    clientes: leads.filter((l) => l.status === "cliente").length,
  }), [leads])

  // ── Filtros aplicados ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = leads
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (l) =>
          l.nome.toLowerCase().includes(q) ||
          (l.telefone ?? "").includes(q) ||
          (l.whatsapp ?? "").includes(q) ||
          (l.cidade ?? "").toLowerCase().includes(q)
      )
    }
    if (filterStatus) list = list.filter((l) => l.status === filterStatus)
    if (filterCidade.trim()) list = list.filter((l) => (l.cidade ?? "").toLowerCase().includes(filterCidade.toLowerCase()))
    if (filterEstado.trim()) list = list.filter((l) => (l.estado ?? "").toUpperCase() === filterEstado.toUpperCase())
    return list
  }, [leads, search, filterStatus, filterCidade, filterEstado])

  // Cidades e estados únicos para sugestões
  const cidades = useMemo(() => [...new Set(leads.map((l) => l.cidade).filter(Boolean))].sort() as string[], [leads])
  const estados = useMemo(() => [...new Set(leads.map((l) => l.estado).filter(Boolean))].sort() as string[], [leads])

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleUpdate(updated: Lead) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
  }

  async function handleDelete(id: string) {
    try {
      await deleteLead(id)
      setLeads((prev) => prev.filter((l) => l.id !== id))
      toast.success("Lead excluído")
    } catch {
      toast.error("Erro ao excluir lead")
    }
  }

  function handleSaved(lead: Lead) {
    setLeads((prev) => {
      const exists = prev.find((l) => l.id === lead.id)
      if (exists) return prev.map((l) => (l.id === lead.id ? lead : l))
      return [lead, ...prev]
    })
    setModalLead(undefined)
  }

  async function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !professionalId) return
    e.target.value = ""
    setImporting(true)
    try {
      const text = await file.text()
      const result = await importLeadsFromCSV(text, professionalId)
      // Recarregar lista
      const fresh = await listLeads(professionalId)
      setLeads(fresh)
      toast.success(
        `✅ ${result.imported} importados · ${result.duplicates} duplicatas ignoradas${result.errors ? ` · ${result.errors} erros` : ""}`,
        { duration: 6000 }
      )
    } catch (e: any) {
      toast.error(e?.message || "Erro ao importar CSV")
    } finally {
      setImporting(false)
    }
  }

  const hasFilters = search || filterStatus || filterCidade || filterEstado

  return (
    <div className="min-h-screen bg-[#F4F7F8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Cabeçalho ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-black text-[#0D2329] flex items-center gap-2">
              🎯 <span>Leads & Prospecção</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Encontre psicopedagogas e acompanhe a prospecção do EvoluIA</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Importar CSV */}
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold border border-[#7C3AED]/30 text-[#7C3AED] bg-[#7C3AED]/5 hover:bg-[#7C3AED]/10 transition-colors disabled:opacity-60"
            >
              {importing
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Upload className="w-4 h-4" />}
              Importar CSV
            </button>

            {/* Novo Lead */}
            <button
              onClick={() => setModalLead(null)}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-black bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white hover:opacity-90 shadow-lg shadow-[#7C3AED]/25 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Novo Lead
            </button>
          </div>
        </div>

        {/* ── Dashboard Stats ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, icon: Users, color: "text-gray-700", bg: "bg-white" },
            { label: "Novos", value: stats.novos, icon: Zap, color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "Contatados", value: stats.contatados, icon: MessageCircle, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Testando", value: stats.testando, icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50" },
            { label: "Clientes", value: stats.clientes, icon: Star, color: "text-green-600", bg: "bg-green-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3`}>
              <div className={`p-2 rounded-xl ${bg === "bg-white" ? "bg-gray-50" : "bg-white/60"}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filtros ─────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-center">
          {/* Pesquisa */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              placeholder="Pesquisar por nome, telefone ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select
              className="pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 appearance-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as LeadStatus | "")}
            >
              <option value="">Todos os status</option>
              {ALL_STATUSES.map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Cidade */}
          <select
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
            value={filterCidade}
            onChange={(e) => setFilterCidade(e.target.value)}
          >
            <option value="">Todas as cidades</option>
            {cidades.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Estado */}
          <select
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
          >
            <option value="">Todos os estados</option>
            {estados.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>

          {/* Limpar filtros */}
          {hasFilters && (
            <button
              onClick={() => { setSearch(""); setFilterStatus(""); setFilterCidade(""); setFilterEstado("") }}
              className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
        </div>

        {/* ── Tabela ──────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span className="text-sm font-bold">Carregando leads...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              {leads.length === 0 ? (
                <>
                  <div className="text-4xl">🎯</div>
                  <div className="text-center">
                    <p className="font-black text-gray-500">Nenhum lead ainda</p>
                    <p className="text-xs mt-1">Importe um CSV do Google Maps ou adicione manualmente</p>
                  </div>
                  <button
                    onClick={() => setModalLead(null)}
                    className="mt-2 flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-black bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white hover:opacity-90"
                  >
                    <Plus className="w-4 h-4" /> Adicionar primeiro lead
                  </button>
                </>
              ) : (
                <>
                  <div className="text-4xl">🔍</div>
                  <p className="font-black text-gray-500">Nenhum lead encontrado</p>
                  <p className="text-xs">Tente outros filtros ou limpe a busca</p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="px-4 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wide">
                      Lead
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wide">
                      Contato
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wide">
                      Observação
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-black text-gray-400 uppercase tracking-wide">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => (
                    <LeadRow
                      key={lead.id}
                      lead={lead}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      onEdit={(l) => setModalLead(l)}
                    />
                  ))}
                </tbody>
              </table>

              <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 font-bold text-right">
                {filtered.length === leads.length
                  ? `${leads.length} leads no total`
                  : `${filtered.length} de ${leads.length} leads`}
              </div>
            </div>
          )}
        </div>

        {/* ── Dica de importação CSV ──────────────────────────────────────────── */}
        {leads.length === 0 && (
          <div className="bg-gradient-to-br from-[#1E193A] to-[#2B1B4A] rounded-2xl border border-[#6D28D9]/40 p-5 text-white">
            <h3 className="font-black text-sm mb-2 flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#A855F7]" />
              Como importar leads do Google Maps
            </h3>
            <ol className="text-xs text-[#C4B5FD] space-y-1 list-decimal list-inside leading-relaxed">
              <li>Use o Google Maps Scraper Kit para exportar psicopedagogas em CSV</li>
              <li>O CSV deve conter colunas: <code className="bg-white/10 px-1 rounded">nome, telefone, whatsapp, instagram, site, cidade, estado, endereco</code></li>
              <li>Clique em "Importar CSV" acima e selecione o arquivo</li>
              <li>Os leads aparecerão automaticamente — duplicatas são ignoradas!</li>
            </ol>
          </div>
        )}
      </div>

      {/* ── Modal ────────────────────────────────────────────────────────────── */}
      {modalLead !== undefined && (
        <LeadModal
          lead={modalLead}
          professionalId={professionalId}
          onClose={() => setModalLead(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
