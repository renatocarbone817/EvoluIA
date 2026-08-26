import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import toast from "react-hot-toast"
import { UserCheck } from "lucide-react"

interface NewChildDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const STATUS_OPTIONS = [
  { value: "initial_assessment", label: "Avaliação Inicial" },
  { value: "in_progress", label: "Em Acompanhamento" },
]

export function NewChildDialog({ open, onClose, onSuccess }: NewChildDialogProps) {
  const { professional } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: "",
    birth_date: "",
    school: "",
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
          full_name: userData.user?.user_metadata?.full_name || "Priscila Carbone",
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
          full_name: form.full_name,
          birth_date: form.birth_date || null,
          school: form.school || null,
          grade: form.grade || null,
          main_complaint: form.main_complaint || null,
          status: form.status as any,
          notes: form.notes || null,
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
            full_name: form.guardian_name.trim(),
            phone: form.guardian_phone || null,
            whatsapp: form.guardian_phone || null,
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

      toast.success("Criança cadastrada com sucesso!")
      setForm({
        full_name: "", birth_date: "", school: "", grade: "",
        main_complaint: "", status: "initial_assessment", notes: "",
        guardian_name: "", guardian_relationship: "Mãe", guardian_phone: "",
      })
      onSuccess()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Erro ao cadastrar criança. Verifique os dados.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Criança & Paciente</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Child Information */}
          <div className="space-y-3">
            <Input
              label="Nome completo da Criança *"
              placeholder="Ex: João Silva"
              value={form.full_name}
              onChange={(e) => handleChange("full_name", e.target.value)}
              error={errors.full_name}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Data de nascimento"
                type="date"
                value={form.birth_date}
                onChange={(e) => handleChange("birth_date", e.target.value)}
              />
              <Select
                label="Status Inicial"
                options={STATUS_OPTIONS}
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Escola"
                placeholder="Ex: Colégio Objetivo"
                value={form.school}
                onChange={(e) => handleChange("school", e.target.value)}
              />
              <Input
                label="Ano / Série"
                placeholder="Ex: 3º ano Fundamental"
                value={form.grade}
                onChange={(e) => handleChange("grade", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-[#19323A]">
                Queixa principal / Motivo
              </label>
              <textarea
                placeholder="Dificuldade de alfabetização, atenção, cálculo..."
                value={form.main_complaint}
                onChange={(e) => handleChange("main_complaint", e.target.value)}
                rows={2}
                className="flex w-full rounded-xl border-2 border-[#D8E5E7] bg-white px-3 py-2 text-sm font-medium resize-none focus-visible:outline-none focus-visible:border-[#245C6B]"
              />
            </div>
          </div>

          {/* Optional Guardian Quick Form */}
          <div className="pt-3 border-t-2 border-[#EEF5F6] space-y-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#245C6B]" />
              <h4 className="text-xs font-black uppercase tracking-wider text-[#19323A]">
                Responsável Principal (Opcional)
              </h4>
            </div>

            <Input
              label="Nome da Mãe, Pai ou Responsável"
              placeholder="Ex: Tereza Limeira"
              value={form.guardian_name}
              onChange={(e) => handleChange("guardian_name", e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Parentesco"
                options={[
                  { value: "Mãe", label: "Mãe" },
                  { value: "Pai", label: "Pai" },
                  { value: "Avó / Avô", label: "Avó / Avô" },
                  { value: "Tia / Tio", label: "Tia / Tio" },
                  { value: "Tutor Legal", label: "Tutor Legal" },
                ]}
                value={form.guardian_relationship}
                onChange={(e) => handleChange("guardian_relationship", e.target.value)}
              />
              <Input
                label="Telefone / WhatsApp"
                placeholder="(11) 98888-8888"
                value={form.guardian_phone}
                onChange={(e) => handleChange("guardian_phone", e.target.value)}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={handleSubmit}>Cadastrar Criança</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
