import { useState, useEffect } from "react"
import {
  Brain,
  Target,
  Sparkles,
  CheckCircle2,
  Calendar,
  Activity,
  Plus,
  ArrowRight,
  Clock,
  BookOpen,
  Award,
  Layers,
  FileCheck,
  Flame,
  Lightbulb,
  Lock,
  ChevronRight,
  HeartHandshake,
  School,
  Home,
  FileText,
  AlertCircle,
  RotateCcw,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { formatDate } from "@/lib/utils"
import toast from "react-hot-toast"
import type { Child } from "@/types/database"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/Dialog"

interface ChildInterventionTabProps {
  child: Child
  childName?: string
  onReloadChild: () => void
  onNavigateTab?: (tab: string) => void
}

interface InterventionGoal {
  id: string
  title: string
  area: string
  status: "not_started" | "in_progress" | "achieved"
  notes?: string
}

const DEFAULT_SKILL_PILLARS = [
  { name: "Leitura & Decodificação", icon: "📖", color: "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]" },
  { name: "Compreensão Textual", icon: "💡", color: "bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE]" },
  { name: "Escrita & Ortografia", icon: "✍️", color: "bg-[#FEF8EC] text-[#B8871E] border-[#FDE68A]" },
  { name: "Raciocínio Matemático", icon: "🔢", color: "bg-[#E8F8F5] text-[#065F46] border-[#A7F3D0]" },
  { name: "Atenção & Concentração", icon: "🎯", color: "bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]" },
  { name: "Funções Executivas & Memória", icon: "🧠", color: "bg-[#FDF2F8] text-[#BE185D] border-[#FBCFE8]" },
]

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

  const [loading, setLoading] = useState(false)
  const [showStartModal, setShowStartModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showAddGoalModal, setShowAddGoalModal] = useState(false)
  const [closingReason, setClosingReason] = useState("")

  // Saved or custom goals in localStorage per child
  const [goals, setGoals] = useState<InterventionGoal[]>(() => {
    const saved = localStorage.getItem(`evoluia_intervention_goals_${child.id}`)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        return []
      }
    }
    return [
      {
        id: "1",
        title: "Desenvolvimento da consciência fonológica e segmentação",
        area: "Leitura & Decodificação",
        status: "in_progress",
        notes: "Estimulação com jogos de rima e aliteração",
      },
      {
        id: "2",
        title: "Aprimoramento da atenção sustentada e controle inibitório",
        area: "Funções Executivas & Memória",
        status: "in_progress",
        notes: "Atividades de mediação com tempo cronometrado",
      },
      {
        id: "3",
        title: "Compreensão de enunciados matemáticos",
        area: "Raciocínio Matemático",
        status: "not_started",
        notes: "Material concreto e representação visual",
      },
    ]
  })

  const [newGoal, setNewGoal] = useState({
    title: "",
    area: "Leitura & Decodificação",
    status: "in_progress" as "not_started" | "in_progress" | "achieved",
    notes: "",
  })

  useEffect(() => {
    localStorage.setItem(`evoluia_intervention_goals_${child.id}`, JSON.stringify(goals))
  }, [goals, child.id])

  // Iniciar Intervenção
  async function handleStartIntervention() {
    if (!profId) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from("children")
        .update({
          status: "in_intervention",
          updated_at: new Date().toISOString(),
        })
        .eq("id", child.id)

      if (error) throw error
      toast.success("🚀 Intervenção Psicopedagógica iniciada com sucesso!", { icon: "🧠" })
      setShowStartModal(false)
      onReloadChild()
    } catch (err: any) {
      toast.error(err?.message || "Erro ao iniciar intervenção.")
    } finally {
      setLoading(false)
    }
  }

  // Encerrar Acompanhamento
  async function handleCloseIntervention() {
    if (!profId) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from("children")
        .update({
          status: "closed",
          notes: closingReason
            ? `${child.notes ? child.notes + "\n" : ""}[Alta/Encerramento]: ${closingReason}`
            : child.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", child.id)

      if (error) throw error
      toast.success("Acompanhamento encerrado com sucesso!", { icon: "⚪" })
      setShowCloseModal(false)
      onReloadChild()
    } catch (err: any) {
      toast.error(err?.message || "Erro ao encerrar acompanhamento.")
    } finally {
      setLoading(false)
    }
  }

  // Reabrir Acompanhamento
  async function handleReopenIntervention() {
    if (!profId) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from("children")
        .update({
          status: "in_intervention",
          updated_at: new Date().toISOString(),
        })
        .eq("id", child.id)

      if (error) throw error
      toast.success("Acompanhamento reaberto em Intervenção!", { icon: "🟠" })
      onReloadChild()
    } catch (err: any) {
      toast.error(err?.message || "Erro ao reabrir acompanhamento.")
    } finally {
      setLoading(false)
    }
  }

  function handleAddGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!newGoal.title.trim()) return
    const goalItem: InterventionGoal = {
      id: Date.now().toString(),
      title: newGoal.title.trim(),
      area: newGoal.area,
      status: newGoal.status,
      notes: newGoal.notes.trim() || undefined,
    }
    setGoals((prev) => [...prev, goalItem])
    setNewGoal({
      title: "",
      area: "Leitura & Decodificação",
      status: "in_progress",
      notes: "",
    })
    setShowAddGoalModal(false)
    toast.success("Meta adicionada ao plano de intervenção!")
  }

  function handleToggleGoalStatus(id: string) {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g
        const nextStatus =
          g.status === "not_started"
            ? "in_progress"
            : g.status === "in_progress"
            ? "achieved"
            : "in_progress"
        return { ...g, status: nextStatus }
      })
    )
  }

  function handleDeleteGoal(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id))
    toast.success("Meta removida.")
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* ── 1. STATUS & STAGE HERO BANNER ─────────────────────────── */}
      {isInterventionActive ? (
        <div className="bg-gradient-to-r from-[#EA580C] via-[#F97316] to-[#FB923C] rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3.5 py-1 rounded-full bg-white/20 text-white font-black text-xs backdrop-blur-xs flex items-center gap-1.5 shadow-2xs">
                🟠 Fase Ativa: Em Intervenção Psicopedagógica
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Plano de Intervenção e Estimulação
            </h2>
            <p className="text-xs sm:text-sm font-medium text-white/90 max-w-2xl">
              Nesta etapa, o foco é o desenvolvimento das habilidades cognitivas, funções executivas e superação das dificuldades levantadas na avaliação.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => setShowAddGoalModal(true)}
              className="h-10 px-4 rounded-2xl bg-white text-[#EA580C] font-black text-xs flex items-center gap-1.5 shadow-md hover:bg-[#FFF7ED] active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Nova Meta</span>
            </button>

            <button
              onClick={() => setShowCloseModal(true)}
              className="h-10 px-3.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-black text-xs border border-white/30 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="Encerrar acompanhamento do paciente"
            >
              <span>Encerrar Acompanhamento</span>
            </button>
          </div>
        </div>
      ) : isReportCompleted ? (
        <div className="bg-gradient-to-r from-[#065F46] via-[#10B981] to-[#059669] rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3.5 py-1 rounded-full bg-white/20 text-white font-black text-xs backdrop-blur-xs flex items-center gap-1.5 shadow-2xs">
                🟢 Relatório Finalizado
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Avaliação Concluída! Pronto para Intervenção
            </h2>
            <p className="text-xs sm:text-sm font-medium text-white/90 max-w-2xl">
              O laudo psicopedagógico foi finalizado. Inicie a etapa de intervenção para começar o trabalho direcionado de estimulação e acompanhamento.
            </p>
          </div>

          <button
            onClick={() => setShowStartModal(true)}
            className="h-12 px-6 rounded-2xl bg-white text-[#065F46] hover:bg-[#E8F8F5] font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#F59E0B]" />
            <span>🚀 Iniciar Intervenção</span>
          </button>
        </div>
      ) : isClosed ? (
        <div className="bg-white border-2 border-[#D8E5E7] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full bg-[#F8FAFB] text-[#6B7C83] border border-[#D8E5E7] font-black text-xs">
              ⚪ Acompanhamento Encerrado
            </span>
            <h3 className="text-lg font-black text-[#0D2329] pt-1">
              O ciclo de acompanhamento deste paciente foi finalizado.
            </h3>
            <p className="text-xs font-semibold text-[#6B7C83]">
              Todos os registros de anamnese, avaliação, laudos e intervenções permanecem arquivados com segurança.
            </p>
          </div>
          <button
            onClick={handleReopenIntervention}
            disabled={loading}
            className="px-4 py-2.5 rounded-2xl bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#7C3AED] font-black text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reabrir Acompanhamento</span>
          </button>
        </div>
      ) : (
        <div className="bg-[#FEF8EC] border-2 border-[#FDE68A] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full bg-white text-[#B8871E] border border-[#FDE68A] font-black text-xs">
              ℹ️ Paciente em Fase de Avaliação
            </span>
            <h3 className="text-lg font-black text-[#0D2329] pt-1">
              Etapa de Intervenção Psicopedagógica
            </h3>
            <p className="text-xs font-semibold text-[#6B7C83]">
              Recomendamos concluir a avaliação e finalizar o relatório antes de iniciar a intervenção. Se preferir, você pode iniciar o acompanhamento agora.
            </p>
          </div>
          <button
            onClick={() => setShowStartModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white font-black text-xs flex items-center gap-1.5 shadow-md hover:from-[#C2410C] hover:to-[#EA580C] transition-all shrink-0 cursor-pointer"
          >
            <span>🚀 Iniciar Intervenção</span>
          </button>
        </div>
      )}

      {/* ── 2. GRID ESTRUTURAL DA INTERVENÇÃO ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA ESQUERDA (2/3): METAS E OBJETIVOS CLÍNICOS */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card de Metas e Objetivos */}
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] text-[#EA580C] flex items-center justify-center font-bold">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0D2329]">
                    Objetivos & Metas do Plano de Intervenção
                  </h3>
                  <p className="text-xs font-semibold text-[#6B7C83]">
                    Habilidades e metas específicas traçadas para <strong>{childName}</strong>.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddGoalModal(true)}
                className="text-xs font-black text-[#EA580C] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Meta</span>
              </button>
            </div>

            {/* Lista de Metas */}
            <div className="space-y-2.5 pt-1">
              {goals.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-[#D8E5E7] bg-[#F8FAFB] text-xs font-semibold text-[#8CAAB1]">
                  Nenhuma meta cadastrada ainda. Clique em "+ Nova Meta" para estruturar o plano.
                </div>
              ) : (
                goals.map((g) => (
                  <div
                    key={g.id}
                    className="p-4 rounded-2xl border-2 border-[#EEF5F6] hover:border-[#EA580C]/30 bg-white transition-all flex items-start justify-between gap-3 shadow-2xs group"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleGoalStatus(g.id)}
                        className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                          g.status === "achieved"
                            ? "bg-[#10B981] text-white"
                            : g.status === "in_progress"
                            ? "bg-[#FED7AA] text-[#C2410C]"
                            : "bg-[#F3F4F6] text-[#9CA3AF] border border-[#D1D5DB]"
                        }`}
                        title="Clique para alternar status da meta"
                      >
                        {g.status === "achieved" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-current" />
                        )}
                      </button>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-[#0D2329] leading-snug">
                            {g.title}
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#F8FAFB] text-[#6B7C83] border border-[#D8E5E7]">
                            {g.area}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              g.status === "achieved"
                                ? "bg-[#E8F8F5] text-[#065F46] border border-[#A7F3D0]"
                                : g.status === "in_progress"
                                ? "bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]"
                                : "bg-[#F3F4F6] text-[#6B7C83] border border-[#E5E7EB]"
                            }`}
                          >
                            {g.status === "achieved"
                              ? "✅ Concluída"
                              : g.status === "in_progress"
                              ? "⚡ Em Estimulação"
                              : "⏳ A Iniciar"}
                          </span>
                        </div>
                        {g.notes && (
                          <p className="text-[11px] text-[#6B7C83] italic">
                            Estratégia: {g.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(g.id)}
                      className="text-[#8DA3A8] hover:text-red-600 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Excluir meta"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card de Pilares e Habilidades Trabalhadas */}
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-6 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#EDE9FE] border border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center font-bold">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#0D2329]">
                  Habilidades & Eixos de Desenvolvimento
                </h3>
                <p className="text-xs font-semibold text-[#6B7C83]">
                  Áreas centrais estimuladas nos atendimentos de intervenção.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {DEFAULT_SKILL_PILLARS.map((skill, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border-2 flex items-center gap-2.5 ${skill.color}`}
                >
                  <span className="text-lg">{skill.icon}</span>
                  <span className="text-xs font-black">{skill.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA (1/3): ATALHOS, ORIENTAÇÕES E EVOLUÇÃO */}
        <div className="space-y-6">
          {/* Card de Ações Rápidas de Sessões */}
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-black uppercase text-[#0D2329] tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#EA580C]" />
              <span>Sessões de Intervenção</span>
            </h4>
            <p className="text-xs font-medium text-[#6B7C83] leading-relaxed">
              Diferente das sessões de avaliação diagnóstica, os atendimentos de intervenção focam na estimulação contínua e registro do avanço pedagógico.
            </p>
            <div className="pt-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onNavigateTab?.("sessoes")}
                className="w-full py-2.5 px-4 rounded-2xl bg-[#F8FAFB] hover:bg-[#EDE9FE] text-[#7C3AED] border-2 border-[#D8E5E7] text-xs font-black flex items-center justify-between transition-all cursor-pointer shadow-2xs"
              >
                <span>Ver Prontuário de Sessões</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab?.("relatorios")}
                className="w-full py-2.5 px-4 rounded-2xl bg-[#F8FAFB] hover:bg-[#E8F8F5] text-[#065F46] border-2 border-[#D8E5E7] text-xs font-black flex items-center justify-between transition-all cursor-pointer shadow-2xs"
              >
                <span>Consultar Laudo / Relatório</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card de Orientações Escola e Família */}
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-black uppercase text-[#0D2329] tracking-wider flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-[#F59E0B]" />
              <span>Orientações Familiares & Escolares</span>
            </h4>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-[#FEF8EC] border border-[#FDE68A] text-[#B8871E] font-semibold space-y-1">
                <p className="font-black text-[#0D2329] flex items-center gap-1">
                  <Home className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Para a Família em Casa:</span>
                </p>
                <p className="text-[11px]">Rotina de leitura diária e reforço positivo durante tarefas.</p>
              </div>

              <div className="p-3 rounded-xl bg-[#E0F2FE] border border-[#BAE6FD] text-[#0284C7] font-semibold space-y-1">
                <p className="font-black text-[#0D2329] flex items-center gap-1">
                  <School className="w-3.5 h-3.5 text-[#0284C7]" />
                  <span>Para os Professores:</span>
                </p>
                <p className="text-[11px]">Adaptação do tempo de prova e instruções passo a passo.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: INICIAR INTERVENÇÃO ───────────────────────────── */}
      <Dialog open={showStartModal} onOpenChange={(open) => !open && setShowStartModal(false)}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-2 border-[#D8E5E7] bg-white shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-[#EEF5F6] flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] text-[#EA580C] border-2 border-[#FED7AA] flex items-center justify-center shrink-0 shadow-xs font-black text-xl">
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
              Ao confirmar o início da intervenção, o status do paciente no sistema passará para:
            </p>
            <div className="p-3 rounded-2xl bg-[#FFF7ED] border-2 border-[#FED7AA] text-center font-black text-[#C2410C] text-sm">
              🟠 Em Intervenção
            </div>
            <p className="text-[#6B7C83]">
              Isso indica que a avaliação diagnóstica inicial foi finalizada e você está iniciando o acompanhamento clínico e estimulação das habilidades.
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
              <Sparkles className="w-4 h-4 text-white" />
              <span>{loading ? "Iniciando..." : "Confirmar e Iniciar Intervenção"}</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: ENCERRAR ACOMPANHAMENTO ────────────────────────── */}
      <Dialog open={showCloseModal} onOpenChange={(open) => !open && setShowCloseModal(false)}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-2 border-[#D8E5E7] bg-white shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-[#EEF5F6] flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F8FAFB] text-[#6B7C83] border-2 border-[#D8E5E7] flex items-center justify-center shrink-0 shadow-xs font-black text-xl">
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

          <DialogBody className="p-6 space-y-3.5 text-xs text-[#0D2329]">
            <p className="leading-relaxed">
              O status do paciente passará para <strong>⚪ Acompanhamento encerrado</strong>. Você poderá reabri-lo no futuro a qualquer momento.
            </p>

            <div className="space-y-1">
              <label className="font-black text-[#0D2329]">Motivo do Encerramento / Alta (Opcional):</label>
              <textarea
                rows={3}
                placeholder="Ex: Alta clínica por alcance pleno dos objetivos pedagógicos..."
                value={closingReason}
                onChange={(e) => setClosingReason(e.target.value)}
                className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
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

      {/* ── MODAL: ADICIONAR META DO PLANO ───────────────────────── */}
      <Dialog open={showAddGoalModal} onOpenChange={(open) => !open && setShowAddGoalModal(false)}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-2 border-[#D8E5E7] bg-white shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-[#EEF5F6]">
            <DialogTitle className="text-base font-black text-[#0D2329]">
              Nova Meta de Intervenção
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddGoal}>
            <DialogBody className="p-6 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-black text-[#0D2329]">Objetivo / Meta *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Automatização da leitura de dígrafos..."
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#EA580C]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-black text-[#0D2329]">Eixo / Área</label>
                <select
                  value={newGoal.area}
                  onChange={(e) => setNewGoal({ ...newGoal, area: e.target.value })}
                  className="w-full p-2.5 rounded-xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#EA580C]"
                >
                  {DEFAULT_SKILL_PILLARS.map((p, idx) => (
                    <option key={idx} value={p.name}>
                      {p.icon} {p.name}
                    </option>
                  ))}
                  <option value="Outros">Outro Eixo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-black text-[#0D2329]">Estratégia Pedagógica (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Uso do jogo Lince das Letras e cartões ilustrados"
                  value={newGoal.notes}
                  onChange={(e) => setNewGoal({ ...newGoal, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border-2 border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#EA580C]"
                />
              </div>
            </DialogBody>

            <DialogFooter className="p-6 pt-4 border-t border-[#EEF5F6] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddGoalModal(false)}
                className="px-4 py-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#6B7C83] hover:bg-[#F8FAFB] transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Salvar Meta
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
