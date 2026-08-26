import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Play, Calendar, Users, Clock, AlertCircle, ChevronRight, DollarSign } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { formatTime } from "@/lib/utils"
import type { AppointmentWithChild } from "@/types/database"

interface DashboardStats {
  childrenInProgress: number
  childrenInAssessment: number
  todayAppointments: number
  pendingPayments: number
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { professional } = useAuthStore()
  const [todayAppointments, setTodayAppointments] = useState<AppointmentWithChild[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentWithChild[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    childrenInProgress: 0,
    childrenInAssessment: 0,
    todayAppointments: 0,
    pendingPayments: 0,
  })
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const todayStr = format(today, "yyyy-MM-dd")
  const greeting = today.getHours() < 12 ? "Bom dia" : today.getHours() < 18 ? "Boa tarde" : "Boa noite"
  const firstName = professional?.full_name?.split(" ")[0] || "Profissional"

  useEffect(() => {
    if (!professional) return
    loadDashboard()
  }, [professional])

  async function loadDashboard() {
    setLoading(true)
    try {
      const [todayRes, upcomingRes, childrenRes, financialRes] = await Promise.all([
        // Today's appointments
        supabase
          .from("appointments")
          .select("*, child:children(*)")
          .eq("professional_id", professional!.id)
          .gte("start_time", `${todayStr}T00:00:00`)
          .lte("start_time", `${todayStr}T23:59:59`)
          .order("start_time"),

        // Upcoming (next 7 days, not today)
        supabase
          .from("appointments")
          .select("*, child:children(*)")
          .eq("professional_id", professional!.id)
          .gt("start_time", `${todayStr}T23:59:59`)
          .lte("start_time", `${format(new Date(today.getTime() + 7 * 86400000), "yyyy-MM-dd")}T23:59:59`)
          .in("status", ["scheduled", "confirmed"])
          .order("start_time")
          .limit(5),

        // Children stats
        supabase
          .from("children")
          .select("status")
          .eq("professional_id", professional!.id),

        // Pending payments
        supabase
          .from("financial_records")
          .select("id")
          .eq("professional_id", professional!.id)
          .eq("status", "pending"),
      ])

      setTodayAppointments((todayRes.data || []) as AppointmentWithChild[])
      setUpcomingAppointments((upcomingRes.data || []) as AppointmentWithChild[])

      const children = childrenRes.data || []
      setStats({
        childrenInProgress: children.filter((c) => c.status === "in_progress").length,
        childrenInAssessment: children.filter((c) => c.status === "initial_assessment").length,
        todayAppointments: todayRes.data?.length || 0,
        pendingPayments: financialRes.data?.length || 0,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleStartSession(appointment: AppointmentWithChild) {
    // Update appointment to in_progress
    await supabase
      .from("appointments")
      .update({ status: "in_progress" })
      .eq("id", appointment.id)

    navigate(`/atendimento/${appointment.id}`)
  }

  const now = new Date()

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {format(today, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Em Acompanhamento",
            value: stats.childrenInProgress,
            icon: Users,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Em Avaliação",
            value: stats.childrenInAssessment,
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Atendimentos Hoje",
            value: stats.todayAppointments,
            icon: Calendar,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Pgtos Pendentes",
            value: stats.pendingPayments,
            icon: DollarSign,
            color: "text-red-600",
            bg: "bg-red-50",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
                <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold">{loading ? "—" : stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Today's schedule */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Agenda de Hoje</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/agenda")}>
              Ver agenda
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : todayAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">Nenhum atendimento hoje</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Aproveite para organizar suas anotações ou agendar novas sessões.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate("/agenda")}
                >
                  Abrir agenda
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map((appt) => {
                const startTime = new Date(appt.start_time)
                const isPast = startTime < now
                const isCurrent =
                  startTime <= now && new Date(appt.end_time) >= now
                const canStart =
                  appt.status === "scheduled" || appt.status === "confirmed"
                const isStartable = canStart && (isCurrent || (startTime.getTime() - now.getTime() < 15 * 60 * 1000))

                return (
                  <Card
                    key={appt.id}
                    className={`transition-shadow hover:shadow-md ${isCurrent ? "border-foreground" : ""}`}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="text-center w-14 flex-shrink-0">
                        <p className={`text-sm font-bold ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                          {format(startTime, "HH:mm")}
                        </p>
                        {isCurrent && (
                          <span className="text-xs text-emerald-600 font-medium">Agora</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{appt.child?.full_name}</p>
                        <p className="text-sm text-muted-foreground">{appt.type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge statusKey={appt.status} />
                        {isStartable && (
                          <Button
                            size="sm"
                            onClick={() => handleStartSession(appt)}
                            className="gap-1.5"
                          >
                            <Play className="w-3 h-3" />
                            Iniciar
                          </Button>
                        )}
                        {!isStartable && appt.status === "done" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/criancas/${appt.child_id}`)}
                          >
                            Ver
                          </Button>
                        )}
                        {!isStartable && canStart && !isCurrent && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/criancas/${appt.child_id}`)}
                          >
                            Ver criança
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Upcoming */}
          <div>
            <h2 className="font-semibold mb-4">Próximos Atendimentos</h2>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum agendamento nos próximos dias.</p>
            ) : (
              <div className="space-y-2">
                {upcomingAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => navigate(`/criancas/${appt.child_id}`)}
                  >
                    <div className="w-9 h-9 bg-background rounded-lg flex items-center justify-center flex-shrink-0 border border-border">
                      <span className="text-xs font-bold">
                        {format(new Date(appt.start_time), "dd")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{appt.child?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(appt.start_time), "EEE, HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick access */}
          <div>
            <h2 className="font-semibold mb-4">Acesso Rápido</h2>
            <div className="space-y-2">
              {[
                { label: "Nova criança", to: "/criancas?nova=true", icon: Users },
                { label: "Novo agendamento", to: "/agenda?novo=true", icon: Calendar },
                { label: "Financeiro", to: "/financeiro", icon: DollarSign },
              ].map((item) => (
                <button
                  key={item.to}
                  className="w-full flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors text-left"
                  onClick={() => navigate(item.to)}
                >
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
