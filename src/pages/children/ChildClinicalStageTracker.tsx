import { useState } from "react"
import {
  Check,
  ChevronRight,
  Sparkles,
  BookOpen,
  Activity,
  FileText,
  Brain,
  Edit3,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/Badge"
import toast from "react-hot-toast"
import type { Child, ChildStatus } from "@/types/database"

interface ChildClinicalStageTrackerProps {
  child: Child
  onReloadChild: () => void
  onNavigateTab?: (tab: string) => void
}

interface StageStep {
  id: number
  key: string
  label: string
  icon: string
  targetTab: string
  color: string
  activeBg: string
  activeBorder: string
  activeText: string
}

const STAGES: StageStep[] = [
  {
    id: 1,
    key: "initial_assessment",
    label: "Entrevista Inicial",
    icon: "📋",
    targetTab: "avaliacao",
    color: "#F59E0B",
    activeBg: "bg-[#FEF8EC]",
    activeBorder: "border-[#FDE68A]",
    activeText: "text-[#B8871E]",
  },
  {
    id: 2,
    key: "in_progress",
    label: "Avaliação Psicopedagógica",
    icon: "🔎",
    targetTab: "sessoes",
    color: "#0284C7",
    activeBg: "bg-[#E0F2FE]",
    activeBorder: "border-[#BAE6FD]",
    activeText: "text-[#0369A1]",
  },
  {
    id: 3,
    key: "report",
    label: "Relatório / Laudo",
    icon: "📄",
    targetTab: "relatorios",
    color: "#7C3AED",
    activeBg: "bg-[#EDE9FE]",
    activeBorder: "border-[#DDD6FE]",
    activeText: "text-[#7C3AED]",
  },
  {
    id: 4,
    key: "intervention",
    label: "Intervenção & Acompanhamento",
    icon: "🧠",
    targetTab: "intervencao",
    color: "#EA580C",
    activeBg: "bg-[#FFF7ED]",
    activeBorder: "border-[#FED7AA]",
    activeText: "text-[#C2410C]",
  },
]

export function ChildClinicalStageTracker({
  child,
  onReloadChild,
  onNavigateTab,
}: ChildClinicalStageTrackerProps) {
  const [changingStage, setChangingStage] = useState(false)

  // Determinar qual é o estágio numérico atual (1 a 4)
  let currentStageIndex = 1
  if (child.status === "initial_assessment") {
    currentStageIndex = 1
  } else if (child.status === "in_progress" || child.status === "assessment_in_progress") {
    currentStageIndex = 2
  } else if (child.status === "report_in_progress" || child.status === "report_completed") {
    currentStageIndex = 3
  } else if (
    child.status === "in_intervention" ||
    child.status === "intervention_in_progress" ||
    child.status === "closed"
  ) {
    currentStageIndex = 4
  }

  // Ação rápida: Iniciar Intervenção a partir do tracker
  async function handleQuickStartIntervention() {
    setChangingStage(true)
    try {
      let currentNotes = child.notes || ""
      if (!currentNotes.includes("[FASE:intervencao]")) {
        currentNotes = currentNotes ? `${currentNotes}\n[FASE:intervencao]` : "[FASE:intervencao]"
      }
      currentNotes = currentNotes.replace("[FASE:encerrado]", "").trim()

      let { error } = await supabase
        .from("children")
        .update({
          status: "in_intervention",
          notes: currentNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", child.id)

      if (error && error.message?.includes("enum child_status")) {
        const res = await supabase
          .from("children")
          .update({
            status: "in_progress",
            notes: currentNotes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", child.id)
        error = res.error
      }

      if (error) throw error
      toast.success("🚀 Intervenção Psicopedagógica iniciada!", { icon: "🧠" })
      onReloadChild()
      onNavigateTab?.("intervencao")
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar etapa.")
    } finally {
      setChangingStage(false)
    }
  }

  // Alteração manual de status pela profissional
  async function handleChangeStatus(newStatus: ChildStatus) {
    setChangingStage(true)
    try {
      let currentNotes = child.notes || ""
      if (newStatus === "in_intervention") {
        if (!currentNotes.includes("[FASE:intervencao]")) {
          currentNotes = currentNotes ? `${currentNotes}\n[FASE:intervencao]` : "[FASE:intervencao]"
        }
      } else {
        currentNotes = currentNotes.replace("[FASE:intervencao]", "").trim()
      }

      let { error } = await supabase
        .from("children")
        .update({
          status: newStatus,
          notes: currentNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", child.id)

      if (error && error.message?.includes("enum child_status")) {
        const fallbackStatus =
          newStatus === "closed"
            ? "closed"
            : newStatus === "paused"
            ? "paused"
            : newStatus === "archived"
            ? "archived"
            : newStatus === "initial_assessment"
            ? "initial_assessment"
            : "in_progress"

        const res = await supabase
          .from("children")
          .update({
            status: fallbackStatus,
            notes: currentNotes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", child.id)
        error = res.error
      }

      if (error) throw error
      toast.success("Etapa clínica atualizada com sucesso!")
      onReloadChild()
    } catch (e: any) {
      toast.error(e?.message || "Erro ao mudar etapa.")
    } finally {
      setChangingStage(false)
    }
  }

  return (
    <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-[#D8E5E7] shadow-sm space-y-4">
      {/* Header do Tracker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase text-[#6B7C83] tracking-wider">
            Fluxo de Acompanhamento:
          </span>
          <Badge statusKey={child.status} type="child" className="text-xs px-2.5 py-0.5" />
        </div>

        {/* Botão de Destaque Iniciar Intervenção se estiver em Relatório Finalizado */}
        {child.status === "report_completed" && (
          <button
            type="button"
            onClick={handleQuickStartIntervention}
            disabled={changingStage}
            className="h-8 px-3.5 rounded-xl bg-gradient-to-r from-[#EA580C] to-[#F97316] hover:from-[#C2410C] hover:to-[#EA580C] text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>🚀 Iniciar Intervenção</span>
          </button>
        )}
      </div>

      {/* 4 Steps Horizontal Progress Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
        {STAGES.map((stage) => {
          const isCurrent = stage.id === currentStageIndex
          const isPassed = stage.id < currentStageIndex

          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onNavigateTab?.(stage.targetTab)}
              className={`p-3 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between gap-1.5 group cursor-pointer ${
                isCurrent
                  ? `${stage.activeBg} ${stage.activeBorder} shadow-sm scale-[1.01]`
                  : isPassed
                  ? "bg-[#F8FAFB] border-[#D8E5E7] hover:border-slate-400"
                  : "bg-white border-[#EEF5F6] opacity-60 hover:opacity-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base">{stage.icon}</span>
                {isPassed ? (
                  <span className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center text-[10px] font-black shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                ) : isCurrent ? (
                  <span className="px-2 py-0.5 rounded-md bg-white font-black text-[9px] uppercase tracking-wider text-[#0D2329] border border-slate-200 shadow-2xs animate-pulse">
                    Fase Atual
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-[#8CAAB1]">
                    Etapa {stage.id}
                  </span>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold text-[#8CAAB1] uppercase tracking-wider">
                  Etapa {stage.id}
                </p>
                <h4
                  className={`text-xs font-black truncate leading-tight ${
                    isCurrent ? stage.activeText : isPassed ? "text-[#0D2329]" : "text-[#6B7C83]"
                  }`}
                >
                  {stage.label}
                </h4>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
