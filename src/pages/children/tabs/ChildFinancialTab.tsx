import { useState, useEffect } from "react"
import { DollarSign, Plus, CheckCircle, Clock, XCircle, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { formatCurrency, formatDate } from "@/lib/utils"
import toast from "react-hot-toast"
import type { FinancialRecord } from "@/types/database"

interface ChildFinancialTabProps {
  childId: string
}

export function ChildFinancialTab({ childId }: ChildFinancialTabProps) {
  const { professional } = useAuthStore()
  const [records, setRecords] = useState<FinancialRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    amount: "320",
    status: "pending",
    notes: "",
  })

  useEffect(() => {
    loadRecords()
  }, [childId])

  async function loadRecords() {
    setLoading(true)
    const { data } = await supabase
      .from("financial_records")
      .select("*")
      .eq("child_id", childId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })

    setRecords(data || [])
    setLoading(false)
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

  async function toggleStatus(rec: FinancialRecord) {
    const newStatus = rec.status === "paid" ? "pending" : "paid"
    try {
      await supabase
        .from("financial_records")
        .update({
          status: newStatus,
          payment_date: newStatus === "paid" ? new Date().toISOString().split("T")[0] : null,
        })
        .eq("id", rec.id)

      toast.success(newStatus === "paid" ? "Marcado como pago!" : "Marcado como pendente!")
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
          <h2 className="text-lg font-bold">Controle Financeiro</h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe pagamentos, mensalidades e pendências.
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Lançamento
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold text-base">Nenhum lançamento registrado</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Crie cobranças mensais ou lançamentos por sessão.
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Lançar Mensalidade / Sessão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <Card key={r.id} className="hover:border-foreground/30 transition-colors">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">
                      {months[r.month - 1]} / {r.year}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        r.status === "paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {r.status === "paid" ? "Pago" : "Pendente"}
                    </span>
                  </div>
                  {r.payment_date && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pago em: {formatDate(r.payment_date)}
                    </p>
                  )}
                  {r.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5 italic">{r.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-base">{formatCurrency(r.amount)}</span>
                  <Button
                    size="sm"
                    variant={r.status === "paid" ? "outline" : "default"}
                    onClick={() => toggleStatus(r)}
                  >
                    {r.status === "paid" ? "Marcar Pendente" : "Confirmar Pagamento"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border border-border max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold">Novo Lançamento Financeiro</h3>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Mês"
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
              label="Observações"
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
