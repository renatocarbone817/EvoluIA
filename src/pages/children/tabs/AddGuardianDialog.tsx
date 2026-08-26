import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import toast from "react-hot-toast"
import type { Guardian } from "@/types/database"

interface AddGuardianDialogProps {
  open: boolean
  childId: string
  onClose: () => void
  onSuccess: () => void
}

export function AddGuardianDialog({ open, childId, onClose, onSuccess }: AddGuardianDialogProps) {
  const { professional } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<"existing" | "new">("new")
  const [existingGuardians, setExistingGuardians] = useState<Guardian[]>([])
  const [selectedGuardianId, setSelectedGuardianId] = useState("")
  const [relationship, setRelationship] = useState("Mãe")

  const [form, setForm] = useState({
    full_name: "",
    cpf: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    city: "",
    notes: "",
  })

  useEffect(() => {
    if (open && professional) {
      loadGuardians()
    }
  }, [open, professional])

  async function loadGuardians() {
    const { data } = await supabase
      .from("guardians")
      .select("*")
      .eq("professional_id", professional!.id)
      .order("full_name")
    setExistingGuardians(data || [])
    if (data && data.length > 0) {
      setMode("existing")
      setSelectedGuardianId(data[0].id)
    } else {
      setMode("new")
    }
  }

  async function handleSubmit() {
    const { user, professional } = useAuthStore.getState()
    const profId = professional?.id || user?.id
    if (!profId) {
      toast.error("Sessão não encontrada")
      return
    }
    setLoading(true)
    try {
      let gId = selectedGuardianId

      if (mode === "new") {
        if (!form.full_name.trim()) {
          toast.error("Nome do responsável é obrigatório")
          setLoading(false)
          return
        }

        const { data: newGuardian, error: gError } = await supabase
          .from("guardians")
          .insert({
            professional_id: profId,
            full_name: form.full_name,
            cpf: form.cpf || null,
            phone: form.phone || null,
            whatsapp: form.whatsapp || form.phone || null,
            email: form.email || null,
            address: form.address || null,
            city: form.city || null,
            notes: form.notes || null,
          })
          .select()
          .single()

        if (gError) throw gError
        gId = newGuardian.id
      }

      // Link to child
      const { error: linkError } = await supabase.from("guardian_children").insert({
        child_id: childId,
        guardian_id: gId,
        relationship: relationship,
        is_primary: true,
      })

      if (linkError) throw linkError

      toast.success("Responsável vinculado com sucesso!")
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || "Erro ao vincular responsável")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular Responsável</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {existingGuardians.length > 0 && (
            <div className="flex gap-2 pb-2 border-b border-border">
              <Button
                size="sm"
                type="button"
                variant={mode === "existing" ? "default" : "outline"}
                onClick={() => setMode("existing")}
              >
                Selecionar Existente
              </Button>
              <Button
                size="sm"
                type="button"
                variant={mode === "new" ? "default" : "outline"}
                onClick={() => setMode("new")}
              >
                Criar Novo
              </Button>
            </div>
          )}

          {mode === "existing" && (
            <div className="space-y-3">
              <Select
                label="Responsável Cadastrado"
                value={selectedGuardianId}
                onChange={(e) => setSelectedGuardianId(e.target.value)}
                options={existingGuardians.map((g) => ({
                  value: g.id,
                  label: `${g.full_name} (${g.phone || "sem tel"})`,
                }))}
              />
            </div>
          )}

          {mode === "new" && (
            <div className="space-y-3">
              <Input
                label="Nome completo *"
                placeholder="Ex: Maria da Silva"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Telefone"
                  placeholder="(11) 99999-9999"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <Input
                  label="WhatsApp"
                  placeholder="(11) 99999-9999"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
              </div>
              <Input
                label="E-mail"
                type="email"
                placeholder="maria@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          )}

          <Select
            label="Grau de Parentesco / Relação"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            options={[
              { value: "Mãe", label: "Mãe" },
              { value: "Pai", label: "Pai" },
              { value: "Avó / Avô", label: "Avó / Avô" },
              { value: "Tia / Tio", label: "Tia / Tio" },
              { value: "Tutor Legal", label: "Tutor Legal" },
              { value: "Outro", label: "Outro" },
            ]}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={loading} onClick={handleSubmit}>
            Salvar Vínculo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
