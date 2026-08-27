import { useState, useEffect, useRef } from "react"
import { Camera, X, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input, Textarea } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import toast from "react-hot-toast"
import type { Child, ChildStatus } from "@/types/database"

interface EditChildDialogProps {
  open: boolean
  child: Child
  onClose: () => void
  onSuccess: () => void
}

const STATUS_OPTIONS = [
  { value: "initial_assessment", label: "Avaliação Inicial" },
  { value: "in_progress", label: "Em Acompanhamento" },
  { value: "paused", label: "Pausado" },
  { value: "closed", label: "Encerrado" },
  { value: "archived", label: "Arquivado" },
]

export function EditChildDialog({ open, child, onClose, onSuccess }: EditChildDialogProps) {
  const { professional, user } = useAuthStore()
  const profId = professional?.id || user?.id
  const [loading, setLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    full_name: "",
    birth_date: "",
    school: "",
    grade: "",
    main_complaint: "",
    status: "in_progress" as ChildStatus,
    notes: "",
  })

  useEffect(() => {
    if (open && child) {
      setForm({
        full_name: child.full_name || "",
        birth_date: child.birth_date ? child.birth_date.split("T")[0] : "",
        school: child.school || "",
        grade: child.grade || "",
        main_complaint: child.main_complaint || "",
        status: child.status,
        notes: child.notes || "",
      })
      setPhotoUrl(child.photo_url || null)
    }
  }, [open, child])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !e.target.files[0] || !profId) return
    const file = e.target.files[0]

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Foto muito grande! Máximo de 5MB.")
      return
    }

    setUploadingPhoto(true)
    try {
      const ext = file.name.split(".").pop()
      const path = `${profId}/fotos-criancas/${child.id}_${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from("child-documents")
        .upload(path, file, { upsert: true })

      if (upErr) throw upErr

      const { data: urlData } = supabase.storage
        .from("child-documents")
        .getPublicUrl(path)

      setPhotoUrl(urlData.publicUrl)
      toast.success("Foto carregada!")
    } catch (err: any) {
      toast.error("Erro ao enviar a foto")
    } finally {
      setUploadingPhoto(false)
      if (photoInputRef.current) photoInputRef.current.value = ""
    }
  }

  async function handleSubmit() {
    if (!form.full_name.trim()) {
      toast.error("Nome da criança é obrigatório")
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from("children")
        .update({
          full_name: form.full_name.trim(),
          birth_date: form.birth_date || null,
          school: form.school || null,
          grade: form.grade || null,
          main_complaint: form.main_complaint || null,
          status: form.status,
          notes: form.notes || null,
          photo_url: photoUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", child.id)

      if (error) throw error

      toast.success("Dados da criança atualizados com sucesso!")
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar dados")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Dados da Criança</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">

          {/* Photo Upload */}
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl border-4 border-[#D8E5E7] bg-[#EEF5F6] overflow-hidden flex items-center justify-center shadow-md">
                {uploadingPhoto ? (
                  <Loader2 className="w-8 h-8 text-[#245C6B] animate-spin" />
                ) : photoUrl ? (
                  <img src={photoUrl} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black text-[#245C6B]">
                    {child.full_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Camera button */}
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-[#245C6B] text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-[#19323A] transition-colors border-2 border-white"
                title="Adicionar foto"
              >
                <Camera className="w-4 h-4" />
              </button>

              {/* Remove photo button */}
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white rounded-lg flex items-center justify-center shadow hover:bg-red-600 transition-colors border-2 border-white"
                  title="Remover foto"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <p className="text-xs text-[#6B7C83] font-medium">
              {photoUrl ? "Clique na câmera para trocar" : "Clique na câmera para adicionar foto"}
            </p>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          <Input
            label="Nome Completo *"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data de Nascimento"
              type="date"
              value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            />

            <Select
              label="Status do Acompanhamento"
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ChildStatus })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Escola"
              placeholder="Ex: Percio Puccini"
              value={form.school}
              onChange={(e) => setForm({ ...form, school: e.target.value })}
            />

            <Input
              label="Ano / Série"
              placeholder="Ex: 4ª série Fundamental"
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
            />
          </div>

          <Textarea
            label="Queixa Principal / Motivo"
            placeholder="Dificuldade relatada pela família ou escola..."
            value={form.main_complaint}
            onChange={(e) => setForm({ ...form, main_complaint: e.target.value })}
            rows={2}
          />

          <Textarea
            label="Observações Gerais"
            placeholder="Anotações internas, diagnósticos prévios, etc..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={loading} onClick={handleSubmit}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
