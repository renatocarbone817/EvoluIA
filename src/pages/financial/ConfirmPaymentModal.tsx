import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import {
  MessageSquare,
  CheckCircle2,
  Download,
  Copy,
  Share2,
  ImageIcon,
  Sparkles,
  ExternalLink,
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

  // Re-generate receipt image whenever fields change
  useEffect(() => {
    if (open && record) {
      generateReceiptCanvas()
    }
  }, [open, record, paymentMethod, paymentDate, guardianName, notes, professional])

  if (!record) return null

  const childName = record.child?.full_name || "Paciente"
  const refMonth = MONTHS[record.month - 1]
  const refYear = record.year
  const amountFormatted = formatCurrency(record.amount)
  const profName = professional?.full_name || "Priscila Carbone"
  const clinicName = professional?.clinic_name || "EvoluIA — Gestão Psicopedagógica"
  const specialty = professional?.specialty || "Psicopedagogia Clínica"

  // Generates a crisp, retina graphic receipt card on canvas
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

    // 2. Header Banner (Petrol Gradient)
    const grad = ctx.createLinearGradient(0, 0, width, 220)
    grad.addColorStop(0, "#19323A")
    grad.addColorStop(1, "#245C6B")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, 220)

    // Header Accent Line (Mint)
    ctx.fillStyle = "#63C7B2"
    ctx.fillRect(0, 214, width, 6)

    // Clinic / Professional Name in Header
    ctx.fillStyle = "#FFFFFF"
    ctx.font = "bold 32px Inter, system-ui, sans-serif"
    ctx.fillText(clinicName, 50, 75)

    ctx.fillStyle = "#B8CBCF"
    ctx.font = "600 20px Inter, system-ui, sans-serif"
    ctx.fillText(`${profName} • ${specialty}`, 50, 115)

    // Badge "COMPROVANTE DE PAGAMENTO" in Header
    ctx.fillStyle = "rgba(99, 199, 178, 0.2)"
    ctx.strokeStyle = "#63C7B2"
    ctx.lineWidth = 2
    roundRect(ctx, 50, 145, 340, 42, 10, true, true)

    ctx.fillStyle = "#63C7B2"
    ctx.font = "bold 15px Inter, system-ui, sans-serif"
    ctx.fillText("✓ COMPROVANTE OFICIAL", 75, 172)

    // Date in Header top right
    ctx.fillStyle = "#B8CBCF"
    ctx.font = "600 16px Inter, system-ui, sans-serif"
    ctx.textAlign = "right"
    ctx.fillText(`Emissão: ${formatDate(paymentDate)}`, width - 50, 75)
    ctx.textAlign = "left"

    // 3. Amount Box (Huge highlight card)
    ctx.fillStyle = "#FFFFFF"
    ctx.strokeStyle = "#D8E5E7"
    ctx.lineWidth = 3
    roundRect(ctx, 50, 260, width - 100, 150, 20, true, true)

    ctx.fillStyle = "#6B7C83"
    ctx.font = "bold 14px Inter, system-ui, sans-serif"
    ctx.fillText("VALOR RECEBIDO", 80, 305)

    ctx.fillStyle = "#20836F"
    ctx.font = "900 48px Inter, system-ui, sans-serif"
    ctx.fillText(amountFormatted, 80, 365)

    // Pill: Status Pago
    ctx.fillStyle = "#E8F8F5"
    ctx.strokeStyle = "#63C7B2"
    ctx.lineWidth = 2
    roundRect(ctx, width - 230, 295, 150, 42, 12, true, true)

    ctx.fillStyle = "#20836F"
    ctx.font = "bold 16px Inter, system-ui, sans-serif"
    ctx.fillText("✓ PAGO", width - 185, 322)

    ctx.fillStyle = "#6B7C83"
    ctx.font = "600 15px Inter, system-ui, sans-serif"
    ctx.fillText(`Ref: ${refMonth} / ${refYear}`, width - 230, 365)

    // 4. Details List Box
    ctx.fillStyle = "#FFFFFF"
    ctx.strokeStyle = "#D8E5E7"
    ctx.lineWidth = 3
    roundRect(ctx, 50, 440, width - 100, 390, 20, true, true)

    const rows = [
      { label: "Paciente Atendido:", val: childName },
      { label: "Responsável Financeiro:", val: guardianName || "Responsável" },
      { label: "Mês de Referência:", val: `${refMonth} de ${refYear}` },
      { label: "Forma de Pagamento:", val: paymentMethod },
      { label: "Data da Quitação:", val: formatDate(paymentDate) },
      { label: "Observações:", val: notes || "Mensalidade / Atendimento psicopedagógico" },
    ]

    let yPos = 495
    rows.forEach((row, i) => {
      ctx.fillStyle = "#6B7C83"
      ctx.font = "bold 16px Inter, system-ui, sans-serif"
      ctx.fillText(row.label, 80, yPos)

      ctx.fillStyle = "#19323A"
      ctx.font = "bold 18px Inter, system-ui, sans-serif"
      ctx.textAlign = "right"
      ctx.fillText(row.val, width - 80, yPos)
      ctx.textAlign = "left"

      if (i < rows.length - 1) {
        ctx.strokeStyle = "#EEF5F6"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(80, yPos + 18)
        ctx.lineTo(width - 80, yPos + 18)
        ctx.stroke()
      }
      yPos += 58
    })

    // 5. Footer
    ctx.fillStyle = "#8DA3A8"
    ctx.font = "600 14px Inter, system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("🔒 Comprovante emitido via EvoluIA • Gestão Psicopedagógica", width / 2, 880)
    ctx.fillText("Obrigada pela confiança no desenvolvimento do seu filho!", width / 2, 910)
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
    toast.success("Comprovante em imagem baixado!")
  }

  async function handleCopyImage() {
    try {
      const blob = await getCanvasBlob()
      if (!blob) throw new Error("Erro ao gerar imagem")

      if (navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({ "image/png": blob }),
        ])
        toast.success("Imagem copiada! Agora basta dar Ctrl+V no WhatsApp!")
      } else {
        handleDownloadImage()
      }
    } catch (err) {
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

      // 2. Try native file sharing if available on Mobile
      const blob = await getCanvasBlob()
      const cleanPhone = guardianPhone.replace(/\D/g, "")

      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], "comprovante.png", { type: "image/png" })] })) {
        try {
          const file = new File([blob], `comprovante_${childName}.png`, { type: "image/png" })
          await navigator.share({
            title: `Comprovante de Pagamento - ${childName}`,
            text: `Olá, segue o comprovante de pagamento de ${childName} (${refMonth}/${refYear}).`,
            files: [file],
          })
          onSuccess()
          return
        } catch (e) {
          // Fallback to clipboard & WhatsApp web
        }
      }

      // 3. Desktop / Fallback flow:
      // Copy image to clipboard so user can press Ctrl+V directly on WhatsApp
      if (blob && navigator.clipboard && (window as any).ClipboardItem) {
        try {
          await navigator.clipboard.write([
            new (window as any).ClipboardItem({ "image/png": blob }),
          ])
          toast.success("Comprovante copiado! Dê Ctrl+V no WhatsApp para colar a imagem.")
        } catch (e) {
          handleDownloadImage()
        }
      } else {
        handleDownloadImage()
      }

      // Open WhatsApp conversation
      const receiptUrl = `${window.location.origin}/recibo/${record.id}`
      const captionText = `🧾 *COMPROVANTE DE PAGAMENTO*
*Clínica:* ${clinicName}
*Profissional:* ${profName}

Olá, *${guardianName}*! Confirmamos com sucesso o recebimento do pagamento referente ao paciente *${childName}* (${refMonth}/${refYear}).

💰 *Valor:* ${amountFormatted} • ${paymentMethod}
🗓️ *Data da Confirmação:* ${formatDate(paymentDate)}

🔗 *Acesse seu comprovante oficial e autenticado aqui:*
${receiptUrl}

Agradecemos a parceria e a confiança no desenvolvimento do seu filho! ✨`

      const waUrl = cleanPhone
        ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(captionText)}`
        : `https://wa.me/?text=${encodeURIComponent(captionText)}`

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
      toast.success(`Pagamento de ${childName} confirmado no sistema!`)
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        {/* Hidden canvas used to render the retina receipt image */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <DialogHeader>
          <div className="flex items-center gap-2 text-[#20836F]">
            <CheckCircle2 className="w-5 h-5" />
            <DialogTitle>Confirmar Pagamento & Gerar Imagem do Recibo</DialogTitle>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
          {/* Form Fields */}
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

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nome do Responsável"
              placeholder="Ex: Mariana Silva"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
            />

            <Input
              label="WhatsApp do Responsável"
              placeholder="Ex: 11999999999"
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
            />
          </div>

          <Input
            label="Detalhes / Observações (Vai na imagem do comprovante)"
            placeholder="Ex: Ref. 4 sessões semanais..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* Live Image Preview of the Receipt Card */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wider text-[#19323A] flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#20836F]" />
                Imagem do Comprovante Gerada (Alta Definição):
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyImage}
                  className="text-[11px] font-bold text-[#245C6B] hover:underline flex items-center gap-1"
                  title="Copiar imagem para colar no WhatsApp"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  className="text-[11px] font-bold text-[#20836F] hover:underline flex items-center gap-1"
                  title="Baixar imagem PNG"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar PNG
                </button>
              </div>
            </div>

            {imagePreviewUrl && (
              <div className="rounded-2xl border-2 border-[#D8E5E7] p-2 bg-[#EEF5F6]/40 flex justify-center shadow-inner">
                <img
                  src={imagePreviewUrl}
                  alt="Comprovante de Pagamento"
                  className="rounded-xl max-h-64 object-contain shadow-md border border-[#D8E5E7]"
                />
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancelar
          </Button>

          <Button
            variant="outline"
            loading={loading}
            onClick={handleOnlyConfirm}
            className="w-full sm:w-auto font-bold border-2"
          >
            Apenas Dar Baixa
          </Button>

          <Button
            loading={loading}
            onClick={handleConfirmAndSendWhatsApp}
            className="w-full sm:w-auto bg-[#20836F] hover:bg-[#186857] text-white gap-2 font-black shadow-[0_4px_0_0_#145245]"
          >
            <MessageSquare className="w-4 h-4 fill-current" />
            Enviar Imagem no WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
