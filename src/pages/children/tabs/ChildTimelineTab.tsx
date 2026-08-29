import { useState, useEffect } from "react"
import { Calendar, Activity, BookOpen, FileText, CheckCircle2, Clock, AlertTriangle, Paperclip } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { formatDate } from "@/lib/utils"

interface ChildTimelineTabProps {
  childId: string
}

interface TimelineItem {
  id: string
  type: "assessment" | "session" | "absence" | "report" | "document"
  title: string
  subtitle?: string
  date: string
  details?: string
  statusBadge?: string
}

export function ChildTimelineTab({ childId }: ChildTimelineTabProps) {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTimeline()
  }, [childId])

  async function loadTimeline() {
    setLoading(true)
    const timeline: TimelineItem[] = []

    try {
      const [assessmentsRes, sessionsRes, reportsRes, docsRes] = await Promise.all([
        supabase
          .from("initial_assessments")
          .select("*")
          .eq("child_id", childId),

        supabase
          .from("sessions")
          .select("*")
          .eq("child_id", childId)
          .order("date", { ascending: false }),

        supabase
          .from("reports")
          .select("*")
          .eq("child_id", childId),

        supabase
          .from("documents")
          .select("*")
          .eq("child_id", childId),
      ])

      // 1. Initial Assessment (Anamnese)
      assessmentsRes.data?.forEach((a) => {
        const parts: string[] = []
        if (a.school_name) parts.push(`Escola: ${a.school_name}`)
        if (a.referral_source) parts.push(`Indicação: ${a.referral_source}`)

        timeline.push({
          id: a.id,
          type: "assessment",
          title: "Entrevista Inicial (Anamnese) Realizada",
          subtitle: parts.length > 0 ? parts.join(" · ") : "Entrevista inicial com os pais preenchida e arquivada.",
          date: a.date || a.created_at,
          details: undefined, // Nunca imprime JSON bruto
        })
      })

      // 2. Sessions & Absences (Aulas e Faltas)
      sessionsRes.data?.forEach((s) => {
        const isMissed =
          (s.objective || "").includes("Falta") ||
          (s.professional_notes || "").includes("Motivo da ausência") ||
          (s.professional_notes || "").includes("Motivo informado")

        if (isMissed) {
          timeline.push({
            id: s.id,
            type: "absence",
            title: "Falta / Ausência Registrada",
            subtitle: s.professional_notes || s.objective || "Ausência do paciente comunicada ou registrada.",
            date: s.date,
          })
        } else {
          const areasWorkedStr = Array.isArray(s.areas_worked) && s.areas_worked.length > 0
            ? `Habilidades: ${s.areas_worked.join(", ")}`
            : undefined

          timeline.push({
            id: s.id,
            type: "session",
            title: `Sessão #${s.session_number || "—"} Realizada`,
            subtitle: s.objective ? `🎯 ${s.objective}` : "Atendimento psicopedagógico presencial realizado.",
            date: s.date,
            details: areasWorkedStr,
          })
        }
      })

      // 3. Reports (Relatórios Clínicos)
      reportsRes.data?.forEach((r) => {
        const isFinal = r.status === "final" || r.status === "completed"
        timeline.push({
          id: r.id,
          type: "report",
          title: isFinal ? "Relatório Clínico Finalizado" : "Relatório em Elaboração",
          subtitle: r.title ? `Título: ${r.title}` : "Relatório de acompanhamento psicopedagógico.",
          date: r.updated_at || r.created_at,
          statusBadge: isFinal ? "Finalizado" : "Rascunho",
        })
      })

      // 4. Documents (Anexos e Documentos)
      docsRes.data?.forEach((d) => {
        timeline.push({
          id: d.id,
          type: "document",
          title: `Documento Anexado: ${d.file_name}`,
          subtitle: d.category ? `Categoria: ${d.category.replace(/_/g, " ")}` : undefined,
          date: d.created_at,
        })
      })

      // Sort descending by date
      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setItems(timeline)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-[#F7FAFA] animate-pulse rounded-3xl border-2 border-[#D8E5E7]" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="p-8 sm:p-12 rounded-3xl bg-white border-2 border-dashed border-[#D8E5E7] text-center space-y-4 shadow-xs">
        <div className="w-16 h-16 rounded-3xl bg-[#EDE9FE] border-2 border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center mx-auto shadow-xs">
          <Clock className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="text-lg font-black text-[#0D2329]">Linha do Tempo Vazia</h3>
          <p className="text-xs font-semibold text-[#6B7C83] leading-relaxed">
            À medida que você registrar entrevistas, sessões, faltas e relatórios, a trajetória completa da criança aparecerá aqui.
          </p>
        </div>
      </div>
    )
  }

  const typeStyles = {
    assessment: {
      icon: BookOpen,
      iconBg: "bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE]",
      border: "hover:border-[#7C3AED]",
      badgeBg: "bg-[#EDE9FE] text-[#7C3AED]",
      label: "Entrevista Inicial",
    },
    session: {
      icon: Activity,
      iconBg: "bg-[#E8F8F5] text-[#065F46] border-[#A7F3D0]",
      border: "hover:border-[#00C48C]",
      badgeBg: "bg-[#E8F8F5] text-[#065F46]",
      label: "Sessão Realizada",
    },
    absence: {
      icon: AlertTriangle,
      iconBg: "bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]",
      border: "border-red-200 hover:border-red-400 bg-[#FEFDFD]",
      badgeBg: "bg-[#FEE2E2] text-[#DC2626]",
      label: "Ausência / Falta",
    },
    report: {
      icon: FileText,
      iconBg: "bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]",
      border: "hover:border-[#6366F1]",
      badgeBg: "bg-[#EEF2FF] text-[#4F46E5]",
      label: "Relatório Clínico",
    },
    document: {
      icon: Paperclip,
      iconBg: "bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]",
      border: "hover:border-[#0284C7]",
      badgeBg: "bg-[#E0F2FE] text-[#0284C7]",
      label: "Documento",
    },
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      <div>
        <h2 className="text-lg sm:text-xl font-black text-[#0D2329] flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#7C3AED]" />
          <span>Linha do Tempo Completa</span>
        </h2>
        <p className="text-xs font-semibold text-[#6B7C83] mt-0.5">
          Histórico unificado de atendimentos, entrevistas, faltas e relatórios da criança.
        </p>
      </div>

      <div className="relative pl-6 sm:pl-8 border-l-2 border-[#D8E5E7] space-y-5">
        {items.map((item) => {
          const config = typeStyles[item.type] || typeStyles.session
          const Icon = config.icon

          return (
            <div key={item.id} className="relative group">
              {/* Dot Icon Indicator */}
              <div
                className={`absolute -left-[37px] sm:-left-[45px] top-3.5 w-7 h-7 sm:w-8 sm:h-8 rounded-2xl border-2 flex items-center justify-center shadow-xs ${config.iconBg}`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              </div>

              {/* Modern Timeline Card */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 border-[#D8E5E7] bg-white transition-all shadow-2xs ${config.border} space-y-1.5`}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${config.badgeBg}`}>
                      {config.label}
                    </span>
                    <h3 className="font-black text-sm text-[#0D2329]">
                      {item.title}
                    </h3>
                  </div>

                  <span className="text-xs font-bold text-[#6B7C83] bg-[#F7FAFA] px-2.5 py-0.5 rounded-full border border-[#D8E5E7]">
                    {formatDate(item.date)}
                  </span>
                </div>

                {item.subtitle && (
                  <p className="text-xs font-semibold text-[#2E4A52] leading-relaxed">
                    {item.subtitle}
                  </p>
                )}

                {item.details && (
                  <p className="text-[11px] font-bold text-[#6B7C83] bg-[#F8FAFB] p-2 rounded-xl border border-[#EEF5F6] mt-2">
                    {item.details}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
