import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { AlertTriangle, UserPlus, Users, Sparkles } from "lucide-react"
import toast from "react-hot-toast"
import type { Child } from "@/types/database"

interface NewAppointmentDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function NewAppointmentDialog({ open, onClose, onSuccess }: NewAppointmentDialogProps) {
  const { user, professional } = useAuthStore()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(false)
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)

  // Mode: "existing" = select child from list | "new" = type new child/prospect name
  const [mode, setMode] = useState<"existing" | "new">("existing")

  const [form, setForm] = useState({
    child_id: "",
    new_child_name: "",
    new_guardian_name: "",
    new_guardian_phone: "",
    date: new Date().toISOString().split("T")[0],
    start_time: "14:00",
    duration_minutes: "60",
    type: "Avaliação Inicial",
    status: "scheduled",
    notes: "",
  })

  useEffect(() => {
    if (open && (professional || user)) {
      loadChildren()
      setConflictWarning(null)
    }
  }, [open, professional, user])

  // Check for conflicts whenever date or start_time changes
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

    setChildren(data || [])
    if (data && data.length > 0) {
      setForm((f) => ({ ...f, child_id: data[0].id }))
      setMode("existing")
    } else {
      // If no children exist yet, default directly to new child/evaluation mode!
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

  async function handleSubmit() {
    const { user, professional, fetchProfessional } = useAuthStore.getState()
    const profId = professional?.id || user?.id

    if (!profId) {
      toast.error("Sessão não encontrada")
      return
    }

    let targetChildId = form.child_id

    // If in new child mode, validate child name
    if (mode === "new") {
      if (!form.new_child_name.trim()) {
        toast.error("Por favor, digite o nome da criança para a avaliação.")
        return
      }
    } else {
      if (!targetChildId) {
        toast.error("Selecione um paciente cadastrado ou clique em 'Nova Avaliação'.")
        return
      }
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

      // 2. If creating a new child on the fly for this evaluation:
      if (mode === "new") {
        const { data: newChild, error: childError } = await supabase
          .from("children")
          .insert({
            professional_id: profId,
            full_name: form.new_child_name.trim(),
            status: "initial_assessment",
            main_complaint: form.type === "Avaliação Inicial" ? "Primeira Avaliação Clínica" : null,
          })
          .select()
          .single()

        if (childError) throw childError
        targetChildId = newChild.id

        // If guardian name/phone provided, create and link
        if (form.new_guardian_name.trim() || form.new_guardian_phone.trim()) {
          const { data: newGuardian, error: gError } = await supabase
            .from("guardians")
            .insert({
              professional_id: profId,
              full_name: form.new_guardian_name.trim() || `Responsável de ${form.new_child_name}`,
              phone: form.new_guardian_phone || null,
              whatsapp: form.new_guardian_phone || null,
            })
            .select()
            .single()

          if (!gError && newGuardian) {
            await supabase.from("guardian_children").insert({
              child_id: newChild.id,
              guardian_id: newGuardian.id,
              relationship: "Responsável",
              is_primary: true,
            })
          }
        }
      }

      // 3. Create the appointment
      const start = new Date(`${form.date}T${form.start_time}:00`)
      const durationMs = Number(form.duration_minutes || 60) * 60 * 1000
      const end = new Date(start.getTime() + durationMs)

      const { error: apptError } = await supabase.from("appointments").insert({
        professional_id: profId,
        child_id: targetChildId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        type: form.type,
        status: form.status as any,
        notes: form.notes || null,
      })

      if (apptError) throw apptError

      toast.success(
        mode === "new"
          ? "Nova avaliação agendada e paciente cadastrado com sucesso!"
          : "Atendimento agendado com sucesso!"
      )
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || "Erro ao agendar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Agendamento na Agenda</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Mode Switcher: Paciente Cadastrado vs Nova Avaliação */}
          <div className="flex bg-[#EEF5F6] p-1 rounded-2xl border-2 border-[#D8E5E7] gap-1">
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                mode === "existing"
                  ? "bg-[#245C6B] text-white shadow-xs"
                  : "text-[#19323A] hover:bg-white/60"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Paciente Cadastrado</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("new")
                setForm((f) => ({ ...f, type: "Avaliação Inicial" }))
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                mode === "new"
                  ? "bg-[#245C6B] text-white shadow-xs"
                  : "text-[#19323A] hover:bg-white/60"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Nova Avaliação / Novo Paciente</span>
            </button>
          </div>

          {/* Option A: Existing Child Selector */}
          {mode === "existing" && (
            <div className="space-y-1">
              {children.length > 0 ? (
                <Select
                  label="Selecione a Criança *"
                  value={form.child_id}
                  onChange={(e) => setForm({ ...form, child_id: e.target.value })}
                  options={children.map((c) => ({
                    value: c.id,
                    label: c.full_name,
                  }))}
                />
              ) : (
                <div className="p-4 bg-[#FEF8EC] border-2 border-[#F4C95D]/50 rounded-2xl text-xs text-[#B8871E] font-bold">
                  Nenhuma criança cadastrada ainda. Use a opção "+ Nova Avaliação / Novo Paciente" acima para agendar direto!
                </div>
              )}
            </div>
          )}

          {/* Option B: New Child Quick Form for Initial Assessment */}
          {mode === "new" && (
            <div className="p-4 rounded-2xl bg-[#E8F8F5]/60 border-2 border-[#63C7B2]/40 space-y-3">
              <div className="flex items-center gap-2 text-[#20836F]">
                <Sparkles className="w-4 h-4" />
                <p className="text-xs font-black uppercase tracking-wider">
                  Agendar Avaliação sem Cadastro Prévio
                </p>
              </div>

              <Input
                label="Nome da Criança para Avaliação *"
                placeholder="Ex: Arthur Souza"
                value={form.new_child_name}
                onChange={(e) => setForm({ ...form, new_child_name: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nome da Mãe/Pai (Opcional)"
                  placeholder="Ex: Mariana Souza"
                  value={form.new_guardian_name}
                  onChange={(e) => setForm({ ...form, new_guardian_name: e.target.value })}
                />
                <Input
                  label="WhatsApp (Opcional)"
                  placeholder="(11) 99999-9999"
                  value={form.new_guardian_phone}
                  onChange={(e) => setForm({ ...form, new_guardian_phone: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data *"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <Input
              label="Horário de Início *"
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
          </div>

          {/* Duration & Type */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Duração"
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
              options={[
                { value: "45", label: "45 minutos" },
                { value: "50", label: "50 minutos" },
                { value: "60", label: "60 minutos (1 hora)" },
                { value: "90", label: "90 minutos (1h30)" },
              ]}
            />
            <Select
              label="Tipo de Atendimento"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              options={[
                { value: "Avaliação Inicial", label: "Avaliação Inicial" },
                { value: "Sessão Psicopedagógica", label: "Sessão Psicopedagógica" },
                { value: "Devolutiva com Pais", label: "Devolutiva com Pais" },
                { value: "Reunião Escolar", label: "Reunião Escolar" },
                { value: "Outro", label: "Outro" },
              ]}
            />
          </div>

          {conflictWarning && (
            <div className="p-3 bg-[#FEF8EC] border-2 border-[#F4C95D] rounded-xl flex items-start gap-2.5 text-xs text-[#B8871E] font-bold">
              <AlertTriangle className="w-4 h-4 text-[#B8871E] shrink-0 mt-0.5" />
              <span>{conflictWarning}</span>
            </div>
          )}

          <Input
            label="Observações / Anotações"
            placeholder="Ex: Queixa informada por telefone..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={loading} onClick={handleSubmit}>
            Confirmar Agendamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
