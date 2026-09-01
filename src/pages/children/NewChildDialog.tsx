import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import toast from "react-hot-toast"
import { UserPlus, Camera, X, Crop, Loader2, Users, CheckCircle2, School, GraduationCap } from "lucide-react"
import { ImageCropperModal } from "@/components/ui/ImageCropperModal"
import { sanitizeText } from "@/lib/sanitizer"

interface NewChildDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export const GRADE_OPTIONS = [
  { value: "", label: "Selecione o ano / série..." },
  { value: "Não informado / Não frequenta", label: "Não informado / Não frequenta" },
  { value: "Berçário / Maternal", label: "Berçário / Maternal" },
  { value: "Educação Infantil (Pré I)", label: "Educação Infantil (Pré I)" },
  { value: "Educação Infantil (Pré II)", label: "Educação Infantil (Pré II)" },
  { value: "1º Ano do Ensino Fundamental", label: "1º Ano do Ensino Fundamental" },
  { value: "2º Ano do Ensino Fundamental", label: "2º Ano do Ensino Fundamental" },
  { value: "3º Ano do Ensino Fundamental", label: "3º Ano do Ensino Fundamental" },
  { value: "4º Ano do Ensino Fundamental", label: "4º Ano do Ensino Fundamental" },
  { value: "5º Ano do Ensino Fundamental", label: "5º Ano do Ensino Fundamental" },
  { value: "6º Ano do Ensino Fundamental", label: "6º Ano do Ensino Fundamental" },
  { value: "7º Ano do Ensino Fundamental", label: "7º Ano do Ensino Fundamental" },
  { value: "8º Ano do Ensino Fundamental", label: "8º Ano do Ensino Fundamental" },
  { value: "9º Ano do Ensino Fundamental", label: "9º Ano do Ensino Fundamental" },
  { value: "1º Ano do Ensino Médio", label: "1º Ano do Ensino Médio" },
  { value: "2º Ano do Ensino Médio", label: "2º Ano do Ensino Médio" },
  { value: "3º Ano do Ensino Médio", label: "3º Ano do Ensino Médio" },
  { value: "Ensino Superior", label: "Ensino Superior" },
  { value: "EJA / Educação Especial", label: "EJA / Educação Especial" },
  { value: "Outro", label: "Outro" },
]

const STATUS_OPTIONS = [
  { value: "initial_assessment", label: "📋 Entrevista Inicial" },
  { value: "in_progress", label: "🌱 Em Acompanhamento" },
]

export function NewChildDialog({ open, onClose, onSuccess }: NewChildDialogProps) {
  const { professional } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [schoolSuggestions, setSchoolSuggestions] = useState<string[]>([])
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)

  const [form, setForm] = useState({
    full_name: "",
    birth_date: "",
    school: "",
    school_type: "Municipal",
    grade: "",
    main_complaint: "",
    status: "initial_assessment",
    notes: "",
    // Guardian fields
    guardian_name: "",
    guardian_relationship: "Mãe",
    guardian_phone: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    async function loadSchools() {
      const { user, professional } = useAuthStore.getState()
      const profId = professional?.id || user?.id
      if (!profId || !open) return

      try {
        const { data: schoolsData } = await supabase
          .from("children")
          .select("school")
          .eq("professional_id", profId)
          .not("school", "is", null)

        if (schoolsData) {
          const uniqueSchools = Array.from(
            new Set(
              schoolsData
                .map((s) => s.school?.trim())
                .filter((s): s is string => Boolean(s && s.length > 0))
            )
          ).sort((a, b) => a.localeCompare(b, "pt-BR"))
          setSchoolSuggestions(uniqueSchools)
        }
      } catch (err) {
        console.error("Error loading schools:", err)
      }
    }
    loadSchools()
  }, [open])

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.full_name.trim()) errs.full_name = "Nome da criança é obrigatório"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Foto muito grande! Máximo de 10MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setImageToCrop(reader.result as string)
      setCropperOpen(true)
    }
    reader.readAsDataURL(file)

    if (photoInputRef.current) photoInputRef.current.value = ""
  }

  async function handleCropComplete(croppedBlob: Blob) {
    setCropperOpen(false)
    const { user, professional } = useAuthStore.getState()
    const profId = professional?.id || user?.id
    if (!profId) return

    setUploadingPhoto(true)
    try {
      const path = `${profId}/fotos-criancas/temp_${Date.now()}.jpg`

      const { error: upErr } = await supabase.storage
        .from("child-documents")
        .upload(path, croppedBlob, {
          contentType: "image/jpeg",
          upsert: true,
        })

      if (upErr) throw upErr

      const { data: urlData } = supabase.storage
        .from("child-documents")
        .getPublicUrl(path)

      setPhotoUrl(urlData.publicUrl)
      toast.success("Foto recortada com sucesso!")
    } catch {
      toast.error("Erro ao salvar a foto recortada")
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleSubmit() {
    if (!validate()) return
    const { user, professional, fetchProfessional } = useAuthStore.getState()
    const profId = professional?.id || user?.id

    if (!profId) {
      toast.error("Sessão não encontrada. Por favor, refaça o login.")
      return
    }

    setLoading(true)
    try {
      // 1. Ensure professional profile row exists
      const { data: existingProf } = await supabase
        .from("professionals")
        .select("id")
        .eq("id", profId)
        .single()

      if (!existingProf) {
        const { data: userData } = await supabase.auth.getUser()
        await supabase.from("professionals").upsert({
          id: profId,
          full_name: userData.user?.user_metadata?.full_name || userData.user?.email?.split("@")[0] || "Psicopedagoga",
          email: userData.user?.email || "",
          specialty: "Psicopedagogia",
        })
        await fetchProfessional(profId)
      }

      // 2. Insert child
      const { data: newChild, error: childError } = await supabase
        .from("children")
        .insert({
          professional_id: profId,
          full_name: sanitizeText(form.full_name),
          birth_date: form.birth_date || null,
          school: sanitizeText(form.school) || null,
          grade: sanitizeText(form.grade) || null,
          main_complaint: sanitizeText(form.main_complaint) || null,
          status: form.status as any,
          notes: sanitizeText(form.notes) || null,
          photo_url: photoUrl || null,
        })
        .select()
        .single()

      if (childError) throw childError

      // 3. If guardian info provided, create and link
      if (form.guardian_name.trim() && newChild) {
        const { data: newGuardian, error: gError } = await supabase
          .from("guardians")
          .insert({
            professional_id: profId,
            full_name: sanitizeText(form.guardian_name),
            phone: sanitizeText(form.guardian_phone) || null,
            whatsapp: sanitizeText(form.guardian_phone) || null,
          })
          .select()
          .single()

        if (!gError && newGuardian) {
          await supabase.from("guardian_children").insert({
            child_id: newChild.id,
            guardian_id: newGuardian.id,
            relationship: form.guardian_relationship,
            is_primary: true,
          })
        }
      }

      toast.success("Paciente cadastrado com sucesso!", { icon: "👶" })
      setForm({
        full_name: "", birth_date: "", school: "", school_type: "Municipal", grade: "",
        main_complaint: "", status: "initial_assessment", notes: "",
        guardian_name: "", guardian_relationship: "Mãe", guardian_phone: "",
      })
      setPhotoUrl(null)
      onSuccess()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Erro ao cadastrar paciente. Verifique os dados.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full p-0 flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden rounded-3xl border-2 border-[#D8E5E7] bg-white shadow-2xl">
          <DialogHeader className="p-5 pb-3 border-b border-[#EEF5F6] flex items-center gap-3 shrink-0 bg-white">
            <div className="w-11 h-11 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] border-2 border-[#DDD6FE] flex items-center justify-center shrink-0 shadow-xs">
              <UserPlus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black text-[#0D2329]">
                Novo Paciente & Criança
              </DialogTitle>
              <p className="text-xs font-semibold text-[#6B7C83] mt-0.5">
                Preencha os dados da criança e do responsável
              </p>
            </div>
          </DialogHeader>

          <DialogBody className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
            {/* Photo with Cropper trigger */}
            <div className="flex flex-col items-center gap-2.5 pb-2">
              <div className="relative group">
                <div className="w-24 h-24 rounded-3xl border-2 border-[#DDD6FE] bg-[#EDE9FE] overflow-hidden flex items-center justify-center shadow-md">
                  {uploadingPhoto ? (
                    <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
                  ) : photoUrl ? (
                    <img src={photoUrl} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-black text-[#7C3AED]">
                      {form.full_name ? form.full_name.charAt(0).toUpperCase() : "👶"}
                    </span>
                  )}
                </div>

                {/* Camera button */}
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-[#7C3AED] text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-[#6D28D9] transition-colors border-2 border-white active:scale-95"
                  title="Adicionar e enquadrar foto"
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

              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="text-xs font-black text-[#7C3AED] hover:underline flex items-center gap-1.5 pt-1"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>{photoUrl ? "Trocar / Enquadrar Foto" : "Adicionar Foto de Perfil"}</span>
              </button>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Child Information */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-black text-[#0D2329]">Nome completo da Criança *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Lucas Henrique Silva"
                  value={form.full_name}
                  onChange={(e) => handleChange("full_name", e.target.value)}
                  className={`w-full p-3 rounded-2xl border-2 ${errors.full_name ? 'border-red-400' : 'border-[#D8E5E7]'} bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs`}
                />
                {errors.full_name && <p className="text-[11px] text-red-500 font-bold">{errors.full_name}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0D2329]">Data de Nascimento</label>
                  <input
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => handleChange("birth_date", e.target.value)}
                    className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0D2329]">Status Inicial</label>
                  <select
                    value={form.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                    className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0D2329] flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <School className="w-3.5 h-3.5 text-[#7C3AED]" />
                      <span>Nome da Escola</span>
                    </span>
                    {schoolSuggestions.length > 0 && (
                      <span className="text-[10px] font-bold text-[#7C3AED]">
                        {schoolSuggestions.length} cadastradas
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    list="new-schools-list"
                    placeholder="Ex: CEM Profº Faustino Pedroso"
                    value={form.school}
                    onChange={(e) => handleChange("school", e.target.value)}
                    className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                  />
                  <datalist id="new-schools-list">
                    {schoolSuggestions.map((sch) => (
                      <option key={sch} value={sch} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#0D2329] flex items-center gap-1">
                      <School className="w-3.5 h-3.5 text-[#7C3AED]" />
                      <span>Rede / Tipo</span>
                    </label>
                    <select
                      value={form.school_type || "Municipal"}
                      onChange={(e) => handleChange("school_type", e.target.value)}
                      className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                    >
                      <option value="Municipal">Municipal (Escola Municipal)</option>
                      <option value="Estadual">Estadual (Escola Estadual)</option>
                      <option value="Particular">Particular / Privada</option>
                      <option value="Federal">Federal</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#0D2329] flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-[#7C3AED]" />
                      <span>Ano / Série</span>
                    </label>
                    <select
                      value={form.grade}
                      onChange={(e) => handleChange("grade", e.target.value)}
                      className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                    >
                      {form.grade && !GRADE_OPTIONS.some((g) => g.value === form.grade) && (
                        <option value={form.grade}>{form.grade}</option>
                      )}
                      {GRADE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-[#0D2329]">
                  Queixa Principal / Motivo da Consulta
                </label>
                <textarea
                  placeholder="Dificuldade de alfabetização, atenção, cálculo, dislexia..."
                  value={form.main_complaint}
                  onChange={(e) => handleChange("main_complaint", e.target.value)}
                  rows={2}
                  className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] resize-none"
                />
              </div>
            </div>

            {/* Optional Guardian Quick Form */}
            <div className="pt-4 border-t-2 border-[#EEF5F6] space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#7C3AED]" />
                <h4 className="text-xs font-black uppercase tracking-wider text-[#0D2329]">
                  Responsável Principal (Opcional)
                </h4>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-[#0D2329]">Nome da Mãe, Pai ou Responsável</label>
                <input
                  type="text"
                  placeholder="Ex: Maria Aparecida"
                  value={form.guardian_name}
                  onChange={(e) => handleChange("guardian_name", e.target.value)}
                  className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0D2329]">Parentesco</label>
                  <select
                    value={form.guardian_relationship}
                    onChange={(e) => handleChange("guardian_relationship", e.target.value)}
                    className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                  >
                    <option value="Mãe">Mãe</option>
                    <option value="Pai">Pai</option>
                    <option value="Avó / Avô">Avó / Avô</option>
                    <option value="Tia / Tio">Tia / Tio</option>
                    <option value="Tutor Legal">Tutor Legal</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0D2329]">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(11) 98888-8888"
                    value={form.guardian_phone}
                    onChange={(e) => handleChange("guardian_phone", e.target.value)}
                    className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>
            </div>
          </DialogBody>

          <DialogFooter className="p-3.5 sm:p-4 bg-[#F8FAFB] border-t-2 border-[#EEF5F6] flex items-center justify-end gap-2.5 shrink-0 z-10">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={onClose}
              className="rounded-2xl border-2 border-[#D8E5E7] font-bold text-xs"
            >
              Cancelar
            </Button>

            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />}
              <span>{loading ? "Cadastrando..." : "Cadastrar Paciente"}</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interactive Crop & Reframe Modal */}
      <ImageCropperModal
        open={cropperOpen}
        imageSrc={imageToCrop}
        onClose={() => setCropperOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </>
  )
}
