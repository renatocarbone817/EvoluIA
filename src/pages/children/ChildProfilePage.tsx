import { useEffect, useState } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  Edit,
  Calendar,
  FileText,
  Activity,
  Clock,
  Users,
  BookOpen,
  DollarSign,
  Play,
  Sparkles,
  School,
  GraduationCap,
  Cake,
  Phone,
  CheckCircle2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { ChildAvatar } from "@/components/ui/ChildAvatar"
import { calculateAge, formatDate, formatDateTime } from "@/lib/utils"
import type { Child, Guardian, Session, Appointment } from "@/types/database"
import { ChildSummaryTab } from "./tabs/ChildSummaryTab"
import { ChildSessionsTab } from "./tabs/ChildSessionsTab"
import { ChildAssessmentTab } from "./tabs/ChildAssessmentTab"
import { ChildTimelineTab } from "./tabs/ChildTimelineTab"
import { ChildDocumentsTab } from "./tabs/ChildDocumentsTab"
import { ChildFinancialTab } from "./tabs/ChildFinancialTab"
import { ChildReportsTab } from "./tabs/ChildReportsTab"
import { EditChildDialog } from "./EditChildDialog"

type Tab = "resumo" | "avaliacao" | "sessoes" | "linha-do-tempo" | "documentos" | "financeiro" | "relatorios"

const TABS: { id: Tab; label: string; icon: typeof Calendar; color: string }[] = [
  { id: "resumo", label: "Resumo", icon: Users, color: "text-[#7C3AED]" },
  { id: "avaliacao", label: "Entrevista Inicial", icon: BookOpen, color: "text-[#F59E0B]" },
  { id: "sessoes", label: "Sessões", icon: Activity, color: "text-[#10B981]" },
  { id: "linha-do-tempo", label: "Linha do Tempo", icon: Clock, color: "text-[#0284C7]" },
  { id: "documentos", label: "Documentos", icon: FileText, color: "text-[#EC4899]" },
  { id: "financeiro", label: "Financeiro", icon: DollarSign, color: "text-[#059669]" },
  { id: "relatorios", label: "Relatórios", icon: FileText, color: "text-[#8B5CF6]" },
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
    if (id) loadChild()
  }, [id, professional?.id])

  useEffect(() => {
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
    if (!child) setLoading(true)
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
      <div className="p-8 max-w-[1600px] mx-auto space-y-4">
        <div className="h-24 w-full bg-white border-2 border-[#D8E5E7] animate-pulse rounded-3xl shadow-xs" />
        <div className="h-64 bg-white border-2 border-[#D8E5E7] animate-pulse rounded-3xl shadow-xs" />
      </div>
    )
  }

  if (!child) {
    return (
      <div className="p-12 max-w-[1600px] mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-[#FEF8EC] border-2 border-[#FDE68A] text-[#F59E0B] flex items-center justify-center mx-auto">
          <Users className="w-8 h-8" />
        </div>
        <p className="font-black text-lg text-[#0D2329]">Criança não encontrada.</p>
        <button
          onClick={() => navigate("/criancas")}
          className="px-5 py-2.5 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black shadow-md"
        >
          Voltar para Pacientes
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in">
      {/* 1. TOP HERO HEADER */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-[#D8E5E7] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <button
              onClick={() => navigate("/criancas")}
              className="w-10 h-10 rounded-2xl bg-[#F7FAFA] hover:bg-[#EDE9FE] text-[#6B7C83] hover:text-[#7C3AED] border-2 border-[#D8E5E7] flex items-center justify-center transition-all shrink-0 active:scale-95"
              title="Voltar para Pacientes"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>

            {/* Avatar */}
            <div className="w-16 h-16 min-w-[64px] min-h-[64px] max-w-[64px] max-h-[64px] rounded-3xl bg-[#EDE9FE] border-2 border-[#DDD6FE] text-[#7C3AED] font-black text-2xl flex items-center justify-center shadow-xs overflow-hidden shrink-0">
              {child.photo_url ? (
                <img src={child.photo_url} alt={child.full_name} className="w-full h-full object-cover" />
              ) : (
                child.full_name.charAt(0).toUpperCase()
              )}
            </div>

            {/* Name & Status */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-[#0D2329] tracking-tight truncate">
                  {child.full_name}
                </h1>
                <Badge statusKey={child.status} type="child" />
              </div>

              {/* Tags */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {child.birth_date && (
                  <span className="px-2.5 py-0.5 rounded-xl bg-[#FEF8EC] text-[#B8871E] border border-[#FDE68A] font-black flex items-center gap-1">
                    <Cake className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>{calculateAge(child.birth_date)} anos</span>
                  </span>
                )}
                {child.school && (
                  <span className="px-2.5 py-0.5 rounded-xl bg-[#E8F8F5] text-[#065F46] border border-[#A7F3D0] font-black flex items-center gap-1 truncate max-w-xs">
                    <School className="w-3.5 h-3.5 text-[#10B981]" />
                    <span className="truncate">{child.school}</span>
                  </span>
                )}
                {child.grade && (
                  <span className="px-2.5 py-0.5 rounded-xl bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD] font-black flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-[#0284C7]" />
                    <span>{child.grade}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
            {nextAppointment && (
              <button
                onClick={handleStartSession}
                className="h-10 px-4 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white text-xs font-black flex items-center gap-2 shadow-md active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Iniciar Sessão</span>
              </button>
            )}

            <button
              onClick={() => setShowEditDialog(true)}
              className="h-10 px-4 rounded-2xl bg-[#F7FAFA] hover:bg-[#EDE9FE] text-[#6B7C83] hover:text-[#7C3AED] border-2 border-[#D8E5E7] text-xs font-black flex items-center gap-2 transition-all shadow-xs"
              title="Editar dados da criança"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
          </div>
        </div>

        {/* 2. MODERN TABS PILLS TOOLBAR */}
        <div className="pt-3 border-t border-[#EEF5F6] flex items-center gap-2 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isSelected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                  isSelected
                    ? "bg-[#7C3AED] text-white shadow-md scale-100"
                    : "bg-[#F7FAFA] text-[#6B7C83] hover:text-[#0D2329] hover:bg-white border-2 border-[#D8E5E7]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : tab.color}`} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. TAB CONTENT */}
      <div className="space-y-6">
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
