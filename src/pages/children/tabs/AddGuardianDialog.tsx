import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import {
  UserPlus,
  Users,
  CheckCircle2,
  Loader2,
  HeartHandshake,
  Sparkles,
} from "lucide-react"
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
  const [mode, setMode] = useState<"existing" | "new">("existing")
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
  }, [open, professional?.id])

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
      <DialogContent className="max-w-md w-[95vw] sm:w-full p-0 flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden rounded-3xl border-2 border-[#D8E5E7] bg-white shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-[#EEF5F6] flex items-center gap-3 shrink-0 bg-white">
          <div className="w-11 h-11 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] border-2 border-[#DDD6FE] flex items-center justify-center shrink-0 shadow-xs">
            <HeartHandshake className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <DialogTitle className="text-base sm:text-lg font-black text-[#0D2329]">
              Vincular Responsável
            </DialogTitle>
            <p className="text-xs font-semibold text-[#6B7C83] mt-0.5">
              Conecte pais ou responsáveis à ficha desta criança
            </p>
          </div>
        </DialogHeader>

        <DialogBody className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
          {/* Mode Switcher Tabs */}
          {existingGuardians.length > 0 && (
            <div className="flex p-1 bg-[#F7FAFA] rounded-2xl border-2 border-[#D8E5E7] gap-1">
              <button
                type="button"
                onClick={() => setMode("existing")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  mode === "existing"
                    ? "bg-[#7C3AED] text-white shadow-xs"
                    : "text-[#6B7C83] hover:bg-white/60"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Selecionar Existente</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("new")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  mode === "new"
                    ? "bg-[#7C3AED] text-white shadow-xs"
                    : "text-[#6B7C83] hover:bg-white/60"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Cadastrar Novo</span>
              </button>
            </div>
          )}

          {/* Mode A: Select Existing Guardian */}
          {mode === "existing" && (
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#0D2329]">Responsável Cadastrado *</label>
              <select
                value={selectedGuardianId}
                onChange={(e) => setSelectedGuardianId(e.target.value)}
                className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs"
              >
                {existingGuardians.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.full_name} {g.phone ? `(${g.phone})` : "(sem telefone)"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mode B: Create New Guardian Form */}
          {mode === "new" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-black text-[#0D2329]">Nome Completo *</label>
                <input
                  type="text"
                  placeholder="Ex: Maria da Silva"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0D2329]">Telefone</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0D2329]">WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-[#0D2329]">E-mail</label>
                <input
                  type="email"
                  placeholder="maria@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                />
              </div>
            </div>
          )}

          {/* Relationship Selection */}
          <div className="space-y-1">
            <label className="text-xs font-black text-[#0D2329]">Grau de Parentesco / Relação *</label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
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
            <span>Salvar Vínculo</span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
