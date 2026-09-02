import { useState } from "react"
import { Check, Sparkles } from "lucide-react"
import { supabase } from "@/lib/supabase"
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
  shortLabel: string
  icon: string
  targetTab: string
  activeBg: string
  activeBorder: string
  activeText: string
}

const STAGES: StageStep[] = [
  {
    id: 1,
    key: "initial_assessment",
    label: "Entrevista Inicial",
    shortLabel: "Entrevista",
    icon: "📋",
    targetTab: "avaliacao",
    activeBg: "bg-[#FEF8EC]",
    activeBorder: "border-[#FDE68A]",
    activeText: "text-[#B8871E]",
  },
  {
    id: 2,
    key: "in_progress",
    label: "Avaliação Psicopedagógica",
    shortLabel: "Avaliação",
    icon: "🔎",
    targetTab: "sessoes",
    activeBg: "bg-[#E0F2FE]",
    activeBorder: "border-[#BAE6FD]",
    activeText: "text-[#0369A1]",
  },
  {
    id: 3,
    key: "report",
    label: "Relatório / Laudo",
    shortLabel: "Relatório",
    icon: "📄",
    targetTab: "relatorios",
    activeBg: "bg-[#EDE9FE]",
    activeBorder: "border-[#DDD6FE]",
    activeText: "text-[#7C3AED]",
  },
  {
    id: 4,
    key: "intervention",
    label: "Intervenção & Acompanhamento",
    shortLabel: "Intervenção",
    icon: "🧠",
    targetTab: "intervencao",
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

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {STAGES.map((stage) => {
        const isCurrent = stage.id === currentStageIndex
        const isPassed = stage.id < currentStageIndex

        return (
          <button
            key={stage.id}
            type="button"
            onClick={() => onNavigateTab?.(stage.targetTab)}
            className={`w-[88px] sm:w-[104px] p-2 sm:p-2.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between gap-1 group cursor-pointer active:scale-95 shrink-0 ${
              isCurrent
                ? `${stage.activeBg} ${stage.activeBorder} shadow-xs scale-[1.02]`
                : isPassed
                ? "bg-[#F8FAFB] border-[#D8E5E7] hover:border-[#10B981]/50 hover:bg-white"
                : "bg-[#F8FAFB]/60 border-[#EEF5F6] opacity-60 hover:opacity-100 hover:bg-white"
            }`}
            title={`Clique para ir para ${stage.label}`}
          >
            {/* Linha Superior: Emoji + Status */}
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs sm:text-sm">{stage.icon}</span>
              {isPassed ? (
                <span className="w-4 h-4 rounded-full bg-[#10B981] text-white flex items-center justify-center text-[9px] font-black shadow-2xs">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              ) : isCurrent ? (
                <span className="px-1.5 py-0.2 rounded-md bg-white font-black text-[8px] uppercase tracking-wider text-[#0D2329] border border-slate-200 shadow-2xs">
                  Atual
                </span>
              ) : (
                <span className="text-[9px] font-bold text-[#8CAAB1]">
                  #{stage.id}
                </span>
              )}
            </div>

            {/* Linha Inferior: Etapa e Nome */}
            <div className="min-w-0">
              <p className="text-[8px] font-bold text-[#8CAAB1] uppercase tracking-wider leading-none truncate">
                Etapa {stage.id}
              </p>
              <h4
                className={`text-[10px] sm:text-[11px] font-black truncate leading-tight mt-0.5 ${
                  isCurrent ? stage.activeText : isPassed ? "text-[#0D2329]" : "text-[#6B7C83]"
                }`}
              >
                {stage.shortLabel}
              </h4>
            </div>
          </button>
        )
      })}
    </div>
  )
}
