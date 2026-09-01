import { useEffect, useState } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  Loader2,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/Dialog"
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
import { checkChildFinancialRecords, checkChildLinkedGuardians, deleteChildSafely } from "@/lib/deletionService"
import toast from "react-hot-toast"

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
  const { user, professional } = useAuthStore()
  const profId = professional?.id || user?.id
  const [child, setChild] = useState<Child | null>(null)
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null)
  const [sessionCount, setSessionCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("resumo")
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingChild, setDeletingChild] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [linkedGuardiansList, setLinkedGuardiansList] = useState<{ id: string; full_name: string; relationship: string }[]>([])
  const [selectedGuardiansToDelete, setSelectedGuardiansToDelete] = useState<string[]>([])
  const [financialCount, setFinancialCount] = useState<number>(0)
  const [checkingFinance, setCheckingFinance] = useState(false)

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

    async function handleOpenDeleteModal() {
    if (!child) return
    setCheckingFinance(true)
    setDeleteConfirmText("")
    setSelectedGuardiansToDelete([])
    try {
      const [count, guardians] = await Promise.all([
        checkChildFinancialRecords(child.id),
        checkChildLinkedGuardians(child.id),
      ])
      setFinancialCount(count)
      setLinkedGuardiansList(guardians)
      setShowDeleteModal(true)
    } finally {
      setCheckingFinance(false)
    }
  }

  async function handleConfirmDelete() {
    if (!child || !profId) return
    if (deleteConfirmText.trim().toUpperCase() !== "EXCLUIR") {
      toast.error("Por favor, digite EXCLUIR para confirmar a exclusão.")
      return
    }
    setDeletingChild(true)
    try {
      const res = await deleteChildSafely(child.id, profId, child.full_name, selectedGuardiansToDelete)
      if (res.success) {
        toast.success("Paciente excluído com sucesso!", { icon: "🗑️" })
        setShowDeleteModal(false)
        navigate("/criancas")
      } else {
        toast.error(res.error || "Erro ao excluir paciente")
      }
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado ao excluir paciente")
    } finally {
      setDeletingChild(false)
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
      <div className="p-8 max-w-7xl mx-auto space-y-4">
        <div className="h-24 w-full bg-white border-2 border-[#D8E5E7] animate-pulse rounded-3xl shadow-xs" />
        <div className="h-64 bg-white border-2 border-[#D8E5E7] animate-pulse rounded-3xl shadow-xs" />
      </div>
    )
  }

  if (!child) {
    return (
      <div className="p-12 max-w-7xl mx-auto text-center space-y-4">
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
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in max-w-full overflow-x-hidden">
      {/* 1. TOP HERO HEADER (Larger Photo, Top-Right Edit Button, No Back Button, Clean Alignment) */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border-2 border-[#D8E5E7] shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: Avatar + Info */}
          <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
            {/* Avatar (Larger) */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 min-w-[80px] min-h-[80px] max-w-[80px] max-h-[80px] sm:max-w-[96px] sm:max-h-[96px] rounded-3xl bg-[#EDE9FE] border-2 border-[#DDD6FE] text-[#7C3AED] font-black text-2xl sm:text-3xl flex items-center justify-center shadow-md overflow-hidden shrink-0">
              {child.photo_url ? (
                <img src={child.photo_url} alt={child.full_name} className="w-full h-full object-cover" />
              ) : (
                child.full_name.charAt(0).toUpperCase()
              )}
            </div>

            {/* Name, Status & Tags */}
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black text-[#0D2329] tracking-tight truncate leading-tight">
                  {child.full_name}
                </h1>
                <Badge statusKey={child.status} type="child" />
              </div>

              {/* Tags */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
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

          {/* Right Top Actions (Edit Button on Top Right + Iniciar Sessão) */}
          <div className="flex items-center gap-2 shrink-0 self-start">
            {nextAppointment && (
              <button
                onClick={handleStartSession}
                className="h-9 sm:h-10 px-3 sm:px-4 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Iniciar Sessão</span>
              </button>
            )}

            <button
              onClick={() => setShowEditDialog(true)}
              className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-2xl bg-[#F7FAFA] hover:bg-[#EDE9FE] text-[#6B7C83] hover:text-[#7C3AED] border-2 border-[#D8E5E7] text-xs font-black flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
              title="Editar dados da criança"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
          </div>
        </div>

        {/* 2. MODERN TABS PILLS TOOLBAR */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isSelected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-[#7C3AED] text-white shadow-md scale-100"
                    : "bg-[#E2ECEE] text-[#0D2329] hover:text-[#7C3AED] hover:bg-white border-2 border-white shadow-2xs hover:shadow-sm hover:scale-[1.02]"
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
        onDelete={handleOpenDeleteModal}
      />
    
      {/* Modal de Confirmação Segura de Exclusão da Criança */}
      <Dialog open={showDeleteModal} onOpenChange={(open) => !open && setShowDeleteModal(false)}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-2 border-[#D8E5E7] bg-white shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-[#EEF5F6] flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border-2 border-red-200 flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-[#0D2329]">
                Excluir paciente?
              </DialogTitle>
              <p className="text-xs font-semibold text-[#6B7C83] mt-0.5">
                {child.full_name}
              </p>
            </div>
          </DialogHeader>

          <DialogBody className="p-6 space-y-4 text-xs font-semibold text-[#2E4A52]">
            <p className="leading-relaxed">
              Esta ação removerá a criança <strong>{child.full_name}</strong> e todos os registros relacionados ao acompanhamento, sessões, avaliações, relatórios e histórico clínico/psicopedagógico. <span className="text-red-600 font-bold">Esta ação não poderá ser desfeita.</span>
            </p>

            {/* Opção de Excluir Responsáveis Vinculados */}
            {linkedGuardiansList.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#FEF8EC] border-2 border-[#FDE68A] space-y-2.5">
                <p className="text-xs font-black text-[#B8871E] flex items-center gap-1.5">
                  <span>👥</span>
                  <span>Responsáveis Vinculados Encontrados:</span>
                </p>
                <p className="text-[11px] text-[#6B7C83]">
                  Deseja excluir também o cadastro dos responsáveis desta criança?
                </p>
                <div className="space-y-1.5 pt-1">
                  {linkedGuardiansList.map((g) => {
                    const isChecked = selectedGuardiansToDelete.includes(g.id)
                    return (
                      <label key={g.id} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#0D2329] bg-white p-2 rounded-xl border border-[#FDE68A]">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGuardiansToDelete([...selectedGuardiansToDelete, g.id])
                            } else {
                              setSelectedGuardiansToDelete(selectedGuardiansToDelete.filter((id) => id !== g.id))
                            }
                          }}
                          className="w-4 h-4 rounded text-red-600 accent-red-600 cursor-pointer"
                        />
                        <span>{g.full_name} ({g.relationship})</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Aviso Contábil de Preservação Financeira */}
            {financialCount > 0 && (
              <div className="p-3.5 rounded-2xl bg-[#E8F8F5] border border-[#A7F3D0] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#065F46]">
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  <span>Histórico Financeiro Preservado ({financialCount} lançamentos)</span>
                </div>
                <p className="text-[11px] text-[#065F46] leading-relaxed">
                  Os lançamentos contábeis continuarão salvos no Financeiro com o nome do paciente.
                </p>
              </div>
            )}

            {/* Campo Obrigatório: Digite EXCLUIR */}
            <div className="space-y-1.5 pt-2 border-t border-[#EEF5F6]">
              <label className="text-xs font-black text-[#0D2329] block">
                Para confirmar, digite <span className="text-red-600 font-mono font-black">EXCLUIR</span> abaixo:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Digite EXCLUIR"
                className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#D8E5E7] focus:border-red-500 font-bold text-center uppercase tracking-widest text-sm focus:outline-none placeholder:normal-case placeholder:tracking-normal placeholder:font-medium placeholder:text-[#8CAAB1] transition-all bg-[#F8FAFB] focus:bg-white"
              />
            </div>
          </DialogBody>

          <DialogFooter className="p-4 bg-[#F8FAFB] border-t border-[#EEF5F6] flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={deletingChild}
              onClick={() => setShowDeleteModal(false)}
              className="rounded-2xl border-2 border-[#D8E5E7] font-bold text-xs"
            >
              Cancelar
            </Button>

            <button
              type="button"
              disabled={deletingChild || deleteConfirmText.trim().toUpperCase() !== "EXCLUIR"}
              onClick={handleConfirmDelete}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#EF4444] to-[#DC2626] hover:from-[#DC2626] hover:to-[#B91C1C] text-white font-black text-xs shadow-md active:scale-95 transition-all flex items-center gap-2 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {deletingChild ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>{deletingChild ? "Excluindo..." : "Excluir definitivamente"}</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
