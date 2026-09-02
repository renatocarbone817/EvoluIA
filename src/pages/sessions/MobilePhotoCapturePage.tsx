import { useState, useRef, useEffect } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import {
  Camera,
  CheckCircle2,
  Upload,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  Check,
  Smartphone,
  Send,
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

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Limpa o object URL ao desmontar
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setErrorMsg(null)
  }

  async function handleSendToDesktop() {
    if (!selectedFile || !uploadId) return

    setUploading(true)
    setErrorMsg(null)

    try {
      const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "jpg"
      const cleanName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")
      const fileName = `${Date.now()}_mobile_${cleanName}`
      const filePath = `${profId || "geral"}/${childId || "avulso"}/${fileName}`

      // 1. Upload para o Supabase Storage
      const { error: storageError } = await supabase.storage
        .from("child-documents")
        .upload(filePath, selectedFile, { upsert: true })

      if (storageError) throw storageError

      const { data: publicUrlData } = supabase.storage
        .from("child-documents")
        .getPublicUrl(filePath)

      const fileUrl = publicUrlData.publicUrl

      // 2. Salvar na tabela documents
      let docId = `att_${Date.now()}`
      if (childId) {
        const { data: docData } = await supabase
          .from("documents")
          .insert({
            professional_id: profId || "00000000-0000-0000-0000-000000000000",
            child_id: childId,
            file_name: selectedFile.name || `foto_atividade_${Date.now()}.${ext}`,
            file_url: fileUrl,
            file_type: ext,
            file_size: selectedFile.size,
            category,
          })
          .select()
          .single()

        if (docData?.id) docId = docData.id
      }

      const attachmentItem: AttachmentItem = {
        id: docId,
        file_name: selectedFile.name || `foto_atividade_${Date.now()}.${ext}`,
        file_url: fileUrl,
        file_type: ext,
        file_size: selectedFile.size,
        created_at: new Date().toISOString(),
      }

      // 3. Notificar o Computador via Supabase Realtime Broadcast
      const channel = supabase.channel(`photo_upload_${uploadId}`)
      await channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.send({
            type: "broadcast",
            event: "photo_uploaded",
            payload: { attachment: attachmentItem },
          })
          // Desconectar o canal após enviar
          setTimeout(() => {
            supabase.removeChannel(channel)
          }, 1000)
        }
      })

      // Limpar formulário e marcar como enviado
      setSentCount((prev) => prev + 1)
      setSelectedFile(null)
      setPreviewUrl(null)
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "Falha ao enviar foto para o computador.")
    } finally {
      setUploading(false)
      if (cameraInputRef.current) cameraInputRef.current.value = ""
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
            Fotografar Atividade
          </h1>
          <p className="text-xs font-bold text-[#6B7C83] mt-0.5">
            Paciente: <span className="text-[#7C3AED] font-black">{childName}</span>
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="my-auto py-6 space-y-5">
        {/* Input da Câmera Nativa */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelected}
          className="hidden"
        />

        {/* Notificação de Sucesso se já tiver enviado alguma foto */}
        {sentCount > 0 && !previewUrl && (
          <div className="p-4 rounded-3xl bg-[#E8F8F5] border-2 border-[#A7F3D0] text-center space-y-2 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-[#10B981] text-white flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#065F46]">
                Foto enviada com sucesso! ✨
              </h3>
              <p className="text-xs font-semibold text-[#065F46]/80 mt-0.5">
                Ela já apareceu na tela do computador na sua sessão.
              </p>
            </div>
            <p className="text-[11px] font-bold text-[#059669]">
              Total enviado nesta sessão: {sentCount} {sentCount === 1 ? "foto" : "fotos"}
            </p>
          </div>
        )}

        {/* Erro se houver */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold text-center">
            {errorMsg}
          </div>
        )}

        {/* Se a foto acabou de ser tirada: Exibe Preview */}
        {previewUrl ? (
          <div className="space-y-4 animate-in fade-in">
            <div className="relative rounded-3xl overflow-hidden border-2 border-[#7C3AED] bg-black shadow-lg aspect-3/4 max-h-[55vh] flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Foto tirada"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white px-3 py-1 rounded-full text-xs font-bold">
                Prévia da foto
              </div>
            </div>

            {/* Ações pós-foto */}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={uploading}
                onClick={() => {
                  setSelectedFile(null)
                  setPreviewUrl(null)
                  cameraInputRef.current?.click()
                }}
                className="flex-1 h-12 rounded-2xl border-2 border-[#D8E5E7] bg-white text-[#0D2329] font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4 text-[#8CAAB1]" />
                <span>Tirar Outra</span>
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
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar pro PC</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Estado Inicial: Botão Grandão para Tirar Foto */
          <div className="space-y-4 text-center">
            <div
              onClick={() => cameraInputRef.current?.click()}
              className="p-8 rounded-3xl border-2 border-dashed border-[#7C3AED]/40 hover:border-[#7C3AED] bg-white hover:bg-[#EDE9FE]/20 transition-all cursor-pointer shadow-sm flex flex-col items-center justify-center gap-4 py-12"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#7C3AED] to-[#6366F1] text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                <Camera className="w-10 h-10" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h3 className="text-base font-black text-[#0D2329]">
                  Toque aqui para abrir a Câmera
                </h3>
                <p className="text-xs font-semibold text-[#6B7C83]">
                  Aponte para a folha ou atividade na mesa e bata a foto da evolução do aluno.
                </p>
              </div>
            </div>

            <p className="text-[11px] font-semibold text-[#8CAAB1]">
              💡 A foto será transmitida na mesma hora para a tela aberta no seu computador.
            </p>
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
