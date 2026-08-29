import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Search,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  Plus,
  Phone,
  Mail,
  UserCheck,
  MessageSquare,
  Baby,
  ChevronRight,
  Users,
  LayoutGrid,
  List,
  Filter,
  Copy,
  Check,
  Edit2,
  Calendar,
  Sparkles,
  Heart,
  Smile,
  CheckCircle2,
  UserPlus,
  FileText,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getAccessibleProfessionalIds } from "@/lib/teamAccess"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/Dialog"
import { ChildAvatar } from "@/components/ui/ChildAvatar"
import { formatPhone, formatDate } from "@/lib/utils"
import toast from "react-hot-toast"
import type { Guardian, Child } from "@/types/database"
import { NewChildDialog } from "@/pages/children/NewChildDialog"
import { deleteGuardianSafely } from "@/lib/deletionService"

interface GuardianWithChildren extends Guardian {
  children?: {
    relationship: string | null
    is_primary: boolean
    child: Child | null
  }[]
}

type ViewType = "cards" | "list"
type FilterType = "todos" | "with_whatsapp" | "with_children"

export function GuardiansPage() {
  const navigate = useNavigate()
  const { user, professional } = useAuthStore()
  const [guardians, setGuardians] = useState<GuardianWithChildren[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"recent" | "az">("recent")
  const [viewType, setViewType] = useState<ViewType>("cards")
  const [filterType, setFilterType] = useState<FilterType>("todos")
  const [showNewChildDialog, setShowNewChildDialog] = useState(false)
  const [selectedFamilyGuardian, setSelectedFamilyGuardian] = useState<GuardianWithChildren | null>(null)
  const [guardianToDelete, setGuardianToDelete] = useState<GuardianWithChildren | null>(null)
  const [deletingGuardian, setDeletingGuardian] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [selectedChildrenToDelete, setSelectedChildrenToDelete] = useState<string[]>([])

  // Edit Guardian State
  const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null)
  const [editForm, setEditForm] = useState({
    full_name: "",
    cpf: "",
    phone: "",
    whatsapp: "",
    email: "",
    notes: "",
  })
  const [savingEdit, setSavingEdit] = useState(false)

  // Copied Phone state
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const profId = professional?.id || user?.id

  useEffect(() => {
    if (profId) loadGuardians()
  }, [profId, sortBy])

  async function loadGuardians() {
    if (!profId) return
    setLoading(true)
    try {
      const query = supabase
        .from("guardians")
        .select(`
          *,
          children:guardian_children(
            relationship,
            is_primary,
            child:children(id, full_name, photo_url, status, birth_date)
          )
        `)
        .in("professional_id", getAccessibleProfessionalIds(professional, profId))

      const { data, error } = sortBy === "recent"
        ? await query.order("created_at", { ascending: false })
        : await query.order("full_name", { ascending: true })

      if (!error && data) {
        setGuardians(data as any)
      } else {
        const fallbackQuery = supabase
          .from("guardians")
          .select("*")
          .eq("professional_id", profId)

        const { data: simpleData } = sortBy === "recent"
          ? await fallbackQuery.order("created_at", { ascending: false })
          : await fallbackQuery.order("full_name", { ascending: true })

        setGuardians(simpleData || [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmDeleteGuardian() {
    if (!guardianToDelete || !profId) return
    if (deleteConfirmText.trim().toUpperCase() !== "EXCLUIR") {
      toast.error("Por favor, digite EXCLUIR para confirmar a exclusão.")
      return
    }
    setDeletingGuardian(true)
    try {
      const res = await deleteGuardianSafely(guardianToDelete.id, profId, selectedChildrenToDelete)
      if (res.success) {
        toast.success("Responsável excluído com sucesso!", { icon: "🗑️" })
        setGuardianToDelete(null)
        await loadGuardians()
      } else {
        toast.error(res.error || "Erro ao excluir responsável.")
      }
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado ao excluir responsável.")
    } finally {
      setDeletingGuardian(false)
    }
  }

  function handleCopyPhone(e: React.MouseEvent, id: string, phone: string) {
    e.stopPropagation()
    const clean = phone.replace(/\D/g, "")
    navigator.clipboard.writeText(clean || phone)
    setCopiedId(id)
    toast.success("Telefone copiado!")
    setTimeout(() => setCopiedId(null), 2000)
  }

  function openEdit(g: Guardian) {
    setEditingGuardian(g)
    setEditForm({
      full_name: g.full_name || "",
      cpf: g.cpf || "",
      phone: g.phone || "",
      whatsapp: g.whatsapp || g.phone || "",
      email: g.email || "",
      notes: g.notes || "",
    })
  }

  async function handleSaveEdit() {
    if (!editingGuardian) return
    if (!editForm.full_name.trim()) {
      toast.error("Nome do responsável é obrigatório")
      return
    }

    setSavingEdit(true)
    try {
      const { error } = await supabase
        .from("guardians")
        .update({
          full_name: editForm.full_name.trim(),
          cpf: editForm.cpf.trim() || null,
          phone: editForm.phone.trim() || null,
          whatsapp: editForm.whatsapp.trim() || editForm.phone.trim() || null,
          email: editForm.email.trim() || null,
          notes: editForm.notes.trim() || null,
        })
        .eq("id", editingGuardian.id)

      if (error) throw error

      toast.success("Responsável atualizado com sucesso!")
      setEditingGuardian(null)
      loadGuardians()
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "Erro desconhecido"))
    } finally {
      setSavingEdit(false)
    }
  }

  // Smart Search: matches Guardian Name, Phone, Email, CPF OR Child Name!
  const filtered = guardians.filter((g) => {
    const q = search.toLowerCase().trim()
    const linkedChildren = g.children?.filter((c) => c.child) || []
    const hasPhone = Boolean(g.whatsapp || g.phone)

    if (filterType === "with_whatsapp" && !hasPhone) return false
    if (filterType === "with_children" && linkedChildren.length === 0) return false

    if (!q) return true

    const guardianText = `${g.full_name} ${g.phone || ""} ${g.email || ""} ${g.cpf || ""}`.toLowerCase()
    if (guardianText.includes(q)) return true

    const childrenMatch = linkedChildren.some((link) =>
      link.child?.full_name?.toLowerCase().includes(q)
    )
    if (childrenMatch) return true

    return false
  })

  const countWithWhatsapp = guardians.filter((g) => Boolean(g.whatsapp || g.phone)).length
  const countWithChildren = guardians.filter((g) => (g.children?.filter((c) => c.child) || []).length > 0).length
  const totalChildrenLinked = guardians.reduce((acc, g) => acc + (g.children?.filter((c) => c.child)?.length || 0), 0)

  const guardianChildrenToDelete = (guardianToDelete?.children || [])
    .filter((c) => c.child)
    .map((c) => ({ id: c.child!.id, full_name: c.child!.full_name }))

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-[#0D2329] tracking-tight">
              Responsáveis & Família
            </h1>
            <div className="w-8 h-8 rounded-2xl bg-[#EDE9FE] border border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center shadow-xs">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#6B7C83]">
            Gerencie contatos, WhatsApp dos pais, vínculo familiar e dados cadastrais.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setShowNewChildDialog(true)}
          className="h-10 px-5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white text-xs font-black flex items-center gap-2 shadow-md active:scale-95 transition-all shrink-0"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Novo Responsável</span>
        </button>
      </div>

      {/* 2. COLORFUL SUMMARY METRIC CARDS (Dashboard-style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Responsáveis */}
        <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm flex items-center justify-between hover:border-[#7C3AED]/40 transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase text-[#6B7C83] tracking-wider">
              Total de Responsáveis
            </p>
            <h3 className="text-2xl font-black text-[#0D2329]">{guardians.length}</h3>
            <span className="inline-block text-[11px] font-bold text-[#7C3AED]">
              Cadastrados no consultório
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] border border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center shrink-0 shadow-xs">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Com WhatsApp */}
        <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm flex items-center justify-between hover:border-[#10B981]/40 transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase text-[#6B7C83] tracking-wider">
              Com WhatsApp Ativo
            </p>
            <h3 className="text-2xl font-black text-[#0D2329]">{countWithWhatsapp}</h3>
            <span className="inline-block text-[11px] font-bold text-[#10B981]">
              Contato direto habilitado
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#E8F8F5] border border-[#A7F3D0] text-[#10B981] flex items-center justify-center shrink-0 shadow-xs">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Com Filhos Vinculados */}
        <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm flex items-center justify-between hover:border-[#0284C7]/40 transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase text-[#6B7C83] tracking-wider">
              Famílias com Filhos
            </p>
            <h3 className="text-2xl font-black text-[#0D2329]">{countWithChildren}</h3>
            <span className="inline-block text-[11px] font-bold text-[#0284C7]">
              Pacientes vinculados
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] border border-[#BAE6FD] text-[#0284C7] flex items-center justify-center shrink-0 shadow-xs">
            <Baby className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Total de Vínculos */}
        <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm flex items-center justify-between hover:border-[#F59E0B]/40 transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase text-[#6B7C83] tracking-wider">
              Vínculos Familiares
            </p>
            <h3 className="text-2xl font-black text-[#0D2329]">{totalChildrenLinked}</h3>
            <span className="inline-block text-[11px] font-bold text-[#EA580C]">
              Relações mapeadas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FEF8EC] border border-[#FDE68A] text-[#F59E0B] flex items-center justify-center shrink-0 shadow-xs">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR: SEARCH, SORT, VIEW TOGGLE & FILTER CHIPS */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-[#D8E5E7] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8CAAB1]" />
            <input
              type="text"
              placeholder="Buscar por responsável, telefone, CPF ou nome do filho..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all placeholder:text-[#8CAAB1]"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-2.5 w-full md:w-auto shrink-0">
            {/* Sort By Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 px-3.5 rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] hover:bg-white text-xs font-black text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all flex-1 sm:flex-initial"
            >
              <option value="recent">⏱️ Mais Recentes</option>
              <option value="az">🔤 Ordem Alfabética (A - Z)</option>
            </select>

            {/* View Mode Toggle: Cards vs List */}
            <div className="flex bg-[#F7FAFA] rounded-2xl p-1 border-2 border-[#D8E5E7] shrink-0 gap-1">
              <button
                onClick={() => setViewType("cards")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                  viewType === "cards"
                    ? "bg-[#7C3AED] text-white shadow-xs"
                    : "text-[#6B7C83] hover:text-[#0D2329] hover:bg-white"
                }`}
                title="Visualização em Cards"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                onClick={() => setViewType("list")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                  viewType === "list"
                    ? "bg-[#7C3AED] text-white shadow-xs"
                    : "text-[#6B7C83] hover:text-[#0D2329] hover:bg-white"
                }`}
                title="Visualização em Lista / Tabela"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Chips (Modern Smooth Pills Bar) */}
        <div className="overflow-x-auto -mx-1 px-1 scrollbar-none pt-2 border-t border-[#EEF5F6]">
          <div className="flex items-center gap-1.5 p-1 bg-[#F8FAFB] rounded-full sm:rounded-2xl border-2 border-[#D8E5E7] w-max">
            {[
              { id: "todos", label: "Todos", shortLabel: "Todos", count: guardians.length },
              { id: "with_whatsapp", label: "Com WhatsApp Ativo", shortLabel: "Com WhatsApp", count: countWithWhatsapp },
              { id: "with_children", label: "Com Filhos Vinculados", shortLabel: "Com Filhos", count: countWithChildren },
            ].map((f) => {
              const isSelected = filterType === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterType(f.id as FilterType)}
                  className={`px-3.5 py-1.5 sm:py-2 rounded-full sm:rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${
                    isSelected
                      ? "bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white shadow-md"
                      : "text-[#4F6C74] hover:text-[#0D2329] hover:bg-white bg-transparent"
                  }`}
                >
                  <span className="sm:hidden">{f.shortLabel}</span>
                  <span className="hidden sm:inline">{f.label}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                      isSelected
                        ? "bg-white/25 text-white"
                        : "bg-white text-[#6B7C83] border border-[#D8E5E7]"
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 4. MAIN CONTENT: GRID OR LIST VIEW */}
      {loading ? (
        <div className={viewType === "cards" ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-56 bg-white border-2 border-[#D8E5E7] animate-pulse rounded-3xl shadow-xs" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border-2 border-dashed border-[#D8E5E7] text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#EDE9FE] border-2 border-[#DDD6FE] flex items-center justify-center mx-auto text-[#7C3AED] shadow-xs">
            <UserCheck className="w-8 h-8" />
          </div>
          {guardians.length === 0 ? (
            <div className="space-y-2">
              <h3 className="font-black text-lg text-[#0D2329]">Nenhum responsável cadastrado ainda</h3>
              <p className="text-xs font-semibold text-[#6B7C83] max-w-md mx-auto">
                Os dados dos pais e responsáveis são adicionados automaticamente ao cadastrar ou editar um paciente.
              </p>
              <button
                onClick={() => setShowNewChildDialog(true)}
                className="mt-3 px-5 py-2.5 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black inline-flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Cadastrar Criança & Responsável</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <h3 className="font-black text-base text-[#0D2329]">Nenhum responsável encontrado</h3>
              <p className="text-xs font-semibold text-[#6B7C83]">
                Não encontramos ninguém com o termo <strong>"{search}"</strong>.
              </p>
            </div>
          )}
        </div>
      ) : viewType === "list" ? (
        /* 1. LIST / TABLE VIEW (Clean & Modern) */
        <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] shadow-sm overflow-hidden divide-y divide-[#EEF5F6]">
          {filtered.map((g) => {
            const rawPhone = g.whatsapp || g.phone || ""
            const cleanPhone = rawPhone.replace(/\D/g, "")
            const linkedChildren = g.children?.filter((c) => c.child) || []
            const isCopied = copiedId === g.id

            return (
              <div
                key={g.id}
                className="p-4 sm:p-5 hover:bg-[#FAF5FF] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                {/* Guardian Info */}
                <div className="flex items-center gap-3.5 min-w-0 md:w-1/3">
                  <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] border-2 border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center font-black text-base shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    {g.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-sm text-[#0D2329] group-hover:text-[#7C3AED] truncate transition-colors">
                      {g.full_name}
                    </h3>
                    <p className="text-xs font-semibold text-[#6B7C83] truncate mt-0.5">
                      {g.cpf ? `CPF: ${g.cpf}` : "Responsável legal"}
                    </p>
                  </div>
                </div>

                {/* Primary Phone & WhatsApp Actions */}
                <div className="min-w-0 md:w-1/4">
                  {rawPhone ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-xs text-[#0D2329] font-mono">
                        {formatPhone(rawPhone)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyPhone(e, g.id, rawPhone)}
                        className="px-2 py-1 bg-[#F7FAFA] hover:bg-[#EDE9FE] text-[#6B7C83] hover:text-[#7C3AED] border border-[#D8E5E7] rounded-lg transition-colors text-[10px] font-bold"
                        title="Copiar telefone"
                      >
                        {isCopied ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-[#8DA3A8] italic font-semibold">Sem telefone</span>
                  )}
                </div>

                {/* Linked Children */}
                <div className="min-w-0 md:w-1/4">
                  {linkedChildren.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {linkedChildren.map((link, idx) => (
                        <button
                          key={idx}
                          onClick={() => navigate(`/criancas/${link.child!.id}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#F5F3FF] hover:bg-[#7C3AED] hover:text-white text-[#7C3AED] border border-[#DDD6FE] text-xs font-black transition-all truncate max-w-[180px]"
                          title="Abrir ficha da criança"
                        >
                          <span>🧒 {link.child!.full_name}</span>
                          {link.relationship && (
                            <span className="text-[10px] opacity-75 font-normal">
                              ({link.relationship})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-[#8DA3A8] italic font-semibold">Sem filho vinculado</span>
                  )}
                </div>

                {/* Fast Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 justify-end">
                  {cleanPhone && (
                    <a
                      href={`https://wa.me/55${cleanPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 text-[#065F46] bg-[#E8F8F5] hover:bg-[#10B981] hover:text-white rounded-xl border border-[#10B981]/30 transition-all text-xs font-black flex items-center gap-1.5 shadow-2xs"
                      title="Abrir WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5 fill-current" />
                      <span>WhatsApp</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => openEdit(g)}
                    className="p-2 text-[#6B7C83] hover:text-[#7C3AED] hover:bg-[#EDE9FE] rounded-xl border border-[#D8E5E7] transition-all text-xs"
                    title="Editar dados"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>


                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* 2. CARD VIEW (Lively, Colorful, Contact-First Family Cards) */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((g) => {
            const rawPhone = g.whatsapp || g.phone || ""
            const cleanPhone = rawPhone.replace(/\D/g, "")
            const linkedChildren = g.children?.filter((c) => c.child) || []
            const isCopied = copiedId === g.id

            return (
              <div
                key={g.id}
                className="p-4 sm:p-5 rounded-3xl border-2 border-[#D8E5E7] bg-white hover:border-[#7C3AED]/50 hover:shadow-lg transition-all space-y-3.5 flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="space-y-3">
                  {/* 1. Header: Avatar + Name + Edit Button */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-13 h-13 min-w-[52px] min-h-[52px] max-w-[52px] max-h-[52px] rounded-2xl bg-[#EDE9FE] border-2 border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center font-black text-lg shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        {g.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-sm sm:text-base text-[#0D2329] group-hover:text-[#7C3AED] transition-colors truncate leading-tight">
                          {g.full_name}
                        </h3>
                        <p className="text-[10px] font-bold text-[#6B7C83] mt-0.5 truncate bg-[#F7FAFA] border border-[#D8E5E7] px-2 py-0.5 rounded-md inline-block">
                          {g.cpf ? `CPF: ${g.cpf}` : "Responsável Legal"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(g)}
                        className="w-9 h-9 rounded-2xl bg-[#F7FAFA] hover:bg-[#EDE9FE] text-[#6B7C83] hover:text-[#7C3AED] border border-[#D8E5E7] hover:border-[#DDD6FE] flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-2xs"
                        title="Editar responsável"
                      >
                        <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>

                  {/* 2. Primary Phone Banner (WhatsApp + Copy) */}
                  {rawPhone ? (
                    <div className="p-3 bg-[#E8F8F5] border-2 border-[#10B981]/30 rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                        <span className="font-black text-xs text-[#065F46] font-mono truncate">
                          {formatPhone(rawPhone)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleCopyPhone(e, g.id, rawPhone)}
                          className="px-2.5 py-1 bg-white hover:bg-[#F7FAFA] border border-[#10B981]/30 rounded-xl text-[11px] font-black text-[#065F46] flex items-center gap-1 transition-all shadow-2xs"
                          title="Copiar número"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-[#10B981]" />
                              <span>Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>

                        {cleanPhone && (
                          <a
                            href={`https://wa.me/55${cleanPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-[#10B981] text-white hover:bg-[#059669] rounded-xl transition-all shadow-2xs"
                            title="Conversar no WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5 fill-current" />
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-[#F7FAFA] border border-[#D8E5E7] rounded-2xl text-center text-xs text-[#8DA3A8] italic font-semibold">
                      Nenhum telefone cadastrado
                    </div>
                  )}

                  {/* 3. Linked Children & Family Section */}
                  <div className="pt-2 border-t border-[#EEF5F6] space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[#6B7C83]">
                      <span className="flex items-center gap-1">
                        <Baby className="w-3.5 h-3.5 text-[#7C3AED]" />
                        <span>{linkedChildren.length > 1 ? "Família / Filhos:" : "Filho(a) Vinculado:"}</span>
                      </span>
                      <span className="text-[10px] font-black bg-[#EDE9FE] text-[#7C3AED] px-2 py-0.5 rounded-full border border-[#DDD6FE]">
                        {linkedChildren.length} {linkedChildren.length === 1 ? "criança" : "crianças"}
                      </span>
                    </div>

                    {linkedChildren.length > 0 ? (
                      <div className="space-y-1.5 pt-0.5">
                        {linkedChildren.map((link, idx) => (
                          <div
                            key={idx}
                            onClick={() => navigate(`/criancas/${link.child!.id}`)}
                            className="p-2.5 rounded-2xl bg-[#F5F3FF] hover:bg-[#7C3AED] hover:text-white text-[#0D2329] border border-[#DDD6FE] text-xs font-black transition-all cursor-pointer flex items-center justify-between group/item shadow-2xs"
                          >
                            <span className="truncate flex items-center gap-2">
                              <span>🧒</span>
                              <span className="truncate group-hover/item:text-white">{link.child!.full_name}</span>
                              {link.relationship && (
                                <span className="text-[10px] opacity-75 font-semibold">
                                  ({link.relationship})
                                </span>
                              )}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover/item:text-white group-hover/item:translate-x-0.5 transition-transform shrink-0" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#8DA3A8] italic font-semibold">
                        Sem criança vinculada diretamente.
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. Bottom: Email & Registration Date */}
                <div className="pt-3 border-t border-[#EEF5F6] flex items-center justify-between text-[11px] text-[#8DA3A8] font-bold">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#8CAAB1]" />
                    <span>{formatDate(g.created_at)}</span>
                  </span>

                  {linkedChildren.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setSelectedFamilyGuardian(g)}
                      className="px-2.5 py-1 rounded-xl bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white font-black text-xs flex items-center gap-1 transition-colors"
                    >
                      <span>Ver família ({linkedChildren.length})</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  ) : g.email ? (
                    <span className="truncate max-w-[140px] text-right font-medium text-[#6B7C83]" title={g.email}>
                      ✉️ {g.email}
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Family Hub Dialog (Visão da Família Completa) */}
      <Dialog
        open={Boolean(selectedFamilyGuardian)}
        onOpenChange={(open) => !open && setSelectedFamilyGuardian(null)}
      >
        <DialogContent className="max-w-xl rounded-3xl border-2 border-[#D8E5E7] p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-[#0D2329]">
              <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center">
                <Baby className="w-4 h-4" />
              </div>
              <span>Visão da Família — {selectedFamilyGuardian?.full_name}</span>
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4 pt-2">
            {/* Guardian Quick Info */}
            <div className="p-4 bg-[#F7FAFA] border-2 border-[#D8E5E7] rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] font-black text-sm flex items-center justify-center border border-[#DDD6FE]">
                    {selectedFamilyGuardian?.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-[#0D2329]">
                      {selectedFamilyGuardian?.full_name}
                    </h4>
                    <p className="text-[11px] text-[#6B7C83] font-bold">
                      {selectedFamilyGuardian?.cpf ? `CPF: ${selectedFamilyGuardian.cpf}` : "Responsável legal"}
                    </p>
                  </div>
                </div>

                {selectedFamilyGuardian?.phone && (
                  <a
                    href={`https://wa.me/55${selectedFamilyGuardian.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-[#E8F8F5] text-[#065F46] hover:bg-[#10B981] hover:text-white rounded-xl text-xs font-black flex items-center gap-1.5 border border-[#10B981]/30 transition-all shadow-2xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5 fill-current" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>

              {selectedFamilyGuardian?.notes && (
                <p className="text-xs text-[#8B6514] bg-[#FEF8EC] p-2.5 rounded-xl border border-[#F4C95D]/50 italic font-semibold">
                  💬 "{selectedFamilyGuardian.notes}"
                </p>
              )}
            </div>

            {/* List of Children */}
            <div className="space-y-2">
              <h5 className="text-xs font-black uppercase tracking-wider text-[#6B7C83] flex items-center justify-between">
                <span>Filhos / Crianças no Consultório:</span>
                <span className="text-[#7C3AED] font-black">
                  {selectedFamilyGuardian?.children?.filter((c) => c.child)?.length || 0} vinculados
                </span>
              </h5>

              <div className="space-y-2">
                {selectedFamilyGuardian?.children
                  ?.filter((c) => c.child)
                  ?.map((link, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border-2 border-[#D8E5E7] bg-white hover:border-[#7C3AED] transition-all flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ChildAvatar
                          photoUrl={link.child!.photo_url}
                          name={link.child!.full_name}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm text-[#0D2329] truncate">
                              {link.child!.full_name}
                            </h4>
                            {link.relationship && (
                              <span className="text-[10px] bg-[#EDE9FE] text-[#7C3AED] px-2 py-0.5 rounded-md font-bold border border-[#DDD6FE]">
                                {link.relationship}
                              </span>
                            )}
                          </div>
                          <Badge statusKey={link.child!.status} type="child" className="mt-1 text-[10px]" />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/criancas/${link.child!.id}`)}
                        className="px-3 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-black flex items-center gap-1 transition-all shadow-2xs"
                      >
                        <span>Ver Ficha</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </DialogBody>

          <DialogFooter className="border-t border-[#EEF5F6] pt-3">
            <Button
              variant="outline"
              onClick={() => setSelectedFamilyGuardian(null)}
              className="rounded-xl text-xs font-bold"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Guardian Dialog */}
      <Dialog
        open={Boolean(editingGuardian)}
        onOpenChange={(open) => !open && setEditingGuardian(null)}
      >
        <DialogContent className="max-w-md rounded-3xl border-2 border-[#D8E5E7] p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-[#0D2329]">
              <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center">
                <Edit2 className="w-4 h-4" />
              </div>
              <span>Editar Responsável</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSaveEdit()
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#0D2329]">Nome Completo *</label>
              <input
                type="text"
                required
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] text-[#0D2329]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0D2329]">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] text-[#0D2329]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0D2329]">CPF</label>
                <input
                  type="text"
                  value={editForm.cpf}
                  onChange={(e) => setEditForm({ ...editForm, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] text-[#0D2329]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#0D2329]">E-mail</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="exemplo@email.com"
                className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] text-[#0D2329]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#0D2329]">Observações / Recados</label>
              <textarea
                rows={2}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Preferência de horário, restrições..."
                className="w-full p-3 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] text-[#0D2329] resize-none"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#EEF5F6]">
              <button
                type="button"
                onClick={() => {
                  const g = editingGuardian
                  setEditingGuardian(null)
                  if (g) setGuardianToDelete(g)
                }}
                className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-2xl border border-red-200 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Responsável</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingGuardian(null)}
                  className="px-4 py-2 text-xs font-bold text-[#6B7C83] rounded-2xl hover:bg-[#F7FAFA]"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white text-xs font-black shadow-md transition-all active:scale-95"
                >
                  {savingEdit ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Child/Guardian Dialog */}
      <NewChildDialog
        open={showNewChildDialog}
        onClose={() => setShowNewChildDialog(false)}
        onSuccess={() => {
          setShowNewChildDialog(false)
          loadGuardians()
        }}
      />
    
      {/* Modal de Confirmação Segura de Exclusão do Responsável */}
      <Dialog open={Boolean(guardianToDelete)} onOpenChange={(open) => !open && setGuardianToDelete(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-2 border-[#D8E5E7] bg-white shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-[#EEF5F6] flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border-2 border-red-200 flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-[#0D2329]">
                Excluir responsável?
              </DialogTitle>
              <p className="text-xs font-semibold text-[#6B7C83] mt-0.5">
                {guardianToDelete?.full_name}
              </p>
            </div>
          </DialogHeader>

          <DialogBody className="p-6 space-y-4 text-xs font-semibold text-[#2E4A52]">
            <p className="leading-relaxed">
              Esta ação removerá o responsável <strong>{guardianToDelete?.full_name}</strong> do cadastro da clínica. <span className="text-red-600 font-bold">Esta ação não poderá ser desfeita.</span>
            </p>

            {/* Opção de Excluir Crianças Vinculadas */}
            {guardianChildrenToDelete.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#FEF8EC] border-2 border-[#FDE68A] space-y-2.5">
                <p className="text-xs font-black text-[#B8871E] flex items-center gap-1.5">
                  <span>👶</span>
                  <span>Crianças / Pacientes Vinculados ({guardianChildrenToDelete.length}):</span>
                </p>
                <p className="text-[11px] text-[#6B7C83]">
                  Deseja excluir também o cadastro dos pacientes vinculados a este responsável?
                </p>
                <div className="space-y-1.5 pt-1">
                  {guardianChildrenToDelete.map((c) => {
                    const isChecked = selectedChildrenToDelete.includes(c.id)
                    return (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#0D2329] bg-white p-2 rounded-xl border border-[#FDE68A]">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedChildrenToDelete([...selectedChildrenToDelete, c.id])
                            } else {
                              setSelectedChildrenToDelete(selectedChildrenToDelete.filter((id) => id !== c.id))
                            }
                          }}
                          className="w-4 h-4 rounded text-red-600 accent-red-600 cursor-pointer"
                        />
                        <span>{c.full_name} (Paciente)</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Campo Obrigatório: Digite EXCLUIR */}
            <div className="space-y-1.5 pt-2 border-t border-[#EEF5F6]">
              <label className="text-xs font-black text-[#0D2329] block">
                Para confirmar, digite <span className="text-red-600 font-mono font-black">EXCLUIR</span> abaixo:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Digite EXCLUIR"
                className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#D8E5E7] focus:border-red-500 font-bold text-center uppercase tracking-widest text-sm focus:outline-none placeholder:normal-case placeholder:tracking-normal placeholder:font-medium placeholder:text-[#8CAAB1] transition-all bg-[#F8FAFB] focus:bg-white"
              />
            </div>
          </DialogBody>

          <DialogFooter className="p-4 bg-[#F8FAFB] border-t border-[#EEF5F6] flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={deletingGuardian}
              onClick={() => setGuardianToDelete(null)}
              className="rounded-2xl border-2 border-[#D8E5E7] font-bold text-xs"
            >
              Cancelar
            </Button>

            <button
              type="button"
              disabled={deletingGuardian || deleteConfirmText.trim().toUpperCase() !== "EXCLUIR"}
              onClick={handleConfirmDeleteGuardian}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#EF4444] to-[#DC2626] hover:from-[#DC2626] hover:to-[#B91C1C] text-white font-black text-xs shadow-md active:scale-95 transition-all flex items-center gap-2 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {deletingGuardian ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>{deletingGuardian ? "Excluindo..." : "Excluir definitivamente"}</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
