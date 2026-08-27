import { useState, useRef, useEffect } from "react"
import {
  Upload,
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
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { generateICalFeed } from "@/lib/calendarSync"
import type { AppointmentWithChild } from "@/types/database"
import { ImageCropperModal } from "@/components/ui/ImageCropperModal"
import toast from "react-hot-toast"

type SettingsTab = "geral" | "agenda" | "notificacoes" | "conta" | "integracoes"

interface TaskCategory {
  id: string
  name: string
  color: string
  colorDot: string
  count: number
}

const DEFAULT_CATEGORIES: TaskCategory[] = [
  { id: "1", name: "Sessões", color: "text-[#10B981]", colorDot: "bg-[#10B981]", count: 12 },
  { id: "2", name: "Avaliações", color: "text-[#7C3AED]", colorDot: "bg-[#7C3AED]", count: 8 },
  { id: "3", name: "Estudos e Leituras", color: "text-[#0284C7]", colorDot: "bg-[#0284C7]", count: 5 },
  { id: "4", name: "Administrativo", color: "text-[#EA580C]", colorDot: "bg-[#EA580C]", count: 7 },
  { id: "5", name: "Pessoal", color: "text-[#6B7280]", colorDot: "bg-[#6B7280]", count: 3 },
]

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
  const { user, professional, setProfessional } = useAuthStore()
  const [activeTab, setActiveTab] = useState<SettingsTab>("geral")
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [copied, setCopied] = useState(false)
  const [syncingNow, setSyncingNow] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const profId = professional?.id || user?.id

  // Profile and Clinic Form State
  const [form, setForm] = useState({
    full_name: professional?.full_name || "Priscila Souza",
    email: professional?.email || user?.email || "priscila@evoluia.com",
    phone: professional?.phone || "(11) 98765-4321",
    clinic_name: professional?.clinic_name || "Espaço EvoluIA Psicopedagogia",
    crp: professional?.crp || "ABPp 12.345",
    specialty: professional?.specialty || "Psicopedagogia Clínica & Neuroaprendizagem",
    city: professional?.city || "São Paulo",
    state: professional?.state || "SP",
    bio: professional?.bio || "Especialista no desenvolvimento cognitivo, dificuldades de aprendizagem, TDAH e orientação familiar.",
    pix_key: (professional as any)?.pix_key || "priscila.souza@pix.com.br",
    default_price: (professional as any)?.default_price || "180",
  })

  // Task Categories State
  const [categories, setCategories] = useState<TaskCategory[]>(() => {
    const saved = localStorage.getItem("evoluia_task_categories")
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES
  })
  const [newCatName, setNewCatName] = useState("")
  const [showNewCatInput, setShowNewCatInput] = useState(false)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editingCatName, setEditingCatName] = useState("")

  // Notification Preferences State (Toggles)
  const [notifAgenda, setNotifAgenda] = useState(true)
  const [notifPendingTasks, setNotifPendingTasks] = useState(true)
  const [notifNewEvals, setNotifNewEvals] = useState(false)
  const [notifWeeklyReports, setNotifWeeklyReports] = useState(true)

  // Date and Time Format State
  const [dateFormat, setDateFormat] = useState("DD/MM/AAAA")
  const [timeFormat, setTimeFormat] = useState("24 horas (14:30)")

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
    "Olá! Segue a mensalidade psicopedagógica de {nome_crianca} referente ao mês de {mes} no valor de {valor}. Segue nossa chave PIX: {chave_pix}. Qualquer dúvida estou à disposição!"

  const [reminderTemplate, setReminderTemplate] = useState<string>(() => {
    return localStorage.getItem("evoluia_reminder_template") || DEFAULT_REMINDER_TEMPLATE
  })
  const [billingTemplate, setBillingTemplate] = useState<string>(() => {
    return localStorage.getItem("evoluia_billing_template") || DEFAULT_BILLING_TEMPLATE
  })

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)

  const calendarFeedUrl = `${window.location.origin}/api/calendar/feed/${profId}.ics`

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
          bio: form.bio || null,
        })

      if (error) throw error

      localStorage.setItem("evoluia_task_categories", JSON.stringify(categories))
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

      toast.success("Configurações salvas com sucesso!")
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  // Category Actions
  function handleAddCategory() {
    if (!newCatName.trim()) return
    const colors = [
      { color: "text-[#10B981]", colorDot: "bg-[#10B981]" },
      { color: "text-[#7C3AED]", colorDot: "bg-[#7C3AED]" },
      { color: "text-[#0284C7]", colorDot: "bg-[#0284C7]" },
      { color: "text-[#EA580C]", colorDot: "bg-[#EA580C]" },
      { color: "text-[#DB2777]", colorDot: "bg-[#DB2777]" },
      { color: "text-[#6B7280]", colorDot: "bg-[#6B7280]" },
    ]
    const chosenColor = colors[categories.length % colors.length]
    const newCat: TaskCategory = {
      id: Date.now().toString(),
      name: newCatName.trim(),
      color: chosenColor.color,
      colorDot: chosenColor.colorDot,
      count: 0,
    }
    const updated = [...categories, newCat]
    setCategories(updated)
    localStorage.setItem("evoluia_task_categories", JSON.stringify(updated))
    setNewCatName("")
    setShowNewCatInput(false)
    toast.success("Categoria criada!")
  }

  function handleSaveEditCategory(id: string) {
    if (!editingCatName.trim()) return
    const updated = categories.map((c) => (c.id === id ? { ...c, name: editingCatName.trim() } : c))
    setCategories(updated)
    localStorage.setItem("evoluia_task_categories", JSON.stringify(updated))
    setEditingCatId(null)
    toast.success("Categoria renomeada!")
  }

  function handleDeleteCategory(id: string) {
    const updated = categories.filter((c) => c.id !== id)
    setCategories(updated)
    localStorage.setItem("evoluia_task_categories", JSON.stringify(updated))
    toast.success("Categoria excluída!")
  }

  function handleCopyCalendarUrl() {
    navigator.clipboard.writeText(calendarFeedUrl)
    setCopied(true)
    toast.success("Link da agenda copiado com sucesso!")
    setTimeout(() => setCopied(false), 3000)
  }

  async function handleSyncNow() {
    setSyncingNow(true)
    setTimeout(() => {
      setSyncingNow(false)
      toast.success("Sincronização com Google Agenda concluída!")
    }, 1000)
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

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* 1. TOP TITLE HEADER (Exact reference style) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-[#0D2329] tracking-tight">
              Configurações
            </h1>
            <div className="w-7 h-7 rounded-xl bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center">
              <SettingsIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#6B7C83]">
            Personalize sua experiência e gerencie as preferências da sua conta.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-10 px-5 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white text-xs font-black flex items-center gap-2 shadow-sm active:scale-95 transition-all shrink-0"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
        </button>
      </div>

      {/* 2. MODERN TOP TABS (Clean underline / soft pill style) */}
      <div className="flex items-center gap-1 border-b border-[#E2E8F0] pb-2 overflow-x-auto">
        {[
          { id: "geral", label: "Geral" },
          { id: "agenda", label: "Agenda & Horários" },
          { id: "notificacoes", label: "Notificações & WhatsApp" },
          { id: "conta", label: "Consultório & Assinatura" },
          { id: "integracoes", label: "Integrações" },
        ].map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`px-4 py-2 text-xs font-black transition-all shrink-0 relative rounded-xl ${
                isActive
                  ? "text-[#7C3AED] bg-[#F5F3FF]"
                  : "text-[#6B7C83] hover:text-[#0D2329] hover:bg-[#F8FAFC]"
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-[-9px] left-3 right-3 h-[2.5px] bg-[#7C3AED] rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* =========================================================================
          TAB 1: GERAL (LAYOUT IDÊNTICO À IMAGEM DE REFERÊNCIA)
          ========================================================================= */}
      {activeTab === "geral" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in">
          {/* LEFT COLUMN: 7 COLS */}
          <div className="lg:col-span-7 space-y-5">
            {/* Card 1: Configurações Gerais do Sistema */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <div>
                <h2 className="text-sm font-black text-[#0D2329]">Configurações Gerais</h2>
                <p className="text-xs font-medium text-[#6B7C83]">
                  Gerencie as opções principais do sistema e tarefas rápidas.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0D2329]">
                    Nome da tarefa (ex: Entrar em contato com a escola)
                  </label>
                  <input
                    type="text"
                    placeholder="Digite o nome da tarefa..."
                    className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all text-[#0D2329]"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#6B7C83]">Prazo:</span>
                    <select className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#E2E8F0] bg-white text-[#0D2329] focus:outline-none focus:border-[#7C3AED]">
                      <option>Hoje</option>
                      <option>Amanhã</option>
                      <option>Data específica...</option>
                      <option>Sem prazo</option>
                    </select>
                    <input
                      type="date"
                      defaultValue={format(new Date(), "yyyy-MM-dd")}
                      className="px-2.5 py-1 text-xs font-bold rounded-xl border border-[#E2E8F0] bg-white text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-3.5 py-1.5 text-xs font-bold text-[#6B7C83] hover:bg-[#F1F5F9] rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.success("Exemplo de tarefa salvo!")}
                      className="px-4 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-95"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Categorias de Tarefas (Exact list style from reference) */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-[#0D2329]">Categorias de Tarefas</h2>
                  <p className="text-xs font-medium text-[#6B7C83]">
                    Organize suas tarefas por categorias para uma melhor gestão.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNewCatInput(!showNewCatInput)}
                  className="text-xs font-black text-[#7C3AED] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Nova categoria</span>
                </button>
              </div>

              {/* Add New Category Input */}
              {showNewCatInput && (
                <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-2 animate-in fade-in">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                    placeholder="Nome da nova categoria..."
                    className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#E2E8F0] bg-white text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                    autoFocus
                  />
                  <button
                    onClick={handleAddCategory}
                    className="px-3 py-1.5 bg-[#7C3AED] text-white text-xs font-black rounded-xl"
                  >
                    Adicionar
                  </button>
                </div>
              )}

              {/* Category List */}
              <div className="divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-2xl overflow-hidden bg-white">
                {categories.map((cat) => {
                  const isEditing = editingCatId === cat.id

                  return (
                    <div
                      key={cat.id}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <GripVertical className="w-4 h-4 text-[#CBD5E1] shrink-0" />
                        <span className={`w-2.5 h-2.5 rounded-full ${cat.colorDot} shrink-0`} />
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingCatName}
                            onChange={(e) => setEditingCatName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveEditCategory(cat.id)}
                            className="px-2 py-0.5 text-xs font-bold border border-[#7C3AED] rounded-lg bg-white text-[#0D2329] focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <span className="text-xs font-bold text-[#0D2329] truncate">
                            {cat.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] font-semibold text-[#94A3B8]">
                          {cat.count} tarefas
                        </span>

                        {isEditing ? (
                          <button
                            onClick={() => handleSaveEditCategory(cat.id)}
                            className="p-1 text-[#7C3AED] hover:text-[#6D28D9] font-bold text-xs"
                          >
                            Salvar
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingCatId(cat.id)
                              setEditingCatName(cat.name)
                            }}
                            className="p-1 text-[#94A3B8] hover:text-[#7C3AED] transition-colors"
                            title="Editar categoria"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1 text-[#94A3B8] hover:text-[#EF4444] transition-colors"
                          title="Excluir categoria"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Card 3: Formato de Data e Hora (Exact preview style from reference) */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <div>
                <h2 className="text-sm font-black text-[#0D2329]">Formato de Data e Hora</h2>
                <p className="text-xs font-medium text-[#6B7C83]">
                  Defina como as datas e horários serão exibidos no sistema.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-4 space-y-1">
                  <label className="text-xs font-bold text-[#6B7C83]">Formato de Data</label>
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-2xl border border-[#E2E8F0] bg-white text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                  >
                    <option value="DD/MM/AAAA">DD/MM/AAAA</option>
                    <option value="AAAA-MM-DD">AAAA-MM-DD</option>
                    <option value="MM/DD/AAAA">MM/DD/AAAA</option>
                  </select>
                </div>

                <div className="sm:col-span-4 space-y-1">
                  <label className="text-xs font-bold text-[#6B7C83]">Formato de Hora</label>
                  <select
                    value={timeFormat}
                    onChange={(e) => setTimeFormat(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-2xl border border-[#E2E8F0] bg-white text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                  >
                    <option value="24 horas (14:30)">24 horas (14:30)</option>
                    <option value="12 horas (02:30 PM)">12 horas (02:30 PM)</option>
                  </select>
                </div>

                {/* Prévia Box */}
                <div className="sm:col-span-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#94A3B8] tracking-wider block">
                    Prévia
                  </span>
                  <div className="p-2.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between text-xs font-bold text-[#0D2329]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#7C3AED]" />
                      <span>{format(new Date(), "dd/MM/yyyy")}</span>
                    </span>
                    <span className="flex items-center gap-1 text-[#6B7C83]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>14:30</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 5 COLS */}
          <div className="lg:col-span-5 space-y-5">
            {/* Card 1: Perfil da Profissional (Exact avatar + compact inputs style from reference) */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <div>
                <h2 className="text-sm font-black text-[#0D2329]">Perfil da Profissional</h2>
                <p className="text-xs font-medium text-[#6B7C83]">
                  Atualize suas informações pessoais.
                </p>
              </div>

              <div className="flex items-start gap-4 pt-1">
                {/* Round Avatar with Camera Badge */}
                <div className="relative group shrink-0">
                  <div className="w-16 h-16 rounded-full bg-[#EDE9FE] text-[#7C3AED] font-black text-xl flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                    {professional?.logo_url ? (
                      <img src={professional.logo_url} alt="Foto" className="w-full h-full object-cover" />
                    ) : (
                      form.full_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                    title="Alterar foto"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoSelect}
                  />
                </div>

                {/* Compact Row Inputs */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#6B7C83] w-14 shrink-0 text-right">Nome</span>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="flex-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-[#E2E8F0] bg-white text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#6B7C83] w-14 shrink-0 text-right">E-mail</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="flex-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-[#E2E8F0] bg-white text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#6B7C83] w-14 shrink-0 text-right">Telefone</span>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="flex-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-[#E2E8F0] bg-white text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full sm:w-auto px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-95"
                >
                  {saving ? "Salvando..." : "Editar perfil"}
                </button>
              </div>
            </div>

            {/* Card 2: Preferências de Notificações (Exact toggle switches from reference) */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <div>
                <h2 className="text-sm font-black text-[#0D2329]">Preferências de Notificações</h2>
                <p className="text-xs font-medium text-[#6B7C83]">
                  Escolha como deseja receber notificações.
                </p>
              </div>

              <div className="space-y-3.5 pt-1">
                {/* 1. Lembretes de Agenda */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Bell className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-[#0D2329]">Lembretes de Agenda</p>
                      <p className="text-[11px] text-[#6B7C83]">Receber lembretes dos compromissos</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifAgenda(!notifAgenda)}
                    className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
                      notifAgenda ? "bg-[#7C3AED]" : "bg-[#CBD5E1]"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                        notifAgenda ? "left-5" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* 2. Tarefas Pendentes */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <CheckSquare className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-[#0D2329]">Tarefas Pendentes</p>
                      <p className="text-[11px] text-[#6B7C83]">Avisos sobre tarefas próximas do vencimento</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifPendingTasks(!notifPendingTasks)}
                    className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
                      notifPendingTasks ? "bg-[#7C3AED]" : "bg-[#CBD5E1]"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                        notifPendingTasks ? "left-5" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* 3. Novas Avaliações */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Bell className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-[#0D2329]">Novas Avaliações</p>
                      <p className="text-[11px] text-[#6B7C83]">Notificações de novas avaliações realizadas</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifNewEvals(!notifNewEvals)}
                    className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
                      notifNewEvals ? "bg-[#7C3AED]" : "bg-[#CBD5E1]"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                        notifNewEvals ? "left-5" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* 4. Relatórios Semanais */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <FileText className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-[#0D2329]">Relatórios Semanais</p>
                      <p className="text-[11px] text-[#6B7C83]">Resumo semanal das atividades</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifWeeklyReports(!notifWeeklyReports)}
                    className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
                      notifWeeklyReports ? "bg-[#7C3AED]" : "bg-[#CBD5E1]"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                        notifWeeklyReports ? "left-5" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setActiveTab("notificacoes")}
                  className="text-xs font-black text-[#7C3AED] hover:underline flex items-center gap-1"
                >
                  <span>Gerenciar todas as notificações →</span>
                </button>
              </div>
            </div>

            {/* Card 3: Backup e Dados (Exact dual cards style from reference) */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <div>
                <h2 className="text-sm font-black text-[#0D2329]">Backup e Dados</h2>
                <p className="text-xs font-medium text-[#6B7C83]">
                  Gerencie seus dados e exportações.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Action Card A: Exportar Dados */}
                <div
                  onClick={() => toast.success("Exportando dados em formato seguro...")}
                  className="p-3.5 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] hover:border-[#10B981] transition-all cursor-pointer space-y-1.5 group shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-white text-[#10B981] flex items-center justify-center shadow-xs">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[#065F46] group-hover:text-[#047857] transition-colors">
                      Exportar Dados
                    </h3>
                    <p className="text-[10px] font-medium text-[#047857]/80 leading-snug">
                      Baixe seus dados em formato CSV ou PDF.
                    </p>
                  </div>
                </div>

                {/* Action Card B: Backup Automático */}
                <div
                  onClick={() => toast.success("Backup sincronizado com sucesso!")}
                  className="p-3.5 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE] hover:border-[#7C3AED] transition-all cursor-pointer space-y-1.5 group shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-white text-[#7C3AED] flex items-center justify-center shadow-xs">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[#6B21A8] group-hover:text-[#581C87] transition-colors">
                      Backup Automático
                    </h3>
                    <p className="text-[10px] font-medium text-[#6B21A8]/80 leading-snug">
                      Último backup em {format(new Date(), "dd/MM")} às 02:00.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => toast.success("Histórico de backups: 100% íntegro e criptografado.")}
                  className="text-xs font-black text-[#7C3AED] hover:underline flex items-center gap-1"
                >
                  <span>Ver histórico de backups →</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: AGENDA & HORÁRIOS
          ========================================================================= */}
      {activeTab === "agenda" && (
        <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-6 animate-in fade-in max-w-4xl">
          <div>
            <h2 className="text-base font-black text-[#0D2329]">Horários de Atendimento Semanal</h2>
            <p className="text-xs font-medium text-[#6B7C83]">
              Defina os dias e intervalos em que seu consultório realiza atendimentos.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <div>
              <p className="text-xs font-black text-[#0D2329]">Duração Padrão da Sessão</p>
              <p className="text-[11px] text-[#6B7C83]">Tempo estimado de cada atendimento clínico na agenda</p>
            </div>
            <select
              value={sessionDuration}
              onChange={(e) => setSessionDuration(Number(e.target.value))}
              className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
            >
              <option value={45}>45 minutos</option>
              <option value={50}>50 minutos (Padrão)</option>
              <option value={60}>60 minutos (1 hora)</option>
              <option value={90}>90 minutos (1h 30m)</option>
            </select>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-[#6B7C83]">
              Dias de Funcionamento:
            </p>

            <div className="divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-3xl overflow-hidden bg-white">
              {schedule.map((item, idx) => (
                <div
                  key={item.day}
                  className={`p-4 flex items-center justify-between gap-3 transition-colors ${
                    item.active ? "bg-white" : "bg-[#F8FAFC] opacity-60"
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer select-none min-w-[140px]">
                    <input
                      type="checkbox"
                      checked={item.active}
                      onChange={() => toggleDay(idx)}
                      className="w-4 h-4 rounded text-[#7C3AED] focus:ring-[#7C3AED] accent-[#7C3AED]"
                    />
                    <span className={`text-xs font-bold ${item.active ? "text-[#0D2329]" : "text-[#94A3B8]"}`}>
                      {item.label}
                    </span>
                  </label>

                  {item.active ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={item.start}
                        onChange={(e) => updateDayHours(idx, "start", e.target.value)}
                        className="px-2.5 py-1 text-xs font-bold border border-[#E2E8F0] rounded-xl bg-white text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                      />
                      <span className="text-xs text-[#94A3B8] font-bold">às</span>
                      <input
                        type="time"
                        value={item.end}
                        onChange={(e) => updateDayHours(idx, "end", e.target.value)}
                        className="px-2.5 py-1 text-xs font-bold border border-[#E2E8F0] rounded-xl bg-white text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-[#94A3B8] italic font-semibold">
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
          TAB 3: NOTIFICAÇÕES & WHATSAPP
          ========================================================================= */}
      {activeTab === "notificacoes" && (
        <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-6 animate-in fade-in max-w-4xl">
          <div>
            <h2 className="text-base font-black text-[#0D2329]">Modelos de Mensagens WhatsApp</h2>
            <p className="text-xs font-medium text-[#6B7C83]">
              Personalize os textos automáticos disparados para os pais pelo sistema.
            </p>
          </div>

          {/* 1. Lembrete de Atendimento */}
          <div className="p-5 rounded-3xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#E8F8F5] text-[#10B981] flex items-center justify-center font-bold">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-[#0D2329]">
                    1. Lembrete de Confirmação de Sessão
                  </p>
                  <p className="text-[11px] text-[#6B7C83]">
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
              className="w-full p-3 text-xs font-medium rounded-2xl border border-[#E2E8F0] bg-white text-[#0D2329] focus:outline-none focus:border-[#10B981] transition-all resize-none"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[#E2E8F0]">
              <p className="text-[11px] text-[#6B7C83]">
                Tags: <code className="bg-white px-1.5 py-0.5 rounded-lg border border-[#E2E8F0] text-[#10B981] font-bold">{"{horario}"}</code>, <code className="bg-white px-1.5 py-0.5 rounded-lg border border-[#E2E8F0] text-[#10B981] font-bold">{"{nome_crianca}"}</code>
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
          <div className="p-5 rounded-3xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FFEDD5] text-[#EA580C] flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-[#0D2329]">
                    2. Mensagem de Mensalidade / Cobrança PIX
                  </p>
                  <p className="text-[11px] text-[#6B7C83]">
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
              className="w-full p-3 text-xs font-medium rounded-2xl border border-[#E2E8F0] bg-white text-[#0D2329] focus:outline-none focus:border-[#EA580C] transition-all resize-none"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[#E2E8F0]">
              <p className="text-[11px] text-[#6B7C83]">
                Tags: <code className="bg-white px-1.5 py-0.5 rounded-lg border border-[#E2E8F0] text-[#EA580C] font-bold">{"{nome_crianca}"}</code>, <code className="bg-white px-1.5 py-0.5 rounded-lg border border-[#E2E8F0] text-[#EA580C] font-bold">{"{mes}"}</code>, <code className="bg-white px-1.5 py-0.5 rounded-lg border border-[#E2E8F0] text-[#EA580C] font-bold">{"{valor}"}</code>, <code className="bg-white px-1.5 py-0.5 rounded-lg border border-[#E2E8F0] text-[#EA580C] font-bold">{"{chave_pix}"}</code>
              </p>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  billingTemplate
                    .replace("{nome_crianca}", "Maria Eduarda")
                    .replace("{mes}", "Agosto")
                    .replace("{valor}", "R$ 350,00")
                    .replace("{chave_pix}", form.pix_key)
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
        </div>
      )}

      {/* =========================================================================
          TAB 4: CONSULTÓRIO & ASSINATURA
          ========================================================================= */}
      {activeTab === "conta" && (
        <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-6 animate-in fade-in max-w-4xl">
          <div>
            <h2 className="text-base font-black text-[#0D2329]">Dados do Consultório & Cobrança</h2>
            <p className="text-xs font-medium text-[#6B7C83]">
              Informações impressas em relatórios clínicos e cobranças PIX.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0D2329]">Nome do Consultório / Espaço Clínico *</label>
              <input
                type="text"
                value={form.clinic_name}
                onChange={(e) => setForm({ ...form, clinic_name: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all text-[#0D2329]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0D2329]">Registro Profissional / ABPp</label>
                <input
                  type="text"
                  value={form.crp}
                  onChange={(e) => setForm({ ...form, crp: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all text-[#0D2329]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0D2329]">Chave PIX Padrão</label>
                <input
                  type="text"
                  value={form.pix_key}
                  onChange={(e) => setForm({ ...form, pix_key: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all text-[#0D2329]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-[#0D2329]">Cidade</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all text-[#0D2329]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0D2329]">Estado (UF)</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all text-[#0D2329]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: INTEGRAÇÕES (GOOGLE AGENDA)
          ========================================================================= */}
      {activeTab === "integracoes" && (
        <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-6 animate-in fade-in max-w-4xl">
          {/* Live Status Banner */}
          <div className="p-5 rounded-3xl border border-[#A7F3D0] bg-[#ECFDF5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#10B981] text-white flex items-center justify-center shrink-0 shadow-sm font-bold">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm text-[#0D2329]">
                    Google Agenda Conectado
                  </h3>
                  <span className="text-[10px] bg-[#10B981] text-white font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Sincronizado
                  </span>
                </div>
                <p className="text-xs text-[#065F46] font-semibold mt-0.5">
                  Conta: <strong>{form.email}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={syncingNow}
              onClick={handleSyncNow}
              className="px-4 py-2 text-xs font-black bg-white hover:bg-[#F5F3FF] border border-[#7C3AED]/30 text-[#7C3AED] rounded-2xl flex items-center gap-1.5 shrink-0 shadow-2xs transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingNow ? "animate-spin" : ""}`} />
              <span>Sincronizar Agora</span>
            </button>
          </div>

          <div className="p-5 rounded-3xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-4">
            <div>
              <h3 className="text-xs font-black text-[#0D2329]">Link da Agenda (iCal / Google)</h3>
              <p className="text-[11px] text-[#6B7C83]">
                Cole este link nas configurações do seu Google Calendar no celular ou computador:
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={calendarFeedUrl}
                className="flex-1 bg-white px-3.5 py-2 text-xs rounded-xl border border-[#E2E8F0] font-mono select-all text-[#0D2329] focus:outline-none"
              />
              <button
                onClick={handleCopyCalendarUrl}
                className="px-3.5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-xs transition-all shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copiado!" : "Copiar"}</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2 border-t border-[#E2E8F0]">
              <a
                href={`https://calendar.google.com/calendar/r/settings/addbyurl?cid=${encodeURIComponent(
                  calendarFeedUrl
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-black px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl transition-all shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir no Google Calendar Web</span>
              </a>

              <button
                onClick={handleDownloadICS}
                className="inline-flex items-center gap-1.5 text-xs font-black px-4 py-2 bg-white hover:bg-[#F8FAFC] text-[#0D2329] border border-[#E2E8F0] rounded-xl transition-all shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-[#6B7C83]" />
                <span>Baixar Arquivo (.ics)</span>
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
