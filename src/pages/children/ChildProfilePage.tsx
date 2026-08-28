import { useEffect, useState } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, Edit, Calendar, FileText, Activity, Clock, Users, BookOpen, DollarSign, Play } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { ChildAvatar } from "@/components/ui/ChildAvatar"
import { calculateAge, formatDate, formatDateTime } from "@/lib/utils"
import type { Child, Guardian, Session, Appointment, InitialAssessment } from "@/types/database"
import { ChildSummaryTab } from "./tabs/ChildSummaryTab"
import { ChildSessionsTab } from "./tabs/ChildSessionsTab"
import { ChildAssessmentTab } from "./tabs/ChildAssessmentTab"
import { ChildTimelineTab } from "./tabs/ChildTimelineTab"
import { ChildDocumentsTab } from "./tabs/ChildDocumentsTab"
import { ChildFinancialTab } from "./tabs/ChildFinancialTab"
import { ChildReportsTab } from "./tabs/ChildReportsTab"
import { EditChildDialog } from "./EditChildDialog"

type Tab = "resumo" | "avaliacao" | "sessoes" | "linha-do-tempo" | "documentos" | "financeiro" | "relatorios"

const TABS: { id: Tab; label: string; icon: typeof Calendar }[] = [
  { id: "resumo", label: "Resumo", icon: Users },
  { id: "avaliacao", label: "Entrevista Inicial", icon: BookOpen },
  { id: "sessoes", label: "Sessões", icon: Activity },
  { id: "linha-do-tempo", label: "Linha do Tempo", icon: Clock },
  { id: "documentos", label: "Documentos", icon: FileText },
  { id: "financeiro", label: "Financeiro", icon: DollarSign },
  { id: "relatorios", label: "Relatórios", icon: FileText },
]

export function ChildProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { professional } = useAuthStore()
  const [child, setChild] = useState<Child | null>(null)
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null)
  const [sessionCount, setSessionCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("resumo")
  const [showEditDialog, setShowEditDialog] = useState(false)

  useEffect(() => {
    if (id && professional) loadChild()
  }, [id, professional])

  useEffect(() => {
    // Open edit dialog automatically if requested via URL query param (e.g. ?editar=true)
    if (searchParams.get("editar") === "true") {
      setShowEditDialog(true)
    }

    const tabParam = searchParams.get("tab")
    if (tabParam) {
      if (tabParam === "relatorios" || tabParam === "relatorio") {
        setActiveTab("relatorios")
      } else if (["resumo", "avaliacao", "sessoes", "linha-do-tempo", "documentos", "financeiro"].includes(tabParam)) {
        setActiveTab(tabParam as Tab)
      }
    }
  }, [searchParams])

  async function loadChild() {
    setLoading(true)
    try {
      const [childRes, guardianRes, apptRes, sessionRes] = await Promise.all([
        supabase.from("children").select("*").eq("id", id).single(),
        supabase
          .from("guardian_children")
          .select("*, guardian:guardians(*)")
          .eq("child_id", id),
        supabase
          .from("appointments")
          .select("*")
          .eq("child_id", id)
          .gte("start_time", new Date().toISOString())
          .in("status", ["scheduled", "confirmed"])
          .order("start_time")
          .limit(1),
        supabase
          .from("sessions")
          .select("id")
          .eq("child_id", id)
          .eq("status", "completed"),
      ])
      setChild(childRes.data)
      setGuardians((guardianRes.data || []).map((gc: any) => gc.guardian).filter(Boolean))
      setNextAppointment(apptRes.data?.[0] || null)
      setSessionCount(sessionRes.data?.length || 0)
    } finally {
      setLoading(false)
    }
  }

  async function handleStartSession() {
    if (!nextAppointment) return
    const isEvaluation =
      nextAppointment.type === "Avaliação Inicial" ||
      nextAppointment.type?.toLowerCase().includes("avaliação")

    if (isEvaluation) {
      setShowEditDialog(true)
    } else {
      await supabase
        .from("appointments")
        .update({ status: "in_progress" })
        .eq("id", nextAppointment.id)
      navigate(`/atendimento/${nextAppointment.id}`)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
      </div>
    )
  }

  if (!child) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Criança não encontrada.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/criancas")}>
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-[#D8E5E7] bg-white sticky top-0 z-10 shadow-xs">
        <div className="px-6 md:px-8 max-w-5xl mx-auto">
          <div className="py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/criancas")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>

            {/* Avatar with photo or cute illustration */}
            <ChildAvatar
              photoUrl={child.photo_url}
              name={child.full_name}
              size="md"
            />

            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-black text-[#19323A]">{child.full_name}</h1>
                <Badge statusKey={child.status} />
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs font-bold text-[#6B7C83] flex-wrap">
                {child.birth_date && <span>🎂 {calculateAge(child.birth_date)} anos</span>}
                {child.school && <span>🏫 {child.school}</span>}
                {child.grade && <span>📚 {child.grade}</span>}
              </div>
            </div>


            <div className="flex items-center gap-2">
              {nextAppointment && (
                <Button size="sm" onClick={handleStartSession} className="gap-1.5 font-bold">
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Iniciar sessão
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowEditDialog(true)}
                title="Editar dados da criança"
                className="hover:border-[#245C6B] hover:text-[#245C6B]"
              >
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto scrollbar-thin -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-xs font-black whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.id
                    ? "border-[#245C6B] text-[#245C6B] bg-[#EEF5F6]/40"
                    : "border-transparent text-[#6B7C83] hover:text-[#19323A] hover:bg-[#EEF5F6]/20"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="px-6 md:px-8 max-w-5xl mx-auto py-6">
        {activeTab === "resumo" && (
          <ChildSummaryTab
            child={child}
            guardians={guardians}
            nextAppointment={nextAppointment}
            sessionCount={sessionCount}
            onReload={loadChild}
          />
        )}
        {activeTab === "avaliacao" && <ChildAssessmentTab childId={child.id} childName={child.full_name} />}
        {activeTab === "sessoes" && <ChildSessionsTab childId={child.id} childName={child.full_name} />}
        {activeTab === "linha-do-tempo" && <ChildTimelineTab childId={child.id} />}
        {activeTab === "documentos" && <ChildDocumentsTab childId={child.id} />}
        {activeTab === "financeiro" && <ChildFinancialTab childId={child.id} childName={child.full_name} />}
        {activeTab === "relatorios" && <ChildReportsTab child={child} onReloadChild={loadChild} />}
      </div>

      {/* Edit Child Dialog */}
      <EditChildDialog
        open={showEditDialog}
        child={child}
        onClose={() => setShowEditDialog(false)}
        onSuccess={() => {
          setShowEditDialog(false)
          loadChild()
        }}
      />
    </div>
  )
}
