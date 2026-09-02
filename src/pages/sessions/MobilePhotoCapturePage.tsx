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
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { AttachmentItem } from "@/components/attachments/SessionAttachmentsManager"

export function MobilePhotoCapturePage() {
  const { uploadId } = useParams<{ uploadId: string }>()
  const [searchParams] = useSearchParams()

  const childId = searchParams.get("childId") || ""
  const childName = searchParams.get("childName") || "Paciente"
  const profId = searchParams.get("profId") || ""
  const category = (searchParams.get("category") as any) || "atividades"

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [sentItems, setSentItems] = useState<AttachmentItem[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isFinished, setIsFinished] = useState(false)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const channelRef = useRef<any>(null)

  // Mantém o canal Realtime ativo enquanto a página estiver aberta no celular
  useEffect(() => {
    if (!uploadId) return

    const ch = supabase.channel(`photo_upload_${uploadId}`)
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("Canal de transmissão conectado:", uploadId)
      }
    })
    channelRef.current = ch

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      // Limpa URLs de preview criadas
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [uploadId])

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newFiles = Array.from(files)
    setSelectedFiles(newFiles)

    // Cria URLs de preview
    const urls = newFiles.map((f) => URL.createObjectURL(f))
    setPreviewUrls(urls)
    setErrorMsg(null)
  }

  async function handleSendToDesktop() {
    if (selectedFiles.length === 0 || !uploadId) return

    setUploading(true)
    setErrorMsg(null)

    try {
      const newlySent: AttachmentItem[] = []

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
        const fileName = `${Date.now()}_mobile_${i}_${cleanName}`
        const filePath = `${profId || "geral"}/${childId || "avulso"}/${fileName}`

        // 1. Upload para o Supabase Storage
        const { error: storageError } = await supabase.storage
          .from("child-documents")
          .upload(filePath, file, { upsert: true })

        if (storageError) throw storageError

        const { data: publicUrlData } = supabase.storage
          .from("child-documents")
          .getPublicUrl(filePath)

        const fileUrl = publicUrlData.publicUrl

        // 2. Salvar na tabela documents
        let docId = `att_${Date.now()}_${i}`
        if (childId) {
          const { data: docData } = await supabase
            .from("documents")
            .insert({
              professional_id: profId || "00000000-0000-0000-0000-000000000000",
              child_id: childId,
              file_name: file.name || `foto_folha_${Date.now()}_${i + 1}.${ext}`,
              file_url: fileUrl,
              file_type: ext,
              file_size: file.size,
              category,
            })
            .select()
            .single()

          if (docData?.id) docId = docData.id
        }

        const attachmentItem: AttachmentItem = {
          id: docId,
          file_name: file.name || `foto_folha_${Date.now()}_${i + 1}.${ext}`,
          file_url: fileUrl,
          file_type: ext,
          file_size: file.size,
          created_at: new Date().toISOString(),
        }

        // 3. Notificar o Computador via Supabase Realtime Broadcast
        if (channelRef.current) {
          await channelRef.current.send({
            type: "broadcast",
            event: "photo_uploaded",
            payload: { attachment: attachmentItem },
          })
        }

        newlySent.push(attachmentItem)
      }

      // Adiciona aos itens enviados
      setSentItems((prev) => [...prev, ...newlySent])

      // Limpa os arquivos selecionados para liberar a tela para a próxima foto
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
      setSelectedFiles([])
      setPreviewUrls([])
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "Falha ao enviar fotos para o computador.")
    } finally {
      setUploading(false)
      if (cameraInputRef.current) cameraInputRef.current.value = ""
      if (galleryInputRef.current) galleryInputRef.current.value = ""
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0D2329] flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto">
      {/* Top Header */}
      <header className="space-y-2 text-center pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE] text-xs font-black">
          <Smartphone className="w-3.5 h-3.5" />
          <span>EvoluIA · Câmera Rápida</span>
        </div>

        <div>
          <h1 className="text-xl font-black text-[#0D2329] tracking-tight">
            Fotografar Atividades & Folhas
          </h1>
          <p className="text-xs font-bold text-[#6B7C83] mt-0.5">
            Aluno(a): <span className="text-[#7C3AED] font-black">{childName}</span>
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="my-auto py-4 space-y-5">
        {/* Input 1: Câmera Nativa do Celular (1 foto por vez) */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFilesSelected}
          className="hidden"
        />

        {/* Input 2: Galeria com Seleção Múltipla */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesSelected}
          className="hidden"
        />

        {/* Estado Final: Concluído */}
        {isFinished ? (
          <div className="p-6 rounded-3xl bg-[#E8F8F5] border-2 border-[#A7F3D0] text-center space-y-3 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-[#10B981] text-white flex items-center justify-center mx-auto shadow-sm">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#065F46]">
                Tudo pronto! Envio concluído.
              </h3>
              <p className="text-xs font-semibold text-[#065F46]/80 mt-1">
                Todas as <strong>{sentItems.length} fotos</strong> já estão salvas na tela do seu computador.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFinished(false)}
              className="mt-2 text-xs font-black text-[#7C3AED] underline cursor-pointer"
            >
              Fotografar mais alguma folha?
            </button>
          </div>
        ) : previewUrls.length > 0 ? (
          /* Prévia das fotos selecionadas antes de enviar */
          <div className="space-y-4 animate-in fade-in">
            <div className="text-center">
              <span className="px-3 py-1 rounded-full bg-[#EDE9FE] text-[#7C3AED] font-black text-xs border border-[#DDD6FE]">
                {previewUrls.length === 1 ? "1 foto pronta para enviar" : `${previewUrls.length} fotos prontas para enviar`}
              </span>
            </div>

            {/* Grid de Previews */}
            <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto p-1">
              {previewUrls.map((url, idx) => (
                <div
                  key={idx}
                  className="relative rounded-2xl overflow-hidden border-2 border-[#7C3AED] bg-black shadow-md aspect-4/3 flex items-center justify-center"
                >
                  <img
                    src={url}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 left-2 bg-black/70 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    Folha #{idx + 1}
                  </div>
                </div>
              ))}
            </div>

            {/* Ações pós-foto */}
            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={uploading}
                onClick={() => {
                  setSelectedFiles([])
                  setPreviewUrls([])
                }}
                className="flex-1 h-12 rounded-2xl border-2 border-[#D8E5E7] bg-white text-[#0D2329] font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4 text-[#8CAAB1]" />
                <span>Cancelar</span>
              </button>

              <button
                type="button"
                disabled={uploading}
                onClick={handleSendToDesktop}
                className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Enviando ({selectedFiles.length})...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar pro PC ({selectedFiles.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Estado Normal: Opções de Fotografar ou Escolher da Galeria */
          <div className="space-y-4">
            {/* Fotos já enviadas nesta sessão */}
            {sentItems.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-[#E8F8F5] border-2 border-[#A7F3D0] space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-[#065F46]">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span>{sentItems.length} foto(s) enviada(s) para o PC!</span>
                  </span>
                  <span className="text-[10px] text-[#059669] font-bold">Ao vivo</span>
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

            {/* Botão 1: Abrir Câmera */}
            <div
              onClick={() => cameraInputRef.current?.click()}
              className="p-6 rounded-3xl border-2 border-dashed border-[#7C3AED]/40 hover:border-[#7C3AED] bg-white hover:bg-[#EDE9FE]/20 transition-all cursor-pointer shadow-sm flex flex-col items-center justify-center gap-3 py-8"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#6366F1] text-white flex items-center justify-center shadow-md active:scale-90 transition-transform">
                <Camera className="w-8 h-8" />
              </div>
              <div className="space-y-1 text-center">
                <h3 className="text-sm font-black text-[#0D2329]">
                  {sentItems.length > 0 ? "📷 Fotografar Próxima Folha" : "📷 Tirar Foto com a Câmera"}
                </h3>
                <p className="text-[11px] font-semibold text-[#6B7C83]">
                  Aponte para a folha e tire a foto da atividade
                </p>
              </div>
            </div>

            {/* Botão 2: Escolher da Galeria (Múltiplas Fotos de uma Vez) */}
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="w-full h-12 rounded-2xl border-2 border-[#D8E5E7] bg-white hover:bg-[#F8FAFB] text-[#0D2329] font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-2xs"
            >
              <ImageIcon className="w-4 h-4 text-[#7C3AED]" />
              <span>Escolher Fotos da Galeria (Pode ser mais de 1)</span>
            </button>

            {/* Botão de Concluir se já enviou pelo menos 1 foto */}
            {sentItems.length > 0 && (
              <button
                type="button"
                onClick={() => setIsFinished(true)}
                className="w-full h-11 rounded-2xl bg-[#065F46] hover:bg-[#047857] text-white font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Pronto, terminei de fotografar ({sentItems.length} fotos)</span>
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
