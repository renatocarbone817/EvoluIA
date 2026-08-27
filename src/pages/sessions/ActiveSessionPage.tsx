import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Save, CheckCircle, Upload, Paperclip, X, Clock, User } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Textarea } from "@/components/ui/Input"
import { formatDate } from "@/lib/utils"
import toast from "react-hot-toast"
import type { Child, Appointment } from "@/types/database"

const SKILL_AREAS = [
  "Leitura",
  "Escrita",
  "Matemática",
  "Atenção & Foco",
  "Memória",
  "Raciocínio Lógico",
  "Linguagem",
  "Coordenação Motora",
  "Comportamento / Emoções",
]

export function ActiveSessionPage() {
  const { appointmentId, childId: paramChildId } = useParams<{
    appointmentId?: string
    childId?: string
  }>()
  const navigate = useNavigate()
  const { professional } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [child, setChild] = useState<Child | null>(null)
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [sessionNumber, setSessionNumber] = useState<number>(1)

  // Session form
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    start_time: new Date().toTimeString().substring(0, 5),
    end_time: "",
    objective: "",
    what_was_worked: "",
    activities: "",
    test_results: "",
    professional_notes: "",
    next_objectives: "",
  })

  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<{ file: File; name: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadContext()
  }, [appointmentId, paramChildId, professional])

  async function loadContext() {
    if (!professional) return
    setLoading(true)
    try {
      let resolvedChildId = paramChildId

      if (appointmentId) {
        const { data: apptData } = await supabase
          .from("appointments")
          .select("*, child:children(*)")
          .eq("id", appointmentId)
          .single()

        if (apptData) {
          setAppointment(apptData)
          resolvedChildId = apptData.child_id
          setChild((apptData as any).child)
        }
      } else if (paramChildId) {
        const { data: childData } = await supabase
          .from("children")
          .select("*")
          .eq("id", paramChildId)
          .single()
        setChild(childData)
      }

      if (resolvedChildId) {
        // Calculate session number
        const { count } = await supabase
          .from("sessions")
          .select("*", { count: "exact", head: true })
          .eq("child_id", resolvedChildId)

        setSessionNumber((count || 0) + 1)
      }
    } finally {
      setLoading(false)
    }
  }

  function toggleArea(area: string) {
    if (selectedAreas.includes(area)) {
      setSelectedAreas(selectedAreas.filter((a) => a !== area))
    } else {
      setSelectedAreas([...selectedAreas, area])
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newFiles = Array.from(files).map((f) => ({
      file: f,
      name: f.name,
    }))

    setUploadedFiles([...uploadedFiles, ...newFiles])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function removeFile(index: number) {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index))
  }

  async function handleFinalizeSession() {
    const { user, professional } = useAuthStore.getState()
    const profId = professional?.id || user?.id

    if (!child || !profId) {
      toast.error("Sessão ou paciente não identificados")
      return
    }

    setSaving(true)
    try {
      // Compose what was worked
      const areasString = selectedAreas.length > 0 ? `Áreas: ${selectedAreas.join(", ")}\n` : ""
      const fullWhatWasWorked = `${areasString}${form.what_was_worked}`.trim()

      // 1. Insert session record
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          professional_id: profId,
          child_id: child.id,
          appointment_id: appointment?.id || null,
          session_number: sessionNumber,
          date: form.date,
          start_time: form.start_time || null,
          end_time: form.end_time || new Date().toTimeString().substring(0, 5),
          objective: form.objective || null,
          what_was_worked: fullWhatWasWorked || null,
          activities: form.activities || null,
          test_results: form.test_results || null,
          professional_notes: form.professional_notes || null,
          next_objectives: form.next_objectives || null,
          status: "completed",
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // 2. Upload and insert files
      for (const item of uploadedFiles) {
        const fileExt = item.name.split(".").pop()
        const fileName = `${Date.now()}_${item.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
        const filePath = `${profId}/${child.id}/${fileName}`

        const { error: storageError } = await supabase.storage
          .from("child-documents")
          .upload(filePath, item.file)

        if (!storageError) {
          const { data: urlData } = supabase.storage
            .from("child-documents")
            .getPublicUrl(filePath)

          await supabase.from("session_documents").insert({
            session_id: sessionData.id,
            professional_id: profId,
            file_name: item.name,
            file_url: urlData.publicUrl,
            file_type: fileExt || null,
            file_size: item.file.size,
          })

          // Also save in general documents
          await supabase.from("documents").insert({
            professional_id: profId,
            child_id: child.id,
            session_id: sessionData.id,
            file_name: item.name,
            file_url: urlData.publicUrl,
            file_type: fileExt || null,
            file_size: item.file.size,
            category: "atividades",
          })
        }
      }

      // 3. Mark appointment as done if linked
      if (appointment?.id) {
        await supabase
          .from("appointments")
          .update({ status: "done" })
          .eq("id", appointment.id)
      }

      // 4. AUTO-CREATE FINANCIAL RECORD based on care_plan
      const { data: carePlan } = await supabase
        .from("care_plans")
        .select("*")
        .eq("child_id", child.id)
        .single()

      if (carePlan && carePlan.price_per_session > 0) {
        const sessionDate = new Date(form.date + "T12:00:00")
        const sessionMonth = sessionDate.getMonth() + 1
        const sessionYear = sessionDate.getFullYear()

        if (carePlan.payment_type === "por_sessao") {
          // Per session: create one financial record per session
          await supabase.from("financial_records").insert({
            professional_id: profId,
            child_id: child.id,
            month: sessionMonth,
            year: sessionYear,
            amount: carePlan.price_per_session,
            status: "pending",
            payment_date: null,
            notes: `Sessão #${sessionNumber} — ${child.full_name} (${form.date})`,
          })
          toast.success(`✅ Sessão #${sessionNumber} registrada! Lançamento de R$ ${carePlan.price_per_session.toFixed(2)} criado no Financeiro.`)
        } else if (carePlan.payment_type === "mensal") {
          // Monthly: check if a monthly record already exists for that month
          const { data: existing } = await supabase
            .from("financial_records")
            .select("id")
            .eq("professional_id", profId)
            .eq("child_id", child.id)
            .eq("month", sessionMonth)
            .eq("year", sessionYear)
            .maybeSingle()

          if (!existing) {
            await supabase.from("financial_records").insert({
              professional_id: profId,
              child_id: child.id,
              month: sessionMonth,
              year: sessionYear,
              amount: carePlan.price_per_session,
              status: "pending",
              payment_date: null,
              notes: `Mensalidade ${sessionMonth}/${sessionYear} — ${child.full_name}`,
            })
            toast.success(`✅ Sessão #${sessionNumber} registrada! Mensalidade de R$ ${carePlan.price_per_session.toFixed(2)} criada no Financeiro.`)
          } else {
            toast.success(`Sessão #${sessionNumber} registrada com sucesso!`)
          }
        } else {
          toast.success(`Sessão #${sessionNumber} registrada com sucesso!`)
        }
      } else {
        toast.success(`Sessão #${sessionNumber} registrada e finalizada com sucesso!`)
      }

      navigate(`/criancas/${child.id}`)
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar sessão")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="h-10 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Atendimento em Andamento</h1>
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                Sessão #{sessionNumber}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Paciente: <strong>{child?.full_name}</strong> · {formatDate(form.date)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="lg"
            loading={saving}
            onClick={handleFinalizeSession}
            className="gap-2 w-full sm:w-auto"
          >
            <CheckCircle className="w-4 h-4" />
            Finalizar Atendimento
          </Button>
        </div>
      </div>

      {/* Main Recording Form */}
      <div className="space-y-6">
        {/* Quick meta (Time) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Input
            label="Data da Sessão"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <Input
            label="Horário Início"
            type="time"
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
          />
          <Input
            label="Horário Término (opcional)"
            type="time"
            value={form.end_time}
            onChange={(e) => setForm({ ...form, end_time: e.target.value })}
          />
        </div>

        {/* 1. Objective */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">1. Objetivo da Sessão</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Ex: Trabalhar a decodificação de sílabas complexas e a atenção sustentada..."
              value={form.objective}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
              rows={2}
            />
          </CardContent>
        </Card>

        {/* 2. What was worked / Skill areas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2. O que foi trabalhado?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Selecione as áreas trabalhadas nesta sessão:
              </p>
              <div className="flex flex-wrap gap-2">
                {SKILL_AREAS.map((area) => {
                  const isSelected = selectedAreas.includes(area)
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleArea(area)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        isSelected
                          ? "bg-foreground text-background border-foreground font-semibold"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {area}
                    </button>
                  )
                })}
              </div>
            </div>

            <Textarea
              placeholder="Descreva detalhadamente o conteúdo trabalhado..."
              value={form.what_was_worked}
              onChange={(e) => setForm({ ...form, what_was_worked: e.target.value })}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* 3. Activities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">3. Atividades e Jogos Realizados</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Ex: Jogo da memória com fonemas, leitura compartilhada de gibi, fichas de raciocínio..."
              value={form.activities}
              onChange={(e) => setForm({ ...form, activities: e.target.value })}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* 4. Test and Evaluations applied */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">4. Testes / Avaliações Aplicados & Resultados</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Se aplicou algum teste (ex: PROLEC, TDE, Teste de Atenção), anote aqui os resultados e escores..."
              value={form.test_results}
              onChange={(e) => setForm({ ...form, test_results: e.target.value })}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* 5. Professional observations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">5. Observações Profissionais & Comportamento</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Engajamento da criança, cansaço, frustração, avanços notados, observações para os pais..."
              value={form.professional_notes}
              onChange={(e) => setForm({ ...form, professional_notes: e.target.value })}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* 6. Next objectives */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">6. Próximos Objetivos</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="O que planejar para o próximo encontro com esta criança..."
              value={form.next_objectives}
              onChange={(e) => setForm({ ...form, next_objectives: e.target.value })}
              rows={2}
            />
          </CardContent>
        </Card>

        {/* 7. Attachments upload */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">7. Anexos da Sessão (PDF, Fotos, Atividades)</CardTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              Adicionar Arquivo
            </Button>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            {uploadedFiles.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Nenhum arquivo adicionado para upload nesta sessão.
              </p>
            ) : (
              <div className="space-y-2">
                {uploadedFiles.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-xs font-medium truncate">{f.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="p-1 hover:text-destructive text-muted-foreground transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Floating Bar */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
        <Button size="lg" loading={saving} onClick={handleFinalizeSession} className="gap-2">
          <CheckCircle className="w-4 h-4" />
          Finalizar Atendimento
        </Button>
      </div>
    </div>
  )
}
