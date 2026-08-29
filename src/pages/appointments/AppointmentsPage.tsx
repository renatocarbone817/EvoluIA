import { useState, useEffect, useMemo } from "react"
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

      if (viewMode === "dia" || viewMode === "celular") {
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
    } else {
      // Sessão Psicopedagógica / Intervenção / Aula -> abre o Atendimento Clínico
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

  function openNewModalForDate(dateStr?: string) {
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
  const toselectedDayAppointments = useMemo(() => {
    return appointments.filter((a) => isSameDay(new Date(a.start_time), new Date()))
  }, [appointments])

  const selectedDayAppointments = useMemo(() => {
    return filteredAppointments.filter((a) => isSameDay(new Date(a.start_time), currentDate))
  }, [filteredAppointments, currentDate])

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
    let meetings = 0
    let devolutivas = 0

    appointments.forEach((a) => {
      const typeLower = (a.type || "").toLowerCase()
      const notesLower = (a.notes || "").toLowerCase()

      if (typeLower.includes("avalia") || typeLower.includes("entrevista")) {
        evaluations++
      } else if (typeLower.includes("reuni") || typeLower.includes("estudo") || typeLower.includes("planeja") || notesLower.includes("bloqueio")) {
        meetings++
      } else if (typeLower.includes("devolutiva")) {
        devolutivas++
      } else {
        sessions++
      }
    })

    return { sessions, evaluations, meetings, devolutivas }
  }, [appointments])

  // Helper for appointment category styling
  function getAppointmentStyle(appt: AppointmentWithChild) {
    const typeLower = (appt.type || "").toLowerCase()
    const notesLower = (appt.notes || "").toLowerCase()

    if (typeLower.includes("avalia") || typeLower.includes("entrevista")) {
      return {
        bg: "bg-[#F3E8FF] hover:bg-[#E9D5FF]",
        border: "border-[#DDD6FE]",
        text: "text-[#6B21A8]",
        subtext: "text-[#7C3AED]",
        badgeBg: "bg-[#7C3AED] text-white",
        dot: "bg-[#7C3AED]",
        categoryName: "Avaliação",
      }
    }

    if (typeLower.includes("reuni") || typeLower.includes("estudo") || typeLower.includes("planeja") || notesLower.includes("bloqueio")) {
      return {
        bg: "bg-[#E0F2FE] hover:bg-[#BAE6FD]",
        border: "border-[#BAE6FD]",
        text: "text-[#0369A1]",
        subtext: "text-[#0284C7]",
        badgeBg: "bg-[#0284C7] text-white",
        dot: "bg-[#0284C7]",
        categoryName: "Reunião / Estudo",
      }
    }

    if (typeLower.includes("devolutiva")) {
      return {
        bg: "bg-[#FEF3C7] hover:bg-[#FDE68A]",
        border: "border-[#FDE68A]",
        text: "text-[#92400E]",
        subtext: "text-[#D97706]",
        badgeBg: "bg-[#D97706] text-white",
        dot: "bg-[#D97706]",
        categoryName: "Devolutiva",
      }
    }

    // Default: Sessão de Intervenção
    return {
      bg: "bg-[#E8F8F5] hover:bg-[#D1FAE5]",
      border: "border-[#A7F3D0]",
      text: "text-[#065F46]",
      subtext: "text-[#059669]",
      badgeBg: "bg-[#10B981] text-white",
      dot: "bg-[#10B981]",
      categoryName: "Sessão de Intervenção",
    }
  }

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
          <p className="text-xs sm:text-sm font-medium text-[#6B7C83]">
            Visualize e gerencie seus compromissos e atendimentos.
          </p>
        </div>

        {/* Center/Right Controls: Navigation & View Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Week Navigation */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border-2 border-[#D8E5E7] shadow-2xs">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-[#EEF5F6] text-[#0D2329] hover:bg-[#D8E5E7] transition-all"
            >
              Hoje
            </button>

            <button
              onClick={handlePrev}
              className="p-1.5 rounded-xl text-[#6B7C83] hover:text-[#0D2329] hover:bg-[#F7FAFA] transition-all"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              onClick={handleNext}
              className="p-1.5 rounded-xl text-[#6B7C83] hover:text-[#0D2329] hover:bg-[#F7FAFA] transition-all"
              title="Próximo"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <div className="px-2.5 py-1 text-xs font-black text-[#0D2329] flex items-center gap-1 border-l border-[#EEF5F6]">
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
          <div className="hidden md:flex bg-[#F7FAFA] rounded-2xl p-1 border-2 border-[#D8E5E7] shadow-2xs">
            {[
              { id: "dia", label: "Dia" },
              { id: "semana", label: "Semana" },
              { id: "mes", label: "Mês" },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as ViewMode)}
                className={`px-3.5 py-1.5 text-xs font-black rounded-xl transition-all ${
                  viewMode === mode.id
                    ? "bg-[#7C3AED] text-white shadow-xs"
                    : "text-[#6B7C83] hover:text-[#0D2329] hover:bg-white"
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
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none -mx-1 px-1 w-full sm:w-auto">
          {[
            { id: "todos", label: "Todos", count: appointments.length },
            { id: "agendados", label: "Agendados", count: appointments.filter((a) => a.status === "scheduled" || a.status === "confirmed" || a.status === "in_progress").length, dot: "bg-[#7C3AED]" },
            { id: "realizados", label: "Realizados", count: appointments.filter((a) => a.status === "done").length, dot: "bg-[#10B981]" },
            { id: "cancelados", label: "Cancelados", count: appointments.filter((a) => a.status === "cancelled" || a.status === "missed").length, dot: "bg-[#EF4444]" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as StatusFilter)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${
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
          2. MAIN GRID: CALENDAR (9 COLS) + RIGHT SIDEBAR (3 COLS)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ==========================================
            LEFT COLUMN: WEEKLY/DAILY TIMETABLE GRID (9 COLS)
            ========================================== */}
        <div className="lg:col-span-9 space-y-6">
          {/* A. WEEKLY GRID VIEW */}
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

                                      {/* WhatsApp Button on hover */}
                                      {!isBlock && appt.child && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleSendWhatsApp(appt)
                                          }}
                                          className="opacity-0 group-hover:opacity-100 text-[#10B981] hover:scale-110 transition-all p-0.5"
                                          title="Enviar Lembrete WhatsApp"
                                        >
                                          <MessageSquare className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>

                                    <p className={`text-[11px] font-black truncate leading-tight ${style.text}`}>
                                      {title}
                                    </p>

                                    <p className={`text-[9px] font-bold truncate opacity-85 ${style.subtext}`}>
                                      {appt.type}
                                    </p>
                                  </div>
                                )
                              })
                            ) : (
                              <button
                                type="button"
                                onClick={() => openNewModalForDate(dateStr)}
                                className="w-full h-full min-h-[44px] rounded-xl flex items-center justify-center opacity-0 group-hover/cell:opacity-100 bg-[#EDE9FE]/50 text-[#7C3AED] text-[10px] font-bold transition-all border border-dashed border-[#7C3AED]/40 hover:bg-[#7C3AED] hover:text-white"
                                title={`Agendar em ${format(day, "dd/MM")} às ${hourStr}`}
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

              {/* Legend Footer */}
              <div className="p-4 bg-[#F8FAFB] flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-bold text-[#6B7C83]">
                <span className="flex items-center gap-1.5 text-[#065F46]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> Sessão de Intervenção
                </span>
                <span className="flex items-center gap-1.5 text-[#6B21A8]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" /> Avaliação
                </span>
                <span className="flex items-center gap-1.5 text-[#0369A1]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" /> Reunião/Estudo
                </span>
                <span className="flex items-center gap-1.5 text-[#92400E]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" /> Devolutiva
                </span>
                <span className="flex items-center gap-1.5 text-[#475569]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]" /> Outro
                </span>
              </div>
            </div>
          )}

          {/* B. DAY VIEW */}
          {viewMode === "dia" && (
            <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EEF5F6]">
                <h3 className="font-black text-sm text-[#0D2329]">
                  Atendimentos de {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </h3>
                <button
                  onClick={() => openNewModalForDate(format(currentDate, "yyyy-MM-dd"))}
                  className="text-xs font-black text-[#7C3AED] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar horário
                </button>
              </div>

              {filteredAppointments.length === 0 ? (
                <div className="py-16 text-center text-[#8CAAB1] space-y-3">
                  <CalendarIcon className="w-12 h-12 mx-auto text-[#D8E5E7]" />
                  <p className="font-bold text-sm text-[#0D2329]">Nenhum agendamento para este dia</p>
                  <Button size="sm" onClick={() => openNewModalForDate(format(currentDate, "yyyy-MM-dd"))}>
                    <Plus className="w-4 h-4 mr-1" /> Novo Agendamento
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAppointments.map((appt) => {
                    const style = getAppointmentStyle(appt)
                    const startTime = new Date(appt.start_time)
                    const endTime = new Date(appt.end_time)
                    const displayName = appt.child?.full_name || appt.notes || "Compromisso"

                    return (
                      <div
                        key={appt.id}
                        className={`p-4 rounded-2xl border-2 ${style.border} ${style.bg} flex items-center justify-between gap-4 transition-all shadow-2xs group`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <ChildAvatar photoUrl={appt.child?.photo_url} name={displayName} size="md" />
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <h4 className={`font-black text-sm truncate ${style.text}`}>{displayName}</h4>
                            <p className={`text-xs font-semibold truncate ${style.subtext}`}>{appt.type}</p>
                            <p className="text-xs font-black text-[#0D2329] flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#8CAAB1]" />
                              {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {appt.child && (
                            <button
                              onClick={() => handleSendWhatsApp(appt)}
                              className="p-2 text-[#10B981] bg-white/60 hover:bg-white rounded-xl transition-all shadow-2xs border border-[#10B981]/30"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}

                          {appt.status !== "missed" && appt.status !== "done" && (
                            <button
                              onClick={() => setAbsenceModalAppt(appt)}
                              className="px-2.5 py-1.5 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                              title="Registrar Falta / Não Comparecimento"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Faltou</span>
                            </button>
                          )}

                          {appt.status === "missed" ? (
                            <span className="px-2.5 py-1 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs font-black flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Falta Registrada
                            </span>
                          ) : (
                            <Button size="sm" onClick={() => handleStartAppointment(appt)}>
                              <Play className="w-3 h-3 fill-current mr-1" /> Iniciar
                            </Button>
                          )}

                          <button
                            onClick={(e) => handleDeleteAppointment(e, appt.id)}
                            className="p-2 text-[#8CAAB1] hover:text-[#EF4444] hover:bg-white rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* C. MONTH VIEW */}
          {viewMode === "mes" && (
            <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-5 shadow-sm space-y-4">
              <div className="grid grid-cols-7 gap-1.5 text-center font-black text-xs text-[#8CAAB1] pb-2 border-b border-[#EEF5F6]">
                <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {eachDayOfInterval({
                  start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
                  end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
                }).map((day) => {
                  const isCurrentMonth = isSameMonth(day, currentDate)
                  const isToday = isSameDay(day, new Date())
                  const dayAppts = filteredAppointments.filter((a) => isSameDay(new Date(a.start_time), day))

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => {
                        setCurrentDate(day)
                        setViewMode("dia")
                      }}
                      className={`min-h-[85px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isToday
                          ? "bg-[#F3E8FF] border-[#7C3AED] ring-2 ring-[#7C3AED]/20 shadow-xs"
                          : isCurrentMonth
                          ? "bg-white border-[#D8E5E7] hover:border-[#7C3AED] hover:shadow-2xs"
                          : "bg-[#F7FAFA] border-transparent opacity-40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-black ${isToday ? "text-[#7C3AED]" : "text-[#0D2329]"}`}>
                          {format(day, "dd")}
                        </span>
                        {dayAppts.length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayAppts.slice(0, 2).map((a) => (
                          <div
                            key={a.id}
                            className="text-[9px] font-bold truncate px-1.5 py-0.5 rounded-md bg-[#EEF5F6] text-[#0D2329]"
                          >
                            {format(new Date(a.start_time), "HH:mm")} {a.child?.full_name || a.type}
                          </div>
                        ))}
                        {dayAppts.length > 2 && (
                          <span className="text-[8px] font-extrabold text-[#7C3AED]">
                            +{dayAppts.length - 2} mais
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* D. MOBILE / COMPACT CELULAR VIEW */}
          {viewMode === "celular" && (
            <div className="w-full max-w-full space-y-4">
              {/* 7-Day Week Strip */}
              <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-3 shadow-sm">
                <div className="grid grid-cols-7 gap-1 text-center">
                  {weekDays.map((day) => {
                    const isSelected = isSameDay(day, currentDate)
                    const isToday = isSameDay(day, new Date())
                    const dayApptsCount = appointments.filter((a) => {
                      const aDate = new Date(a.start_time)
                      return isSameDay(aDate, day)
                    }).length

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => setCurrentDate(day)}
                        className={`py-2 px-0.5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center relative active:scale-95 ${
                          isSelected
                            ? "bg-[#7C3AED] text-white border-[#6D28D9] shadow-md font-black"
                            : isToday
                            ? "bg-[#EDE9FE] border-[#C4B5FD] text-[#7C3AED] font-bold"
                            : "border-transparent hover:bg-[#F7FAFA] text-[#6B7C83]"
                        }`}
                      >
                        <p className={`text-[10px] uppercase font-black ${isSelected ? "text-white/80" : ""}`}>
                          {format(day, "EEE", { locale: ptBR }).substring(0, 3)}
                        </p>
                        <p className="text-sm font-black mt-0.5">{format(day, "dd")}</p>
                        {dayApptsCount > 0 && (
                          <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? "bg-white" : "bg-[#7C3AED]"}`} />
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
                  {selectedDayAppointments.length === 1 ? "1 compromisso agendado" : `${selectedDayAppointments.length} compromissos agendados`}
                </p>
              </div>

              {/* Cards List for Selected Day */}
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
                      <span>Agendar Sessão</span>
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
                              <p className="text-xs font-semibold text-[#6B7C83] truncate">{appt.type}</p>
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
                            {!isBlock && appt.child && (
                              <button
                                type="button"
                                onClick={() => handleSendWhatsApp(appt)}
                                className="w-8 h-8 rounded-xl bg-[#E8F8F5] text-[#10B981] border border-[#A7F3D0] flex items-center justify-center active:scale-95 shadow-2xs"
                                title="Enviar WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleStartAppointment(appt)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black flex items-center gap-1 shadow-xs active:scale-95"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Abrir</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* =====================================================================
              B. BOTTOM BAR: COMPROMISSOS DE HOJE (CARDS HORIZONTAIS)
              ===================================================================== */}
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#0D2329]">
                  Compromissos de Hoje
                </h3>
                <p className="text-xs font-semibold text-[#6B7C83] capitalize">
                  {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>

              <button
                onClick={() => {
                  setCurrentDate(new Date())
                  setViewMode("dia")
                }}
                className="px-3 py-1.5 rounded-xl border border-[#D8E5E7] text-xs font-black text-[#7C3AED] hover:bg-[#F3E8FF] transition-all"
              >
                Ver dia completo
              </button>
            </div>

            {toselectedDayAppointments.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#F7FAFA] text-center text-[#8CAAB1] text-xs font-semibold">
                Nenhum compromisso agendado para hoje. Aproveite para planejar suas intervenções! 🌟
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {toselectedDayAppointments.map((appt) => {
                  const style = getAppointmentStyle(appt)
                  const startTime = new Date(appt.start_time)
                  const endTime = new Date(appt.end_time)
                  const displayName = appt.child?.full_name || (appt.notes ? appt.notes.replace("[BLOQUEIO]", "").trim() : appt.type)

                  return (
                    <div
                      key={appt.id}
                      onClick={() => handleStartAppointment(appt)}
                      className={`p-4 rounded-2xl border-2 ${style.border} ${style.bg} hover:shadow-md transition-all cursor-pointer flex items-center gap-3.5 group`}
                    >
                      <ChildAvatar photoUrl={appt.child?.photo_url} name={displayName} size="md" />

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black ${style.subtext}`}>
                            {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
                          </span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${style.badgeBg}`}>
                            {appt.status === "done" ? "Realizado" : appt.status === "in_progress" ? "Em Atendimento" : "Agendado"}
                          </span>
                        </div>

                        <h4 className={`font-black text-xs truncate ${style.text}`}>{displayName}</h4>
                        <p className={`text-[10px] font-bold truncate opacity-85 ${style.subtext}`}>{appt.type}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ==========================================
            RIGHT SIDEBAR: 4 FUNCTIONAL WIDGETS (3 COLS)
            ========================================== */}
        <div className="lg:col-span-3 space-y-5">
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
                Ver todos
              </button>
            </div>

            {toselectedDayAppointments.length === 0 ? (
              <p className="text-[11px] text-[#8CAAB1] italic">Sem próximos compromissos para hoje 🎉</p>
            ) : (
              <div className="space-y-2">
                {toselectedDayAppointments.slice(0, 4).map((appt) => {
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
                        <p className="text-[10px] text-[#6B7C83] truncate">{appt.type}</p>
                      </div>
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
              <button
                onClick={() => navigate("/criancas")}
                className="text-[10px] font-black text-[#7C3AED] hover:underline"
              >
                Ver todos
              </button>
            </div>

            {weeklyBirthdays.length === 0 ? (
              <div className="p-3 bg-[#FDF2F8]/60 rounded-2xl border border-[#FCE7F3] text-center text-[#9D174D] text-[11px] font-bold">
                Nenhum aniversariante nesta semana 🎈
              </div>
            ) : (
              <div className="space-y-2.5">
                {weeklyBirthdays.map((item) => (
                  <div
                    key={item.child.id}
                    onClick={() => navigate(`/criancas/${item.child.id}`)}
                    className="flex items-center gap-2.5 p-2 rounded-2xl hover:bg-[#FDF2F8]/50 transition-all cursor-pointer border border-[#FCE7F3]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#FCE7F3] text-[#BE185D] flex flex-col items-center justify-center shrink-0 leading-none">
                      <span className="text-xs font-black">{item.bDay}</span>
                      <span className="text-[8px] font-extrabold uppercase">
                        {format(new Date(currentDate.getFullYear(), item.bMonth - 1, item.bDay), "MMM", { locale: ptBR }).substring(0, 3)}
                      </span>
                    </div>

                    <ChildAvatar photoUrl={item.child.photo_url} name={item.child.full_name} size="sm" />

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-[#0D2329] truncate">{item.child.full_name}</p>
                      <p className="text-[10px] font-bold text-[#BE185D]">Faz {item.age} anos 🎂</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. RESUMO DA SEMANA */}
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-5 shadow-sm space-y-3.5">
            <h3 className="text-xs font-black text-[#0D2329] tracking-tight">
              Resumo da Semana
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

              <div className="p-3 rounded-2xl bg-[#E0F2FE] border border-[#BAE6FD] flex items-center justify-between">
                <div>
                  <p className="text-lg font-black text-[#0369A1] leading-none">{weeklySummary.meetings}</p>
                  <p className="text-[9px] font-bold text-[#0284C7] mt-1">Reuniões</p>
                </div>
                <Users className="w-4 h-4 text-[#0284C7]" />
              </div>

              <div className="p-3 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-between">
                <div>
                  <p className="text-lg font-black text-[#92400E] leading-none">{weeklySummary.devolutivas}</p>
                  <p className="text-[9px] font-bold text-[#D97706] mt-1">Devolutivas</p>
                </div>
                <MessageCircle className="w-4 h-4 text-[#D97706]" />
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
