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
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { formatTime, formatDate } from "@/lib/utils"
import type { AppointmentWithChild } from "@/types/database"
import { NewAppointmentDialog } from "./NewAppointmentDialog"

type ViewMode = "dia" | "semana" | "mes" | "celular"

export function AppointmentsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, professional } = useAuthStore()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>("semana")
  const [appointments, setAppointments] = useState<AppointmentWithChild[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(searchParams.get("novo") === "true")

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
        // Mês
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

  function handleStartAppointment(appt: AppointmentWithChild) {
    const isEvaluation =
      appt.type === "Avaliação Inicial" ||
      appt.type?.toLowerCase().includes("avaliação")

    if (isEvaluation) {
      navigate(`/criancas/${appt.child_id}?editar=true`)
    } else {
      navigate(`/atendimento/${appt.id}`)
    }
  }

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  })

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header Controls */}
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
          <Button
            variant="outline"
            onClick={() => navigate("/configuracoes")}
            className="gap-2 text-xs border-2"
          >
            <Smartphone className="w-4 h-4 text-[#20836F]" />
            Sincronizar Celular
          </Button>
          <Button size="lg" onClick={() => setShowNewModal(true)} className="gap-2">
            <Plus className="w-5 h-5" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* View & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border-2 border-[#D8E5E7] shadow-sm">
        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrev} className="h-10 w-10">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="font-bold text-xs h-10 px-3">
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

        {/* View mode switcher */}
        <div className="flex bg-[#EEF5F6] rounded-xl p-1 border-2 border-[#D8E5E7]">
          {(
            [
              { id: "dia", label: "Dia" },
              { id: "semana", label: "Semana" },
              { id: "mes", label: "Mês" },
              { id: "celular", label: "📱 Visual Celular" },
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

      {/* 1. CELULAR VIEW */}
      {viewMode === "celular" && (
        <div className="max-w-md mx-auto space-y-4">
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-5 shadow-sm space-y-4">
            <div className="text-center pb-3 border-b-2 border-[#EEF5F6]">
              <h2 className="text-lg font-black text-[#19323A] capitalize">
                {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
              </h2>
            </div>

            {/* 7-day strip */}
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
                        ? "bg-[#EEF5F6] border-[#245C6B] font-bold text-[#19323A]"
                        : "border-transparent hover:bg-[#EEF5F6] text-[#6B7C83]"
                    }`}
                  >
                    <p className="text-[10px] uppercase font-extrabold">
                      {format(day, "EEE", { locale: ptBR }).substring(0, 3)}
                    </p>
                    <p className="text-sm font-black mt-0.5">{format(day, "dd")}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* List for today */}
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-5 shadow-sm space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-[#EEF5F6] animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : appointments.length === 0 ? (
              <div className="py-10 text-center text-[#6B7C83] space-y-3">
                <CalendarIcon className="w-10 h-10 mx-auto text-[#8DA3A8]" />
                <p className="font-bold text-sm text-[#19323A]">Nenhum atendimento neste dia</p>
                <Button size="sm" onClick={() => setShowNewModal(true)}>
                  + Novo Agendamento
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((appt) => {
                  const startTime = new Date(appt.start_time)
                  const endTime = new Date(appt.end_time)
                  return (
                    <div
                      key={appt.id}
                      className="p-4 rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] hover:border-[#245C6B] transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Child photo */}
                        <div className="w-11 h-11 rounded-2xl bg-[#245C6B] text-white font-black text-sm flex items-center justify-center shrink-0 border-2 border-[#63C7B2]/40 shadow-xs overflow-hidden">
                          {appt.child?.photo_url ? (
                            <img src={appt.child.photo_url} alt={appt.child.full_name} className="w-full h-full object-cover" />
                          ) : (
                            appt.child?.full_name ? appt.child.full_name.charAt(0).toUpperCase() : "?"
                          )}
                        </div>

                        <div className="space-y-0.5 min-w-0 flex-1">
                          <h3 className="font-black text-sm text-[#19323A] truncate">
                            {appt.child?.full_name}
                          </h3>
                          <p className="text-xs font-bold text-[#245C6B]">
                            {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
                          </p>
                          <p className="text-[11px] font-semibold text-[#6B7C83] truncate">
                            {appt.type}
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className="gap-1.5 text-xs font-bold shrink-0"
                        onClick={() => handleStartAppointment(appt)}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Iniciar
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. WEEK VIEW */}
      {viewMode === "semana" && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date())
            const dayAppts = appointments.filter((a) => isSameDay(new Date(a.start_time), day))

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[380px] rounded-2xl border-2 p-3 flex flex-col gap-2 transition-all ${
                  isToday
                    ? "border-[#245C6B] bg-[#EAF3F5]/30 ring-4 ring-[#245C6B]/10 shadow-sm"
                    : "border-[#D8E5E7] bg-white shadow-xs"
                }`}
              >
                {/* Day Header */}
                <div className="pb-2 border-b-2 border-[#EEF5F6] text-center">
                  <p className="text-[11px] font-extrabold text-[#6B7C83] uppercase">
                    {format(day, "EEE", { locale: ptBR })}
                  </p>
                  <p className={`text-base font-black ${isToday ? "text-[#245C6B]" : "text-[#19323A]"}`}>
                    {format(day, "dd")}
                  </p>
                </div>

                {/* Day Appointments List */}
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {dayAppts.length === 0 ? (
                    <p className="text-[11px] font-semibold text-[#8DA3A8] text-center pt-8 italic">
                      Livre
                    </p>
                  ) : (
                    dayAppts.map((appt) => (
                      <div
                        key={appt.id}
                        className="p-2.5 rounded-xl border-2 border-[#D8E5E7] bg-white hover:border-[#245C6B] transition-all space-y-1.5 text-xs shadow-2xs"
                      >
                        <div className="flex items-center justify-between font-black text-[#19323A]">
                          <span>{format(new Date(appt.start_time), "HH:mm")}</span>
                          <Badge statusKey={appt.status} className="text-[10px] px-1.5 py-0" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-[#245C6B] text-white flex items-center justify-center font-black text-[10px] shrink-0 overflow-hidden">
                            {appt.child?.photo_url ? (
                              <img src={appt.child.photo_url} alt={appt.child.full_name} className="w-full h-full object-cover" />
                            ) : (
                              appt.child?.full_name ? appt.child.full_name.charAt(0).toUpperCase() : "?"
                            )}
                          </div>
                          <p className="font-bold text-[#19323A] truncate flex-1">
                            {appt.child?.full_name}
                          </p>
                        </div>
                        <p className="text-[11px] font-medium text-[#6B7C83] truncate">
                          {appt.type}
                        </p>

                        {(appt.status === "scheduled" || appt.status === "confirmed") && (
                          <Button
                            size="sm"
                            className="w-full h-8 text-[11px] mt-1 gap-1"
                            onClick={() => handleStartAppointment(appt)}
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Iniciar
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 3. DAY & MONTH LIST VIEW */}
      {(viewMode === "dia" || viewMode === "mes") && (
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-white border-2 border-[#D8E5E7] animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <Card className="border-2 border-dashed border-[#D8E5E7] py-12 text-center">
              <CardContent className="space-y-3">
                <CalendarIcon className="w-12 h-12 text-[#8DA3A8] mx-auto" />
                <h3 className="font-black text-base text-[#19323A]">Nenhum atendimento no período</h3>
                <p className="text-xs text-[#6B7C83]">Clique abaixo para agendar um novo atendimento.</p>
                <Button onClick={() => setShowNewModal(true)} className="mt-2">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Agendar Atendimento
                </Button>
              </CardContent>
            </Card>
          ) : (
            appointments.map((appt) => (
              <div
                key={appt.id}
                className="p-4 rounded-2xl border-2 border-[#D8E5E7] bg-white hover:border-[#245C6B] hover:shadow-md transition-all flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-[#EEF5F6] border-2 border-[#D8E5E7] flex flex-col items-center justify-center shrink-0">
                    <p className="text-[10px] font-bold text-[#6B7C83] uppercase">
                      {format(new Date(appt.start_time), "dd/MM")}
                    </p>
                    <p className="text-base font-black text-[#19323A]">
                      {format(new Date(appt.start_time), "HH:mm")}
                    </p>
                  </div>

                  {/* Child photo */}
                  <div className="w-12 h-12 rounded-2xl bg-[#245C6B] text-white font-black text-base flex items-center justify-center shrink-0 border-2 border-[#63C7B2]/40 shadow-xs overflow-hidden">
                    {appt.child?.photo_url ? (
                      <img src={appt.child.photo_url} alt={appt.child.full_name} className="w-full h-full object-cover" />
                    ) : (
                      appt.child?.full_name ? appt.child.full_name.charAt(0).toUpperCase() : "?"
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-black text-base text-[#19323A] truncate">{appt.child?.full_name}</h3>
                    <p className="text-xs font-semibold text-[#6B7C83] truncate">{appt.type}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge statusKey={appt.status} />
                  {(appt.status === "scheduled" || appt.status === "confirmed") && (
                    <Button
                      size="sm"
                      onClick={() => handleStartAppointment(appt)}
                      className="gap-1.5"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Iniciar
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* New Appointment Modal */}
      <NewAppointmentDialog
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSuccess={() => {
          setShowNewModal(false)
          loadAppointments()
        }}
      />
    </div>
  )
}
