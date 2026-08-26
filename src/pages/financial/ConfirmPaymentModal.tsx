import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { MessageSquare, CheckCircle2, DollarSign, Calendar, User, Sparkles } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import toast from "react-hot-toast"
import type { FinancialRecord } from "@/types/database"

interface ConfirmPaymentModalProps {
  open: boolean
  record: any | null
  onClose: () => void
  onSuccess: () => void
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

export function ConfirmPaymentModal({
  open,
  record,
  onClose,
  onSuccess,
}: ConfirmPaymentModalProps) {
  const { professional } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const [paymentMethod, setPaymentMethod] = useState("PIX")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [guardianName, setGuardianName] = useState("")
  const [guardianPhone, setGuardianPhone] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (open && record) {
      const primaryGuardian = record.child?.guardians?.[0]?.guardian
      const gName = primaryGuardian?.full_name || "Responsável"
      const rawPhone = primaryGuardian?.whatsapp || primaryGuardian?.phone || ""
      const cleanPhone = rawPhone.replace(/\D/g, "")

      setGuardianName(gName)
      setGuardianPhone(cleanPhone)
      setPaymentDate(new Date().toISOString().split("T")[0])
      setPaymentMethod("PIX")
      setNotes(record.notes || "")
    }
  }, [open, record])

  if (!record) return null

  const childName = record.child?.full_name || "Paciente"
  const refMonth = MONTHS[record.month - 1]
  const refYear = record.year
  const amountFormatted = formatCurrency(record.amount)
  const profName = professional?.full_name || "Priscila Carbone"
  const clinicName = professional?.clinic_name || "EvoluIA — Gestão Psicopedagógica"

  function generateReceiptMessage() {
    const formattedDate = formatDate(paymentDate)
    return `🧾 *COMPROVANTE DE PAGAMENTO*
*Clínica:* ${clinicName}
*Profissional:* ${profName}

Olá, *${guardianName}*! Confirmamos com sucesso o recebimento do pagamento:

🧒 *Paciente:* ${childName}
📅 *Mês de Referência:* ${refMonth} / ${refYear}
💰 *Valor Pago:* ${amountFormatted}
💳 *Forma de Pagamento:* ${paymentMethod}
🗓️ *Data do Pagamento:* ${formattedDate}${notes ? `\n📝 *Observações:* ${notes}` : ""}

Muito obrigada pela confiança e parceria no desenvolvimento do seu filho! ✨`
  }

  async function handleConfirmPayment(sendWhatsApp: boolean) {
    setLoading(true)
    try {
      const { error } = await supabase
        .from("financial_records")
        .update({
          status: "paid",
          payment_date: paymentDate,
          notes: notes || record.notes || null,
        })
        .eq("id", record.id)

      if (error) throw error

      toast.success(`Pagamento de ${childName} confirmado com sucesso!`)

      if (sendWhatsApp) {
        const cleanPhone = guardianPhone.replace(/\D/g, "")
        const message = generateReceiptMessage()
        const encoded = encodeURIComponent(message)
        const waUrl = cleanPhone
          ? `https://wa.me/55${cleanPhone}?text=${encoded}`
          : `https://wa.me/?text=${encoded}`

        window.open(waUrl, "_blank")
      }

      onSuccess()
    } catch (err: any) {
      toast.error(err.message || "Erro ao confirmar pagamento")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[#20836F]">
            <CheckCircle2 className="w-5 h-5" />
            <DialogTitle>Confirmar Pagamento & Emitir Recibo</DialogTitle>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Card Resumo do Pagamento */}
          <div className="p-4 rounded-2xl bg-[#E8F8F5] border-2 border-[#63C7B2]/40 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#6B7C83] uppercase">Paciente</p>
                <h4 className="font-black text-base text-[#19323A]">{childName}</h4>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-[#6B7C83] uppercase">Valor</p>
                <p className="text-xl font-black text-[#20836F]">{amountFormatted}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#63C7B2]/30 flex items-center justify-between text-xs font-bold text-[#19323A]">
              <span>Referência: <strong>{refMonth} / {refYear}</strong></span>
              <span className="bg-white px-2 py-0.5 rounded-md border border-[#63C7B2]/40 text-[#20836F]">
                Pronto para dar baixa
              </span>
            </div>
          </div>

          {/* Dados da Baixa */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data do Pagamento *"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />

            <Select
              label="Forma de Pagamento"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              options={[
                { value: "PIX", label: "PIX" },
                { value: "Dinheiro", label: "Dinheiro" },
                { value: "Cartão de Crédito", label: "Cartão de Crédito" },
                { value: "Cartão de Débito", label: "Cartão de Débito" },
                { value: "Transferência / TED", label: "Transferência / TED" },
                { value: "Boleto Bancário", label: "Boleto Bancário" },
              ]}
            />
          </div>

          {/* Dados do Responsável para Envio */}
          <div className="p-4 rounded-2xl bg-[#F7FAFA] border-2 border-[#D8E5E7] space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-[#19323A] flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#20836F]" />
              Enviar Comprovante pelo WhatsApp
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nome do Responsável"
                placeholder="Ex: Mariana Silva"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
              />

              <Input
                label="WhatsApp (com DDD)"
                placeholder="Ex: 11999999999"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
              />
            </div>

            <Input
              label="Detalhes / Anotações do Recibo (Opcional)"
              placeholder="Ex: ref. 4 sessões semanais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Preview da Mensagem */}
          <div className="p-3 rounded-xl bg-white border-2 border-[#D8E5E7] space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#6B7C83]">
              Prévia da Mensagem do WhatsApp:
            </p>
            <div className="text-[11px] text-[#19323A] whitespace-pre-line font-medium leading-relaxed bg-[#EEF5F6]/40 p-2.5 rounded-lg border border-[#D8E5E7]">
              {generateReceiptMessage()}
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancelar
          </Button>

          <Button
            variant="outline"
            loading={loading}
            onClick={() => handleConfirmPayment(false)}
            className="w-full sm:w-auto font-bold border-2"
          >
            Apenas Dar Baixa
          </Button>

          <Button
            loading={loading}
            onClick={() => handleConfirmPayment(true)}
            className="w-full sm:w-auto bg-[#20836F] hover:bg-[#186857] text-white gap-2 font-black shadow-[0_4px_0_0_#145245]"
          >
            <MessageSquare className="w-4 h-4 fill-current" />
            Confirmar & Enviar no WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
