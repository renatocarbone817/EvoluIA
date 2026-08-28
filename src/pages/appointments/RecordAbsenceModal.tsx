import { useState } from "react"
import { AlertTriangle, X, Check, Calendar, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { ChildAvatar } from "@/components/ui/ChildAvatar"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import toast from "react-hot-toast"
import type { AppointmentWithChild } from "@/types/database"

interface RecordAbsenceModalProps {
  open: boolean
  appointment: AppointmentWithChild | null
  onClose: () => void
  onSuccess: () => void
}

const QUICK_REASONS = [
  { label: "🤒 Motivo de Saúde / Doença", value: "Paciente doente / consulta médica" },
  { label: "🚗 Imprevisto no Transporte", value: "Imprevisto no transporte / trânsito" },
  { label: "✈️ Viagem / Família", value: "Viagem ou compromisso familiar" },
  { label: "📚 Atividade Escolar", value: "Prova ou atividade da escola" },
  { label: "❓ Sem Aviso Prévio", value: "Não compareceu e não justificou com antecedência" },
]

export function RecordAbsenceModal({
  open,
  appointment,
  onClose,
  onSuccess,
}: RecordAbsenceModalProps) {
  const { user, professional } = useAuthStore()
  const profId = professional?.id || user?.id

  const [reason, setReason] = useState("")
  const [shouldCharge, setShouldCharge] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!open || !appointment) return null

  const childName = appointment.child?.full_name || appointment.notes || "Paciente"
  const startTime = new Date(appointment.start_time)
  const endTime = new Date(appointment.end_time)
  const dateFormatted = format(startTime, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  const timeFormatted = `${format(startTime, "HH:mm")} às ${format(endTime, "HH:mm")}`

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profId || !appointment) return

    const reasonText = reason.trim() || "Paciente não compareceu (motivo não detalhado)"
    setLoading(true)

    try {
      // 1. Atualizar o agendamento para status "missed"
      const billingTag = shouldCharge ? "Cobrança autorizada" : "Isento de cobrança"
      const updatedNotes = appointment.notes
        ? `${appointment.notes}\n[FALTA: ${reasonText} • ${billingTag}]`
        : `[FALTA: ${reasonText} • ${billingTag}]`

      const { error: apptErr } = await supabase
        .from("appointments")
        .update({
          status: "missed",
          notes: updatedNotes,
        })
        .eq("id", appointment.id)

      if (apptErr) throw apptErr

      // 2. Criar registro no Histórico Clínico de Sessões da Criança
      if (appointment.child_id) {
        const dateStr = format(startTime, "yyyy-MM-dd")
        const startTimeStr = format(startTime, "HH:mm")
        const endTimeStr = format(endTime, "HH:mm")

        const { error: sessErr } = await supabase.from("sessions").insert({
          professional_id: appointment.professional_id || profId,
          child_id: appointment.child_id,
          appointment_id: appointment.id,
          date: dateStr,
          start_time: startTimeStr,
          end_time: endTimeStr,
          objective: "⚠️ Falta / Não comparecimento",
          what_was_worked: `Paciente não compareceu ao atendimento agendado para ${format(startTime, "dd/MM/yyyy")}.`,
          professional_notes: `Motivo informado: ${reasonText}\nCobrança: ${shouldCharge ? "Sessão cobrada conforme regras da clínica." : "Sessão não cobrada (falta abonada/isenta)."}`,
          status: "completed",
        })

        if (sessErr) console.warn("Could not insert missed session record:", sessErr)
      }

      toast.success(`Falta de ${childName} registrada e documentada no prontuário!`, {
        icon: "⚠️",
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Erro ao registrar falta")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#FEF2F2] border-b border-[#FECACA] p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EF4444] text-white flex items-center justify-center font-bold shadow-xs">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-black text-base text-[#991B1B]">Registrar Falta do Paciente</h3>
              <p className="text-xs font-semibold text-[#B91C1C]">
                Documente o não comparecimento no histórico
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white text-[#991B1B] hover:bg-[#FEE2E2] flex items-center justify-center transition-colors shadow-2xs border border-[#FECACA]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Card Resumo do Atendimento */}
          <div className="p-3.5 rounded-2xl bg-[#F7FAFA] border border-[#D8E5E7] flex items-center gap-3">
            <ChildAvatar photoUrl={appointment.child?.photo_url} name={childName} size="md" />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-black text-[#0D2329] truncate">{childName}</p>
              <p className="text-xs font-semibold text-[#6B7C83] flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#7C3AED]" />
                <span className="capitalize">{dateFormatted}</span>
              </p>
              <p className="text-xs font-bold text-[#0D2329] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#10B981]" />
                <span>{timeFormatted}</span>
              </p>
            </div>
          </div>

          {/* Motivo da Falta */}
          <div className="space-y-2">
            <label className="text-xs font-black text-[#0D2329] flex items-center justify-between">
              <span>Motivo ou Justificativa da Falta:</span>
              <span className="text-[10px] text-[#6B7C83] font-normal">Ficará no prontuário</span>
            </label>

            {/* Sugestões Rápidas */}
            <div className="flex flex-wrap gap-1.5 pb-1">
              {QUICK_REASONS.map((qr) => (
                <button
                  key={qr.label}
                  type="button"
                  onClick={() => setReason(qr.value)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border transition-all ${
                    reason === qr.value
                      ? "bg-[#EDE9FE] border-[#7C3AED] text-[#7C3AED]"
                      : "bg-[#F8FAFB] border-[#D8E5E7] text-[#4F6C74] hover:border-[#7C3AED]/50"
                  }`}
                >
                  {qr.label}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Mãe avisou que a criança está doente com febre e não poderá comparecer..."
              className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#EF4444] resize-none"
              autoFocus
            />
          </div>

          {/* Opção de Cobrança da Sessão */}
          <div className="space-y-2 pt-1 border-t border-[#EEF5F6]">
            <label className="text-xs font-black text-[#0D2329] block">
              Cobrança desta Sessão:
            </label>

            <div className="grid grid-cols-2 gap-3">
              {/* Opção 1: Não Cobrar */}
              <div
                onClick={() => setShouldCharge(false)}
                className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                  !shouldCharge
                    ? "bg-[#E8F8F5] border-[#10B981] ring-2 ring-[#10B981]/20"
                    : "bg-white border-[#D8E5E7] hover:bg-[#F7FAFA]"
                }`}
              >
                <div className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                  !shouldCharge ? "bg-[#10B981] border-[#10B981] text-white" : "border-[#8CAAB1]"
                }`}>
                  {!shouldCharge && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-[#065F46]">Não Cobrar</p>
                  <p className="text-[10px] font-semibold text-[#059669]">
                    Falta justificada ou abonada.
                  </p>
                </div>
              </div>

              {/* Opção 2: Cobrar */}
              <div
                onClick={() => setShouldCharge(true)}
                className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                  shouldCharge
                    ? "bg-[#FEF8EC] border-[#F59E0B] ring-2 ring-[#F59E0B]/20"
                    : "bg-white border-[#D8E5E7] hover:bg-[#F7FAFA]"
                }`}
              >
                <div className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                  shouldCharge ? "bg-[#F59E0B] border-[#F59E0B] text-white" : "border-[#8CAAB1]"
                }`}>
                  {shouldCharge && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-[#854D0E]">Cobrar Sessão</p>
                  <p className="text-[10px] font-semibold text-[#B45309]">
                    Regra de contrato / sem aviso.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer com Ações */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EEF5F6]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-[#6B7C83] hover:text-[#0D2329] hover:bg-[#F7FAFA] rounded-xl transition-all"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-black flex items-center gap-2 shadow-sm active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Registrando...</span>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Salvar Registro de Falta</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
