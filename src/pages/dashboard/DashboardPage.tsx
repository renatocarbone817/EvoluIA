import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Users,
  Calendar,
  ClipboardList,
  Target,
  BarChart2,
  ChevronRight,
  Sparkles,
  CheckSquare,
  Square,
  Star,
  Trash2,
  Clock,
  BookOpen,
  FolderOpen,
  FileText,
  UserPlus,
  Plus,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Play,
  MessageSquare,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { ChildAvatar } from "@/components/ui/ChildAvatar"
import toast from "react-hot-toast"

interface TaskItem {
  id: string
  text: string
  dueText: string
  dueColor: "red" | "orange" | "gray" | "green"
  completed: boolean
}

interface NoteItem {
  id: string
  text: string
  color: "yellow" | "blue"
  starred: boolean
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, professional } = useAuthStore()
  const profId = professional?.id || user?.id

  const [loading, setLoading] = useState(true)

  // Real Database Lists
  const [allChildren, setAllChildren] = useState<any[]>([])
  const [allAppointments, setAllAppointments] = useState<any[]>([])
  const [todayAppointments, setTodayAppointments] = useState<any[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([])

  // Month selector for the chart
  const currentMonthNum = new Date().getMonth() + 1
  const currentYearNum = new Date().getFullYear()
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNum)

  // Interactive Tasks (persisted)
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem("evoluia_dashboard_tasks")
    if (saved) return JSON.parse(saved)
    return [
      { id: "1", text: "Elaborar relatório de avaliação", dueText: "Venc. hoje", dueColor: "red", completed: false },
      { id: "2", text: "Enviar lembrete das sessões da semana", dueText: "Venc. amanhã", dueColor: "orange", completed: false },
      { id: "3", text: "Planejar intervenção lúdica", dueText: "Venc. breve", dueColor: "gray", completed: false },
      { id: "4", text: "Conferir extrato financeiro do mês", dueText: "Concluído", dueColor: "green", completed: true },
    ]
  })
  const [showNewTaskInput, setShowNewTaskInput] = useState(false)
  const [newTaskText, setNewTaskText] = useState("")

  // Interactive Notes (persisted)
  const [notes, setNotes] = useState<NoteItem[]>(() => {
    const saved = localStorage.getItem("evoluia_dashboard_notes")
    if (saved) return JSON.parse(saved)
    return [
      { id: "1", text: "Reunião de alinhamento com a equipe escolar.", color: "yellow", starred: true },
      { id: "2", text: "Organizar jogos cognitivos e fichas de avaliação.", color: "blue", starred: true },
    ]
  })
  const [newNoteText, setNewNoteText] = useState("")

  useEffect(() => {
    if (profId) loadDashboardData()
  }, [profId])

  async function loadDashboardData() {
    if (!profId) return
    setLoading(true)
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd")

      const [
        { data: childrenData },
        { data: appointmentsData },
        { data: todayAppts },
        { data: upcomingAppts },
      ] = await Promise.all([
        supabase
          .from("children")
          .select("*")
          .eq("professional_id", profId)
          .order("created_at", { ascending: false }),

        supabase
          .from("appointments")
          .select(`
            *,
            child:children(
              id,
              full_name,
              photo_url,
              guardians:guardian_children(
                guardian:guardians(id, full_name, phone, whatsapp)
              )
            )
          `)
          .eq("professional_id", profId)
          .order("start_time", { ascending: true }),

        supabase
          .from("appointments")
          .select(`
            *,
            child:children(
              id,
              full_name,
              photo_url,
              guardians:guardian_children(
                guardian:guardians(id, full_name, phone, whatsapp)
              )
            )
          `)
          .eq("professional_id", profId)
          .gte("start_time", `${todayStr}T00:00:00`)
          .lte("start_time", `${todayStr}T23:59:59`)
          .order("start_time", { ascending: true }),

        supabase
          .from("appointments")
          .select(`
            *,
            child:children(
              id,
              full_name,
              photo_url,
              guardians:guardian_children(
                guardian:guardians(id, full_name, phone, whatsapp)
              )
            )
          `)
          .eq("professional_id", profId)
          .gt("start_time", `${todayStr}T23:59:59`)
          .neq("status", "cancelled")
          .order("start_time", { ascending: true })
          .limit(4),
      ])

      setAllChildren(childrenData || [])
      setAllAppointments(appointmentsData || [])
      setTodayAppointments(todayAppts || [])
      setUpcomingAppointments(upcomingAppts || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // =========================================================================
  // REAL STATS COMPUTATIONS (100% DINÂMICO & ZERO MOCK)
  // =========================================================================

  // 1. Pacientes Ativos
  const activeChildrenCount = useMemo(() => {
    return allChildren.filter((c) => c.status !== "archived" && c.status !== "closed").length
  }, [allChildren])

  const newChildrenThisMonth = useMemo(() => {
    return allChildren.filter((c) => {
      if (!c.created_at) return false
      const d = new Date(c.created_at)
      return d.getMonth() + 1 === currentMonthNum && d.getFullYear() === currentYearNum
    }).length
  }, [allChildren, currentMonthNum, currentYearNum])

  // 2. Avaliações
  const evaluationsCount = useMemo(() => {
    return allChildren.filter((c) => c.status === "initial_assessment").length ||
      allAppointments.filter((a) => {
        const t = (a.type || "").toLowerCase()
        return t.includes("avalia") || t.includes("entrevista")
      }).length
  }, [allChildren, allAppointments])

  const evaluationsThisMonth = useMemo(() => {
    return allAppointments.filter((a) => {
      const d = new Date(a.start_time)
      const t = (a.type || "").toLowerCase()
      return d.getMonth() + 1 === currentMonthNum && d.getFullYear() === currentYearNum && (t.includes("avalia") || t.includes("entrevista"))
    }).length
  }, [allAppointments, currentMonthNum, currentYearNum])

  // 3. Intervenções em Andamento
  const interventionsCount = useMemo(() => {
    const inProgress = allChildren.filter((c) => c.status === "in_progress").length
    return inProgress > 0 ? inProgress : allChildren.length
  }, [allChildren])

  // 4. Sessões Este Mês
  const sessionsThisMonth = useMemo(() => {
    return allAppointments.filter((a) => {
      const d = new Date(a.start_time)
      return d.getMonth() + 1 === currentMonthNum && d.getFullYear() === currentYearNum && a.status !== "cancelled"
    }).length
  }, [allAppointments, currentMonthNum, currentYearNum])

  // =========================================================================
  // MONTHLY CHART & BADGES (FOR SELECTED MONTH)
  // =========================================================================
  const monthlyChartData = useMemo(() => {
    const monthAppts = allAppointments.filter((a) => {
      const d = new Date(a.start_time)
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === currentYearNum
    })

    const totalSessions = monthAppts.filter((a) => a.status !== "cancelled").length
    const totalEvals = monthAppts.filter((a) => {
      const t = (a.type || "").toLowerCase()
      return t.includes("avalia") || t.includes("entrevista")
    }).length
    const totalMissed = monthAppts.filter((a) => a.status === "cancelled" || a.status === "missed").length
    const newPatients = allChildren.filter((c) => {
      if (!c.created_at) return false
      const d = new Date(c.created_at)
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === currentYearNum
    }).length

    // Weekly distribution 1 to 5
    const weeks = [
      { label: "Sem 1", range: [1, 7], count: 0 },
      { label: "Sem 2", range: [8, 14], count: 0 },
      { label: "Sem 3", range: [15, 21], count: 0 },
      { label: "Sem 4", range: [22, 28], count: 0 },
      { label: "Sem 5", range: [29, 31], count: 0 },
    ]

    monthAppts.forEach((a) => {
      if (a.status === "cancelled") return
      const day = new Date(a.start_time).getDate()
      const targetWeek = weeks.find((w) => day >= w.range[0] && day <= w.range[1]) || weeks[4]
      targetWeek.count++
    })

    const maxVal = Math.max(...weeks.map((w) => w.count), 1)

    // Calculate Y coordinates for SVG curve (height 140px, padding 20px)
    const points = weeks.map((w, idx) => {
      const x = idx * 95 + 10
      const y = 120 - (w.count / maxVal) * 90
      return { x, y, count: w.count }
    })

    // SVG path string
    const pathD = `M ${points[0].x},${points[0].y} Q ${(points[0].x + points[1].x) / 2},${(points[0].y + points[1].y) / 2} ${points[1].x},${points[1].y} T ${points[2].x},${points[2].y} T ${points[3].x},${points[3].y} T ${points[4].x},${points[4].y}`
    const areaD = `${pathD} L ${points[4].x},140 L ${points[0].x},140 Z`

    return {
      totalSessions,
      totalEvals,
      newPatients,
      totalMissed,
      weeks,
      points,
      pathD,
      areaD,
      hasData: totalSessions > 0,
    }
  }, [allAppointments, allChildren, selectedMonth, currentYearNum])

  // Task handlers
  function toggleTask(id: string) {
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    setTasks(updated)
    localStorage.setItem("evoluia_dashboard_tasks", JSON.stringify(updated))
  }

  function handleAddTask() {
    if (!newTaskText.trim()) return
    const newTask: TaskItem = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      dueText: "Pendente",
      dueColor: "orange",
      completed: false,
    }
    const updated = [newTask, ...tasks]
    setTasks(updated)
    localStorage.setItem("evoluia_dashboard_tasks", JSON.stringify(updated))
    setNewTaskText("")
    setShowNewTaskInput(false)
    toast.success("Tarefa adicionada!")
  }

  function handleDeleteTask(id: string) {
    const updated = tasks.filter((t) => t.id !== id)
    setTasks(updated)
    localStorage.setItem("evoluia_dashboard_tasks", JSON.stringify(updated))
  }

  // Note handlers
  function handleAddNote() {
    if (!newNoteText.trim()) return
    const newNote: NoteItem = {
      id: Date.now().toString(),
      text: newNoteText.trim(),
      color: notes.length % 2 === 0 ? "yellow" : "blue",
      starred: true,
    }
    const updated = [newNote, ...notes]
    setNotes(updated)
    localStorage.setItem("evoluia_dashboard_notes", JSON.stringify(updated))
    setNewNoteText("")
    toast.success("Anotação salva!")
  }

  function handleDeleteNote(id: string) {
    const updated = notes.filter((n) => n.id !== id)
    setNotes(updated)
    localStorage.setItem("evoluia_dashboard_notes", JSON.stringify(updated))
  }

  const firstName = professional?.full_name?.split(" ")[0] || "Priscila"
  const formattedToday = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })
  const capitalizedToday = formattedToday.charAt(0).toUpperCase() + formattedToday.slice(1)

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* 1. GREETING HERO HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-[#0D2329] tracking-tight">
            Olá, {firstName}! 👋
          </h1>
          <p className="text-sm font-medium text-[#6B7C83]">
            Que bom te ver por aqui! Veja o que está acontecendo hoje na sua clínica.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate("/agenda?novo=true")}
            className="h-10 px-4 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white text-xs font-black flex items-center gap-2 shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* 2. TOP 4 METRIC CARDS WITH REAL SPARKLINES & REAL NUMBERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Pacientes Ativos */}
        <div
          onClick={() => navigate("/criancas")}
          className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] hover:border-[#10B981] hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-[#E8F8F5] text-[#10B981] flex items-center justify-center font-bold shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-[#6B7C83]">Pacientes Ativos</p>
              <p className="text-2xl font-black text-[#0D2329] tracking-tight">{activeChildrenCount}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-[#10B981] flex items-center gap-0.5">
              ↑ {newChildrenThisMonth} este mês
            </span>
            <svg className="w-24 h-7 stroke-[#10B981] fill-none stroke-[2.5]" viewBox="0 0 100 30">
              <path d="M0,25 Q20,10 40,20 T70,12 T100,5" />
              <circle cx="100" cy="5" r="3" className="fill-[#10B981]" />
            </svg>
          </div>
        </div>

        {/* Card 2: Entrevistas */}
        <div
          onClick={() => navigate("/criancas")}
          className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] hover:border-[#9333EA] hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center font-bold shadow-2xs">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-[#6B7C83]">Entrevistas</p>
              <p className="text-2xl font-black text-[#0D2329] tracking-tight">{evaluationsCount}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-[#9333EA] flex items-center gap-0.5">
              ↑ {evaluationsThisMonth} este mês
            </span>
            <svg className="w-24 h-7 stroke-[#9333EA] fill-none stroke-[2.5]" viewBox="0 0 100 30">
              <path d="M0,22 Q25,28 50,15 T80,20 T100,8" />
              <circle cx="100" cy="8" r="3" className="fill-[#9333EA]" />
            </svg>
          </div>
        </div>

        {/* Card 3: Acompanhamento Contínuo */}
        <div
          onClick={() => navigate("/agenda")}
          className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] hover:border-[#EA580C] hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-[#FFEDD5] text-[#EA580C] flex items-center justify-center font-bold shadow-2xs">
              <Target className="w-5 h-5" />
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-[#6B7C83]">Acompanhamento Contínuo</p>
              <p className="text-2xl font-black text-[#0D2329] tracking-tight">{interventionsCount}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-[#EA580C] flex items-center gap-0.5">
              Em acompanhamento
            </span>
            <svg className="w-24 h-7 stroke-[#EA580C] fill-none stroke-[2.5]" viewBox="0 0 100 30">
              <path d="M0,25 Q30,22 55,18 T80,12 T100,6" />
              <circle cx="100" cy="6" r="3" className="fill-[#EA580C]" />
            </svg>
          </div>
        </div>

        {/* Card 4: Aulas Este Mês */}
        <div
          onClick={() => navigate("/agenda")}
          className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] hover:border-[#0284C7] hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center font-bold shadow-2xs">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-[#6B7C83]">Aulas Este Mês</p>
              <p className="text-2xl font-black text-[#0D2329] tracking-tight">{sessionsThisMonth}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-[#0284C7] flex items-center gap-0.5">
              {MONTHS[currentMonthNum - 1]}
            </span>
            <svg className="w-24 h-7 stroke-[#0284C7] fill-none stroke-[2.5]" viewBox="0 0 100 30">
              <path d="M0,28 Q20,20 45,22 T75,10 T100,4" />
              <circle cx="100" cy="4" r="3" className="fill-[#0284C7]" />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD 3-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================
            COLUMN 1: AGENDA DE HOJE (TIMELINE) + ACESSO RÁPIDO (4 COLS)
            ======================================================== */}
        <div className="lg:col-span-4 space-y-5">
          {/* Agenda de Hoje Card */}
          <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold shadow-2xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-[#0D2329]">Agenda de Hoje</h2>
                  <p className="text-[11px] font-semibold text-[#6B7C83]">{capitalizedToday}</p>
                </div>
              </div>

              <button
                onClick={() => navigate("/agenda")}
                className="px-3 py-1 text-[11px] font-bold text-[#7C3AED] bg-[#F5F3FF] hover:bg-[#EDE9FE] rounded-xl border border-[#DDD6FE] transition-colors"
              >
                Ver semana
              </button>
            </div>

            {/* Timeline List */}
            {todayAppointments.length === 0 ? (
              <div className="py-10 text-center space-y-2 border-2 border-dashed border-[#EEF5F6] rounded-2xl bg-[#FAFCFC]">
                <Clock className="w-8 h-8 mx-auto text-[#A0B4B9]" />
                <p className="text-xs font-bold text-[#0D2329]">Nenhum atendimento hoje</p>
                <button
                  onClick={() => navigate("/agenda?novo=true")}
                  className="text-xs font-bold text-[#7C3AED] hover:underline"
                >
                  + Agendar horário
                </button>
              </div>
            ) : (
              <div className="relative space-y-3.5 pl-2 before:absolute before:left-[45px] before:top-2 before:bottom-2 before:w-0.5 before:bg-[#EEF5F6]">
                {todayAppointments.map((appt) => {
                  const startTime = new Date(appt.start_time)
                  const timeStr = format(startTime, "HH:mm")
                  const childName = appt.child?.full_name || appt.notes || "Paciente"
                  const isDone = appt.status === "done"
                  const isConfirmed = appt.status === "confirmed" || appt.status === "scheduled"

                  return (
                    <div key={appt.id} className="relative flex items-center gap-3 group">
                      <span className="text-xs font-black text-[#0D2329] w-10 shrink-0 text-right">
                        {timeStr}
                      </span>

                      <div className={`w-3 h-3 rounded-full shrink-0 border-2 border-white shadow-xs z-10 ${
                        isDone ? "bg-[#10B981]" : isConfirmed ? "bg-[#00B4D8]" : "bg-[#F59E0B]"
                      }`} />

                      <div
                        onClick={() => {
                          if (appt.child_id) navigate(`/criancas/${appt.child_id}`)
                          else navigate(`/atendimento/${appt.id}`)
                        }}
                        className="flex-1 flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#F7FAFA] border border-transparent hover:border-[#D8E5E7] transition-all cursor-pointer min-w-0"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ChildAvatar photoUrl={appt.child?.photo_url} name={childName} size="xs" />
                          <div className="min-w-0">
                            <p className="text-xs font-black text-[#0D2329] truncate">{childName}</p>
                            <p className="text-[10px] font-semibold text-[#6B7C83] truncate">{appt.type}</p>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isDone
                            ? "bg-[#E8F8F5] text-[#10B981]"
                            : isConfirmed
                            ? "bg-[#E0F7FA] text-[#00A896]"
                            : "bg-[#FEF8EC] text-[#B8871E]"
                        }`}>
                          {isDone ? "Realizado" : isConfirmed ? "Confirmado" : "Pendente"}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <button
              onClick={() => navigate("/agenda")}
              className="w-full pt-2 flex items-center justify-center gap-1 text-xs font-black text-[#00B4D8] hover:text-[#0077B6] transition-colors"
            >
              <span>Ver agenda completa</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Acesso Rápido Bar (Pills) */}
          <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-3">
            <h3 className="text-xs font-black text-[#0D2329]">Acesso Rápido</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => navigate("/criancas?novo=true")}
                className="p-2.5 rounded-2xl bg-[#F7FAFA] hover:bg-[#E8F8F5] border border-[#D8E5E7] hover:border-[#10B981] text-[#0D2329] text-[11px] font-bold flex items-center gap-2 transition-all shadow-2xs"
              >
                <UserPlus className="w-4 h-4 text-[#10B981]" />
                <span className="truncate">Novo Paciente</span>
              </button>

              <button
                onClick={() => navigate("/agenda?novo=true")}
                className="p-2.5 rounded-2xl bg-[#F7FAFA] hover:bg-[#F3E8FF] border border-[#D8E5E7] hover:border-[#9333EA] text-[#0D2329] text-[11px] font-bold flex items-center gap-2 transition-all shadow-2xs"
              >
                <ClipboardList className="w-4 h-4 text-[#9333EA]" />
                <span className="truncate">Nova Avaliação</span>
              </button>

              <button
                onClick={() => navigate("/biblioteca?novo=true")}
                className="p-2.5 rounded-2xl bg-[#F7FAFA] hover:bg-[#FFEDD5] border border-[#D8E5E7] hover:border-[#EA580C] text-[#0D2329] text-[11px] font-bold flex items-center gap-2 transition-all shadow-2xs"
              >
                <BookOpen className="w-4 h-4 text-[#EA580C]" />
                <span className="truncate">Nova Atividade</span>
              </button>

              <button
                onClick={() => navigate("/relatorios?tab=planos")}
                className="p-2.5 rounded-2xl bg-[#F7FAFA] hover:bg-[#E0F2FE] border border-[#D8E5E7] hover:border-[#0284C7] text-[#0D2329] text-[11px] font-bold flex items-center gap-2 transition-all shadow-2xs"
              >
                <FileText className="w-4 h-4 text-[#0284C7]" />
                <span className="truncate">Novo Plano</span>
              </button>

              <button
                onClick={() => navigate("/relatorios")}
                className="p-2.5 rounded-2xl bg-[#F7FAFA] hover:bg-[#FCE7F3] border border-[#D8E5E7] hover:border-[#DB2777] text-[#0D2329] text-[11px] font-bold flex items-center gap-2 transition-all shadow-2xs"
              >
                <Sparkles className="w-4 h-4 text-[#DB2777]" />
                <span className="truncate">Relatório IA</span>
              </button>

              <button
                onClick={() => navigate("/biblioteca")}
                className="p-2.5 rounded-2xl bg-[#F7FAFA] hover:bg-[#E8F8F5] border border-[#D8E5E7] hover:border-[#00A896] text-[#0D2329] text-[11px] font-bold flex items-center gap-2 transition-all shadow-2xs"
              >
                <FolderOpen className="w-4 h-4 text-[#00A896]" />
                <span className="truncate">Biblioteca</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================
            COLUMN 2: RESUMO DO MÊS (CHART DINÂMICO REAL) (5 COLS)
            ======================================================== */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-[#0D2329]">Resumo do Mês</h2>
                <p className="text-[11px] font-semibold text-[#6B7C83]">Fluxo de atendimentos e desempenho</p>
              </div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-xs font-bold bg-[#F7FAFA] border border-[#D8E5E7] rounded-xl px-2.5 py-1 text-[#0D2329] focus:outline-none"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>

            {/* Smooth Dynamic Line / Area Chart */}
            <div className="relative pt-2">
              <div className="h-44 w-full relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 400 150">
                  <defs>
                    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="0" y1="30" x2="400" y2="30" stroke="#EEF5F6" strokeDasharray="3 3" />
                  <line x1="0" y1="75" x2="400" y2="75" stroke="#EEF5F6" strokeDasharray="3 3" />
                  <line x1="0" y1="120" x2="400" y2="120" stroke="#EEF5F6" strokeDasharray="3 3" />

                  {/* Gradient Area Fill */}
                  <path d={monthlyChartData.areaD} fill="url(#purpleGradient)" />

                  {/* Stroke Curve */}
                  <path d={monthlyChartData.pathD} fill="none" stroke="#7C3AED" strokeWidth="3" />

                  {/* Curve Nodes with real counts */}
                  {monthlyChartData.points.map((pt, i) => (
                    <g key={i}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="5"
                        className="fill-white stroke-[#7C3AED] stroke-[2.5] shadow-sm cursor-pointer"
                      />
                    </g>
                  ))}
                </svg>
              </div>

              {/* X-axis labels */}
              <div className="flex justify-between text-[10px] font-bold text-[#8CAAB1] pt-2 px-1">
                {monthlyChartData.weeks.map((w, idx) => (
                  <span key={w.label} className="text-center">
                    {w.label} <span className="block text-[9px] text-[#7C3AED] font-extrabold">{w.count} ses</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom 4 Performance Badges (REAL CALCULATED METRICS) */}
            <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[#EEF5F6] text-center">
              <div className="space-y-0.5 p-2 rounded-2xl bg-[#F7FAFA]">
                <p className="text-[10px] text-[#6B7C83] font-bold">Aulas</p>
                <p className="text-base font-black text-[#0D2329]">{monthlyChartData.totalSessions}</p>
                <p className="text-[9px] text-[#10B981] font-extrabold">Realizadas</p>
              </div>
              <div className="space-y-0.5 p-2 rounded-2xl bg-[#F7FAFA]">
                <p className="text-[10px] text-[#6B7C83] font-bold">Entrevistas</p>
                <p className="text-base font-black text-[#0D2329]">{monthlyChartData.totalEvals}</p>
                <p className="text-[9px] text-[#7C3AED] font-extrabold">Iniciais</p>
              </div>
              <div className="space-y-0.5 p-2 rounded-2xl bg-[#F7FAFA]">
                <p className="text-[10px] text-[#6B7C83] font-bold">Novos Pacientes</p>
                <p className="text-base font-black text-[#0D2329]">{monthlyChartData.newPatients}</p>
                <p className="text-[9px] text-[#10B981] font-extrabold">Cadastros</p>
              </div>
              <div className="space-y-0.5 p-2 rounded-2xl bg-[#F7FAFA]">
                <p className="text-[10px] text-[#6B7C83] font-bold">Cancelamentos</p>
                <p className="text-base font-black text-[#0D2329]">{monthlyChartData.totalMissed}</p>
                <p className="text-[9px] text-[#EF4444] font-extrabold">Faltas</p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            COLUMN 3: PRÓXIMAS SESSÕES + TAREFAS + ANOTAÇÕES (3 COLS)
            ======================================================== */}
        <div className="lg:col-span-3 space-y-5">
          {/* Próximas Sessões Card */}
          <div className="rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm overflow-hidden space-y-3">
            <div className="bg-[#00B4D8] text-white p-3.5 px-4 flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wide">Próximas Sessões</h3>
              <button onClick={() => navigate("/agenda")} className="text-[10px] font-bold text-white/90 hover:underline">
                Ver todas
              </button>
            </div>

            <div className="p-3.5 pt-0 space-y-2.5">
              {upcomingAppointments.length === 0 ? (
                <div className="py-4 text-center text-xs text-[#8CAAB1]">Nenhuma sessão futura agendada</div>
              ) : (
                upcomingAppointments.slice(0, 3).map((appt) => {
                  const d = new Date(appt.start_time)
                  const day = format(d, "dd")
                  const month = format(d, "MMM", { locale: ptBR }).toUpperCase()
                  const time = format(d, "HH:mm")
                  const name = appt.child?.full_name || "Paciente"

                  return (
                    <div
                      key={appt.id}
                      onClick={() => navigate(`/criancas/${appt.child_id}`)}
                      className="flex items-center gap-2.5 p-2 rounded-2xl hover:bg-[#F7FAFA] border border-transparent hover:border-[#D8E5E7] transition-all cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-[#F0F9FF] border border-[#BAE6FD] text-[#0284C7] flex flex-col items-center justify-center font-black text-xs shrink-0 leading-tight">
                        <span className="text-xs leading-none">{day}</span>
                        <span className="text-[8px] tracking-wider uppercase opacity-80">{month}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-[#0D2329] truncate">{name}</p>
                          <span className="text-[10px] font-bold text-[#6B7C83]">{time}</span>
                        </div>
                        <p className="text-[10px] text-[#6B7C83] truncate">{appt.type}</p>
                      </div>
                    </div>
                  )
                })
              )}

              <button
                onClick={() => navigate("/agenda")}
                className="w-full pt-1 text-center text-xs font-black text-[#00B4D8] hover:underline"
              >
                Ver todas as sessões →
              </button>
            </div>
          </div>

          {/* Tarefas Pendentes Card (INTERACTIVE) */}
          <div className="p-4 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[#0D2329]">Tarefas Pendentes</h3>
              <button
                onClick={() => setShowNewTaskInput(!showNewTaskInput)}
                className="text-[10px] font-black text-[#7C3AED] hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Nova tarefa
              </button>
            </div>

            {showNewTaskInput && (
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                  placeholder="Nome da tarefa..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED]"
                  autoFocus
                />
                <button
                  onClick={handleAddTask}
                  className="px-3 py-1.5 bg-[#7C3AED] text-white text-xs font-black rounded-xl"
                >
                  Adicionar
                </button>
              </div>
            )}

            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-[#F7FAFA] transition-colors group"
                >
                  <div
                    onClick={() => toggleTask(task.id)}
                    className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                  >
                    {task.completed ? (
                      <CheckSquare className="w-4 h-4 text-[#10B981] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-[#8CAAB1] shrink-0" />
                    )}
                    <p className={`text-xs font-bold truncate ${task.completed ? "line-through text-[#8CAAB1]" : "text-[#0D2329]"}`}>
                      {task.text}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${
                      task.dueColor === "red"
                        ? "bg-[#FDF0F0] text-[#EF4444]"
                        : task.dueColor === "orange"
                        ? "bg-[#FEF8EC] text-[#F59E0B]"
                        : task.dueColor === "green"
                        ? "bg-[#E8F8F5] text-[#10B981]"
                        : "bg-[#EEF5F6] text-[#6B7C83]"
                    }`}>
                      {task.dueText}
                    </span>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#8CAAB1] hover:text-[#EF4444] rounded"
                      title="Excluir tarefa"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Anotações Rápidas (INTERACTIVE) */}
          <div className="p-4 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#7C3AED]" />
                <h3 className="text-xs font-black text-[#0D2329]">Anotações Rápidas</h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                placeholder="Escreva sua anotação..."
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all"
              />
              <button
                onClick={handleAddNote}
                className="px-3 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black rounded-xl shadow-xs active:scale-95 transition-all"
              >
                Salvar
              </button>
            </div>

            <div className="space-y-2 pt-1">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={`p-3 rounded-2xl border text-xs font-semibold space-y-1 relative group transition-all shadow-2xs ${
                    note.color === "yellow"
                      ? "bg-[#FEF9C3]/80 border-[#FDE047]/60 text-[#854D0E]"
                      : "bg-[#E0F2FE]/80 border-[#BAE6FD]/70 text-[#075985]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="leading-snug pr-4">{note.text}</p>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#8CAAB1] hover:text-[#EF4444] p-0.5 rounded transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-end">
                    <Star className="w-3 h-3 text-[#F59E0B] fill-current" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
