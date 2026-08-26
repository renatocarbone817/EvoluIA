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
  AlertTriangle,
  Send,
  MessageSquare,
  Sparkles,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { formatCurrency, formatDate } from "@/lib/utils"
import toast from "react-hot-toast"
import type { FinancialRecord } from "@/types/database"
import { ConfirmPaymentModal } from "./ConfirmPaymentModal"

interface FinancialRecordWithDetails extends FinancialRecord {
  child?: {
    id: string
    full_name: string
    guardians?: {
      relationship: string | null
      is_primary: boolean
      guardian: {
        id: string
        full_name: string
        phone: string | null
        whatsapp: string | null
      } | null
    }[]
  }
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

export function FinancialPage() {
  const navigate = useNavigate()
  const { user, professional } = useAuthStore()
  const [records, setRecords] = useState<FinancialRecordWithDetails[]>([])
  const [children, setChildren] = useState<{ id: string; full_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  // Period filter: "current_month" | "all" | "overdue" | "custom_month"
  const [periodFilter, setPeriodFilter] = useState<string>("current_month")
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth)
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [confirmingRecord, setConfirmingRecord] = useState<FinancialRecordWithDetails | null>(null)
  const [saving, setSaving] = useState(false)

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
        .eq("professional_id", profId)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .order("created_at", { ascending: false })

      setRecords((data || []) as FinancialRecordWithDetails[])
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

  async function handleMarkPending(rec: FinancialRecordWithDetails) {
    try {
      const { error } = await supabase
        .from("financial_records")
        .update({
          status: "pending",
          payment_date: null,
        })
        .eq("id", rec.id)

      if (error) throw error
      toast.success("Lançamento marcado como pendente!")
      loadFinancials()
    } catch (err: any) {
      toast.error("Erro ao atualizar status")
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

  // 1. Current Month Metrics
  const currentMonthRecords = records.filter(
    (r) => r.month === currentMonth && r.year === currentYear
  )
  const currentMonthReceived = currentMonthRecords
    .filter((r) => r.status === "paid")
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

  const currentMonthPending = currentMonthRecords
    .filter((r) => r.status === "pending")
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

  const currentMonthExpected = currentMonthReceived + currentMonthPending

  // 2. Overdue / Late Records (from past months still pending)
  const overdueRecords = records.filter((r) => {
    if (r.status !== "pending") return false
    if (r.year < currentYear) return true
    if (r.year === currentYear && r.month < currentMonth) return true
    return false
  })
  const totalOverdueAmount = overdueRecords.reduce(
    (acc, r) => acc + (Number(r.amount) || 0),
    0
  )

  // 3. All-time total received
  const allTimeReceived = records
    .filter((r) => r.status === "paid")
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

  // 4. Filter records based on selected period
  const filteredRecords = records.filter((r) => {
    // Period filter
    if (periodFilter === "current_month") {
      if (r.month !== currentMonth || r.year !== currentYear) return false
    } else if (periodFilter === "overdue") {
      const isLate =
        r.status === "pending" &&
        (r.year < currentYear || (r.year === currentYear && r.month < currentMonth))
      if (!isLate) return false
    } else if (periodFilter === "custom_month") {
      if (r.month !== selectedMonth || r.year !== selectedYear) return false
    }

    // Status filter
    if (statusFilter !== "all" && r.status !== statusFilter) return false

    // Search query
    const q = search.toLowerCase().trim()
    if (!q) return true

    const name = r.child?.full_name?.toLowerCase() || ""
    const notes = r.notes?.toLowerCase() || ""
    return name.includes(q) || notes.includes(q)
  })

  // Selected period metrics (for display when viewing a custom month)
  const selectedPeriodRecords =
    periodFilter === "custom_month"
      ? records.filter((r) => r.month === selectedMonth && r.year === selectedYear)
      : currentMonthRecords

  const activePeriodReceived = selectedPeriodRecords
    .filter((r) => r.status === "paid")
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

  const activePeriodPending = selectedPeriodRecords
    .filter((r) => r.status === "pending")
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

  const activePeriodExpected = activePeriodReceived + activePeriodPending

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#19323A] tracking-tight">
            Controle Financeiro
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7C83] mt-1">
            Gestão de mensalidades, cobranças, inadimplência e envio de recibos no WhatsApp
          </p>
        </div>

        <Button size="lg" onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-5 h-5" />
          Novo Lançamento
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Recebido no Mês */}
        <div className="p-5 rounded-2xl border-2 border-[#63C7B2]/40 bg-[#E8F8F5] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#63C7B2] text-[#14282F] flex items-center justify-center font-black">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase text-[#20836F] bg-white px-2 py-0.5 rounded-md border border-[#63C7B2]/30">
              Recebido
            </span>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-[#14282F] tracking-tight">
              {formatCurrency(currentMonthReceived)}
            </p>
            <p className="text-xs font-bold text-[#20836F] mt-1">
              Recebido em {MONTHS[currentMonth - 1]} / {currentYear}
            </p>
          </div>
        </div>

        {/* 2. Pendente no Mês */}
        <div className="p-5 rounded-2xl border-2 border-[#F4C95D]/60 bg-[#FEF8EC] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#F4C95D] text-[#8B6514] flex items-center justify-center font-black">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase text-[#8B6514] bg-white px-2 py-0.5 rounded-md border border-[#F4C95D]/40">
              A Receber
            </span>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-[#8B6514] tracking-tight">
              {formatCurrency(currentMonthPending)}
            </p>
            <p className="text-xs font-bold text-[#8B6514] mt-1">
              Pendente neste mês
            </p>
          </div>
        </div>

        {/* 3. Atrasados de Outros Meses */}
        <div
          onClick={() => setPeriodFilter("overdue")}
          className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
            totalOverdueAmount > 0
              ? "border-[#D96C6C]/60 bg-[#FDF0F0] hover:border-[#D96C6C]"
              : "border-[#D8E5E7] bg-white"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#FDF0F0] text-[#D96C6C] border border-[#D96C6C]/30 flex items-center justify-center font-black">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase text-[#D96C6C] bg-white px-2 py-0.5 rounded-md border border-[#D96C6C]/30">
              {overdueRecords.length} em atraso
            </span>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-[#8C2323] tracking-tight">
              {formatCurrency(totalOverdueAmount)}
            </p>
            <p className="text-xs font-bold text-[#D96C6C] mt-1">
              Atrasados meses anteriores
            </p>
          </div>
        </div>

        {/* 4. Total Acumulado Já Recebido */}
        <div className="p-5 rounded-2xl border-2 border-[#D8E5E7] bg-white shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF5F6] text-[#245C6B] flex items-center justify-center font-black">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase text-[#6B7C83] bg-[#EEF5F6] px-2 py-0.5 rounded-md">
              Total Histórico
            </span>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-[#19323A] tracking-tight">
              {formatCurrency(allTimeReceived)}
            </p>
            <p className="text-xs font-bold text-[#6B7C83] mt-1">
              Total recebido na clínica
            </p>
          </div>
        </div>
      </div>

      {/* Period Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border-2 border-[#D8E5E7] shadow-sm">
        <div className="flex bg-[#EEF5F6] rounded-xl p-1 border-2 border-[#D8E5E7] flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setPeriodFilter("current_month")}
            className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all ${
              periodFilter === "current_month"
                ? "bg-[#245C6B] text-white shadow-xs"
                : "text-[#19323A] hover:bg-white/60"
            }`}
          >
            📅 Mês Atual ({MONTHS[currentMonth - 1]})
          </button>

          <button
            type="button"
            onClick={() => setPeriodFilter("overdue")}
            className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
              periodFilter === "overdue"
                ? "bg-[#D96C6C] text-white shadow-xs"
                : "text-[#D96C6C] hover:bg-[#FDF0F0]"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            🚨 Em Atraso ({overdueRecords.length})
          </button>

          <button
            type="button"
            onClick={() => setPeriodFilter("custom_month")}
            className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all ${
              periodFilter === "custom_month"
                ? "bg-[#245C6B] text-white shadow-xs"
                : "text-[#19323A] hover:bg-white/60"
            }`}
          >
            🗓️ Escolher Outro Mês
          </button>

          <button
            type="button"
            onClick={() => setPeriodFilter("all")}
            className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all ${
              periodFilter === "all"
                ? "bg-[#245C6B] text-white shadow-xs"
                : "text-[#19323A] hover:bg-white/60"
            }`}
          >
            🌐 Todos os Lançamentos
          </button>
        </div>

        {/* Custom Month Selectors if custom_month is active */}
        {periodFilter === "custom_month" && (
          <div className="flex items-center gap-2 animate-in fade-in-50 duration-200">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="h-9 px-3 rounded-lg border-2 border-[#245C6B] bg-white text-xs font-black text-[#245C6B]"
            >
              {MONTHS.map((m, idx) => (
                <option key={idx} value={idx + 1}>{m}</option>
              ))}
            </select>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-9 w-20 px-2 rounded-lg border-2 border-[#245C6B] bg-white text-xs font-black text-[#245C6B]"
            />
          </div>
        )}
      </div>

      {/* Search & Status Filter */}
      <div className="flex gap-3 flex-wrap bg-white p-3 rounded-2xl border-2 border-[#D8E5E7] shadow-sm">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8DA3A8]" />
          <input
            type="text"
            placeholder="Buscar por paciente ou observação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 h-11 rounded-xl border-2 border-[#D8E5E7] bg-[#F7FAFA] text-sm font-semibold text-[#19323A] focus-visible:outline-none focus-visible:border-[#245C6B] focus-visible:bg-white transition-all placeholder:text-[#8DA3A8]"
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
          <h2 className="font-black text-lg text-[#19323A]">
            {periodFilter === "current_month" && `Cobranças de ${MONTHS[currentMonth - 1]} / ${currentYear}`}
            {periodFilter === "overdue" && `🚨 Cobranças em Atraso (Meses Anteriores)`}
            {periodFilter === "custom_month" && `Cobranças de ${MONTHS[selectedMonth - 1]} / ${selectedYear}`}
            {periodFilter === "all" && "Histórico Completo de Cobranças"}
          </h2>
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
              <h3 className="font-black text-base text-[#19323A]">
                {periodFilter === "overdue"
                  ? "🎉 Nenhuma cobrança em atraso! Parabéns!"
                  : "Nenhum lançamento encontrado"}
              </h3>
              <p className="text-xs text-[#6B7C83]">
                {periodFilter === "overdue"
                  ? "Todos os pagamentos de meses anteriores foram quitados."
                  : "Clique no botão abaixo para lançar uma mensalidade ou sessão."}
              </p>
              {periodFilter !== "overdue" && (
                <Button onClick={() => setShowAddModal(true)} className="mt-2">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Novo Lançamento
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((r) => {
              const isOverdue =
                r.status === "pending" &&
                (r.year < currentYear || (r.year === currentYear && r.month < currentMonth))

              const primaryGuardian = r.child?.guardians?.[0]?.guardian

              return (
                <div
                  key={r.id}
                  className={`p-4 sm:p-5 rounded-2xl border-2 bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isOverdue
                      ? "border-[#D96C6C]/60 hover:border-[#D96C6C] shadow-xs"
                      : "border-[#D8E5E7] hover:border-[#245C6B] hover:shadow-md"
                  }`}
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
                            : isOverdue
                            ? "bg-[#FDF0F0] text-[#D96C6C] border border-[#D96C6C]/40"
                            : "bg-[#FEF8EC] text-[#B8871E] border border-[#F4C95D]/50"
                        }`}
                      >
                        {r.status === "paid" ? "Pago" : isOverdue ? "Atrasado" : "Pendente"}
                      </span>

                      {primaryGuardian && (
                        <span className="text-xs text-[#6B7C83] font-semibold bg-[#EEF5F6] px-2 py-0.5 rounded-md">
                          👤 {primaryGuardian.full_name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7C83] flex-wrap">
                      <span>
                        Referência: <strong>{MONTHS[r.month - 1]} / {r.year}</strong>
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

                  {/* Right: Value & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#EEF5F6]">
                    <span className="font-black text-lg sm:text-xl text-[#19323A]">
                      {formatCurrency(r.amount)}
                    </span>

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
              )
            })}
          </div>
        )}
      </div>

      {/* Confirmation & WhatsApp Receipt Modal */}
      <ConfirmPaymentModal
        open={!!confirmingRecord}
        record={confirmingRecord}
        onClose={() => setConfirmingRecord(null)}
        onSuccess={() => {
          setConfirmingRecord(null)
          loadFinancials()
        }}
      />

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
                options={MONTHS.map((m, idx) => ({
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
