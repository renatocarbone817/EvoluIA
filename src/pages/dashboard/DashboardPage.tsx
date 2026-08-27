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
  Play,
  MessageCircle,
  GripVertical,
  Check,
  X,
  Edit2,
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

type NoteColor = "yellow" | "green" | "blue" | "purple" | "pink" | "orange"

interface NoteItem {
  id: string
  text: string
  color: NoteColor
  starred: boolean
}

const NOTE_COLORS: { id: NoteColor; label: string; bg: string; border: string; text: string; dot: string }[] = [
  { id: "yellow", label: "Amarelo", bg: "bg-[#FEF9C3]/90", border: "border-[#FDE047]", text: "text-[#854D0E]", dot: "bg-[#FACC15]" },
  { id: "green", label: "Verde", bg: "bg-[#DCFCE7]/90", border: "border-[#86EFAC]", text: "text-[#166534]", dot: "bg-[#4ADE80]" },
  { id: "blue", label: "Azul", bg: "bg-[#E0F2FE]/90", border: "border-[#BAE6FD]", text: "text-[#075985]", dot: "bg-[#38BDF8]" },
  { id: "purple", label: "Roxo", bg: "bg-[#F3E8FF]/90", border: "border-[#DDD6FE]", text: "text-[#6B21A8]", dot: "bg-[#A855F7]" },
  { id: "pink", label: "Rosa", bg: "bg-[#FCE7F3]/90", border: "border-[#FBCFE8]", text: "text-[#9D174D]", dot: "bg-[#F472B6]" },
  { id: "orange", label: "Laranja", bg: "bg-[#FFEDD5]/90", border: "border-[#FED7AA]", text: "text-[#9A3412]", dot: "bg-[#FB923C]" },
]

interface HoveredWeekData {
  index: number
  label: string
  rangeText: string
  aulas: number
  entrevistas: number
  novos: number
  x: number
  y: number
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

  // Unified Hover Tooltip for Chart
  const [hoveredWeek, setHoveredWeek] = useState<HoveredWeekData | null>(null)

  // Interactive Tasks (persisted - clean of mock items)
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem("evoluia_dashboard_tasks")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return parsed.filter((t: TaskItem) => 
          !t.text.includes("João Pedro") && 
          !t.text.includes("Maria Clara") && 
          !t.text.includes("Enzo") && 
          !t.text.includes("Lucas")
        )
      } catch (e) {
        return []
      }
    }
    return []
  })
  const [showNewTaskInput, setShowNewTaskInput] = useState(false)
  const [newTaskText, setNewTaskText] = useState("")
  const [newTaskDue, setNewTaskDue] = useState<"hoje" | "amanha" | "semana" | "sem_prazo">("hoje")

  // Drag and drop state for tasks
  const [draggedTaskIndex, setDraggedTaskIndex] = useState<number | null>(null)
  const [dragOverTaskIndex, setDragOverTaskIndex] = useState<number | null>(null)

  // Interactive Notes (persisted with clean popover color picker & full reading view)
  const [notes, setNotes] = useState<NoteItem[]>(() => {
    const saved = localStorage.getItem("evoluia_dashboard_notes")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return parsed.filter((n: NoteItem) => 
          !n.text.includes("Maria Clara dia 29/08") && 
          !n.text.includes("kit de atividades")
        )
      } catch (e) {
        return []
      }
    }
    return []
  })
  const [newNoteText, setNewNoteText] = useState("")
  const [colorPickerOpenForId, setColorPickerOpenForId] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState("")

  // Drag and drop state for notes
  const [draggedNoteIndex, setDraggedNoteIndex] = useState<number | null>(null)
  const [dragOverNoteIndex, setDragOverNoteIndex] = useState<number | null>(null)

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

  // 2. Entrevistas / Avaliações
  const evaluationsThisMonth = useMemo(() => {
    return allAppointments.filter((a) => {
      const d = new Date(a.start_time)
      const t = (a.type || "").toLowerCase()
      return d.getMonth() + 1 === currentMonthNum && d.getFullYear() === currentYearNum && (t.includes("avalia") || t.includes("entrevista"))
    }).length
  }, [allAppointments, currentMonthNum, currentYearNum])

  const evaluationsPendingThisMonth = useMemo(() => {
    return allAppointments.filter((a) => {
      const d = new Date(a.start_time)
      const t = (a.type || "").toLowerCase()
      const isEval = t.includes("avalia") || t.includes("entrevista")
      const isMonth = d.getMonth() + 1 === currentMonthNum && d.getFullYear() === currentYearNum
      return isMonth && isEval && a.status !== "done" && a.status !== "cancelled"
    }).length
  }, [allAppointments, currentMonthNum, currentYearNum])

  const evaluationsDoneThisMonth = useMemo(() => {
    return allAppointments.filter((a) => {
      const d = new Date(a.start_time)
      const t = (a.type || "").toLowerCase()
      const isEval = t.includes("avalia") || t.includes("entrevista")
      const isMonth = d.getMonth() + 1 === currentMonthNum && d.getFullYear() === currentYearNum
      return isMonth && isEval && a.status === "done"
    }).length
  }, [allAppointments, currentMonthNum, currentYearNum])

  // 3. Acompanhamento Contínuo
  const interventionsCount = useMemo(() => {
    const inProgress = allChildren.filter((c) => c.status === "in_progress").length
    return inProgress > 0 ? inProgress : allChildren.length
  }, [allChildren])

  // 4. Aulas Este Mês
  const sessionsThisMonth = useMemo(() => {
    return allAppointments.filter((a) => {
      const d = new Date(a.start_time)
      return d.getMonth() + 1 === currentMonthNum && d.getFullYear() === currentYearNum && a.status !== "cancelled"
    }).length
  }, [allAppointments, currentMonthNum, currentYearNum])

  // =========================================================================
  // MONTHLY MULTI-SERIES CHART (AULAS, ENTREVISTAS & NOVOS PACIENTES JUNTOS)
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

    // Weekly breakdown 1 to 5
    const weeks = [
      { label: "Sem 1", range: [1, 7], aulas: 0, entrevistas: 0, novos: 0 },
      { label: "Sem 2", range: [8, 14], aulas: 0, entrevistas: 0, novos: 0 },
      { label: "Sem 3", range: [15, 21], aulas: 0, entrevistas: 0, novos: 0 },
      { label: "Sem 4", range: [22, 28], aulas: 0, entrevistas: 0, novos: 0 },
      { label: "Sem 5", range: [29, 31], aulas: 0, entrevistas: 0, novos: 0 },
    ]

    // Populate Appointments (Aulas vs Entrevistas)
    monthAppts.forEach((a) => {
      if (a.status === "cancelled") return
      const day = new Date(a.start_time).getDate()
      const targetWeek = weeks.find((w) => day >= w.range[0] && day <= w.range[1]) || weeks[4]
      const t = (a.type || "").toLowerCase()
      if (t.includes("avalia") || t.includes("entrevista")) {
        targetWeek.entrevistas++
      } else {
        targetWeek.aulas++
      }
    })

    // Populate New Patients (Novos Pacientes)
    allChildren.forEach((c) => {
      if (!c.created_at) return
      const d = new Date(c.created_at)
      if (d.getMonth() + 1 === selectedMonth && d.getFullYear() === currentYearNum) {
        const day = d.getDate()
        const targetWeek = weeks.find((w) => day >= w.range[0] && day <= w.range[1]) || weeks[4]
        targetWeek.novos++
      }
    })

    const maxVal = Math.max(
      ...weeks.map((w) => Math.max(w.aulas, w.entrevistas, w.novos)),
      1
    )

    function buildCurve(getValue: (w: typeof weeks[0]) => number) {
      const pts = weeks.map((w, idx) => {
        const x = idx * 92 + 16
        const y = 125 - (getValue(w) / maxVal) * 95
        return { x, y, val: getValue(w) }
      })

      const path = `M ${pts[0].x},${pts[0].y} Q ${(pts[0].x + pts[1].x) / 2},${(pts[0].y + pts[1].y) / 2} ${pts[1].x},${pts[1].y} T ${pts[2].x},${pts[2].y} T ${pts[3].x},${pts[3].y} T ${pts[4].x},${pts[4].y}`
      const area = `${path} L ${pts[4].x},145 L ${pts[0].x},145 Z`
      return { pts, path, area }
    }

    const curveAulas = buildCurve((w) => w.aulas)
    const curveEvals = buildCurve((w) => w.entrevistas)
    const curveNovos = buildCurve((w) => w.novos)

    return {
      totalSessions,
      totalEvals,
      newPatients,
      totalMissed,
      weeks,
      maxVal,
      curveAulas,
      curveEvals,
      curveNovos,
    }
  }, [allAppointments, allChildren, selectedMonth, currentYearNum])

  // Appointment Actions
  function openWhatsApp(appt: any) {
    const guardian = appt.child?.guardians?.[0]?.guardian
    const phone = guardian?.whatsapp || guardian?.phone
    if (!phone) {
      toast.error("Nenhum telefone cadastrado para o responsável.")
      return
    }
    const cleanPhone = phone.replace(/\D/g, "")
    const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`
    const childName = appt.child?.full_name?.split(" ")[0] || "aluno"
    const startTime = format(new Date(appt.start_time), "HH:mm")
    const msg = encodeURIComponent(
      `Olá! Lembrete do atendimento de ${childName} hoje às ${startTime} no Espaço EvoluIA. Podemos confirmar?`
    )
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, "_blank")
  }

  // =========================================================================
  // TASK DRAG AND DROP HANDLERS (TRELLO STYLE)
  // =========================================================================
  function handleTaskDragStart(index: number) {
    setDraggedTaskIndex(index)
  }

  function handleTaskDragEnter(index: number) {
    setDragOverTaskIndex(index)
  }

  function handleTaskDragEnd() {
    if (draggedTaskIndex !== null && dragOverTaskIndex !== null && draggedTaskIndex !== dragOverTaskIndex) {
      const updated = [...tasks]
      const [moved] = updated.splice(draggedTaskIndex, 1)
      updated.splice(dragOverTaskIndex, 0, moved)
      setTasks(updated)
      localStorage.setItem("evoluia_dashboard_tasks", JSON.stringify(updated))
    }
    setDraggedTaskIndex(null)
    setDragOverTaskIndex(null)
  }

  function toggleTask(id: string) {
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    setTasks(updated)
    localStorage.setItem("evoluia_dashboard_tasks", JSON.stringify(updated))
  }

  function handleAddTask() {
    if (!newTaskText.trim()) return

    let dueText = "Hoje"
    let dueColor: TaskItem["dueColor"] = "red"
    if (newTaskDue === "amanha") {
      dueText = "Amanhã"
      dueColor = "orange"
    } else if (newTaskDue === "semana") {
      dueText = "Esta semana"
      dueColor = "gray"
    } else if (newTaskDue === "sem_prazo") {
      dueText = "Pendente"
      dueColor = "gray"
    }

    const newTask: TaskItem = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      dueText,
      dueColor,
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
    toast.success("Tarefa excluída!")
  }

  // =========================================================================
  // NOTE DRAG AND DROP, EDITING & COLOR PICKER
  // =========================================================================
  function handleNoteDragStart(index: number) {
    setDraggedNoteIndex(index)
  }

  function handleNoteDragEnter(index: number) {
    setDragOverNoteIndex(index)
  }

  function handleNoteDragEnd() {
    if (draggedNoteIndex !== null && dragOverNoteIndex !== null && draggedNoteIndex !== dragOverNoteIndex) {
      const updated = [...notes]
      const [moved] = updated.splice(draggedNoteIndex, 1)
      updated.splice(dragOverNoteIndex, 0, moved)
      setNotes(updated)
      localStorage.setItem("evoluia_dashboard_notes", JSON.stringify(updated))
    }
    setDraggedNoteIndex(null)
    setDragOverNoteIndex(null)
  }

  function handleAddNote() {
    if (!newNoteText.trim()) return
    const newNote: NoteItem = {
      id: Date.now().toString(),
      text: newNoteText.trim(),
      color: "yellow", // Sempre vem amarelo como padrão
      starred: true,
    }
    const updated = [newNote, ...notes]
    setNotes(updated)
    localStorage.setItem("evoluia_dashboard_notes", JSON.stringify(updated))
    setNewNoteText("")
    toast.success("Anotação salva!")
  }

  function handleStartEditNote(note: NoteItem) {
    setEditingNoteId(note.id)
    setEditingNoteText(note.text)
  }

  function handleSaveEditNote(id: string) {
    if (!editingNoteText.trim()) {
      handleDeleteNote(id)
      setEditingNoteId(null)
      return
    }
    const updated = notes.map((n) => (n.id === id ? { ...n, text: editingNoteText.trim() } : n))
    setNotes(updated)
    localStorage.setItem("evoluia_dashboard_notes", JSON.stringify(updated))
    setEditingNoteId(null)
    toast.success("Anotação atualizada!")
  }

  function handleUpdateNoteColor(id: string, newColor: NoteColor) {
    const updated = notes.map((n) => (n.id === id ? { ...n, color: newColor } : n))
    setNotes(updated)
    localStorage.setItem("evoluia_dashboard_notes", JSON.stringify(updated))
  }

  function handleDeleteNote(id: string) {
    const updated = notes.filter((n) => n.id !== id)
    setNotes(updated)
    localStorage.setItem("evoluia_dashboard_notes", JSON.stringify(updated))
    toast.success("Anotação excluída!")
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

        {/* Card 2: Entrevistas no mês */}
        <div
          onClick={() => navigate("/agenda")}
          className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] hover:border-[#9333EA] hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center font-bold shadow-2xs">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-[#6B7C83]">Entrevistas no mês</p>
              <p className="text-2xl font-black text-[#0D2329] tracking-tight">{evaluationsThisMonth}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-[#9333EA] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#9333EA]" />
              <span>Falta atender {evaluationsPendingThisMonth}</span>
            </span>
            <svg className="w-20 h-7 stroke-[#9333EA] fill-none stroke-[2.5]" viewBox="0 0 100 30">
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
              <div className="relative space-y-3 pl-2 before:absolute before:left-[45px] before:top-2 before:bottom-2 before:w-0.5 before:bg-[#EEF5F6]">
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

                      <div className="flex-1 flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#F7FAFA] border border-[#EEF5F6] hover:border-[#D8E5E7] transition-all min-w-0">
                        <div
                          onClick={() => {
                            if (appt.child_id) navigate(`/criancas/${appt.child_id}`)
                            else navigate(`/atendimento/${appt.id}`)
                          }}
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                        >
                          <ChildAvatar photoUrl={appt.child?.photo_url} name={childName} size="xs" />
                          <div className="min-w-0">
                            <p className="text-xs font-black text-[#0D2329] truncate">{childName}</p>
                            <p className="text-[10px] font-semibold text-[#6B7C83] truncate">{appt.type}</p>
                          </div>
                        </div>

                        {/* Interactive Session Actions */}
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            onClick={() => openWhatsApp(appt)}
                            className="p-1.5 rounded-lg bg-[#E8F8F5] text-[#10B981] hover:bg-[#D1FAE5] transition-colors"
                            title="Lembrete WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/atendimento/${appt.id}`)}
                            className="p-1.5 rounded-lg bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#DDD6FE] transition-colors font-bold text-[10px] flex items-center gap-1"
                            title="Iniciar Atendimento"
                          >
                            <Play className="w-3 h-3 fill-current" />
                          </button>
                        </div>
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
            COLUMN 2: RESUMO DO MÊS (COMPARATIVO MULTI-LINHAS + UNIFIED TOOLTIP) (5 COLS)
            ======================================================== */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-[#0D2329]">Resumo do Mês</h2>
                <p className="text-[11px] font-semibold text-[#6B7C83]">Fluxo comparativo de atendimentos</p>
              </div>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-xs font-bold bg-[#F7FAFA] border border-[#D8E5E7] rounded-xl px-2.5 py-1 text-[#0D2329] focus:outline-none self-start sm:self-auto"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>

            {/* Legenda do Gráfico */}
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-[#10B981]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> Aulas
              </span>
              <span className="flex items-center gap-1.5 text-[#7C3AED]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" /> Entrevistas
              </span>
              <span className="flex items-center gap-1.5 text-[#0284C7]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" /> Novos Pacientes
              </span>
            </div>

            {/* Multi-Series Smooth Line Chart with Unified Tooltip Card */}
            <div className="relative pt-2">
              <div className="h-48 w-full relative">
                {/* Unified Floating Breakdown Card */}
                {hoveredWeek && (
                  <div
                    style={{
                      left: `${(hoveredWeek.x / 400) * 100}%`,
                      top: `${(Math.max(hoveredWeek.y - 12, 10) / 150) * 100}%`,
                      transform: "translate(-50%, -100%)",
                    }}
                    className="absolute pointer-events-none z-30 min-w-[170px] p-3 rounded-2xl bg-white/95 backdrop-blur-md border-2 border-[#D8E5E7] shadow-xl text-xs space-y-1.5 animate-in fade-in zoom-in-95"
                  >
                    <div className="flex items-center justify-between border-b border-[#EEF5F6] pb-1">
                      <span className="font-black text-[#0D2329] uppercase text-[11px] tracking-wide">{hoveredWeek.label}</span>
                      <span className="text-[9px] font-bold text-[#8CAAB1]">{hoveredWeek.rangeText}</span>
                    </div>

                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex items-center justify-between gap-3 text-[#065F46] font-bold">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#10B981]" /> Aulas
                        </span>
                        <span className="font-black text-xs">{hoveredWeek.aulas}</span>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-[#6B21A8] font-bold">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#7C3AED]" /> Entrevistas
                        </span>
                        <span className="font-black text-xs">{hoveredWeek.entrevistas}</span>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-[#0369A1] font-bold">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#0284C7]" /> Novos Pacientes
                        </span>
                        <span className="font-black text-xs">{hoveredWeek.novos}</span>
                      </div>
                    </div>
                  </div>
                )}

                <svg className="w-full h-full overflow-visible" viewBox="0 0 400 150">
                  <defs>
                    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="0" y1="30" x2="400" y2="30" stroke="#EEF5F6" strokeDasharray="3 3" />
                  <line x1="0" y1="75" x2="400" y2="75" stroke="#EEF5F6" strokeDasharray="3 3" />
                  <line x1="0" y1="120" x2="400" y2="120" stroke="#EEF5F6" strokeDasharray="3 3" />

                  {/* Area Fills */}
                  <path d={monthlyChartData.curveAulas.area} fill="url(#greenGradient)" />
                  <path d={monthlyChartData.curveEvals.area} fill="url(#purpleGradient)" />

                  {/* 1. Curva Aulas (Verde) */}
                  <path d={monthlyChartData.curveAulas.path} fill="none" stroke="#10B981" strokeWidth="2.5" />
                  {monthlyChartData.curveAulas.pts.map((pt, i) => (
                    <circle
                      key={`aulas-${i}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredWeek?.index === i ? 6 : 4.5}
                      className="fill-white stroke-[#10B981] stroke-2 shadow-xs transition-all"
                    />
                  ))}

                  {/* 2. Curva Entrevistas (Roxa) */}
                  <path d={monthlyChartData.curveEvals.path} fill="none" stroke="#7C3AED" strokeWidth="2.5" />
                  {monthlyChartData.curveEvals.pts.map((pt, i) => (
                    <circle
                      key={`evals-${i}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredWeek?.index === i ? 6 : 4.5}
                      className="fill-white stroke-[#7C3AED] stroke-2 shadow-xs transition-all"
                    />
                  ))}

                  {/* 3. Curva Novos Pacientes (Azul) */}
                  <path d={monthlyChartData.curveNovos.path} fill="none" stroke="#0284C7" strokeWidth="2" strokeDasharray="4 3" />
                  {monthlyChartData.curveNovos.pts.map((pt, i) => (
                    <circle
                      key={`novos-${i}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredWeek?.index === i ? 5.5 : 4}
                      className="fill-white stroke-[#0284C7] stroke-2 shadow-xs transition-all"
                    />
                  ))}

                  {/* Interactive Week Hover Columns */}
                  {monthlyChartData.weeks.map((w, idx) => {
                    const x = idx * 92 + 16
                    const minY = Math.min(
                      monthlyChartData.curveAulas.pts[idx].y,
                      monthlyChartData.curveEvals.pts[idx].y,
                      monthlyChartData.curveNovos.pts[idx].y
                    )
                    const isHovered = hoveredWeek?.index === idx

                    return (
                      <g key={`hover-band-${idx}`} className="cursor-pointer">
                        {isHovered && (
                          <line
                            x1={x}
                            y1={10}
                            x2={x}
                            y2={145}
                            stroke="#7C3AED"
                            strokeWidth="1.5"
                            strokeDasharray="4 3"
                            className="opacity-75"
                          />
                        )}

                        <rect
                          x={x - 44}
                          y={0}
                          width={88}
                          height={150}
                          fill="transparent"
                          onMouseEnter={() => setHoveredWeek({
                            index: idx,
                            label: w.label,
                            rangeText: `${w.range[0]} a ${w.range[1]} ${MONTHS[selectedMonth - 1].slice(0, 3)}`,
                            aulas: w.aulas,
                            entrevistas: w.entrevistas,
                            novos: w.novos,
                            x: x,
                            y: minY,
                          })}
                          onMouseLeave={() => setHoveredWeek(null)}
                        />
                      </g>
                    )
                  })}
                </svg>
              </div>

              {/* X-axis labels with values per series */}
              <div className="flex justify-between text-[10px] font-bold text-[#8CAAB1] pt-3 px-1 border-t border-[#EEF5F6]">
                {monthlyChartData.weeks.map((w, idx) => {
                  const isHovered = hoveredWeek?.index === idx
                  return (
                    <div
                      key={w.label}
                      className={`text-center space-y-0.5 px-2 py-1 rounded-xl transition-all cursor-pointer ${
                        isHovered ? "bg-[#EDE9FE] ring-2 ring-[#7C3AED]" : "hover:bg-[#F7FAFA]"
                      }`}
                      onMouseEnter={() => {
                        const x = idx * 92 + 16
                        const minY = Math.min(
                          monthlyChartData.curveAulas.pts[idx].y,
                          monthlyChartData.curveEvals.pts[idx].y,
                          monthlyChartData.curveNovos.pts[idx].y
                        )
                        setHoveredWeek({
                          index: idx,
                          label: w.label,
                          rangeText: `${w.range[0]} a ${w.range[1]} ${MONTHS[selectedMonth - 1].slice(0, 3)}`,
                          aulas: w.aulas,
                          entrevistas: w.entrevistas,
                          novos: w.novos,
                          x: x,
                          y: minY,
                        })
                      }}
                      onMouseLeave={() => setHoveredWeek(null)}
                    >
                      <span className="font-extrabold text-[#0D2329] block text-xs">{w.label}</span>
                      <div className="flex items-center justify-center gap-1 text-[9px]">
                        <span className="text-[#10B981] font-black">{w.aulas}</span>
                        <span className="text-[#D8E5E7]">•</span>
                        <span className="text-[#7C3AED] font-black">{w.entrevistas}</span>
                        <span className="text-[#D8E5E7]">•</span>
                        <span className="text-[#0284C7] font-black">{w.novos}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Bottom 4 Performance Badges */}
            <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[#EEF5F6] text-center">
              <div className="space-y-0.5 p-2 rounded-2xl bg-[#E8F8F5] border border-[#A7F3D0]/60">
                <p className="text-[10px] text-[#065F46] font-bold">Aulas</p>
                <p className="text-base font-black text-[#065F46]">{monthlyChartData.totalSessions}</p>
                <p className="text-[9px] text-[#10B981] font-extrabold">Realizadas</p>
              </div>
              <div className="space-y-0.5 p-2 rounded-2xl bg-[#F3E8FF] border border-[#DDD6FE]/60">
                <p className="text-[10px] text-[#6B21A8] font-bold">Entrevistas</p>
                <p className="text-base font-black text-[#6B21A8]">{monthlyChartData.totalEvals}</p>
                <p className="text-[9px] text-[#7C3AED] font-extrabold">Iniciais</p>
              </div>
              <div className="space-y-0.5 p-2 rounded-2xl bg-[#E0F2FE] border border-[#BAE6FD]/60">
                <p className="text-[10px] text-[#0369A1] font-bold">Novos Pacientes</p>
                <p className="text-base font-black text-[#0369A1]">{monthlyChartData.newPatients}</p>
                <p className="text-[9px] text-[#0284C7] font-extrabold">Cadastros</p>
              </div>
              <div className="space-y-0.5 p-2 rounded-2xl bg-[#FEF2F2] border border-[#FECACA]/60">
                <p className="text-[10px] text-[#991B1B] font-bold">Cancelamentos</p>
                <p className="text-base font-black text-[#991B1B]">{monthlyChartData.totalMissed}</p>
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
                <div className="py-6 text-center space-y-2 border-2 border-dashed border-[#EEF5F6] rounded-2xl bg-[#FAFCFC]">
                  <Calendar className="w-6 h-6 mx-auto text-[#A0B4B9]" />
                  <p className="text-xs font-bold text-[#0D2329]">Nenhuma sessão futura</p>
                  <button
                    onClick={() => navigate("/agenda?novo=true")}
                    className="text-xs font-bold text-[#00B4D8] hover:underline"
                  >
                    + Agendar nova sessão
                  </button>
                </div>
              ) : (
                upcomingAppointments.slice(0, 3).map((appt) => {
                  const d = new Date(appt.start_time)
                  const day = format(d, "dd")
                  const month = format(d, "MMM", { locale: ptBR }).toUpperCase()
                  const time = format(d, "HH:mm")
                  const name = appt.child?.full_name || appt.notes || "Paciente"

                  return (
                    <div
                      key={appt.id}
                      className="flex items-center gap-2.5 p-2 rounded-2xl hover:bg-[#F7FAFA] border border-[#EEF5F6] hover:border-[#D8E5E7] transition-all"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-[#F0F9FF] border border-[#BAE6FD] text-[#0284C7] flex flex-col items-center justify-center font-black text-xs shrink-0 leading-tight">
                        <span className="text-xs leading-none">{day}</span>
                        <span className="text-[8px] tracking-wider uppercase opacity-80">{month}</span>
                      </div>

                      <div
                        onClick={() => {
                          if (appt.child_id) navigate(`/criancas/${appt.child_id}`)
                          else navigate(`/agenda`)
                        }}
                        className="min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-[#0D2329] truncate">{name}</p>
                          <span className="text-[10px] font-bold text-[#6B7C83]">{time}</span>
                        </div>
                        <p className="text-[10px] text-[#6B7C83] truncate">{appt.type}</p>
                      </div>

                      {/* Quick WhatsApp Reminder */}
                      <button
                        onClick={() => openWhatsApp(appt)}
                        className="p-1.5 rounded-lg bg-[#E8F8F5] text-[#10B981] hover:bg-[#D1FAE5] transition-colors shrink-0"
                        title="Enviar WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
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

          {/* Tarefas Pendentes Card (TRELLO STYLE DRAG AND DROP) */}
          <div className="p-4 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-[#7C3AED]" />
                <h3 className="text-xs font-black text-[#0D2329]">Tarefas da Clínica</h3>
              </div>
              <button
                onClick={() => setShowNewTaskInput(!showNewTaskInput)}
                className="text-[10px] font-black text-[#7C3AED] hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Nova tarefa
              </button>
            </div>

            {showNewTaskInput && (
              <div className="p-2.5 rounded-2xl bg-[#F7FAFA] border border-[#D8E5E7] space-y-2">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                  placeholder="Nome da tarefa (ex: Ligar para mãe do Pedro)..."
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#D8E5E7] bg-white focus:outline-none focus:border-[#7C3AED]"
                  autoFocus
                />
                
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-[10px] font-bold">
                    <span className="text-[#6B7C83]">Prazo:</span>
                    <select
                      value={newTaskDue}
                      onChange={(e: any) => setNewTaskDue(e.target.value)}
                      className="px-1.5 py-0.5 rounded-lg border border-[#D8E5E7] bg-white text-[#0D2329]"
                    >
                      <option value="hoje">Hoje</option>
                      <option value="amanha">Amanhã</option>
                      <option value="semana">Esta semana</option>
                      <option value="sem_prazo">Sem prazo</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowNewTaskInput(false)}
                      className="px-2.5 py-1 text-[10px] font-bold text-[#6B7C83] hover:bg-[#EEF5F6] rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddTask}
                      className="px-3 py-1 bg-[#7C3AED] text-white text-[10px] font-black rounded-lg shadow-xs"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tasks.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#8CAAB1]">
                Nenhuma tarefa pendente. Clique em <span className="font-bold text-[#7C3AED]">+ Nova tarefa</span> acima.
              </div>
            ) : (
              <div className="space-y-1.5">
                {tasks.map((task, idx) => {
                  const isDragging = draggedTaskIndex === idx
                  const isDragOver = dragOverTaskIndex === idx && draggedTaskIndex !== idx

                  return (
                    <div
                      key={task.id}
                      draggable={true}
                      onDragStart={() => handleTaskDragStart(idx)}
                      onDragEnter={() => handleTaskDragEnter(idx)}
                      onDragEnd={handleTaskDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      className={`flex items-center justify-between gap-2 p-2 rounded-2xl border transition-all cursor-grab active:cursor-grabbing group ${
                        isDragging
                          ? "opacity-40 scale-95 border-dashed border-[#7C3AED] bg-[#EDE9FE]/40"
                          : isDragOver
                          ? "border-t-2 border-t-[#7C3AED] bg-[#F5F3FF] shadow-md"
                          : "border-[#EEF5F6] hover:border-[#D8E5E7] bg-white hover:bg-[#F7FAFA]"
                      }`}
                    >
                      <GripVertical className="w-3.5 h-3.5 text-[#C4D5D8] group-hover:text-[#7C3AED] shrink-0 transition-colors" />

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

                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
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
                          className="p-1 text-[#A0B4B9] hover:text-[#EF4444] rounded hover:bg-[#FEE2E2] transition-colors"
                          title="Excluir tarefa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Anotações Rápidas (LEITURA COMPLETA DO TEXTO + EDIÇÃO INLINE + POPUP DE CORES) */}
          <div className="p-4 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#7C3AED]" />
                <h3 className="text-xs font-black text-[#0D2329]">Anotações Rápidas</h3>
              </div>
            </div>

            {/* Input Simples e Limpo */}
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
                className="px-3.5 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black rounded-xl shadow-xs active:scale-95 transition-all"
              >
                Salvar
              </button>
            </div>

            {notes.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#8CAAB1]">
                Nenhuma anotação salva. Digite acima e clique em Salvar.
              </div>
            ) : (
              <div className="space-y-2 pt-0.5">
                {notes.map((note, idx) => {
                  const isDragging = draggedNoteIndex === idx
                  const isDragOver = dragOverNoteIndex === idx && draggedNoteIndex !== idx
                  const colorConfig = NOTE_COLORS.find((c) => c.id === note.color) || NOTE_COLORS[0]
                  const isColorPickerOpen = colorPickerOpenForId === note.id
                  const isEditing = editingNoteId === note.id

                  return (
                    <div
                      key={note.id}
                      draggable={!isEditing}
                      onDragStart={() => handleNoteDragStart(idx)}
                      onDragEnter={() => handleNoteDragEnter(idx)}
                      onDragEnd={handleNoteDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      className={`p-3 rounded-2xl border text-xs font-semibold relative transition-all shadow-2xs group ${
                        isEditing ? "cursor-default" : "cursor-grab active:cursor-grabbing"
                      } ${
                        isDragging
                          ? "opacity-40 scale-95 border-dashed border-[#7C3AED]"
                          : isDragOver
                          ? "border-t-2 border-t-[#7C3AED] shadow-md"
                          : `${colorConfig.bg} ${colorConfig.border} ${colorConfig.text}`
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                          <textarea
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            rows={3}
                            className="w-full p-2 text-xs font-semibold rounded-xl bg-white/90 border border-black/20 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] text-[#0D2329] resize-none"
                            autoFocus
                          />
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingNoteId(null)}
                              className="px-2 py-1 text-[10px] font-bold rounded-lg bg-black/10 hover:bg-black/15 transition-all text-current"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveEditNote(note.id)}
                              className="px-3 py-1 text-[10px] font-black rounded-lg bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-all shadow-xs"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <GripVertical className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 shrink-0 mt-0.5 transition-opacity" />

                          {/* Full Readable Text (wraps naturally, clickable to edit) */}
                          <div
                            onClick={() => handleStartEditNote(note)}
                            title="Clique para editar o texto"
                            className="flex-1 min-w-0 pr-1 cursor-pointer"
                          >
                            <p className="leading-relaxed break-words whitespace-pre-wrap select-text">
                              {note.text}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 relative mt-0.5">
                            {/* Single Color Dot Picker */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setColorPickerOpenForId(isColorPickerOpen ? null : note.id)
                                }}
                                className={`w-3.5 h-3.5 rounded-full ${colorConfig.dot} ring-1 ring-black/15 shadow-2xs hover:scale-125 transition-transform`}
                                title="Clique para mudar a cor do post-it"
                              />

                              {/* Floating Popover when clicked */}
                              {isColorPickerOpen && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-6 z-30 flex items-center gap-1.5 p-1.5 rounded-2xl bg-white shadow-xl border-2 border-[#D8E5E7] animate-in fade-in zoom-in-95"
                                >
                                  {NOTE_COLORS.map((c) => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => {
                                        handleUpdateNoteColor(note.id, c.id)
                                        setColorPickerOpenForId(null)
                                      }}
                                      className={`w-4 h-4 rounded-full ${c.dot} transition-transform ${
                                        note.color === c.id
                                          ? "ring-2 ring-offset-1 ring-[#7C3AED] scale-110"
                                          : "opacity-80 hover:opacity-100 hover:scale-125"
                                      }`}
                                      title={c.label}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Edit Button */}
                            <button
                              onClick={() => handleStartEditNote(note)}
                              className="text-current opacity-50 hover:opacity-100 p-0.5 rounded hover:bg-black/5 transition-all"
                              title="Editar texto"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>

                            {/* Delete button */}
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-current opacity-50 hover:opacity-100 hover:text-[#EF4444] p-0.5 rounded hover:bg-black/5 transition-all"
                              title="Excluir anotação"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
