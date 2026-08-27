import { useState, useEffect } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
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
} from "lucide-react"
import toast from "react-hot-toast"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { ChildAvatar } from "@/components/ui/ChildAvatar"
import { formatTime, formatDate } from "@/lib/utils"
import type { AppointmentWithChild } from "@/types/database"
import { NewAppointmentDialog } from "./NewAppointmentDialog"

type ViewMode = "dia" | "semana" | "mes" | "celular"
type StatusFilter = "todos" | "agendados" | "realizados" | "cancelados"

export function AppointmentsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, professional } = useAuthStore()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>("semana")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos")
  const [appointments, setAppointments] = useState<AppointmentWithChild[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(searchParams.get("novo") === "true")
  const [selectedDateForNew, setSelectedDateForNew] = useState<string | undefined>(undefined)

  // Search feature
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<AppointmentWithChild[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  const profId = professional?.id || user?.id

  useEffect(() => {
    if (profId) loadAppointments()
  }, [currentDate, viewMode, profId])

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
        .select("*, child:children(*)")
        .eq("professional_id", profId)
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
    const isInterviewOrEval =
      appt.type === "Entrevista Inicial" ||
      appt.type === "Avaliação Inicial" ||
      appt.type?.toLowerCase().includes("entrevista") ||
      appt.type?.toLowerCase().includes("avaliação")

    if (isInterviewOrEval) {
      navigate(`/criancas/${appt.child_id}?editar=true&appointmentId=${appt.id}`)
    } else {
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

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  })

  const filteredAppointments = appointments.filter((a) => {
    if (statusFilter === "todos") return true
    if (statusFilter === "agendados")
      return a.status === "scheduled" || a.status === "confirmed" || a.status === "in_progress"
    if (statusFilter === "realizados") return a.status === "done"
    if (statusFilter === "cancelados") return a.status === "cancelled" || a.status === "missed"
    return true
  })

  const countScheduled = appointments.filter(
    (a) => a.status === "scheduled" || a.status === "confirmed" || a.status === "in_progress"
  ).length
  const countDone = appointments.filter((a) => a.status === "done").length
  const countCancelled = appointments.filter(
    (a) => a.status === "cancelled" || a.status === "missed"
  ).length

  return (
    <div className="p-4 md:p-6 max-w-[95%] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#19323A] tracking-tight">
            Agenda de Atendimentos
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7C83] mt-1">
            Organização clínica e sincronização em tempo real
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8DA3A8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar paciente..."
              className="pl-9 pr-8 py-2.5 text-sm font-semibold bg-white border-2 border-[#D8E5E7] rounded-xl w-52 focus:outline-none focus:border-[#245C6B] text-[#19323A] placeholder:text-[#8DA3A8] transition-colors shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8DA3A8] hover:text-[#19323A] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <Button
            variant="outline"
            onClick={() => navigate("/configuracoes")}
            className="gap-2 text-xs border-2 shadow-2xs"
          >
            <Smartphone className="w-4 h-4 text-[#20836F]" />
            Sincronizar Celular
          </Button>
          <Button size="lg" onClick={() => openNewModalForDate()} className="gap-2 shadow-sm">
            <Plus className="w-5 h-5" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {isSearching && (
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-base text-[#19323A]">Resultados para "{searchQuery}"</h2>
            <button
              onClick={clearSearch}
              className="text-xs text-[#6B7C83] hover:text-[#19323A] flex items-center gap-1 font-semibold"
            >
              <X className="w-3.5 h-3.5" />
              Limpar busca
            </button>
          </div>

          {searchLoading ? (
            <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] shadow-sm p-8 text-center">
              <div className="w-6 h-6 border-2 border-[#245C6B] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] shadow-sm py-10 text-center">
              <Search className="w-8 h-8 text-[#8DA3A8] mx-auto mb-2" />
              <p className="font-bold text-sm text-[#19323A]">Nenhum agendamento encontrado</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] shadow-sm overflow-hidden">
              {searchResults.map((appt, idx) => {
                const displayName = appt.child?.full_name || "Criança"
                const isFuture = new Date(appt.start_time) >= new Date()

                return (
                  <div
                    key={appt.id}
                    className={`flex items-center gap-4 px-5 py-3.5 group transition-colors hover:bg-[#F7FAFA] ${
                      idx < searchResults.length - 1 ? "border-b border-[#EEF5F6]" : ""
                    } ${appt.status === "cancelled" ? "opacity-50" : ""}`}
                  >
                    <div className="shrink-0 text-center w-14">
                      <p className="text-[10px] font-bold text-[#6B7C83] uppercase">
                        {format(new Date(appt.start_time), "dd/MM/yy")}
                      </p>
                      <p className="text-sm font-black text-[#19323A]">
                        {format(new Date(appt.start_time), "HH:mm")}
                      </p>
                    </div>

                    <div className="w-px h-10 bg-[#D8E5E7] shrink-0" />

                    <ChildAvatar photoUrl={appt.child?.photo_url} name={displayName} size="sm" />

                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-sm text-[#19323A] truncate">{displayName}</h3>
                      <p className="text-[11px] font-semibold text-[#6B7C83] truncate">{appt.type}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge statusKey={appt.status} />
                      {isFuture && appt.status !== "cancelled" && appt.status !== "done" && (
                        <button
                          type="button"
                          onClick={(e) => handleCancelAppointment(e, appt.id)}
                          className="flex items-center gap-1 text-[10px] font-bold text-[#D96C6C] hover:bg-[#FDF0F0] px-2.5 py-1.5 rounded-lg border border-[#D96C6C]/30 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancelar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteAppointment(e, appt.id)}
                        className="p-1.5 text-[#8DA3A8] hover:text-[#D96C6C] hover:bg-[#FDF0F0] rounded-lg transition-colors"
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

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border-2 border-[#D8E5E7] shadow-sm">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrev} className="h-10 w-10">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="font-bold text-xs h-10 px-3 bg-[#EEF5F6] border-[#245C6B]/40 hover:bg-[#EAF3F5]"
            >
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={handleNext} className="h-10 w-10">
              <ChevronRight className="w-5 h-5" />
            </Button>

            <span className="font-black text-sm sm:text-base capitalize ml-2 text-[#19323A]">
              {format(currentDate, viewMode === "mes" ? "MMMM 'de' yyyy" : "dd 'de' MMMM 'de' yyyy", {
                locale: ptBR,
              })}
            </span>
          </div>

          <div className="flex bg-[#EEF5F6] rounded-xl p-1 border-2 border-[#D8E5E7]">
            {(
              [
                { id: "dia", label: "Dia" },
                { id: "semana", label: "Semana" },
                { id: "mes", label: "Mês" },
                { id: "celular", label: "📱 Celular" },
              ] as { id: ViewMode; label: string }[]
            ).map((mode) => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all ${
                  viewMode === mode.id
                    ? "bg-[#245C6B] text-white shadow-xs"
                    : "text-[#19323A] hover:bg-white/60"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#6B7C83] mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrar:</span>
          </div>
          {[
            { id: "todos", label: "Todos", count: appointments.length },
            { id: "agendados", label: "Agendados", count: countScheduled, dot: "bg-[#245C6B]" },
            { id: "realizados", label: "Realizados", count: countDone, dot: "bg-[#20836F]" },
            { id: "cancelados", label: "Cancelados", count: countCancelled, dot: "bg-[#D96C6C]" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as StatusFilter)}
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

      {viewMode === "celular" && (
        <div className="max-w-md mx-auto space-y-4">
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {weekDays.map((day) => {
                const isSelected = isSameDay(day, currentDate)
                const isToday = isSameDay(day, new Date())
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setCurrentDate(day)}
                    className={`py-2.5 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "bg-[#245C6B] text-white border-[#1E4E5B] shadow-sm font-black"
                        : isToday
                        ? "bg-[#EEF5F6] border-[#245C6B] font-bold text-[#245C6B] ring-2 ring-[#245C6B]/20"
                        : "border-transparent hover:bg-[#EEF5F6] text-[#6B7C83]"
                    }`}
                  >
                    <p className="text-[10px] uppercase font-extrabold">
                      {format(day, "EEE", { locale: ptBR }).substring(0, 3)}
                    </p>
                    <p className="text-sm font-black mt-0.5">{format(day, "dd")}</p>
                    {isToday && !isSelected && (
                      <span className="block w-1.5 h-1.5 bg-[#245C6B] rounded-full mx-auto mt-0.5" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-5 shadow-sm space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-[#EEF5F6] animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="py-10 text-center text-[#6B7C83] space-y-3">
                <CalendarIcon className="w-10 h-10 mx-auto text-[#8DA3A8]" />
                <p className="font-bold text-sm text-[#19323A]">Nenhum atendimento neste dia</p>
                <Button
                  size="sm"
                  onClick={() => openNewModalForDate(format(currentDate, "yyyy-MM-dd"))}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Novo Agendamento
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAppointments.map((appt) => {
                  const startTime = new Date(appt.start_time)
                  const displayName = appt.child?.full_name || "Criança"
                  return (
                    <div
                      key={appt.id}
                      className="p-4 rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] hover:border-[#245C6B] transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <ChildAvatar photoUrl={appt.child?.photo_url} name={displayName} size="sm" />
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <h3 className="font-black text-sm text-[#19323A] truncate">{displayName}</h3>
                          <p className="text-[11px] font-semibold text-[#6B7C83] truncate">{appt.type}</p>
                          <p className="text-xs font-bold text-[#245C6B]">{format(startTime, "HH:mm")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge statusKey={appt.status} className="text-[10px] px-2 py-0.5" />
                        {(appt.status === "scheduled" || appt.status === "confirmed") && (
                          <Button
                            size="sm"
                            className="gap-1.5 text-xs font-bold"
                            onClick={() => handleStartAppointment(appt)}
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Iniciar
                          </Button>
                        )}
                        {appt.status === "in_progress" && (
                          <Button
                            size="sm"
                            className="gap-1.5 text-xs font-bold bg-[#20836F] hover:bg-[#186b5a] text-white"
                            onClick={() => handleStartAppointment(appt)}
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Continuar
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === "semana" && (
        <div className="w-full grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date())
            const dayAppts = filteredAppointments.filter((a) =>
              isSameDay(new Date(a.start_time), day)
            )
            const dateStr = format(day, "yyyy-MM-dd")

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[400px] rounded-2xl border-2 flex flex-col transition-all overflow-hidden ${
                  isToday
                    ? "border-[#245C6B] bg-[#EAF3F5]/30 ring-4 ring-[#245C6B]/15 shadow-md"
                    : "border-[#D8E5E7] bg-white shadow-2xs hover:border-[#245C6B]/40"
                }`}
              >
                <div
                  className={`p-3 text-center border-b-2 transition-colors relative group/hdr ${
                    isToday
                      ? "bg-gradient-to-b from-[#245C6B] to-[#1E4E5B] text-white border-[#19323A]"
                      : "bg-[#FAFCFC] border-[#EEF5F6] text-[#19323A]"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <p
                      className={`text-[11px] font-black uppercase tracking-wider ${
                        isToday ? "text-[#E8F8F5]" : "text-[#6B7C83]"
                      }`}
                    >
                      {format(day, "EEE", { locale: ptBR })}
                    </p>
                    {isToday && (
                      <span className="bg-[#63C7B2] text-[#14282F] text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md tracking-wider">
                        Hoje
                      </span>
                    )}
                  </div>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mt-1 font-black text-sm ${
                      isToday ? "bg-white text-[#19323A] shadow-xs" : "text-[#19323A]"
                    }`}
                  >
                    {format(day, "dd")}
                  </div>
                  <button
                    type="button"
                    onClick={() => openNewModalForDate(dateStr)}
                    className={`absolute right-2 top-2 p-1 rounded-lg transition-all opacity-0 group-hover/hdr:opacity-100 ${
                      isToday
                        ? "bg-white/20 hover:bg-white text-white hover:text-[#19323A]"
                        : "bg-[#EEF5F6] hover:bg-[#245C6B] text-[#6B7C83] hover:text-white"
                    }`}
                    title="Agendar neste dia"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-2.5 flex-1 space-y-2 overflow-y-auto flex flex-col justify-between">
                  {dayAppts.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-8 text-center space-y-2">
                      <span className="text-[11px] font-semibold text-[#8DA3A8] italic">
                        Sem atendimentos
                      </span>
                      <button
                        type="button"
                        onClick={() => openNewModalForDate(dateStr)}
                        className="text-[11px] font-black text-[#245C6B] hover:bg-[#EAF3F5] px-2.5 py-1.5 rounded-xl border-2 border-dashed border-[#245C6B]/30 hover:border-[#245C6B] transition-all flex items-center gap-1 active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                        Agendar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayAppts.map((appt) => {
                        const displayName = appt.child?.full_name || "Criança"
                        return (
                          <div
                            key={appt.id}
                            className="p-2.5 rounded-xl border-2 border-[#D8E5E7] bg-white hover:border-[#245C6B] hover:shadow-xs transition-all space-y-1.5 text-xs shadow-2xs group relative"
                          >
                            <div className="flex items-center justify-between font-black text-[#19323A]">
                              <span className="text-xs font-black">
                                {format(new Date(appt.start_time), "HH:mm")}
                              </span>
                              <div className="flex items-center gap-1">
                                <Badge statusKey={appt.status} className="text-[9px] px-1.5 py-0" />
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteAppointment(e, appt.id)}
                                  className="opacity-0 group-hover:opacity-100 text-[#8DA3A8] hover:text-[#D96C6C] p-0.5 rounded transition-all"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <ChildAvatar
                                photoUrl={appt.child?.photo_url}
                                name={displayName}
                                size="xs"
                              />
                              <p className="font-bold text-xs text-[#19323A] truncate flex-1">
                                {displayName}
                              </p>
                            </div>
                            <p className="text-[10px] font-semibold text-[#6B7C83] truncate">
                              {appt.type}
                            </p>
                            {(appt.status === "scheduled" || appt.status === "confirmed") && (
                              <Button
                                size="sm"
                                className="w-full h-7 text-[10px] mt-1 gap-1 font-black"
                                onClick={() => handleStartAppointment(appt)}
                              >
                                <Play className="w-3 h-3 fill-current" />
                                Iniciar
                              </Button>
                            )}

                            {appt.status === "in_progress" && (
                              <Button
                                size="sm"
                                className="w-full h-7 text-[10px] mt-1 gap-1 font-black bg-[#20836F] hover:bg-[#186b5a] text-white"
                                onClick={() => handleStartAppointment(appt)}
                              >
                                <Play className="w-3 h-3 fill-current" />
                                Continuar
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {dayAppts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => openNewModalForDate(dateStr)}
                      className="w-full py-1 text-[10px] font-bold text-[#6B7C83] hover:text-[#245C6B] hover:bg-[#EEF5F6] rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Novo horário
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(viewMode === "dia" || viewMode === "mes") && (
        <div className="max-w-2xl mx-auto space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-white border-2 border-[#D8E5E7] animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] py-12 text-center shadow-sm">
              <CalendarIcon className="w-10 h-10 text-[#8DA3A8] mx-auto mb-3" />
              <h3 className="font-black text-base text-[#19323A]">Nenhum atendimento encontrado</h3>
              <p className="text-xs text-[#6B7C83] mt-1 mb-4">
                {statusFilter !== "todos"
                  ? `Nenhum agendamento com status "${statusFilter}".`
                  : "Clique abaixo para agendar um novo atendimento."}
              </p>
              <Button onClick={() => openNewModalForDate()} size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Agendar Atendimento
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] shadow-sm overflow-hidden">
              {filteredAppointments.map((appt, idx) => {
                const displayName = appt.child?.full_name || "Criança"
                return (
                  <div
                    key={appt.id}
                    className={`flex items-center gap-4 px-5 py-3.5 group hover:bg-[#F7FAFA] transition-colors ${
                      idx < filteredAppointments.length - 1 ? "border-b border-[#EEF5F6]" : ""
                    }`}
                  >
                    <div className="shrink-0 text-center w-12">
                      <p className="text-[10px] font-bold text-[#6B7C83] uppercase">
                        {format(new Date(appt.start_time), "dd/MM")}
                      </p>
                      <p className="text-sm font-black text-[#19323A]">
                        {format(new Date(appt.start_time), "HH:mm")}
                      </p>
                    </div>
                    <div className="w-px h-10 bg-[#D8E5E7] shrink-0" />
                    <ChildAvatar photoUrl={appt.child?.photo_url} name={displayName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-sm text-[#19323A] truncate">{displayName}</h3>
                      <p className="text-[11px] font-semibold text-[#6B7C83] truncate">{appt.type}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge statusKey={appt.status} />
                      <button
                        type="button"
                        onClick={(e) => handleDeleteAppointment(e, appt.id)}
                        className="p-1.5 text-[#8DA3A8] hover:text-[#D96C6C] hover:bg-[#FDF0F0] rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {(appt.status === "scheduled" || appt.status === "confirmed") && (
                        <Button
                          size="sm"
                          onClick={() => handleStartAppointment(appt)}
                          className="gap-1.5 text-xs"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Iniciar
                        </Button>
                      )}
                      {appt.status === "in_progress" && (
                        <Button
                          size="sm"
                          onClick={() => handleStartAppointment(appt)}
                          className="gap-1.5 text-xs bg-[#20836F] hover:bg-[#186b5a] text-white font-black"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Continuar
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <NewAppointmentDialog
        open={showNewModal}
        defaultDate={selectedDateForNew}
        onClose={() => {
          setShowNewModal(false)
          setSelectedDateForNew(undefined)
        }}
        onSuccess={() => {
          setShowNewModal(false)
          setSelectedDateForNew(undefined)
          loadAppointments()
        }}
      />
    </div>
  )
}
