import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
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
  const [loading, setLoading] = useState(false)
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
    }
  }, [open, child])

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
