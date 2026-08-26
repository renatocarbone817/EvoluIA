import { useEffect, useState, useRef } from "react"
import { useParams, Link } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import {
  CheckCircle2,
  Download,
  Printer,
  Share2,
  Calendar,
  User,
  DollarSign,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { formatCurrency, formatDate } from "@/lib/utils"
import toast from "react-hot-toast"

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

export function PublicReceiptPage() {
  const { id } = useParams<{ id: string }>()
  const [record, setRecord] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (id) loadReceipt()
  }, [id])

  async function loadReceipt() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("financial_records")
        .select(`
          *,
          child:children(
            id,
            full_name,
            guardians:guardian_children(
              relationship,
              is_primary,
              guardian:guardians(id, full_name, phone, whatsapp)
            )
          ),
          professional:professionals(
            id,
            full_name,
            clinic_name,
            specialty,
            crp,
            phone,
            email,
            avatar_url
          )
        `)
        .eq("id", id)
        .single()

      if (error) throw error
      setRecord(data)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7FAFA] flex items-center justify-center p-4">
        <div className="space-y-4 text-center max-w-sm w-full">
          <div className="w-16 h-16 border-4 border-[#245C6B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-black text-sm text-[#19323A]">Carregando comprovante oficial...</p>
        </div>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-[#F7FAFA] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border-2 border-[#D8E5E7] text-center max-w-md w-full shadow-lg space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#FDF0F0] text-[#D96C6C] flex items-center justify-center mx-auto border-2 border-[#D96C6C]/40">
            <CheckCircle2 className="w-8 h-8 rotate-180" />
          </div>
          <h2 className="text-xl font-black text-[#19323A]">Comprovante não encontrado</h2>
          <p className="text-xs text-[#6B7C83]">
            Este link pode estar incorreto ou o lançamento foi removido.
          </p>
        </div>
      </div>
    )
  }

  const childName = record.child?.full_name || "Paciente"
  const primaryGuardian = record.child?.guardians?.[0]?.guardian
  const guardianName = primaryGuardian?.full_name || "Responsável"
  const refMonth = MONTHS[record.month - 1]
  const refYear = record.year
  const amountFormatted = formatCurrency(record.amount)
  const profName = record.professional?.full_name || "Priscila Carbone"
  const clinicName = record.professional?.clinic_name || "EvoluIA — Gestão Psicopedagógica"
  const specialty = record.professional?.specialty || "Psicopedagoga Clínica"
  const crp = record.professional?.crp || ""
  const paymentDate = record.payment_date || record.created_at

  function handlePrint() {
    window.print()
  }

  function handleDownloadImage() {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = 800
    const height = 980
    canvas.width = width
    canvas.height = height

    // Background
    ctx.fillStyle = "#F7FAFA"
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = "#D8E5E7"
    ctx.lineWidth = 6
    ctx.strokeRect(3, 3, width - 6, height - 6)

    // Header
    const grad = ctx.createLinearGradient(0, 0, width, 220)
    grad.addColorStop(0, "#19323A")
    grad.addColorStop(1, "#245C6B")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, 220)

    ctx.fillStyle = "#63C7B2"
    ctx.fillRect(0, 214, width, 6)

    ctx.fillStyle = "#FFFFFF"
    ctx.font = "bold 32px Inter, system-ui, sans-serif"
    ctx.fillText(clinicName, 50, 75)

    ctx.fillStyle = "#B8CBCF"
    ctx.font = "600 20px Inter, system-ui, sans-serif"
    ctx.fillText(`${profName} • ${specialty} ${crp ? `(CRP: ${crp})` : ""}`, 50, 115)

    ctx.fillStyle = "rgba(99, 199, 178, 0.2)"
    ctx.strokeStyle = "#63C7B2"
    ctx.lineWidth = 2
    roundRect(ctx, 50, 145, 340, 42, 10, true, true)

    ctx.fillStyle = "#63C7B2"
    ctx.font = "bold 15px Inter, system-ui, sans-serif"
    ctx.fillText("✓ COMPROVANTE OFICIAL", 75, 172)

    // Amount Box
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

    // Details List Box
    ctx.fillStyle = "#FFFFFF"
    ctx.strokeStyle = "#D8E5E7"
    ctx.lineWidth = 3
    roundRect(ctx, 50, 440, width - 100, 390, 20, true, true)

    const rows = [
      { label: "Paciente Atendido:", val: childName },
      { label: "Responsável Financeiro:", val: guardianName },
      { label: "Mês de Referência:", val: `${refMonth} de ${refYear}` },
      { label: "Forma de Pagamento:", val: "PIX / Transferência" },
      { label: "Data da Quitação:", val: formatDate(paymentDate) },
      { label: "Observações:", val: record.notes || "Mensalidade / Atendimento psicopedagógico" },
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

    // Footer
    ctx.fillStyle = "#8DA3A8"
    ctx.font = "600 14px Inter, system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("🔒 Comprovante emitido via EvoluIA • Gestão Psicopedagógica", width / 2, 880)
    ctx.fillText("Obrigada pela confiança no desenvolvimento do seu filho!", width / 2, 910)
    ctx.textAlign = "left"

    const dataUrl = canvas.toDataURL("image/png")
    const link = document.createElement("a")
    link.download = `comprovante_${childName.replace(/\s+/g, "_")}_${refMonth}_${refYear}.png`
    link.href = dataUrl
    link.click()
    toast.success("Comprovante em imagem baixado!")
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

  return (
    <div className="min-h-screen bg-[#F7FAFA] py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top Actions Bar (Hidden on print) */}
        <div className="flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#245C6B] bg-white px-3 py-1.5 rounded-xl border-2 border-[#D8E5E7] flex items-center gap-1.5 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-[#20836F]" />
              Documento Oficial Autenticado
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadImage}
              className="gap-1.5 text-xs font-bold bg-white border-2"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar Imagem
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs font-black bg-[#245C6B] hover:bg-[#19323A] text-white"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / PDF
            </Button>
          </div>
        </div>

        {/* The Official Receipt Paper Card */}
        <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] shadow-xl overflow-hidden print:border-none print:shadow-none">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#19323A] to-[#245C6B] text-white p-6 sm:p-8 space-y-3 relative overflow-hidden">
            <div className="flex items-start justify-between gap-4 relative z-10">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-[#63C7B2]/20 border border-[#63C7B2]/40 text-[#63C7B2] px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2">
                  <Sparkles className="w-3 h-3" />
                  Comprovante de Pagamento
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{clinicName}</h1>
                <p className="text-sm font-semibold text-[#B8CBCF] mt-0.5">
                  {profName} • {specialty} {crp && `• CRP: ${crp}`}
                </p>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-white shrink-0">
                <CheckCircle2 className="w-8 h-8 text-[#63C7B2]" />
              </div>
            </div>

            <div className="h-1.5 w-full bg-[#63C7B2] rounded-full mt-4" />
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Amount Banner */}
            <div className="p-5 rounded-2xl bg-[#E8F8F5] border-2 border-[#63C7B2]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase text-[#20836F]">Valor Total Recebido</p>
                <p className="text-3xl sm:text-4xl font-black text-[#14282F] tracking-tight">
                  {amountFormatted}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="inline-flex items-center gap-1.5 bg-[#20836F] text-white px-3.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider shadow-xs">
                  ✓ Quitado / Pago
                </span>
                <p className="text-xs font-bold text-[#6B7C83] mt-1.5">
                  Referência: <strong>{refMonth} / {refYear}</strong>
                </p>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="rounded-2xl border-2 border-[#D8E5E7] p-5 space-y-3.5 bg-[#F7FAFA]">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#19323A] border-b border-[#D8E5E7] pb-2">
                Discriminação do Atendimento
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[#6B7C83] font-bold uppercase text-[10px]">Paciente</p>
                  <p className="font-black text-sm text-[#19323A]">{childName}</p>
                </div>

                <div>
                  <p className="text-[#6B7C83] font-bold uppercase text-[10px]">Responsável Financeiro</p>
                  <p className="font-black text-sm text-[#19323A]">{guardianName}</p>
                </div>

                <div>
                  <p className="text-[#6B7C83] font-bold uppercase text-[10px]">Data do Pagamento</p>
                  <p className="font-bold text-[#19323A]">{formatDate(paymentDate)}</p>
                </div>

                <div>
                  <p className="text-[#6B7C83] font-bold uppercase text-[10px]">Forma de Quitação</p>
                  <p className="font-bold text-[#19323A]">PIX / Transferência</p>
                </div>
              </div>

              {record.notes && (
                <div className="pt-2 border-t border-[#D8E5E7]">
                  <p className="text-[#6B7C83] font-bold uppercase text-[10px]">Observações / Detalhes</p>
                  <p className="text-xs font-semibold text-[#19323A] italic mt-0.5">
                    "{record.notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Authenticity & Stamp */}
            <div className="pt-4 border-t-2 border-[#EEF5F6] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div>
                <p className="text-xs font-black text-[#19323A]">
                  Autenticação Digital: #EVOLUIA-{record.id.substring(0, 8).toUpperCase()}
                </p>
                <p className="text-[11px] text-[#6B7C83] mt-0.5">
                  Emitido digitalmente pelo consultório de {profName}.
                </p>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-[#EEF5F6] border border-[#D8E5E7] text-[10px] font-extrabold uppercase text-[#245C6B]">
                🔒 Documento Válido
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs font-medium text-[#8DA3A8] print:hidden">
          Sistema de Gestão Clínica EvoluIA • Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}
