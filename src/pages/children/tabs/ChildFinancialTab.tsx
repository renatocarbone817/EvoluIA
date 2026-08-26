import { useState, useEffect } from "react"
import { DollarSign, Plus, CheckCircle, Clock, XCircle, Trash2, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { formatCurrency, formatDate } from "@/lib/utils"
import toast from "react-hot-toast"
import type { FinancialRecord } from "@/types/database"
import { ConfirmPaymentModal } from "@/pages/financial/ConfirmPaymentModal"

interface ChildFinancialTabProps {
  childId: string
}

export function ChildFinancialTab({ childId }: ChildFinancialTabProps) {
  const { professional } = useAuthStore()
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [confirmingRecord, setConfirmingRecord] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    amount: "350",
    status: "pending",
    notes: "",
  })

  useEffect(() => {
    loadRecords()
  }, [childId])

  async function loadRecords() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from("financial_records")
        .select(`
          *,
          child:children(
            id,
            full_name,
            guardians:guardian_children(
              relationship,
              is_primary,
              guardian:guardians(id, full_name, phone, whatsapp)
            )
          )
        `)
        .eq("child_id", childId)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .order("created_at", { ascending: false })

      setRecords(data || [])
    } finally {
      setLoading(false)
    }
  }

  async function handleAddRecord() {
    if (!professional) return
    setSaving(true)
    try {
      const { error } = await supabase.from("financial_records").insert({
        professional_id: professional.id,
        child_id: childId,
        month: Number(form.month),
        year: Number(form.year),
        amount: Number(form.amount) || 0,
        status: form.status as any,
        payment_date: form.status === "paid" ? new Date().toISOString().split("T")[0] : null,
        notes: form.notes || null,
      })

      if (error) throw error
      toast.success("Lançamento financeiro registrado!")
      setShowAddModal(false)
      loadRecords()
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar lançamento")
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkPending(rec: any) {
    try {
      const { error } = await supabase
        .from("financial_records")
        .update({
          status: "pending",
          payment_date: null,
        })
        .eq("id", rec.id)

      if (error) throw error
      toast.success("Marcado como pendente!")
      loadRecords()
    } catch (err) {
      toast.error("Erro ao atualizar status")
    }
  }

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-[#19323A]">Controle Financeiro</h2>
          <p className="text-xs font-semibold text-[#6B7C83]">
            Acompanhe pagamentos, mensalidades e comprovantes de WhatsApp.
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-1.5 font-bold text-xs">
          <Plus className="w-4 h-4" />
          Novo Lançamento
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[#EEF5F6] animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <Card className="border-2 border-dashed border-[#D8E5E7] text-center py-12">
          <CardContent className="space-y-3">
            <DollarSign className="w-10 h-10 text-[#8DA3A8] mx-auto" />
            <p className="font-black text-base text-[#19323A]">Nenhum lançamento registrado</p>
            <p className="text-xs text-[#6B7C83] max-w-sm mx-auto">
              Crie cobranças mensais ou lançamentos avulsos para este paciente.
            </p>
            <Button onClick={() => setShowAddModal(true)} className="mt-2">
              <Plus className="w-4 h-4 mr-1.5" />
              Lançar Mensalidade
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div
              key={r.id}
              className="p-4 rounded-2xl border-2 border-[#D8E5E7] bg-white hover:border-[#245C6B] transition-all flex items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-[#19323A]">
                    {months[r.month - 1]} / {r.year}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-lg font-black uppercase ${
                      r.status === "paid"
                        ? "bg-[#E8F8F5] text-[#20836F] border border-[#63C7B2]/40"
                        : "bg-[#FEF8EC] text-[#B8871E] border border-[#F4C95D]/50"
                    }`}
                  >
                    {r.status === "paid" ? "Pago" : "Pendente"}
                  </span>
                </div>
                {r.payment_date && (
                  <p className="text-xs font-semibold text-[#6B7C83]">
                    Pago em: {formatDate(r.payment_date)}
                  </p>
                )}
                {r.notes && (
                  <p className="text-xs text-[#8DA3A8] italic">"{r.notes}"</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="font-black text-base text-[#19323A]">{formatCurrency(r.amount)}</span>
                {r.status === "paid" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkPending(r)}
                    className="font-bold text-xs"
                  >
                    Marcar Pendente
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setConfirmingRecord(r)}
                    className="font-black text-xs bg-[#245C6B] hover:bg-[#1B4752] text-white gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#63C7B2]" />
                    Confirmar Pagamento
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation & WhatsApp Modal */}
      <ConfirmPaymentModal
        open={!!confirmingRecord}
        record={confirmingRecord}
        onClose={() => setConfirmingRecord(null)}
        onSuccess={() => {
          setConfirmingRecord(null)
          loadRecords()
        }}
      />

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-[#D8E5E7] max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-black text-[#19323A]">Novo Lançamento Financeiro</h3>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Mês de Referência"
                value={form.month}
                onChange={(e) => setForm({ ...form, month: e.target.value })}
                options={months.map((m, idx) => ({
                  value: String(idx + 1),
                  label: m,
                }))}
              />
              <Input
                label="Ano"
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Valor (R$)"
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              <Select
                label="Status Inicial"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                options={[
                  { value: "pending", label: "Pendente" },
                  { value: "paid", label: "Pago" },
                ]}
              />
            </div>

            <Input
              label="Observações / Detalhes"
              placeholder="Ex: Ref. 4 sessões de agosto..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancelar
              </Button>
              <Button loading={saving} onClick={handleAddRecord}>
                Salvar Lançamento
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
