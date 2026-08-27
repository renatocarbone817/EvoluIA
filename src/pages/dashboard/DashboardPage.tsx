import { useState, useEffect } from "react"
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
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { ChildAvatar } from "@/components/ui/ChildAvatar"

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

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, professional } = useAuthStore()
  const profId = professional?.id || user?.id

  const [loading, setLoading] = useState(true)
  const [childrenCount, setChildrenCount] = useState<number>(48)
  const [evaluationsCount, setEvaluationsCount] = useState<number>(32)
  const [interventionsCount, setInterventionsCount] = useState<number>(27)
  const [monthlySessionsCount, setMonthlySessionsCount] = useState<number>(68)

  const [todayAppointments, setTodayAppointments] = useState<any[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([])

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem("evoluia_dashboard_tasks")
    if (saved) return JSON.parse(saved)
    return [
      { id: "1", text: "Elaborar relatório - João Pedro", dueText: "Venc. hoje", dueColor: "red", completed: false },
      { id: "2", text: "Corrigir avaliação - Maria Clara", dueText: "Venc. amanhã", dueColor: "orange", completed: false },
      { id: "3", text: "Planejar intervenção - Enzo", dueText: "Venc. 29/08", dueColor: "gray", completed: false },
      { id: "4", text: "Devolutiva - Lucas", dueText: "Concluído", dueColor: "green", completed: true },
    ]
  })

  const [notes, setNotes] = useState<NoteItem[]>(() => {
    const saved = localStorage.getItem("evoluia_dashboard_notes")
    if (saved) return JSON.parse(saved)
    return [
      { id: "1", text: "Reunião com escola - Maria Clara dia 29/08 às 14h.", color: "yellow", starred: true },
      { id: "2", text: "Novo material de leitura - Chegou o kit de atividades!", color: "blue", starred: true },
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
        { count: cCount },
        { count: evalCount },
        { data: todayAppts },
        { data: upcomingAppts },
      ] = await Promise.all([
        supabase
          .from("children")
          .select("*", { count: "exact", head: true })
          .eq("professional_id", profId),

        supabase
          .from("children")
          .select("*", { count: "exact", head: true })
          .eq("professional_id", profId)
          .eq("status", "initial_assessment"),

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

      if (cCount) setChildrenCount(cCount > 0 ? cCount : 48)
      if (evalCount) setEvaluationsCount(evalCount > 0 ? evalCount : 32)
      setTodayAppointments(todayAppts || [])
      setUpcomingAppointments(upcomingAppts || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function toggleTask(id: string) {
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    setTasks(updated)
    localStorage.setItem("evoluia_dashboard_tasks", JSON.stringify(updated))
  }

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
    <div className="p-4 md:p-8 max-w-[1550px] mx-auto space-y-6">
      {/* 1. GREETING HERO HEADER WITH ILLUSTRATION */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-transparent">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-[#0D2329] tracking-tight">
            Olá, {firstName}! 👋
          </h1>
          <p className="text-sm font-medium text-[#6B7C83]">
            Que bom te ver por aqui! Veja o que está acontecendo hoje.
          </p>
        </div>

        {/* Friendly Psychopedagogy Illustration SVG */}
        <div className="hidden lg:flex items-center gap-3 bg-gradient-to-r from-[#E0F7FA]/60 via-[#E8F8F5]/80 to-white/90 px-6 py-2.5 rounded-3xl border border-[#B2DFDB]/50 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#A855F7] flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-[#1E1B4B]">Espaço Clínico Pronto</p>
              <p className="text-[10px] font-semibold text-[#6B7280]">Intervenções e estímulos cognitivos</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TOP 4 METRIC CARDS WITH SPARKLINES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Pacientes Ativos */}
        <div
          onClick={() => navigate("/criancas")}
          className="p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] hover:border-[#10B981] hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#E8F8F5] text-[#10B981] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-[#6B7C83]">Pacientes Ativos</p>
              <p className="text-2xl font-black text-[#0D2329] tracking-tight">{childrenCount}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-[#10B981] flex items-center gap-0.5">
              ↑ 5 este mês
            </span>
            {/* Sparkline SVG */}
            <svg className="w-24 h-7 stroke-[#10B981] fill-none stroke-[2.5]" viewBox="0 0 100 30">
              <path d="M0,25 Q20,10 40,20 T70,12 T100,5" />
              <circle cx="100" cy="5" r="3" className="fill-[#10B981]" />
            </svg>
          </div>
        </div>

        {/* Card 2: Avaliações Realizadas */}
        <div
          onClick={() => navigate("/criancas")}
          className="p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] hover:border-[#9333EA] hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center font-bold">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-[#6B7C83]">Avaliações Realizadas</p>
              <p className="text-2xl font-black text-[#0D2329] tracking-tight">{evaluationsCount}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-[#9333EA] flex items-center gap-0.5">
              ↑ 8 este mês
            </span>
            {/* Sparkline SVG */}
            <svg className="w-24 h-7 stroke-[#9333EA] fill-none stroke-[2.5]" viewBox="0 0 100 30">
              <path d="M0,22 Q25,28 50,15 T80,20 T100,8" />
              <circle cx="100" cy="8" r="3" className="fill-[#9333EA]" />
            </svg>
          </div>
        </div>

        {/* Card 3: Intervenções em Andamento */}
        <div
          onClick={() => navigate("/agenda")}
          className="p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] hover:border-[#EA580C] hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#FFEDD5] text-[#EA580C] flex items-center justify-center font-bold">
              <Target className="w-5 h-5" />
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-[#6B7C83]">Intervenções em Andamento</p>
              <p className="text-2xl font-black text-[#0D2329] tracking-tight">{interventionsCount}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-[#EA580C] flex items-center gap-0.5">
              ↑ 3 este mês
            </span>
            {/* Sparkline SVG */}
            <svg className="w-24 h-7 stroke-[#EA580C] fill-none stroke-[2.5]" viewBox="0 0 100 30">
              <path d="M0,25 Q30,22 55,18 T80,12 T100,6" />
              <circle cx="100" cy="6" r="3" className="fill-[#EA580C]" />
            </svg>
          </div>
        </div>

        {/* Card 4: Sessões Este Mês */}
        <div
          onClick={() => navigate("/financeiro")}
          className="p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] hover:border-[#0284C7] hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center font-bold">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-[#6B7C83]">Sessões Este Mês</p>
              <p className="text-2xl font-black text-[#0D2329] tracking-tight">{monthlySessionsCount}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-[#0284C7] flex items-center gap-0.5">
              ↑ 12 este mês
            </span>
            {/* Sparkline SVG */}
            <svg className="w-24 h-7 stroke-[#0284C7] fill-none stroke-[2.5]" viewBox="0 0 100 30">
              <path d="M0,28 Q20,20 45,22 T75,10 T100,4" />
              <circle cx="100" cy="4" r="3" className="fill-[#0284C7]" />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD 3-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================
            COLUMN 1: AGENDA DE HOJE (TIMELINE) + ACESSO RÁPIDO (4 COLS)
            ======================================================== */}
        <div className="lg:col-span-4 space-y-5">
          {/* Agenda de Hoje Card */}
          <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-[#0D2329]">Agenda de Hoje</h2>
                  <p className="text-[11px] font-semibold text-[#6B7C83]">{capitalizedToday}</p>
                </div>
              </div>

              <button
                onClick={() => navigate("/agenda")}
                className="px-2.5 py-1 text-[11px] font-bold text-[#7C3AED] bg-[#F5F3FF] hover:bg-[#EDE9FE] rounded-lg border border-[#DDD6FE] transition-colors"
              >
                Ver semana
              </button>
            </div>

            {/* Timeline List */}
            {todayAppointments.length === 0 ? (
              <div className="py-8 text-center space-y-2 border-2 border-dashed border-[#EEF5F6] rounded-2xl bg-[#FAFCFC]">
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
                {todayAppointments.slice(0, 5).map((appt) => {
                  const startTime = new Date(appt.start_time)
                  const timeStr = format(startTime, "HH:mm")
                  const childName = appt.child?.full_name || "Paciente"
                  const isDone = appt.status === "done"
                  const isConfirmed = appt.status === "confirmed" || appt.status === "scheduled"

                  return (
                    <div key={appt.id} className="relative flex items-center gap-3 group">
                      {/* Time */}
                      <span className="text-xs font-black text-[#0D2329] w-10 shrink-0 text-right">
                        {timeStr}
                      </span>

                      {/* Timeline dot */}
                      <div className={`w-3 h-3 rounded-full shrink-0 border-2 border-white shadow-xs z-10 ${
                        isDone ? "bg-[#10B981]" : isConfirmed ? "bg-[#00B4D8]" : "bg-[#F59E0B]"
                      }`} />

                      {/* Patient Avatar & Details */}
                      <div
                        onClick={() => navigate(`/criancas/${appt.child_id}`)}
                        className="flex-1 flex items-center justify-between p-2 rounded-xl hover:bg-[#F7FAFA] border border-transparent hover:border-[#D8E5E7] transition-all cursor-pointer min-w-0"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ChildAvatar photoUrl={appt.child?.photo_url} name={childName} size="xs" />
                          <div className="min-w-0">
                            <p className="text-xs font-black text-[#0D2329] truncate">{childName}</p>
                            <p className="text-[10px] text-[#6B7C83] truncate">{appt.type}</p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isDone
                            ? "bg-[#E8F8F5] text-[#10B981]"
                            : isConfirmed
                            ? "bg-[#E0F7FA] text-[#00A896]"
                            : "bg-[#FEF8EC] text-[#B8871E]"
                        }`}>
                          {isDone ? "Confirmado" : isConfirmed ? "Confirmado" : "Pendente"}
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
                className="p-2 rounded-xl bg-[#F7FAFA] hover:bg-[#E8F8F5] border border-[#D8E5E7] hover:border-[#10B981] text-[#0D2329] text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#10B981]" />
                <span className="truncate">Novo Paciente</span>
              </button>

              <button
                onClick={() => navigate("/relatorios?novo=true")}
                className="p-2 rounded-xl bg-[#F7FAFA] hover:bg-[#F3E8FF] border border-[#D8E5E7] hover:border-[#9333EA] text-[#0D2329] text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <ClipboardList className="w-3.5 h-3.5 text-[#9333EA]" />
                <span className="truncate">Nova Avaliação</span>
              </button>

              <button
                onClick={() => navigate("/biblioteca?novo=true")}
                className="p-2 rounded-xl bg-[#F7FAFA] hover:bg-[#FFEDD5] border border-[#D8E5E7] hover:border-[#EA580C] text-[#0D2329] text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#EA580C]" />
                <span className="truncate">Nova Atividade</span>
              </button>

              <button
                onClick={() => navigate("/relatorios?tab=planos")}
                className="p-2 rounded-xl bg-[#F7FAFA] hover:bg-[#E0F2FE] border border-[#D8E5E7] hover:border-[#0284C7] text-[#0D2329] text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 text-[#0284C7]" />
                <span className="truncate">Novo Plano</span>
              </button>

              <button
                onClick={() => navigate("/relatorios")}
                className="p-2 rounded-xl bg-[#F7FAFA] hover:bg-[#FCE7F3] border border-[#D8E5E7] hover:border-[#DB2777] text-[#0D2329] text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#DB2777]" />
                <span className="truncate">Relatório IA</span>
              </button>

              <button
                onClick={() => navigate("/biblioteca")}
                className="p-2 rounded-xl bg-[#F7FAFA] hover:bg-[#E8F8F5] border border-[#D8E5E7] hover:border-[#00A896] text-[#0D2329] text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#00A896]" />
                <span className="truncate">Biblioteca</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================
            COLUMN 2: RESUMO DO MÊS (CHART) + BANNER IA (4.5 COLS)
            ======================================================== */}
        <div className="lg:col-span-5 space-y-5">
          {/* Resumo do Mês Card */}
          <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-[#0D2329]">Resumo do Mês</h2>
              <select className="text-xs font-bold bg-[#F7FAFA] border border-[#D8E5E7] rounded-xl px-2.5 py-1 text-[#0D2329] focus:outline-none">
                <option>Agosto</option>
                <option>Julho</option>
                <option>Junho</option>
              </select>
            </div>

            {/* Smooth Line / Area Chart */}
            <div className="relative pt-2">
              <div className="h-44 w-full relative">
                {/* SVG Area & Smooth Curve */}
                <svg className="w-full h-full overflow-visible" viewBox="0 0 400 150">
                  <defs>
                    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="0" y1="30" x2="400" y2="30" stroke="#EEF5F6" strokeDasharray="3 3" />
                  <line x1="0" y1="75" x2="400" y2="75" stroke="#EEF5F6" strokeDasharray="3 3" />
                  <line x1="0" y1="120" x2="400" y2="120" stroke="#EEF5F6" strokeDasharray="3 3" />

                  {/* Gradient Area Fill */}
                  <path
                    d="M 0,110 Q 50,60 100,75 T 200,65 T 300,35 T 400,20 L 400,150 L 0,150 Z"
                    fill="url(#purpleGradient)"
                  />

                  {/* Stroke Curve */}
                  <path
                    d="M 0,110 Q 50,60 100,75 T 200,65 T 300,35 T 400,20"
                    fill="none"
                    stroke="#7C3AED"
                    strokeWidth="3"
                  />

                  {/* Curve Nodes */}
                  {[
                    { cx: 0, cy: 110 },
                    { cx: 75, cy: 68 },
                    { cx: 150, cy: 62 },
                    { cx: 225, cy: 55 },
                    { cx: 300, cy: 35 },
                    { cx: 400, cy: 20 },
                  ].map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.cx}
                      cy={pt.cy}
                      r="4"
                      className="fill-white stroke-[#7C3AED] stroke-2 shadow-sm"
                    />
                  ))}
                </svg>
              </div>

              {/* X-axis labels */}
              <div className="flex justify-between text-[10px] font-bold text-[#8CAAB1] pt-2 px-1">
                <span>Sem 1</span>
                <span>Sem 2</span>
                <span>Sem 3</span>
                <span>Sem 4</span>
                <span>Sem 5</span>
              </div>
            </div>

            {/* Bottom 4 Performance Badges */}
            <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[#EEF5F6] text-center">
              <div className="space-y-0.5">
                <p className="text-[10px] text-[#6B7C83] font-bold">Sessões</p>
                <p className="text-sm font-black text-[#0D2329]">68</p>
                <p className="text-[10px] text-[#10B981] font-extrabold">↑ 12%</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] text-[#6B7C83] font-bold">Avaliações</p>
                <p className="text-sm font-black text-[#0D2329]">15</p>
                <p className="text-[10px] text-[#10B981] font-extrabold">↑ 7%</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] text-[#6B7C83] font-bold">Novos Pacientes</p>
                <p className="text-sm font-black text-[#0D2329]">9</p>
                <p className="text-[10px] text-[#10B981] font-extrabold">↑ 5%</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] text-[#6B7C83] font-bold">Faltas</p>
                <p className="text-sm font-black text-[#0D2329]">3</p>
                <p className="text-[10px] text-[#EF4444] font-extrabold">↓ 2%</p>
              </div>
            </div>
          </div>

          {/* Banner: Evolua com Inteligência IA */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-[#EDE9FE] via-[#EEF2FF] to-[#F5F3FF] border-2 border-[#DDD6FE] shadow-sm relative overflow-hidden flex items-center justify-between gap-4">
            <div className="space-y-2 z-10 max-w-sm">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-[#1E1B4B]">Evolua com Inteligência</h3>
                <span className="text-[10px] font-black bg-[#7C3AED] text-white px-1.5 py-0.2 rounded-md">IA</span>
              </div>
              <p className="text-xs text-[#4C1D95] font-medium leading-snug">
                Receba sugestões personalizadas de atividades, relatórios e estratégias baseadas em IA.
              </p>
              <button
                onClick={() => navigate("/relatorios")}
                className="mt-1 px-4 py-2 bg-[#4338CA] hover:bg-[#3730A3] text-white text-xs font-black rounded-xl shadow-sm active:scale-95 transition-all"
              >
                Explorar sugestões
              </button>
            </div>

            {/* Glowing Brain Art */}
            <div className="w-20 h-20 rounded-full bg-white/60 border border-[#C4B5FD] flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles className="w-10 h-10 text-[#7C3AED] animate-pulse" />
            </div>
          </div>
        </div>

        {/* ========================================================
            COLUMN 3: PRÓXIMAS SESSÕES + TAREFAS + ANOTAÇÕES (3.5 COLS)
            ======================================================== */}
        <div className="lg:col-span-3 space-y-5">
          {/* Próximas Sessões Card */}
          <div className="rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm overflow-hidden space-y-3">
            {/* Header */}
            <div className="bg-[#00B4D8] text-white p-3.5 px-4 flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wide">Próximas Sessões</h3>
              <button onClick={() => navigate("/agenda")} className="text-[10px] font-bold text-white/90 hover:underline">
                Ver todas
              </button>
            </div>

            {/* List */}
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
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#F7FAFA] border border-transparent hover:border-[#D8E5E7] transition-all cursor-pointer"
                    >
                      {/* Date Badge */}
                      <div className="w-11 h-11 rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] text-[#0284C7] flex flex-col items-center justify-center font-black text-xs shrink-0 leading-tight">
                        <span className="text-xs leading-none">{day}</span>
                        <span className="text-[8px] tracking-wider uppercase opacity-80">{month}</span>
                      </div>

                      {/* Patient Details */}
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

          {/* Tarefas Pendentes Card */}
          <div className="p-4 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[#0D2329]">Tarefas Pendentes</h3>
              <span className="text-[10px] font-bold text-[#7C3AED] hover:underline cursor-pointer">Ver todas</span>
            </div>

            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-[#F7FAFA] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {task.completed ? (
                      <CheckSquare className="w-4 h-4 text-[#10B981] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-[#8CAAB1] shrink-0" />
                    )}
                    <p className={`text-xs font-bold truncate ${task.completed ? "line-through text-[#8CAAB1]" : "text-[#0D2329]"}`}>
                      {task.text}
                    </p>
                  </div>

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
                </div>
              ))}
            </div>
          </div>

          {/* Anotações Rápidas (Post-its) */}
          <div className="p-4 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#7C3AED]" />
                <h3 className="text-xs font-black text-[#0D2329]">Anotações Rápidas</h3>
              </div>
            </div>

            {/* Input to save new note */}
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

            {/* Note Cards List */}
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
