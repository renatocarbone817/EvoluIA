import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  CheckCircle2,
  Upload,
  Paperclip,
  X,
  Clock,
  Calendar,
  Sparkles,
  Target,
  Brain,
  Gamepad2,
  BarChart3,
  Lightbulb,
  FileCheck2,
  ChevronRight,
  User,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { ChildAvatar } from "@/components/ui/ChildAvatar"
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
  }, [appointmentId, paramChildId, professional?.id])

  async function loadContext() {
    const profId = professional?.id || useAuthStore.getState().user?.id
    if (!profId) return
    if (!child) setLoading(true)
    try {
      let resolvedChildId = paramChildId

      if (appointmentId) {
        const { data: apptData } = await supabase
          .from("appointments")
          .select("*, child:children(*)")
          .eq("id", appointmentId)
          .single()

        if (apptData) {
          // Se o agendamento for de intervenção, redireciona automaticamente para a página de Aula de Intervenção
          const typeLower = (apptData.type || "").toLowerCase()
          if (typeLower.includes("interven")) {
            navigate(`/atendimento/intervencao/${appointmentId}`, { replace: true })
            return
          }
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
          end_time: form.end_time || null,
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

      // 2. Upload files if any
      if (uploadedFiles.length > 0 && sessionData) {
        for (const uf of uploadedFiles) {
          try {
            const ext = uf.name.split(".").pop()
            const path = `${profId}/${child.id}/sessions/${sessionData.id}/${Date.now()}.${ext}`

            const { error: uploadError } = await supabase.storage
              .from("child-documents")
              .upload(path, uf.file)

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from("child-documents")
                .getPublicUrl(path)

              await supabase.from("session_documents").insert({
                session_id: sessionData.id,
                professional_id: profId,
                file_name: uf.name,
                file_url: urlData.publicUrl,
                file_size: uf.file.size,
                file_type: uf.file.type,
              })
            }
          } catch (fileErr) {
            console.error("Error uploading file:", fileErr)
          }
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

        const isFechamento =
          carePlan.payment_type === "por_sessao" &&
          (carePlan.notes?.includes("[TIMING:fechamento]") || (carePlan.payment_due_day && carePlan.payment_due_day > 0))

        if (isFechamento) {
          // ── Modo Fechamento: Acumula sessões em uma única fatura mensal ──
          const { data: existingRecords } = await supabase
            .from("financial_records")
            .select("*")
            .eq("professional_id", profId)
            .eq("child_id", child.id)
            .eq("month", sessionMonth)
            .eq("year", sessionYear)
            .eq("status", "pending")
            .order("created_at", { ascending: true })

          const sessionEntryLine = `• Sessão #${sessionNumber} (${form.date}) - R$ ${carePlan.price_per_session.toFixed(2).replace('.', ',')}`

          if (existingRecords && existingRecords.length > 0) {
            const primaryRecord = existingRecords[0]
            let totalAmount = Number(primaryRecord.amount) + Number(carePlan.price_per_session)

            // Se existiam registros pendentes duplicados/soltos, consolida e remove os extras
            for (let i = 1; i < existingRecords.length; i++) {
              totalAmount += Number(existingRecords[i].amount) || 0
              await supabase.from("financial_records").delete().eq("id", existingRecords[i].id)
            }

            let baseNotes = (primaryRecord.notes || "").trim()
            let updatedNotes = ""
            if (!baseNotes.includes(`Sessão #${sessionNumber}`)) {
              if (baseNotes.startsWith("Fechamento") || baseNotes.includes("• Sessão")) {
                updatedNotes = `${baseNotes}\n${sessionEntryLine}`
              } else {
                updatedNotes = `Fechamento ${sessionMonth}/${sessionYear}:\n${baseNotes ? `• ${baseNotes}\n` : ""}${sessionEntryLine}`
              }
            } else {
              updatedNotes = baseNotes
            }

            await supabase
              .from("financial_records")
              .update({
                amount: totalAmount,
                notes: updatedNotes,
              })
              .eq("id", primaryRecord.id)

            toast.success(`✅ Sessão #${sessionNumber} registrada! Fechamento atualizado para R$ ${totalAmount.toFixed(2).replace('.', ',')}.`)
          } else {
            const initialNotes = `Fechamento ${sessionMonth}/${sessionYear} (1 sessão):\n${sessionEntryLine}`
            await supabase.from("financial_records").insert({
              professional_id: profId,
              child_id: child.id,
              month: sessionMonth,
              year: sessionYear,
              amount: carePlan.price_per_session,
              status: "pending",
              payment_date: null,
              notes: initialNotes,
            })
            toast.success(`✅ Sessão #${sessionNumber} registrada! Fechamento iniciado com R$ ${carePlan.price_per_session.toFixed(2).replace('.', ',')}.`)
          }
        } else if (carePlan.payment_type === "por_sessao") {
          // ── Modo Por Sessão Avulsa (No Dia da Aula) ───────────────────
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
          toast.success(`✅ Sessão #${sessionNumber} registrada! Lançamento de R$ ${carePlan.price_per_session.toFixed(2).replace('.', ',')} criado no Financeiro.`)
        } else if (carePlan.payment_type === "mensal") {
          // ── Modo Mensalidade Fixa ─────────────────────────────────────
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
            toast.success(`✅ Sessão #${sessionNumber} registrada! Mensalidade de R$ ${carePlan.price_per_session.toFixed(2).replace('.', ',')} criada no Financeiro.`)
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
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-20 bg-[#F7FAFA] border-2 border-[#D8E5E7] rounded-3xl" />
        <div className="h-24 bg-[#F7FAFA] border-2 border-[#D8E5E7] rounded-3xl" />
        <div className="h-64 bg-[#F7FAFA] border-2 border-[#D8E5E7] rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in pb-16">
      {/* 1. HERO HEADER */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="w-11 h-11 rounded-2xl bg-[#F7FAFA] border-2 border-[#D8E5E7] hover:border-[#7C3AED] hover:bg-[#EDE9FE] text-[#0D2329] hover:text-[#7C3AED] flex items-center justify-center transition-all shrink-0 shadow-2xs group"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>

          <ChildAvatar photoUrl={child?.photo_url} name={child?.full_name || "Paciente"} size="lg" />

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-[#0D2329] tracking-tight">
                Atendimento Clínico
              </h1>
              <span className="px-3 py-0.5 rounded-xl bg-[#E8F8F5] border border-[#A7F3D0] text-[#065F46] text-xs font-black shadow-2xs">
                Sessão #{sessionNumber}
              </span>
            </div>

            <p className="text-xs sm:text-sm font-semibold text-[#6B7C83] truncate">
              Paciente: <span className="font-black text-[#0D2329]">{child?.full_name}</span> · {formatDate(form.date)}
            </p>
          </div>
        </div>

        {/* Finalize Button Top */}
        <button
          disabled={saving}
          onClick={handleFinalizeSession}
          className="h-12 px-6 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all disabled:opacity-50 shrink-0"
        >
          {saving ? (
            <span>Finalizando...</span>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
              <span>Finalizar Atendimento</span>
            </>
          )}
        </button>
      </div>

      {/* 2. META INFO: DATA E HORÁRIOS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-1.5">
          <label className="text-[11px] font-black text-[#6B7C83] uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>Data da Sessão</span>
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full p-2.5 rounded-2xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-black text-[#0D2329] focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all shadow-2xs"
          />
        </div>

        <div className="p-4 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-1.5">
          <label className="text-[11px] font-black text-[#6B7C83] uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Horário Início</span>
          </label>
          <input
            type="time"
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            className="w-full p-2.5 rounded-2xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-black text-[#0D2329] focus:outline-none focus:border-[#10B981] focus:bg-white transition-all shadow-2xs"
          />
        </div>

        <div className="p-4 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-1.5">
          <label className="text-[11px] font-black text-[#6B7C83] uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>Horário Término (opcional)</span>
          </label>
          <input
            type="time"
            value={form.end_time}
            onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            className="w-full p-2.5 rounded-2xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-black text-[#0D2329] focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* 3. NUMBERED SECTIONS (1 TO 7) */}
      <div className="space-y-5">
        {/* 1. OBJETIVO DA SESSÃO */}
        <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-3.5 hover:border-[#7C3AED]/40 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-black text-xs shadow-2xs">
              1
            </div>
            <h3 className="font-black text-sm text-[#0D2329]">Objetivo da Sessão</h3>
          </div>

          <textarea
            rows={2}
            placeholder="Ex: Trabalhar a decodificação de sílabas complexas, atenção sustentada e raciocínio lógico..."
            value={form.objective}
            onChange={(e) => setForm({ ...form, objective: e.target.value })}
            className="w-full p-3.5 rounded-2xl border-2 border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all resize-none shadow-2xs"
          />
        </div>

        {/* 2. O QUE FOI TRABALHADO */}
        <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-4 hover:border-[#7C3AED]/40 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center font-black text-xs shadow-2xs">
              2
            </div>
            <div>
              <h3 className="font-black text-sm text-[#0D2329]">O que foi trabalhado?</h3>
              <p className="text-[11px] font-semibold text-[#6B7C83]">
                Selecione as áreas trabalhadas nesta sessão:
              </p>
            </div>
          </div>

          {/* Skill Pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            {SKILL_AREAS.map((area) => {
              const isSelected = selectedAreas.includes(area)
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleArea(area)}
                  className={`text-xs px-3.5 py-1.5 rounded-xl border-2 font-black transition-all flex items-center gap-1.5 active:scale-95 ${
                    isSelected
                      ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-xs"
                      : "bg-[#F8FAFB] text-[#4F6C74] border-[#D8E5E7] hover:border-[#7C3AED]/50 hover:bg-[#F3E8FF]/30"
                  }`}
                >
                  <span>{area}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              )
            })}
          </div>

          <textarea
            rows={3}
            placeholder="Descreva detalhadamente o conteúdo trabalhado..."
            value={form.what_was_worked}
            onChange={(e) => setForm({ ...form, what_was_worked: e.target.value })}
            className="w-full p-3.5 rounded-2xl border-2 border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all resize-none shadow-2xs"
          />
        </div>

        {/* 3. ATIVIDADES E JOGOS */}
        <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-3.5 hover:border-[#7C3AED]/40 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-black text-xs shadow-2xs">
              3
            </div>
            <h3 className="font-black text-sm text-[#0D2329]">Atividades e Jogos Realizados</h3>
          </div>

          <textarea
            rows={3}
            placeholder="Ex: Jogo da memória com fonemas, leitura compartilhada de gibi, fichas de raciocínio lógico..."
            value={form.activities}
            onChange={(e) => setForm({ ...form, activities: e.target.value })}
            className="w-full p-3.5 rounded-2xl border-2 border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#D97706] transition-all resize-none shadow-2xs"
          />
        </div>

        {/* 4. TESTES E AVALIAÇÕES */}
        <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-3.5 hover:border-[#7C3AED]/40 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center font-black text-xs shadow-2xs">
              4
            </div>
            <h3 className="font-black text-sm text-[#0D2329]">Testes / Avaliações Aplicados & Resultados</h3>
          </div>

          <textarea
            rows={3}
            placeholder="Se aplicou algum teste (ex: PROLEC, TDE, Teste de Atenção), anote aqui os resultados e escores observados..."
            value={form.test_results}
            onChange={(e) => setForm({ ...form, test_results: e.target.value })}
            className="w-full p-3.5 rounded-2xl border-2 border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#0284C7] transition-all resize-none shadow-2xs"
          />
        </div>

        {/* 5. OBSERVAÇÕES CLÍNICAS */}
        <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-3.5 hover:border-[#7C3AED]/40 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#DCFCE7] text-[#166534] flex items-center justify-center font-black text-xs shadow-2xs">
              5
            </div>
            <h3 className="font-black text-sm text-[#0D2329]">Observações Profissionais & Comportamento</h3>
          </div>

          <textarea
            rows={3}
            placeholder="Engajamento da criança, cansaço, frustração, avanços notados, observações para os pais..."
            value={form.professional_notes}
            onChange={(e) => setForm({ ...form, professional_notes: e.target.value })}
            className="w-full p-3.5 rounded-2xl border-2 border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#10B981] transition-all resize-none shadow-2xs"
          />
        </div>

        {/* 6. PRÓXIMOS OBJETIVOS */}
        <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-3.5 hover:border-[#7C3AED]/40 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FCE7F3] text-[#9D174D] flex items-center justify-center font-black text-xs shadow-2xs">
              6
            </div>
            <h3 className="font-black text-sm text-[#0D2329]">Próximos Objetivos & Planejamento</h3>
          </div>

          <textarea
            rows={2}
            placeholder="O que planejar para o próximo encontro com esta criança..."
            value={form.next_objectives}
            onChange={(e) => setForm({ ...form, next_objectives: e.target.value })}
            className="w-full p-3.5 rounded-2xl border-2 border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#DB2777] transition-all resize-none shadow-2xs"
          />
        </div>

        {/* 7. ANEXOS */}
        <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-4 hover:border-[#7C3AED]/40 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EEF5F6] text-[#4F6C74] flex items-center justify-center font-black text-xs shadow-2xs">
                7
              </div>
              <h3 className="font-black text-sm text-[#0D2329]">Anexos da Sessão (PDF, Fotos, Atividades)</h3>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl bg-[#F3E8FF] border border-[#DDD6FE] hover:bg-[#EDE9FE] text-[#7C3AED] font-black text-xs flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
            >
              <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Adicionar Arquivo</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {uploadedFiles.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-6 border-2 border-dashed border-[#D8E5E7] hover:border-[#7C3AED] rounded-2xl text-center cursor-pointer bg-[#F8FAFB] hover:bg-[#F3E8FF]/20 transition-all group"
            >
              <Upload className="w-6 h-6 mx-auto text-[#8CAAB1] group-hover:text-[#7C3AED] transition-colors mb-1.5" />
              <p className="text-xs font-bold text-[#0D2329]">
                Clique aqui para selecionar arquivos ou fotos desta sessão
              </p>
              <p className="text-[11px] text-[#8CAAB1]">Formatos aceitos: PDF, JPG, PNG, DOCX</p>
            </div>
          ) : (
            <div className="space-y-2">
              {uploadedFiles.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-2xl border border-[#D8E5E7] shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 font-bold text-xs">
                      <Paperclip className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-[#0D2329] truncate">{f.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="p-1.5 hover:text-[#EF4444] text-[#8CAAB1] hover:bg-[#FEE2E2] rounded-xl transition-all"
                    title="Remover anexo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. FLOATING FOOTER ACTION BAR */}
      <div className="p-4 bg-white/90 backdrop-blur-md rounded-3xl border-2 border-[#D8E5E7] shadow-lg sticky bottom-4 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 rounded-2xl border-2 border-[#D8E5E7] hover:bg-[#F7FAFA] text-xs font-black text-[#6B7C83] hover:text-[#0D2329] transition-all"
        >
          Voltar / Cancelar
        </button>

        <button
          disabled={saving}
          onClick={handleFinalizeSession}
          className="h-11 px-6 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white text-xs font-black flex items-center gap-2 shadow-sm active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? (
            <span>Finalizando sessão...</span>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Finalizar e Salvar Atendimento</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
