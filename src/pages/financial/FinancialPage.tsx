import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  DollarSign,
  CheckCircle2,
  Clock,
  Calendar,
  Plus,
  Search,
  Users,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Filter,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { formatCurrency, formatDate } from "@/lib/utils"
import toast from "react-hot-toast"
import type { FinancialRecord, Child } from "@/types/database"

interface FinancialRecordWithChild extends FinancialRecord {
  child?: {
    id: string
    full_name: string
  }
}

export function FinancialPage() {
  const navigate = useNavigate()
  const { user, professional } = useAuthStore()
  const [records, setRecords] = useState<FinancialRecordWithChild[]>([])
  const [children, setChildren] = useState<{ id: string; full_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const [form, setForm] = useState({
    child_id: "",
    month: String(currentMonth),
    year: String(currentYear),
    amount: "350",
    status: "pending",
    notes: "",
  })

  const profId = professional?.id || user?.id

  useEffect(() => {
    if (profId) {
      loadFinancials()
      loadChildren()
    }
  }, [profId])

  async function loadFinancials() {
    if (!profId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from("financial_records")
        .select("*, child:children(id, full_name)")
        .eq("professional_id", profId)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .order("created_at", { ascending: false })

      setRecords((data || []) as FinancialRecordWithChild[])
    } finally {
      setLoading(false)
    }
  }

  async function loadChildren() {
    if (!profId) return
    const { data } = await supabase
      .from("children")
      .select("id, full_name")
      .eq("professional_id", profId)
      .order("full_name")

    setChildren(data || [])
    if (data && data.length > 0) {
      setForm((f) => ({ ...f, child_id: data[0].id }))
    }
  }

  async function toggleStatus(rec: FinancialRecordWithChild) {
    const newStatus = rec.status === "paid" ? "pending" : "paid"
    try {
      const { error } = await supabase
        .from("financial_records")
        .update({
          status: newStatus,
          payment_date: newStatus === "paid" ? new Date().toISOString().split("T")[0] : null,
        })
        .eq("id", rec.id)

      if (error) throw error

      toast.success(
        newStatus === "paid"
          ? `Pagamento de ${rec.child?.full_name || "paciente"} confirmado!`
          : "Marcado como pendente!"
      )
      loadFinancials()
    } catch (err: any) {
      toast.error("Erro ao atualizar status do pagamento")
    }
  }

  async function handleAddRecord() {
    if (!profId || !form.child_id) {
      toast.error("Selecione um paciente")
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from("financial_records").insert({
        professional_id: profId,
        child_id: form.child_id,
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
      loadFinancials()
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar lançamento")
    } finally {
      setSaving(false)
    }
  }

  // Monthly stats
  const currentMonthRecords = records.filter(
    (r) => r.month === currentMonth && r.year === currentYear
  )
  const totalReceived = currentMonthRecords
    .filter((r) => r.status === "paid")
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

  const totalPending = currentMonthRecords
    .filter((r) => r.status === "pending")
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

  const totalExpected = totalReceived + totalPending

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ]

  const filteredRecords = records.filter((r) => {
    const matchName = (r.child?.full_name || "").toLowerCase().includes(search.toLowerCase())
    const matchNotes = (r.notes || "").toLowerCase().includes(search.toLowerCase())
    const matchSearch = matchName || matchNotes
    const matchStatus = statusFilter === "all" || r.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#19323A] tracking-tight">
            Controle Financeiro
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7C83] mt-1">
            Acompanhe pagamentos, mensalidades e confirmações em tempo real
          </p>
        </div>

        <Button size="lg" onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-5 h-5" />
          Novo Lançamento
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border-2 border-[#63C7B2]/40 bg-[#E8F8F5] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#63C7B2] text-[#14282F] flex items-center justify-center font-black">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-black uppercase text-[#20836F] bg-white px-2 py-0.5 rounded-md border border-[#63C7B2]/30">
              Recebido
            </span>
          </div>
          <p className="text-3xl font-black text-[#14282F] tracking-tight">
            {formatCurrency(totalReceived)}
          </p>
          <p className="text-xs font-bold text-[#20836F] mt-1">
            Recebido em {months[currentMonth - 1]} / {currentYear}
          </p>
        </div>

        <div className="p-5 rounded-2xl border-2 border-[#F4C95D]/60 bg-[#FEF8EC] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#F4C95D] text-[#8B6514] flex items-center justify-center font-black">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-black uppercase text-[#8B6514] bg-white px-2 py-0.5 rounded-md border border-[#F4C95D]/40">
              Pendente
            </span>
          </div>
          <p className="text-3xl font-black text-[#8B6514] tracking-tight">
            {formatCurrency(totalPending)}
          </p>
          <p className="text-xs font-bold text-[#8B6514] mt-1">
            Pendente em {months[currentMonth - 1]} / {currentYear}
          </p>
        </div>

        <div className="p-5 rounded-2xl border-2 border-[#D8E5E7] bg-white shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF5F6] text-[#245C6B] flex items-center justify-center font-black">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-black uppercase text-[#6B7C83] bg-[#EEF5F6] px-2 py-0.5 rounded-md">
              Total Previsto
            </span>
          </div>
          <p className="text-3xl font-black text-[#19323A] tracking-tight">
            {formatCurrency(totalExpected)}
          </p>
          <p className="text-xs font-bold text-[#6B7C83] mt-1">
            Faturamento total previsto no mês
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-3 flex-wrap bg-white p-3 rounded-2xl border-2 border-[#D8E5E7] shadow-sm">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8DA3A8]" />
          <input
            type="text"
            placeholder="Buscar por paciente ou observação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 h-11 rounded-xl border-2 border-[#D8E5E7] bg-[#F7FAFA] text-sm font-semibold text-[#19323A] focus-visible:outline-none focus-visible:border-[#245C6B] focus-visible:bg-white transition-all"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 px-4 rounded-xl border-2 border-[#D8E5E7] bg-[#F7FAFA] text-sm font-bold text-[#19323A] focus-visible:outline-none focus-visible:border-[#245C6B] focus-visible:bg-white transition-all"
        >
          <option value="all">Todos os status</option>
          <option value="pending">Apenas Pendentes</option>
          <option value="paid">Apenas Pagos</option>
        </select>
      </div>

      {/* Records List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-lg text-[#19323A]">Histórico de Cobranças</h2>
          <span className="text-xs font-bold text-[#6B7C83]">
            {filteredRecords.length} lançamento{filteredRecords.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-white border-2 border-[#D8E5E7] animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <Card className="border-2 border-dashed border-[#D8E5E7] py-12 text-center">
            <CardContent className="space-y-3">
              <DollarSign className="w-10 h-10 text-[#8DA3A8] mx-auto" />
              <h3 className="font-black text-base text-[#19323A]">Nenhum lançamento encontrado</h3>
              <p className="text-xs text-[#6B7C83]">
                Clique no botão abaixo para lançar uma mensalidade ou sessão.
              </p>
              <Button onClick={() => setShowAddModal(true)} className="mt-2">
                <Plus className="w-4 h-4 mr-1.5" />
                Novo Lançamento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((r) => (
              <div
                key={r.id}
                className="p-4 sm:p-5 rounded-2xl border-2 border-[#D8E5E7] bg-white hover:border-[#245C6B] hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left: Child Name, Period, Notes */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3
                      onClick={() => r.child_id && navigate(`/criancas/${r.child_id}`)}
                      className="font-black text-base text-[#19323A] hover:text-[#245C6B] hover:underline cursor-pointer truncate"
                    >
                      {r.child?.full_name || "Paciente"}
                    </h3>

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

                  <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7C83] flex-wrap">
                    <span>
                      Referência: <strong>{months[r.month - 1]} / {r.year}</strong>
                    </span>
                    {r.payment_date && (
                      <span>· Pago em {formatDate(r.payment_date)}</span>
                    )}
                  </div>

                  {r.notes && (
                    <p className="text-xs text-[#8DA3A8] italic line-clamp-1">
                      "{r.notes}"
                    </p>
                  )}
                </div>

                {/* Right: Value & Confirm Payment Button */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#EEF5F6]">
                  <span className="font-black text-lg sm:text-xl text-[#19323A]">
                    {formatCurrency(r.amount)}
                  </span>

                  <Button
                    size="sm"
                    variant={r.status === "paid" ? "outline" : "default"}
                    onClick={() => toggleStatus(r)}
                    className="font-black text-xs min-w-[155px]"
                  >
                    {r.status === "paid" ? (
                      "Marcar Pendente"
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Confirmar Pagamento
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-[#D8E5E7] max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-black text-[#19323A]">Novo Lançamento Financeiro</h3>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-[#19323A]">
                Selecione o Paciente *
              </label>
              {children.length > 0 ? (
                <Select
                  value={form.child_id}
                  onChange={(e) => setForm({ ...form, child_id: e.target.value })}
                  options={children.map((c) => ({
                    value: c.id,
                    label: c.full_name,
                  }))}
                />
              ) : (
                <p className="text-xs text-[#D96C6C] font-bold">Nenhuma criança cadastrada.</p>
              )}
            </div>

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
              placeholder="Ex: Mensalidade 4 sessões de agosto..."
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
