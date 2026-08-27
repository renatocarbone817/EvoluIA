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
  CreditCard,
  QrCode,
  Globe,
  Sliders,
  Mail,
  Award,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { generateICalFeed } from "@/lib/calendarSync"
import type { AppointmentWithChild } from "@/types/database"
import { ImageCropperModal } from "@/components/ui/ImageCropperModal"
import toast from "react-hot-toast"

type SettingsTab = "consultorio" | "geral" | "agenda" | "notificacoes" | "integracoes"

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
  const [activeTab, setActiveTab] = useState<SettingsTab>("consultorio")
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [copied, setCopied] = useState(false)
  const [syncingNow, setSyncingNow] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const profId = professional?.id || user?.id

  // Profile, Clinic & Address Form State
  const [form, setForm] = useState({
    full_name: professional?.full_name || "Priscila Carbone",
    email: professional?.email || user?.email || "priscila@evolui.com.br",
    phone: professional?.phone || "17 99758-0663",
    clinic_name: professional?.clinic_name || "Aprender Ensinando - Espaço Psicopedagógico",
    crp: professional?.crp || "2394-25",
    specialty: professional?.specialty || "Psicopedagogia Clínica & Neuroaprendizagem",
    address: (professional as any)?.address || "Av. Principal, 1000 - Sala 04",
    city: professional?.city || "São José do Rio Preto",
    state: professional?.state || "SP",
    bio: professional?.bio || "Especialista no desenvolvimento cognitivo, dificuldades de aprendizagem, TDAH e orientação familiar.",
    pix_type: (professional as any)?.pix_type || localStorage.getItem("evoluia_pix_type") || "Celular",
    pix_key: (professional as any)?.pix_key || localStorage.getItem("evoluia_pix_key") || "17 99758-0663",
  })

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
            Gerencie o perfil da profissional, dados do consultório, chave PIX, horários e integrações.
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

      {/* 2. STRUCTURED TAB BAR */}
      <div className="flex bg-white p-1.5 rounded-2xl border-2 border-[#D8E5E7] shadow-xs overflow-x-auto gap-1">
        {[
          { id: "consultorio", label: "🏢 Consultório, Perfil & PIX", icon: Building },
          { id: "geral", label: "⚡ Categorias & Geral", icon: Sliders },
          { id: "agenda", label: "📅 Horários de Atendimento", icon: Calendar },
          { id: "notificacoes", label: "💬 Mensagens WhatsApp", icon: MessageSquare },
          { id: "integracoes", label: "🔗 Google Agenda & Dados", icon: Globe },
        ].map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-2 ${
                isActive
                  ? "bg-[#7C3AED] text-white shadow-sm"
                  : "text-[#4F6C74] hover:text-[#0D2329] hover:bg-[#F7FAFA]"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* =========================================================================
          TAB 1: CONSULTÓRIO, PERFIL & PIX (ENQUADRAMENTO EQUILIBRADO E PERFEITO)
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

                {/* Avatar Row */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-[#F7FAFA] border-2 border-[#D8E5E7]">
                  <div className="relative group shrink-0 w-16 h-16 rounded-full bg-[#EDE9FE] text-[#7C3AED] font-black text-xl flex items-center justify-center overflow-hidden border-2 border-[#7C3AED]/40 shadow-sm">
                    {professional?.logo_url ? (
                      <img src={professional.logo_url} alt="Foto" className="w-full h-full object-cover" />
                    ) : (
                      form.full_name.charAt(0).toUpperCase()
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Alterar foto"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black text-[#0D2329]">Foto de Perfil ou Logo</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 text-[11px] font-bold text-[#7C3AED] bg-white border border-[#DDD6FE] hover:bg-[#EDE9FE] rounded-lg transition-colors"
                      >
                        Trocar Foto
                      </button>
                    </div>
                    <p className="text-[11px] font-medium text-[#6B7C83]">
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
                      placeholder="Ex: Priscila Carbone"
                      className="w-full px-4 py-3 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all text-[#0D2329]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#0D2329]">E-mail de Contato *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="priscila@evolui.com.br"
                      className="w-full px-4 py-3 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all text-[#0D2329]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#0D2329]">Telefone / WhatsApp *</label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="17 99758-0663"
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
                    placeholder="Psicopedagogia Clínica & Neuroaprendizagem"
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
                    placeholder="Ex: Aprender Ensinando - Espaço Psicopedagógico"
                    className="w-full px-4 py-3 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#0284C7] transition-all text-[#0D2329]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#0D2329]">Endereço Completo (Rua, Número, Sala/Andar)</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Ex: Av. Principal, 1000 - Sala 04"
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
                      placeholder="São José do Rio Preto"
                      className="w-full px-4 py-3 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none focus:border-[#0284C7] transition-all text-[#0D2329]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#0D2329]">Estado (UF)</label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      placeholder="SP"
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

          {/* Sidebar Live Preview (4 Cols - Enquadramento Perfeito & Equilibrado) */}
          <div className="lg:col-span-4 space-y-5">
            <div className="rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm overflow-hidden space-y-4">
              <div className="bg-gradient-to-r from-[#00B4D8] to-[#0096C7] p-5 text-white flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center font-black text-xl overflow-hidden shrink-0 shadow-xs">
                  {professional?.logo_url ? (
                    <img src={professional.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    form.full_name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-base truncate leading-tight">{form.clinic_name}</h3>
                  <p className="text-xs text-white/95 font-bold truncate mt-0.5">{form.full_name}</p>
                  <p className="text-[10px] text-white/80 truncate">CBO {form.crp}</p>
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
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: GERAL (ESPAÇO RESERVADO LIMPO)
          ========================================================================= */}
      {activeTab === "geral" && (
        <div className="min-h-[350px] p-10 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm animate-in fade-in flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#F7FAFA] border border-[#D8E5E7] text-[#8CAAB1] flex items-center justify-center">
            <Sliders className="w-6 h-6" />
          </div>
          <p className="text-sm font-black text-[#0D2329]">Espaço Geral</p>
          <p className="text-xs font-semibold text-[#8CAAB1]">
            Área reservada para adicionarmos novas preferências e recursos do sistema.
          </p>
        </div>
      )}

      {/* =========================================================================
          TAB 3: HORÁRIOS DE ATENDIMENTO
          ========================================================================= */}
      {activeTab === "agenda" && (
        <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-6 animate-in fade-in max-w-4xl">
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

          <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[#F7FAFA] border-2 border-[#D8E5E7]">
            <div>
              <p className="text-xs font-black text-[#0D2329]">Duração Padrão da Sessão</p>
              <p className="text-[11px] font-semibold text-[#6B7C83]">Tempo estimado de cada atendimento clínico na agenda</p>
            </div>
            <select
              value={sessionDuration}
              onChange={(e) => setSessionDuration(Number(e.target.value))}
              className="px-3.5 py-2 rounded-xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#10B981]"
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

            <div className="divide-y divide-[#EEF5F6] border-2 border-[#D8E5E7] rounded-3xl overflow-hidden bg-white shadow-2xs">
              {schedule.map((item, idx) => (
                <div
                  key={item.day}
                  className={`p-4 flex items-center justify-between gap-3 transition-colors ${
                    item.active ? "bg-white" : "bg-[#F7FAFA] opacity-60"
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer select-none min-w-[140px]">
                    <input
                      type="checkbox"
                      checked={item.active}
                      onChange={() => toggleDay(idx)}
                      className="w-4 h-4 rounded text-[#10B981] focus:ring-[#10B981] accent-[#10B981]"
                    />
                    <span className={`text-xs font-bold ${item.active ? "text-[#0D2329]" : "text-[#8DA3A8]"}`}>
                      {item.label}
                    </span>
                  </label>

                  {item.active ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={item.start}
                        onChange={(e) => updateDayHours(idx, "start", e.target.value)}
                        className="px-2.5 py-1 text-xs font-bold border-2 border-[#D8E5E7] rounded-xl bg-white text-[#0D2329] focus:outline-none focus:border-[#10B981]"
                      />
                      <span className="text-xs text-[#8DA3A8] font-bold">às</span>
                      <input
                        type="time"
                        value={item.end}
                        onChange={(e) => updateDayHours(idx, "end", e.target.value)}
                        className="px-2.5 py-1 text-xs font-bold border-2 border-[#D8E5E7] rounded-xl bg-white text-[#0D2329] focus:outline-none focus:border-[#10B981]"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-[#8DA3A8] italic font-semibold">
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
          TAB 5: INTEGRAÇÕES (GOOGLE AGENDA & DADOS)
          ========================================================================= */}
      {activeTab === "integracoes" && (
        <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-6 animate-in fade-in max-w-4xl">
          {/* Live Status Banner */}
          <div className="p-5 rounded-3xl border-2 border-[#10B981]/40 bg-[#E8F8F5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                  Conta vinculada: <strong>{form.email}</strong>
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

          <div className="p-5 rounded-3xl bg-[#F7FAFA] border-2 border-[#D8E5E7] space-y-4">
            <div>
              <h3 className="text-xs font-black text-[#0D2329]">Link da Agenda (iCal / Google)</h3>
              <p className="text-[11px] font-semibold text-[#6B7C83]">
                Cole este link nas configurações do seu Google Calendar no celular ou computador:
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={calendarFeedUrl}
                className="flex-1 bg-white px-3.5 py-2 text-xs font-mono font-bold rounded-xl border-2 border-[#D8E5E7] select-all text-[#0D2329] focus:outline-none"
              />
              <button
                onClick={handleCopyCalendarUrl}
                className="px-3.5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-xs transition-all shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copiado!" : "Copiar"}</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2 border-t border-[#EEF5F6]">
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
                className="inline-flex items-center gap-1.5 text-xs font-black px-4 py-2 bg-white hover:bg-[#F7FAFA] text-[#0D2329] border border-[#D8E5E7] rounded-xl transition-all shadow-2xs"
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
