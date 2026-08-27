import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Search,
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
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { formatPhone } from "@/lib/utils"
import type { Guardian, Child } from "@/types/database"
import { NewChildDialog } from "@/pages/children/NewChildDialog"

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
        .eq("professional_id", profId)

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

  return (
    <div className="p-4 md:p-8 max-w-[92%] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#19323A] tracking-tight">
            Responsáveis & Família
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7C83] mt-1">
            {guardians.length} responsável(is) cadastrado(s) no consultório
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => setShowNewChildDialog(true)}
          className="gap-2 shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Novo Responsável
        </Button>
      </div>

      <div className="space-y-3 bg-white p-3.5 rounded-2xl border-2 border-[#D8E5E7] shadow-sm">
        <div className="flex gap-2.5 flex-wrap">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8DA3A8]" />
            <input
              type="text"
              placeholder="Buscar por responsável, telefone, CPF ou nome do filho..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-10 rounded-xl border-2 border-[#D8E5E7] bg-[#F7FAFA] text-xs font-semibold text-[#19323A] focus-visible:outline-none focus-visible:border-[#245C6B] focus-visible:bg-white transition-all placeholder:text-[#8DA3A8]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-10 px-3 rounded-xl border-2 border-[#D8E5E7] bg-[#F7FAFA] text-xs font-bold text-[#19323A] focus-visible:outline-none focus-visible:border-[#245C6B] transition-all"
          >
            <option value="recent">⏱️ Mais Recentes</option>
            <option value="az">🔤 Ordem Alfabética (A - Z)</option>
          </select>

          <div className="flex bg-[#EEF5F6] rounded-xl p-0.5 border-2 border-[#D8E5E7]">
            <button
              onClick={() => setViewType("cards")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                viewType === "cards"
                  ? "bg-[#245C6B] text-white shadow-xs"
                  : "text-[#19323A] hover:bg-white/60"
              }`}
              title="Visualização em Cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => setViewType("list")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                viewType === "list"
                  ? "bg-[#245C6B] text-white shadow-xs"
                  : "text-[#19323A] hover:bg-white/60"
              }`}
              title="Visualização em Lista / Tabela"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lista</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pt-1">
          <div className="flex items-center gap-1 text-xs font-bold text-[#6B7C83] mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtro:</span>
          </div>
          {[
            { id: "todos", label: "Todos", count: guardians.length },
            { id: "with_whatsapp", label: "Com WhatsApp", count: countWithWhatsapp, dot: "bg-[#20836F]" },
            { id: "with_children", label: "Com Filho Vinculado", count: countWithChildren, dot: "bg-[#245C6B]" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id as FilterType)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all flex items-center gap-1.5 shrink-0 ${
                filterType === f.id
                  ? "bg-[#19323A] text-white border-[#19323A] shadow-xs"
                  : "bg-white text-[#4F6C74] border-[#D8E5E7] hover:border-[#245C6B]"
              }`}
            >
              {f.dot && (
                <span
                  className={`w-2 h-2 rounded-full ${filterType === f.id ? "bg-white" : f.dot}`}
                />
              )}
              <span>{f.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  filterType === f.id ? "bg-white/20 text-white" : "bg-[#EEF5F6] text-[#6B7C83]"
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={viewType === "cards" ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-2"}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-44 bg-white border-2 border-[#D8E5E7] animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-2 border-dashed border-[#D8E5E7] text-center py-16">
          <CardContent className="space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#EEF5F6] border-2 border-[#D8E5E7] flex items-center justify-center mx-auto text-[#245C6B]">
              <UserCheck className="w-7 h-7" />
            </div>
            {guardians.length === 0 ? (
              <>
                <h3 className="font-black text-lg text-[#19323A]">Nenhum responsável cadastrado ainda</h3>
                <p className="text-xs text-[#6B7C83] max-w-sm mx-auto">
                  Os dados dos pais e responsáveis são adicionados automaticamente ao cadastrar ou editar uma criança.
                </p>
                <Button size="lg" onClick={() => setShowNewChildDialog(true)} className="mt-2">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Cadastrar Criança e Responsável
                </Button>
              </>
            ) : (
              <>
                <h3 className="font-bold text-base text-[#19323A]">Nenhum responsável encontrado</h3>
                <p className="text-xs text-[#6B7C83]">
                  Não encontramos ninguém com o termo <strong>"{search}"</strong>.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : viewType === "list" ? (
        <div className="bg-white rounded-2xl border-2 border-[#D8E5E7] shadow-sm overflow-hidden">
          <div className="divide-y divide-[#EEF5F6]">
            {filtered.map((g) => {
              const rawPhone = g.whatsapp || g.phone || ""
              const cleanPhone = rawPhone.replace(/\D/g, "")
              const linkedChildren = g.children?.filter((c) => c.child) || []

              return (
                <div
                  key={g.id}
                  className="p-3.5 sm:p-4 hover:bg-[#F7FAFA] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0 md:w-1/3">
                    <div className="w-10 h-10 rounded-xl bg-[#245C6B] text-white font-black text-sm flex items-center justify-center shrink-0 border border-[#63C7B2]/40 shadow-xs">
                      {g.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-sm text-[#19323A] group-hover:text-[#245C6B] truncate">
                        {g.full_name}
                      </h3>
                      <p className="text-xs text-[#8DA3A8] truncate mt-0.5">
                        {g.cpf ? `CPF: ${g.cpf}` : "Responsável legal"}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0 md:w-1/3">
                    {linkedChildren.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {linkedChildren.map((link, idx) => (
                          <button
                            key={idx}
                            onClick={() => navigate(`/criancas/${link.child!.id}`)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#EEF5F6] hover:bg-[#245C6B] hover:text-white text-[#19323A] border border-[#D8E5E7] text-[11px] font-bold transition-all truncate max-w-[200px]"
                            title="Abrir ficha da criança"
                          >
                            <span>🧒 {link.child!.full_name}</span>
                            {link.relationship && (
                              <span className="text-[10px] opacity-75">
                                ({link.relationship})
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-[#8DA3A8] italic">Sem filho vinculado</span>
                    )}
                  </div>

                  <div className="min-w-0 md:w-1/4 space-y-0.5 text-xs text-[#6B7C83]">
                    {g.phone && (
                      <p className="font-medium flex items-center gap-1.5 text-xs text-[#19323A]">
                        <Phone className="w-3 h-3 text-[#245C6B]" />
                        <span>{formatPhone(g.phone)}</span>
                      </p>
                    )}
                    {g.email && (
                      <p className="text-[11px] text-[#8DA3A8] truncate flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-[#245C6B]" />
                        <span className="truncate">{g.email}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 justify-end">
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/55${cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 text-[#20836F] bg-[#E8F8F5] hover:bg-[#20836F] hover:text-white rounded-xl border border-[#63C7B2]/40 transition-all text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                        title="Abrir WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5 fill-current" />
                        <span className="text-xs">WhatsApp</span>
                      </a>
                    )}

                    {linkedChildren[0] && (
                      <button
                        type="button"
                        onClick={() => navigate(`/criancas/${linkedChildren[0].child!.id}`)}
                        className="px-2.5 py-1.5 text-[#245C6B] bg-[#EAF3F5] hover:bg-[#245C6B] hover:text-white rounded-xl border border-[#245C6B]/30 transition-all text-xs font-black flex items-center gap-1 shadow-2xs"
                        title="Ver ficha da criança"
                      >
                        <span>Ficha</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((g) => {
            const rawPhone = g.whatsapp || g.phone || ""
            const cleanPhone = rawPhone.replace(/\D/g, "")
            const linkedChildren = g.children?.filter((c) => c.child) || []

            return (
              <div
                key={g.id}
                className="p-4 rounded-2xl border-2 border-[#D8E5E7] bg-white hover:border-[#245C6B] hover:shadow-md transition-all space-y-3 flex flex-col justify-between group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#245C6B] text-white font-black text-sm flex items-center justify-center shrink-0 border border-[#63C7B2]/40 shadow-xs group-hover:scale-105 transition-transform">
                        {g.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-sm sm:text-base text-[#19323A] group-hover:text-[#245C6B] transition-colors truncate leading-tight">
                          {g.full_name}
                        </h3>
                        <p className="text-[11px] font-semibold text-[#8DA3A8] mt-0.5 truncate">
                          {g.cpf ? `CPF: ${g.cpf}` : "Responsável legal"}
                        </p>
                      </div>
                    </div>

                    {cleanPhone && (
                      <a
                        href={`https://wa.me/55${cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-[#E8F8F5] text-[#20836F] border border-[#63C7B2]/40 hover:bg-[#63C7B2] hover:text-white rounded-xl transition-all shadow-2xs shrink-0"
                        title="Enviar WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4 fill-current" />
                      </a>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#EEF5F6] space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#6B7C83] flex items-center gap-1">
                      <Baby className="w-3.5 h-3.5 text-[#245C6B]" />
                      Filho(a) Vinculado:
                    </p>

                    {linkedChildren.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {linkedChildren.map((link, idx) => (
                          <button
                            key={idx}
                            onClick={() => navigate(`/criancas/${link.child!.id}`)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#EEF5F6] hover:bg-[#245C6B] hover:text-white text-[#19323A] border border-[#D8E5E7] hover:border-[#245C6B] text-xs font-bold transition-all truncate max-w-full"
                          >
                            <span>🧒 {link.child!.full_name}</span>
                            {link.relationship && (
                              <span className="text-[10px] opacity-75">
                                ({link.relationship})
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#8DA3A8] italic">
                        Sem filho vinculado ainda.
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[#EEF5F6] space-y-1.5 text-xs font-medium text-[#6B7C83]">
                  {g.phone && (
                    <div className="flex items-center gap-1.5 text-[#19323A] font-semibold">
                      <Phone className="w-3.5 h-3.5 text-[#245C6B] shrink-0" />
                      <span>{formatPhone(g.phone)}</span>
                    </div>
                  )}
                  {g.email && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#8DA3A8] truncate">
                      <Mail className="w-3.5 h-3.5 text-[#245C6B] shrink-0" />
                      <span className="truncate">{g.email}</span>
                    </div>
                  )}

                  {linkedChildren[0] && (
                    <div className="pt-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => navigate(`/criancas/${linkedChildren[0].child!.id}`)}
                        className="inline-flex items-center gap-0.5 text-xs text-[#245C6B] hover:underline font-black"
                      >
                        <span>Ver ficha do filho</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <NewChildDialog
        open={showNewChildDialog}
        onClose={() => setShowNewChildDialog(false)}
        onSuccess={() => {
          setShowNewChildDialog(false)
          loadGuardians()
        }}
      />
    </div>
  )
}
