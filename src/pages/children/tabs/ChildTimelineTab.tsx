import { useState, useEffect } from "react"
import { Calendar, Activity, BookOpen, FileText, CheckCircle2, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/Card"
import { formatDate } from "@/lib/utils"

interface ChildTimelineTabProps {
  childId: string
}

interface TimelineItem {
  id: string
  type: "assessment" | "session" | "test" | "document"
  title: string
  subtitle?: string
  date: string
  details?: string
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

    // 1. Initial Assessment
    const { data: assessments } = await supabase
      .from("initial_assessments")
      .select("*")
      .eq("child_id", childId)

    assessments?.forEach((a) => {
      timeline.push({
        id: a.id,
        type: "assessment",
        title: "Avaliação Inicial Realizada",
        subtitle: a.referral_source ? `Indicação: ${a.referral_source}` : undefined,
        date: a.date,
        details: a.reason || a.notes || undefined,
      })
    })

    // 2. Sessions
    const { data: sessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("child_id", childId)
      .order("session_number", { ascending: true })

    sessions?.forEach((s) => {
      timeline.push({
        id: s.id,
        type: "session",
        title: `Sessão #${s.session_number || "—"} Realizada`,
        subtitle: s.objective ? `🎯 ${s.objective}` : undefined,
        date: s.date,
        details: s.what_was_worked || s.activities || undefined,
      })
    })

    // 3. Tests
    const { data: tests } = await supabase
      .from("tests")
      .select("*")
      .eq("child_id", childId)

    tests?.forEach((t) => {
      timeline.push({
        id: t.id,
        type: "test",
        title: `Aplicação de Teste: ${t.name}`,
        subtitle: t.type ? `Área: ${t.type}` : undefined,
        date: t.date,
        details: t.result || t.observations || undefined,
      })
    })

    // Sort descending by date
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    setItems(timeline)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold text-base">Linha do tempo vazia</p>
          <p className="text-sm text-muted-foreground mt-1">
            À medida que você realizar avaliações e atendimentos, a linha do tempo da criança será construída aqui.
          </p>
        </CardContent>
      </Card>
    )
  }

  const icons = {
    assessment: BookOpen,
    session: Activity,
    test: CheckCircle2,
    document: FileText,
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold">Linha do Tempo Completa</h2>
        <p className="text-sm text-muted-foreground">
          Histórico unificado de toda a trajetória psicopedagógica da criança.
        </p>
      </div>

      <div className="relative pl-6 border-l-2 border-border space-y-6">
        {items.map((item) => {
          const Icon = icons[item.type]
          return (
            <div key={item.id} className="relative group">
              {/* Dot icon */}
              <div className="absolute -left-[31px] top-1.5 w-6 h-6 rounded-full bg-background border-2 border-foreground flex items-center justify-center">
                <Icon className="w-3 h-3 text-foreground" />
              </div>

              {/* Card */}
              <Card className="hover:border-foreground/30 transition-colors">
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{item.title}</span>
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {formatDate(item.date)}
                    </span>
                  </div>

                  {item.subtitle && (
                    <p className="text-xs font-medium text-foreground/80">
                      {item.subtitle}
                    </p>
                  )}

                  {item.details && (
                    <p className="text-xs text-muted-foreground line-clamp-3 pt-1">
                      {item.details}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
