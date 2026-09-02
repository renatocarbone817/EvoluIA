import { useState, useEffect, useRef } from "react"
import { QRCodeSVG } from "qrcode.react"
import {
  Paperclip,
  Smartphone,
  Upload,
  FileText,
  Trash2,
  ExternalLink,
  X,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  ImageIcon,
  Wifi,
  AlertTriangle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"

export interface AttachmentItem {
  id: string
  file_name: string
  file_url: string
  file_type?: string
  file_size?: number
  created_at?: string
}

interface SessionAttachmentsManagerProps {
  childId: string
  childName?: string
  professionalId?: string
  attachments: AttachmentItem[]
  onChange: (attachments: AttachmentItem[]) => void
  category?: "atividades" | "testes" | "avaliacao_inicial" | "outros"
  title?: string
  description?: string
}

export function SessionAttachmentsManager({
  childId,
  childName = "Paciente",
  professionalId = "",
  attachments = [],
  onChange,
  category = "atividades",
  title = "Anexos & Fotos da Sessão",
  description = "Anexe fotos de atividades feitas na mesa, folhas de testes preenchidas à mão ou PDFs de outros sites.",
}: SessionAttachmentsManagerProps) {
  const [uploading, setUploading] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [uploadChannelId, setUploadChannelId] = useState<string>("")
  const [copiedLink, setCopiedLink] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [receivedFromPhone, setReceivedFromPhone] = useState<AttachmentItem[]>([])
  const [customHost, setCustomHost] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Referência sempre atualizada para evitar closures antigas
  const attachmentsRef = useRef(attachments)
  attachmentsRef.current = attachments

  // Failsafe: se algum modal anterior deixou o body bloqueado com pointer-events: none, restaura imediatamente
  useEffect(() => {
    if (document.body.style.pointerEvents === "none") {
      document.body.style.pointerEvents = "auto"
    }
  }, [])

  // Detecta se está rodando localmente (localhost ou 127.0.0.1)
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")

  // Gera um uploadId único sempre que abrir o modal de QR code
  const openQrModal = () => {
    // Garante que o body não esteja travado
    document.body.style.pointerEvents = "auto"
    const safeChildId = (childId || "avulso").substring(0, 8)
    const newId = `${safeChildId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    setUploadChannelId(newId)
    setReceivedFromPhone([])
    setShowQrModal(true)
  }

  const closeQrModal = () => {
    document.body.style.pointerEvents = "auto"
    setShowQrModal(false)
  }

  // Escuta via Supabase Realtime quando a foto for enviada pelo celular
  useEffect(() => {
    if (!showQrModal || !uploadChannelId) return

    const channelName = `photo_upload_${uploadChannelId}`
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    })

    channel
      .on("broadcast", { event: "photo_uploaded" }, async (payload) => {
        try {
          const item = payload?.payload?.attachment
          if (!item) return

          let finalAttachment: AttachmentItem = item

          // Se a foto veio como Base64 (fallback para quando o celular não tem login/permissão de storage),
          // o próprio Desktop (que está logado!) faz o upload e salva com credenciais válidas!
          if (item.base64_data && item.base64_data.startsWith("data:")) {
            try {
              const res = await fetch(item.base64_data)
              const blob = await res.blob()
              const ext = item.file_type || "jpg"
              const fileName = `${Date.now()}_mobile_${item.file_name || "foto.jpg"}`
              const filePath = `${professionalId || "geral"}/${childId || "avulso"}/${fileName}`

              const { error: uploadErr } = await supabase.storage
                .from("child-documents")
                .upload(filePath, blob, { upsert: true })

              if (!uploadErr) {
                const { data: pubData } = supabase.storage
                  .from("child-documents")
                  .getPublicUrl(filePath)
                finalAttachment = {
                  id: `att_${Date.now()}`,
                  file_name: item.file_name || fileName,
                  file_url: pubData.publicUrl,
                  file_type: ext,
                  file_size: blob.size,
                  created_at: new Date().toISOString(),
                }
              }
            } catch (err) {
              console.warn("Aviso ao processar base64:", err)
            }
          }

          setReceivedFromPhone((prev) => [...prev, finalAttachment])
          const nextList = [...attachmentsRef.current, finalAttachment]
          attachmentsRef.current = nextList
          onChange(nextList)
          toast.success("Foto recebida do celular! 📸✨")
        } catch (err) {
          console.error("Erro ao receber broadcast:", err)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showQrModal, uploadChannelId, childId, professionalId, onChange])

  // Upload direto pelo computador / navegador
  async function handleDirectUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const newItems: AttachmentItem[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const ext = file.name.split(".").pop()?.toLowerCase() || ""
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
        const fileName = `${Date.now()}_${cleanName}`
        const filePath = `${professionalId || "geral"}/${childId || "avulso"}/${fileName}`

        // Upload no Storage
        const { error: storageError } = await supabase.storage
          .from("child-documents")
          .upload(filePath, file, { upsert: true })

        if (storageError) {
          console.warn("Erro no storage:", storageError)
        }

        const { data: publicUrlData } = supabase.storage
          .from("child-documents")
          .getPublicUrl(filePath)

        const fileUrl = publicUrlData.publicUrl

        // Salvar na tabela documents se o profissional existir
        let docId = `att_${Date.now()}_${i}`
        if (professionalId && childId) {
          try {
            const { data: docData } = await supabase
              .from("documents")
              .insert({
                professional_id: professionalId,
                child_id: childId,
                file_name: file.name,
                file_url: fileUrl,
                file_type: ext,
                file_size: file.size,
                category,
              })
              .select()
              .single()

            if (docData?.id) docId = docData.id
          } catch (docErr) {
            console.warn("Aviso ao registrar em documents:", docErr)
          }
        }

        newItems.push({
          id: docId,
          file_name: file.name,
          file_url: fileUrl,
          file_type: ext,
          file_size: file.size,
          created_at: new Date().toISOString(),
        })
      }

      const updated = [...attachments, ...newItems]
      attachmentsRef.current = updated
      onChange(updated)
      toast.success(
        newItems.length === 1
          ? "Arquivo anexado com sucesso!"
          : `${newItems.length} arquivos anexados!`
      )
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Erro ao fazer upload do arquivo.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function handleRemoveAttachment(id: string) {
    const filtered = attachments.filter((a) => a.id !== id)
    attachmentsRef.current = filtered
    onChange(filtered)
    toast.success("Anexo removido desta sessão.")
  }

  // Define a base da URL (se em localhost, permite usar o IP da rede local para o celular conseguir abrir)
  const baseOrigin = customHost
    ? `http://${customHost}`
    : isLocalhost
    ? `http://192.168.1.33:5173`
    : window.location.origin

  const mobileCaptureUrl = uploadChannelId
    ? `${baseOrigin}/captura/${uploadChannelId}?childId=${childId || ""}&childName=${encodeURIComponent(
        childName || ""
      )}&profId=${professionalId || ""}&category=${category}`
    : ""

  const handleCopyLink = () => {
    navigator.clipboard.writeText(mobileCaptureUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
    toast.success("Link copiado! Você pode abrir no celular.")
  }

  return (
    <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#EDE9FE] border border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center shrink-0">
            <Paperclip className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#0D2329] flex items-center gap-2">
              <span>{title}</span>
              {attachments.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE] text-[10px] font-bold">
                  {attachments.length}
                </span>
              )}
            </h3>
            <p className="text-xs font-semibold text-[#6B7C83]">{description}</p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Input oculto de arquivo com seleção múltipla */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleDirectUpload}
            className="hidden"
          />

          {/* Botão de upload no PC */}
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-10 px-3.5 sm:px-4 rounded-2xl bg-[#F7FAFA] hover:bg-[#EEF5F6] border-2 border-[#D8E5E7] text-[#0D2329] font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>{uploading ? "Enviando..." : "Anexar Arquivo ou Foto"}</span>
          </button>

          {/* Botão de QR Code para celular */}
          <button
            type="button"
            onClick={openQrModal}
            className="h-10 px-3.5 sm:px-4 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white font-black text-xs flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Tirar Foto com Celular</span>
          </button>
        </div>
      </div>

      {/* Lista de Anexos */}
      {attachments.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
          {attachments.map((item) => {
            const isImage =
              item.file_type &&
              ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(
                item.file_type.toLowerCase()
              )
            const isPdf = item.file_type?.toLowerCase() === "pdf"

            return (
              <div
                key={item.id}
                className="group relative rounded-2xl border-2 border-[#EEF5F6] hover:border-[#7C3AED]/40 bg-[#F8FAFB] overflow-hidden transition-all flex flex-col justify-between"
              >
                {/* Visualização Thumbnail */}
                {isImage ? (
                  <div
                    onClick={() => setPreviewImage(item.file_url)}
                    className="h-24 w-full bg-[#E5E7EB] relative cursor-pointer overflow-hidden flex items-center justify-center"
                  >
                    <img
                      src={item.file_url}
                      alt={item.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>
                ) : (
                  <a
                    href={item.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="h-24 w-full bg-[#EDE9FE]/50 text-[#7C3AED] flex flex-col items-center justify-center gap-1.5 p-2 hover:bg-[#EDE9FE] transition-colors cursor-pointer"
                  >
                    <FileText className="w-7 h-7" />
                    <span className="text-[10px] font-black uppercase tracking-wider bg-white px-2 py-0.5 rounded-md border border-[#DDD6FE]">
                      {isPdf ? "PDF" : item.file_type || "ARQUIVO"}
                    </span>
                  </a>
                )}

                {/* Nome do Arquivo e Ações */}
                <div className="p-2 flex items-center justify-between gap-1 bg-white">
                  <span
                    className="text-[11px] font-bold text-[#0D2329] truncate flex-1"
                    title={item.file_name}
                  >
                    {item.file_name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(item.id)}
                    className="p-1 rounded-lg text-[#8CAAB1] hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                    title="Remover anexo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-5 rounded-2xl border border-dashed border-[#D8E5E7] bg-[#F8FAFB] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#D8E5E7] text-[#8CAAB1] flex items-center justify-center shrink-0">
              <ImageIcon className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-[#8CAAB1]">
              Nenhuma foto ou documento anexado ainda nesta sessão.
            </p>
          </div>
          <div className="text-[11px] font-bold text-[#7C3AED] flex items-center gap-1 bg-[#EDE9FE]/60 px-3 py-1 rounded-xl">
            <Sparkles className="w-3 h-3" />
            <span>Use o QR Code para fotografar com o celular</span>
          </div>
        </div>
      )}

      {/* ── MODAL NATIVO: QR CODE (Sem dependência do Radix para evitar travamentos de ponteiro) ── */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeQrModal()
          }}
        >
          <div className="relative w-full max-w-md bg-white rounded-3xl border-2 border-[#D8E5E7] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            {/* Header do Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EEF5F6]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h4 className="text-base font-black text-[#0D2329]">
                  Tirar Foto com o Celular
                </h4>
              </div>
              <button
                type="button"
                onClick={closeQrModal}
                className="w-8 h-8 rounded-xl bg-[#F7FAFA] hover:bg-[#EEF5F6] text-[#6B7C83] hover:text-[#0D2329] flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explicação */}
            <div className="text-center space-y-3">
              <p className="text-xs font-semibold text-[#6B7C83] leading-relaxed">
                Aponte a câmera do celular para o QR Code abaixo. As fotos que você tirar cairão diretamente nesta tela!
              </p>

              {/* QR Code */}
              <div className="inline-block p-4 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-inner mx-auto">
                <QRCodeSVG
                  value={mobileCaptureUrl}
                  size={210}
                  level="M"
                  includeMargin={false}
                />
              </div>

              {/* Dica de IP se estiver em localhost */}
              {isLocalhost && (
                <div className="p-2.5 rounded-xl bg-[#FEF8EC] border border-[#FDE68A] text-left text-[11px] text-[#B8871E] flex items-start gap-2">
                  <Wifi className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Dica de Rede Wi-Fi:</span> O QR Code está apontando para o seu IP local (<strong>{baseOrigin.replace("http://", "")}</strong>). O celular precisa estar no mesmo Wi-Fi do computador.
                  </div>
                </div>
              )}

              {/* Contador de fotos recebidas */}
              {receivedFromPhone.length > 0 ? (
                <div className="p-3 bg-[#E8F8F5] border-2 border-[#A7F3D0] rounded-2xl space-y-2 text-left animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-black text-[#065F46]">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                      <span>{receivedFromPhone.length} foto(s) recebida(s) agora!</span>
                    </span>
                    <span className="text-[10px] font-bold text-[#059669] bg-white px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                      Ao vivo
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {receivedFromPhone.map((p, idx) => (
                      <img
                        key={p.id || idx}
                        src={p.file_url}
                        alt={p.file_name}
                        className="w-12 h-12 rounded-xl object-cover border border-[#A7F3D0] shrink-0 bg-white"
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF8EC] border border-[#FDE68A] text-[#B8871E] text-xs font-bold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                  Aguardando envio do celular...
                </div>
              )}

              {/* Botões do Modal */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={closeQrModal}
                  className="w-full h-11 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {receivedFromPhone.length > 0 ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Concluir e Fechar ({receivedFromPhone.length} fotos salvas)</span>
                    </>
                  ) : (
                    <span>Fechar Janela</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="text-xs font-bold text-[#7C3AED] hover:underline inline-flex items-center justify-center gap-1 cursor-pointer pt-1"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Link copiado!" : "Copiar link de captura"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL NATIVO: PREVIEW DE IMAGEM ── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl p-2">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer z-10"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewImage}
              alt="Visualização do anexo"
              className="w-full h-full max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}
