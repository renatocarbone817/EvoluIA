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
  childName?: string
  onClose: () => void
  onSuccess: () => void
}

export function CarePlanDialog({ open, childId, childName = "Paciente", onClose, onSuccess }: CarePlanDialogProps) {
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
      const profId = professional.id
      const amount = Number(form.price_per_session) || 0

      const payload = {
        professional_id: profId,
        child_id: childId,
        start_date: form.start_date,
        frequency: Number(form.frequency) || 1,
        session_time: form.session_time,
        duration_minutes: Number(form.duration_minutes) || 60,
        price_per_session: amount,
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

      // Update child status to in_progress if currently in initial_assessment
      await supabase
        .from("children")
        .update({ status: "in_progress" })
        .eq("id", childId)
        .eq("status", "initial_assessment")

      // AUTO-CREATE MONTHLY FINANCIAL RECORD if payment_type is mensal and amount > 0
      if (form.payment_type === "mensal" && amount > 0) {
        const startDate = new Date(form.start_date + "T12:00:00")
        const month = startDate.getMonth() + 1
        const year = startDate.getFullYear()

        // Check if a record already exists for this month
        const { data: existing } = await supabase
          .from("financial_records")
          .select("id")
          .eq("professional_id", profId)
          .eq("child_id", childId)
          .eq("month", month)
          .eq("year", year)
          .maybeSingle()

        if (!existing) {
          await supabase.from("financial_records").insert({
            professional_id: profId,
            child_id: childId,
            month,
            year,
            amount,
            status: "pending",
            payment_date: null,
            notes: `Mensalidade ${month}/${year} — ${childName}`,
          })
          toast.success(`Acompanhamento configurado! Mensalidade de R$ ${amount.toFixed(2)} lançada no Financeiro.`)
        } else {
          toast.success("Plano de acompanhamento configurado!")
        }
      } else {
        toast.success("Plano de acompanhamento configurado!")
      }

      onSuccess()
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar acompanhamento")
    } finally {
      setLoading(false)
    }
  }

  const isPorSessao = form.payment_type === "por_sessao"
  const isPacote = form.payment_type === "pacote"

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar / Configurar Acompanhamento</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {childName} · Configure frequência, valor e forma de cobrança
          </p>
        </DialogHeader>
        <DialogBody className="space-y-4">

          {/* Dates & Frequency */}
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
                { value: "4", label: "4x por semana" },
                { value: "0", label: "Quinzenal" },
              ]}
            />
          </div>

          {/* Time & Duration */}
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

          {/* Billing type selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Forma de Cobrança</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "mensal", label: "💰 Mensal", desc: "Uma cobrança por mês" },
                { value: "por_sessao", label: "🎯 Por Sessão", desc: "Uma cobrança por atendimento" },
                { value: "pacote", label: "📦 Pacote", desc: "Pacote fixo fechado" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, payment_type: opt.value })}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    form.payment_type === opt.value
                      ? "border-[#245C6B] bg-[#245C6B]/5 text-[#245C6B]"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/30"
                  }`}
                >
                  <p className="font-bold text-xs">{opt.label}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Amount & Due Day */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={
                isPorSessao
                  ? "💵 Valor por Sessão (R$)"
                  : isPacote
                  ? "💵 Valor do Pacote (R$)"
                  : "💵 Valor Mensal (R$)"
              }
              type="number"
              value={form.price_per_session}
              onChange={(e) => setForm({ ...form, price_per_session: e.target.value })}
            />
            {!isPorSessao && (
              <Input
                label="Dia do Vencimento"
                type="number"
                min="1"
                max="31"
                value={form.payment_due_day}
                onChange={(e) => setForm({ ...form, payment_due_day: e.target.value })}
              />
            )}
          </div>

          {/* Info box explaining billing behaviour */}
          <div className={`rounded-xl p-3 text-xs leading-relaxed border ${
            isPorSessao
              ? "bg-blue-50 border-blue-200 text-blue-800"
              : isPacote
              ? "bg-purple-50 border-purple-200 text-purple-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}>
            {isPorSessao && (
              <p>
                🎯 <strong>Cobrança por Sessão:</strong> Cada vez que você registrar uma sessão deste paciente, um lançamento financeiro de{" "}
                <strong>R$ {Number(form.price_per_session).toFixed(2)}</strong> será criado automaticamente como <em>Pendente</em> no Financeiro.
              </p>
            )}
            {form.payment_type === "mensal" && (
              <p>
                💰 <strong>Cobrança Mensal:</strong> Ao salvar, uma mensalidade de <strong>R$ {Number(form.price_per_session).toFixed(2)}</strong> será lançada no Financeiro para o mês atual. Nos próximos meses, a primeira sessão do mês criará o lançamento automaticamente.
              </p>
            )}
            {isPacote && (
              <p>
                📦 <strong>Pacote Fechado:</strong> Você controla manualmente os lançamentos no Financeiro. Ideal para pacotes de 10 ou 20 sessões com valor fixo.
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Acordos / Observações Financeiras</label>
            <textarea
              placeholder="Ex: Pagamento via Pix até o 5º dia útil. Desconto de 10% em caso de pontualidade."
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
