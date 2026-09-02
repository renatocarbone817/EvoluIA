import { useState, useRef, useEffect } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import {
  Camera,
  CheckCircle2,
  Upload,
  RefreshCw,
  Sparkles,
  Smartphone,
  Send,
  Plus,
  ImageIcon,
  Check,
  Trash2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { AttachmentItem } from "@/components/attachments/SessionAttachmentsManager"

interface QueuedPhoto {
  id: string
  file: File
  previewUrl: string
}

// Comprime a foto no navegador do celular para ~150KB (mantendo nitidez perfeita para leitura)
async function compressImage(file: File, maxWidth = 1280, quality = 0.75): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxWidth) {
            width = Math.round((width * maxWidth) / height)
            height = maxWidth
          }
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          return reject(new Error("Canvas context error"))
        }

        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL("image/jpeg", quality)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl })
            } else {
              reject(new Error("Erro na compressão"))
            }
          },
          "image/jpeg",
          quality
        )
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function MobilePhotoCapturePage() {
  const { uploadId } = useParams<{ uploadId: string }>()
  const [searchParams] = useSearchParams()

  const childId = searchParams.get("childId") || ""
  const childName = searchParams.get("childName") || "Paciente"
  const profId = searchParams.get("profId") || ""
  const category = (searchParams.get("category") as any) || "atividades"

  // Fila de fotos a enviar
  const [queuedPhotos, setQueuedPhotos] = useState<QueuedPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  })
  const [sentItems, setSentItems] = useState<AttachmentItem[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isFinished, setIsFinished] = useState(false)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const channelRef = useRef<any>(null)

  // Canal Realtime ativo
  useEffect(() => {
    if (!uploadId) return

    const ch = supabase.channel(`photo_upload_${uploadId}`, {
      config: { broadcast: { self: false } },
    })
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("Canal Realtime conectado no celular:", uploadId)
      }
    })
    channelRef.current = ch

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      queuedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    }
  }, [uploadId])

  // Adiciona fotos à fila (sem apagar as anteriores)
  function handleAppendPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newEntries: QueuedPhoto[] = Array.from(files).map((file, i) => ({
      id: `queue_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    setQueuedPhotos((prev) => [...prev, ...newEntries])
    setErrorMsg(null)
    setIsFinished(false)

    // Limpa os inputs para permitir nova seleção
    if (cameraInputRef.current) cameraInputRef.current.value = ""
    if (galleryInputRef.current) galleryInputRef.current.value = ""
  }

  // Remove uma foto específica da fila
  function handleRemoveFromQueue(id: string) {
    setQueuedPhotos((prev) => {
      const item = prev.find((p) => p.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((p) => p.id !== id)
    })
  }

  // Envia todas as fotos da fila para o computador
  async function handleSendAllToDesktop() {
    if (queuedPhotos.length === 0 || !uploadId) return

    setUploading(true)
    setErrorMsg(null)
    setUploadProgress({ current: 0, total: queuedPhotos.length })

    try {
      const newlySent: AttachmentItem[] = []

      for (let i = 0; i < queuedPhotos.length; i++) {
        setUploadProgress({ current: i + 1, total: queuedPhotos.length })
        const item = queuedPhotos[i]
        const originalFile = item.file

        // 1. Comprime a foto para upload ultrarrápido (~150KB)
        let compressedBlob = originalFile as Blob
        let base64Data = ""
        try {
          const comp = await compressImage(originalFile)
          compressedBlob = comp.blob
          base64Data = comp.dataUrl
        } catch (compErr) {
          console.warn("Compressão fallback:", compErr)
        }

        const ext = "jpg"
        const cleanName = originalFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")
        const fileName = `${Date.now()}_mobile_${i}_${cleanName}`
        const filePath = `${profId || "geral"}/${childId || "avulso"}/${fileName}`

        let fileUrl = ""

        // 2. Tenta fazer o upload direto no Supabase Storage se permitido
        try {
          const { error: storageError } = await supabase.storage
            .from("child-documents")
            .upload(filePath, compressedBlob, { upsert: true })

          if (!storageError) {
            const { data: publicUrlData } = supabase.storage
              .from("child-documents")
              .getPublicUrl(filePath)
            fileUrl = publicUrlData?.publicUrl || ""
          }
        } catch (uploadErr) {
          console.warn("Storage upload fallback:", uploadErr)
        }

        // Se não conseguiu URL do storage, usa a base64Data para o Desktop autenticado salvar!
        const payloadAttachment: any = {
          id: `att_${Date.now()}_${i}`,
          file_name: originalFile.name || `foto_folha_${i + 1}.jpg`,
          file_url: fileUrl || base64Data,
          file_type: ext,
          file_size: compressedBlob.size,
          base64_data: base64Data,
          created_at: new Date().toISOString(),
        }

        // 3. Dispara transmissão Realtime para a tela do computador
        if (channelRef.current) {
          await channelRef.current.send({
            type: "broadcast",
            event: "photo_uploaded",
            payload: { attachment: payloadAttachment },
          })
        }

        newlySent.push(payloadAttachment)
      }

      // Adiciona aos itens enviados com sucesso
      setSentItems((prev) => [...prev, ...newlySent])

      // Limpa a fila
      queuedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      setQueuedPhotos([])
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "Erro ao enviar fotos para o computador.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0D2329] flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto">
      {/* Input Oculto 1: Câmera Nativa */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleAppendPhotos}
        className="hidden"
      />

      {/* Input Oculto 2: Galeria Múltipla */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleAppendPhotos}
        className="hidden"
      />

      {/* Header */}
      <header className="space-y-2 text-center pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE] text-xs font-black">
          <Smartphone className="w-3.5 h-3.5" />
          <span>EvoluIA · Captura de Atividades</span>
        </div>

        <div>
          <h1 className="text-xl font-black text-[#0D2329] tracking-tight">
            Anexar Folhas & Fotos
          </h1>
          <p className="text-xs font-bold text-[#6B7C83] mt-0.5">
            Aluno(a): <span className="text-[#7C3AED] font-black">{childName}</span>
          </p>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="my-auto py-4 space-y-4">
        {/* Caso o usuário tenha clicado em "Concluir Envio" */}
        {isFinished ? (
          <div className="p-6 rounded-3xl bg-[#E8F8F5] border-2 border-[#A7F3D0] text-center space-y-3 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-[#10B981] text-white flex items-center justify-center mx-auto shadow-sm">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#065F46]">
                Envio finalizado com sucesso! 🎉
              </h3>
              <p className="text-xs font-semibold text-[#065F46]/80 mt-1">
                Todas as <strong>{sentItems.length} fotos</strong> foram transferidas e já estão salvas na tela do seu computador.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFinished(false)}
              className="mt-2 text-xs font-black text-[#7C3AED] underline cursor-pointer"
            >
              + Fotografar mais alguma folha?
            </button>
          </div>
        ) : queuedPhotos.length > 0 ? (
          /* HÁ FOTOS NA FILA AGUARDANDO ENVIO */
          <div className="space-y-4 animate-in fade-in">
            {/* Header da Fila */}
            <div className="p-3.5 rounded-2xl bg-[#EDE9FE] border-2 border-[#DDD6FE] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center text-xs font-black">
                  {queuedPhotos.length}
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#5B21B6]">
                    {queuedPhotos.length === 1 ? "1 foto na fila" : `${queuedPhotos.length} fotos na fila`}
                  </h4>
                  <p className="text-[10px] font-semibold text-[#7C3AED]">
                    Prontas para enviar de uma vez só!
                  </p>
                </div>
              </div>

              {/* Botão de limpar tudo */}
              <button
                type="button"
                onClick={() => {
                  queuedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
                  setQueuedPhotos([])
                }}
                className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
              >
                Limpar todas
              </button>
            </div>

            {/* Grid com as miniaturas das fotos capturadas na sequência */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[45vh] overflow-y-auto p-1">
              {queuedPhotos.map((item, idx) => (
                <div
                  key={item.id}
                  className="relative rounded-2xl overflow-hidden border-2 border-[#7C3AED]/50 bg-black aspect-3/4 flex items-center justify-center group shadow-sm"
                >
                  <img
                    src={item.previewUrl}
                    alt={`Folha ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Badge da Folha */}
                  <div className="absolute top-2 left-2 bg-black/75 text-white px-2 py-0.5 rounded-md text-[10px] font-black">
                    Folha #{idx + 1}
                  </div>
                  {/* Botão de Remover Foto Individual */}
                  <button
                    type="button"
                    onClick={() => handleRemoveFromQueue(item.id)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
                    title="Remover esta foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Botões para CONTINUAR ADICIONANDO MAIS FOTOS NA FILA */}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 h-11 rounded-2xl border-2 border-[#7C3AED]/40 hover:border-[#7C3AED] bg-white text-[#7C3AED] font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                <span>+ Tirar Folha #{queuedPhotos.length + 1}</span>
              </button>

              <button
                type="button"
                disabled={uploading}
                onClick={() => galleryInputRef.current?.click()}
                className="h-11 px-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-[#0D2329] font-black text-xs flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                title="Adicionar mais fotos da galeria"
              >
                <ImageIcon className="w-4 h-4 text-[#8CAAB1]" />
                <span>+ Galeria</span>
              </button>
            </div>

            {/* BOTÃO PRINCIPAL: ENVIAR TODAS DE UMA VEZ */}
            <button
              type="button"
              disabled={uploading}
              onClick={handleSendAllToDesktop}
              className="w-full h-13 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>
                    Enviando foto {uploadProgress.current} de {uploadProgress.total}...
                  </span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    Enviar Todas as {queuedPhotos.length} {queuedPhotos.length === 1 ? "Foto" : "Fotos"} para o PC
                  </span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* FILA VAZIA: OPÇÕES PARA DISPARAR CÂMERA OU ESCOLHER GALERIA */
          <div className="space-y-4">
            {/* Se já tiver enviado fotos antes nesta mesma sessão */}
            {sentItems.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-[#E8F8F5] border-2 border-[#A7F3D0] space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-[#065F46]">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span>{sentItems.length} foto(s) já enviada(s) para o PC!</span>
                  </span>
                  <span className="text-[10px] text-[#059669] font-bold">Salvas</span>
                </div>
                <div className="flex gap-2 overflow-x-auto py-1">
                  {sentItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="w-12 h-12 rounded-xl overflow-hidden border border-[#A7F3D0] shrink-0 bg-white"
                    >
                      <img
                        src={item.file_url}
                        alt={item.file_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OPÇÃO 1: TIRAR FOTOS COM A CÂMERA (SEQUENCIAL) */}
            <div
              onClick={() => cameraInputRef.current?.click()}
              className="p-6 rounded-3xl border-2 border-dashed border-[#7C3AED]/40 hover:border-[#7C3AED] bg-white hover:bg-[#EDE9FE]/20 transition-all cursor-pointer shadow-sm flex flex-col items-center justify-center gap-3 py-8"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#6366F1] text-white flex items-center justify-center shadow-md active:scale-90 transition-transform">
                <Camera className="w-8 h-8" />
              </div>
              <div className="space-y-1 text-center">
                <h3 className="text-sm font-black text-[#0D2329]">
                  {sentItems.length > 0 ? "📷 Fotografar Mais Folhas" : "📷 Tirar Fotos com a Câmera"}
                </h3>
                <p className="text-[11px] font-semibold text-[#6B7C83]">
                  Bata foto da Folha 1, depois Folha 2... e envie todas juntas!
                </p>
              </div>
            </div>

            {/* OPÇÃO 2: SELECIONAR VÁRIAS FOTOS DA GALERIA DE UMA VEZ */}
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="w-full h-12 rounded-2xl border-2 border-[#D8E5E7] bg-white hover:bg-[#F8FAFB] text-[#0D2329] font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-2xs"
            >
              <ImageIcon className="w-4 h-4 text-[#7C3AED]" />
              <span>🖼️ Escolher Várias Fotos da Galeria de Uma Vez</span>
            </button>

            {/* BOTÃO FINALIZAR SE JÁ ENVIOU ALGUMA */}
            {sentItems.length > 0 && (
              <button
                type="button"
                onClick={() => setIsFinished(true)}
                className="w-full h-11 rounded-2xl bg-[#065F46] hover:bg-[#047857] text-white font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Pronto, terminei de enviar ({sentItems.length} fotos salvas)</span>
              </button>
            )}

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold text-center">
                {errorMsg}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-2 text-[11px] font-bold text-[#8CAAB1]">
        EvoluIA · Gestão Inteligente para Clínicas
      </footer>
    </div>
  )
}
