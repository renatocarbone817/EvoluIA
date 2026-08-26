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
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.full_name.trim()) errs.full_name = "Nome é obrigatório"
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
      // Ensure professional profile row exists
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

      const { error } = await supabase.from("children").insert({
        professional_id: profId,
        full_name: form.full_name,
        birth_date: form.birth_date || null,
        school: form.school || null,
        grade: form.grade || null,
        main_complaint: form.main_complaint || null,
        status: form.status as any,
        notes: form.notes || null,
      })

      if (error) throw error

      toast.success("Criança cadastrada com sucesso!")
      setForm({
        full_name: "", birth_date: "", school: "", grade: "",
        main_complaint: "", status: "initial_assessment", notes: "",
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Criança</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Input
            label="Nome completo *"
            placeholder="João Silva"
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
              label="Status"
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
            />
          </div>
          <Input
            label="Escola"
            placeholder="Escola Municipal..."
            value={form.school}
            onChange={(e) => handleChange("school", e.target.value)}
          />
          <Input
            label="Ano / Série"
            placeholder="3º ano"
            value={form.grade}
            onChange={(e) => handleChange("grade", e.target.value)}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Queixa principal</label>
            <textarea
              placeholder="Dificuldade de leitura, atenção..."
              value={form.main_complaint}
              onChange={(e) => handleChange("main_complaint", e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={handleSubmit}>Cadastrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
