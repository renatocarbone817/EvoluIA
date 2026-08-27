import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import {
  MessageSquare,
  CheckCircle2,
  Download,
  Copy,
  ImageIcon,
  Sparkles,
  X,
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import toast from "react-hot-toast"

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)

  const [paymentMethod, setPaymentMethod] = useState("PIX")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [guardianName, setGuardianName] = useState("")
  const [guardianPhone, setGuardianPhone] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (open && record) {
      setPaymentDate(new Date().toISOString().split("T")[0])
      setPaymentMethod("PIX")
      setNotes(record.notes || "")

      // Initial check from record object
      const primaryGuardian = record.child?.guardians?.[0]?.guardian
      const initialName = primaryGuardian?.full_name || ""
      const rawPhone = primaryGuardian?.whatsapp || primaryGuardian?.phone || ""

      setGuardianName(initialName || "Responsável")
      setGuardianPhone(rawPhone ? rawPhone.replace(/\D/g, "") : "")

      // Always fetch fresh guardian details from database to guarantee phone number is populated
      const cId = record.child_id || record.child?.id
      if (cId) {
        supabase
          .from("guardian_children")
          .select("is_primary, guardian:guardians(id, full_name, phone, whatsapp)")
          .eq("child_id", cId)
          .then(({ data }) => {
            const list = (data || []) as any[]
            if (list.length > 0) {
              const primaryRecord = list.find((g: any) => g.is_primary) || list[0]
              const primary = Array.isArray(primaryRecord?.guardian)
                ? primaryRecord.guardian[0]
                : primaryRecord?.guardian

              if (primary) {
                if (primary.full_name) setGuardianName(primary.full_name)
                const phone = primary.whatsapp || primary.phone || ""
                if (phone) setGuardianPhone(String(phone).replace(/\D/g, ""))
              }
            }
          })
      }
    }
  }, [open, record])

  // Re-generate receipt image whenever fields change
  useEffect(() => {
    if (open && record) {
      generateReceiptCanvas()
    }
  }, [open, record, paymentMethod, paymentDate, guardianName, notes, professional])

  if (!open || !record) return null

  const childName = record.child?.full_name || "Paciente"
  const rMonth = record.month ? Number(record.month) : new Date().getMonth() + 1
  const refMonth = MONTHS[rMonth - 1]
  const refYear = record.year || new Date().getFullYear()
  const amountFormatted = formatCurrency(record.amount)
  const profName = professional?.full_name || "Priscila Carbone"
  const clinicName = professional?.clinic_name || "EvoluIA — Gestão Psicopedagógica"
  const specialty = professional?.specialty || "Psicopedagogia Clínica"

  // Generates a crisp, retina graphic receipt card on canvas with modern branding
  function generateReceiptCanvas() {
    const canvas = canvasRef.current || document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = 800
    const height = 980
    canvas.width = width
    canvas.height = height

    // 1. Background
    ctx.fillStyle = "#F7FAFA"
    ctx.fillRect(0, 0, width, height)

    // Outer Border
    ctx.strokeStyle = "#D8E5E7"
    ctx.lineWidth = 6
    ctx.strokeRect(3, 3, width - 6, height - 6)

    // 2. Header Banner (Modern Dark Petrol Gradient)
    const grad = ctx.createLinearGradient(0, 0, width, 220)
    grad.addColorStop(0, "#0D2329")
    grad.addColorStop(1, "#14333C")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, 220)

    // Header Accent Line (Mint / Emerald)
    ctx.fillStyle = "#10B981"
    ctx.fillRect(0, 214, width, 6)

    // Clinic / Professional Name in Header
    ctx.fillStyle = "#FFFFFF"
    ctx.font = "bold 32px Inter, system-ui, sans-serif"
    ctx.fillText(clinicName, 50, 75)

    ctx.fillStyle = "#94A3B8"
    ctx.font = "600 20px Inter, system-ui, sans-serif"
    ctx.fillText(`${profName} • ${specialty}`, 50, 115)

    // Badge "COMPROVANTE OFICIAL" in Header
    ctx.fillStyle = "rgba(16, 185, 129, 0.15)"
    ctx.strokeStyle = "#10B981"
    ctx.lineWidth = 2
    roundRect(ctx, 50, 140, 230, 42, 10, true, true)

    ctx.fillStyle = "#10B981"
    ctx.font = "bold 15px Inter, system-ui, sans-serif"
    ctx.fillText("✓ COMPROVANTE OFICIAL", 70, 167)

    // Emission Date in Header
    ctx.fillStyle = "#CBD5E1"
    ctx.font = "500 16px Inter, system-ui, sans-serif"
    ctx.textAlign = "right"
    ctx.fillText(`Emissão: ${formatDate(paymentDate)}`, width - 50, 75)
    ctx.textAlign = "left"

    // 3. Amount & Status Card
    ctx.fillStyle = "#FFFFFF"
    ctx.strokeStyle = "#E2E8F0"
    ctx.lineWidth = 2
    roundRect(ctx, 50, 250, width - 100, 140, 18, true, true)

    ctx.fillStyle = "#64748B"
    ctx.font = "bold 14px Inter, system-ui, sans-serif"
    ctx.fillText("VALOR RECEBIDO", 80, 290)

    ctx.fillStyle = "#0D2329"
    ctx.font = "bold 44px Inter, system-ui, sans-serif"
    ctx.fillText(amountFormatted, 80, 345)

    // Green Paid Tag inside Amount Card
    ctx.fillStyle = "#ECFDF5"
    ctx.strokeStyle = "#10B981"
    ctx.lineWidth = 2
    roundRect(ctx, width - 200, 280, 120, 36, 18, true, true)

    ctx.fillStyle = "#059669"
    ctx.font = "bold 15px Inter, system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("✓ PAGO", width - 140, 304)
    ctx.textAlign = "left"

    ctx.fillStyle = "#64748B"
    ctx.font = "600 14px Inter, system-ui, sans-serif"
    ctx.textAlign = "right"
    ctx.fillText(`Ref: ${refMonth} / ${refYear}`, width - 80, 345)
    ctx.textAlign = "left"

    // 4. Details Section Table
    ctx.fillStyle = "#FFFFFF"
    ctx.strokeStyle = "#E2E8F0"
    ctx.lineWidth = 2
    roundRect(ctx, 50, 420, width - 100, 380, 18, true, true)

    const rows = [
      { label: "Paciente Atendido:", val: childName },
      { label: "Responsável Financeiro:", val: guardianName || "Responsável" },
      { label: "Mês de Referência:", val: `${refMonth} de ${refYear}` },
      { label: "Forma de Pagamento:", val: paymentMethod },
      { label: "Data da Quitação:", val: formatDate(paymentDate) },
      { label: "Observações:", val: notes || "Atendimento psicopedagógico" },
    ]

    let yPos = 475
    rows.forEach((row, i) => {
      ctx.fillStyle = "#64748B"
      ctx.font = "bold 15px Inter, system-ui, sans-serif"
      ctx.fillText(row.label, 80, yPos)

      ctx.fillStyle = "#0D2329"
      ctx.font = "bold 17px Inter, system-ui, sans-serif"
      ctx.textAlign = "right"
      ctx.fillText(row.val, width - 80, yPos)
      ctx.textAlign = "left"

      if (i < rows.length - 1) {
        ctx.strokeStyle = "#F1F5F9"
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(80, yPos + 18)
        ctx.lineTo(width - 80, yPos + 18)
        ctx.stroke()
      }
      yPos += 52
    })

    // 5. Footer
    ctx.fillStyle = "#94A3B8"
    ctx.font = "600 14px Inter, system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("🔒 Comprovante emitido via EvoluIA • Gestão Psicopedagógica", width / 2, 860)
    ctx.fillText("Obrigada pela confiança no desenvolvimento do seu filho!", width / 2, 890)
    ctx.textAlign = "left"

    setImagePreviewUrl(canvas.toDataURL("image/png"))
  }

  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: boolean,
    stroke: boolean
  ) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
    if (fill) ctx.fill()
    if (stroke) ctx.stroke()
  }

  async function getCanvasBlob(): Promise<Blob | null> {
    const canvas = canvasRef.current || document.createElement("canvas")
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png")
    })
  }

  function handleDownloadImage() {
    if (!imagePreviewUrl) return
    const link = document.createElement("a")
    link.download = `comprovante_${childName.replace(/\s+/g, "_")}_${refMonth}_${refYear}.png`
    link.href = imagePreviewUrl
    link.click()
    toast.success("Comprovante baixado em alta definição!")
  }

  async function handleCopyImage() {
    try {
      const blob = await getCanvasBlob()
      if (!blob) throw new Error("Erro ao gerar imagem")

      if (navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({ "image/png": blob }),
        ])
        toast.success("Imagem copiada! Agora basta colar (Ctrl+V) no WhatsApp.")
      } else {
        handleDownloadImage()
      }
    } catch {
      handleDownloadImage()
    }
  }

  async function handleConfirmAndSendWhatsApp() {
    setLoading(true)
    try {
      // 1. Update Database
      const { error } = await supabase
        .from("financial_records")
        .update({
          status: "paid",
          payment_date: paymentDate,
          notes: notes || record.notes || null,
        })
        .eq("id", record.id)

      if (error) throw error
      toast.success(`Pagamento de ${childName} confirmado!`)

      // 2. Automatically copy high resolution image to clipboard
      const blob = await getCanvasBlob()
      if (blob && navigator.clipboard && (window as any).ClipboardItem) {
        try {
          await navigator.clipboard.write([
            new (window as any).ClipboardItem({ "image/png": blob }),
          ])
          toast.success("📋 Foto do comprovante copiada! Dê Ctrl+V no WhatsApp.", { duration: 6000 })
        } catch {
          handleDownloadImage()
        }
      } else {
        handleDownloadImage()
      }

      // 3. Format Phone
      let cleanPhone = guardianPhone.replace(/\D/g, "")
      if (cleanPhone && !cleanPhone.startsWith("55") && cleanPhone.length <= 11) {
        cleanPhone = `55${cleanPhone}`
      }

      // 4. Short, pleasant greeting phrase for WhatsApp
      const shortGreeting = `Olá, ${guardianName || "tudo bem"}! Segue o comprovante de pagamento de ${childName} (${refMonth}/${refYear}) no valor de ${amountFormatted}.`

      // 5. Open WhatsApp
      const waUrl = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(shortGreeting)}`
        : `https://wa.me/?text=${encodeURIComponent(shortGreeting)}`

      window.open(waUrl, "_blank")
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || "Erro ao confirmar pagamento")
    } finally {
      setLoading(false)
    }
  }

  async function handleOnlyConfirm() {
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
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* Hidden canvas used to render the retina receipt image */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in fade-in-50 zoom-in-95 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EEF5F6] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8F8F5] text-[#10B981] flex items-center justify-center shadow-2xs">
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#0D2329]">
                Confirmar Pagamento & Gerar Recibo
              </h3>
              <p className="text-xs text-[#8CAAB1]">
                Dar baixa e gerar comprovante oficial para o paciente
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#8CAAB1] hover:text-[#0D2329] p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-3.5 text-xs">
          {/* Row 1: Data & Forma de Pagamento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[#0D2329] block mb-1">
                Data do Pagamento *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-semibold focus:outline-none focus:border-[#10B981] focus:bg-white"
              />
            </div>

            <div>
              <label className="font-bold text-[#0D2329] block mb-1">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-semibold focus:outline-none focus:border-[#10B981]"
              >
                <option value="PIX">💠 PIX</option>
                <option value="Dinheiro">💵 Dinheiro</option>
                <option value="Cartão de Crédito">💳 Cartão de Crédito</option>
                <option value="Cartão de Débito">💳 Cartão de Débito</option>
                <option value="Transferência / TED">🏛️ Transferência / TED</option>
                <option value="Boleto Bancário">📄 Boleto Bancário</option>
              </select>
            </div>
          </div>

          {/* Row 2: Nome e WhatsApp do Responsável */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[#0D2329] block mb-1">
                Nome do Responsável
              </label>
              <input
                type="text"
                placeholder="Ex: Tereza Limeira"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-semibold focus:outline-none focus:border-[#10B981] focus:bg-white"
              />
            </div>

            <div>
              <label className="font-bold text-[#0D2329] block mb-1">
                WhatsApp do Responsável (com DDD)
              </label>
              <input
                type="text"
                placeholder="Ex: 11999999999"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-semibold focus:outline-none focus:border-[#10B981] focus:bg-white"
              />
            </div>
          </div>

          {/* Row 3: Observações */}
          <div>
            <label className="font-bold text-[#0D2329] block mb-1">
              Detalhes / Observações (vai na imagem do comprovante)
            </label>
            <input
              type="text"
              placeholder="Ex: Ref. 4 sessões semanais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-semibold focus:outline-none focus:border-[#10B981] focus:bg-white"
            />
          </div>

          {/* Live Image Preview of the Receipt Card */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#0D2329] flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#10B981]" />
                Imagem do Comprovante Gerada:
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyImage}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#D8E5E7] hover:border-[#10B981] hover:text-[#10B981] font-bold text-[11px] text-[#0D2329] flex items-center gap-1 transition-all shadow-2xs"
                >
                  <Copy className="w-3 h-3" />
                  Copiar Imagem
                </button>

                <button
                  type="button"
                  onClick={handleDownloadImage}
                  className="px-2.5 py-1 rounded-lg bg-[#E8F8F5] border border-[#A7F3D0] hover:bg-[#D1FAE5] font-bold text-[11px] text-[#059669] flex items-center gap-1 transition-all shadow-2xs"
                >
                  <Download className="w-3 h-3" />
                  Baixar PNG
                </button>
              </div>
            </div>

            {imagePreviewUrl && (
              <div className="rounded-2xl border-2 border-[#D8E5E7] p-2 bg-[#F7FAFA] flex justify-center shadow-inner">
                <img
                  src={imagePreviewUrl}
                  alt="Comprovante de Pagamento"
                  className="rounded-xl max-h-56 object-contain shadow-md border border-[#E2E8F0]"
                />
              </div>
            )}
          </div>

          {/* Helpful instruction banner */}
          <div className="bg-gradient-to-r from-[#E8F8F5] to-[#ECFDF5] border border-[#A7F3D0] rounded-2xl p-3 text-xs text-[#065F46] flex items-start gap-2.5 leading-relaxed">
            <Sparkles className="w-4 h-4 shrink-0 text-[#10B981] mt-0.5" />
            <p>
              Ao clicar no botão <strong>Enviar no WhatsApp</strong>, o sistema <strong>copia a imagem automaticamente</strong> e abre a conversa. Basta apertar <strong>Ctrl + V</strong> para enviar o recibo!
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#EEF5F6] flex flex-col sm:flex-row items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#D8E5E7] text-[#6B7C83] font-bold hover:bg-[#F7FAFA] transition-colors text-xs"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleOnlyConfirm}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white border-2 border-[#D8E5E7] hover:border-[#10B981] hover:text-[#10B981] text-[#0D2329] font-black text-xs transition-all shadow-2xs active:scale-95"
          >
            {loading ? "Salvando..." : "Apenas Dar Baixa"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleConfirmAndSendWhatsApp}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Enviar no WhatsApp (Ctrl+V a foto)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
