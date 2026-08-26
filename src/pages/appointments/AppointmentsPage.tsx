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

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  })

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agenda de Atendimentos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visualize horários, gerencie sessões e sincronize com a agenda do seu celular.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => navigate("/configuracoes")} className="gap-1.5 text-xs">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            Sincronizar com Google Agenda
          </Button>
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* View & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border border-border">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>

          <span className="font-semibold text-sm sm:text-base capitalize ml-2">
            {format(currentDate, viewMode === "mes" ? "MMMM 'de' yyyy" : "dd 'de' MMMM 'de' yyyy", {
              locale: ptBR,
            })}
          </span>
        </div>

        {/* View mode buttons */}
        <div className="flex bg-background rounded-lg border border-border p-0.5">
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
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === mode.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. CELULAR VIEW (Matching the user's phone screenshot) */}
      {viewMode === "celular" && (
        <div className="max-w-md mx-auto space-y-4">
          {/* Top Date strip */}
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-4">
            <div className="text-center pb-2 border-b border-border">
              <h2 className="text-xl font-bold">
                {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
              </h2>
            </div>

            {/* 7-day mini bar */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {weekDays.map((day) => {
                const isSelected = isSameDay(day, currentDate)
                const isToday = isSameDay(day, new Date())
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setCurrentDate(day)}
                    className={`py-2 rounded-xl transition-all ${
                      isSelected
                        ? "bg-blue-600 text-white font-bold shadow-sm"
                        : isToday
                        ? "bg-muted font-bold text-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <p className="text-[10px] uppercase font-semibold">
                      {format(day, "EEE", { locale: ptBR }).substring(0, 3)}
                    </p>
                    <p className="text-sm mt-0.5">{format(day, "dd")}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* List of events on this day */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : appointments.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground space-y-2">
                <CalendarIcon className="w-8 h-8 mx-auto opacity-40" />
                <p className="font-semibold text-sm">Nenhum atendimento para este dia</p>
                <Button size="sm" variant="outline" onClick={() => setShowNewModal(true)}>
                  + Adicionar agendamento
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {appointments.map((appt) => {
                  const startTime = new Date(appt.start_time)
                  const endTime = new Date(appt.end_time)
                  return (
                    <div
                      key={appt.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between group hover:bg-muted/20 px-2 rounded-lg transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-foreground truncate">
                            {appt.child?.full_name}
                          </h3>
                          {appt.type && (
                            <span className="text-[10px] text-muted-foreground font-medium">
                              ({appt.type})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                          {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
                        </p>
                        {appt.notes && (
                          <p className="text-[11px] text-muted-foreground/80 truncate italic">
                            {appt.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => navigate(`/atendimento/${appt.id}`)}
                        >
                          <Play className="w-3 h-3" />
                          Iniciar
                        </Button>
                      </div>
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
                className={`min-h-[360px] rounded-xl border p-3 flex flex-col gap-2 ${
                  isToday
                    ? "border-foreground bg-foreground/[0.02]"
                    : "border-border bg-card"
                }`}
              >
                {/* Day Header */}
                <div className="pb-2 border-b border-border text-center">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    {format(day, "EEE", { locale: ptBR })}
                  </p>
                  <p className={`text-base font-bold ${isToday ? "text-foreground" : ""}`}>
                    {format(day, "dd")}
                  </p>
                </div>

                {/* Day Appointments List */}
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {dayAppts.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/60 text-center pt-8">
                      Horários livres
                    </p>
                  ) : (
                    dayAppts.map((appt) => (
                      <div
                        key={appt.id}
                        className="p-2.5 rounded-lg border border-border/80 bg-background hover:shadow-sm transition-all space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>{format(new Date(appt.start_time), "HH:mm")}</span>
                          <Badge statusKey={appt.status} className="text-[10px] px-1.5 py-0" />
                        </div>
                        <p className="font-semibold text-foreground truncate">
                          {appt.child?.full_name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {appt.type}
                        </p>

                        {(appt.status === "scheduled" || appt.status === "confirmed") && (
                          <Button
                            size="sm"
                            className="w-full h-7 text-[11px] mt-1 gap-1"
                            onClick={() => navigate(`/atendimento/${appt.id}`)}
                          >
                            <Play className="w-3 h-3" />
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
                <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold text-base">Nenhum atendimento no período</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Clique abaixo para agendar um novo atendimento.
                </p>
                <Button onClick={() => setShowNewModal(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Agendar Atendimento
                </Button>
              </CardContent>
            </Card>
          ) : (
            appointments.map((appt) => (
              <Card key={appt.id} className="hover:border-foreground/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center w-14 border-r pr-4">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(appt.start_time), "dd/MM")}
                      </p>
                      <p className="text-base font-bold">
                        {format(new Date(appt.start_time), "HH:mm")}
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm">{appt.child?.full_name}</h3>
                      <p className="text-xs text-muted-foreground">{appt.type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge statusKey={appt.status} />
                    {(appt.status === "scheduled" || appt.status === "confirmed") && (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/atendimento/${appt.id}`)}
                        className="gap-1.5"
                      >
                        <Play className="w-3 h-3" />
                        Iniciar Atendimento
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
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
