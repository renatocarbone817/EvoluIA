import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Users,
  Clock,
  Calendar,
  DollarSign,
  ChevronRight,
  Play,
  UserCheck,
  Plus,
  Sparkles,
  ArrowUpRight,
  BookOpen,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { ChildAvatar } from "@/components/ui/ChildAvatar"
import { formatCurrency } from "@/lib/utils"
import type { Appointment, Child } from "@/types/database"

interface DashboardStats {
  childrenInProgress: number
  childrenInAssessment: number
  todayAppointments: number
  pendingPayments: number
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, professional } = useAuthStore()

  const [stats, setStats] = useState<DashboardStats>({
    childrenInProgress: 0,
    childrenInAssessment: 0,
    todayAppointments: 0,
    pendingPayments: 0,
  })
  const [todayAppointments, setTodayAppointments] = useState<any[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const profId = professional?.id || user?.id

  useEffect(() => {
    if (profId) loadDashboardData()
  }, [profId])

  async function loadDashboardData() {
    if (!profId) return
    setLoading(true)
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd")

      const [
        { count: inProgressCount },
        { count: inAssessmentCount },
        { data: todayAppts },
        { data: upcomingAppts },
        { count: pendingFinCount },
      ] = await Promise.all([
        supabase
          .from("children")
          .select("*", { count: "exact", head: true })
          .eq("professional_id", profId)
          .eq("status", "in_progress"),

        supabase
          .from("children")
          .select("*", { count: "exact", head: true })
          .eq("professional_id", profId)
          .eq("status", "initial_assessment"),

        supabase
          .from("appointments")
          .select("*, child:children(*)")
          .eq("professional_id", profId)
          .gte("start_time", `${todayStr}T00:00:00`)
          .lte("start_time", `${todayStr}T23:59:59`)
          .order("start_time", { ascending: true }),

        supabase
          .from("appointments")
          .select("*, child:children(*)")
          .eq("professional_id", profId)
          .gt("start_time", `${todayStr}T23:59:59`)
          .neq("status", "cancelled")
          .order("start_time", { ascending: true })
          .limit(4),

        supabase
          .from("financial_records")
          .select("*", { count: "exact", head: true })
          .eq("professional_id", profId)
          .eq("status", "pending"),
      ])

      setStats({
        childrenInProgress: inProgressCount || 0,
        childrenInAssessment: inAssessmentCount || 0,
        todayAppointments: todayAppts?.length || 0,
        pendingPayments: pendingFinCount || 0,
      })

      setTodayAppointments(todayAppts || [])
      setUpcomingAppointments(upcomingAppts || [])
    } finally {
      setLoading(false)
    }
  }

  const today = new Date()
  const hour = today.getHours()
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"

  const firstName = professional?.full_name?.split(" ")[0] || "Priscila"

  async function handleStartSession(appointment: any) {
    const isEvaluation =
      appointment.type === "Avaliação Inicial" ||
      appointment.type?.toLowerCase().includes("avaliação")

    if (isEvaluation) {
      navigate(`/criancas/${appointment.child_id}?editar=true`)
    } else {
      await supabase
        .from("appointments")
        .update({ status: "in_progress" })
        .eq("id", appointment.id)

      navigate(`/atendimento/${appointment.id}`)
    }
  }

  const now = new Date()

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* 1. Top Hero Greeting Banner */}
      <div className="bg-gradient-to-r from-[#19323A] to-[#245C6B] text-white p-6 md:p-8 rounded-3xl border-2 border-[#19323A] shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#63C7B2]/20 border border-[#63C7B2]/40 text-[#63C7B2] text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Painel do Consultório
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-sm text-[#B8CBCF] font-medium max-w-xl">
            Hoje é{" "}
            <strong className="text-white capitalize">
              {format(today, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </strong>
            . Veja seu resumo e próximos atendimentos:
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 flex-wrap">
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate("/agenda?novo=true")}
            className="gap-2 shadow-[0_4px_0_0_#388E7D]"
          >
            <Plus className="w-5 h-5" />
            Novo Agendamento
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/criancas?nova=true")}
            className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white shadow-none font-bold"
          >
            <Users className="w-4 h-4 mr-1.5" />
            Nova Criança
          </Button>
        </div>

        {/* Subtle background glow */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-[#63C7B2]/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. Bold Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {[
          {
            label: "Em Acompanhamento",
            value: stats.childrenInProgress,
            icon: Users,
            color: "text-[#20836F]",
            bg: "bg-[#E8F8F5] border-2 border-[#63C7B2]/40",
            sub: "Pacientes ativos",
          },
          {
            label: "Em Avaliação",
            value: stats.childrenInAssessment,
            icon: Clock,
            color: "text-[#B8871E]",
            bg: "bg-[#FEF8EC] border-2 border-[#F4C95D]/50",
            sub: "Anamnese inicial",
          },
          {
            label: "Atendimentos Hoje",
            value: stats.todayAppointments,
            icon: Calendar,
            color: "text-[#245C6B]",
            bg: "bg-[#EAF3F5] border-2 border-[#245C6B]/30",
            sub: "Sessões agendadas",
          },
          {
            label: "Pgtos Pendentes",
            value: stats.pendingPayments,
            icon: DollarSign,
            color: "text-[#D96C6C]",
            bg: "bg-[#FDF0F0] border-2 border-[#D96C6C]/40",
            sub: "Cobranças do mês",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border-2 border-[#D8E5E7] bg-white p-5 shadow-[0_4px_12px_rgba(25,50,58,0.03)] hover:border-[#245C6B] hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center shadow-xs`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <span className="text-[11px] font-extrabold uppercase text-[#6B7C83] bg-[#EEF5F6] px-2.5 py-1 rounded-lg">
                {stat.sub}
              </span>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-black text-[#19323A] tracking-tight">
                {loading ? "—" : stat.value}
              </p>
              <p className="text-xs font-bold text-[#6B7C83] mt-1 uppercase tracking-wide">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Dashboard Grid */}
      <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
        {/* Left Column (2 Cols): Today's Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h2 className="text-xl font-black text-[#19323A] tracking-tight">
                Agenda de Hoje
              </h2>
              <p className="text-xs font-medium text-[#6B7C83]">
                Atendimentos previstos para o dia de hoje
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/agenda")}
              className="gap-1 text-xs"
            >
              Ver agenda completa
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-white border-2 border-[#D8E5E7] animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : todayAppointments.length === 0 ? (
            <Card className="border-2 border-dashed border-[#D8E5E7] bg-white text-center py-12">
              <CardContent className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#EEF5F6] border-2 border-[#D8E5E7] flex items-center justify-center mx-auto text-[#245C6B]">
                  <Calendar className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-base text-[#19323A]">
                  Nenhum atendimento para hoje
                </h3>
                <p className="text-xs text-[#6B7C83] max-w-sm mx-auto">
                  Aproveite para organizar anotações, preencher fichas de anamnese ou agendar novos horários.
                </p>
                <Button
                  size="sm"
                  onClick={() => navigate("/agenda?novo=true")}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Agendar Atendimento
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map((appt) => {
                const startTime = new Date(appt.start_time)
                const isCurrent =
                  startTime <= now && new Date(appt.end_time) >= now
                const canStart =
                  appt.status === "scheduled" || appt.status === "confirmed"

                return (
                  <div
                    key={appt.id}
                    className={`p-4 rounded-2xl border-2 bg-white transition-all shadow-xs hover:shadow-md flex items-center justify-between gap-4 ${
                      isCurrent
                        ? "border-[#245C6B] bg-[#EAF3F5]/30 ring-4 ring-[#245C6B]/10"
                        : "border-[#D8E5E7] hover:border-[#245C6B]"
                    }`}
                  >
                    {/* Time Box */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-[#EEF5F6] border-2 border-[#D8E5E7] flex flex-col items-center justify-center shrink-0">
                        <span className="text-sm font-black text-[#19323A] leading-none">
                          {format(startTime, "HH:mm")}
                        </span>
                        <span className="text-[10px] font-bold text-[#6B7C83] uppercase mt-1">
                          {format(new Date(appt.end_time), "HH:mm")}
                        </span>
                      </div>

                      {/* Patient Avatar Photo / Cute Child Avatar */}
                      <div
                        onClick={() => navigate(`/criancas/${appt.child_id}`)}
                        className="cursor-pointer hover:scale-105 transition-transform"
                      >
                        <ChildAvatar
                          photoUrl={appt.child?.photo_url}
                          name={appt.child?.full_name}
                          size="md"
                        />
                      </div>

                      {/* Patient info */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3
                            onClick={() => navigate(`/criancas/${appt.child_id}`)}
                            className="font-black text-base text-[#19323A] hover:text-[#245C6B] hover:underline cursor-pointer truncate"
                          >
                            {appt.child?.full_name}
                          </h3>
                          {isCurrent && (
                            <span className="bg-[#63C7B2] text-[#14282F] text-[10px] font-black uppercase px-2 py-0.5 rounded-md animate-pulse">
                              Agora
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-[#6B7C83] truncate">
                          {appt.type}
                        </p>
                      </div>
                    </div>

                    {/* Actions & Badge */}
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge statusKey={appt.status} />

                      {canStart && (
                        <Button
                          size="sm"
                          onClick={() => handleStartSession(appt)}
                          className="gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Iniciar</span>
                        </Button>
                      )}

                      {appt.status === "done" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/criancas/${appt.child_id}`)}
                        >
                          Ficha
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Next Appointments & Fast Shortcuts */}
        <div className="space-y-6">
          {/* Upcoming Schedule */}
          <div className="rounded-2xl border-2 border-[#D8E5E7] bg-white p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b-2 border-[#EEF5F6] pb-3">
              <h3 className="font-black text-sm uppercase tracking-wider text-[#19323A]">
                Próximos Dias
              </h3>
              <Calendar className="w-4 h-4 text-[#6B7C83]" />
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-[#EEF5F6] animate-pulse rounded-xl" />
                ))}
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <p className="text-xs text-[#6B7C83] italic py-2">
                Nenhum agendamento futuro cadastrado.
              </p>
            ) : (
              <div className="space-y-2.5">
                {upcomingAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    onClick={() => navigate(`/criancas/${appt.child_id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl border-2 border-transparent hover:border-[#245C6B]/40 hover:bg-[#EEF5F6] cursor-pointer transition-all group"
                  >
                    {/* Day Badge */}
                    <div className="w-9 h-9 rounded-xl bg-[#EEF5F6] text-[#19323A] border border-[#D8E5E7] flex flex-col items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                      <span>{format(new Date(appt.start_time), "dd")}</span>
                    </div>

                    {/* Child Photo / Cute Avatar */}
                    <ChildAvatar
                      photoUrl={appt.child?.photo_url}
                      name={appt.child?.full_name}
                      size="sm"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#19323A] group-hover:text-[#245C6B] truncate">
                        {appt.child?.full_name}
                      </p>
                      <p className="text-[11px] font-semibold text-[#6B7C83]">
                        {format(new Date(appt.start_time), "EEE, HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8DA3A8] group-hover:text-[#245C6B] transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="rounded-2xl border-2 border-[#D8E5E7] bg-white p-5 space-y-3 shadow-sm">
            <h3 className="font-black text-sm uppercase tracking-wider text-[#19323A] border-b-2 border-[#EEF5F6] pb-3">
              Acesso Rápido
            </h3>
            <div className="space-y-2">
              {[
                { label: "Nova Criança", to: "/criancas?nova=true", icon: Users },
                { label: "Novo Agendamento", to: "/agenda?novo=true", icon: Calendar },
                { label: "Painel Financeiro", to: "/financeiro", icon: DollarSign },
                { label: "Emitir Relatório", to: "/relatorios", icon: BookOpen },
              ].map((item) => (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-[#D8E5E7] bg-white hover:border-[#245C6B] hover:bg-[#EEF5F6] font-bold text-xs text-[#19323A] transition-all active:scale-[0.98] shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4 text-[#245C6B]" />
                    <span>{item.label}</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#8DA3A8]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
