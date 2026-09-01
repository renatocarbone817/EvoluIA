import { useState, useEffect, useRef } from "react"
import {
  Camera,
  X,
  Loader2,
  Crop,
  User,
  Users,
  Calendar,
  School,
  GraduationCap,
  Target,
  FileText,
  Plus,
  Trash2,
  Search,
  Phone,
  Mail,
  CheckCircle2,
  Sparkles,
  Link2,
  HeartHandshake,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { calculateAge } from "@/lib/utils"
import toast from "react-hot-toast"
import type { Child, ChildStatus, Guardian } from "@/types/database"
import { ImageCropperModal } from "@/components/ui/ImageCropperModal"

interface EditChildDialogProps {
  open: boolean
  child: Child
  onClose: () => void
  onSuccess: () => void
  onDelete?: () => void
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
  { value: "report_in_progress", label: "📝 Em Relatório" },
  { value: "report_completed", label: "✅ Finalizado" },
  { value: "paused", label: "⏸️ Pausado" },
]

const RELATIONSHIPS = [
  "Mãe",
  "Pai",
  "Avó",
  "Avô",
  "Tia / Tio",
  "Responsável Legal",
  "Irmã / Irmão",
  "Outro",
]

export function EditChildDialog({ open, child, onClose, onSuccess, onDelete }: EditChildDialogProps) {
  const { professional, user } = useAuthStore()
  const profId = professional?.id || user?.id

  const [loading, setLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [schoolSuggestions, setSchoolSuggestions] = useState<string[]>([])
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)

  // Child Form
  const [form, setForm] = useState({
    full_name: "",
    birth_date: "",
    school: "",
    grade: "",
    main_complaint: "",
    status: "initial_assessment" as ChildStatus,
    notes: "",
  })

  // Guardians State
  const [allGuardians, setAllGuardians] = useState<Guardian[]>([])
  const [linkedGuardians, setLinkedGuardians] = useState<
    { id?: string; guardian_id: string; relationship: string; is_primary: boolean; guardian?: Guardian }[]
  >([])
  const [guardianMode, setGuardianMode] = useState<"existing" | "new">("existing")

  // Link existing guardian form
  const [selectedGuardianId, setSelectedGuardianId] = useState("")
  const [linkRelationship, setLinkRelationship] = useState("Mãe")
  const [linkIsPrimary, setLinkIsPrimary] = useState(true)

  // Create new guardian form
  const [newGuardianForm, setNewGuardianForm] = useState({
    full_name: "",
    relationship: "Mãe",
    phone: "",
    email: "",
    cpf: "",
    profession: "",
    is_primary: true,
  })

  useEffect(() => {
    if (open && child && profId) {
      setForm({
        full_name: child.full_name || "",
        birth_date: child.birth_date ? child.birth_date.split("T")[0] : "",
        school: child.school || "",
        grade: child.grade || "",
        main_complaint: child.main_complaint || "",
        status: child.status || "initial_assessment",
        notes: child.notes || "",
      })
      setPhotoUrl(child.photo_url || null)
      loadGuardiansData()
    }
  }, [open, child, profId])

  async function loadGuardiansData() {
    if (!profId || !child) return
    try {
      // 0. Load unique schools for autocomplete
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

      // 1. Load all clinic guardians
      const { data: allG } = await supabase
        .from("guardians")
        .select("*")
        .eq("professional_id", profId)
        .order("full_name", { ascending: true })

      setAllGuardians(allG || [])

      // 2. Load linked guardians for this child
      const { data: linked } = await supabase
        .from("guardian_children")
        .select("id, guardian_id, relationship, is_primary, guardian:guardians(*)")
        .eq("child_id", child.id)

      if (linked) {
        setLinkedGuardians(
          linked.map((l: any) => ({
            id: l.id,
            guardian_id: l.guardian_id,
            relationship: l.relationship || "Mãe",
            is_primary: l.is_primary ?? true,
            guardian: l.guardian,
          }))
        )
      }
    } catch (err) {
      console.error("Error loading guardians:", err)
    }
  }

  // File crop logic
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !e.target.files[0] || !profId) return
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
    if (!profId) return

    setUploadingPhoto(true)
    try {
      const path = `${profId}/fotos-criancas/${child.id}_${Date.now()}.jpg`

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
      toast.success("Foto recortada e enquadrada com sucesso!")
    } catch {
      toast.error("Erro ao salvar a foto recortada")
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Quick action: Add existing guardian to list
  function handleAddExistingGuardianToList() {
    if (!selectedGuardianId) {
      toast.error("Selecione um responsável no banco de dados.")
      return
    }

    const exists = linkedGuardians.some((g) => g.guardian_id === selectedGuardianId)
    if (exists) {
      toast.error("Este responsável já está vinculado a esta criança.")
      return
    }

    const found = allGuardians.find((g) => g.id === selectedGuardianId)
    setLinkedGuardians([
      ...linkedGuardians,
      {
        guardian_id: selectedGuardianId,
        relationship: linkRelationship,
        is_primary: linkIsPrimary,
        guardian: found,
      },
    ])
    setSelectedGuardianId("")
    toast.success("Responsável adicionado à lista!")
  }

  // Quick action: Remove linked guardian from list
  function handleRemoveLinkedGuardian(guardianId: string) {
    setLinkedGuardians(linkedGuardians.filter((g) => g.guardian_id !== guardianId))
  }

  // Main Submit: Save Child + Sync Guardians
  async function handleSubmit() {
    if (!form.full_name.trim()) {
      toast.error("Nome da criança é obrigatório")
      return
    }

    setLoading(true)
    try {
      // 1. Update Child Data
      const { error: childErr } = await supabase
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

      if (childErr) throw childErr

      // 2. Processar Responsáveis (Novo ou Selecionado)
      let finalLinked = [...linkedGuardians]

      // Caso A: Usuário preencheu os campos de "Cadastrar Novo Responsável"
      if (guardianMode === "new" && newGuardianForm.full_name.trim()) {
        const { data: newG, error: newGErr } = await supabase
          .from("guardians")
          .insert({
            professional_id: child.professional_id || profId,
            full_name: newGuardianForm.full_name.trim(),
            phone: newGuardianForm.phone || null,
            whatsapp: newGuardianForm.phone || null,
            email: newGuardianForm.email || null,
            cpf: newGuardianForm.cpf || null,
          })
          .select()
          .single()

        if (newGErr) {
          console.error("Erro ao criar novo responsável:", newGErr)
        } else if (newG) {
          finalLinked.push({
            guardian_id: newG.id,
            relationship: newGuardianForm.relationship || "Mãe",
            is_primary: newGuardianForm.is_primary ?? true,
            guardian: newG,
          })
        }
      }

      // Caso B: Usuário selecionou um responsável existente no dropdown mas não clicou no botão vincular antes de salvar
      if (guardianMode === "existing" && selectedGuardianId) {
        const alreadyInList = finalLinked.some((g) => g.guardian_id === selectedGuardianId)
        if (!alreadyInList) {
          const found = allGuardians.find((g) => g.id === selectedGuardianId)
          finalLinked.push({
            guardian_id: selectedGuardianId,
            relationship: linkRelationship || "Mãe",
            is_primary: linkIsPrimary ?? true,
            guardian: found,
          })
        }
      }

      // 3. Sincronizar vínculos na tabela guardian_children
      // Remover vínculos antigos
      await supabase.from("guardian_children").delete().eq("child_id", child.id)

      // Inserir todos os vínculos atualizados
      if (finalLinked.length > 0) {
        // Remover possíveis duplicados por guardian_id
        const uniqueLinks = Array.from(new Map(finalLinked.map((item) => [item.guardian_id, item])).values())

        const linksToInsert = uniqueLinks.map((l) => ({
          child_id: child.id,
          guardian_id: l.guardian_id,
          relationship: l.relationship || "Mãe",
          is_primary: l.is_primary ?? false,
        }))

        const { error: linksErr } = await supabase
          .from("guardian_children")
          .insert(linksToInsert)

        if (linksErr) console.error("Erro ao vincular responsáveis:", linksErr)
      }

      toast.success("Dados da criança e responsáveis atualizados com sucesso!", { icon: "🎉" })
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Erro ao salvar dados")
    } finally {
      setLoading(false)
    }
  }

  const ageText = form.birth_date ? calculateAge(form.birth_date) : ""

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] shadow-2xl max-w-2xl w-full max-h-[85vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header Moderno */}
        <div className="p-5 border-b border-[#EEF5F6] bg-[#F7FAFA] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0D2329] tracking-tight">
                Editar Dados da Criança & Família
              </h2>
              <p className="text-xs font-semibold text-[#6B7C83]">
                Atualize o cadastro do paciente e gerencie os responsáveis
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white border border-[#D8E5E7] text-[#6B7C83] hover:text-[#0D2329] hover:bg-[#EEF5F6] flex items-center justify-center transition-colors shadow-2xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          {/* 1. FOTO COM CROPPER */}
          <div className="flex flex-col items-center gap-3 p-4 rounded-3xl bg-[#F8FAFB] border border-[#D8E5E7]">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl border-4 border-white bg-[#EDE9FE] overflow-hidden flex items-center justify-center shadow-md">
                {uploadingPhoto ? (
                  <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
                ) : photoUrl ? (
                  <img src={photoUrl} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black text-[#7C3AED]">
                    {form.full_name ? form.full_name.charAt(0).toUpperCase() : "C"}
                  </span>
                )}
              </div>

              {/* Botão de Câmera */}
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-[#7C3AED] text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-[#6D28D9] transition-colors border-2 border-white"
                title="Alterar e enquadrar foto"
              >
                <Camera className="w-4 h-4" />
              </button>

              {/* Remover foto */}
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-[#EF4444] text-white rounded-lg flex items-center justify-center shadow hover:bg-[#DC2626] transition-colors border-2 border-white"
                  title="Remover foto"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="text-xs font-bold text-[#7C3AED] hover:underline flex items-center gap-1.5"
            >
              <Crop className="w-3.5 h-3.5" />
              <span>{photoUrl ? "Trocar / Enquadrar foto" : "Adicionar foto do paciente"}</span>
            </button>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* 2. DADOS DA CRIANÇA */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-[#0D2329] uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#7C3AED]" />
              <span>Informações Pessoais & Escola</span>
            </h3>

            {/* Nome Completo */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#0D2329]">Nome Completo da Criança *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Ex: Gustavo Henrique da Silva"
                className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all shadow-2xs"
              />
            </div>

            {/* Data Nasc + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0D2329] flex items-center justify-between">
                  <span>Data de Nascimento</span>
                  {ageText && <span className="text-[11px] font-bold text-[#7C3AED]">🎂 {ageText}</span>}
                </label>
                <input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                  className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0D2329]">Status do Acompanhamento</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ChildStatus })}
                  className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all shadow-2xs"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Escola + Rede + Série */}
            <div className="space-y-3">
              <div className="space-y-1.5">
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
                  list="edit-schools-list"
                  placeholder="Ex: CEM Profº Faustino Pedroso"
                  value={form.school}
                  onChange={(e) => setForm({ ...form, school: e.target.value })}
                  className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all shadow-2xs"
                />
                <datalist id="edit-schools-list">
                  {schoolSuggestions.map((sch) => (
                    <option key={sch} value={sch} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#0D2329] flex items-center gap-1">
                    <School className="w-3.5 h-3.5 text-[#7C3AED]" />
                    <span>Rede de Ensino / Tipo</span>
                  </label>
                  <select
                    value={(form as any).school_type || "Municipal"}
                    onChange={(e) => setForm({ ...form, school_type: e.target.value } as any)}
                    className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all shadow-2xs"
                  >
                    <option value="Municipal">Municipal (Escola Municipal)</option>
                    <option value="Estadual">Estadual (Escola Estadual)</option>
                    <option value="Particular">Particular / Privada</option>
                    <option value="Federal">Federal</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#0D2329] flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-[#7C3AED]" />
                    <span>Ano / Série</span>
                  </label>
                  <select
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                    className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all shadow-2xs"
                  >
                    {/* Se o valor atual for personalizado e nao estiver na lista, renderiza no topo */}
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
            </div>

            {/* Queixa Principal */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#0D2329] flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-[#EA580C]" />
                <span>Queixa Principal / Motivo da Consulta</span>
              </label>
              <textarea
                rows={2}
                placeholder="Dificuldade relatada pela família ou escola..."
                value={form.main_complaint}
                onChange={(e) => setForm({ ...form, main_complaint: e.target.value })}
                className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#EA580C] transition-all resize-none shadow-2xs"
              />
            </div>

            {/* Observações Gerais */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#0D2329] flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span>Observações Gerais & Histórico</span>
              </label>
              <textarea
                rows={2}
                placeholder="Anotações internas, diagnósticos prévios, alergias, etc..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all resize-none shadow-2xs"
              />
            </div>
          </div>

          {/* 3. SEÇÃO DE RESPONSÁVEIS & FAMÍLIA (INTEGRADA) */}
          <div className="space-y-4 pt-4 border-t-2 border-[#EEF5F6]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center font-black shadow-2xs">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-[#0D2329] uppercase tracking-wider">
                    Responsáveis & Família
                  </h3>
                  <p className="text-[10px] font-semibold text-[#6B7C83]">
                    Vincule os pais ou cadastre novos diretamente aqui
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de Responsáveis Já Vinculados */}
            {linkedGuardians.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-black text-[#0D2329]">Responsáveis Vinculados ({linkedGuardians.length}):</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {linkedGuardians.map((lg) => (
                    <div
                      key={lg.guardian_id}
                      className="p-3 rounded-2xl bg-[#F8FAFB] border border-[#D8E5E7] flex items-center justify-between gap-2 shadow-2xs group"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black text-[#0D2329] truncate">
                            {lg.guardian?.full_name || "Responsável"}
                          </p>
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE]">
                            {lg.relationship}
                          </span>
                        </div>
                        {lg.guardian?.phone && (
                          <p className="text-[10px] text-[#6B7C83] flex items-center gap-1 font-semibold truncate">
                            <Phone className="w-3 h-3 text-[#10B981]" />
                            <span>{lg.guardian.phone}</span>
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveLinkedGuardian(lg.guardian_id)}
                        className="p-1.5 text-[#A0B4B9] hover:text-[#EF4444] hover:bg-[#FEE2E2] rounded-xl transition-all"
                        title="Desvincular responsável"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs de Seleção / Cadastro de Responsável */}
            <div className="p-4 rounded-3xl bg-[#F7FAFA] border-2 border-[#D8E5E7] space-y-3.5">
              <div className="flex items-center gap-2 border-b border-[#D8E5E7] pb-2.5">
                <button
                  type="button"
                  onClick={() => setGuardianMode("existing")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    guardianMode === "existing"
                      ? "bg-[#0284C7] text-white shadow-xs"
                      : "bg-white text-[#6B7C83] border border-[#D8E5E7] hover:bg-[#EEF5F6]"
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Selecionar do Banco de Dados</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGuardianMode("new")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    guardianMode === "new"
                      ? "bg-[#7C3AED] text-white shadow-xs"
                      : "bg-white text-[#6B7C83] border border-[#D8E5E7] hover:bg-[#EEF5F6]"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Cadastrar Novo Responsável</span>
                </button>
              </div>

              {/* OPÇÃO 1: SELECIONAR DO BANCO DE DADOS */}
              {guardianMode === "existing" && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-[#0D2329]">Escolha o Responsável:</label>
                      <select
                        value={selectedGuardianId}
                        onChange={(e) => setSelectedGuardianId(e.target.value)}
                        className="w-full p-2 rounded-xl border border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#0284C7]"
                      >
                        <option value="">-- Selecione um responsável --</option>
                        {allGuardians.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.full_name} {g.phone ? `(${g.phone})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-[#0D2329]">Parentesco:</label>
                      <select
                        value={linkRelationship}
                        onChange={(e) => setLinkRelationship(e.target.value)}
                        className="w-full p-2 rounded-xl border border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#0284C7]"
                      >
                        {RELATIONSHIPS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#0D2329]">
                      <input
                        type="checkbox"
                        checked={linkIsPrimary}
                        onChange={(e) => setLinkIsPrimary(e.target.checked)}
                        className="rounded text-[#0284C7] focus:ring-[#0284C7]"
                      />
                      <span>Responsável Principal</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleAddExistingGuardianToList}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-black flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Vincular Responsável</span>
                    </button>
                  </div>
                </div>
              )}

              {/* OPÇÃO 2: CADASTRAR NOVO RESPONSÁVEL */}
              {guardianMode === "new" && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-[#0D2329]">Nome do Responsável *</label>
                      <input
                        type="text"
                        placeholder="Ex: Maria Aparecida"
                        value={newGuardianForm.full_name}
                        onChange={(e) => setNewGuardianForm({ ...newGuardianForm, full_name: e.target.value })}
                        className="w-full p-2 rounded-xl border border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-[#0D2329]">Parentesco:</label>
                      <select
                        value={newGuardianForm.relationship}
                        onChange={(e) => setNewGuardianForm({ ...newGuardianForm, relationship: e.target.value })}
                        className="w-full p-2 rounded-xl border border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                      >
                        {RELATIONSHIPS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-[#0D2329]">Telefone / WhatsApp:</label>
                      <input
                        type="text"
                        placeholder="(11) 99999-9999"
                        value={newGuardianForm.phone}
                        onChange={(e) => setNewGuardianForm({ ...newGuardianForm, phone: e.target.value })}
                        className="w-full p-2 rounded-xl border border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-[#0D2329]">E-mail (opcional):</label>
                      <input
                        type="email"
                        placeholder="maria@email.com"
                        value={newGuardianForm.email}
                        onChange={(e) => setNewGuardianForm({ ...newGuardianForm, email: e.target.value })}
                        className="w-full p-2 rounded-xl border border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with Delete Button on Left */}
        <div className="p-3.5 sm:p-4 border-t-2 border-[#EEF5F6] bg-[#F7FAFA] flex items-center justify-between gap-3 shrink-0">
          <div>
            {onDelete && (
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  onClose();
                  onDelete();
                }}
                className="px-4 py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-200 text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Excluir paciente"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Criança</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-2xl border-2 border-[#D8E5E7] hover:bg-white text-xs font-black text-[#6B7C83] hover:text-[#0D2329] transition-all"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="h-11 px-5 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-sm active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Salvando dados...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Crop Modal */}
      <ImageCropperModal
        open={cropperOpen}
        imageSrc={imageToCrop}
        onClose={() => setCropperOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </div>
  )
}
