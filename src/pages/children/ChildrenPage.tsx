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
  UserPlus,
  GraduationCap,
  CalendarCheck,
  Smile,
  Heart,
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
  const [showNewDialog, setShowNewDialog] = useState(
    searchParams.get("novo") === "true" || searchParams.get("nova") === "true" || searchParams.get("new") === "true"
  )

  // Abrir automaticamente a janela de cadastro de novo paciente quando vindo do botão "+ Novo"
  useEffect(() => {
    if (
      searchParams.get("novo") === "true" ||
      searchParams.get("nova") === "true" ||
      searchParams.get("new") === "true"
    ) {
      setShowNewDialog(true)
    }
  }, [searchParams])

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
            if (!apptsByChild[appt.child_id].next) {
              apptsByChild[appt.child_id].next = appt
            }
          } else if (apptTime < now && appt.status !== "cancelled") {
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
  const countWithUpcoming = children.filter((c) => c.nextAppointment).length

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-[#0D2329] tracking-tight">
              Crianças & Pacientes
            </h1>
            <div className="w-8 h-8 rounded-2xl bg-[#EDE9FE] border border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#6B7C83]">
            Gerencie anamneses, prontuários, evoluções clínicas e o histórico de cada criança.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setShowNewDialog(true)}
          className="h-10 px-5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white text-xs font-black flex items-center gap-2 shadow-md active:scale-95 transition-all shrink-0"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Nova Criança</span>
        </button>
      </div>

      {/* 2. COLORFUL SUMMARY METRIC CARDS (Dashboard-style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total */}
        <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm flex items-center justify-between hover:border-[#7C3AED]/40 transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase text-[#6B7C83] tracking-wider">
              Total de Pacientes
            </p>
            <h3 className="text-2xl font-black text-[#0D2329]">{children.length}</h3>
            <span className="inline-block text-[11px] font-bold text-[#7C3AED]">
              Cadastrados no sistema
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] border border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center shrink-0 shadow-xs">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Em Acompanhamento */}
        <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm flex items-center justify-between hover:border-[#10B981]/40 transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase text-[#6B7C83] tracking-wider">
              Em Acompanhamento
            </p>
            <h3 className="text-2xl font-black text-[#0D2329]">{countInProgress}</h3>
            <span className="inline-block text-[11px] font-bold text-[#10B981]">
              Sessões contínuas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#E8F8F5] border border-[#A7F3D0] text-[#10B981] flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Entrevista Inicial */}
        <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm flex items-center justify-between hover:border-[#F59E0B]/40 transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase text-[#6B7C83] tracking-wider">
              Entrevistas Iniciais
            </p>
            <h3 className="text-2xl font-black text-[#0D2329]">{countInitial}</h3>
            <span className="inline-block text-[11px] font-bold text-[#EA580C]">
              Avaliações e triagens
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FEF8EC] border border-[#FDE68A] text-[#F59E0B] flex items-center justify-center shrink-0 shadow-xs">
            <Smile className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Próximas Sessões */}
        <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm flex items-center justify-between hover:border-[#0284C7]/40 transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase text-[#6B7C83] tracking-wider">
              Com Sessão Agendada
            </p>
            <h3 className="text-2xl font-black text-[#0D2329]">{countWithUpcoming}</h3>
            <span className="inline-block text-[11px] font-bold text-[#0284C7]">
              Próximos atendimentos
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] border border-[#BAE6FD] text-[#0284C7] flex items-center justify-center shrink-0 shadow-xs">
            <CalendarCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR: SEARCH, SORT, VIEW TOGGLE & STATUS FILTER */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-[#D8E5E7] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8CAAB1]" />
            <input
              type="text"
              placeholder="Buscar por criança, responsável, escola ou queixa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all placeholder:text-[#8CAAB1]"
            />
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
            {/* Sort By Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 px-3.5 rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] hover:bg-white text-xs font-black text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all"
            >
              <option value="recent">⏱️ Mais Recentes</option>
              <option value="az">🔤 Ordem Alfabética (A - Z)</option>
              <option value="next_appt">📅 Próximo Atendimento</option>
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

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-[#EEF5F6]">
          <div className="flex items-center gap-1 text-xs font-black text-[#6B7C83] mr-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrar:</span>
          </div>

          {[
            { id: "todos", label: "Todos", count: children.length, color: "border-[#7C3AED] text-[#7C3AED] bg-[#EDE9FE]" },
            { id: "in_progress", label: "Em Acompanhamento", count: countInProgress, color: "border-[#10B981] text-[#065F46] bg-[#E8F8F5]" },
            { id: "initial_assessment", label: "Entrevista Inicial", count: countInitial, color: "border-[#F59E0B] text-[#8B6514] bg-[#FEF8EC]" },
            { id: "outros", label: "Pausado / Encerrado", count: countOthers, color: "border-[#94A3B8] text-[#475569] bg-[#F1F5F9]" },
          ].map((f) => {
            const isSelected = statusFilter === f.id
            return (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as StatusFilterType)}
                className={`px-3.5 py-1.5 rounded-xl border-2 text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                  isSelected
                    ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-xs"
                    : "bg-white text-[#4F6C74] border-[#D8E5E7] hover:border-[#7C3AED]/40 hover:bg-[#F7FAFA]"
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    isSelected ? "bg-white/25 text-white" : "bg-[#F7FAFA] text-[#6B7C83] border border-[#D8E5E7]"
                  }`}
                >
                  {f.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 4. MAIN PATIENT GRID / LIST CONTENT */}
      {loading ? (
        <div className={viewType === "cards" ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-56 bg-white border-2 border-[#D8E5E7] animate-pulse rounded-3xl shadow-xs" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border-2 border-dashed border-[#D8E5E7] text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#EDE9FE] border-2 border-[#DDD6FE] flex items-center justify-center mx-auto text-[#7C3AED] shadow-xs">
            <Users className="w-8 h-8" />
          </div>
          {children.length === 0 ? (
            <div className="space-y-2">
              <h3 className="font-black text-lg text-[#0D2329]">Nenhuma criança cadastrada ainda</h3>
              <p className="text-xs font-semibold text-[#6B7C83] max-w-md mx-auto">
                Cadastre o primeiro paciente para gerenciar anamnese, sessões psicopedagógicas, avaliações e relatórios.
              </p>
              <button
                onClick={() => setShowNewDialog(true)}
                className="mt-3 px-5 py-2.5 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black inline-flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Cadastrar Primeira Criança</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <h3 className="font-black text-base text-[#0D2329]">Nenhum paciente encontrado</h3>
              <p className="text-xs font-semibold text-[#6B7C83]">Tente buscar com outro termo ou alterar o filtro selecionado.</p>
            </div>
          )}
        </div>
      ) : viewType === "list" ? (
        /* 1. LIST / TABLE VIEW (Modern & Clean) */
        <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] shadow-sm overflow-hidden divide-y divide-[#EEF5F6]">
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
                className="p-4 sm:p-5 hover:bg-[#FAF5FF] transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                {/* Child Info */}
                <div className="flex items-center gap-3.5 min-w-0 md:w-1/3">
                  <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] border-2 border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center font-black text-base overflow-hidden shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    {child.photo_url ? (
                      <img src={child.photo_url} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm text-[#0D2329] group-hover:text-[#7C3AED] truncate transition-colors">
                        {displayName}
                      </h3>
                      {age !== null && (
                        <span className="text-[11px] font-black text-[#7C3AED] bg-[#EDE9FE] px-2 py-0.5 rounded-lg border border-[#DDD6FE]">
                          {age} anos
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-[#6B7C83] truncate mt-0.5">
                      {child.school ? `🏫 ${child.school}` : "Escola não informada"}
                    </p>
                  </div>
                </div>

                {/* Guardian & Contact */}
                <div className="min-w-0 md:w-1/4 text-xs">
                  {primaryGuardian ? (
                    <div className="space-y-0.5">
                      <p className="font-black text-[#0D2329] truncate flex items-center gap-1">
                        <span>👤 {primaryGuardian.full_name}</span>
                        {linkedGuardians[0]?.relationship && (
                          <span className="text-[11px] text-[#6B7C83] font-normal">
                            ({linkedGuardians[0].relationship})
                          </span>
                        )}
                      </p>
                      {primaryGuardian.phone && (
                        <p className="text-xs text-[#6B7C83] font-bold">
                          {formatPhone(primaryGuardian.phone)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-[#8DA3A8] italic font-semibold">Sem responsável</span>
                  )}
                </div>

                {/* Status & Next Session */}
                <div className="min-w-0 md:w-1/4 space-y-1">
                  <Badge statusKey={child.status} type="child" className="text-xs px-2.5 py-0.5 font-black" />
                  {child.nextAppointment ? (
                    <p className="text-xs font-black text-[#10B981] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      Próx: {format(new Date(child.nextAppointment.start_time), "dd/MM 'às' HH:mm")}
                    </p>
                  ) : child.lastAppointment ? (
                    <p className="text-xs font-semibold text-[#6B7C83] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      Último: {format(new Date(child.lastAppointment.start_time), "dd/MM/yy")}
                    </p>
                  ) : (
                    <p className="text-xs text-[#8DA3A8] italic font-semibold">Sem agendamento</p>
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
                    onClick={(e) => {
                      e.stopPropagation()
                      setScheduleForChildId(child.id)
                    }}
                    className="px-3 py-1.5 text-[#7C3AED] bg-[#F5F3FF] hover:bg-[#7C3AED] hover:text-white rounded-xl border border-[#DDD6FE] transition-all text-xs font-black flex items-center gap-1.5 shadow-2xs"
                    title="Agendar nova sessão"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Agendar</span>
                  </button>

                  <div className="w-8 h-8 rounded-xl bg-[#F7FAFA] group-hover:bg-[#EDE9FE] text-[#6B7C83] group-hover:text-[#7C3AED] flex items-center justify-center transition-colors">
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* 2. CARD VIEW (Lively, Colorful, Rich Pediatric Layout) */
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
                className="p-4 sm:p-5 rounded-3xl border-2 border-[#D8E5E7] bg-white hover:border-[#7C3AED]/50 hover:shadow-lg cursor-pointer transition-all space-y-3.5 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* 1. Header: Avatar + Name + Status + WhatsApp */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="w-13 h-13 min-w-[52px] min-h-[52px] max-w-[52px] max-h-[52px] rounded-2xl bg-[#EDE9FE] border-2 border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center font-black text-lg overflow-hidden shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        {child.photo_url ? (
                          <img src={child.photo_url} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          displayName.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-black text-sm sm:text-base text-[#0D2329] group-hover:text-[#7C3AED] transition-colors truncate leading-tight">
                          {displayName}
                        </h3>

                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <Badge statusKey={child.status} type="child" className="text-[10px] px-2 py-0.5 font-black" />
                          {age !== null && (
                            <span className="text-[10px] font-black text-[#7C3AED] bg-[#EDE9FE] px-2 py-0.5 rounded-md border border-[#DDD6FE]">
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
                        className="p-2 bg-[#E8F8F5] text-[#10B981] border border-[#10B981]/30 hover:bg-[#10B981] hover:text-white rounded-xl transition-all shadow-2xs shrink-0"
                        title="Enviar WhatsApp para o responsável"
                      >
                        <MessageSquare className="w-4 h-4 fill-current" />
                      </a>
                    )}
                  </div>

                  {/* 2. Next / Last Session Badge Banner */}
                  {child.nextAppointment ? (
                    <div className="px-3 py-2 bg-[#E8F8F5] border-2 border-[#10B981]/30 rounded-2xl text-xs flex items-center justify-between text-[#065F46] shadow-2xs">
                      <span className="flex items-center gap-1.5 font-black truncate">
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-[#10B981]" />
                        <span>Próx: {format(new Date(child.nextAppointment.start_time), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-wider bg-white px-1.5 py-0.5 rounded-md text-[#10B981] border border-[#10B981]/30 shrink-0">
                        {child.nextAppointment.type || "Sessão"}
                      </span>
                    </div>
                  ) : child.lastAppointment ? (
                    <div className="px-3 py-2 bg-[#F7FAFA] border border-[#D8E5E7] rounded-2xl text-xs text-[#6B7C83] flex items-center gap-1.5 font-bold">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-[#8CAAB1]" />
                      <span>Último atendimento: {format(new Date(child.lastAppointment.start_time), "dd/MM/yyyy")}</span>
                    </div>
                  ) : (
                    <div className="px-3 py-2 bg-[#FAF5FF] border border-dashed border-[#DDD6FE] rounded-2xl text-xs text-[#7C3AED] flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 opacity-70" />
                        <span>Nenhum agendamento</span>
                      </span>
                      <span className="text-[10px] font-black underline">Agendar agora</span>
                    </div>
                  )}

                  {/* 3. School & Grade info */}
                  {(child.school || child.grade) && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#6B7C83] flex-wrap">
                      {child.school && (
                        <span className="inline-flex items-center gap-1 bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] px-2 py-0.5 rounded-lg truncate max-w-[170px]">
                          <School className="w-3 h-3 shrink-0" />
                          <span className="truncate">{child.school}</span>
                        </span>
                      )}
                      {child.grade && (
                        <span className="inline-flex items-center gap-1 bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] px-2 py-0.5 rounded-lg">
                          <GraduationCap className="w-3 h-3" />
                          <span>{child.grade}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* 4. Primary Guardian info */}
                  {primaryGuardian && (
                    <div className="flex items-center gap-1.5 text-xs text-[#0D2329] font-bold truncate pt-0.5">
                      <span className="text-[#8CAAB1]">👤</span>
                      <span className="truncate">{primaryGuardian.full_name}</span>
                      {linkedGuardians[0]?.relationship && (
                        <span className="text-[11px] text-[#6B7C83] font-semibold">
                          ({linkedGuardians[0].relationship})
                        </span>
                      )}
                    </div>
                  )}

                  {/* 5. Clinical Complaint snippet */}
                  {child.main_complaint && (
                    <div className="px-3 py-2 bg-[#FEF8EC] border border-[#F4C95D]/60 rounded-2xl text-xs text-[#8B6514] font-semibold italic truncate shadow-2xs">
                      💬 "{child.main_complaint}"
                    </div>
                  )}
                </div>

                {/* 6. Bottom Action Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-[#EEF5F6] text-xs font-black">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setScheduleForChildId(child.id)
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#F5F3FF] hover:bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE] transition-colors flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Agendar</span>
                  </button>

                  <span className="px-3 py-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-2xs transition-all flex items-center gap-1 group-hover:gap-1.5">
                    <span>Ver Ficha</span>
                    <ChevronRight className="w-3.5 h-3.5" />
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
