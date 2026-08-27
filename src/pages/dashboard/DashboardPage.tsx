import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Users,
  Clock,
  Calendar,
  DollarSign,
  ChevronRight,
  Play,
  Plus,
  Sparkles,
  ArrowUpRight,
  BookOpen,
  Search,
  X,
  Cake,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { ChildAvatar } from "@/components/ui/ChildAvatar"
import { formatCurrency, formatDate } from "@/lib/utils"

interface DashboardStats {
  childrenInProgress: number
  childrenInAssessment: number
  todayAppointments: number
  pendingPayments: number
}

interface BirthdayItem {
  child: any
  diffDays: number
  nextBirthday: Date
  turningAge: number
  isToday: boolean
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
  const [birthdays, setBirthdays] = useState<BirthdayItem[]>([])
  const [loading, setLoading] = useState(true)

  // Fast search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

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
        { data: allChildren },
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

        supabase
          .from("children")
          .select("id, full_name, photo_url, status, school, grade, birth_date")
          .eq("professional_id", profId),
      ])

      setStats({
        childrenInProgress: inProgressCount || 0,
        childrenInAssessment: inAssessmentCount || 0,
        todayAppointments: todayAppts?.length || 0,
        pendingPayments: pendingFinCount || 0,
      })

      setTodayAppointments(todayAppts || [])
      setUpcomingAppointments(upcomingAppts || [])

      // Calculate upcoming birthdays in next 30 days
      if (allChildren && allChildren.length > 0) {
        const today = new Date()
        const currentMonth = today.getMonth()
        const currentDay = today.getDate()

        const bList: BirthdayItem[] = allChildren
          .filter((c) => c.birth_date)
          .map((c) => {
            const [yStr, mStr, dStr] = c.birth_date.split("-")
            const bYear = parseInt(yStr)
            const bMonth = parseInt(mStr) - 1
            const bDay = parseInt(dStr)

            let nextBday = new Date(today.getFullYear(), bMonth, bDay)
            if (nextBday < new Date(today.getFullYear(), currentMonth, currentDay)) {
              nextBday = new Date(today.getFullYear() + 1, bMonth, bDay)
            }

            const diffTime = nextBday.getTime() - today.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            const turningAge = nextBday.getFullYear() - bYear

            return {
              child: c,
              diffDays,
              nextBirthday: nextBday,
              turningAge,
              isToday: diffDays === 0,
            }
          })
          .filter((item) => item.diffDays >= 0 && item.diffDays <= 30)
          .sort((a, b) => a.diffDays - b.diffDays)

        setBirthdays(bList)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleFastSearch(query: string) {
    setSearchQuery(query)
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    try {
      const { data } = await supabase
        .from("children")
        .select("id, full_name, photo_url, status, school, grade, birth_date")
        .eq("professional_id", profId)
        .ilike("full_name", `%${query.trim()}%`)
        .limit(5)

      setSearchResults(data || [])
    } finally {
      setSearchLoading(false)
    }
  }

  const today = new Date()
  const hour = today.getHours()
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"
  const firstName = professional?.full_name?.split(" ")[0] || "Priscila"
  const now = new Date()

  // Find the next upcoming appointment today that is not done or cancelled
  const nextApptToday = todayAppointments.find(
    (a) => a.status === "scheduled" || a.status === "confirmed" || a.status === "in_progress"
  )

  async function handleStartSession(appointment: any) {
    const isInterviewOrEval =
      appointment.type === "Entrevista Inicial" ||
      appointment.type === "Avaliação Inicial" ||
      appointment.type?.toLowerCase().includes("entrevista") ||
      appointment.type?.toLowerCase().includes("avaliação")

    if (isInterviewOrEval) {
      navigate(`/criancas/${appointment.child_id}?editar=true&appointmentId=${appointment.id}`)
    } else {
      await supabase
        .from("appointments")
        .update({ status: "in_progress" })
        .eq("id", appointment.id)

      navigate(`/atendimento/${appointment.id}`)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* 1. Compact Smart Header Banner */}
      <div className="bg-gradient-to-r from-[#19323A] via-[#1E4E5B] to-[#245C6B] text-white p-5 sm:p-6 rounded-3xl border-2 border-[#19323A] shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {greeting}, {firstName}! 👋
            </h1>
            <span className="text-xs font-semibold text-[#B8CBCF] bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10 capitalize">
              📅 {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#D8E5E7] font-semibold flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#63C7B2]" />
              <strong>{stats.todayAppointments}</strong> {stats.todayAppointments === 1 ? "atendimento hoje" : "atendimentos hoje"}
            </span>
            {stats.pendingPayments > 0 && (
              <span className="flex items-center gap-1.5 text-[#F4C95D]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <strong>{stats.pendingPayments}</strong> {stats.pendingPayments === 1 ? "cobrança pendente" : "cobranças pendentes"}
              </span>
            )}
          </p>
        </div>

        {/* Global Patient Search Bar + Action Buttons */}
        <div className="flex items-center gap-2.5 relative z-10 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8DA3A8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleFastSearch(e.target.value)}
              placeholder="Buscar criança..."
              className="w-full pl-9 pr-7 py-2 text-xs font-semibold bg-white text-[#19323A] placeholder:text-[#8DA3A8] rounded-xl border-2 border-transparent focus:border-[#63C7B2] focus:outline-none shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("")
                  setSearchResults([])
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8DA3A8] hover:text-[#19323A]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Live Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border-2 border-[#D8E5E7] shadow-xl p-2 z-50 space-y-1">
                <p className="text-[10px] font-extrabold text-[#6B7C83] uppercase px-2 py-1">
                  Pacientes encontrados:
                </p>
                {searchResults.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      navigate(`/criancas/${c.id}`)
                      setSearchQuery("")
                      setSearchResults([])
                    }}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#EEF5F6] cursor-pointer transition-colors"
                  >
                    <ChildAvatar photoUrl={c.photo_url} name={c.full_name} size="xs" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-[#19323A] truncate">{c.full_name}</p>
                      <p className="text-[10px] text-[#6B7C83] truncate">
                        {c.school ? `🏫 ${c.school}` : "Ficha cadastrada"}
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#8DA3A8]" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate("/agenda?novo=true")}
            className="gap-1.5 text-xs shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </Button>
        </div>

        {/* Subtle background glow */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#63C7B2]/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 2. Highlight: Next Appointment of the Day (if available) */}
      {nextApptToday && (
        <div className="rounded-2xl border-2 border-[#20836F]/40 bg-gradient-to-r from-[#E8F8F5] via-[#F0FAF8] to-white p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#20836F] text-white flex flex-col items-center justify-center font-black text-xs shrink-0 shadow-xs">
              <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-80">Próximo</span>
              <span className="text-sm font-black mt-0.5">{format(new Date(nextApptToday.start_time), "HH:mm")}</span>
            </div>

            <ChildAvatar
              photoUrl={nextApptToday.child?.photo_url}
              name={nextApptToday.child?.full_name}
              size="md"
            />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3
                  onClick={() => navigate(`/criancas/${nextApptToday.child_id}`)}
                  className="font-black text-base text-[#19323A] hover:text-[#20836F] hover:underline cursor-pointer truncate"
                >
                  {nextApptToday.child?.full_name || "Paciente"}
                </h3>
                <Badge statusKey={nextApptToday.status} className="text-[10px] px-2 py-0.5" />
              </div>
              <p className="text-xs font-semibold text-[#6B7C83] truncate mt-0.5">
                {nextApptToday.type === "Avaliação Inicial" ? "Entrevista Inicial" : nextApptToday.type}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              size="sm"
              onClick={() => handleStartSession(nextApptToday)}
              className="gap-1.5 font-black text-xs bg-[#20836F] hover:bg-[#186b5a] text-white w-full sm:w-auto"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Iniciar Atendimento
            </Button>
          </div>
        </div>
      )}

      {/* 3. Bold Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {[
          {
            label: "Em Acompanhamento",
            value: stats.childrenInProgress,
            icon: Users,
            color: "text-[#20836F]",
            bg: "bg-[#E8F8F5] border-2 border-[#63C7B2]/40",
            sub: "Pacientes ativos",
            onClick: () => navigate("/criancas"),
          },
          {
            label: "Em Entrevista",
            value: stats.childrenInAssessment,
            icon: Clock,
            color: "text-[#B8871E]",
            bg: "bg-[#FEF8EC] border-2 border-[#F4C95D]/50",
            sub: "Anamnese / 1ª consulta",
            onClick: () => navigate("/criancas"),
          },
          {
            label: "Atendimentos Hoje",
            value: stats.todayAppointments,
            icon: Calendar,
            color: "text-[#245C6B]",
            bg: "bg-[#EAF3F5] border-2 border-[#245C6B]/30",
            sub: "Sessões do dia",
            onClick: () => navigate("/agenda"),
          },
          {
            label: "Cobranças Pendentes",
            value: stats.pendingPayments,
            icon: DollarSign,
            color: "text-[#D96C6C]",
            bg: "bg-[#FDF0F0] border-2 border-[#D96C6C]/40",
            sub: "Financeiro",
            onClick: () => navigate("/financeiro"),
          },
        ].map((stat) => (
          <div
            key={stat.label}
            onClick={stat.onClick}
            className="rounded-2xl border-2 border-[#D8E5E7] bg-white p-4 sm:p-5 shadow-2xs hover:border-[#245C6B] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center shadow-xs`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <span className="text-[10px] font-extrabold uppercase text-[#6B7C83] bg-[#EEF5F6] px-2 py-0.5 rounded-lg group-hover:bg-[#EAF3F5] transition-colors">
                {stat.sub}
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-[#19323A] tracking-tight">
                {loading ? "—" : stat.value}
              </p>
              <p className="text-[11px] font-bold text-[#6B7C83] mt-0.5 uppercase tracking-wide truncate">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Main Dashboard Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Today's Schedule */}
        <div className="lg:col-span-2 space-y-3.5">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#19323A] tracking-tight">
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
            <div className="space-y-2.5">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-white border-2 border-[#D8E5E7] animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : todayAppointments.length === 0 ? (
            <Card className="border-2 border-dashed border-[#D8E5E7] bg-white text-center py-10">
              <CardContent className="space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-[#EEF5F6] border-2 border-[#D8E5E7] flex items-center justify-center mx-auto text-[#245C6B]">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-[#19323A]">
                  Nenhum atendimento para hoje
                </h3>
                <p className="text-xs text-[#6B7C83] max-w-sm mx-auto">
                  Aproveite para organizar anotações, preencher fichas de anamnese ou agendar novos horários.
                </p>
                <Button
                  size="sm"
                  onClick={() => navigate("/agenda?novo=true")}
                  className="mt-1"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Agendar Atendimento
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {todayAppointments.map((appt) => {
                const startTime = new Date(appt.start_time)
                const isCurrent = startTime <= now && new Date(appt.end_time) >= now
                const canStart = appt.status === "scheduled" || appt.status === "confirmed"
                const rawName = appt.child?.full_name || "Criança"
                const displayName = rawName.startsWith("Avaliação")
                  ? rawName.replace(/^Avaliação/i, "Entrevista")
                  : rawName
                const displayType =
                  appt.type === "Avaliação Inicial" ? "Entrevista Inicial" : appt.type

                return (
                  <div
                    key={appt.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border-2 bg-white transition-all shadow-2xs hover:shadow-md flex items-center justify-between gap-3 ${
                      isCurrent
                        ? "border-[#245C6B] bg-[#EAF3F5]/30 ring-4 ring-[#245C6B]/10"
                        : "border-[#D8E5E7] hover:border-[#245C6B]"
                    }`}
                  >
                    {/* Time Box */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-[#EEF5F6] border-2 border-[#D8E5E7] flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs font-black text-[#19323A] leading-none">
                          {format(startTime, "HH:mm")}
                        </span>
                        <span className="text-[9px] font-bold text-[#6B7C83] uppercase mt-0.5">
                          {format(new Date(appt.end_time), "HH:mm")}
                        </span>
                      </div>

                      {/* Patient Avatar */}
                      <div
                        onClick={() => navigate(`/criancas/${appt.child_id}`)}
                        className="cursor-pointer hover:scale-105 transition-transform"
                      >
                        <ChildAvatar
                          photoUrl={appt.child?.photo_url}
                          name={displayName}
                          size="sm"
                        />
                      </div>

                      {/* Patient info */}
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3
                            onClick={() => navigate(`/criancas/${appt.child_id}`)}
                            className="font-black text-sm text-[#19323A] hover:text-[#245C6B] hover:underline cursor-pointer truncate"
                          >
                            {displayName}
                          </h3>
                          {isCurrent && (
                            <span className="bg-[#63C7B2] text-[#14282F] text-[9px] font-black uppercase px-1.5 py-0.2 rounded animate-pulse">
                              Agora
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-semibold text-[#6B7C83] truncate">
                          {displayType}
                        </p>
                      </div>
                    </div>

                    {/* Actions & Badge */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge statusKey={appt.status} className="text-[10px] px-2 py-0.5" />

                      {canStart && (
                        <Button
                          size="sm"
                          onClick={() => handleStartSession(appt)}
                          className="gap-1 text-xs"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Iniciar</span>
                        </Button>
                      )}

                      {appt.status === "done" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/criancas/${appt.child_id}`)}
                          className="text-xs"
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

        {/* Right Column (1 Col): Birthdays, Alerts & Shortcuts */}
        <div className="space-y-5">
          {/* 🎂 Upcoming Birthdays Widget */}
          <div className="rounded-2xl border-2 border-[#D8E5E7] bg-white p-4 sm:p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b-2 border-[#EEF5F6] pb-2.5">
              <div className="flex items-center gap-2">
                <Cake className="w-4 h-4 text-[#B8871E]" />
                <h3 className="font-black text-xs uppercase tracking-wider text-[#19323A]">
                  Próximos Aniversários
                </h3>
              </div>
              <span className="text-[10px] font-bold text-[#6B7C83]">Próx. 30 dias</span>
            </div>

            {birthdays.length === 0 ? (
              <p className="text-xs text-[#6B7C83] italic py-1">
                Nenhum aniversariante nos próximos 30 dias.
              </p>
            ) : (
              <div className="space-y-2">
                {birthdays.slice(0, 4).map((b) => (
                  <div
                    key={b.child.id}
                    onClick={() => navigate(`/criancas/${b.child.id}`)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl transition-all cursor-pointer ${
                      b.isToday
                        ? "bg-[#FEF8EC] border border-[#F4C95D]/60 shadow-xs"
                        : "hover:bg-[#EEF5F6]"
                    }`}
                  >
                    <ChildAvatar
                      photoUrl={b.child.photo_url}
                      name={b.child.full_name}
                      size="xs"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#19323A] truncate flex items-center gap-1.5">
                        {b.child.full_name}
                        {b.isToday && (
                          <span className="text-[9px] font-black uppercase bg-[#F4C95D] text-[#5A3E00] px-1.5 py-0.2 rounded-full">
                            Hoje! 🎉
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] font-semibold text-[#6B7C83]">
                        {format(b.nextBirthday, "dd 'de' MMMM", { locale: ptBR })} ·{" "}
                        <strong className="text-[#20836F]">vai fazer {b.turningAge} anos</strong>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ⚠️ Attention Widget (if there are alerts) */}
          {stats.pendingPayments > 0 && (
            <div className="rounded-2xl border-2 border-[#D96C6C]/40 bg-[#FDF0F0] p-4 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-[#D96C6C]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <h3 className="font-black text-xs uppercase tracking-wider">
                  Requer Atenção
                </h3>
              </div>
              <p className="text-xs text-[#5C2B2B] font-medium leading-relaxed">
                Você possui <strong>{stats.pendingPayments} cobranças pendentes</strong> no módulo financeiro.
              </p>
              <button
                onClick={() => navigate("/financeiro")}
                className="text-xs font-black text-[#D96C6C] hover:underline flex items-center gap-1 pt-1"
              >
                Ver cobranças pendentes
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Upcoming Schedule in Next Days */}
          <div className="rounded-2xl border-2 border-[#D8E5E7] bg-white p-4 sm:p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b-2 border-[#EEF5F6] pb-2.5">
              <h3 className="font-black text-xs uppercase tracking-wider text-[#19323A]">
                Próximos Dias
              </h3>
              <Calendar className="w-4 h-4 text-[#6B7C83]" />
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-10 bg-[#EEF5F6] animate-pulse rounded-xl" />
                ))}
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <p className="text-xs text-[#6B7C83] italic py-1">
                Nenhum agendamento futuro cadastrado.
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    onClick={() => navigate(`/criancas/${appt.child_id}`)}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#EEF5F6] cursor-pointer transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#EEF5F6] text-[#19323A] border border-[#D8E5E7] flex flex-col items-center justify-center font-black text-[11px] shrink-0">
                      <span>{format(new Date(appt.start_time), "dd")}</span>
                    </div>

                    <ChildAvatar
                      photoUrl={appt.child?.photo_url}
                      name={appt.child?.full_name}
                      size="xs"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#19323A] group-hover:text-[#245C6B] truncate">
                        {appt.child?.full_name}
                      </p>
                      <p className="text-[10px] font-semibold text-[#6B7C83]">
                        {format(new Date(appt.start_time), "EEE, HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#8DA3A8] group-hover:text-[#245C6B] transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="rounded-2xl border-2 border-[#D8E5E7] bg-white p-4 sm:p-5 space-y-2.5 shadow-2xs">
            <h3 className="font-black text-xs uppercase tracking-wider text-[#19323A] border-b-2 border-[#EEF5F6] pb-2">
              Acesso Rápido
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Nova Criança", to: "/criancas?nova=true", icon: Users },
                { label: "Novo Agendamento", to: "/agenda?novo=true", icon: Calendar },
                { label: "Financeiro", to: "/financeiro", icon: DollarSign },
                { label: "Emitir Relatório", to: "/relatorios", icon: BookOpen },
              ].map((item) => (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] hover:bg-white hover:border-[#245C6B] font-bold text-xs text-[#19323A] transition-all shadow-2xs active:scale-[0.98]"
                >
                  <item.icon className="w-3.5 h-3.5 text-[#245C6B]" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

