import { useState, useEffect, useMemo, useRef } from "react"
import {
  addDays,
  format,
  getDay,
  isSameDay,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import {
  AlertTriangle,
  UserPlus,
  Users,
  Sparkles,
  Repeat,
  CalendarDays,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Check,
  Clock,
} from "lucide-react"
import toast from "react-hot-toast"
import type { Child } from "@/types/database"

interface NewAppointmentDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  defaultDate?: string
  defaultChildId?: string
}

const WEEK_DAYS = [
  { id: 1, label: "Seg", name: "Segunda" },
  { id: 2, label: "Ter", name: "Terça" },
  { id: 3, label: "Qua", name: "Quarta" },
  { id: 4, label: "Qui", name: "Quinta" },
  { id: 5, label: "Sex", name: "Sexta" },
  { id: 6, label: "Sáb", name: "Sábado" },
]

export const APPOINTMENT_TYPES = [
  {
    id: "Entrevista Inicial",
    label: "Entrevista Inicial (com os Pais)",
    shortLabel: "Entrevista Inicial",
    dot: "bg-[#0284C7]",
    pillCls: "bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]",
    borderCls: "hover:border-[#BAE6FD] hover:bg-[#F0F9FF]",
    description: "Anamnese e primeiro contato com a família",
  },
  {
    id: "Aula de Intervenção",
    label: "Aula de Intervenção (Tratamento)",
    shortLabel: "Aula de Intervenção",
    dot: "bg-[#EA580C]",
    pillCls: "bg-[#FFEDD5] text-[#EA580C] border-[#FED7AA]",
    borderCls: "hover:border-[#FED7AA] hover:bg-[#FFF7ED]",
    description: "Trabalho prático das 6 habilidades cognitivas",
  },
  {
    id: "Sessão Psicopedagógica",
    label: "Sessão Psicopedagógica (Avaliação)",
    shortLabel: "Sessão Psicopedagógica",
    dot: "bg-[#7C3AED]",
    pillCls: "bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE]",
    borderCls: "hover:border-[#DDD6FE] hover:bg-[#FAF5FF]",
    description: "Aplicação de testes e observação clínica",
  },
  {
    id: "Devolutiva",
    label: "Devolutiva (com os Pais)",
    shortLabel: "Devolutiva",
    dot: "bg-[#10B981]",
    pillCls: "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]",
    borderCls: "hover:border-[#BBF7D0] hover:bg-[#F0FDF4]",
    description: "Apresentação e entrega dos resultados / laudo",
  },
  {
    id: "Reunião Escolar",
    label: "Reunião Escolar / Estudo de Caso",
    shortLabel: "Reunião Escolar",
    dot: "bg-[#64748B]",
    pillCls: "bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]",
    borderCls: "hover:border-[#CBD5E1] hover:bg-[#F8FAFC]",
    description: "Alinhamento com professores ou equipe externa",
  },
]

export function NewAppointmentDialog({ open, onClose, onSuccess, defaultDate, defaultChildId }: NewAppointmentDialogProps) {
  const { user, professional } = useAuthStore()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(false)
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)

  // Mode: "existing" = select child from list | "new" = quick new assessment without friction
  const [mode, setMode] = useState<"existing" | "new">("existing")
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)
  const typeDropdownRef = useRef<HTMLDivElement>(null)

  // Recurrence controls
  const [isRecurring, setIsRecurring] = useState(false)
  const [durationMonths, setDurationMonths] = useState<number>(1) // 1, 2, 3, 6 months
  const [selectedDays, setSelectedDays] = useState<number[]>([])

  const [form, setForm] = useState({
    child_id: defaultChildId || "",
    new_child_name: "",
    new_guardian_name: "",
    new_guardian_phone: "",
    date: defaultDate || new Date().toISOString().split("T")[0],
    start_time: "14:00",
    duration_minutes: "60",
    type: "", // Não vem selecionado por padrão para obrigar o usuário a escolher!
    status: "scheduled",
    notes: "",
  })

  // Fechar dropdown de tipo ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setTypeDropdownOpen(false)
      }
    }
    if (typeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [typeDropdownOpen])

  useEffect(() => {
    if (open && (professional || user)) {
      setConflictWarning(null)
      setIsRecurring(false)
      setDurationMonths(1)
      setTypeDropdownOpen(false)
      setMode(defaultChildId ? "existing" : "existing")
      setForm((prev) => ({
        ...prev,
        date: defaultDate || prev.date,
        child_id: defaultChildId || "",
        new_child_name: "",
        new_guardian_name: "",
        new_guardian_phone: "",
        notes: "",
        type: "",
      }))
      loadChildren()
    }
  }, [open, professional, user, defaultDate, defaultChildId])

  // Sync selected day with initial date day of week
  useEffect(() => {
    if (form.date) {
      const d = new Date(`${form.date}T12:00:00`)
      const dayOfWeek = getDay(d) // 0 = Sun, 1 = Mon ...
      if (dayOfWeek >= 1 && dayOfWeek <= 6) {
        setSelectedDays([dayOfWeek])
      }
    }
  }, [form.date])

  // Calculate list of dates for multiple sessions
  const scheduledDates = useMemo(() => {
    if (!form.date || !form.start_time) return []
    const dates: Date[] = []

    const baseDate = new Date(`${form.date}T${form.start_time}:00`)

    if (!isRecurring) {
      dates.push(baseDate)
      return dates
    }

    const totalWeeks = durationMonths * 4
    const activeDays = selectedDays.length > 0 ? selectedDays : [getDay(baseDate)]
    let currentWeekStart = addDays(baseDate, 0)

    for (let w = 0; w < totalWeeks; w++) {
      for (const dayId of activeDays) {
        const dayDiff = dayId - getDay(currentWeekStart)
        let sessionDate = addDays(currentWeekStart, w * 7 + dayDiff)

        if (sessionDate >= baseDate || isSameDay(sessionDate, baseDate)) {
          dates.push(sessionDate)
        }
      }
    }

    return dates.sort((a, b) => a.getTime() - b.getTime())
  }, [form.date, form.start_time, isRecurring, durationMonths, selectedDays])

  // Check for conflicts
  useEffect(() => {
    if (open && form.date && form.start_time) {
      checkConflicts()
    }
  }, [form.date, form.start_time, form.duration_minutes, open])

  async function loadChildren() {
    const profId = professional?.id || user?.id
    if (!profId) return

    const { data } = await supabase
      .from("children")
      .select("*")
      .eq("professional_id", profId)
      .order("full_name")

    const list = data || []
    setChildren(list)
    if (list.length > 0) {
      setForm((f) => ({ ...f, child_id: f.child_id || list[0].id }))
    } else {
      setMode("new")
    }
  }

  async function checkConflicts() {
    const profId = professional?.id || user?.id
    if (!profId) return

    const start = new Date(`${form.date}T${form.start_time}:00`)
    const durationMs = Number(form.duration_minutes || 60) * 60 * 1000
    const end = new Date(start.getTime() + durationMs)

    const startISO = start.toISOString()
    const endISO = end.toISOString()

    const { data: overlapping } = await supabase
      .from("appointments")
      .select("*, child:children(full_name)")
      .eq("professional_id", profId)
      .neq("status", "cancelled")
      .lt("start_time", endISO)
      .gt("end_time", startISO)

    if (overlapping && overlapping.length > 0) {
      const names = overlapping.map((o: any) => o.child?.full_name || "outro paciente").join(", ")
      setConflictWarning(`Atenção: Já existe agendamento neste horário com: ${names}`)
    } else {
      setConflictWarning(null)
    }
  }

  function toggleDay(dayId: number) {
    if (selectedDays.includes(dayId)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== dayId))
      }
    } else {
      setSelectedDays([...selectedDays, dayId].sort())
    }
  }

  async function handleSubmit() {
    const { user, professional, fetchProfessional } = useAuthStore.getState()
    const profId = professional?.id || user?.id

    if (!profId) {
      toast.error("Sessão não encontrada")
      return
    }

    let targetChildId = form.child_id

    if (mode === "existing" && !targetChildId) {
      toast.error("Selecione um paciente cadastrado ou clique em '+ Nova Entrevista'.")
      return
    }

    if (mode === "existing" && !form.type) {
      toast.error("Por favor, selecione o Tipo de Atendimento.")
      return
    }

    setLoading(true)
    try {
      // 1. Ensure professional row exists
      const { data: existingProf } = await supabase
        .from("professionals")
        .select("id")
        .eq("id", profId)
        .single()

      if (!existingProf) {
        const { data: userData } = await supabase.auth.getUser()
        await supabase.from("professionals").upsert({
          id: profId,
          full_name: userData.user?.user_metadata?.full_name || "Priscila Carbone",
          email: userData.user?.email || "",
          specialty: "Psicopedagogia",
        })
        await fetchProfessional(profId)
      }

      // 2. If creating a new interview / appointment on the fly
      if (mode === "new") {
        let resolvedName = form.new_child_name.trim()
        if (!resolvedName) {
          if (form.new_guardian_name.trim()) {
            resolvedName = `Entrevista (${form.new_guardian_name.trim()})`
          } else if (form.notes.trim()) {
            resolvedName = `Entrevista: ${form.notes.trim().substring(0, 20)}`
          } else {
            resolvedName = `Nova Entrevista (${form.start_time})`
          }
        }

        const { data: newChild, error: childError } = await supabase
          .from("children")
          .insert({
            professional_id: profId,
            full_name: resolvedName,
            status: "initial_assessment",
            main_complaint: form.notes.trim() || "Primeira Entrevista com os Pais",
          })
          .select()
          .single()

        if (childError) throw childError
        targetChildId = newChild.id

        if (form.new_guardian_name.trim() || form.new_guardian_phone.trim()) {
          const { data: newGuardian, error: gError } = await supabase
            .from("guardians")
            .insert({
              professional_id: profId,
              full_name: form.new_guardian_name.trim() || `Contato de ${resolvedName}`,
              phone: form.new_guardian_phone || null,
              whatsapp: form.new_guardian_phone || null,
            })
            .select()
            .single()

          if (!gError && newGuardian) {
            await supabase.from("guardian_children").insert({
              child_id: newChild.id,
              guardian_id: newGuardian.id,
              relationship: "Responsável / Contato",
              is_primary: true,
            })
          }
        }
      }

      // 3. Batch insert all calculated appointment dates
      const durationMs = Number(form.duration_minutes || 60) * 60 * 1000
      const appointmentsToInsert = scheduledDates.map((startDate) => {
        const endDate = new Date(startDate.getTime() + durationMs)
        return {
          professional_id: profId,
          child_id: targetChildId,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          type: mode === "new" ? "Entrevista Inicial" : form.type,
          status: form.status as any,
          notes: form.notes || null,
        }
      })

      const { error: apptError } = await supabase
        .from("appointments")
        .insert(appointmentsToInsert)

      if (apptError) throw apptError

      toast.success(
        appointmentsToInsert.length > 1
          ? `🎉 ${appointmentsToInsert.length} sessões agendadas com sucesso na agenda!`
          : "Atendimento agendado com sucesso!"
      )
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || "Erro ao agendar")
    } finally {
      setLoading(false)
    }
  }

  // Text summary of recurrence
  const recurrenceSummary = useMemo(() => {
    if (!isRecurring) return ""
    const dayNames = selectedDays
      .map((id) => WEEK_DAYS.find((w) => w.id === id)?.name)
      .filter(Boolean)
      .join(", ")

    const durText =
      durationMonths === 1
        ? "1 mês"
        : durationMonths === 2
        ? "2 meses"
        : `${durationMonths} meses`

    return `${selectedDays.length}x por semana (${dayNames}) durante ${durText} • Total de ${scheduledDates.length} sessões`
  }, [isRecurring, selectedDays, durationMonths, scheduledDates])

  const selectedTypeObj = APPOINTMENT_TYPES.find(
    (opt) => opt.id === form.type || opt.shortLabel === form.type
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl w-[96vw] lg:w-[940px] p-0 flex flex-col max-h-[92vh] overflow-hidden rounded-3xl border-2 border-[#D8E5E7] bg-white shadow-2xl">
        {/* HEADER */}
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-[#EEF5F6] flex items-center justify-between gap-3 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] border-2 border-[#DDD6FE] flex items-center justify-center shrink-0 shadow-xs">
              <CalendarDays className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-black text-[#0D2329]">
                Novo Agendamento
              </DialogTitle>
              <p className="text-xs font-semibold text-[#6B7C83] mt-0.5">
                Defina o paciente, tipo de atendimento e os horários na agenda
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* BODY (2 COLUNAS LARGAS E ESPAÇOSAS) */}
        <DialogBody className="p-5 sm:p-7 space-y-6 flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
            {/* =========================================================================
                COLUNA 1 (ESQUERDA - 5 cols): IDENTIFICAÇÃO DO PACIENTE E TIPO
                ========================================================================= */}
            <div className="lg:col-span-5 space-y-5">
              {/* Modo de Agendamento */}
              <div className="space-y-2">
                <label className="text-xs font-black text-[#0D2329]">
                  Como deseja agendar?
                </label>
                <div className="flex p-1 bg-[#F7FAFA] rounded-2xl border-2 border-[#D8E5E7] gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("existing")
                      setForm((f) => ({ ...f, type: "" }))
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      mode === "existing"
                        ? "bg-[#7C3AED] text-white shadow-xs"
                        : "text-[#6B7C83] hover:bg-white/60"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Paciente Cadastrado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode("new")
                      setForm((f) => ({ ...f, type: "Entrevista Inicial" }))
                      setIsRecurring(false)
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      mode === "new"
                        ? "bg-[#7C3AED] text-white shadow-xs"
                        : "text-[#6B7C83] hover:bg-white/60"
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Nova Entrevista</span>
                  </button>
                </div>
              </div>

              {/* Paciente Cadastrado */}
              {mode === "existing" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#0D2329] flex items-center justify-between">
                    <span>Selecione o Paciente *</span>
                    <span className="text-[10px] font-bold text-[#6B7C83]">{children.length} cadastrados</span>
                  </label>
                  {children.length > 0 ? (
                    <select
                      value={form.child_id}
                      onChange={(e) => setForm({ ...form, child_id: e.target.value })}
                      className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-black text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs cursor-pointer"
                    >
                      <option value="" disabled>Escolha a criança...</option>
                      {children.map((c) => (
                        <option key={c.id} value={c.id}>{c.full_name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3.5 bg-[#FEF8EC] border-2 border-[#FDE68A] rounded-2xl text-xs text-[#B8871E] font-bold">
                      Nenhuma criança cadastrada ainda. Use a opção "+ Nova Entrevista" acima para agendar direto!
                    </div>
                  )}
                </div>
              )}

              {/* Nova Entrevista Rápida */}
              {mode === "new" && (
                <div className="p-4 rounded-2xl bg-[#EDE9FE]/40 border-2 border-[#DDD6FE] space-y-3">
                  <div className="flex items-center justify-between text-[#7C3AED]">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <p className="text-xs font-black uppercase tracking-wider">
                        Agendamento Rápido
                      </p>
                    </div>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded-md border border-[#DDD6FE] font-bold">
                      1ª Consulta
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#0D2329]">Nome da Criança ou Contato *</label>
                    <input
                      type="text"
                      placeholder="Ex: Arthur, Amiga da Carla..."
                      value={form.new_child_name}
                      onChange={(e) => setForm({ ...form, new_child_name: e.target.value })}
                      className="w-full p-2.5 rounded-xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#0D2329]">Mãe/Contato</label>
                      <input
                        type="text"
                        placeholder="Ex: Mariana"
                        value={form.new_guardian_name}
                        onChange={(e) => setForm({ ...form, new_guardian_name: e.target.value })}
                        className="w-full p-2.5 rounded-xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#0D2329]">WhatsApp</label>
                      <input
                        type="text"
                        placeholder="(11) 99999-9999"
                        value={form.new_guardian_phone}
                        onChange={(e) => setForm({ ...form, new_guardian_phone: e.target.value })}
                        className="w-full p-2.5 rounded-xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tipo de Atendimento: Dropdown de Clicar e Abrir a Lista */}
              {mode === "new" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#0D2329]">
                    Tipo de Atendimento
                  </label>
                  <div className="h-11 rounded-2xl border-2 border-[#BAE6FD] bg-[#F0F9FF] px-3.5 flex items-center justify-between text-xs font-black text-[#0284C7] shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" />
                      <span>Entrevista Inicial (com os Pais)</span>
                    </div>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded-md border border-[#BAE6FD] uppercase font-bold text-[#0284C7]">
                      1ª Consulta
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 relative" ref={typeDropdownRef}>
                  <label className="text-xs font-black text-[#0D2329] flex items-center justify-between">
                    <span>Tipo de Atendimento *</span>
                    {!form.type ? (
                      <span className="text-[10px] font-black text-[#EF4444] bg-[#FEF2F2] px-2 py-0.5 rounded-full border border-[#FECACA]">
                        Selecione
                      </span>
                    ) : (
                      <span className="text-[10px] font-black text-[#10B981] flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[3]" /> Selecionado
                      </span>
                    )}
                  </label>

                  {/* Botão Trigger que abre a lista */}
                  <button
                    type="button"
                    onClick={() => setTypeDropdownOpen((prev) => !prev)}
                    className={`w-full h-11 px-3.5 rounded-2xl border-2 transition-all flex items-center justify-between text-left cursor-pointer shadow-2xs ${
                      !form.type
                        ? "border-[#D8E5E7] bg-white text-[#8CAAB1] hover:border-[#7C3AED]"
                        : `${selectedTypeObj ? selectedTypeObj.pillCls : "border-[#D8E5E7] bg-white text-[#0D2329]"}`
                    }`}
                  >
                    {selectedTypeObj ? (
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${selectedTypeObj.dot}`} />
                        <span className="text-xs font-black text-[#0D2329] truncate">
                          {selectedTypeObj.label}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-[#8CAAB1]">
                        Selecione o tipo de atendimento...
                      </span>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-[#8CAAB1] transition-transform shrink-0 ml-1.5 ${
                        typeDropdownOpen ? "rotate-180 text-[#7C3AED]" : ""
                      }`}
                    />
                  </button>

                  {/* Menu Flutuante ao Clicar */}
                  {typeDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl border-2 border-[#D8E5E7] shadow-xl p-1.5 space-y-1 animate-in fade-in-50 zoom-in-95 duration-150 max-h-60 overflow-y-auto">
                      {APPOINTMENT_TYPES.map((opt) => {
                        const isSelected = form.type === opt.id || form.type.includes(opt.shortLabel)
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setForm({ ...form, type: opt.id })
                              setTypeDropdownOpen(false)
                            }}
                            className={`w-full p-2.5 rounded-xl transition-all flex items-center justify-between text-left cursor-pointer ${
                              isSelected
                                ? `${opt.pillCls} font-black shadow-2xs`
                                : `${opt.borderCls} text-[#0D2329] hover:bg-[#F8FAFB]`
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${opt.dot}`} />
                              <div className="min-w-0">
                                <p className="text-xs font-black leading-tight">{opt.label}</p>
                                <p className="text-[10px] text-[#6B7C83] leading-tight mt-0.5">{opt.description}</p>
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 shrink-0 text-current ml-2 stroke-[3]" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* =========================================================================
                COLUNA 2 (DIREITA - 7 cols): DATA, HORÁRIO, RECORRÊNCIA E ANOTAÇÕES
                ========================================================================= */}
            <div className="lg:col-span-7 space-y-4">
              {/* Data, Horário e Duração */}
              <div className="p-4 sm:p-5 rounded-3xl border-2 border-[#D8E5E7] bg-[#F7FAFA] space-y-3.5">
                <p className="text-xs font-black uppercase tracking-wider text-[#0D2329] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#7C3AED]" />
                  <span>Quando será o atendimento?</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#0D2329]">Data *</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full p-2.5 rounded-xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#0D2329]">Horário de Início *</label>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                      className="w-full p-2.5 rounded-xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#0D2329]">Duração</label>
                    <select
                      value={form.duration_minutes}
                      onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                      className="w-full p-2.5 rounded-xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs cursor-pointer"
                    >
                      <option value="45">45 minutos</option>
                      <option value="50">50 minutos</option>
                      <option value="60">60 minutos (1h)</option>
                      <option value="90">90 minutos (1h30)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Aviso de conflito de horário */}
              {conflictWarning && (
                <div className="p-3.5 bg-[#FEF8EC] border-2 border-[#FDE68A] rounded-2xl flex items-start gap-2.5 text-xs text-[#B8871E] font-bold animate-in fade-in-50">
                  <AlertTriangle className="w-4 h-4 text-[#B8871E] shrink-0 mt-0.5" />
                  <span>{conflictWarning}</span>
                </div>
              )}

              {/* Agendamento Múltiplo / Recorrente */}
              {mode === "existing" && (
                <div className="p-4 sm:p-5 rounded-3xl border-2 border-[#D8E5E7] bg-white space-y-3.5 shadow-2xs">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-4 h-4 rounded text-[#7C3AED] accent-[#7C3AED] cursor-pointer"
                    />
                    <span className="text-xs font-black uppercase tracking-wide text-[#0D2329] flex items-center gap-1.5">
                      <Repeat className="w-3.5 h-3.5 text-[#7C3AED]" />
                      Agendar Múltiplos Dias de Uma Vez (Recorrência)
                    </span>
                  </label>

                  {isRecurring && (
                    <div className="space-y-3.5 pt-3 border-t border-[#EEF5F6] animate-in fade-in-50 duration-200">
                      {/* Dias da semana */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-[#6B7C83]">
                            Dias da semana combinados:
                          </label>
                          <span className="text-[11px] font-bold text-[#7C3AED]">
                            {selectedDays.length} {selectedDays.length === 1 ? "dia" : "dias"} na semana
                          </span>
                        </div>

                        <div className="grid grid-cols-6 gap-1.5">
                          {WEEK_DAYS.map((day) => {
                            const isSelected = selectedDays.includes(day.id)
                            return (
                              <button
                                key={day.id}
                                type="button"
                                onClick={() => toggleDay(day.id)}
                                className={`py-2 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-[#7C3AED] text-white border-[#6D28D9] shadow-xs"
                                    : "bg-white text-[#6B7C83] border-[#D8E5E7] hover:border-[#7C3AED]"
                                }`}
                              >
                                {day.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Período */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#6B7C83]">
                          Repetir por quanto tempo:
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { months: 1, label: "1 Mês" },
                            { months: 2, label: "2 Meses" },
                            { months: 3, label: "3 Meses" },
                            { months: 6, label: "6 Meses" },
                          ].map((item) => (
                            <button
                              key={item.months}
                              type="button"
                              onClick={() => setDurationMonths(item.months)}
                              className={`py-2 px-1 rounded-xl text-xs font-black border-2 transition-all text-center cursor-pointer ${
                                durationMonths === item.months
                                  ? "bg-[#7C3AED] text-white border-[#6D28D9] shadow-xs"
                                  : "bg-white text-[#0D2329] border-[#D8E5E7] hover:border-[#7C3AED]"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Banner de resumo */}
                      <div className="p-3 rounded-2xl bg-[#EDE9FE] border border-[#DDD6FE] text-xs font-bold text-[#7C3AED] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span>{recurrenceSummary}</span>
                      </div>

                      {/* Live preview */}
                      <div className="p-3 rounded-2xl bg-[#F8FAFB] border-2 border-[#D8E5E7] space-y-1.5 max-h-32 overflow-y-auto">
                        <p className="text-[11px] font-black uppercase tracking-wider text-[#7C3AED] flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          Datas calculadas ({scheduledDates.length}):
                        </p>
                        <div className="grid grid-cols-2 gap-1 text-xs text-[#0D2329] font-semibold">
                          {scheduledDates.map((d, i) => (
                            <div key={i} className="flex items-center gap-1.5 py-0.5">
                              <CheckCircle2 className="w-3 h-3 text-[#10B981] shrink-0" />
                              <span>
                                {format(d, "EEE, dd/MM 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Observações / Anotações */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0D2329]">
                  Observações / Anotações da Sessão
                </label>
                <input
                  type="text"
                  placeholder="Ex: Sala 2, trabalhar material sensorial, foco em leitura..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs"
                />
              </div>
            </div>
          </div>
        </DialogBody>

        {/* FOOTER */}
        <DialogFooter className="p-4 sm:p-5 bg-[#F8FAFB] border-t-2 border-[#EEF5F6] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 z-10">
          <div className="text-xs font-bold text-[#6B7C83] flex items-center gap-2">
            {selectedTypeObj ? (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border ${selectedTypeObj.pillCls}`}>
                <span className={`w-2 h-2 rounded-full ${selectedTypeObj.dot}`} />
                <span>{selectedTypeObj.label}</span>
              </span>
            ) : (
              <span className="text-xs text-[#8CAAB1] italic">
                Nenhum tipo de atendimento selecionado
              </span>
            )}

            {form.date && form.start_time && (
              <span className="text-[#0D2329] font-black">
                • {format(new Date(`${form.date}T${form.start_time}`), "dd/MM 'às' HH:mm")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={onClose}
              className="rounded-2xl border-2 border-[#D8E5E7] font-bold text-xs h-10 px-5"
            >
              Cancelar
            </Button>

            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="px-6 h-10 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />}
              <span>
                {isRecurring && scheduledDates.length > 1
                  ? `Confirmar (${scheduledDates.length} sessões)`
                  : "Confirmar Agendamento"}
              </span>
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
