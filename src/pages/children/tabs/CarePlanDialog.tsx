import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { CheckCircle2, Sparkles, Calendar, Clock, DollarSign, Loader2 } from "lucide-react"
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
  }, [open, professional?.id, childId])

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
      <DialogContent className="max-w-md w-[95vw] sm:w-full p-0 flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden rounded-3xl border-2 border-[#D8E5E7] bg-white shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-[#EEF5F6] flex items-center gap-3 shrink-0 bg-white">
          <div className="w-11 h-11 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] border-2 border-[#DDD6FE] flex items-center justify-center shrink-0 shadow-xs">
            <DollarSign className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <DialogTitle className="text-base sm:text-lg font-black text-[#0D2329]">
              Configurar Acompanhamento
            </DialogTitle>
            <p className="text-xs font-semibold text-[#6B7C83] mt-0.5">
              {childName} · Frequência, valor e forma de cobrança
            </p>
          </div>
        </DialogHeader>

        <DialogBody className="p-5 sm:p-6 space-y-4 text-xs font-semibold text-[#2E4A52] flex-1 overflow-y-auto min-h-0">
          {/* Dates & Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-black text-[#0D2329]">Data de Início</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3.5 py-2 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-[#0D2329]">Frequência</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                className="w-full px-3.5 py-2 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
              >
                <option value="1">1x por semana</option>
                <option value="2">2x por semana</option>
                <option value="3">3x por semana</option>
                <option value="4">4x por semana</option>
                <option value="0">Quinzenal</option>
              </select>
            </div>
          </div>

          {/* Time & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-black text-[#0D2329]">Horário Padrão</label>
              <input
                type="time"
                value={form.session_time}
                onChange={(e) => setForm({ ...form, session_time: e.target.value })}
                className="w-full px-3.5 py-2 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-[#0D2329]">Duração (minutos)</label>
              <input
                type="number"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                className="w-full px-3.5 py-2 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
              />
            </div>
          </div>

          {/* Billing type selector */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-black text-[#0D2329]">Forma de Cobrança</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "mensal", label: "💰 Mensal", desc: "1 cobrança / mês" },
                { value: "por_sessao", label: "🎯 Por Sessão", desc: "Por atendimento" },
                { value: "pacote", label: "📦 Pacote", desc: "Pacote fixo" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, payment_type: opt.value })}
                  className={`p-3 rounded-2xl border-2 text-left transition-all active:scale-95 ${
                    form.payment_type === opt.value
                      ? "border-[#7C3AED] bg-[#EDE9FE] text-[#7C3AED] shadow-2xs"
                      : "border-[#D8E5E7] bg-white text-[#6B7C83] hover:border-[#7C3AED]/40"
                  }`}
                >
                  <p className="font-black text-xs">{opt.label}</p>
                  <p className="text-[10px] font-semibold mt-0.5 opacity-80">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Amount & Due Day */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-black text-[#0D2329]">
                {isPorSessao
                  ? "💵 Valor por Sessão (R$)"
                  : isPacote
                  ? "💵 Valor do Pacote (R$)"
                  : "💵 Valor Mensal (R$)"}
              </label>
              <input
                type="number"
                value={form.price_per_session}
                onChange={(e) => setForm({ ...form, price_per_session: e.target.value })}
                className="w-full px-3.5 py-2 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-black text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            {!isPorSessao && (
              <div className="space-y-1">
                <label className="text-[11px] font-black text-[#0D2329]">Dia do Vencimento</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={form.payment_due_day}
                  onChange={(e) => setForm({ ...form, payment_due_day: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                />
              </div>
            )}
          </div>

          {/* Info box explaining billing behaviour */}
          <div className={`rounded-2xl p-3.5 text-xs leading-relaxed border-2 ${
            isPorSessao
              ? "bg-[#E0F2FE] border-[#BAE6FD] text-[#0284C7]"
              : isPacote
              ? "bg-[#EDE9FE] border-[#DDD6FE] text-[#7C3AED]"
              : "bg-[#E8F8F5] border-[#A7F3D0] text-[#065F46]"
          }`}>
            {isPorSessao && (
              <p>
                🎯 <strong>Cobrança por Sessão:</strong> Cada vez que você registrar uma sessão deste paciente, um lançamento de{" "}
                <strong>R$ {Number(form.price_per_session).toFixed(2)}</strong> será criado automaticamente como <em>Pendente</em> no Financeiro.
              </p>
            )}
            {form.payment_type === "mensal" && (
              <p>
                💰 <strong>Cobrança Mensal:</strong> Ao salvar, a mensalidade de <strong>R$ {Number(form.price_per_session).toFixed(2)}</strong> será lançada no Financeiro para o mês atual.
              </p>
            )}
            {isPacote && (
              <p>
                📦 <strong>Pacote Fechado:</strong> Ideal para pacotes de 10 ou 20 sessões com valor fixo para acompanhamento psicopedagógico.
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-black text-[#0D2329]">Acordos / Observações Financeiras</label>
            <textarea
              placeholder="Ex: Pagamento via Pix até o 5º dia útil. Desconto de 10% em caso de pontualidade."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] resize-none"
            />
          </div>
        </DialogBody>

        <DialogFooter className="p-3.5 sm:p-4 bg-[#F8FAFB] border-t-2 border-[#EEF5F6] flex items-center justify-end gap-2.5 shrink-0 z-10">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onClose}
            className="rounded-2xl border-2 border-[#D8E5E7] font-bold text-xs"
          >
            Cancelar
          </Button>

          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />}
            <span>{loading ? "Salvando..." : "Salvar Acompanhamento"}</span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
