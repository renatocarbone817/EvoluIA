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
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Textarea } from "@/components/ui/Input"
import { generateICalFeed } from "@/lib/calendarSync"
import type { AppointmentWithChild } from "@/types/database"
import toast from "react-hot-toast"

export function SettingsPage() {
  const { user, professional, setProfessional } = useAuthStore()
  const [activeSection, setActiveSection] = useState<"perfil" | "google_calendar">("perfil")
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const profId = professional?.id || user?.id

  const [form, setForm] = useState({
    full_name: professional?.full_name || "Priscila Carbone",
    email: professional?.email || user?.email || "priscila@evolui.com.br",
    clinic_name: professional?.clinic_name || "",
    crp: professional?.crp || "",
    specialty: professional?.specialty || "Psicopedagogia",
    phone: professional?.phone || "",
    city: professional?.city || "",
    state: professional?.state || "",
    bio: professional?.bio || "",
  })

  // Simulated live calendar sync feed URL (standard iCal link)
  const calendarFeedUrl = `${window.location.origin}/api/calendar/feed/${profId}.ics`

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profId) return

    setUploadingLogo(true)
    try {
      const ext = file.name.split(".").pop()
      const path = `${profId}/logo_${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("professionals")
        .upload(path, file, { upsert: true })

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
      toast.success("Logo atualizado com sucesso!")
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
          email: user?.email || professional?.email || "",
          clinic_name: form.clinic_name || null,
          crp: form.crp || null,
          specialty: form.specialty || null,
          phone: form.phone || null,
          city: form.city || null,
          state: form.state || null,
          bio: form.bio || null,
        })

      if (error) throw error

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
    toast.success("Link do calendário copiado com sucesso!")
    setTimeout(() => setCopied(false), 3000)
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
      toast.success("Arquivo de agenda (.ics) baixado! Ao abrir, ele sincroniza no seu celular.")
    } catch (e) {
      toast.error("Erro ao gerar agenda")
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold">Configurações do Consultório</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie seus dados profissionais, logotipo e sincronização com o Google Calendar / Celular.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveSection("perfil")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeSection === "perfil"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Perfil & Consultório
        </button>
        <button
          onClick={() => setActiveSection("google_calendar")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeSection === "google_calendar"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Sincronização Google Agenda (Celular)
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>
      </div>

      {/* 1. PERFIL SECTION */}
      {activeSection === "perfil" && (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Logo Card */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Logo / Foto</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center space-y-4">
              <div className="w-28 h-28 rounded-2xl bg-muted border border-border overflow-hidden flex items-center justify-center">
                {professional?.logo_url ? (
                  <img
                    src={professional.logo_url}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building className="w-10 h-10 text-muted-foreground" />
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />

              <Button
                variant="outline"
                size="sm"
                loading={uploadingLogo}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                Alterar Logo
              </Button>
              <p className="text-[11px] text-muted-foreground">
                PNG ou JPG até 2MB. Aparece nos relatórios e no cabeçalho.
              </p>
            </CardContent>
          </Card>

          {/* Profile Info Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Informações Profissionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nome Completo *"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
                <Input
                  label="E-mail Profissional"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <Input
                label="Nome do Consultório / Espaço"
                placeholder="Ex: Consultório Priscila Carbone"
                value={form.clinic_name}
                onChange={(e) => setForm({ ...form, clinic_name: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Registro (CRP / ABPp)"
                  placeholder="Ex: 06/12345-SP"
                  value={form.crp}
                  onChange={(e) => setForm({ ...form, crp: e.target.value })}
                />
                <Input
                  label="Especialidade"
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <Input
                    label="Telefone / WhatsApp"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="col-span-1">
                  <Input
                    label="Cidade"
                    placeholder="São Paulo"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div className="col-span-1">
                  <Input
                    label="UF"
                    placeholder="SP"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                  />
                </div>
              </div>

              <Textarea
                label="Sobre mim / Mini Biografia"
                placeholder="Formação, tempo de atuação, público-alvo..."
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3}
              />

              <div className="flex justify-end pt-2">
                <Button loading={saving} onClick={handleSave}>
                  <Save className="w-4 h-4 mr-1.5" />
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. GOOGLE CALENDAR & MOBILE SYNC SECTION */}
      {activeSection === "google_calendar" && (
        <div className="space-y-6">
          {/* Status banner */}
          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-emerald-950">Sincronização Automática com o Celular</h3>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                    Ativa
                  </span>
                </div>
                <p className="text-xs text-emerald-900/80 leading-relaxed">
                  Tudo o que você agendar, remarcar ou atender no <strong>EvoluIA</strong> sincroniza automaticamente com o <strong>Google Agenda do seu e-mail</strong> e aparece com alarmes e notificações no seu celular!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sync Link Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Seu Link de Sincronização Automática (iCal / Google)</CardTitle>
              <CardDescription>
                Este link conecta o EvoluIA ao Google Calendar do seu e-mail em segundo plano.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={calendarFeedUrl}
                  className="flex-1 bg-muted px-3 py-2 text-xs rounded-lg border border-border font-mono select-all"
                />
                <Button size="sm" onClick={handleCopyCalendarUrl} className="shrink-0 gap-1.5">
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copiado!" : "Copiar Link"}
                </Button>
              </div>

              <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
                <a
                  href={`https://calendar.google.com/calendar/r/settings/addbyurl?cid=${encodeURIComponent(
                    calendarFeedUrl
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir no Google Calendar Web
                </a>

                <Button size="sm" variant="outline" onClick={handleDownloadICS} className="gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" />
                  Baixar Arquivo da Agenda (.ics)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step by step guide */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Como ativar no seu celular (Passo a Passo Único)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs leading-relaxed text-muted-foreground">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                  <span className="w-5 h-5 rounded-full bg-foreground text-background font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">Copie o link acima</p>
                    <p className="mt-0.5">
                      Clique no botão azul <strong>"Copiar Link"</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                  <span className="w-5 h-5 rounded-full bg-foreground text-background font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">Abra o Google Agenda no computador ou navegador</p>
                    <p className="mt-0.5">
                      Acesse <strong>calendar.google.com</strong> com o mesmo e-mail do seu celular.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                  <span className="w-5 h-5 rounded-full bg-foreground text-background font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">Adicionar por URL</p>
                    <p className="mt-0.5">
                      No menu esquerdo, ao lado de <em>"Outras agendas"</em>, clique no botão <strong>+</strong> e selecione <strong>"Do URL"</strong>. Cole o link copiado e clique em <em>Adicionar agenda</em>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    ✓
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">Pronto!</p>
                    <p className="mt-0.5">
                      Todos os atendimentos do EvoluIA aparecerão automaticamente no aplicativo de calendário do seu celular com notificações sonoras e alarmes!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
