import { useState, useEffect, useMemo, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  eachHourOfInterval,
  setHours,
  setMinutes,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Play,
  Clock,
  User,
  AlertTriangle,
  Smartphone,
  CheckCircle2,
  ExternalLink,
  Trash2,
  Search,
  X,
  XCircle,
  Filter,
  MessageSquare,
  Sparkles,
  Cake,
  Lock,
  Settings,
  Users,
  FileText,
  MessageCircle,
  CalendarDays,
  Eye,
} from "lucide-react"
import toast from "react-hot-toast"
import { supabase } from "@/lib/supabase"
import { getAccessibleProfessionalIds } from "@/lib/teamAccess"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { ChildAvatar } from "@/components/ui/ChildAvatar"
import { formatTime, formatDate } from "@/lib/utils"
import type { AppointmentWithChild, Child } from "@/types/database"
import { NewAppointmentDialog } from "./NewAppointmentDialog"
import { RecordAbsenceModal } from "./RecordAbsenceModal"
import { getAppointmentStyle, getAppointmentCategory } from "@/lib/appointmentStyles"

type ViewMode = "dia" | "semana" | "mes" | "celular"
type StatusFilter = "todos" | "agendados" | "realizados" | "cancelados"

const HOURS_TIMELINE = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
]

export function AppointmentsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, professional } = useAuthStore()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>(typeof window !== "undefined" && window.innerWidth < 1024 ? "celular" : "semana")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos")
  const [appointments, setAppointments] = useState<AppointmentWithChild[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(
    searchParams.get("novo") === "true" || searchParams.get("nova") === "true" || searchParams.get("new") === "true"
  )

  // Abrir automaticamente a janela de novo agendamento quando vindo do botão "+ Novo"
  useEffect(() => {
    if (
      searchParams.get("novo") === "true" ||
      searchParams.get("nova") === "true" ||
      searchParams.get("new") === "true"
    ) {
      setShowNewModal(true)
    }
  }, [searchParams])
  const [selectedDateForNew, setSelectedDateForNew] = useState<string | undefined>(undefined)

  // Search feature
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<AppointmentWithChild[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  // Quick Block Time Modal state
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [absenceModalAppt, setAbsenceModalAppt] = useState<AppointmentWithChild | null>(null)
  const [blockForm, setBlockForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    start_time: "12:00",
    end_time: "13:00",
    title: "Almoço / Intervalo",
    type: "Reunião/Estudo",
  })
  const [blocking, setBlocking] = useState(false)

  const profId = professional?.id || user?.id

  const statusFilterRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const mobileDaysRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    const el = statusFilterRefs.current[statusFilter]
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
    }
  }, [statusFilter])

  useEffect(() => {
    const dayKey = format(currentDate, "yyyy-MM-dd")
    const el = mobileDaysRefs.current[dayKey]
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
    }
  }, [currentDate])

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 1024 && viewMode !== "celular") {
        setViewMode("celular")
      } else if (window.innerWidth >= 1024 && viewMode === "celular") {
        setViewMode("semana")
      }
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    if (profId) {
      loadAppointments()
      loadChildren()
    }
  }, [currentDate, viewMode, profId])

  async function loadChildren() {
    if (!profId) return
    try {
      const { data } = await supabase
        .from("children")
        .select("*")
        .in("professional_id", getAccessibleProfessionalIds(professional, profId))
        .order("full_name")
      setChildren((data || []) as Child[])
    } catch (e) {
      console.error(e)
    }
  }

  async function loadAppointments() {
    if (!profId) return
    setLoading(true)
    try {
      let startStr = ""
      let endStr = ""

      if (viewMode === "celular") {
        const start = subDays(startOfMonth(currentDate), 7)
        const end = addDays(endOfMonth(currentDate), 21)
        startStr = format(start, "yyyy-MM-dd'T'00:00:00")
        endStr = format(end, "yyyy-MM-dd'T'23:59:59")
      } else if (viewMode === "dia") {
        const dayStr = format(currentDate, "yyyy-MM-dd")
        startStr = `${dayStr}T00:00:00`
        endStr = `${dayStr}T23:59:59`
      } else if (viewMode === "semana") {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 })
        const end = endOfWeek(currentDate, { weekStartsOn: 1 })
        startStr = format(start, "yyyy-MM-dd'T'00:00:00")
        endStr = format(end, "yyyy-MM-dd'T'23:59:59")
      } else {
        const y = currentDate.getFullYear()
        const m = currentDate.getMonth() + 1
        const lastDay = new Date(y, m, 0).getDate()
        startStr = `${y}-${String(m).padStart(2, "0")}-01T00:00:00`
        endStr = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}T23:59:59`
      }

      const { data } = await supabase
        .from("appointments")
        .select(`
          *,
          child:children(
            *,
            guardians:guardian_children(
              relationship,
              is_primary,
              guardian:guardians(id, full_name, phone, whatsapp)
            )
          )
        `)
        .in("professional_id", getAccessibleProfessionalIds(professional, profId))
        .gte("start_time", startStr)
        .lte("start_time", endStr)
        .order("start_time", { ascending: true })

      setAppointments((data || []) as AppointmentWithChild[])
    } finally {
      setLoading(false)
    }
  }

  function handlePrev() {
    if (viewMode === "dia" || viewMode === "celular") setCurrentDate(subDays(currentDate, 1))
    else if (viewMode === "semana") setCurrentDate(subWeeks(currentDate, 1))
    else setCurrentDate(subMonths(currentDate, 1))
  }

  function handleNext() {
    if (viewMode === "dia" || viewMode === "celular") setCurrentDate(addDays(currentDate, 1))
    else if (viewMode === "semana") setCurrentDate(addWeeks(currentDate, 1))
    else setCurrentDate(addMonths(currentDate, 1))
  }

  async function handleDeleteAppointment(e: React.MouseEvent, apptId: string) {
    e.stopPropagation()
    if (!confirm("Deseja realmente excluir este agendamento da agenda?")) return

    try {
      const { error } = await supabase.from("appointments").delete().eq("id", apptId)
      if (error) throw error
      toast.success("Agendamento excluído da agenda!")
      loadAppointments()
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir agendamento")
    }
  }

  function handleStartAppointment(appt: AppointmentWithChild) {
    const typeLower = (appt.type || "").toLowerCase()
    const isInterviewOrEval =
      typeLower.includes("entrevista") ||
      typeLower.includes("avalia") ||
      typeLower.includes("anamnese")

    if (isInterviewOrEval && appt.child_id) {
      // Entrevista / Avaliação Inicial -> abre direto a Edição/Cadastro dos Dados da Criança
      navigate(`/criancas/${appt.child_id}?editar=true`)
    } else if (typeLower.includes("devolutiva") && appt.child_id) {
      // Devolutiva -> abre a aba de Relatórios da Criança
      navigate(`/criancas/${appt.child_id}?tab=relatorios`)
    } else if (typeLower.includes("interven") && appt.child_id) {
      // Aula de Intervenção -> abre o Atendimento de Intervenção
      navigate(`/atendimento/intervencao/${appt.id}`)
    } else {
      // Sessão Psicopedagógica / Avaliação -> abre o Atendimento Clínico
      navigate(`/atendimento/${appt.id}`)
    }
  }

  async function handleSearch(query: string) {
    setSearchQuery(query)
    if (!query.trim() || query.trim().length < 2) {
      setIsSearching(false)
      setSearchResults([])
      return
    }

    setIsSearching(true)
    setSearchLoading(true)
    try {
      const { data: data2 } = await supabase
        .from("appointments")
        .select("*, child:children!inner(*)")
        .eq("professional_id", profId)
        .ilike("child.full_name", `%${query.trim()}%`)
        .order("start_time", { ascending: true })

      setSearchResults((data2 || []) as AppointmentWithChild[])
    } finally {
      setSearchLoading(false)
    }
  }

  async function handleCancelAppointment(e: React.MouseEvent, apptId: string) {
    e.stopPropagation()
    if (!confirm("Deseja cancelar este agendamento?")) return
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", apptId)
      if (error) throw error
      toast.success("Agendamento cancelado!")
      if (searchQuery) handleSearch(searchQuery)
      loadAppointments()
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar")
    }
  }

  function clearSearch() {
    setSearchQuery("")
    setSearchResults([])
    setIsSearching(false)
  }

  function openNewModalForDate(dateStr?: string, _hourStr?: string) {
    setSelectedDateForNew(dateStr)
    setShowNewModal(true)
  }

  // Quick Block Time Submit
  async function handleCreateBlockSlot(e: React.FormEvent) {
    e.preventDefault()
    if (!profId) return
    setBlocking(true)
    try {
      const startDateTime = `${blockForm.date}T${blockForm.start_time}:00`
      const endDateTime = `${blockForm.date}T${blockForm.end_time}:00`

      const { error } = await supabase.from("appointments").insert({
        professional_id: profId,
        child_id: null,
        start_time: startDateTime,
        end_time: endDateTime,
        type: blockForm.type,
        status: "confirmed",
        notes: `[BLOQUEIO] ${blockForm.title}`,
      })

      if (error) throw error
      toast.success("Horário bloqueado com sucesso na agenda!")
      setShowBlockModal(false)
      loadAppointments()
    } catch (err: any) {
      console.error(err)
      toast.error("Erro ao bloquear horário.")
    } finally {
      setBlocking(false)
    }
  }

  // Week Days
  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(currentDate, { weekStartsOn: 1 }),
      end: endOfWeek(currentDate, { weekStartsOn: 1 }),
    })
  }, [currentDate])

  // Continuous Rolling Days for Mobile Strip (starts 7 days before current month to 21 days after)
  const mobileStripDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const start = subDays(monthStart, 7)
    const end = addDays(endOfMonth(currentDate), 21)
    return eachDayOfInterval({ start, end })
  }, [currentDate.getFullYear(), currentDate.getMonth()])

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (statusFilter === "todos") return true
      if (statusFilter === "agendados")
        return a.status === "scheduled" || a.status === "confirmed" || a.status === "in_progress"
      if (statusFilter === "realizados") return a.status === "done"
      if (statusFilter === "cancelados") return a.status === "cancelled" || a.status === "missed"
      return true
    })
  }, [appointments, statusFilter])

  // Today's appointments
  const todayAppointments = useMemo(() => {
    return appointments.filter((a) => isSameDay(new Date(a.start_time), new Date()))
  }, [appointments])

  const selectedDayAppointments = useMemo(() => {
    return filteredAppointments.filter((a) => isSameDay(new Date(a.start_time), currentDate))
  }, [filteredAppointments, currentDate])

  // Month days
  const monthDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
    })
  }, [currentDate])

  // Real Weekly Birthdays Calculation
  const weeklyBirthdays = useMemo(() => {
    if (!children.length) return []
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })

    const list: {
      child: Child
      bDay: number
      bMonth: number
      formattedDate: string
      age: number
    }[] = []

    children.forEach((c) => {
      if (!c.birth_date) return
      const parts = c.birth_date.split("-")
      if (parts.length < 3) return
      const bYear = Number(parts[0])
      const bMonth = Number(parts[1])
      const bDay = Number(parts[2])

      for (const wDay of weekDays) {
        if (wDay.getMonth() + 1 === bMonth && wDay.getDate() === bDay) {
          const age = currentDate.getFullYear() - bYear
          list.push({
            child: c,
            bDay,
            bMonth,
            formattedDate: `${bDay} ${format(wDay, "MMM", { locale: ptBR }).toUpperCase()}`,
            age: age > 0 ? age : 1,
          })
        }
      }
    })

    return list
  }, [children, currentDate, weekDays])

  // Real Weekly Counts Breakdown
  const weeklySummary = useMemo(() => {
    let sessions = 0
    let evaluations = 0
    let interventions = 0
    let meetings = 0
    let devolutivas = 0

    appointments.forEach((a) => {
      const cat = getAppointmentCategory(a.type, a.notes)
      if (cat === "interview") evaluations++
      else if (cat === "intervention") interventions++
      else if (cat === "devolutiva") devolutivas++
      else if (cat === "meeting") meetings++
      else sessions++
    })

    return { sessions, evaluations, interventions, meetings, devolutivas }
  }, [appointments])

  // WhatsApp Reminder Handler
  function handleSendWhatsApp(appt: AppointmentWithChild) {
    const guardian = (appt.child as any)?.guardians?.[0]?.guardian
    const rawPhone = guardian?.whatsapp || guardian?.phone
    if (!rawPhone) {
      toast.error("Nenhum telefone de responsável cadastrado para este paciente.")
      return
    }
    const cleanPhone = rawPhone.replace(/\D/g, "")
    const displayName = appt.child?.full_name || "seu filho(a)"
    const startTime = new Date(appt.start_time)
    const defaultTpl = "Olá, tudo bem? 🌟 Passando para confirmar a nossa sessão psicopedagógica de {nome_crianca} hoje às {horario} no consultório. Qualquer imprevisto, por favor nos avise. Até logo!"
    const savedTpl = localStorage.getItem("evoluia_reminder_template") || defaultTpl
    const finalMsg = savedTpl
      .replace("{nome_crianca}", displayName)
      .replace("{horario}", format(startTime, "HH:mm"))

    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(finalMsg)}`, "_blank")
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 max-w-full overflow-x-hidden">
      {/* =========================================================================
          1. HEADER WITH TITLE, DATE RANGE & VIEW SWITCHER
          ========================================================================= */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-[#0D2329] tracking-tight">
              Agenda
            </h1>
            <span className="p-1.5 rounded-xl bg-[#EDE9FE] text-[#7C3AED] font-bold text-base shadow-2xs">
              📅
            </span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-[#081B20]">
            Visualize e gerencie seus compromissos e atendimentos.
          </p>
        </div>

        {/* Center/Right Controls: Navigation & View Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Week Navigation */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border-2 border-white shadow-sm">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-[#E2ECEE] text-[#0D2329] hover:bg-[#D8E5E7] transition-all cursor-pointer"
            >
              Hoje
            </button>

            <button
              onClick={handlePrev}
              className="p-1.5 rounded-xl text-[#0D2329] hover:text-black hover:bg-[#F7FAFA] transition-all cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4 stroke-[3]" />
            </button>

            <button
              onClick={handleNext}
              className="p-1.5 rounded-xl text-[#0D2329] hover:text-black hover:bg-[#F7FAFA] transition-all cursor-pointer"
              title="Próximo"
            >
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>

            <div className="px-2.5 py-1 text-xs font-black text-[#0D2329] flex items-center gap-1 border-l border-slate-200">
              <span>
                {viewMode === "semana"
                  ? `${format(weekDays[0], "dd", { locale: ptBR })} - ${format(weekDays[6], "dd 'de' MMMM, yyyy", { locale: ptBR })}`
                  : viewMode === "mes"
                  ? format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })
                  : format(currentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>

          {/* View Mode Switcher (Hidden on Mobile - Mobile is always native mobile layout) */}
          <div className="hidden md:flex bg-white/90 rounded-2xl p-1 border-2 border-white shadow-sm">
            {[
              { id: "dia", label: "Dia" },
              { id: "semana", label: "Semana" },
              { id: "mes", label: "Mês" },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as ViewMode)}
                className={`px-3.5 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  viewMode === mode.id
                    ? "bg-[#7C3AED] text-white shadow-xs"
                    : "text-[#0D2329] hover:text-black hover:bg-white"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* New Appointment Button */}
          <button
            onClick={() => openNewModalForDate()}
            className="h-10 px-4 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white text-xs font-black flex items-center gap-2 shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Novo Compromisso</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          QUICK SEARCH & FILTER BAR
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full max-w-full">
        {/* Status Filter Horizontal Sliding Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth -mx-1 px-1 w-full sm:w-auto">
          {[
            { id: "todos", label: "Todos", count: appointments.length },
            { id: "agendados", label: "Agendados", count: appointments.filter((a) => a.status === "scheduled" || a.status === "confirmed" || a.status === "in_progress").length, dot: "bg-[#7C3AED]" },
            { id: "realizados", label: "Realizados", count: appointments.filter((a) => a.status === "done").length, dot: "bg-[#10B981]" },
            { id: "cancelados", label: "Cancelados", count: appointments.filter((a) => a.status === "cancelled" || a.status === "missed").length, dot: "bg-[#EF4444]" },
          ].map((f) => (
            <button
              key={f.id}
              ref={(el) => { statusFilterRefs.current[f.id] = el }}
              onClick={() => {
                setStatusFilter(f.id as StatusFilter)
                statusFilterRefs.current[f.id]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer ${
                statusFilter === f.id
                  ? "bg-[#7C3AED] text-white shadow-md"
                  : "bg-white text-[#6B7C83] border border-[#D8E5E7] hover:bg-[#F7FAFA]"
              }`}
            >
              {f.dot && (
                <span className={`w-2 h-2 rounded-full ${statusFilter === f.id ? "bg-white" : f.dot}`} />
              )}
              <span>{f.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${statusFilter === f.id ? "bg-white/20 text-white" : "bg-[#EEF5F6] text-[#6B7C83]"}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8CAAB1]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar paciente na agenda..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border-2 border-[#D8E5E7] bg-white focus:outline-none focus:border-[#7C3AED] text-[#0D2329] font-medium"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8CAAB1] hover:text-[#0D2329]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          2. MAIN VIEW: 100% NATIVE MOBILE (< lg) vs FULL DESKTOP GRID (>= lg)
          ========================================================================= */}

      {/* ─────────────────────────────────────────────────────────────
          A. MOBILE NATIVE VIEW (EXCLUSIVELY FOR MOBILE / TABLET < lg)
          ───────────────────────────────────────────────────────────── */}
      <div className="block lg:hidden space-y-4">
        {/* Continuous Rolling Days Strip Selector */}
        <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-2.5 shadow-sm overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth">
          <div className="flex items-center gap-1.5 min-w-max">
            {mobileStripDays.map((day) => {
              const isSelected = isSameDay(day, currentDate)
              const isToday = isSameDay(day, new Date())
              const dayKey = format(day, "yyyy-MM-dd")
              const dayApptsCount = appointments.filter((a) => {
                const aDate = new Date(a.start_time)
                return isSameDay(aDate, day)
              }).length

              return (
                <button
                  key={day.toISOString()}
                  ref={(el) => { mobileDaysRefs.current[dayKey] = el }}
                  type="button"
                  onClick={() => {
                    setCurrentDate(day)
                    mobileDaysRefs.current[dayKey]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
                  }}
                  className={`w-[50px] sm:w-[56px] py-2 px-0.5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center relative shrink-0 active:scale-95 cursor-pointer ${
                    isSelected
                      ? "bg-[#7C3AED] text-white border-[#6D28D9] shadow-md font-black scale-100"
                      : isToday
                      ? "bg-[#EDE9FE] border-[#C4B5FD] text-[#7C3AED] font-bold hover:bg-[#DDD6FE]"
                      : "border-slate-100 bg-[#F8FAFB] hover:bg-[#EDE9FE] hover:border-[#DDD6FE] text-[#6B7C83]"
                  }`}
                >
                  <p className={`text-[10px] uppercase font-black ${isSelected ? "text-white/80" : ""}`}>
                    {format(day, "EEE", { locale: ptBR }).substring(0, 3)}
                  </p>
                  <p className="text-sm font-black mt-0.5">{format(day, "dd")}</p>

                  {/* Dot indicator if has appointments */}
                  {dayApptsCount > 0 ? (
                    <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? "bg-white" : "bg-[#7C3AED]"}`} />
                  ) : (
                    <span className="w-1.5 h-1.5 mt-0.5 opacity-0" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Header Info for Selected Day */}
        <div className="px-1">
          <h3 className="text-base font-black text-[#0D2329] capitalize">
            {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h3>
          <p className="text-xs font-semibold text-[#6B7C83]">
            {selectedDayAppointments.length === 1
              ? "1 compromisso agendado"
              : `${selectedDayAppointments.length} compromissos agendados`}
          </p>
        </div>

        {/* Selected Day Appointments Cards List */}
        <div className="space-y-3">
          {selectedDayAppointments.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white border-2 border-dashed border-[#D8E5E7] text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center mx-auto">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-sm text-[#0D2329]">Nenhum compromisso neste dia</p>
                <p className="text-xs text-[#6B7C83] mt-0.5">Sua agenda está livre nesta data.</p>
              </div>
              <button
                type="button"
                onClick={() => openNewModalForDate(format(currentDate, "yyyy-MM-dd"))}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white text-xs font-black inline-flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Novo Agendamento</span>
              </button>
            </div>
          ) : (
            selectedDayAppointments.map((appt) => {
              const style = getAppointmentStyle(appt)
              const startTime = new Date(appt.start_time)
              const endTime = new Date(appt.end_time)
              const isBlock = (appt.notes || "").includes("[BLOQUEIO]")
              const displayName = appt.child?.full_name || (isBlock ? appt.notes?.replace("[BLOQUEIO]", "").trim() : appt.type)

              return (
                <div
                  key={appt.id}
                  onClick={() => handleStartAppointment(appt)}
                  className={`p-4 rounded-3xl border-2 ${style.border} bg-white shadow-2xs transition-all space-y-3 active:scale-98`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <ChildAvatar photoUrl={appt.child?.photo_url} name={displayName} size="md" />
                      <div className="min-w-0">
                        <h4 className="font-black text-sm text-[#0D2329] truncate">{displayName}</h4>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${style.pillCls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            <span>{appt.type || style.categoryName}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shrink-0 ${style.badgeBg}`}>
                      {appt.status === "done" ? "Realizado" : appt.status === "in_progress" ? "Em Atendimento" : "Agendado"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#EEF5F6]">
                    <div className="flex items-center gap-1.5 text-xs font-black text-[#0D2329]">
                      <Clock className="w-3.5 h-3.5 text-[#7C3AED]" />
                      <span>{format(startTime, "HH:mm")} às {format(endTime, "HH:mm")}</span>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {appt.status === "done" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#065F46] px-3 py-1.5 rounded-xl bg-[#D1FAE5] border border-[#A7F3D0] flex items-center gap-1.5 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                            <span>Sessão Concluída</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (appt.child_id) {
                                navigate(`/criancas/${appt.child_id}`)
                              } else {
                                navigate(`/atendimento/${appt.id}`)
                              }
                            }}
                            className="text-xs font-bold text-[#7C3AED] hover:underline cursor-pointer"
                          >
                            Ver Prontuário →
                          </button>
                        </div>
                      ) : appt.status === "missed" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-red-600 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-1.5 shadow-2xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                            <span>Falta Registrada</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (appt.child_id) {
                                navigate(`/criancas/${appt.child_id}`)
                              }
                            }}
                            className="text-xs font-bold text-[#7C3AED] hover:underline cursor-pointer"
                          >
                            Ver Detalhes →
                          </button>
                        </div>
                      ) : (
                        <>
                          {!isBlock && appt.child && (
                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(appt)}
                              className="w-9 h-9 rounded-2xl bg-[#E8F8F5] text-[#10B981] border border-[#A7F3D0] flex items-center justify-center active:scale-95 shadow-2xs"
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}

                          {!isBlock && (
                            <button
                              type="button"
                              onClick={() => setAbsenceModalAppt(appt)}
                              className="h-9 px-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-black flex items-center justify-center gap-1 active:scale-95 transition-all shadow-2xs cursor-pointer"
                              title="Registrar Falta"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Falta</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStartAppointment(appt)}
                            className="h-9 px-4 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Iniciar</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleDeleteAppointment(e, appt.id)}
                        className="w-9 h-9 rounded-2xl bg-[#FEE2E2]/60 hover:bg-[#FEE2E2] text-[#EF4444] border border-[#FECACA] flex items-center justify-center active:scale-95 transition-all shadow-2xs cursor-pointer ml-0.5"
                        title="Excluir Agendamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          B. DESKTOP VIEW (EXCLUSIVELY FOR DESKTOP >= lg)
          ───────────────────────────────────────────────────────────── */}
      <div className="hidden lg:grid grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: TIMETABLE GRID (9 COLS) */}
        <div className="col-span-9 space-y-6">
          {/* 1. WEEKLY GRID VIEW */}
          {viewMode === "semana" && (
            <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] shadow-sm overflow-hidden">
              {/* Header Days Row */}
              <div className="grid grid-cols-8 border-b-2 border-[#D8E5E7] bg-[#F7FAFA]">
                <div className="p-3 text-[11px] font-black text-[#6B7C83] flex items-center justify-center border-r-2 border-[#D8E5E7] bg-[#EEF5F6]">
                  Horário
                </div>

                {weekDays.map((day, dIdx) => {
                  const isToday = isSameDay(day, new Date())
                  const dayName = format(day, "EEE", { locale: ptBR }).replace(".", "")
                  const formattedDayNum = format(day, "dd/MM")
                  const isWeekend = dIdx >= 5

                  return (
                    <div
                      key={day.toISOString()}
                      className={`p-2.5 flex flex-col items-center justify-center border-r-2 last:border-r-0 border-[#D8E5E7] transition-all ${
                        isToday
                          ? "bg-[#F3E8FF] text-[#7C3AED]"
                          : isWeekend
                          ? "bg-[#F4F7F8] text-[#8CAAB1]"
                          : "text-[#0D2329]"
                      }`}
                    >
                      <span className="text-[11px] font-black uppercase tracking-tight capitalize">
                        {dayName}
                      </span>
                      <span
                        className={`text-xs font-black mt-0.5 px-2 py-0.5 rounded-xl ${
                          isToday
                            ? "bg-[#7C3AED] text-white shadow-xs"
                            : "text-[#6B7C83]"
                        }`}
                      >
                        {formattedDayNum}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Weekly Time Grid Matrix (08:00 to 18:00) */}
              <div className="divide-y-2 border-b-2 border-[#D8E5E7] divide-[#D8E5E7]">
                {HOURS_TIMELINE.map((hourStr) => {
                  const hourNum = parseInt(hourStr.split(":")[0], 10)

                  return (
                    <div key={hourStr} className="grid grid-cols-8 min-h-[76px] items-stretch">
                      {/* Left Hour Label */}
                      <div className="text-[11px] font-black text-[#6B7C83] p-2 flex items-start justify-center border-r-2 border-[#D8E5E7] bg-[#F8FAFB] select-none">
                        {hourStr}
                      </div>

                      {/* 7 Day Slot Columns */}
                      {weekDays.map((day, dIdx) => {
                        const isToday = isSameDay(day, new Date())
                        const isWeekend = dIdx >= 5
                        const dayAppts = filteredAppointments.filter((a) => {
                          const aDate = new Date(a.start_time)
                          return isSameDay(aDate, day) && aDate.getHours() === hourNum
                        })
                        const dateStr = format(day, "yyyy-MM-dd")

                        return (
                          <div
                            key={day.toISOString()}
                            className={`p-1.5 border-r-2 last:border-r-0 border-[#D8E5E7] relative flex flex-col justify-center transition-colors group/cell ${
                              isToday
                                ? "bg-[#FDFBFF] hover:bg-[#F3E8FF]/40"
                                : isWeekend
                                ? "bg-[#FAFCFD] hover:bg-[#F0F5F6]"
                                : "bg-white hover:bg-[#F7FAFA]"
                            }`}
                          >
                            {dayAppts.length > 0 ? (
                              dayAppts.map((appt) => {
                                const style = getAppointmentStyle(appt)
                                const startTime = new Date(appt.start_time)
                                const endTime = new Date(appt.end_time)
                                const isBlock = (appt.notes || "").includes("[BLOQUEIO]")
                                const title = appt.child?.full_name || (isBlock ? appt.notes?.replace("[BLOQUEIO]", "").trim() : appt.type)

                                return (
                                  <div
                                    key={appt.id}
                                    onClick={() => handleStartAppointment(appt)}
                                    className={`p-2 rounded-xl border-2 ${style.bg} ${style.border} shadow-2xs cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xs group space-y-1 my-0.5`}
                                    title={`${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")} • ${title}`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className={`text-[9px] font-black tracking-tight ${style.subtext}`}>
                                        {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
                                      </span>

                                      <div className="flex items-center gap-1">
                                        {appt.status === "done" ? (
                                          <span className="text-[9px] font-black text-[#10B981] flex items-center gap-0.5" title="Sessão Concluída">
                                            <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                                          </span>
                                        ) : appt.status === "missed" ? (
                                          <span className="text-[9px] font-black text-red-500 flex items-center gap-0.5" title="Falta Registrada">
                                            <AlertTriangle className="w-3 h-3 text-red-500" />
                                          </span>
                                        ) : !isBlock && appt.child ? (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleSendWhatsApp(appt)
                                            }}
                                            className="opacity-0 group-hover:opacity-100 text-[#10B981] hover:scale-110 transition-all p-0.5"
                                            title="Enviar Lembrete WhatsApp"
                                          >
                                            <MessageCircle className="w-3 h-3" />
                                          </button>
                                        ) : null}

                                        <button
                                          type="button"
                                          onClick={(e) => handleDeleteAppointment(e, appt.id)}
                                          className="opacity-0 group-hover:opacity-100 text-[#8CAAB1] hover:text-[#EF4444] hover:scale-110 transition-all p-0.5 cursor-pointer"
                                          title="Excluir Agendamento"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                                      <p className={`text-xs font-black truncate leading-tight ${style.text}`}>
                                        {title}
                                      </p>
                                    </div>
                                  </div>
                                )
                              })
                            ) : (
                              <button
                                onClick={() => openNewModalForDate(dateStr, hourStr)}
                                className="w-full h-full min-h-[50px] opacity-0 group-hover/cell:opacity-100 flex items-center justify-center text-[#8CAAB1] hover:text-[#7C3AED] transition-all rounded-lg hover:bg-white/80"
                                title="Novo agendamento neste horário"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 2. DAILY TIMELINE VIEW */}
          {viewMode === "dia" && (
            <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-6 shadow-sm space-y-6">
              <div className="border-b-2 border-[#EEF5F6] pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#0D2329] capitalize">
                    {format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </h3>
                  <p className="text-xs font-semibold text-[#6B7C83]">
                    {selectedDayAppointments.length === 1
                      ? "1 compromisso agendado"
                      : `${selectedDayAppointments.length} compromissos agendados`}
                  </p>
                </div>

                <button
                  onClick={() => openNewModalForDate(format(currentDate, "yyyy-MM-dd"))}
                  className="px-4 py-2 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Agendar neste dia</span>
                </button>
              </div>

              {/* Day Time Slots */}
              <div className="divide-y-2 divide-[#EEF5F6]">
                {HOURS_TIMELINE.map((hourStr) => {
                  const hourNum = parseInt(hourStr.split(":")[0], 10)
                  const slotAppts = selectedDayAppointments.filter((a) => {
                    const aDate = new Date(a.start_time)
                    return aDate.getHours() === hourNum
                  })

                  return (
                    <div key={hourStr} className="py-3 flex items-start gap-4 group">
                      <div className="w-14 text-xs font-black text-[#6B7C83] pt-1">
                        {hourStr}
                      </div>

                      <div className="flex-1 min-h-[48px] rounded-2xl p-1.5 group-hover:bg-[#F8FAFB] transition-colors">
                        {slotAppts.length > 0 ? (
                          <div className="flex flex-col gap-2.5 w-full">
                            {slotAppts.map((appt) => {
                              const style = getAppointmentStyle(appt)
                              const startTime = new Date(appt.start_time)
                              const endTime = new Date(appt.end_time)
                              const isBlock = (appt.notes || "").includes("[BLOQUEIO]")
                              const displayName = appt.child?.full_name || (isBlock ? appt.notes?.replace("[BLOQUEIO]", "").trim() : appt.type)

                              return (
                                <div
                                  key={appt.id}
                                  onClick={() => handleStartAppointment(appt)}
                                  className={`p-3.5 sm:p-4 rounded-2xl border-2 ${style.border} ${style.bg} flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:shadow-xs cursor-pointer transition-all w-full`}
                                >
                                  {/* Lado Esquerdo: Avatar + Nome + Horário + Tipo */}
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <ChildAvatar photoUrl={appt.child?.photo_url} name={displayName} size="md" />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-black text-sm text-[#0D2329] truncate">
                                          {displayName}
                                        </h4>
                                        <span className="text-[11px] font-black text-[#6B7C83] px-2 py-0.5 rounded-lg bg-black/5 shrink-0">
                                          {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
                                        </span>
                                      </div>
                                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${style.pillCls}`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                          <span>{appt.type || style.categoryName}</span>
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Lado Direito: Badges de Status + Ações + Excluir */}
                                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                                    {appt.status === "done" ? (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-[#065F46] px-3 py-1.5 rounded-xl bg-[#D1FAE5] border border-[#A7F3D0] flex items-center gap-1.5 shadow-2xs">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                                          <span>Sessão Concluída</span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (appt.child_id) {
                                              navigate(`/criancas/${appt.child_id}`)
                                            } else {
                                              navigate(`/atendimento/${appt.id}`)
                                            }
                                          }}
                                          className="text-xs font-bold text-[#7C3AED] hover:underline cursor-pointer px-1 py-1"
                                        >
                                          Ver Prontuário →
                                        </button>
                                      </div>
                                    ) : appt.status === "missed" ? (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-red-600 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-1.5 shadow-2xs">
                                          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                          <span>Falta Registrada</span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (appt.child_id) {
                                              navigate(`/criancas/${appt.child_id}`)
                                            }
                                          }}
                                          className="text-xs font-bold text-[#7C3AED] hover:underline cursor-pointer px-1 py-1"
                                        >
                                          Ver Detalhes →
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        {!isBlock && (
                                          <button
                                            type="button"
                                            onClick={() => setAbsenceModalAppt(appt)}
                                            className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-black flex items-center gap-1 active:scale-95 transition-all shadow-2xs cursor-pointer"
                                            title="Registrar Falta"
                                          >
                                            <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                                            <span>Falta</span>
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleStartAppointment(appt)}
                                          className="px-4 py-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                                        >
                                          <Play className="w-3 h-3 fill-current" />
                                          <span>Iniciar</span>
                                        </button>
                                      </div>
                                    )}

                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteAppointment(e, appt.id)}
                                      className="p-1.5 rounded-xl hover:bg-red-50 text-[#8CAAB1] hover:text-[#EF4444] transition-all cursor-pointer ml-1"
                                      title="Excluir Agendamento"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <button
                            onClick={() => openNewModalForDate(format(currentDate, "yyyy-MM-dd"), hourStr)}
                            className="opacity-0 group-hover:opacity-100 text-xs font-bold text-[#8CAAB1] hover:text-[#7C3AED] transition-all flex items-center gap-1 pt-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adicionar agendamento às {hourStr}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 3. MONTHLY VIEW */}
          {viewMode === "mes" && (
            <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-6 shadow-sm space-y-4">
              <h3 className="text-base font-black text-[#0D2329] capitalize">
                {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
              </h3>

              {/* Month calendar grid */}
              <div className="grid grid-cols-7 gap-2">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                  <div key={d} className="p-2 text-center text-xs font-black text-[#6B7C83]">
                    {d}
                  </div>
                ))}

                {monthDays.map((day) => {
                  const isCurrentMonth = isSameMonth(day, currentDate)
                  const isToday = isSameDay(day, new Date())
                  const dayAppts = appointments.filter((a) => isSameDay(new Date(a.start_time), day))

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => {
                        setCurrentDate(day)
                        setViewMode("dia")
                      }}
                      className={`p-2 min-h-[90px] rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        !isCurrentMonth
                          ? "opacity-30 bg-[#F7FAFA] border-transparent"
                          : isToday
                          ? "bg-[#F3E8FF] border-[#7C3AED]"
                          : "bg-white border-[#D8E5E7] hover:border-[#7C3AED]/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-black ${isToday ? "text-[#7C3AED]" : "text-[#0D2329]"}`}>
                          {format(day, "dd")}
                        </span>
                        {dayAppts.length > 0 && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                            {dayAppts.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {dayAppts.slice(0, 2).map((a) => (
                          <p key={a.id} className="text-[10px] font-bold text-[#0D2329] truncate bg-[#F7FAFA] p-0.5 rounded">
                            {format(new Date(a.start_time), "HH:mm")} {a.child?.full_name || a.type}
                          </p>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: SIDEBAR WIDGETS (3 COLS) */}
        <div className="col-span-3 space-y-5">
          {/* 1. PRÓXIMOS DE HOJE */}
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[#0D2329] tracking-tight">
                Próximos de Hoje
              </h3>
              <button
                onClick={() => {
                  setCurrentDate(new Date())
                  setViewMode("dia")
                }}
                className="text-[10px] font-black text-[#7C3AED] hover:underline"
              >
                Ver dia
              </button>
            </div>

            {todayAppointments.length === 0 ? (
              <p className="text-[11px] text-[#8CAAB1] italic">Sem próximos compromissos para hoje 🎉</p>
            ) : (
              <div className="space-y-2">
                {todayAppointments.slice(0, 4).map((appt) => {
                  const style = getAppointmentStyle(appt)
                  const startTime = new Date(appt.start_time)
                  const displayName = appt.child?.full_name || appt.notes || appt.type

                  return (
                    <div
                      key={appt.id}
                      onClick={() => handleStartAppointment(appt)}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#F7FAFA] transition-all cursor-pointer group"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                      <span className="text-xs font-black text-[#0D2329] shrink-0">
                        {format(startTime, "HH:mm")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#0D2329] truncate">{displayName}</p>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border mt-0.5 ${style.pillCls}`}>
                          {appt.type || style.categoryName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteAppointment(e, appt.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-[#8CAAB1] hover:text-[#EF4444] transition-all cursor-pointer"
                        title="Excluir Agendamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 2. ANIVERSARIANTES DA SEMANA */}
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[#0D2329] tracking-tight flex items-center gap-1.5">
                <span>Aniversariantes da Semana</span>
                <Cake className="w-3.5 h-3.5 text-[#EC4899]" />
              </h3>
            </div>

            {weeklyBirthdays.length === 0 ? (
              <p className="text-[11px] text-[#8CAAB1] italic">Nenhum aniversariante nesta semana 🎂</p>
            ) : (
              <div className="space-y-2">
                {weeklyBirthdays.map((item) => (
                  <div
                    key={item.child.id}
                    onClick={() => navigate(`/criancas/${item.child.id}`)}
                    className="flex items-center gap-2.5 p-2 rounded-2xl bg-[#FEF8EC] border border-[#FDE68A] cursor-pointer hover:bg-[#FDE68A]/60 transition-all"
                  >
                    <ChildAvatar photoUrl={item.child.photo_url} name={item.child.full_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-[#B8871E] truncate">{item.child.full_name}</p>
                      <p className="text-[10px] font-bold text-[#D97706]">
                        {formatDate(item.child.birth_date!)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. RESUMO DO PERÍODO (DINÂMICO: DIA / SEMANA / MÊS) */}
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-5 shadow-sm space-y-3.5">
            <h3 className="text-xs font-black text-[#0D2329] tracking-tight">
              {viewMode === "dia" || viewMode === "celular"
                ? "Resumo do Dia"
                : viewMode === "mes"
                ? "Resumo do Mês"
                : "Resumo da Semana"}
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-[#E8F8F5] border border-[#A7F3D0] flex items-center justify-between">
                <div>
                  <p className="text-lg font-black text-[#065F46] leading-none">{weeklySummary.sessions}</p>
                  <p className="text-[9px] font-bold text-[#059669] mt-1">Atendimentos</p>
                </div>
                <Users className="w-4 h-4 text-[#10B981]" />
              </div>

              <div className="p-3 rounded-2xl bg-[#F3E8FF] border border-[#DDD6FE] flex items-center justify-between">
                <div>
                  <p className="text-lg font-black text-[#6B21A8] leading-none">{weeklySummary.evaluations}</p>
                  <p className="text-[9px] font-bold text-[#7C3AED] mt-1">Avaliações</p>
                </div>
                <FileText className="w-4 h-4 text-[#7C3AED]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: NEW APPOINTMENT DIALOG
          ========================================================================= */}
      <NewAppointmentDialog
        open={showNewModal}
        onClose={() => {
          setShowNewModal(false)
          setSelectedDateForNew(undefined)
        }}
        onSuccess={() => {
          setShowNewModal(false)
          setSelectedDateForNew(undefined)
          loadAppointments()
        }}
        defaultDate={selectedDateForNew}
      />

      {/* =========================================================================
          MODAL: RECORD ABSENCE / FALTOU
          ========================================================================= */}
      <RecordAbsenceModal
        open={Boolean(absenceModalAppt)}
        appointment={absenceModalAppt}
        onClose={() => setAbsenceModalAppt(null)}
        onSuccess={() => {
          setAbsenceModalAppt(null)
          loadAppointments()
        }}
      />

      {/* =========================================================================
          MODAL 2: QUICK BLOCK TIME SLOT
          ========================================================================= */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#EEF5F6] pb-3">
              <h3 className="text-base font-black text-[#0D2329] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#0284C7]" /> Bloquear Horário
              </h3>
              <button
                onClick={() => setShowBlockModal(false)}
                className="text-[#8CAAB1] hover:text-[#0D2329]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBlockSlot} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#0D2329] block mb-1">Motivo do Bloqueio *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Almoço, Reunião de Equipe, Estudo..."
                  value={blockForm.title}
                  onChange={(e) => setBlockForm({ ...blockForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] font-bold text-xs focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-[#0D2329] block mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={blockForm.date}
                    onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })}
                    className="w-full p-2 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0D2329] block mb-1">Início *</label>
                  <input
                    type="time"
                    required
                    value={blockForm.start_time}
                    onChange={(e) => setBlockForm({ ...blockForm, start_time: e.target.value })}
                    className="w-full p-2 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0D2329] block mb-1">Fim *</label>
                  <input
                    type="time"
                    required
                    value={blockForm.end_time}
                    onChange={(e) => setBlockForm({ ...blockForm, end_time: e.target.value })}
                    className="w-full p-2 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#0D2329] block mb-1">Categoria</label>
                <select
                  value={blockForm.type}
                  onChange={(e) => setBlockForm({ ...blockForm, type: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] font-bold text-xs"
                >
                  <option value="Reunião/Estudo">Reunião / Estudo / Planejamento</option>
                  <option value="Intervalo">Intervalo / Almoço</option>
                  <option value="Outro">Outro compromisso pessoal</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#EEF5F6]">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#D8E5E7] text-[#6B7C83] font-bold hover:bg-[#F7FAFA]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={blocking}
                  className="px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-black shadow-xs"
                >
                  {blocking ? "Bloqueando..." : "Confirmar Bloqueio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
