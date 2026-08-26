import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { AlertTriangle } from "lucide-react"
import toast from "react-hot-toast"
import type { Child } from "@/types/database"

interface NewAppointmentDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function NewAppointmentDialog({ open, onClose, onSuccess }: NewAppointmentDialogProps) {
  const { professional } = useAuthStore()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(false)
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)

  const [form, setForm] = useState({
    child_id: "",
    date: new Date().toISOString().split("T")[0],
    start_time: "14:00",
    duration_minutes: "60",
    type: "Sessão Psicopedagógica",
    status: "scheduled",
    notes: "",
  })

  useEffect(() => {
    if (open && professional) {
      loadChildren()
      setConflictWarning(null)
    }
  }, [open, professional])

  // Check for conflicts whenever date or start_time changes
  useEffect(() => {
    if (open && professional && form.date && form.start_time) {
      checkConflicts()
    }
  }, [form.date, form.start_time, form.duration_minutes, open])

  async function loadChildren() {
    const { data } = await supabase
      .from("children")
      .select("*")
      .eq("professional_id", professional!.id)
      .order("full_name")

    setChildren(data || [])
    if (data && data.length > 0 && !form.child_id) {
      setForm((f) => ({ ...f, child_id: data[0].id }))
    }
  }

  async function checkConflicts() {
    if (!professional) return

    const start = new Date(`${form.date}T${form.start_time}:00`)
    const durationMs = Number(form.duration_minutes || 60) * 60 * 1000
    const end = new Date(start.getTime() + durationMs)

    const startISO = start.toISOString()
    const endISO = end.toISOString()

    const { data: overlapping } = await supabase
      .from("appointments")
      .select("*, child:children(full_name)")
      .eq("professional_id", professional.id)
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
    const { user, professional } = useAuthStore.getState()
    const profId = professional?.id || user?.id

    if (!profId || !form.child_id) {
      toast.error("Selecione uma criança")
      return
    }

    setLoading(true)
    try {
      const start = new Date(`${form.date}T${form.start_time}:00`)
      const durationMs = Number(form.duration_minutes || 60) * 60 * 1000
      const end = new Date(start.getTime() + durationMs)

      const { error } = await supabase.from("appointments").insert({
        professional_id: profId,
        child_id: form.child_id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        type: form.type,
        status: form.status as any,
        notes: form.notes || null,
      })

      if (error) throw error
      toast.success("Agendamento criado com sucesso!")
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || "Erro ao agendar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Select
            label="Criança *"
            value={form.child_id}
            onChange={(e) => setForm({ ...form, child_id: e.target.value })}
            options={children.map((c) => ({
              value: c.id,
              label: c.full_name,
            }))}
          />

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
                { value: "Sessão Psicopedagógica", label: "Sessão Psicopedagógica" },
                { value: "Avaliação Inicial", label: "Avaliação Inicial" },
                { value: "Devolutiva com Pais", label: "Devolutiva com Pais" },
                { value: "Reunião Escolar", label: "Reunião Escolar" },
                { value: "Outro", label: "Outro" },
              ]}
            />
          </div>

          {conflictWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{conflictWarning}</span>
            </div>
          )}

          <Input
            label="Observações"
            placeholder="Ex: Levar material de matemática..."
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
