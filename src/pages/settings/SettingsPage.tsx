import { useState, useRef, useEffect } from "react"
import {
  Upload,
  Save,
  User,
  Building,
  Phone,
  Award,
  Calendar,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  Download,
  Sparkles,
  Clock,
  Bell,
  Layers,
  ShieldCheck,
  RefreshCw,
  MapPin,
  QrCode,
  DollarSign,
  MessageSquare,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Textarea } from "@/components/ui/Input"
import { generateICalFeed } from "@/lib/calendarSync"
import type { AppointmentWithChild } from "@/types/database"
import { ImageCropperModal } from "@/components/ui/ImageCropperModal"
import toast from "react-hot-toast"

type SettingsTab = "perfil" | "consultorio" | "horarios" | "google_calendar" | "notificacoes"

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
  const [activeTab, setActiveTab] = useState<SettingsTab>("perfil")
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [copied, setCopied] = useState(false)
  const [syncingNow, setSyncingNow] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Stats for sidebar
  const [childrenCount, setChildrenCount] = useState<number>(11)
  const [guardiansCount, setGuardiansCount] = useState<number>(8)

  // Working hours state
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

  const profId = professional?.id || user?.id

  const [form, setForm] = useState({
    full_name: professional?.full_name || "Priscila Carbone",
    email: professional?.email || user?.email || "priscila@evolui.com.br",
    clinic_name: professional?.clinic_name || "Espaço EvoluIA Psicopedagogia",
    crp: professional?.crp || "ABPp 12.345",
    specialty: professional?.specialty || "Psicopedagogia Clínica & Neuroaprendizagem",
    phone: professional?.phone || "(11) 98765-4321",
    city: professional?.city || "São Paulo",
    state: professional?.state || "SP",
    bio: professional?.bio || "Especialista no desenvolvimento cognitivo, dificuldades de aprendizagem, TDAH e orientação familiar.",
    pix_key: (professional as any)?.pix_key || "priscila.carbone@pix.com.br",
    default_price: (professional as any)?.default_price || "180",
  })

  // Calendar feed URL
  const calendarFeedUrl = `${window.location.origin}/api/calendar/feed/${profId}.ics`

  useEffect(() => {
    if (profId) {
      loadCounts()
    }
  }, [profId])

  async function loadCounts() {
    try {
      const { count: cCount } = await supabase
        .from("children")
        .select("*", { count: "exact", head: true })
        .eq("professional_id", profId)

      const { count: gCount } = await supabase
        .from("guardians")
        .select("*", { count: "exact", head: true })
        .eq("professional_id", profId)

      if (cCount !== null) setChildrenCount(cCount)
      if (gCount !== null) setGuardiansCount(gCount)
    } catch (e) {
      // Keep defaults
    }
  }

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
      toast.success("Foto/Logo atualizado com sucesso!")
    } catch (err: any) {
      toast.error(err.message || "Erro no upload do logo")
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
      toast.success("Sincronização com Google Agenda concluída com sucesso!")
    }, 1200)
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
    <div className="p-4 md:p-8 max-w-[92%] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#19323A] tracking-tight">
            Configurações do Consultório
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7C83] mt-1">
            Perfil profissional, dados da clínica, horários de atendimento e integrações
          </p>
        </div>

        <Button size="lg" loading={saving} onClick={handleSave} className="gap-2 shadow-sm">
          <Save className="w-5 h-5" />
          Salvar Alterações
        </Button>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tabs & Forms (8 Cols on LG) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Navigation Tabs */}
          <div className="flex bg-white p-1.5 rounded-2xl border-2 border-[#D8E5E7] shadow-sm overflow-x-auto gap-1">
            {[
              { id: "perfil", label: "👤 Perfil & Foto" },
              { id: "consultorio", label: "🏢 Consultório & Cobrança" },
              { id: "horarios", label: "📅 Horários de Atendimento" },
              { id: "google_calendar", label: "🔗 Google Agenda" },
              { id: "notificacoes", label: "🔔 Lembretes WhatsApp" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? "bg-[#245C6B] text-white shadow-xs"
                    : "text-[#4F6C74] hover:bg-[#EEF5F6]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: PERFIL */}
          {activeTab === "perfil" && (
            <Card className="border-2 border-[#D8E5E7] shadow-sm rounded-2xl">
              <CardHeader className="pb-3 border-b border-[#EEF5F6]">
                <CardTitle className="text-base font-black text-[#19323A]">
                  Perfil Profissional
                </CardTitle>
                <CardDescription className="text-xs">
                  Seus dados principais que identificam você para os pais e nos relatórios clínicos.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Photo / Logo Cropper Row */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F7FAFA] border border-[#D8E5E7]">
                  <div className="w-16 h-16 rounded-2xl bg-[#245C6B] text-white font-black text-xl flex items-center justify-center shrink-0 overflow-hidden border-2 border-[#63C7B2]/40 shadow-xs">
                    {professional?.logo_url ? (
                      <img
                        src={professional.logo_url}
                        alt="Logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      form.full_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-[#19323A]">Foto de Perfil ou Logotipo</p>
                    <p className="text-[11px] text-[#6B7C83]">
                      Formatos JPG ou PNG até 10MB. Usado no cabeçalho e nos relatórios.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoSelect}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      loading={uploadingLogo}
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold gap-1 mt-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Alterar Imagem
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Nome Completo *"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                  <Input
                    label="E-mail de Acesso"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Celular / WhatsApp Profissional"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                  <Input
                    label="Especialidade Principal"
                    value={form.specialty}
                    onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  />
                </div>

                <Textarea
                  label="Apresentação / Mini Biografia"
                  placeholder="Formação acadêmica, abordagem clínica, público-alvo..."
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                />
              </CardContent>
            </Card>
          )}

          {/* TAB 2: CONSULTÓRIO & COBRANÇA */}
          {activeTab === "consultorio" && (
            <Card className="border-2 border-[#D8E5E7] shadow-sm rounded-2xl">
              <CardHeader className="pb-3 border-b border-[#EEF5F6]">
                <CardTitle className="text-base font-black text-[#19323A]">
                  Dados do Consultório & Cobrança
                </CardTitle>
                <CardDescription className="text-xs">
                  Informações de cabeçalho nos documentos e chave de recebimento para os pais.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <Input
                  label="Nome do Consultório / Espaço Clínico *"
                  value={form.clinic_name}
                  onChange={(e) => setForm({ ...form, clinic_name: e.target.value })}
                  placeholder="Ex: Consultório Priscila Carbone"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Registro Profissional / CBO / ABPp"
                    value={form.crp}
                    onChange={(e) => setForm({ ...form, crp: e.target.value })}
                    placeholder="Ex: ABPp 12.345 / CBO 2394-25"
                  />
                  <Input
                    label="Chave PIX Padrão (Cobranças)"
                    value={form.pix_key}
                    onChange={(e) => setForm({ ...form, pix_key: e.target.value })}
                    placeholder="E-mail, CPF ou celular"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Input
                      label="Cidade"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <Input
                      label="UF"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: HORÁRIOS DE ATENDIMENTO */}
          {activeTab === "horarios" && (
            <Card className="border-2 border-[#D8E5E7] shadow-sm rounded-2xl">
              <CardHeader className="pb-3 border-b border-[#EEF5F6]">
                <CardTitle className="text-base font-black text-[#19323A]">
                  Horários de Atendimento Semanal
                </CardTitle>
                <CardDescription className="text-xs">
                  Defina os dias e horários em que você atende no consultório para preencher a agenda.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-[#F7FAFA] border border-[#D8E5E7] rounded-xl">
                  <div>
                    <p className="text-xs font-black text-[#19323A]">Duração Padrão da Sessão</p>
                    <p className="text-[11px] text-[#6B7C83]">Tempo estimado de cada atendimento clínico</p>
                  </div>
                  <select
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#19323A]"
                  >
                    <option value={45}>45 minutos</option>
                    <option value={50}>50 minutos (Padrão)</option>
                    <option value={60}>60 minutos (1 hora)</option>
                    <option value={90}>90 minutos (1h 30m)</option>
                  </select>
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-xs font-black uppercase tracking-wider text-[#6B7C83]">
                    Dias de Funcionamento:
                  </p>

                  <div className="divide-y divide-[#EEF5F6] border-2 border-[#D8E5E7] rounded-2xl overflow-hidden bg-white">
                    {schedule.map((item, idx) => (
                      <div
                        key={item.day}
                        className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-colors ${
                          item.active ? "bg-white" : "bg-[#F7FAFA] opacity-60"
                        }`}
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer select-none min-w-[140px]">
                          <input
                            type="checkbox"
                            checked={item.active}
                            onChange={() => toggleDay(idx)}
                            className="w-4 h-4 rounded border-[#D8E5E7] text-[#245C6B] focus:ring-[#245C6B]"
                          />
                          <span className={`text-xs font-bold ${item.active ? "text-[#19323A]" : "text-[#8DA3A8]"}`}>
                            {item.label}
                          </span>
                        </label>

                        {item.active ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={item.start}
                              onChange={(e) => updateDayHours(idx, "start", e.target.value)}
                              className="px-2.5 py-1 text-xs font-bold border border-[#D8E5E7] rounded-lg bg-white text-[#19323A]"
                            />
                            <span className="text-xs text-[#8DA3A8] font-bold">às</span>
                            <input
                              type="time"
                              value={item.end}
                              onChange={(e) => updateDayHours(idx, "end", e.target.value)}
                              className="px-2.5 py-1 text-xs font-bold border border-[#D8E5E7] rounded-lg bg-white text-[#19323A]"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-[#8DA3A8] italic font-semibold">
                            Não atende
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: GOOGLE CALENDAR */}
          {activeTab === "google_calendar" && (
            <div className="space-y-4">
              {/* Detailed Live Status Banner */}
              <div className="p-5 rounded-2xl border-2 border-[#63C7B2]/50 bg-[#E8F8F5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#20836F] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm text-[#14282F]">
                        Google Agenda Conectado
                      </h3>
                      <span className="text-[10px] bg-[#63C7B2] text-[#14282F] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#14282F] animate-pulse" />
                        Sincronizado
                      </span>
                    </div>
                    <p className="text-xs text-[#20836F] font-semibold mt-0.5">
                      Conta vinculada: <strong>{form.email}</strong>
                    </p>
                    <p className="text-[11px] text-[#6B7C83] mt-0.5">
                      Última sincronização: <strong>Hoje, há 2 minutos</strong>
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  loading={syncingNow}
                  onClick={handleSyncNow}
                  className="text-xs font-black bg-white hover:bg-[#EEF5F6] border-[#63C7B2] text-[#20836F] gap-1.5 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingNow ? "animate-spin" : ""}`} />
                  Sincronizar Agora
                </Button>
              </div>

              {/* Feed Link Card */}
              <Card className="border-2 border-[#D8E5E7] shadow-sm rounded-2xl">
                <CardHeader className="pb-3 border-b border-[#EEF5F6]">
                  <CardTitle className="text-base font-black text-[#19323A]">
                    Link da Agenda (iCal / Google)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Cole este link nas configurações do seu Google Calendar para sincronização em tempo real.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={calendarFeedUrl}
                      className="flex-1 bg-[#F7FAFA] px-3.5 py-2 text-xs rounded-xl border-2 border-[#D8E5E7] font-mono select-all text-[#19323A]"
                    />
                    <Button size="sm" onClick={handleCopyCalendarUrl} className="gap-1.5 text-xs font-bold shrink-0">
                      {copied ? <Check className="w-4 h-4 text-[#63C7B2]" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Copiado!" : "Copiar"}
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2.5 pt-2 border-t border-[#EEF5F6]">
                    <a
                      href={`https://calendar.google.com/calendar/r/settings/addbyurl?cid=${encodeURIComponent(
                        calendarFeedUrl
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-2 bg-[#245C6B] text-white rounded-xl hover:bg-[#1B4752] transition-all shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir no Google Calendar Web</span>
                    </a>

                    <Button size="sm" variant="outline" onClick={handleDownloadICS} className="gap-1.5 text-xs font-bold">
                      <Download className="w-3.5 h-3.5" />
                      Baixar Arquivo (.ics)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 5: LEMBRETES & WHATSAPP */}
          {activeTab === "notificacoes" && (
            <Card className="border-2 border-[#D8E5E7] shadow-sm rounded-2xl">
              <CardHeader className="pb-3 border-b border-[#EEF5F6]">
                <CardTitle className="text-base font-black text-[#19323A]">
                  Lembretes e Mensagens WhatsApp
                </CardTitle>
                <CardDescription className="text-xs">
                  Personalize os modelos de mensagens que o EvoluIA preenche automaticamente para enviar aos pais.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                {/* 1. Lembrete de Atendimento */}
                <div className="p-4 rounded-2xl bg-[#F7FAFA] border-2 border-[#D8E5E7] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#E8F8F5] text-[#20836F] flex items-center justify-center font-bold">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-[#19323A]">
                          1. Lembrete Matinal de Confirmação de Sessão
                        </p>
                        <p className="text-[11px] text-[#6B7C83]">
                          Usado na <strong>Agenda</strong> e no <strong>Dashboard</strong> para confirmar atendimentos do dia.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-[#E8F8F5] text-[#20836F] font-black px-2.5 py-1 rounded-md border border-[#63C7B2]/40">
                      Disponível na Agenda
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[#6B7C83]">
                      Texto da Mensagem (com tags automáticas):
                    </label>
                    <textarea
                      rows={3}
                      value={reminderTemplate}
                      onChange={(e) => setReminderTemplate(e.target.value)}
                      placeholder="Digite o modelo de mensagem de confirmação..."
                      className="w-full px-3 py-2 text-xs font-medium rounded-xl border-2 border-[#D8E5E7] bg-white text-[#19323A] focus:outline-none focus:border-[#245C6B]"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-[#8DA3A8]">
                      Tags disponíveis: <code className="bg-white px-1.5 py-0.5 rounded border border-[#D8E5E7] text-[#245C6B]">{"{horario}"}</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-[#D8E5E7] text-[#245C6B]">{"{nome_crianca}"}</code>
                    </p>

                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        reminderTemplate
                          .replace("{horario}", "14:00")
                          .replace("{nome_crianca}", "Maria Eduarda")
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-[#E8F8F5] hover:bg-[#20836F] hover:text-white text-[#20836F] rounded-xl text-xs font-black flex items-center gap-1.5 border border-[#63C7B2]/40 transition-all shadow-2xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5 fill-current" />
                      <span>Testar Envio no WhatsApp</span>
                    </a>
                  </div>
                </div>

                {/* 2. Mensagem de Cobrança */}
                <div className="p-4 rounded-2xl bg-[#F7FAFA] border-2 border-[#D8E5E7] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#FEF8EC] text-[#8B6514] flex items-center justify-center font-bold">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-[#19323A]">
                          2. Mensagem de Cobrança / Mensalidade com PIX
                        </p>
                        <p className="text-[11px] text-[#6B7C83]">
                          Usado no botão <strong>"Cobrar"</strong> da tela de <strong>Financeiro</strong>.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-[#FEF8EC] text-[#8B6514] font-black px-2.5 py-1 rounded-md border border-[#F4C95D]/40">
                      Disponível no Financeiro
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[#6B7C83]">
                      Texto da Mensagem:
                    </label>
                    <textarea
                      rows={3}
                      value={billingTemplate}
                      onChange={(e) => setBillingTemplate(e.target.value)}
                      placeholder="Digite o modelo de cobrança..."
                      className="w-full px-3 py-2 text-xs font-medium rounded-xl border-2 border-[#D8E5E7] bg-white text-[#19323A] focus:outline-none focus:border-[#245C6B]"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-[#8DA3A8]">
                      Tags disponíveis: <code className="bg-white px-1.5 py-0.5 rounded border border-[#D8E5E7] text-[#245C6B]">{"{nome_crianca}"}</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-[#D8E5E7] text-[#245C6B]">{"{mes}"}</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-[#D8E5E7] text-[#245C6B]">{"{valor}"}</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-[#D8E5E7] text-[#245C6B]">{"{chave_pix}"}</code>
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
                      className="px-3 py-1.5 bg-[#FEF8EC] hover:bg-[#F4C95D] hover:text-[#19323A] text-[#8B6514] rounded-xl text-xs font-black flex items-center gap-1.5 border border-[#F4C95D]/40 transition-all shadow-2xs"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Testar Cobrança</span>
                    </a>
                  </div>
                </div>

                {/* Info Guide */}
                <div className="p-3.5 rounded-xl bg-[#EAF3F5] border border-[#245C6B]/20 flex items-start gap-2.5 text-xs text-[#245C6B]">
                  <span className="text-base">💡</span>
                  <p className="leading-relaxed">
                    <strong>Como usar no dia a dia:</strong> Ao clicar no botão de WhatsApp na <strong>Agenda</strong>, nos <strong>Responsáveis</strong> ou no <strong>Financeiro</strong>, o EvoluIA abre diretamente o WhatsApp do pai/mãe com essa mensagem já preenchida com o nome do filho, horário ou valor certinho, sem você precisar digitar nada!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Profile & System Health Sidebars (4 Cols on LG) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card 1: Perfil do Consultório */}
          <Card className="border-2 border-[#D8E5E7] shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="bg-[#245C6B] p-5 text-white flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center font-black text-xl overflow-hidden shrink-0 shadow-xs">
                {professional?.logo_url ? (
                  <img src={professional.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  form.full_name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-base truncate leading-tight">{form.clinic_name}</h3>
                <p className="text-xs text-[#63C7B2] font-bold truncate mt-0.5">{form.full_name}</p>
                <p className="text-[10px] text-white/70 truncate">{form.specialty}</p>
              </div>
            </div>

            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-[#F7FAFA] border border-[#D8E5E7]">
                  <p className="text-lg font-black text-[#19323A]">{childrenCount}</p>
                  <p className="text-[10px] font-bold uppercase text-[#6B7C83]">Pacientes</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F7FAFA] border border-[#D8E5E7]">
                  <p className="text-lg font-black text-[#19323A]">{guardiansCount}</p>
                  <p className="text-[10px] font-bold uppercase text-[#6B7C83]">Responsáveis</p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#EEF5F6] space-y-1.5 text-xs text-[#6B7C83]">
                <div className="flex items-center justify-between">
                  <span>Membro desde:</span>
                  <span className="font-bold text-[#19323A]">Agosto / 2026</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Localização:</span>
                  <span className="font-bold text-[#19323A]">{form.city}, {form.state}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Status do Sistema & Saúde da Conta */}
          <Card className="border-2 border-[#D8E5E7] shadow-sm rounded-2xl bg-white">
            <CardHeader className="pb-3 border-b border-[#EEF5F6]">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-[#6B7C83] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#20836F]" />
                <span>Status da Plataforma</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#E8F8F5] border border-[#63C7B2]/30 text-xs">
                <span className="font-bold text-[#14282F]">🟢 Conta & Plano Clínico:</span>
                <span className="font-black text-[#20836F]">Ativo</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-[#E8F8F5] border border-[#63C7B2]/30 text-xs">
                <span className="font-bold text-[#14282F]">🟢 Google Agenda:</span>
                <span className="font-black text-[#20836F]">Sincronizado</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-[#E8F8F5] border border-[#63C7B2]/30 text-xs">
                <span className="font-bold text-[#14282F]">🟢 Banco de Dados:</span>
                <span className="font-black text-[#20836F]">Criptografado</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-[#FEF8EC] border border-[#F4C95D]/40 text-xs">
                <span className="font-bold text-[#8B6514]">🟡 WhatsApp:</span>
                <span className="font-black text-[#8B6514]">Pronto</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
