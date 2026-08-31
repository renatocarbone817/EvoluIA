import { useState, useRef, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Upload,
  Smartphone,
  Laptop,
  HelpCircle,
  Info,
  Save,
  User,
  Building,
  Phone,
  Calendar,
  Copy,
  Check,
  ExternalLink,
  Download,
  Sparkles,
  Clock,
  Bell,
  Layers,
  ShieldCheck,
  RefreshCw,
  MapPin,
  DollarSign,
  MessageSquare,
  Camera,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  GripVertical,
  Settings as SettingsIcon,
  Cloud,
  FileSpreadsheet,
  CheckSquare,
  FileText,
  Lock,
  ChevronRight,
  CreditCard,
  QrCode,
  Globe,
  Sliders,
  Mail,
  Award,
  Users,
  Crown,
  KeyRound,
  Eye,
  EyeOff,
  UserPlus,
  ShieldAlert,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { generateICalFeed } from "@/lib/calendarSync"
import { getAccessibleProfessionalIds, isMasterUser } from "@/lib/teamAccess"
import {
  listTeamMembers,
  createTeamMember,
  updateTeamMember,
  removeTeamMember,
} from "@/lib/teamService"
import { getSubscriptionDetails, type SubscriptionDetails } from "@/lib/subscriptionService"
import type { AppointmentWithChild, Professional } from "@/types/database"
import { ImageCropperModal } from "@/components/ui/ImageCropperModal"
import toast from "react-hot-toast"

type SettingsTab = "consultorio" | "equipe" | "agenda" | "notificacoes" | "integracoes"

interface DaySchedule {
  day: string
  label: string
  active: boolean
  start: string
  end: string
}

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day: "seg", label: "Segunda-feira", active: true, start: "08:00", end: "18:00" },
  { day: "ter", label: "Terça-feira", active: true, start: "08:00", end: "18:00" },
  { day: "qua", label: "Quarta-feira", active: true, start: "08:00", end: "18:00" },
  { day: "qui", label: "Quinta-feira", active: true, start: "08:00", end: "18:00" },
  { day: "sex", label: "Sexta-feira", active: true, start: "08:00", end: "18:00" },
  { day: "sab", label: "Sábado", active: false, start: "08:00", end: "12:00" },
  { day: "dom", label: "Domingo", active: false, start: "08:00", end: "12:00" },
]

export function SettingsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, professional, setProfessional } = useAuthStore()

  const requestedTab = searchParams.get("aba") || searchParams.get("tab")
  const initialTab: SettingsTab = requestedTab === "equipe" ? "equipe" : "consultorio"

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [copied, setCopied] = useState(false)
  const [syncingNow, setSyncingNow] = useState(false)
  const [calendarGuideDevice, setCalendarGuideDevice] = useState<"android" | "iphone" | "computador">("android")
  const [faqOpen, setFaqOpen] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const profId = professional?.id || user?.id
  const isMaster = isMasterUser(professional)

  // Sincroniza aba se a URL mudar
  useEffect(() => {
    const tab = searchParams.get("aba") || searchParams.get("tab")
    if (tab === "equipe" && isMaster) {
      setActiveTab("equipe")
    }
  }, [searchParams, isMaster])

  // Subscription details
  const [subDetails, setSubDetails] = useState<SubscriptionDetails | null>(null)

  // Profile, Clinic & Address Form State
  const [form, setForm] = useState({
    full_name: professional?.full_name || "",
    email: professional?.email || user?.email || "",
    phone: professional?.phone || "",
    clinic_name: professional?.clinic_name || "",
    crp: professional?.crp || "",
    specialty: professional?.specialty || "Psicopedagogia Clínica",
    address: (professional as any)?.address || "",
    city: professional?.city || "",
    state: professional?.state || "",
    bio: (professional?.bio || "").replace(/\[PLAN:[^\]]+\]/g, "").trim() || "",
    pix_type: (professional as any)?.pix_type || "Celular",
    pix_key: (professional as any)?.pix_key || "",
  })

  // Sincroniza o form dinamicamente quando o perfil do usuário for carregado
  useEffect(() => {
    if (professional || user) {
      setForm((prev) => ({
        ...prev,
        full_name: professional?.full_name || prev.full_name || "",
        email: professional?.email || user?.email || prev.email || "",
        phone: professional?.phone || prev.phone || "",
        clinic_name: professional?.clinic_name || prev.clinic_name || "",
        crp: professional?.crp || prev.crp || "",
        specialty: professional?.specialty || prev.specialty || "Psicopedagogia Clínica",
        address: (professional as any)?.address || prev.address || "",
        city: professional?.city || prev.city || "",
        state: professional?.state || prev.state || "",
        bio: (professional?.bio || "").replace(/\[PLAN:[^\]]+\]/g, "").trim() || prev.bio || "",
        pix_type: (professional as any)?.pix_type || "Celular",
        pix_key: (professional as any)?.pix_key || "",
      }))
    }
  }, [professional, user])

  // Team Management State
  const [teamMembers, setTeamMembers] = useState<Professional[]>([])
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showEditMemberModal, setShowEditMemberModal] = useState(false)
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false)
  const [memberToEdit, setMemberToEdit] = useState<Professional | null>(null)
  const [memberToRemove, setMemberToRemove] = useState<Professional | null>(null)

  // Add Member Form
  const [addMemberForm, setAddMemberForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    allowMasterDataAccess: true,
  })
  const [showAddPassword, setShowAddPassword] = useState(false)
  const [showAddConfirmPassword, setShowAddConfirmPassword] = useState(false)
  const [creatingMember, setCreatingMember] = useState(false)

  // Edit Member Form
  const [editMemberForm, setEditMemberForm] = useState({
    fullName: "",
    email: "",
    password: "",
    allowMasterDataAccess: true,
  })
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [updatingMember, setUpdatingMember] = useState(false)
  const [removingMember, setRemovingMember] = useState(false)

  // Working Hours State
  const [schedule, setSchedule] = useState<DaySchedule[]>(() => {
    const saved = localStorage.getItem("evoluia_working_hours")
    return saved ? JSON.parse(saved) : DEFAULT_SCHEDULE
  })
  const [sessionDuration, setSessionDuration] = useState<number>(50)

  // WhatsApp Message Templates State
  const DEFAULT_REMINDER_TEMPLATE =
    "Olá, tudo bem? 🌟 Passando para confirmar a nossa sessão psicopedagógica de {nome_crianca} hoje às {horario} no consultório. Qualquer imprevisto, por favor nos avise. Até logo!"
  const DEFAULT_BILLING_TEMPLATE =
    "Olá! Segue a mensalidade psicopedagógica de {nome_crianca} referente ao mês de {mes}. Segue nossa chave PIX: {chave_pix}. Qualquer dúvida estou à disposição!"

  const [reminderTemplate, setReminderTemplate] = useState<string>(() => {
    return localStorage.getItem("evoluia_reminder_template") || DEFAULT_REMINDER_TEMPLATE
  })
  const [billingTemplate, setBillingTemplate] = useState<string>(() => {
    return localStorage.getItem("evoluia_billing_template") || DEFAULT_BILLING_TEMPLATE
  })

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)

  // Password Update State
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")

  const calendarFeedUrl = `${window.location.origin}/api/calendar/feed/${profId}.ics`

  // Load team members on mount or tab change
  useEffect(() => {
    if (profId && isMaster) {
      loadTeam()
    }
  }, [profId, isMaster, activeTab])

  // Proteção de Rota/Aba: Se uma psicopedagoga adicional tentar acessar a aba equipe, redireciona imediatamente para consultório
  useEffect(() => {
    if (!isMaster && activeTab === "equipe") {
      setActiveTab("consultorio")
    }
  }, [isMaster, activeTab])

  async function loadTeam() {
    if (!profId) return
    setLoadingTeam(true)
    try {
      const [list, sub] = await Promise.all([
        listTeamMembers(profId),
        getSubscriptionDetails(profId),
      ])
      setTeamMembers(list)
      setSubDetails(sub)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingTeam(false)
    }
  }

  // Image Upload Handlers
  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profId) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Foto muito grande! Máximo de 10MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setImageToCrop(reader.result as string)
      setCropperOpen(true)
    }
    reader.readAsDataURL(file)

    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleCropComplete(croppedBlob: Blob) {
    setCropperOpen(false)
    if (!profId) return

    setUploadingLogo(true)
    try {
      const path = `${profId}/logo_${Date.now()}.jpg`

      const { error: uploadError } = await supabase.storage
        .from("professionals")
        .upload(path, croppedBlob, {
          contentType: "image/jpeg",
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from("professionals")
        .getPublicUrl(path)

      const { error: updateError } = await supabase
        .from("professionals")
        .update({ logo_url: urlData.publicUrl })
        .eq("id", profId)

      if (updateError) throw updateError

      setProfessional({ ...(professional || {}), id: profId, logo_url: urlData.publicUrl } as any)
      toast.success("Foto atualizada com sucesso!")
    } catch (err: any) {
      toast.error(err.message || "Erro no upload da foto")
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleSave() {
    if (!profId) return
    setSaving(true)
    try {
      const existingPlanTag = (professional?.bio || "").match(/\[PLAN:[^\]]+\]/)?.[0] || ""
      const cleanFormBio = (form.bio || "").replace(/\[PLAN:[^\]]+\]/g, "").trim()
      const finalBio = (cleanFormBio ? cleanFormBio + (existingPlanTag ? " " + existingPlanTag : "") : existingPlanTag) || null

      const { error } = await supabase
        .from("professionals")
        .upsert({
          id: profId,
          full_name: form.full_name,
          email: form.email || user?.email || professional?.email || "",
          clinic_name: form.clinic_name || null,
          crp: form.crp || null,
          specialty: form.specialty || null,
          phone: form.phone || null,
          city: form.city || null,
          state: form.state || null,
          bio: finalBio,
        })

      if (error) throw error

      localStorage.setItem("evoluia_pix_type", form.pix_type)
      localStorage.setItem("evoluia_pix_key", form.pix_key)
      localStorage.setItem("evoluia_working_hours", JSON.stringify(schedule))
      localStorage.setItem("evoluia_session_duration", String(sessionDuration))
      localStorage.setItem("evoluia_reminder_template", reminderTemplate)
      localStorage.setItem("evoluia_billing_template", billingTemplate)

      setProfessional({
        ...(professional || {}),
        id: profId,
        email: user?.email || "",
        ...form,
      } as any)

      toast.success("Dados salvos com sucesso!", { icon: "✅" })
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  // Handle Password Update for Current User
  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError("")

    if (newPassword.length < 6) {
      setPasswordError("A nova senha deve ter no mínimo 6 caracteres.")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("As duas senhas não coincidem. Digite novamente com atenção.")
      return
    }

    try {
      setSavingPassword(true)
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      toast.success("Sua senha foi alterada com sucesso! 🔒✨", { duration: 4000 })
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      console.error(err)
      setPasswordError(err.message || "Erro ao alterar a senha.")
    } finally {
      setSavingPassword(false)
    }
  }

  // Handle Team Member Creation
  async function handleCreateMember(e: React.FormEvent) {
    e.preventDefault()
    if (!profId) return

    if (!addMemberForm.fullName.trim()) {
      toast.error("Por favor, preencha o nome completo.")
      return
    }

    const emailRegex = /^[^s@]+@[^s@]+.[^s@]+$/
    if (!emailRegex.test(addMemberForm.email.trim())) {
      toast.error("Por favor, informe um e-mail válido.")
      return
    }

    if (!addMemberForm.password) {
      toast.error("Por favor, digite uma senha de acesso.")
      return
    }

    if (addMemberForm.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.")
      return
    }

    if (addMemberForm.password !== addMemberForm.confirmPassword) {
      toast.error("As senhas não coincidem.")
      return
    }

    if (teamMembers.length >= 5) {
      toast.error("Você atingiu o limite máximo de 5 psicopedagogas adicionais.")
      return
    }

    setCreatingMember(true)
    try {
      await createTeamMember({
        masterId: profId,
        fullName: addMemberForm.fullName,
        email: addMemberForm.email,
        password: addMemberForm.password,
        allowMasterDataAccess: addMemberForm.allowMasterDataAccess,
      })

      toast.success("Acesso criado com sucesso! A psicopedagoga já pode entrar no sistema.", { icon: "🎉" })
      setShowAddMemberModal(false)
      setAddMemberForm({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        allowMasterDataAccess: true,
      })
      await loadTeam()
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar acesso da psicopedagoga.")
    } finally {
      setCreatingMember(false)
    }
  }

  // Handle Open Edit Modal
  function handleOpenEditMember(member: Professional) {
    setMemberToEdit(member)
    setEditMemberForm({
      fullName: member.full_name,
      email: member.email,
      password: "",
      allowMasterDataAccess: !!member.allow_master_data_access,
    })
    setShowEditMemberModal(true)
  }

  // Handle Team Member Update
  async function handleUpdateMember(e: React.FormEvent) {
    e.preventDefault()
    if (!profId || !memberToEdit) return

    if (!editMemberForm.fullName.trim()) {
      toast.error("Por favor, preencha o nome completo.")
      return
    }

    const emailRegex = /^[^s@]+@[^s@]+.[^s@]+$/
    if (!emailRegex.test(editMemberForm.email.trim())) {
      toast.error("Por favor, informe um e-mail válido.")
      return
    }

    setUpdatingMember(true)
    try {
      await updateTeamMember(
        {
          id: memberToEdit.id,
          fullName: editMemberForm.fullName,
          email: editMemberForm.email,
          password: editMemberForm.password || undefined,
          allowMasterDataAccess: editMemberForm.allowMasterDataAccess,
        },
        profId
      )

      toast.success("Dados da psicopedagoga atualizados com sucesso!", { icon: "✅" })
      setShowEditMemberModal(false)
      setMemberToEdit(null)
      await loadTeam()
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar dados.")
    } finally {
      setUpdatingMember(false)
    }
  }

  // Handle Quick Toggle Direct on Card
  async function handleToggleMemberAccess(member: Professional) {
    if (!profId) return
    const newAccess = !member.allow_master_data_access
    try {
      await updateTeamMember(
        {
          id: member.id,
          fullName: member.full_name,
          email: member.email,
          allowMasterDataAccess: newAccess,
        },
        profId
      )
      toast.success(
        newAccess
          ? `Acesso aos dados da conta principal ATIVADO para ${member.full_name}.`
          : `Acesso aos dados da conta principal DESATIVADO para ${member.full_name}.`
      )
      await loadTeam()
    } catch (err: any) {
      toast.error("Erro ao alterar acesso.")
    }
  }

  // Handle Open Remove Modal
  function handleOpenRemoveMember(member: Professional) {
    setMemberToRemove(member)
    setShowRemoveMemberModal(true)
  }

  // Handle Remove Team Member
  async function handleConfirmRemoveMember() {
    if (!profId || !memberToRemove) return
    setRemovingMember(true)
    try {
      await removeTeamMember(memberToRemove.id, profId)
      toast.success(`Acesso de ${memberToRemove.full_name} removido da equipe.`, { icon: "🗑️" })
      setShowRemoveMemberModal(false)
      setMemberToRemove(null)
      await loadTeam()
    } catch (err: any) {
      toast.error("Erro ao remover psicopedagoga.")
    } finally {
      setRemovingMember(false)
    }
  }

  function handleCopyCalendarUrl() {
    navigator.clipboard.writeText(calendarFeedUrl)
    setCopied(true)
    toast.success("Link da agenda copiado com sucesso!")
    setTimeout(() => setCopied(false), 3000)
  }

  async function handleSyncNow() {
    setSyncingNow(true)
    try {
      const res = await fetch(calendarFeedUrl)
      if (res.ok) {
        toast.success(
          "Link do feed verificado e ativo! Agora clique em 'Adicionar no Google Calendar' ou copie o link abaixo para o seu celular.",
          { duration: 6000 }
        )
      } else {
        toast.success(
          "Link da agenda pronto para uso! Copie o link abaixo para vincular ao Google Calendar ou iPhone.",
          { duration: 5000 }
        )
      }
    } catch {
      toast.success(
        "Link da agenda pronto para uso! Copie o link abaixo para vincular ao Google Calendar ou iPhone.",
        { duration: 5000 }
      )
    } finally {
      setSyncingNow(false)
    }
  }

  async function handleDownloadICS() {
    try {
      const { data: appts } = await supabase
        .from("appointments")
        .select("*, child:children(*)")
        .eq("professional_id", profId)

      const icsData = generateICalFeed((appts || []) as AppointmentWithChild[], form.full_name)
      const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `evoluia_agenda_${form.full_name.replace(/\s+/g, "_")}.ics`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("Arquivo de agenda (.ics) baixado!")
    } catch (e) {
      toast.error("Erro ao gerar agenda")
    }
  }

  function toggleDay(idx: number) {
    const updated = [...schedule]
    updated[idx].active = !updated[idx].active
    setSchedule(updated)
  }

  function updateDayHours(idx: number, field: "start" | "end", val: string) {
    const updated = [...schedule]
    updated[idx][field] = val
    setSchedule(updated)
  }

  const totalUsedUsers = 1 + teamMembers.length
  const isLimitReached = teamMembers.length >= 5

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* 1. TOP TITLE HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-[#0D2329] tracking-tight">
              Configurações
            </h1>
            <div className="w-8 h-8 rounded-2xl bg-[#EDE9FE] border border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center shadow-xs">
              <SettingsIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#6B7C83]">
            Gerencie o perfil da profissional, dados do consultório, chave PIX, equipe e horários.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-10 px-5 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white text-xs font-black flex items-center gap-2 shadow-md active:scale-95 transition-all shrink-0"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 stroke-[2.5]" />}
          <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
        </button>
      </div>

      {/* 2. MODERN RESPONSIVE TAB BAR (Native Mobile Chips + Clean Desktop Tabs) */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none pb-1">
        <div className="flex items-center gap-2 p-1.5 bg-white rounded-full sm:rounded-2xl border-2 border-[#D8E5E7] shadow-xs w-max sm:w-full">
          {[
            { id: "consultorio", label: "Consultório, Perfil & PIX", shortLabel: "Perfil & PIX", icon: Building },
            ...(isMaster ? [{ id: "equipe", label: "Equipe & Acessos", shortLabel: "Equipe", icon: Users }] : []),
            { id: "agenda", label: "Horários de Atendimento", shortLabel: "Horários", icon: Calendar },
            { id: "notificacoes", label: "Mensagens WhatsApp", shortLabel: "Mensagens", icon: MessageSquare },
            { id: "integracoes", label: "Google Agenda & Dados", shortLabel: "Google Agenda", icon: Globe },
          ].map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full sm:rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-2 active:scale-95 ${
                  isActive
                    ? "bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white shadow-md"
                    : "text-[#4F6C74] hover:text-[#0D2329] hover:bg-[#F7FAFA] bg-transparent"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : "text-[#7C3AED]"}`} />
                <span className="sm:hidden whitespace-nowrap">{tab.shortLabel}</span>
                <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* =========================================================================
          TAB 1: CONSULTÓRIO, PERFIL & PIX
          ========================================================================= */}
      {activeTab === "consultorio" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in">
          {/* Main Form (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#EEF5F6] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold shadow-2xs">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[#0D2329]">Perfil Profissional & Consultório</h2>
                    <p className="text-xs font-semibold text-[#6B7C83]">
                      Suas informações pessoais, dados da clínica, endereço completo e chave PIX.
                    </p>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 1: FOTO & DADOS DA PROFISSIONAL */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#0D2329] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                  <span>1. Identificação da Profissional</span>
                </h3>

                {/* Avatar Row (Centered & Larger) */}
                <div className="flex flex-col items-center justify-center text-center p-6 rounded-3xl bg-[#F8FAFB] border-2 border-[#D8E5E7] space-y-3">
                  <div className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[#EDE9FE] text-[#7C3AED] font-black text-3xl flex items-center justify-center overflow-hidden border-2 border-[#DDD6FE] shadow-md cursor-pointer"
                       onClick={() => fileInputRef.current?.click()}
                       title="Clique para alterar foto">
                    {professional?.logo_url ? (
                      <img src={professional.logo_url} alt="Foto" className="w-full h-full object-cover" />
                    ) : (
                      form.full_name.charAt(0).toUpperCase()
                    )}
                    <div className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                      <Camera className="w-6 h-6" />
                      <span className="text-[10px] font-bold">Alterar</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 text-xs font-black text-[#7C3AED] bg-white border-2 border-[#DDD6FE] hover:bg-[#EDE9FE] rounded-2xl transition-all shadow-2xs active:scale-95 flex items-center gap-1.5 mx-auto"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{uploadingLogo ? "Enviando..." : "Trocar Foto de Perfil"}</span>
                    </button>
                    <p className="text-[11px] font-semibold text-[#6B7C83] max-w-xs mx-auto">
                      Formatos JPG ou PNG. Usado em relatórios clínicos e cabeçalhos.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoSelect}
                    />
                  </div>
                </div>

                {/* Inputs da Profissional */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#0D2329]">Nome Completo *</label>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="Digite seu nome completo"
                      className="w-full px-4 py-3 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all text-[#0D2329]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#0D2329]">E-mail de Contato *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="seuemail@exemplo.com"
                      className="w-full px-4 py-3 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all text-[#0D2329]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#0D2329]">Telefone / WhatsApp *</label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="w-full px-4 py-3 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all text-[#0D2329]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#0D2329]">CBO</label>
                    <input
                      type="text"
                      value={form.crp}
                      onChange={(e) => setForm({ ...form, crp: e.target.value })}
                      placeholder="Ex: 2394-25"
                      className="w-full px-4 py-3 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all text-[#0D2329]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#0D2329]">Especialidade Principal</label>
                  <input
                    type="text"
                    value={form.specialty}
                    onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                    placeholder="Ex: Psicopedagogia Clínica"
                    className="w-full px-4 py-3 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all text-[#0D2329]"
                  />
                </div>
              </div>

              {/* SEÇÃO 2: DADOS DO CONSULTÓRIO & ENDEREÇO */}
              <div className="space-y-4 pt-2 border-t border-[#EEF5F6]">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#0D2329] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#0284C7]" />
                  <span>2. Espaço Clínico & Endereço</span>
                </h3>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#0D2329]">Nome do Consultório / Espaço Clínico *</label>
                  <input
                    type="text"
                    value={form.clinic_name}
                    onChange={(e) => setForm({ ...form, clinic_name: e.target.value })}
                    placeholder="Ex: Espaço Psicopedagógico"
                    className="w-full px-4 py-3 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#0284C7] transition-all text-[#0D2329]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#0D2329]">Endereço Completo (Rua, Número, Sala/Andar)</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Ex: Rua, Número, Sala/Andar"
                    className="w-full px-4 py-3 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#0284C7] transition-all text-[#0D2329]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-black text-[#0D2329]">Cidade</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Cidade"
                      className="w-full px-4 py-3 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#0284C7] transition-all text-[#0D2329]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#0D2329]">Estado (UF)</label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      placeholder="UF"
                      className="w-full px-4 py-3 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#0284C7] transition-all text-[#0D2329]"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: CHAVE PIX COM FUNDO DESTACADO */}
              <div className="p-5 rounded-2xl bg-[#FEF8EC] border-2 border-[#F4C95D]/60 space-y-3.5 shadow-2xs">
                <div className="flex items-center gap-2 text-[#8B6514]">
                  <DollarSign className="w-4 h-4 font-black" />
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    3. Dados Financeiros & Chave PIX para os Pais
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-4 space-y-1.5">
                    <label className="text-xs font-black text-[#8B6514]">Tipo da Chave *</label>
                    <select
                      value={form.pix_type}
                      onChange={(e) => setForm({ ...form, pix_type: e.target.value })}
                      className="w-full px-3 py-3 text-xs font-bold rounded-2xl border-2 border-[#F4C95D] bg-white text-[#0D2329] focus:outline-none focus:ring-2 focus:ring-[#8B6514]/20"
                    >
                      <option value="Celular">📱 Celular / Telefone</option>
                      <option value="E-mail">✉️ E-mail</option>
                      <option value="CPF">🆔 CPF</option>
                      <option value="CNPJ">🏢 CNPJ</option>
                      <option value="Chave Aleatória">🔑 Chave Aleatória</option>
                    </select>
                  </div>

                  <div className="sm:col-span-8 space-y-1.5">
                    <label className="text-xs font-black text-[#8B6514]">Chave PIX *</label>
                    <input
                      type="text"
                      value={form.pix_key}
                      onChange={(e) => setForm({ ...form, pix_key: e.target.value })}
                      placeholder="Digite sua chave PIX..."
                      className="w-full px-4 py-3 text-xs font-black rounded-2xl border-2 border-[#F4C95D] bg-white focus:outline-none focus:ring-2 focus:ring-[#8B6514]/20 text-[#0D2329]"
                    />
                  </div>
                </div>

                <p className="text-[11px] font-semibold text-[#8B6514]/80 pt-0.5">
                  Nas mensagens de cobrança e recibos constará: <strong>Chave PIX ({form.pix_type}): {form.pix_key}</strong>
                </p>
              </div>

              {/* Save Button inside card */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Dados da Profissional & Consultório</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Live Preview (4 Cols) */}
          <div className="lg:col-span-4 space-y-5">
            <div className="rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm overflow-hidden space-y-4">
              <div className="bg-white p-5 border-b-2 border-[#D8E5E7] flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] border-2 border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center font-black text-xl overflow-hidden shrink-0 shadow-xs">
                  {professional?.logo_url ? (
                    <img src={professional.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    form.full_name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-base text-[#0D2329] truncate leading-tight">{form.clinic_name || "Nome do Consultório"}</h3>
                  <p className="text-xs text-[#7C3AED] font-black truncate mt-0.5">{form.full_name || "Nome da Profissional"}</p>
                  <p className="text-[11px] text-[#6B7C83] font-bold truncate">CBO: {form.crp || "Não informado"}</p>
                </div>
              </div>

              <div className="p-5 pt-0 space-y-3">
                <div className="p-4 rounded-2xl bg-[#F7FAFA] border border-[#D8E5E7] space-y-3.5 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase text-[#8CAAB1] tracking-wider leading-none mb-1">Profissional</p>
                      <p className="text-xs font-black text-[#0D2329] leading-snug">{form.full_name || "Não informado"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-[#E8F8F5] text-[#10B981] flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase text-[#8CAAB1] tracking-wider leading-none mb-1">WhatsApp / Telefone</p>
                      <p className="text-xs font-black text-[#0D2329] leading-snug">{form.phone || "Não informado"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase text-[#8CAAB1] tracking-wider leading-none mb-1">E-mail de Contato</p>
                      <p className="text-xs font-black text-[#0D2329] break-all leading-snug">{form.email || "Não informado"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-[#FEF8EC] text-[#8B6514] flex items-center justify-center shrink-0">
                      <DollarSign className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase text-[#8CAAB1] tracking-wider leading-none mb-1">Chave PIX ({form.pix_type})</p>
                      <p className="text-xs font-black text-[#0284C7] break-all leading-snug">{form.pix_key || "Não configurada"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-[#FCE7F3] text-[#DB2777] flex items-center justify-center shrink-0">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase text-[#8CAAB1] tracking-wider leading-none mb-1">Endereço do Consultório</p>
                      <p className="text-xs font-black text-[#0D2329] leading-snug">
                        {form.address ? `${form.address}, ${form.city} - ${form.state}` : `${form.city}, ${form.state}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#E8F8F5] border border-[#10B981]/30 flex items-center gap-2 text-[#065F46] text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span>Dados sincronizados em relatórios e WhatsApp</span>
                </div>
              </div>
            </div>

            {/* CARD DE SEGURANÇA & ALTERAÇÃO DE SENHA */}
            <div className="rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F6]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-[#0D2329]">Segurança & Senha de Acesso</h3>
                    <p className="text-[11px] font-semibold text-[#6B7C83]">Altere sua senha de login no sistema</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#DCFCE7] text-[#166534]">
                  Criptografia Ativa
                </span>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-3.5">
                {passwordError && (
                  <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs font-bold text-[#DC2626] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  {/* Nova Senha */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#0D2329]">Nova Senha</label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3 w-3.5 h-3.5 text-[#8CAAB1]" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        minLength={6}
                        placeholder="No mínimo 6 dígitos"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-9 pr-9 py-2.5 rounded-xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 text-[#8CAAB1] hover:text-[#0D2329]"
                        title={showNewPassword ? "Ocultar" : "Mostrar"}
                      >
                        {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmar Nova Senha */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#0D2329]">Confirmar Nova Senha</label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3 w-3.5 h-3.5 text-[#8CAAB1]" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        minLength={6}
                        placeholder="Repita a nova senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-9 py-2.5 rounded-xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 text-[#8CAAB1] hover:text-[#0D2329]"
                        title={showConfirmPassword ? "Ocultar" : "Mostrar"}
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-[10px] text-[#8CAAB1] font-semibold">
                    A nova senha será exigida no próximo login.
                  </p>
                  <button
                    type="submit"
                    disabled={savingPassword || !newPassword}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-40"
                  >
                    {savingPassword ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                    <span>{savingPassword ? "Atualizando..." : "Atualizar Senha"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: EQUIPE & ACESSOS (CENTRO DE COMANDO DA EQUIPE)
          ========================================================================= */}
      {activeTab === "equipe" && isMaster && (
        <div className="space-y-6 animate-in fade-in max-w-5xl">
          {/* Validação de Segurança: Apenas MASTER pode gerenciar a equipe */}
          {!isMaster ? (
            <div className="p-8 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] flex items-center justify-center mx-auto shadow-xs">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h2 className="text-base font-black text-[#0D2329]">Área Exclusiva da Administradora (MASTER)</h2>
              <p className="text-xs font-semibold text-[#6B7C83] max-w-md mx-auto">
                Apenas a proprietária da conta principal pode gerenciar psicopedagogas e controlar permissões de equipe.
              </p>
            </div>
          ) : (
            <>
              {(() => {
                const maxProfs = subDetails?.maxProfessionals || 1
                const totalUsedUsers = 1 + teamMembers.length
                const availableSeats = Math.max(0, maxProfs - totalUsedUsers)
                const isLimitReached = totalUsedUsers >= maxProfs
                const planName = subDetails?.planConfig.name || "EvoluIA"

                return (
                  <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold shadow-2xs">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-black text-[#0D2329]">
                              Centro de Comando da Equipe
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE]">
                              {totalUsedUsers} de {maxProfs} vagas utilizadas
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-[#6B7C83]">
                            Gerencie as psicopedagogas que utilizam sua conta ({planName}).
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] font-bold text-[#6B7C83]">
                          {availableSeats > 0 ? (
                            <span>
                              Você ainda pode adicionar{" "}
                              <strong className="text-[#10B981] font-black">
                                {availableSeats} psicopedagoga{availableSeats > 1 ? "s" : ""}
                              </strong>{" "}
                              ao seu plano.
                            </span>
                          ) : (
                            <span className="text-[#DC2626] font-bold">
                              Todas as {maxProfs} vagas do seu plano estão preenchidas.
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Botão Adicionar ou Upgrade */}
                    <div className="shrink-0 w-full md:w-auto">
                      {isLimitReached ? (
                        <div className="p-3.5 rounded-2xl bg-[#FEF2F2] border-2 border-[#FECACA] text-[#DC2626] text-xs font-bold flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
                            <span>Limite do plano atingido ({totalUsedUsers}/{maxProfs})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate("/meu-plano")}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white text-xs font-black flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Fazer Upgrade</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowAddMemberModal(true)}
                          className="w-full md:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
                        >
                          <UserPlus className="w-4 h-4 stroke-[2.5]" />
                          <span>+ Adicionar psicopedagoga</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* GUIA EXPLICATIVO: COMO ESCOLHER O MODO DE TRABALHO */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#0D2329]">Como funciona o Acesso aos Dados da Equipe?</h3>
                    <p className="text-[11px] font-semibold text-[#6B7C83]">
                      Entenda quando deixar o compartilhamento ativado ou desativado para cada profissional da sua clínica.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  {/* Card 1: Compartilhamento Ativado */}
                  <div className="p-4 rounded-2xl bg-[#F5F3FF] border-2 border-[#DDD6FE] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#6B21A8] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#7C3AED]" />
                        <span>1. Clínica Integrada (Colaborativa)</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]">
                        ATIVADO
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-[#4C1D95] leading-relaxed">
                      <strong>Para profissionais que atendem juntas:</strong> Ambas visualizam e atualizam os mesmos pacientes, agenda e relatórios em tempo real na mesma base, com logins e senhas individuais.
                    </p>
                  </div>

                  {/* Card 2: Compartilhamento Desativado */}
                  <div className="p-4 rounded-2xl bg-[#F7FAFA] border-2 border-[#D8E5E7] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#0D2329] flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#0284C7]" />
                        <span>2. Consultório Independente (Privado)</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#F3F4F6] text-[#4B5563] border border-[#D1D5DB]">
                        DESATIVADO
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-[#4F6C74] leading-relaxed">
                      <strong>Para espaços compartilhados / coworking:</strong> Cada profissional possui um ambiente 100% isolado (seus próprios pacientes, agenda e faturamento sem que uma veja os dados da outra).
                    </p>
                  </div>
                </div>
              </div>

              {/* LISTA DE MEMBROS DA EQUIPE */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#6B7C83] flex items-center gap-2 px-1">
                  <span>Membros da Equipe ({totalUsedUsers})</span>
                </h3>

                {/* 1. CARD DA MASTER (CONTA PRINCIPAL) */}
                <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#FAF5FF] via-white to-[#F5F3FF] border-2 border-[#DDD6FE] shadow-sm relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0 w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px]">
                        <div className="w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-2xl bg-[#7C3AED] text-white flex items-center justify-center font-black text-xl shadow-md overflow-hidden border-2 border-[#DDD6FE]">
                          {professional?.logo_url ? (
                            <img src={professional.logo_url} alt="Foto da Master" className="w-full h-full object-cover" />
                          ) : (
                            form.full_name ? form.full_name.charAt(0).toUpperCase() : "P"
                          )}
                        </div>
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#F59E0B] text-white flex items-center justify-center shadow-xs border-2 border-white z-10">
                          <Crown className="w-3 h-3 fill-current" />
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-black text-[#0D2329]">
                            {form.full_name || "Priscila Souza"}
                          </h4>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#7C3AED] text-white shadow-2xs flex items-center gap-1">
                            <Crown className="w-3 h-3 fill-current" />
                            <span>MASTER</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F8F5] text-[#065F46] border border-[#10B981]/30">
                            Conta Principal
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[#6B7C83]">
                          {form.email || user?.email || "priscila@evolui.com.br"}
                        </p>
                        <p className="text-[11px] font-medium text-[#7C3AED]">
                          Proprietária da conta • Acesso total e gerenciamento
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. CARDS DAS PSICOPEDAGOGAS ADICIONAIS */}
                {teamMembers.map((member, index) => {
                  const memberNum = String(index + 1).padStart(2, "0")
                  const hasMasterAccess = !!member.allow_master_data_access
                  const maxProfs = subDetails?.maxProfessionals || 1
                  const isCoveredByPlan = index < (maxProfs - 1)

                  return (
                    <div
                      key={member.id}
                      className={`p-5 sm:p-6 rounded-3xl border-2 shadow-sm space-y-4 transition-all ${
                        isCoveredByPlan
                          ? "bg-white border-[#D8E5E7] hover:border-[#7C3AED]/40"
                          : "bg-[#FAFCFC] border-dashed border-[#FCA5A5]"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Info Header */}
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-2xl flex items-center justify-center font-black text-lg border-2 shadow-2xs shrink-0 overflow-hidden ${
                              isCoveredByPlan
                                ? "bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE]"
                                : "bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]"
                            }`}
                          >
                            {member.logo_url ? (
                              <img src={member.logo_url} alt={member.full_name} className="w-full h-full object-cover" />
                            ) : (
                              member.full_name ? member.full_name.charAt(0).toUpperCase() : "P"
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-base font-black text-[#0D2329]">
                                {member.full_name}
                              </h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#F7FAFA] text-[#6B7C83] border border-[#D8E5E7]">
                                PSICOPEDAGOGA {memberNum}
                              </span>
                              {!isCoveredByPlan ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  <span>Bloqueada (Excede o Plano)</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>Acesso Ativo</span>
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-[#6B7C83]">{member.email}</p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleOpenEditMember(member)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#7C3AED] bg-[#F5F3FF] hover:bg-[#EDE9FE] border border-[#DDD6FE] transition-colors flex items-center gap-1.5"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenRemoveMember(member)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#DC2626] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FCA5A5] transition-colors flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover</span>
                          </button>
                        </div>
                      </div>

                      {/* Alerta se o membro estiver bloqueado por limite do plano */}
                      {!isCoveredByPlan && (
                        <div className="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold text-[#DC2626]">
                          <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-[#DC2626] shrink-0" />
                            <span>
                              Esta psicopedagoga está bloqueada no login porque seu plano cobre até {maxProfs} profissional(ais).
                            </span>
                          </div>
                          <button
                            onClick={() => navigate("/meu-plano")}
                            className="px-3.5 py-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black shrink-0 flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Fazer Upgrade para Reativar</span>
                          </button>
                        </div>
                      )}

                      {/* Toggle de Acesso aos Dados da Conta Principal */}
                      <div className="p-4 rounded-2xl bg-[#F7FAFA] border border-[#D8E5E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-[#0D2329]">
                              Acesso aos dados da conta principal:
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                hasMasterAccess
                                  ? "bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]"
                                  : "bg-[#F3F4F6] text-[#4B5563] border border-[#D1D5DB]"
                              }`}
                            >
                              {hasMasterAccess ? "ATIVADO" : "DESATIVADO"}
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-[#6B7C83]">
                            {hasMasterAccess
                              ? "Esta profissional pode visualizar os pacientes e relatórios da conta principal."
                              : "Esta profissional possui um espaço independente, com seus próprios pacientes e informações."}
                          </p>
                        </div>

                        {/* Switch Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleMemberAccess(member)}
                          className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                            hasMasterAccess ? "bg-[#7C3AED]" : "bg-[#CBD5E1]"
                          }`}
                          title="Alternar acesso aos dados da conta principal"
                        >
                          <span
                            className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow-sm ${
                              hasMasterAccess ? "left-6" : "left-0.5"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Empty State se nenhuma psicopedagoga adicional foi adicionada */}
                {teamMembers.length === 0 && (
                  <div className="p-8 rounded-3xl bg-white border-2 border-dashed border-[#D8E5E7] text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#F7FAFA] text-[#8CAAB1] flex items-center justify-center mx-auto border border-[#D8E5E7]">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-[#0D2329]">
                        Nenhuma psicopedagoga adicional adicionada ainda
                      </p>
                      <p className="text-xs font-semibold text-[#6B7C83] max-w-md mx-auto">
                        Adicione até 5 profissionais para utilizarem o EvoluIA com você, com controle total de acesso aos dados.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddMemberModal(true)}
                      className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Adicionar Primeira Psicopedagoga</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: HORÁRIOS DE ATENDIMENTO (RESPONSIVO & ESPAÇOSO)
          ========================================================================= */}
      {activeTab === "agenda" && (
        <div className="p-4 sm:p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-6 animate-in fade-in max-w-4xl">
          <div className="flex items-center justify-between border-b border-[#EEF5F6] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E8F8F5] text-[#10B981] flex items-center justify-center font-bold shadow-2xs">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-[#0D2329]">Horários de Atendimento Semanal</h2>
                <p className="text-xs font-semibold text-[#6B7C83]">
                  Defina os dias e intervalos em que seu consultório realiza atendimentos.
                </p>
              </div>
            </div>
          </div>

          {/* Duração Padrão */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[#F8FAFB] border-2 border-[#D8E5E7]">
            <div className="space-y-0.5">
              <p className="text-xs font-black text-[#0D2329]">Duração Padrão da Sessão</p>
              <p className="text-[11px] font-semibold text-[#6B7C83]">Tempo estimado de cada atendimento clínico na agenda</p>
            </div>
            <select
              value={sessionDuration}
              onChange={(e) => setSessionDuration(Number(e.target.value))}
              className="px-4 py-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#10B981] shadow-2xs w-full sm:w-auto"
            >
              <option value={45}>45 minutos</option>
              <option value={50}>50 minutos (Padrão)</option>
              <option value={60}>60 minutos (1 hora)</option>
              <option value={90}>90 minutos (1h 30m)</option>
            </select>
          </div>

          {/* Lista de Dias de Funcionamento */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-[#6B7C83] flex items-center gap-1.5">
              <span>📅</span>
              <span>Dias de Atendimento:</span>
            </p>

            <div className="divide-y divide-[#EEF5F6] border-2 border-[#D8E5E7] rounded-3xl overflow-hidden bg-white shadow-2xs">
              {schedule.map((item, idx) => (
                <div
                  key={item.day}
                  className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    item.active ? "bg-white" : "bg-[#F8FAFB]/70"
                  }`}
                >
                  {/* Top / Left: Checkbox + Dia da Semana */}
                  <div className="flex items-center justify-between sm:justify-start gap-3 select-none">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={() => toggleDay(idx)}
                        className="w-5 h-5 rounded-lg text-[#10B981] focus:ring-[#10B981] accent-[#10B981] cursor-pointer"
                      />
                      <span className={`text-xs sm:text-sm font-black ${item.active ? "text-[#0D2329]" : "text-[#8DA3A8]"}`}>
                        {item.label}
                      </span>
                    </label>

                    {!item.active && (
                      <span className="sm:hidden text-[10px] font-black uppercase tracking-wider text-[#8DA3A8] bg-[#EEF5F6] px-2 py-0.5 rounded-md">
                        Fechado
                      </span>
                    )}
                  </div>

                  {/* Horários (Espaçosos e confortáveis para o toque no celular) */}
                  {item.active ? (
                    <div className="flex items-center gap-2 w-full sm:w-auto bg-[#F8FAFB] sm:bg-transparent p-2.5 sm:p-0 rounded-2xl border sm:border-none border-[#D8E5E7]">
                      <div className="flex-1 sm:flex-initial flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-[#6B7C83] sm:hidden">De:</span>
                        <input
                          type="time"
                          value={item.start}
                          onChange={(e) => updateDayHours(idx, "start", e.target.value)}
                          className="w-full sm:w-auto px-3 py-2 text-xs font-mono font-bold border-2 border-[#D8E5E7] rounded-xl bg-white text-[#0D2329] focus:outline-none focus:border-[#10B981] shadow-2xs text-center"
                        />
                      </div>

                      <span className="text-xs text-[#8DA3A8] font-bold px-1">até</span>

                      <div className="flex-1 sm:flex-initial flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-[#6B7C83] sm:hidden">Às:</span>
                        <input
                          type="time"
                          value={item.end}
                          onChange={(e) => updateDayHours(idx, "end", e.target.value)}
                          className="w-full sm:w-auto px-3 py-2 text-xs font-mono font-bold border-2 border-[#D8E5E7] rounded-xl bg-white text-[#0D2329] focus:outline-none focus:border-[#10B981] shadow-2xs text-center"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="hidden sm:inline text-xs text-[#8DA3A8] italic font-semibold">
                      Consultório fechado
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: NOTIFICAÇÕES & WHATSAPP
          ========================================================================= */}
      {activeTab === "notificacoes" && (
        <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-6 animate-in fade-in max-w-4xl">
          <div className="flex items-center justify-between border-b border-[#EEF5F6] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E8F8F5] text-[#10B981] flex items-center justify-center font-bold shadow-2xs">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-[#0D2329]">Modelos de Mensagens WhatsApp</h2>
                <p className="text-xs font-semibold text-[#6B7C83]">
                  Personalize os textos automáticos disparados para os pais pelo sistema.
                </p>
              </div>
            </div>
          </div>

          {/* 1. Lembrete de Atendimento */}
          <div className="p-5 rounded-3xl bg-[#F7FAFA] border-2 border-[#D8E5E7] space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#E8F8F5] text-[#10B981] flex items-center justify-center font-bold">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-[#0D2329]">
                    1. Lembrete de Confirmação de Sessão
                  </p>
                  <p className="text-[11px] font-semibold text-[#6B7C83]">
                    Usado na <strong>Agenda</strong> e no <strong>Dashboard</strong> para confirmar atendimentos do dia.
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-[#E8F8F5] text-[#10B981] font-black px-2.5 py-1 rounded-xl border border-[#10B981]/30">
                Disponível na Agenda
              </span>
            </div>

            <textarea
              rows={3}
              value={reminderTemplate}
              onChange={(e) => setReminderTemplate(e.target.value)}
              className="w-full p-3 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-white text-[#0D2329] focus:outline-none focus:border-[#10B981] transition-all resize-none"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[#EEF5F6]">
              <p className="text-[11px] font-bold text-[#6B7C83]">
                Tags: <code className="bg-white px-1.5 py-0.5 rounded-lg border border-[#D8E5E7] text-[#10B981] font-black">{"{horario}"}</code>, <code className="bg-white px-1.5 py-0.5 rounded-lg border border-[#D8E5E7] text-[#10B981] font-black">{"{nome_crianca}"}</code>
              </p>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  reminderTemplate
                    .replace("{horario}", "14:00")
                    .replace("{nome_crianca}", "Maria Eduarda")
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-[#E8F8F5] hover:bg-[#10B981] hover:text-white text-[#10B981] rounded-xl text-xs font-black flex items-center gap-1.5 border border-[#10B981]/30 transition-all shadow-2xs self-start sm:self-auto"
              >
                <MessageSquare className="w-3.5 h-3.5 fill-current" />
                <span>Testar Mensagem</span>
              </a>
            </div>
          </div>

          {/* 2. Mensagem de Cobrança */}
          <div className="p-5 rounded-3xl bg-[#F7FAFA] border-2 border-[#D8E5E7] space-y-3.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FFEDD5] text-[#EA580C] flex items-center justify-center font-bold">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-[#0D2329]">
                  2. Mensagem de Mensalidade / Cobrança PIX
                </p>
                <p className="text-[11px] font-semibold text-[#6B7C83]">
                  Usado no botão <strong>"Cobrar"</strong> da tela de <strong>Financeiro</strong>.
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-[#FFEDD5] text-[#EA580C] font-black px-2.5 py-1 rounded-xl border border-[#EA580C]/30">
              Disponível no Financeiro
            </span>
          </div>

          <textarea
            rows={3}
            value={billingTemplate}
            onChange={(e) => setBillingTemplate(e.target.value)}
            className="w-full p-3 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-white text-[#0D2329] focus:outline-none focus:border-[#EA580C] transition-all resize-none"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[#EEF5F6]">
            <p className="text-[11px] font-bold text-[#6B7C83]">
              Tags: <code className="bg-white px-1.5 py-0.5 rounded-lg border border-[#D8E5E7] text-[#EA580C] font-black">{"{nome_crianca}"}</code>, <code className="bg-white px-1.5 py-0.5 rounded-lg border border-[#D8E5E7] text-[#EA580C] font-black">{"{mes}"}</code>, <code className="bg-white px-1.5 py-0.5 rounded-lg border border-[#D8E5E7] text-[#EA580C] font-black">{"{chave_pix}"}</code>
            </p>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                billingTemplate
                  .replace("{nome_crianca}", "Maria Eduarda")
                  .replace("{mes}", "Agosto")
                  .replace("{chave_pix}", `(${form.pix_type}) ${form.pix_key}`)
              )}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 bg-[#FFEDD5] hover:bg-[#EA580C] hover:text-white text-[#EA580C] rounded-xl text-xs font-black flex items-center gap-1.5 border border-[#EA580C]/30 transition-all shadow-2xs self-start sm:self-auto"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Testar Cobrança</span>
            </a>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: INTEGRAÇÕES (GOOGLE AGENDA & CALENDÁRIO DIDÁTICO)
          ========================================================================= */}
      {activeTab === "integracoes" && (
        <div className="space-y-6 animate-in fade-in max-w-4xl">
          {/* Header de Status Real do Link */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] border-2 border-[#DDD6FE] flex items-center justify-center shrink-0 shadow-2xs font-black">
                <Calendar className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-base text-[#0D2329]">
                    Sincronização com Google Agenda & Celular
                  </h3>
                  <span className="text-[10px] bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                    Pronto para Conectar
                  </span>
                </div>
                <p className="text-xs text-[#6B7C83] font-semibold leading-relaxed">
                  Conta da profissional: <strong>{form.email}</strong> · Copie o link abaixo ou clique no botão azul para adicionar seus atendimentos ao Google Agenda ou iPhone.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={syncingNow}
              onClick={handleSyncNow}
              className="px-4 py-2.5 text-xs font-black bg-[#F8FAFB] hover:bg-[#EDE9FE] border-2 border-[#D8E5E7] hover:border-[#7C3AED] text-[#0D2329] hover:text-[#7C3AED] rounded-2xl flex items-center gap-2 shrink-0 shadow-2xs transition-all active:scale-95 self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingNow ? "animate-spin text-[#7C3AED]" : "text-[#6B7C83]"}`} />
              <span>{syncingNow ? "Testando Link..." : "Verificar Link"}</span>
            </button>
          </div>

          {/* Card do Link da Agenda */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] space-y-4 shadow-xs">
            <div>
              <h3 className="text-sm font-black text-[#0D2329] flex items-center gap-2">
                <span>🔗</span>
                <span>Seu Link Exclusivo da Agenda (Feed iCal)</span>
              </h3>
              <p className="text-xs font-semibold text-[#6B7C83] mt-0.5">
                Copie este link para conectar suas sessões ao Google Agenda, iPhone ou Outlook:
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={calendarFeedUrl}
                className="flex-1 bg-[#F8FAFB] px-4 py-2.5 text-xs font-mono font-bold rounded-2xl border-2 border-[#D8E5E7] select-all text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
              />
              <button
                onClick={handleCopyCalendarUrl}
                className="px-5 py-2.5 bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white text-xs font-black rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copiado com Sucesso! ✓" : "Copiar Link da Agenda"}</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2 border-t border-[#EEF5F6]">
              <a
                href={`https://calendar.google.com/calendar/r/settings/addbyurl?cid=${encodeURIComponent(
                  calendarFeedUrl
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-black px-4 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-2xl transition-all shadow-xs active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Adicionar no Google Calendar Web (1 Clique)</span>
              </a>

              <button
                onClick={handleDownloadICS}
                className="inline-flex items-center gap-2 text-xs font-black px-4 py-2.5 bg-white hover:bg-[#F8FAFB] text-[#0D2329] border-2 border-[#D8E5E7] hover:border-[#7C3AED] rounded-2xl transition-all shadow-2xs active:scale-95"
              >
                <Download className="w-4 h-4 text-[#6B7C83]" />
                <span>Baixar Arquivo (.ics)</span>
              </button>
            </div>
          </div>

          {/* Guia Didático Passo a Passo por Dispositivo */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] space-y-5 shadow-xs">
            <div>
              <h3 className="text-base font-black text-[#0D2329] flex items-center gap-2">
                <span>📖</span>
                <span>Passo a Passo: Como Ativar no seu Celular</span>
              </h3>
              <p className="text-xs font-semibold text-[#6B7C83] mt-0.5">
                Escolha o seu aparelho abaixo para ver as instruções ilustradas e fáceis de seguir:
              </p>
            </div>

            {/* Abas de Dispositivo */}
            <div className="flex items-center gap-2 p-1.5 bg-[#F8FAFB] rounded-2xl border-2 border-[#D8E5E7] w-full sm:w-fit">
              <button
                type="button"
                onClick={() => setCalendarGuideDevice("android")}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  calendarGuideDevice === "android"
                    ? "bg-[#7C3AED] text-white shadow-xs"
                    : "text-[#6B7C83] hover:text-[#0D2329]"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>No Celular Android</span>
              </button>

              <button
                type="button"
                onClick={() => setCalendarGuideDevice("iphone")}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  calendarGuideDevice === "iphone"
                    ? "bg-[#7C3AED] text-white shadow-xs"
                    : "text-[#6B7C83] hover:text-[#0D2329]"
                }`}
              >
                <span>🍏</span>
                <span>No iPhone / iPad</span>
              </button>

              <button
                type="button"
                onClick={() => setCalendarGuideDevice("computador")}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  calendarGuideDevice === "computador"
                    ? "bg-[#7C3AED] text-white shadow-xs"
                    : "text-[#6B7C83] hover:text-[#0D2329]"
                }`}
              >
                <Laptop className="w-4 h-4" />
                <span>No Computador</span>
              </button>
            </div>

            {/* Conteúdo Didático: ANDROID */}
            {calendarGuideDevice === "android" && (
              <div className="p-5 rounded-3xl bg-[#F8FAFB] border-2 border-[#EEF5F6] space-y-4 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-black text-[#0284C7] bg-[#E0F2FE] px-3 py-1.5 rounded-xl w-fit">
                  <Smartphone className="w-4 h-4" />
                  <span>Configuração para Celulares Android (Samsung, Motorola, Xiaomi, etc.)</span>
                </div>

                <div className="space-y-3 text-xs font-semibold text-[#2E4A52]">
                  <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-[#D8E5E7]">
                    <div className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 font-black text-xs">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-[#0D2329]">Copie o link da sua agenda</p>
                      <p className="text-[11px] text-[#6B7C83]">
                        Clique no botão roxo <strong>"Copiar Link da Agenda"</strong> acima.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-[#D8E5E7]">
                    <div className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 font-black text-xs">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-[#0D2329]">Abra o Google Agenda no navegador ou computador</p>
                      <p className="text-[11px] text-[#6B7C83]">
                        Clique no botão azul <strong>"Adicionar no Google Calendar Web"</strong> ou acesse{" "}
                        <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="text-[#7C3AED] underline font-bold">
                          calendar.google.com
                        </a>
                        .
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-[#D8E5E7]">
                    <div className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 font-black text-xs">
                      3
                    </div>
                    <div>
                      <p className="font-bold text-[#0D2329]">Adicione a agenda por URL</p>
                      <p className="text-[11px] text-[#6B7C83]">
                        Na coluna esquerda, clique no sinal de <strong>+</strong> ao lado de <em>"Outras agendas"</em>, escolha <strong>"Do URL"</strong>, cole o link e clique em <strong>Adicionar Agenda</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-[#E8F8F5] rounded-2xl border-2 border-[#A7F3D0]">
                    <div className="w-6 h-6 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0 font-black text-xs">
                      4
                    </div>
                    <div>
                      <p className="font-black text-[#065F46] text-xs">
                        ⭐ O PULO DO GATO: Ative a Sincronização no Celular!
                      </p>
                      <p className="text-[11px] text-[#065F46] mt-0.5 leading-relaxed">
                        Abra o aplicativo <strong>Google Agenda</strong> no seu celular, toque no menu lateral (os 3 tracinhos), vá em <strong>⚙️ Configurações</strong>, toque no nome da agenda do EvoluIA e <strong>ative a chavinha "Sincronizar"</strong>. Pronto! Suas sessões aparecerão instantaneamente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo Didático: IPHONE */}
            {calendarGuideDevice === "iphone" && (
              <div className="p-5 rounded-3xl bg-[#F8FAFB] border-2 border-[#EEF5F6] space-y-4 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-black text-[#7C3AED] bg-[#EDE9FE] px-3 py-1.5 rounded-xl w-fit">
                  <span>🍏</span>
                  <span>Configuração para iPhone e iPad (App Calendário da Apple)</span>
                </div>

                <div className="space-y-3 text-xs font-semibold text-[#2E4A52]">
                  <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-[#D8E5E7]">
                    <div className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 font-black text-xs">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-[#0D2329]">Copie o link acima</p>
                      <p className="text-[11px] text-[#6B7C83]">
                        Clique no botão roxo <strong>"Copiar Link da Agenda"</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-[#D8E5E7]">
                    <div className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 font-black text-xs">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-[#0D2329]">Abra os Ajustes do seu iPhone</p>
                      <p className="text-[11px] text-[#6B7C83]">
                        Vá em <strong>Ajustes</strong> &gt; toque em <strong>Apps</strong> &gt; <strong>Calendário</strong> (ou direto em <em>Calendário</em> no iOS antigo).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-[#D8E5E7]">
                    <div className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 font-black text-xs">
                      3
                    </div>
                    <div>
                      <p className="font-bold text-[#0D2329]">Adicione um Calendário Assinado</p>
                      <p className="text-[11px] text-[#6B7C83]">
                        Toque em <strong>Contas</strong> &gt; <strong>Adicionar Conta</strong> &gt; Escolha <strong>Outra</strong> &gt; Toque em <strong>Adicionar Calendário Assinado</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-[#D8E5E7]">
                    <div className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 font-black text-xs">
                      4
                    </div>
                    <div>
                      <p className="font-bold text-[#0D2329]">Cole o link e Salve</p>
                      <p className="text-[11px] text-[#6B7C83]">
                        Cole o link no campo <strong>Servidor</strong> e toque em <strong>Salvar</strong>. Suas sessões psicopedagógicas já vão aparecer no aplicativo Calendário do iPhone com lembretes automáticos!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo Didático: COMPUTADOR */}
            {calendarGuideDevice === "computador" && (
              <div className="p-5 rounded-3xl bg-[#F8FAFB] border-2 border-[#EEF5F6] space-y-4 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-black text-[#0D2329] bg-white border border-[#D8E5E7] px-3 py-1.5 rounded-xl w-fit">
                  <Laptop className="w-4 h-4" />
                  <span>Configuração Rápida no Computador (Google Calendar)</span>
                </div>

                <div className="space-y-3 text-xs font-semibold text-[#2E4A52]">
                  <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-[#D8E5E7]">
                    <div className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 font-black text-xs">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-[#0D2329]">Clique no botão de atalho</p>
                      <p className="text-[11px] text-[#6B7C83]">
                        Clique no botão azul <strong>"Adicionar no Google Calendar Web (1 Clique)"</strong> acima.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-[#D8E5E7]">
                    <div className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 font-black text-xs">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-[#0D2329]">Confirme no Google</p>
                      <p className="text-[11px] text-[#6B7C83]">
                        O Google Agenda abrirá com o link já preenchido. Basta clicar no botão <strong>"Adicionar Agenda"</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-[#D8E5E7]">
                    <div className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 font-black text-xs">
                      3
                    </div>
                    <div>
                      <p className="font-bold text-[#0D2329]">Tudo Pronto!</p>
                      <p className="text-[11px] text-[#6B7C83]">
                        Suas sessões agendadas no EvoluIA aparecerão na grade de horários com cor exclusiva.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dúvidas Frequentes (FAQ Acordeão) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#F7FAFA] border-2 border-[#D8E5E7] space-y-3">
            <h3 className="text-xs font-black text-[#0D2329] uppercase tracking-wide flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[#7C3AED]" />
              <span>Dúvidas Frequentes sobre a Sincronização</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-white rounded-2xl border border-[#D8E5E7] space-y-1">
                <p className="font-bold text-[#0D2329]">
                  ❓ Criei uma sessão no EvoluIA, quanto tempo demora para aparecer no celular?
                </p>
                <p className="text-[11px] text-[#6B7C83] leading-relaxed">
                  O Google e a Apple sincronizam automaticamente em segundo plano a cada poucas horas. Se você quiser ver na hora, basta abrir o app do Google Agenda no celular, tocar nos 3 pontinhos no canto superior direito e clicar em <strong>"Atualizar"</strong>.
                </p>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-[#D8E5E7] space-y-1">
                <p className="font-bold text-[#0D2329]">
                  ❓ Meus compromissos pessoais do Google vão aparecer para outras pessoas?
                </p>
                <p className="text-[11px] text-[#6B7C83] leading-relaxed">
                  Não! O link do EvoluIA é 100% unilateral e seguro: ele apenas envia os seus atendimentos clínicos para a sua agenda pessoal. Ninguém tem acesso aos seus compromissos particulares.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ADICIONAR PSICOPEDAGOGA
          ========================================================================= */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-[#EEF5F6] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0D2329]">Adicionar Psicopedagoga</h3>
                  <p className="text-xs font-semibold text-[#6B7C83]">
                    Crie um novo acesso adicional para sua equipe.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="w-8 h-8 rounded-full bg-[#F7FAFA] text-[#6B7C83] hover:text-[#0D2329] flex items-center justify-center transition-colors font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0D2329]">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={addMemberForm.fullName}
                  onChange={(e) => setAddMemberForm({ ...addMemberForm, fullName: e.target.value })}
                  placeholder="Ex: Ana Oliveira"
                  className="w-full px-4 py-2.5 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all text-[#0D2329]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0D2329]">E-mail de Acesso *</label>
                <input
                  type="email"
                  required
                  value={addMemberForm.email}
                  onChange={(e) => setAddMemberForm({ ...addMemberForm, email: e.target.value })}
                  placeholder="ana@email.com"
                  className="w-full px-4 py-2.5 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all text-[#0D2329]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#0D2329]">Senha *</label>
                  <div className="relative">
                    <input
                      type={showAddPassword ? "text" : "password"}
                      required
                      value={addMemberForm.password}
                      onChange={(e) => setAddMemberForm({ ...addMemberForm, password: e.target.value })}
                      placeholder="Mínimo 6 dígitos"
                      className="w-full px-4 py-2.5 pr-10 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all text-[#0D2329]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8CAAB1] hover:text-[#0D2329]"
                    >
                      {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#0D2329]">Confirmar Senha *</label>
                  <div className="relative">
                    <input
                      type={showAddConfirmPassword ? "text" : "password"}
                      required
                      value={addMemberForm.confirmPassword}
                      onChange={(e) => setAddMemberForm({ ...addMemberForm, confirmPassword: e.target.value })}
                      placeholder="Repita a senha"
                      className="w-full px-4 py-2.5 pr-10 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all text-[#0D2329]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddConfirmPassword(!showAddConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8CAAB1] hover:text-[#0D2329]"
                    >
                      {showAddConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* TOGGLE ACESSO AOS DADOS DA CONTA PRINCIPAL */}
              <div className="p-4 rounded-2xl bg-[#FEF8EC] border-2 border-[#F4C95D]/60 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-[#8B6514]">
                      Permitir acesso aos dados da conta principal
                    </p>
                    <p className="text-[11px] font-semibold text-[#8B6514]/80">
                      {addMemberForm.allowMasterDataAccess
                        ? "Ativado: Esta profissional poderá visualizar os pacientes e informações da conta principal."
                        : "Desativado: Esta profissional terá um espaço independente com seus próprios pacientes."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setAddMemberForm({
                        ...addMemberForm,
                        allowMasterDataAccess: !addMemberForm.allowMasterDataAccess,
                      })
                    }
                    className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                      addMemberForm.allowMasterDataAccess ? "bg-[#7C3AED]" : "bg-[#CBD5E1]"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow-sm ${
                        addMemberForm.allowMasterDataAccess ? "left-6" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EEF5F6]">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#D8E5E7] text-xs font-bold text-[#6B7C83] hover:bg-[#F7FAFA] transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={creatingMember}
                  className="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black shadow-md active:scale-95 transition-all flex items-center gap-2"
                >
                  {creatingMember ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>{creatingMember ? "Criando Acesso..." : "Criar Acesso"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: EDITAR PSICOPEDAGOGA
          ========================================================================= */}
      {showEditMemberModal && memberToEdit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-[#EEF5F6] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0D2329]">Editar Psicopedagoga</h3>
                  <p className="text-xs font-semibold text-[#6B7C83]">
                    Atualize os dados e permissão de acesso.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowEditMemberModal(false)}
                className="w-8 h-8 rounded-full bg-[#F7FAFA] text-[#6B7C83] hover:text-[#0D2329] flex items-center justify-center transition-colors font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0D2329]">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={editMemberForm.fullName}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, fullName: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all text-[#0D2329]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0D2329]">E-mail de Acesso *</label>
                <input
                  type="email"
                  required
                  value={editMemberForm.email}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all text-[#0D2329]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0D2329]">Nova Senha (Opcional)</label>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editMemberForm.password}
                    onChange={(e) => setEditMemberForm({ ...editMemberForm, password: e.target.value })}
                    placeholder="Deixe em branco para não alterar"
                    className="w-full px-4 py-2.5 pr-10 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all text-[#0D2329]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8CAAB1] hover:text-[#0D2329]"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* TOGGLE ACESSO AOS DADOS DA CONTA PRINCIPAL */}
              <div className="p-4 rounded-2xl bg-[#FEF8EC] border-2 border-[#F4C95D]/60 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-[#8B6514]">
                      Permitir acesso aos dados da conta principal
                    </p>
                    <p className="text-[11px] font-semibold text-[#8B6514]/80">
                      {editMemberForm.allowMasterDataAccess
                        ? "Ativado: Esta profissional poderá visualizar os pacientes e informações da conta principal."
                        : "Desativado: Esta profissional terá um espaço independente com seus próprios pacientes."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setEditMemberForm({
                        ...editMemberForm,
                        allowMasterDataAccess: !editMemberForm.allowMasterDataAccess,
                      })
                    }
                    className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                      editMemberForm.allowMasterDataAccess ? "bg-[#7C3AED]" : "bg-[#CBD5E1]"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow-sm ${
                        editMemberForm.allowMasterDataAccess ? "left-6" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EEF5F6]">
                <button
                  type="button"
                  onClick={() => setShowEditMemberModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#D8E5E7] text-xs font-bold text-[#6B7C83] hover:bg-[#F7FAFA] transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={updatingMember}
                  className="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black shadow-md active:scale-95 transition-all flex items-center gap-2"
                >
                  {updatingMember ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{updatingMember ? "Salvando..." : "Salvar Alterações"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: CONFIRMAÇÃO DE REMOÇÃO DE PSICOPEDAGOGA
          ========================================================================= */}
      {showRemoveMemberModal && memberToRemove && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border-2 border-[#FCA5A5] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] flex items-center justify-center font-bold">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-[#0D2329]">
                Remover psicopedagoga da equipe?
              </h3>
              <p className="text-xs font-semibold text-[#6B7C83] leading-relaxed">
                Tem certeza que deseja remover <strong>{memberToRemove.full_name}</strong> ({memberToRemove.email}) da sua equipe? O acesso dela ao sistema será cancelado, e todos os registros e pacientes existentes permanecerão preservados com segurança.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EEF5F6]">
              <button
                type="button"
                onClick={() => setShowRemoveMemberModal(false)}
                className="px-4 py-2.5 rounded-xl border border-[#D8E5E7] text-xs font-bold text-[#6B7C83] hover:bg-[#F7FAFA] transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={removingMember}
                onClick={handleConfirmRemoveMember}
                className="px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black shadow-md active:scale-95 transition-all flex items-center gap-2"
              >
                {removingMember ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{removingMember ? "Removendo..." : "Sim, Remover Acesso"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Crop & Reframe Modal for Logo */}
      <ImageCropperModal
        open={cropperOpen}
        imageSrc={imageToCrop}
        onClose={() => setCropperOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </div>
  )
}
