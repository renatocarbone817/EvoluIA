import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import toast from "react-hot-toast"

interface CarePlanDialogProps {
  open: boolean
  childId: string
  onClose: () => void
  onSuccess: () => void
}

export function CarePlanDialog({ open, childId, onClose, onSuccess }: CarePlanDialogProps) {
  const { professional } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [planId, setPlanId] = useState<string | null>(null)

  const [form, setForm] = useState({
    start_date: new Date().toISOString().split("T")[0],
    frequency: "1",
    session_time: "14:00",
    duration_minutes: "60",
    price_per_session: "100",
    payment_type: "mensal",
    payment_due_day: "5",
    notes: "",
  })

  useEffect(() => {
    if (open && professional) {
      loadPlan()
    }
  }, [open, professional, childId])

  async function loadPlan() {
    const { data } = await supabase
      .from("care_plans")
      .select("*")
      .eq("child_id", childId)
      .single()

    if (data) {
      setPlanId(data.id)
      setForm({
        start_date: data.start_date || new Date().toISOString().split("T")[0],
        frequency: String(data.frequency || 1),
        session_time: data.session_time || "14:00",
        duration_minutes: String(data.duration_minutes || 60),
        price_per_session: String(data.price_per_session || 100),
        payment_type: data.payment_type || "mensal",
        payment_due_day: String(data.payment_due_day || 5),
        notes: data.notes || "",
      })
    }
  }

  async function handleSubmit() {
    if (!professional) return
    setLoading(true)
    try {
      const payload = {
        professional_id: professional.id,
        child_id: childId,
        start_date: form.start_date,
        frequency: Number(form.frequency) || 1,
        session_time: form.session_time,
        duration_minutes: Number(form.duration_minutes) || 60,
        price_per_session: Number(form.price_per_session) || 0,
        payment_type: form.payment_type,
        payment_due_day: Number(form.payment_due_day) || 5,
        notes: form.notes || null,
      }

      if (planId) {
        const { error } = await supabase.from("care_plans").update(payload).eq("id", planId)
        if (error) throw error
      } else {
        const { error } = await supabase.from("care_plans").insert(payload)
        if (error) throw error
      }

      // Also update child status to in_progress if currently in initial_assessment
      await supabase
        .from("children")
        .update({ status: "in_progress" })
        .eq("id", childId)
        .eq("status", "initial_assessment")

      toast.success("Plano de acompanhamento configurado!")
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar acompanhamento")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar / Configurar Acompanhamento</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data de Início"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
            <Select
              label="Frequência"
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              options={[
                { value: "1", label: "1x por semana" },
                { value: "2", label: "2x por semana" },
                { value: "3", label: "3x por semana" },
                { value: "0", label: "Quinzenal" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Horário Padrão"
              type="time"
              value={form.session_time}
              onChange={(e) => setForm({ ...form, session_time: e.target.value })}
            />
            <Input
              label="Duração (minutos)"
              type="number"
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Valor/Sessão (R$)"
              type="number"
              value={form.price_per_session}
              onChange={(e) => setForm({ ...form, price_per_session: e.target.value })}
            />
            <Select
              label="Cobrança"
              value={form.payment_type}
              onChange={(e) => setForm({ ...form, payment_type: e.target.value })}
              options={[
                { value: "mensal", label: "Mensal" },
                { value: "por_sessao", label: "Por Sessão" },
                { value: "pacote", label: "Pacote" },
              ]}
            />
            <Input
              label="Dia Vencimento"
              type="number"
              min="1"
              max="31"
              value={form.payment_due_day}
              onChange={(e) => setForm({ ...form, payment_due_day: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Acordos / Observações Financeiras</label>
            <textarea
              placeholder="Ex: Pagamento via Pix até o 5º dia útil..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={loading} onClick={handleSubmit}>
            Salvar Acompanhamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
