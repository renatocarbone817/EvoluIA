import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  Brain,
  Target,
  Sparkles,
  CheckCircle2,
  Plus,
  Clock,
  RotateCcw,
  Pencil,
  Trash2,
  X,
  CalendarCheck,
  Users,
  BookOpen,
  Play,
  CheckSquare,
  Square,
  FileText,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { formatDate } from "@/lib/utils"
import toast from "react-hot-toast"
import type { Child } from "@/types/database"
import type {
  InterventionGoal,
  InterventionGoalStatus,
} from "@/types/database"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/Dialog"
import { InterventionReportBuilderModal } from "@/components/reports/InterventionReportBuilderModal"
import {
  buildInterventionDocxReport,
  downloadInterventionDocxReport,
} from "@/lib/interventionDocxGenerator"

interface ChildInterventionTabProps {
  child: Child
  childName?: string
  onReloadChild: () => void
  onNavigateTab?: (tab: string) => void
}

const SKILL_AREAS = [
  { name: "Leitura & Decodificação", icon: "📖", color: "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]" },
  { name: "Compreensão Textual", icon: "💡", color: "bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE]" },
  { name: "Escrita & Ortografia", icon: "✍️", color: "bg-[#FEF8EC] text-[#B8871E] border-[#FDE68A]" },
  { name: "Raciocínio Matemático", icon: "🔢", color: "bg-[#E8F8F5] text-[#065F46] border-[#A7F3D0]" },
  { name: "Atenção & Concentração", icon: "🎯", color: "bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]" },
  { name: "Funções Executivas & Memória", icon: "🧠", color: "bg-[#FDF2F8] text-[#BE185D] border-[#FBCFE8]" },
]

function statusLabel(status: InterventionGoalStatus) {
  if (status === "achieved") return { text: "Atingida", emoji: "🟢", cls: "bg-[#E8F8F5] text-[#065F46] border border-[#A7F3D0]" }
  if (status === "in_progress") return { text: "Em andamento", emoji: "🟠", cls: "bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]" }
  return { text: "Não iniciada", emoji: "⚪", cls: "bg-[#F3F4F6] text-[#6B7C83] border border-[#E5E7EB]" }
}

function nextStatus(s: InterventionGoalStatus): InterventionGoalStatus {
  if (s === "not_started") return "in_progress"
  if (s === "in_progress") return "achieved"
  return "in_progress"
}

export function ChildInterventionTab({
  child,
  childName = "Paciente",
  onReloadChild,
  onNavigateTab,
}: ChildInterventionTabProps) {
  const { user, professional } = useAuthStore()
  const profId = professional?.id || user?.id

  const isInterventionActive =
    child.status === "in_intervention" || child.status === "intervention_in_progress"
  const isReportCompleted = child.status === "report_completed"
  const isClosed = child.status === "closed"

  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [goals, setGoals] = useState<InterventionGoal[]>([])
  const [configuredAreas, setConfiguredAreas] = useState<string[]>([])
  const [interventionSessions, setInterventionSessions] = useState<any[]>([])
  const [sessionCount, setSessionCount] = useState(0)
  const [nextSession, setNextSession] = useState<{ date: string; time: string } | null>(null)
  const [areaFilter, setAreaFilter] = useState<string | null>(null)

  // Modals
  const [showStartModal, setShowStartModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showAddGoalModal, setShowAddGoalModal] = useState(false)
  const [showInterventionReportModal, setShowInterventionReportModal] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState<string | undefined>(undefined)
  const [interventionReports, setInterventionReports] = useState<any[]>([])
  const [editingGoal, setEditingGoal] = useState<InterventionGoal | null>(null)

  // Close form state
  const [closingReason, setClosingReason] = useState("")
  const [closingDate, setClosingDate] = useState(new Date().toISOString().split("T")[0])
  const [closingObs, setClosingObs] = useState("")

  // Goal form state
  const [goalForm, setGoalForm] = useState({
    title: "",
    area: SKILL_AREAS[0].name,
    strategy: "",
    status: "in_progress" as InterventionGoalStatus,
  })

  // ─── Load data ────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!profId) return

    // 1. Goals
    const { data: goalsData } = await supabase
      .from("intervention_goals")
      .select("*")
      .eq("child_id", child.id)
      .order("created_at", { ascending: true })

    const fetchedGoals: InterventionGoal[] = (goalsData || []) as InterventionGoal[]

    // Migrate from localStorage (one-time, transparent)
    const lsKey = `evoluia_intervention_goals_${child.id}`
    const lsSaved = localStorage.getItem(lsKey)
    if (lsSaved && fetchedGoals.length === 0 && profId) {
      try {
        const lsGoals = JSON.parse(lsSaved) as Array<{
          id: string; title: string; area: string; status: string; notes?: string
        }>
        if (Array.isArray(lsGoals) && lsGoals.length > 0) {
          const toInsert = lsGoals.map((g) => ({
            professional_id: profId,
            child_id: child.id,
            title: g.title,
            area: g.area || SKILL_AREAS[0].name,
            strategy: g.notes || null,
            status: (["not_started", "in_progress", "achieved"].includes(g.status)
              ? g.status
              : "in_progress") as InterventionGoalStatus,
          }))
          const { data: migrated } = await supabase
            .from("intervention_goals")
            .insert(toInsert)
            .select()
          if (migrated) {
            localStorage.removeItem(lsKey)
            setGoals(migrated as InterventionGoal[])
          }
        } else {
          setGoals(fetchedGoals)
        }
      } catch {
        setGoals(fetchedGoals)
      }
    } else {
      setGoals(fetchedGoals)
    }

    // 2. Configured intervention areas
    const { data: areasData } = await supabase
      .from("intervention_areas")
      .select("area")
      .eq("child_id", child.id)
    setConfiguredAreas((areasData || []).map((a: any) => a.area))

    // 4. Completed intervention sessions
    const { data: intervSessionsData } = await supabase
      .from("intervention_sessions")
      .select("*, intervention_session_areas(*)")
      .eq("child_id", child.id)
      .order("date", { ascending: false })
    setInterventionSessions(intervSessionsData || [])

    // 5. Total session count (evaluation + intervention)
    const { count: evalCount } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("child_id", child.id)
    const totalCount = (evalCount || 0) + (intervSessionsData?.length || 0)
    setSessionCount(totalCount)

    // 6. Next appointment
    const { data: nextAppt } = await supabase
      .from("appointments")
      .select("start_time")
      .eq("child_id", child.id)
      .gte("start_time", new Date().toISOString())
      .in("status", ["scheduled", "confirmed"])
      .order("start_time", { ascending: true })
      .limit(1)
    if (nextAppt && nextAppt.length > 0) {
      const dt = new Date(nextAppt[0].start_time)
      setNextSession({
        date: dt.toLocaleDateString("pt-BR"),
        time: dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      })
    } else {
      setNextSession(null)
    }

    // 7. Relatórios de Reavaliação Pós-Intervenção
    try {
      const { data: repData } = await supabase
        .from("reports")
        .select("*")
        .eq("child_id", child.id)
        .order("created_at", { ascending: false })

      const reassess = (repData || []).filter((r: any) => {
        const c = r.content || {}
        return Boolean(c.predictors || (c.patient && c.clinical && c.tests))
      })
      setInterventionReports(reassess)
    } catch {
      // Ignora erro silenciosamente
    }
  }, [child.id, profId])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleDeleteReassessmentReport(repId: string) {
    if (!confirm("Deseja realmente remover este relatório de reavaliação do prontuário?")) return
    try {
      const { error } = await supabase.from("reports").delete().eq("id", repId)
      if (error) throw error
      toast.success("Relatório de reavaliação excluído com sucesso!")
      await loadData()
      if (onReloadChild) onReloadChild()
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir relatório.")
    }
  }

  async function handleToggleConfiguredArea(areaName: string) {
    if (!profId) return
    const isConfigured = configuredAreas.includes(areaName)
    try {
      if (isConfigured) {
        const { error } = await supabase
          .from("intervention_areas")
          .delete()
          .eq("child_id", child.id)
          .eq("area", areaName)
        if (error) throw error
        setConfiguredAreas((prev) => prev.filter((a) => a !== areaName))
        toast.success(`Área "${areaName}" desativada para as aulas.`)
      } else {
        const { error } = await supabase
          .from("intervention_areas")
          .insert({
            professional_id: profId,
            child_id: child.id,
            area: areaName,
          })
        if (error) throw error
        setConfiguredAreas((prev) => [...prev, areaName])
        toast.success(`Área "${areaName}" ativada para as aulas de intervenção!`)
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar área.")
    }
  }

  // ─── Goal CRUD ────────────────────────────────────────────
  async function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!profId || !goalForm.title.trim()) return
    setLoading(true)
    try {
      if (editingGoal) {
        const { error } = await supabase
          .from("intervention_goals")
          .update({
            title: goalForm.title.trim(),
            area: goalForm.area,
            strategy: goalForm.strategy.trim() || null,
            status: goalForm.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingGoal.id)
        if (error) throw error
        toast.success("Meta atualizada!")
      } else {
        const { error } = await supabase
          .from("intervention_goals")
          .insert({
            professional_id: profId,
            child_id: child.id,
            title: goalForm.title.trim(),
            area: goalForm.area,
            strategy: goalForm.strategy.trim() || null,
            status: goalForm.status,
          })
        if (error) throw error
        toast.success("Meta adicionada ao plano!")
      }
      setShowAddGoalModal(false)
      setEditingGoal(null)
      resetGoalForm()
      await loadData()
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar meta.")
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleGoalStatus(goal: InterventionGoal) {
    const ns = nextStatus(goal.status)
    try {
      const { error } = await supabase
        .from("intervention_goals")
        .update({ status: ns, updated_at: new Date().toISOString() })
        .eq("id", goal.id)
      if (error) throw error
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, status: ns } : g)))
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar status.")
    }
  }

  async function handleDeleteGoal(id: string) {
    if (!confirm("Deseja remover esta meta do plano?")) return
    try {
      const { error } = await supabase.from("intervention_goals").delete().eq("id", id)
      if (error) throw error
      toast.success("Meta removida.")
      setGoals((prev) => prev.filter((g) => g.id !== id))
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover meta.")
    }
  }

  function openEditGoal(goal: InterventionGoal) {
    setEditingGoal(goal)
    setGoalForm({
      title: goal.title,
      area: goal.area,
      strategy: goal.strategy || "",
      status: goal.status,
    })
    setShowAddGoalModal(true)
  }

  function resetGoalForm() {
    setGoalForm({ title: "", area: SKILL_AREAS[0].name, strategy: "", status: "in_progress" })
  }

  // ─── Intervention lifecycle ────────────────────────────────
  async function handleStartIntervention() {
    if (!profId) return
    setLoading(true)
    try {
      let currentNotes = child.notes || ""
      if (!currentNotes.includes("[FASE:intervencao]")) {
        currentNotes = currentNotes ? `${currentNotes}\n[FASE:intervencao]` : "[FASE:intervencao]"
      }
      currentNotes = currentNotes.replace("[FASE:encerrado]", "").trim()

      let { error } = await supabase
        .from("children")
        .update({ status: "in_intervention", notes: currentNotes, updated_at: new Date().toISOString() })
        .eq("id", child.id)

      if (error?.message?.includes("enum child_status")) {
        const res = await supabase
          .from("children")
          .update({ status: "in_progress", notes: currentNotes, updated_at: new Date().toISOString() })
          .eq("id", child.id)
        error = res.error
      }

      if (error) throw error
      toast.success("Intervenção Psicopedagógica iniciada!", { icon: "🚀" })
      setShowStartModal(false)
      onReloadChild()
    } catch (err: any) {
      toast.error(err?.message || "Erro ao iniciar intervenção.")
    } finally {
      setLoading(false)
    }
  }

  async function handleCloseIntervention() {
    if (!profId) return
    setLoading(true)
    try {
      let cleanNotes = (child.notes || "").replace("[FASE:intervencao]", "").trim()
      const lines: string[] = []
      if (closingReason) lines.push(`[Motivo de encerramento]: ${closingReason}`)
      if (closingDate) lines.push(`[Data de encerramento]: ${closingDate}`)
      if (closingObs) lines.push(`[Observação final]: ${closingObs}`)
      if (lines.length) {
        cleanNotes = cleanNotes ? `${cleanNotes}\n${lines.join("\n")}` : lines.join("\n")
      }

      const { error } = await supabase
        .from("children")
        .update({ status: "closed", notes: cleanNotes || null, updated_at: new Date().toISOString() })
        .eq("id", child.id)

      if (error) throw error
      toast.success("Acompanhamento encerrado.", { icon: "⚪" })
      setShowCloseModal(false)
      setClosingReason("")
      setClosingObs("")
      onReloadChild()
    } catch (err: any) {
      toast.error(err?.message || "Erro ao encerrar acompanhamento.")
    } finally {
      setLoading(false)
    }
  }

  async function handleReopenIntervention() {
    if (!profId) return
    setLoading(true)
    try {
      let currentNotes = child.notes || ""
      if (!currentNotes.includes("[FASE:intervencao]")) {
        currentNotes = currentNotes ? `${currentNotes}\n[FASE:intervencao]` : "[FASE:intervencao]"
      }
      currentNotes = currentNotes.replace("[FASE:encerrado]", "").trim()

      let { error } = await supabase
        .from("children")
        .update({ status: "in_intervention", notes: currentNotes, updated_at: new Date().toISOString() })
        .eq("id", child.id)

      if (error?.message?.includes("enum child_status")) {
        const res = await supabase
          .from("children")
          .update({ status: "in_progress", notes: currentNotes, updated_at: new Date().toISOString() })
          .eq("id", child.id)
        error = res.error
      }

      if (error) throw error
      toast.success("Acompanhamento reaberto!", { icon: "🟠" })
      onReloadChild()
    } catch (err: any) {
      toast.error(err?.message || "Erro ao reabrir acompanhamento.")
    } finally {
      setLoading(false)
    }
  }

  // ─── Derived data ─────────────────────────────────────────
  const achieved = goals.filter((g) => g.status === "achieved").length
  const inProgress = goals.filter((g) => g.status === "in_progress").length
  const notStarted = goals.filter((g) => g.status === "not_started").length

  const filteredGoals = areaFilter ? goals.filter((g) => g.area === areaFilter) : goals

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in">

      {/* ── 1. CABEÇALHO / BANNER DE STATUS ─────────────────── */}
      {isInterventionActive ? (
        <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE] font-black text-xs inline-flex items-center gap-1.5 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
                Fase Ativa: Intervenção Psicopedagógica
              </span>
              <span className="text-xs font-bold text-[#6B7C83]">
                {childName}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#0D2329] tracking-tight">
              Plano de Intervenção e Estimulação
            </h2>
            <p className="text-xs font-semibold text-[#6B7C83] max-w-2xl">
              Gerencie as habilidades trabalhadas, acompanhe as metas e registre as aulas de intervenção.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => {
                setSelectedReportId(interventionReports[0]?.id)
                setShowInterventionReportModal(true)
              }}
              className="h-10 px-4 rounded-2xl bg-[#E0F2FE] hover:bg-[#BAE6FD] border-2 border-[#7DD3FC] text-[#0284C7] font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="Gerar Relatório de Reavaliação Pós-Intervenção com Semáforo"
            >
              <FileText className="w-4 h-4 stroke-[2.5]" />
              <span>
                {interventionReports.length > 0
                  ? `Relatório de Reavaliação (${interventionReports.length})`
                  : "Relatório de Reavaliação"}
              </span>
            </button>

            <button
              onClick={() => navigate(`/atendimento/intervencao/nova/${child.id}`)}
              className="h-10 px-5 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white font-black text-xs flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Iniciar Aula de Intervenção</span>
            </button>

            <button
              onClick={() => { resetGoalForm(); setEditingGoal(null); setShowAddGoalModal(true) }}
              className="h-10 px-4 rounded-2xl bg-[#F7FAFA] hover:bg-[#EEF5F6] border-2 border-[#D8E5E7] text-[#0D2329] font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#7C3AED] stroke-[3]" />
              <span>Nova Meta</span>
            </button>

            <button
              onClick={() => setShowCloseModal(true)}
              className="h-10 px-3.5 rounded-2xl bg-white hover:bg-red-50 text-[#6B7C83] hover:text-red-600 font-bold text-xs border-2 border-[#D8E5E7] hover:border-red-200 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              Encerrar
            </button>
          </div>
        </div>
      ) : isReportCompleted ? (
        <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-[#E8F8F5] text-[#065F46] border border-[#A7F3D0] font-black text-xs inline-flex items-center gap-1.5 shadow-2xs">
                🟢 Relatório Finalizado
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#0D2329] tracking-tight">
              Avaliação Concluída — Pronto para Intervenção
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[#6B7C83] max-w-2xl">
              O laudo foi finalizado. Inicie a etapa de intervenção para começar o trabalho de estimulação e acompanhamento.
            </p>
          </div>
          <button
            onClick={() => setShowStartModal(true)}
            className="h-11 px-6 rounded-2xl bg-gradient-to-r from-[#059669] to-[#047857] hover:from-[#047857] hover:to-[#065F46] text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#FDE68A]" />
            <span>Iniciar Intervenção</span>
          </button>
        </div>
      ) : isClosed ? (
        <div className="bg-white border-2 border-[#D8E5E7] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full bg-[#F8FAFB] text-[#6B7C83] border border-[#D8E5E7] font-black text-xs">
              ⚪ Acompanhamento Encerrado
            </span>
            <h3 className="text-lg font-black text-[#0D2329] pt-1">
              O ciclo de acompanhamento deste paciente foi finalizado.
            </h3>
            <p className="text-xs font-semibold text-[#6B7C83]">
              Todos os registros permanecem arquivados com segurança.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => {
                setSelectedReportId(interventionReports[0]?.id)
                setShowInterventionReportModal(true)
              }}
              className="px-4 py-2.5 rounded-2xl bg-[#E0F2FE] hover:bg-[#BAE6FD] border border-[#7DD3FC] text-[#0284C7] font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <FileText className="w-3.5 h-3.5" />
              Relatório de Reavaliação
            </button>
            <button
              onClick={handleReopenIntervention}
              disabled={loading}
              className="px-4 py-2.5 rounded-2xl bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#7C3AED] font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reabrir Acompanhamento
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border-2 border-[#D8E5E7] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#FEF8EC] text-[#B8871E] border border-[#FDE68A] font-black text-xs">
                ℹ️ Paciente em Fase de Avaliação
              </span>
            </div>
            <h3 className="text-lg font-black text-[#0D2329]">
              Etapa de Intervenção Psicopedagógica
            </h3>
            <p className="text-xs font-semibold text-[#6B7C83]">
              Recomendamos concluir a avaliação e finalizar o relatório antes de iniciar a intervenção.
            </p>
          </div>
          <button
            onClick={() => setShowStartModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <span>Iniciar Intervenção</span>
          </button>
        </div>
      )}

      {/* ── 2. SEÇÃO PRINCIPAL: ÁREAS DE INTERVENÇÃO (ESQUERDA) + RESUMO & METAS (DIREITA) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* COLUNA ESQUERDA: ÁREAS DE INTERVENÇÃO & MAPA DE HABILIDADES (2/3) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#EDE9FE] border border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center shrink-0">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0D2329]">
                    Áreas de Intervenção & Mapa de Habilidades
                  </h3>
                  <p className="text-xs font-semibold text-[#6B7C83]">
                    Defina quais áreas trabalhar nesta criança. As áreas com <strong>[Na Aula]</strong> geram os campos na aula de intervenção.
                  </p>
                </div>
              </div>
              <div className="text-xs font-bold text-[#7C3AED] bg-[#EDE9FE] px-3 py-1.5 rounded-2xl border border-[#DDD6FE] self-start sm:self-auto">
                {configuredAreas.length} {configuredAreas.length === 1 ? "área ativa para aulas" : "áreas ativas para aulas"}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SKILL_AREAS.map((area) => {
                const areaGoals = goals.filter((g) => g.area === area.name)
                const areaAchieved = areaGoals.filter((g) => g.status === "achieved").length
                const areaInProgress = areaGoals.filter((g) => g.status === "in_progress").length
                const isFiltered = areaFilter === area.name
                const isConfigured = configuredAreas.includes(area.name)

                return (
                  <div
                    key={area.name}
                    onClick={() => setAreaFilter(isFiltered ? null : area.name)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isFiltered
                        ? "border-[#EA580C] ring-2 ring-[#EA580C]/20 " + area.color
                        : area.color + " hover:border-[#EA580C]/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl">{area.icon}</span>
                        <span className="text-xs font-black leading-tight text-[#0D2329]">
                          {area.name}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleConfiguredArea(area.name)
                        }}
                        title={isConfigured ? "Clique para desativar dos campos de aula" : "Clique para ativar nos campos de aula"}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shrink-0 border ${
                          isConfigured
                            ? "bg-[#10B981] text-white border-[#059669] shadow-xs"
                            : "bg-white/80 text-[#6B7C83] border-[#D8E5E7] hover:bg-white hover:text-[#0D2329]"
                        }`}
                      >
                        {isConfigured ? (
                          <>
                            <CheckSquare className="w-3 h-3 stroke-[3]" />
                            <span>Na Aula</span>
                          </>
                        ) : (
                          <>
                            <Square className="w-3 h-3" />
                            <span>+ Ativar</span>
                          </>
                        )}
                      </button>
                    </div>

                    {areaGoals.length === 0 ? (
                      <p className="text-[10px] font-semibold opacity-60">Nenhuma meta cadastrada · Clique no card para filtrar</p>
                    ) : (
                      <p className="text-[10px] font-semibold opacity-80">
                        {areaInProgress > 0 && `${areaInProgress} em andamento`}
                        {areaInProgress > 0 && areaAchieved > 0 && " · "}
                        {areaAchieved > 0 && `${areaAchieved} atingida${areaAchieved !== 1 ? "s" : ""}`}
                        {areaInProgress === 0 && areaAchieved === 0 && `${areaGoals.length} não iniciada${areaGoals.length !== 1 ? "s" : ""}`}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: RESUMO (TOP) + OBJETIVOS & METAS (BOTTOM) (1/3) */}
        <div className="space-y-6">
          {/* 1. RESUMO DO ACOMPANHAMENTO */}
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-black uppercase text-[#0D2329] tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#EA580C]" />
              Resumo do Acompanhamento
            </h4>

            {/* Metas */}
            <div className="space-y-1.5">
              <p className="text-xs font-black text-[#0D2329]">
                Metas: <span className="text-[#EA580C]">{goals.length} cadastrada{goals.length !== 1 ? "s" : ""}</span>
              </p>
              <div className="space-y-1 pl-1">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[#6B7C83]">
                  <span>🟢</span>
                  <span>{achieved} atingida{achieved !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[#6B7C83]">
                  <span>🟠</span>
                  <span>{inProgress} em andamento</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[#6B7C83]">
                  <span>⚪</span>
                  <span>{notStarted} não iniciada{notStarted !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[#EEF5F6]" />

            {/* Sessões */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#7C3AED] shrink-0" />
              <div>
                <p className="text-xs font-black text-[#0D2329]">Sessões realizadas</p>
                <p className="text-lg font-black text-[#7C3AED]">{sessionCount}</p>
              </div>
            </div>

            <div className="border-t border-[#EEF5F6]" />

            {/* Próxima sessão */}
            <div className="flex items-start gap-2">
              <CalendarCheck className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-[#0D2329]">Próxima sessão</p>
                {nextSession ? (
                  <p className="text-xs font-semibold text-[#065F46] mt-0.5">
                    {nextSession.date} às {nextSession.time}
                  </p>
                ) : (
                  <p className="text-[11px] font-semibold text-[#8CAAB1] mt-0.5">
                    Não há próxima sessão agendada.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 2. OBJETIVOS & METAS DO PLANO DE INTERVENÇÃO */}
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] text-[#EA580C] flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-black text-[#0D2329] truncate">
                    Metas do Plano
                  </h4>
                  <p className="text-[11px] font-semibold text-[#6B7C83] truncate">
                    {areaFilter ? (
                      <span>
                        Filtro: <strong>{areaFilter}</strong> —{" "}
                        <button
                          onClick={() => setAreaFilter(null)}
                          className="text-[#EA580C] underline cursor-pointer"
                        >
                          todas
                        </button>
                      </span>
                    ) : (
                      `${goals.length} cadastrada${goals.length !== 1 ? "s" : ""}`
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { resetGoalForm(); setEditingGoal(null); setShowAddGoalModal(true) }}
                className="text-xs font-black text-[#EA580C] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>

            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-0.5">
              {filteredGoals.length === 0 ? (
                <div className="p-5 text-center rounded-2xl border border-dashed border-[#D8E5E7] bg-[#F8FAFB] text-xs font-semibold text-[#8CAAB1]">
                  {areaFilter
                    ? "Nenhuma meta nesta área ainda."
                    : "Nenhuma meta cadastrada. Clique em \"Adicionar\" para começar."}
                </div>
              ) : (
                filteredGoals.map((g) => {
                  const s = statusLabel(g.status)
                  return (
                    <div
                      key={g.id}
                      className="p-3.5 rounded-2xl border-2 border-[#EEF5F6] hover:border-[#EA580C]/30 bg-white transition-all flex items-start justify-between gap-2 shadow-2xs group"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {/* Status toggle button */}
                        <button
                          type="button"
                          onClick={() => handleToggleGoalStatus(g)}
                          title="Clique para avançar o status"
                          className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 text-xs font-black ${
                            g.status === "achieved"
                              ? "bg-[#10B981] text-white"
                              : g.status === "in_progress"
                              ? "bg-[#FED7AA] text-[#C2410C]"
                              : "bg-[#F3F4F6] text-[#9CA3AF] border border-[#D1D5DB]"
                          }`}
                        >
                          {g.status === "achieved" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-current" />
                          )}
                        </button>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-[#0D2329] leading-snug break-words">
                              {g.title}
                            </span>
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-[#F8FAFB] text-[#6B7C83] border border-[#D8E5E7]">
                              {g.area}
                            </span>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${s.cls}`}>
                              {s.emoji} {s.text}
                            </span>
                          </div>
                          {g.strategy && (
                            <p className="text-[11px] text-[#6B7C83] italic break-words">
                              Estratégia: {g.strategy}
                            </p>
                          )}
                          {g.started_at && (
                            <p className="text-[10px] text-[#8CAAB1]">
                              Iniciada em: {formatDate(g.started_at)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditGoal(g)}
                          className="p-1 rounded-lg text-[#8CAAB1] hover:text-[#EA580C] hover:bg-[#FFF7ED] transition-colors cursor-pointer"
                          title="Editar meta"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGoal(g.id)}
                          className="p-1 rounded-lg text-[#8CAAB1] hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Excluir meta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SEÇÃO: RELATÓRIOS DE REAVALIAÇÃO PÓS-INTERVENÇÃO ── */}
      {interventionReports.length > 0 ? (
        <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF5F6] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E0F2FE] border border-[#7DD3FC] text-[#0284C7] flex items-center justify-center font-black shrink-0 shadow-2xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#0D2329]">
                  Relatórios de Reavaliação Psicopedagógica ({interventionReports.length})
                </h3>
                <p className="text-xs font-semibold text-[#6B7C83]">
                  Documentos evolutivos de 11 páginas com Semáforo de Desempenho e parecer com IA salvos no prontuário.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedReportId(undefined)
                setShowInterventionReportModal(true)
              }}
              className="px-4 py-2.5 rounded-2xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Novo Relatório de Reavaliação</span>
            </button>
          </div>

          <div className="space-y-3">
            {interventionReports.map((rep) => {
              const c = (rep.content || {}) as any
              const diag = c.patient?.previousDiagnosis || "TDAH"
              const period = rep.title || `Reavaliação (${formatDate(rep.created_at)})`

              return (
                <div
                  key={rep.id}
                  className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFB] border-2 border-[#D8E5E7] hover:border-[#0284C7] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-[#E0F2FE] border border-[#BAE6FD] text-[#0284C7] flex items-center justify-center font-black shrink-0 shadow-2xs">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs sm:text-sm font-black text-[#0D2329] truncate">
                          {period}
                        </p>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                          ✓ 11 Páginas • Salvo no Prontuário
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-[#6B7C83] flex items-center gap-2 flex-wrap">
                        <span>Diagnóstico Base: <strong>{diag}</strong></span>
                        <span>•</span>
                        <span>Criado em: <strong>{formatDate(rep.created_at)}</strong></span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={async () => {
                        const toastId = toast.loading("Gerando arquivo Word (.docx)...")
                        try {
                          const doc = await buildInterventionDocxReport(rep.content as any)
                          const filename = `Reavaliacao_${child.full_name.replace(/\s+/g, "_")}.docx`
                          await downloadInterventionDocxReport(doc, filename)
                          toast.success("Relatório baixado em Word!", { id: toastId })
                        } catch (e: any) {
                          toast.error("Erro ao baixar documento: " + (e?.message || ""), { id: toastId })
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] hover:border-[#16A34A] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                      title="Baixar em Word (.docx)"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar Word (.docx)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReportId(rep.id)
                        setShowInterventionReportModal(true)
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F0F9FF] text-[#0284C7] border border-[#BAE6FD] hover:border-[#0284C7] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                      title="Editar este relatório"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteReassessmentReport(rep.id)}
                      className="p-2 rounded-xl text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2] border border-transparent hover:border-[#FECACA] transition-all cursor-pointer"
                      title="Excluir este relatório"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-[#F0F9FF] to-[#E0F2FE] border-2 border-[#BAE6FD] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#0284C7]/10 text-[#0284C7] font-black text-[11px] inline-flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              Documentação Clínica Oficial
            </span>
            <h4 className="text-base font-black text-[#0369A1]">
              Relatório de Reavaliação Psicopedagógica (Pós-Intervenção)
            </h4>
            <p className="text-xs font-semibold text-[#6B7C83] max-w-2xl">
              Gere o documento oficial de 11 páginas com Semáforo de Alfabetização, tabelas de testes (Trilhas, Span de Dígitos, TIN, Audibilização) e Parecer Evolutivo formulado com IA.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedReportId(undefined)
              setShowInterventionReportModal(true)
            }}
            className="px-5 py-3 rounded-2xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-black flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <FileText className="w-4 h-4" />
            <span>Criar Relatório de Reavaliação</span>
          </button>
        </div>
      )}

      {/* ── 3. HISTÓRICO DE AULAS DE INTERVENÇÃO ───────────── */}
      <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#EDE9FE] border border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#0D2329]">
                Histórico de Aulas de Intervenção ({interventionSessions.length})
              </h3>
              <p className="text-xs font-semibold text-[#6B7C83]">
                Atendimentos realizados com registros específicos de cada habilidade trabalhada.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/atendimento/intervencao/nova/${child.id}`)}
            className="h-9 px-4 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            + Nova Aula de Intervenção
          </button>
        </div>

        {interventionSessions.length === 0 ? (
          <div className="p-8 rounded-2xl border-2 border-dashed border-[#D8E5E7] bg-[#F7FAFA] text-center space-y-2">
            <p className="text-xs font-bold text-[#0D2329]">
              Nenhuma aula de intervenção registrada ainda para {childName}.
            </p>
            <p className="text-[11px] text-[#6B7C83]">
              Ao iniciar um atendimento desta fase, todas as notas de jogos, respostas da criança e comportamento ficarão organizados aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {interventionSessions.map((session, index) => {
              const sessionNum = session.session_number || interventionSessions.length - index
              const areas = session.intervention_session_areas || []

              return (
                <div
                  key={session.id}
                  className="p-5 rounded-2xl border-2 border-[#EEF5F6] hover:border-[#7C3AED]/30 bg-white transition-all shadow-2xs space-y-3"
                >
                  {/* Session Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#F0F5F6]">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE]">
                        Aula #{sessionNum}
                      </span>
                      <span className="text-xs font-bold text-[#0D2329]">
                        {formatDate(session.date)}
                      </span>
                      {session.start_time && (
                        <span className="text-xs font-medium text-[#6B7C83]">
                          às {session.start_time}
                        </span>
                      )}
                    </div>

                    {session.behavior && (
                      <span className="text-xs font-bold px-3 py-1 rounded-xl bg-[#F7FAFA] border border-[#E2ECEE] text-[#4B5563]">
                        {session.behavior}
                      </span>
                    )}
                  </div>

                  {/* Areas worked */}
                  {areas.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-black uppercase text-[#6B7C83] tracking-wider">
                        Habilidades Trabalhadas:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {areas.map((a: any) => (
                          <div
                            key={a.id || a.area}
                            className="p-3 rounded-xl bg-[#F8FAFB] border border-[#E2ECEE] text-xs space-y-1.5"
                          >
                            <span className="font-black text-[#0D2329] block">
                              📌 {a.area}
                            </span>
                            {a.what_was_worked && (
                              <p className="text-[#4B5563]">
                                <strong className="text-[#0D2329]">Trabalhado:</strong> {a.what_was_worked}
                              </p>
                            )}
                            {a.child_response && (
                              <p className="text-[#0369A1]">
                                <strong className="text-[#0369A1]">Resposta:</strong> {a.child_response}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* General notes or recommendation */}
                  {(session.general_notes || session.family_recommendation || session.next_session_plan) && (
                    <div className="pt-2 border-t border-[#F0F5F6] flex flex-col gap-1.5 text-xs text-[#4B5563]">
                      {session.general_notes && (
                        <p>
                          <strong className="text-[#0D2329]">Observações:</strong> {session.general_notes}
                        </p>
                      )}
                      {session.family_recommendation && (
                        <p className="text-[#B8871E] font-medium bg-[#FEF8EC] p-2.5 rounded-xl border border-[#FDE68A]">
                          <strong>Recado para a Família:</strong> {session.family_recommendation}
                        </p>
                      )}
                      {session.next_session_plan && (
                        <p className="text-[#6B7C83] italic">
                          <strong>Próxima Aula:</strong> {session.next_session_plan}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Anexos e Fotos da Aula */}
                  {session.attachments && Array.isArray(session.attachments) && session.attachments.length > 0 && (
                    <div className="pt-2 border-t border-[#F0F5F6] space-y-2">
                      <p className="text-[11px] font-black uppercase text-[#6B7C83] tracking-wider flex items-center gap-1.5">
                        <span>📸 Anexos & Fotos ({session.attachments.length}):</span>
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {session.attachments.map((att: any, attIdx: number) => {
                          const isImg =
                            att.file_type &&
                            ["png", "jpg", "jpeg", "webp", "gif"].includes(
                              att.file_type.toLowerCase()
                            )
                          return (
                            <a
                              key={att.id || attIdx}
                              href={att.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="group flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-[#F8FAFB] hover:bg-[#EDE9FE] border border-[#D8E5E7] hover:border-[#7C3AED] transition-all text-xs font-bold text-[#0D2329]"
                            >
                              {isImg ? (
                                <img
                                  src={att.file_url}
                                  alt={att.file_name}
                                  className="w-8 h-8 rounded-lg object-cover border border-[#D8E5E7]"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center text-[10px] font-black">
                                  PDF
                                </div>
                              )}
                              <span className="truncate max-w-[160px]">{att.file_name}</span>
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>


      {/* ══════════════════════════════════════════════════════
          MODAIS
      ══════════════════════════════════════════════════════ */}

      {/* Modal: Iniciar Intervenção */}
      <Dialog open={showStartModal} onOpenChange={(open) => !open && setShowStartModal(false)}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-2 border-[#D8E5E7] bg-white shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-[#EEF5F6] flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] text-[#EA580C] border-2 border-[#FED7AA] flex items-center justify-center shrink-0 font-black text-xl">
              🚀
            </div>
            <div>
              <DialogTitle className="text-base font-black text-[#0D2329]">
                Iniciar Intervenção Psicopedagógica
              </DialogTitle>
              <p className="text-xs font-semibold text-[#6B7C83] mt-0.5">
                Paciente: <strong>{childName}</strong>
              </p>
            </div>
          </DialogHeader>
          <DialogBody className="p-6 space-y-3.5 text-xs text-[#0D2329] leading-relaxed">
            <p>
              Ao confirmar, o status do paciente será atualizado para:
            </p>
            <div className="p-3 rounded-2xl bg-[#FFF7ED] border-2 border-[#FED7AA] text-center font-black text-[#C2410C] text-sm">
              🟠 Em Intervenção
            </div>
            <p className="text-[#6B7C83]">
              Isso indica que a avaliação diagnóstica foi finalizada e você está iniciando o acompanhamento clínico e estimulação das habilidades.
            </p>
          </DialogBody>
          <DialogFooter className="p-6 pt-4 border-t border-[#EEF5F6] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowStartModal(false)}
              className="px-4 py-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#6B7C83] hover:bg-[#F8FAFB] transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleStartIntervention}
              disabled={loading}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#EA580C] to-[#F97316] hover:from-[#C2410C] hover:to-[#EA580C] text-white font-black text-xs shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? "Iniciando..." : "Confirmar e Iniciar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Encerrar Acompanhamento */}
      <Dialog open={showCloseModal} onOpenChange={(open) => !open && setShowCloseModal(false)}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-2 border-[#D8E5E7] bg-white shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-[#EEF5F6] flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F8FAFB] text-[#6B7C83] border-2 border-[#D8E5E7] flex items-center justify-center shrink-0 font-black text-xl">
              ⚪
            </div>
            <div>
              <DialogTitle className="text-base font-black text-[#0D2329]">
                Encerrar Acompanhamento
              </DialogTitle>
              <p className="text-xs font-semibold text-[#6B7C83] mt-0.5">
                Paciente: <strong>{childName}</strong>
              </p>
            </div>
          </DialogHeader>
          <DialogBody className="p-6 space-y-4 text-xs text-[#0D2329]">
            <div className="p-3 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] font-semibold text-center">
              Tem certeza que deseja encerrar o acompanhamento de <strong>{childName}</strong>?
            </div>
            <p className="text-[#6B7C83] leading-relaxed">
              Todos os dados serão preservados — entrevista, avaliações, sessões, metas, documentos e histórico completo. Você poderá reabrir o acompanhamento quando necessário.
            </p>

            <div className="space-y-1">
              <label className="font-black text-[#0D2329]">Motivo do encerramento (opcional)</label>
              <textarea
                rows={2}
                placeholder="Ex: Alta clínica por alcance pleno dos objetivos..."
                value={closingReason}
                onChange={(e) => setClosingReason(e.target.value)}
                className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-black text-[#0D2329]">Data de encerramento</label>
              <input
                type="date"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-black text-[#0D2329]">Observação final (opcional)</label>
              <textarea
                rows={2}
                placeholder="Ex: Paciente evoluiu significativamente em todas as áreas trabalhadas..."
                value={closingObs}
                onChange={(e) => setClosingObs(e.target.value)}
                className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] resize-none"
              />
            </div>
          </DialogBody>
          <DialogFooter className="p-6 pt-4 border-t border-[#EEF5F6] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowCloseModal(false)}
              className="px-4 py-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#6B7C83] hover:bg-[#F8FAFB] transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCloseIntervention}
              disabled={loading}
              className="px-5 py-2.5 rounded-2xl bg-[#6B7C83] hover:bg-[#4B5563] text-white font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer"
            >
              {loading ? "Encerrando..." : "Confirmar Encerramento"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Adicionar / Editar Meta */}
      <Dialog
        open={showAddGoalModal}
        onOpenChange={(open) => { if (!open) { setShowAddGoalModal(false); setEditingGoal(null); resetGoalForm() } }}
      >
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-2 border-[#D8E5E7] bg-white shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-[#EEF5F6] flex items-center justify-between">
            <DialogTitle className="text-base font-black text-[#0D2329]">
              {editingGoal ? "Editar Meta" : "Nova Meta de Intervenção"}
            </DialogTitle>
            <button
              type="button"
              onClick={() => { setShowAddGoalModal(false); setEditingGoal(null); resetGoalForm() }}
              className="text-[#8CAAB1] hover:text-[#0D2329] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </DialogHeader>
          <form onSubmit={handleSaveGoal}>
            <DialogBody className="p-6 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-black text-[#0D2329]">Objetivo / Meta *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Automatização da leitura de dígrafos..."
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#EA580C]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-black text-[#0D2329]">Área / Eixo</label>
                <select
                  value={goalForm.area}
                  onChange={(e) => setGoalForm({ ...goalForm, area: e.target.value })}
                  className="w-full p-2.5 rounded-xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#EA580C]"
                >
                  {SKILL_AREAS.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.icon} {a.name}
                    </option>
                  ))}
                  <option value="Outros">Outro eixo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-black text-[#0D2329]">Estratégia de Intervenção (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Jogos de rima, leitura compartilhada..."
                  value={goalForm.strategy}
                  onChange={(e) => setGoalForm({ ...goalForm, strategy: e.target.value })}
                  className="w-full p-2.5 rounded-xl border-2 border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#EA580C]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-black text-[#0D2329]">Status</label>
                <div className="flex gap-2">
                  {(["not_started", "in_progress", "achieved"] as InterventionGoalStatus[]).map((s) => {
                    const sl = statusLabel(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setGoalForm({ ...goalForm, status: s })}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black border-2 transition-all cursor-pointer ${
                          goalForm.status === s
                            ? "border-[#EA580C] bg-[#FFF7ED] text-[#EA580C]"
                            : "border-[#D8E5E7] text-[#6B7C83] hover:border-[#EA580C]/40"
                        }`}
                      >
                        {sl.emoji} {sl.text}
                      </button>
                    )
                  })}
                </div>
              </div>
            </DialogBody>
            <DialogFooter className="p-6 pt-4 border-t border-[#EEF5F6] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => { setShowAddGoalModal(false); setEditingGoal(null); resetGoalForm() }}
                className="px-4 py-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#6B7C83] hover:bg-[#F8FAFB] transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer"
              >
                {loading ? "Salvando..." : editingGoal ? "Salvar Alterações" : "Adicionar Meta"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assistente de Relatório de Reavaliação Pós-Intervenção */}
      <InterventionReportBuilderModal
        isOpen={showInterventionReportModal}
        reportId={selectedReportId}
        onClose={() => {
          setShowInterventionReportModal(false)
          setSelectedReportId(undefined)
        }}
        child={child}
        onSaved={() => {
          loadData()
          if (onReloadChild) onReloadChild()
        }}
      />

    </div>
  )
}
