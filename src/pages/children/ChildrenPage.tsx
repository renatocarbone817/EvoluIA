import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Plus,
  Search,
  Users,
  ChevronRight,
  School,
  Calendar,
  UserCheck,
  Phone,
  MessageSquare,
  Sparkles,
  BookOpen,
  Cake,
  LayoutGrid,
  List,
  Clock,
  Filter,
} from "lucide-react"
import { getAccessibleProfessionalIds } from "@/lib/teamAccess"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { ChildAvatar } from "@/components/ui/ChildAvatar"
import { calculateAge, formatDate, formatPhone } from "@/lib/utils"
import type { Child, Guardian } from "@/types/database"
import { NewChildDialog } from "./NewChildDialog"
import { NewAppointmentDialog } from "@/pages/appointments/NewAppointmentDialog"

interface ChildWithDetails extends Child {
  guardians?: {
    relationship: string | null
    is_primary: boolean
    guardian: Guardian | null
  }[]
  nextAppointment?: {
    id: string
    start_time: string
    type: string
  } | null
  lastAppointment?: {
    id: string
    start_time: string
    type: string
  } | null
}

type ViewType = "cards" | "list"
type StatusFilterType = "todos" | "in_progress" | "initial_assessment" | "outros"

export function ChildrenPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, professional } = useAuthStore()
  const [children, setChildren] = useState<ChildWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("todos")
  const [viewType, setViewType] = useState<ViewType>("cards")
  const [showNewDialog, setShowNewDialog] = useState(searchParams.get("nova") === "true")
  const [sortBy, setSortBy] = useState<"recent" | "az" | "next_appt">("recent")

  // Fast schedule appointment for a specific child
  const [scheduleForChildId, setScheduleForChildId] = useState<string | null>(null)

  const profId = professional?.id || user?.id

  useEffect(() => {
    if (profId) loadChildren()
  }, [profId, sortBy])

  async function loadChildren() {
    if (!profId) return
    setLoading(true)
    try {
      // 1. Fetch children with guardians
      const query = supabase
        .from("children")
        .select(`
          *,
          guardians:guardian_children(
            relationship,
            is_primary,
            guardian:guardians(id, full_name, phone, whatsapp)
          )
        `)
        .in("professional_id", getAccessibleProfessionalIds(professional, profId))

      let { data: childrenData, error } = sortBy === "az"
        ? await query.order("full_name", { ascending: true })
        : await query.order("created_at", { ascending: false })

      if (error || !childrenData) {
        const { data: fallback } = await supabase
          .from("children")
          .select("*")
          .in("professional_id", getAccessibleProfessionalIds(professional, profId))
        childrenData = fallback || []
      }

      // 2. Fetch appointments to calculate next and last appointment for each child
      const { data: apptsData } = await supabase
        .from("appointments")
        .select("id, child_id, start_time, type, status")
        .in("professional_id", getAccessibleProfessionalIds(professional, profId))
        .order("start_time", { ascending: true })

      const now = new Date()
      const apptsByChild: Record<string, { next?: any; last?: any }> = {}

      if (apptsData) {
        for (const appt of apptsData) {
          const apptTime = new Date(appt.start_time)
          if (!apptsByChild[appt.child_id]) {
            apptsByChild[appt.child_id] = {}
          }

          if (apptTime >= now && appt.status !== "cancelled") {
            // First upcoming appointment
            if (!apptsByChild[appt.child_id].next) {
              apptsByChild[appt.child_id].next = appt
            }
          } else if (apptTime < now && appt.status !== "cancelled") {
            // Latest past appointment
            apptsByChild[appt.child_id].last = appt
          }
        }
      }

      const enriched: ChildWithDetails[] = (childrenData as any[]).map((c) => ({
        ...c,
        nextAppointment: apptsByChild[c.id]?.next || null,
        lastAppointment: apptsByChild[c.id]?.last || null,
      }))

      if (sortBy === "next_appt") {
        enriched.sort((a, b) => {
          if (a.nextAppointment && !b.nextAppointment) return -1
          if (!a.nextAppointment && b.nextAppointment) return 1
          if (a.nextAppointment && b.nextAppointment) {
            return new Date(a.nextAppointment.start_time).getTime() - new Date(b.nextAppointment.start_time).getTime()
          }
          return 0
        })
      }

      setChildren(enriched)
    } finally {
      setLoading(false)
    }
  }

  // Smart search: matches child name, school, complaint OR parent name/phone!
  const filtered = children.filter((c) => {
    const q = search.toLowerCase().trim()
    let matchStatus = true
    if (statusFilter === "in_progress") matchStatus = c.status === "in_progress"
    else if (statusFilter === "initial_assessment") matchStatus = c.status === "initial_assessment"
    else if (statusFilter === "outros") matchStatus = c.status !== "in_progress" && c.status !== "initial_assessment"

    if (!matchStatus) return false
    if (!q) return true

    const childText = `${c.full_name} ${c.school || ""} ${c.grade || ""} ${c.main_complaint || ""}`.toLowerCase()
    if (childText.includes(q)) return true

    const guardianMatch = c.guardians?.some((g) =>
      g.guardian?.full_name?.toLowerCase().includes(q) ||
      g.guardian?.phone?.includes(q)
    )
    if (guardianMatch) return true

    return false
  })

  // Counts for status tabs
  const countInProgress = children.filter((c) => c.status === "in_progress").length
  const countInitial = children.filter((c) => c.status === "initial_assessment").length
  const countOthers = children.filter(
    (c) => c.status !== "in_progress" && c.status !== "initial_assessment"
  ).length

  return (
    <div className="p-4 md:p-8 max-w-[92%] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#19323A] tracking-tight">
            Crianças & Pacientes
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7C83] mt-1">
            {children.length} paciente{children.length !== 1 ? "s" : ""} cadastrado{children.length !== 1 ? "s" : ""} no consultório
          </p>
        </div>
        <Button size="lg" onClick={() => setShowNewDialog(true)} className="gap-2 shadow-sm">
          <Plus className="w-5 h-5" />
          Nova Criança
        </Button>
      </div>

      {/* Search, Sort & View Mode Toolbar */}
      <div className="space-y-3 bg-white p-3.5 rounded-2xl border-2 border-[#D8E5E7] shadow-sm">
        <div className="flex gap-2.5 flex-wrap">
          {/* Search input */}
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8DA3A8]" />
            <input
              type="text"
              placeholder="Buscar por criança, responsável, escola ou queixa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-10 rounded-xl border-2 border-[#D8E5E7] bg-[#F7FAFA] text-xs font-semibold text-[#19323A] focus-visible:outline-none focus-visible:border-[#245C6B] focus-visible:bg-white transition-all placeholder:text-[#8DA3A8]"
            />
          </div>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-10 px-3 rounded-xl border-2 border-[#D8E5E7] bg-[#F7FAFA] text-xs font-bold text-[#19323A] focus-visible:outline-none focus-visible:border-[#245C6B] transition-all"
          >
            <option value="recent">⏱️ Mais Recentes</option>
            <option value="az">🔤 Ordem Alfabética (A - Z)</option>
            <option value="next_appt">📅 Próximo Atendimento</option>
          </select>

          {/* View Mode Toggle: Cards vs List */}
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

        {/* Status Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1">
          <div className="flex items-center gap-1 text-xs font-bold text-[#6B7C83] mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          {[
            { id: "todos", label: "Todos", count: children.length },
            { id: "in_progress", label: "Em Acompanhamento", count: countInProgress, dot: "bg-[#20836F]" },
            { id: "initial_assessment", label: "Entrevista Inicial", count: countInitial, dot: "bg-[#F4C95D]" },
            { id: "outros", label: "Pausado / Encerrado", count: countOthers, dot: "bg-[#6B7C83]" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as StatusFilterType)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all flex items-center gap-1.5 shrink-0 ${
                statusFilter === f.id
                  ? "bg-[#19323A] text-white border-[#19323A] shadow-xs"
                  : "bg-white text-[#4F6C74] border-[#D8E5E7] hover:border-[#245C6B]"
              }`}
            >
              {f.dot && (
                <span
                  className={`w-2 h-2 rounded-full ${statusFilter === f.id ? "bg-white" : f.dot}`}
                />
              )}
              <span>{f.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  statusFilter === f.id ? "bg-white/20 text-white" : "bg-[#EEF5F6] text-[#6B7C83]"
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Loading, Empty or List/Grid View */}
      {loading ? (
        <div className={viewType === "cards" ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-2"}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-48 bg-white border-2 border-[#D8E5E7] animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-2 border-dashed border-[#D8E5E7] text-center py-16">
          <CardContent className="space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#EEF5F6] border-2 border-[#D8E5E7] flex items-center justify-center mx-auto text-[#245C6B]">
              <Users className="w-7 h-7" />
            </div>
            {children.length === 0 ? (
              <>
                <h3 className="font-black text-lg text-[#19323A]">Nenhuma criança cadastrada ainda</h3>
                <p className="text-xs text-[#6B7C83] max-w-sm mx-auto">
                  Cadastre o primeiro paciente para gerenciar anamnese, sessões e relatórios.
                </p>
                <Button size="lg" onClick={() => setShowNewDialog(true)} className="mt-2">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Cadastrar Primeira Criança
                </Button>
              </>
            ) : (
              <>
                <h3 className="font-bold text-base text-[#19323A]">Nenhum paciente encontrado</h3>
                <p className="text-xs text-[#6B7C83]">Tente buscar com outro termo ou filtro.</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : viewType === "list" ? (
        /* 1. LIST / TABLE VIEW (Dense & Scalable for 50-300+ children) */
        <div className="bg-white rounded-2xl border-2 border-[#D8E5E7] shadow-sm overflow-hidden">
          <div className="divide-y divide-[#EEF5F6]">
            {filtered.map((child) => {
              const age = child.birth_date ? calculateAge(child.birth_date) : null
              const linkedGuardians = child.guardians?.filter((g) => g.guardian) || []
              const primaryGuardian = linkedGuardians[0]?.guardian
              const rawPhone = primaryGuardian?.whatsapp || primaryGuardian?.phone || ""
              const cleanPhone = rawPhone.replace(/\D/g, "")

              const rawName = child.full_name || "Criança"
              const displayName = rawName.startsWith("Avaliação (") && rawName.endsWith(")")
                ? rawName.replace(/^Avaliação \((.*)\)$/i, "$1")
                : rawName.startsWith("Avaliação ")
                ? rawName.replace(/^Avaliação /i, "")
                : rawName

              return (
                <div
                  key={child.id}
                  onClick={() => navigate(`/criancas/${child.id}`)}
                  className="p-3.5 sm:p-4 hover:bg-[#F7FAFA] transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                >
                  {/* Child Info */}
                  <div className="flex items-center gap-3 min-w-0 md:w-1/3">
                    <ChildAvatar photoUrl={child.photo_url} name={displayName} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-sm text-[#19323A] group-hover:text-[#245C6B] truncate">
                          {displayName}
                        </h3>
                        {age !== null && (
                          <span className="text-xs font-bold text-[#6B7C83] bg-[#EEF5F6] px-2 py-0.5 rounded-md">
                            {age} anos
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6B7C83] truncate mt-0.5">
                        {child.school ? `🏫 ${child.school}` : "Escola não informada"}
                      </p>
                    </div>
                  </div>

                  {/* Guardian & Contact */}
                  <div className="min-w-0 md:w-1/4 text-xs">
                    {primaryGuardian ? (
                      <div className="space-y-0.5">
                        <p className="font-bold text-[#19323A] truncate flex items-center gap-1">
                          <span>👤 {primaryGuardian.full_name}</span>
                          {linkedGuardians[0]?.relationship && (
                            <span className="text-[11px] text-[#6B7C83] font-normal">
                              ({linkedGuardians[0].relationship})
                            </span>
                          )}
                        </p>
                        {primaryGuardian.phone && (
                          <p className="text-xs text-[#6B7C83] font-medium">
                            {formatPhone(primaryGuardian.phone)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-[#8DA3A8] italic">Sem responsável</span>
                    )}
                  </div>

                  {/* Status & Next Session */}
                  <div className="min-w-0 md:w-1/4 space-y-1">
                    <Badge statusKey={child.status} type="child" className="text-xs px-2.5 py-0.5" />
                    {child.nextAppointment ? (
                      <p className="text-xs font-bold text-[#20836F] flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Próx: {format(new Date(child.nextAppointment.start_time), "dd/MM 'às' HH:mm")}
                      </p>
                    ) : child.lastAppointment ? (
                      <p className="text-xs text-[#6B7C83] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Último: {format(new Date(child.lastAppointment.start_time), "dd/MM/yy")}
                      </p>
                    ) : (
                      <p className="text-xs text-[#8DA3A8] italic">Sem agendamento</p>
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
                        className="px-2.5 py-1.5 text-[#20836F] bg-[#E8F8F5] hover:bg-[#20836F] hover:text-white rounded-xl border border-[#63C7B2]/40 transition-all text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                        title="Abrir WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5 fill-current" />
                        <span className="text-xs">WhatsApp</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setScheduleForChildId(child.id)
                      }}
                      className="px-3 py-1.5 text-[#245C6B] bg-[#EAF3F5] hover:bg-[#245C6B] hover:text-white rounded-xl border border-[#245C6B]/30 transition-all text-xs font-black flex items-center gap-1.5 shadow-2xs"
                      title="Agendar nova sessão"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Agendar</span>
                    </button>

                    <ChevronRight className="w-4 h-4 text-[#8DA3A8] group-hover:text-[#245C6B] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* 2. CARD VIEW (4 Columns on XL - Spacious, readable & balanced typography) */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((child) => {
            const age = child.birth_date ? calculateAge(child.birth_date) : null
            const linkedGuardians = child.guardians?.filter((g) => g.guardian) || []
            const primaryGuardian = linkedGuardians[0]?.guardian
            const rawPhone = primaryGuardian?.whatsapp || primaryGuardian?.phone || ""
            const cleanPhone = rawPhone.replace(/\D/g, "")

            const rawName = child.full_name || "Criança"
            const displayName = rawName.startsWith("Avaliação (") && rawName.endsWith(")")
              ? rawName.replace(/^Avaliação \((.*)\)$/i, "$1")
              : rawName.startsWith("Avaliação ")
              ? rawName.replace(/^Avaliação /i, "")
              : rawName

            return (
              <div
                key={child.id}
                onClick={() => navigate(`/criancas/${child.id}`)}
                className="p-4 rounded-2xl border-2 border-[#D8E5E7] bg-white hover:border-[#245C6B] hover:shadow-md cursor-pointer transition-all space-y-3 flex flex-col justify-between group"
              >
                {/* 1. Header: Avatar + Name + Status + WhatsApp */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="group-hover:scale-105 transition-transform shrink-0">
                        <ChildAvatar photoUrl={child.photo_url} name={displayName} size="sm" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-sm sm:text-base text-[#19323A] group-hover:text-[#245C6B] transition-colors truncate leading-tight">
                          {displayName}
                        </h3>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <Badge statusKey={child.status} type="child" className="text-[10px] px-2 py-0.5" />
                          {age !== null && (
                            <span className="text-[11px] font-bold text-[#6B7C83] bg-[#EEF5F6] px-2 py-0.5 rounded-md">
                              {age} anos
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick WhatsApp Button */}
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/55${cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-[#E8F8F5] text-[#20836F] border border-[#63C7B2]/40 hover:bg-[#63C7B2] hover:text-white rounded-xl transition-all shadow-2xs shrink-0"
                        title="Enviar WhatsApp para o responsável"
                      >
                        <MessageSquare className="w-4 h-4 fill-current" />
                      </a>
                    )}
                  </div>

                  {/* Next / Last Session Badge Banner */}
                  {child.nextAppointment ? (
                    <div className="px-2.5 py-1.5 bg-[#E8F8F5] border border-[#63C7B2]/40 rounded-xl text-xs flex items-center justify-between text-[#20836F]">
                      <span className="flex items-center gap-1.5 font-bold truncate">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        Próx: {format(new Date(child.nextAppointment.start_time), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </span>
                      <span className="text-[10px] font-black uppercase opacity-75 truncate max-w-[85px]">
                        {child.nextAppointment.type}
                      </span>
                    </div>
                  ) : child.lastAppointment ? (
                    <div className="px-2.5 py-1.5 bg-[#EEF5F6] border border-[#D8E5E7] rounded-xl text-xs text-[#6B7C83] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-medium">Último: {format(new Date(child.lastAppointment.start_time), "dd/MM/yyyy")}</span>
                    </div>
                  ) : null}

                  {/* School & Grade info */}
                  {(child.school || child.grade) && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7C83] flex-wrap">
                      {child.school && (
                        <span className="inline-flex items-center gap-1 bg-[#EEF5F6] px-2 py-0.5 rounded-md truncate max-w-[160px]">
                          <School className="w-3.5 h-3.5 text-[#245C6B] shrink-0" />
                          <span className="truncate">{child.school}</span>
                        </span>
                      )}
                      {child.grade && (
                        <span className="inline-flex items-center gap-1 bg-[#EEF5F6] px-2 py-0.5 rounded-md">
                          <BookOpen className="w-3.5 h-3.5 text-[#245C6B]" />
                          {child.grade}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Primary Guardian info */}
                  {primaryGuardian && (
                    <p className="text-xs text-[#6B7C83] font-medium truncate flex items-center gap-1 pt-0.5">
                      <span>👤 {primaryGuardian.full_name}</span>
                      {linkedGuardians[0]?.relationship && (
                        <span className="text-[11px] opacity-75">
                          ({linkedGuardians[0].relationship})
                        </span>
                      )}
                    </p>
                  )}

                  {/* Clinical Complaint snippet */}
                  {child.main_complaint && (
                    <div className="px-2.5 py-1.5 bg-[#FEF8EC]/80 border border-[#F4C95D]/40 rounded-xl text-xs text-[#8B6514] font-medium italic truncate">
                      💬 "{child.main_complaint}"
                    </div>
                  )}
                </div>

                {/* Bottom: Fast Schedule + View Profile */}
                <div className="flex items-center justify-between pt-2.5 border-t border-[#EEF5F6] text-xs font-bold">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setScheduleForChildId(child.id)
                    }}
                    className="text-[#245C6B] hover:underline flex items-center gap-1 font-black"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Agendar
                  </button>

                  <span className="inline-flex items-center gap-0.5 text-[#245C6B] group-hover:underline font-black">
                    Ver ficha
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New Child Dialog */}
      <NewChildDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onSuccess={() => {
          setShowNewDialog(false)
          loadChildren()
        }}
      />

      {/* Direct Schedule Dialog for Selected Child */}
      <NewAppointmentDialog
        open={Boolean(scheduleForChildId)}
        defaultChildId={scheduleForChildId || undefined}
        onClose={() => setScheduleForChildId(null)}
        onSuccess={() => {
          setScheduleForChildId(null)
          loadChildren()
        }}
      />
    </div>
  )
}
