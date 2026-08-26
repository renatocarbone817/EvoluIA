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
  TrendingDown,
  AlertCircle,
  Filter,
  AlertTriangle,
  Send,
  MessageSquare,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  ShoppingBag,
  Megaphone,
  Zap,
  Tag,
  Check,
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

const EXPENSE_CATEGORIES = [
  { value: "Aluguel & Condomínio", label: "🏢 Aluguel & Condomínio", icon: Building2 },
  { value: "Materiais, Jogos & Folhas", label: "📚 Materiais, Jogos & Folhas", icon: ShoppingBag },
  { value: "Marketing & Anúncios", label: "📢 Marketing & Anúncios", icon: Megaphone },
  { value: "Luz, Água & Internet", label: "💡 Luz, Água & Internet", icon: Zap },
  { value: "Software, Sistemas & Cursos", label: "💻 Software, Sistemas & Cursos", icon: Tag },
  { value: "Outras Despesas", label: "🏷️ Outras Despesas", icon: DollarSign },
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

  // Type filter: "all" | "income" | "expense" | "pending"
  const [typeFilter, setTypeFilter] = useState<string>("all")

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [entryType, setEntryType] = useState<"income" | "expense">("income")
  const [confirmingRecord, setConfirmingRecord] = useState<FinancialRecordWithDetails | null>(null)
  const [saving, setSaving] = useState(false)

  // Form for new entries
  const [form, setForm] = useState({
    child_id: "",
    expense_category: "Aluguel & Condomínio",
    expense_description: "",
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

  async function handleToggleExpenseStatus(rec: FinancialRecordWithDetails) {
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
      toast.success(newStatus === "paid" ? "Despesa marcada como paga!" : "Despesa marcada como pendente!")
      loadFinancials()
    } catch (err: any) {
      toast.error("Erro ao atualizar despesa")
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
    if (!profId) return
    setSaving(true)
    try {
      if (entryType === "income") {
        if (!form.child_id) {
          toast.error("Selecione um paciente para a receita")
          setSaving(false)
          return
        }

        const { error } = await supabase.from("financial_records").insert({
          professional_id: profId,
          child_id: form.child_id,
          month: Number(form.month),
          year: Number(form.year),
          amount: Number(form.amount) || 0,
          status: form.status as any,
          payment_date: form.status === "paid" ? new Date().toISOString().split("T")[0] : null,
          notes: form.notes || null,
          record_type: "income",
          category: "Mensalidade / Atendimento",
        })
        if (error) throw error
        toast.success("Receita de atendimento lançada com sucesso!")
      } else {
        // Expense entry
        if (!form.expense_description.trim()) {
          toast.error("Digite o nome ou descrição da despesa (ex: Aluguel)")
          setSaving(false)
          return
        }

        const formattedNotes = `[DESPESA: ${form.expense_category}] ${form.expense_description}${form.notes ? ` - ${form.notes}` : ""}`

        const { error } = await supabase.from("financial_records").insert({
          professional_id: profId,
          child_id: null,
          month: Number(form.month),
          year: Number(form.year),
          amount: Number(form.amount) || 0,
          status: form.status as any,
          payment_date: form.status === "paid" ? new Date().toISOString().split("T")[0] : null,
          notes: formattedNotes,
          record_type: "expense",
          category: form.expense_category,
          description: form.expense_description,
        })
        if (error) throw error
        toast.success("Conta / Despesa registrada no fluxo de caixa!")
      }

      setShowAddModal(false)
      loadFinancials()
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar lançamento")
    } finally {
      setSaving(false)
    }
  }

  // Helper to identify if a record is an expense
  function isExpense(r: FinancialRecordWithDetails): boolean {
    if (r.record_type === "expense") return true
    if (!r.child_id && r.notes?.includes("[DESPESA:")) return true
    return false
  }

  // Helper to extract expense label
  function getExpenseInfo(r: FinancialRecordWithDetails) {
    if (r.description) {
      return { category: r.category || "Despesa", desc: r.description }
    }
    if (r.notes?.startsWith("[DESPESA:")) {
      const match = r.notes.match(/\[DESPESA:\s*([^\]]+)\]\s*(.*)/)
      if (match) {
        return { category: match[1], desc: match[2] || "Conta da Clínica" }
      }
    }
    return { category: r.category || "Despesa", desc: r.notes || "Despesa da Clínica" }
  }

  // Metrics for Current Month
  const currentMonthRecords = records.filter(
    (r) => r.month === currentMonth && r.year === currentYear
  )

  const currentMonthIncome = currentMonthRecords
    .filter((r) => !isExpense(r) && r.status === "paid")
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

  const currentMonthExpenses = currentMonthRecords
    .filter((r) => isExpense(r) && r.status === "paid")
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

  const currentMonthNetProfit = currentMonthIncome - currentMonthExpenses

  const currentMonthPendingIncome = currentMonthRecords
    .filter((r) => !isExpense(r) && r.status === "pending")
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

  const currentMonthPendingExpenses = currentMonthRecords
    .filter((r) => isExpense(r) && r.status === "pending")
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

  // Overdue / Late Records
  const overdueRecords = records.filter((r) => {
    if (r.status !== "pending") return false
    if (r.year < currentYear) return true
    if (r.year === currentYear && r.month < currentMonth) return true
    return false
  })
  const overdueIncome = overdueRecords
    .filter((r) => !isExpense(r))
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

  // Filter records based on selected period & type
  const filteredRecords = records.filter((r) => {
    const expense = isExpense(r)

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

    // Type filter
    if (typeFilter === "income" && expense) return false
    if (typeFilter === "expense" && !expense) return false
    if (typeFilter === "pending" && r.status !== "pending") return false
    if (typeFilter === "paid" && r.status !== "paid") return false

    // Search query
    const q = search.toLowerCase().trim()
    if (!q) return true

    const name = r.child?.full_name?.toLowerCase() || ""
    const notes = r.notes?.toLowerCase() || ""
    const cat = r.category?.toLowerCase() || ""
    const desc = r.description?.toLowerCase() || ""
    return name.includes(q) || notes.includes(q) || cat.includes(q) || desc.includes(q)
  })

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#19323A] tracking-tight">
            Controle Financeiro & Fluxo de Caixa
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7C83] mt-1">
            Receitas de atendimentos, despesas da clínica, lucro líquido real e recibos no WhatsApp
          </p>
        </div>

        <Button size="lg" onClick={() => setShowAddModal(true)} className="gap-2 shadow-[0_4px_0_0_#143741]">
          <Plus className="w-5 h-5" />
          Novo Lançamento
        </Button>
      </div>

      {/* KPI Cards Grid - Full Cash Flow Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Receitas Realizadas (Entradas) */}
        <div className="p-5 rounded-2xl border-2 border-[#63C7B2]/40 bg-[#E8F8F5] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#63C7B2] text-[#14282F] flex items-center justify-center font-black">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase text-[#20836F] bg-white px-2 py-0.5 rounded-md border border-[#63C7B2]/30">
              Entradas
            </span>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-[#14282F] tracking-tight">
              {formatCurrency(currentMonthIncome)}
            </p>
            <p className="text-xs font-bold text-[#20836F] mt-1">
              Recebido em {MONTHS[currentMonth - 1]}
            </p>
          </div>
        </div>

        {/* 2. Despesas Realizadas (Saídas) */}
        <div className="p-5 rounded-2xl border-2 border-[#D96C6C]/40 bg-[#FDF0F0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#D96C6C] text-white flex items-center justify-center font-black">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase text-[#D96C6C] bg-white px-2 py-0.5 rounded-md border border-[#D96C6C]/30">
              Despesas / Contas
            </span>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-[#8C2323] tracking-tight">
              {formatCurrency(currentMonthExpenses)}
            </p>
            <p className="text-xs font-bold text-[#D96C6C] mt-1">
              Pago em contas ({MONTHS[currentMonth - 1]})
            </p>
          </div>
        </div>

        {/* 3. Lucro Líquido Real (Receitas - Despesas) */}
        <div
          className={`p-5 rounded-2xl border-2 shadow-xs flex flex-col justify-between ${
            currentMonthNetProfit >= 0
              ? "border-[#245C6B]/40 bg-[#EAF3F5]"
              : "border-[#D96C6C] bg-[#FDF0F0]"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                currentMonthNetProfit >= 0
                  ? "bg-[#245C6B] text-white"
                  : "bg-[#D96C6C] text-white"
              }`}
            >
              {currentMonthNetProfit >= 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                currentMonthNetProfit >= 0
                  ? "bg-white text-[#245C6B] border-[#245C6B]/30"
                  : "bg-white text-[#D96C6C] border-[#D96C6C]/30"
              }`}
            >
              {currentMonthNetProfit >= 0 ? "Mês Positivo! ✨" : "No Vermelho ⚠️"}
            </span>
          </div>
          <div>
            <p
              className={`text-2xl sm:text-3xl font-black tracking-tight ${
                currentMonthNetProfit >= 0 ? "text-[#19323A]" : "text-[#D96C6C]"
              }`}
            >
              {formatCurrency(currentMonthNetProfit)}
            </p>
            <p className="text-xs font-bold text-[#6B7C83] mt-1">
              Lucro Líquido do Mês
            </p>
          </div>
        </div>

        {/* 4. A Receber / Pendências */}
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
              {formatCurrency(currentMonthPendingIncome)}
            </p>
            <p className="text-xs font-bold text-[#8B6514] mt-1">
              Mensalidades pendentes
            </p>
          </div>
        </div>
      </div>

      {/* Period Tabs & Quick Switcher */}
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
            🌐 Todo o Histórico
          </button>
        </div>

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

      {/* Filter Bar: Search + Type Selector (Receitas vs Despesas) */}
      <div className="flex gap-3 flex-wrap bg-white p-3 rounded-2xl border-2 border-[#D8E5E7] shadow-sm">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8DA3A8]" />
          <input
            type="text"
            placeholder="Buscar por paciente, aluguel, fornecedor ou observação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 h-11 rounded-xl border-2 border-[#D8E5E7] bg-[#F7FAFA] text-sm font-semibold text-[#19323A] focus-visible:outline-none focus-visible:border-[#245C6B] focus-visible:bg-white transition-all placeholder:text-[#8DA3A8]"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-11 px-4 rounded-xl border-2 border-[#D8E5E7] bg-[#F7FAFA] text-sm font-bold text-[#19323A] focus-visible:outline-none focus-visible:border-[#245C6B] focus-visible:bg-white transition-all"
        >
          <option value="all">Todas as Movimentações</option>
          <option value="income">🟢 Apenas Receitas (Entradas)</option>
          <option value="expense">🔴 Apenas Despesas (Saídas)</option>
          <option value="pending">⏳ Apenas Pendentes / A Pagar</option>
          <option value="paid">✓ Apenas Quitados</option>
        </select>
      </div>

      {/* Records List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-lg text-[#19323A]">
            {periodFilter === "current_month" && `Movimentações de ${MONTHS[currentMonth - 1]} / ${currentYear}`}
            {periodFilter === "overdue" && `🚨 Cobranças em Atraso`}
            {periodFilter === "custom_month" && `Movimentações de ${MONTHS[selectedMonth - 1]} / ${selectedYear}`}
            {periodFilter === "all" && "Histórico Geral do Consultório"}
          </h2>
          <span className="text-xs font-bold text-[#6B7C83]">
            {filteredRecords.length} registro{filteredRecords.length !== 1 ? "s" : ""}
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
                  ? "🎉 Nenhuma pendência em atraso!"
                  : "Nenhuma movimentação encontrada"}
              </h3>
              <p className="text-xs text-[#6B7C83]">
                {periodFilter === "overdue"
                  ? "Todos os pagamentos de meses anteriores foram quitados."
                  : "Lance uma mensalidade de paciente ou despesa da clínica."}
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
              const expense = isExpense(r)
              const expInfo = expense ? getExpenseInfo(r) : null

              const isOverdue =
                r.status === "pending" &&
                (r.year < currentYear || (r.year === currentYear && r.month < currentMonth))

              const primaryGuardian = r.child?.guardians?.[0]?.guardian

              return (
                <div
                  key={r.id}
                  className={`p-4 sm:p-5 rounded-2xl border-2 bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    expense
                      ? "border-[#D96C6C]/30 hover:border-[#D96C6C]"
                      : isOverdue
                      ? "border-[#D96C6C]/60 hover:border-[#D96C6C] shadow-xs"
                      : "border-[#D8E5E7] hover:border-[#245C6B] hover:shadow-md"
                  }`}
                >
                  {/* Left: Item Title, Tags, Description */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {expense ? (
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-[#FDF0F0] text-[#D96C6C] border border-[#D96C6C]/40 flex items-center justify-center font-bold text-xs">
                            <ArrowUpRight className="w-4 h-4" />
                          </span>
                          <h3 className="font-black text-base text-[#8C2323] truncate">
                            {expInfo?.desc}
                          </h3>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-[#E8F8F5] text-[#20836F] border border-[#63C7B2]/40 flex items-center justify-center font-bold text-xs">
                            <ArrowDownLeft className="w-4 h-4" />
                          </span>
                          <h3
                            onClick={() => r.child_id && navigate(`/criancas/${r.child_id}`)}
                            className="font-black text-base text-[#19323A] hover:text-[#245C6B] hover:underline cursor-pointer truncate"
                          >
                            {r.child?.full_name || "Paciente"}
                          </h3>
                        </div>
                      )}

                      {/* Status / Category Badges */}
                      {expense ? (
                        <span className="text-xs px-2.5 py-0.5 rounded-lg font-black uppercase bg-[#FDF0F0] text-[#D96C6C] border border-[#D96C6C]/30">
                          {expInfo?.category}
                        </span>
                      ) : (
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
                      )}

                      {!expense && primaryGuardian && (
                        <span className="text-xs text-[#6B7C83] font-semibold bg-[#EEF5F6] px-2 py-0.5 rounded-md">
                          👤 {primaryGuardian.full_name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7C83] flex-wrap pl-9">
                      <span>
                        Referência: <strong>{MONTHS[r.month - 1]} / {r.year}</strong>
                      </span>
                      {r.payment_date && (
                        <span>· Quitado em {formatDate(r.payment_date)}</span>
                      )}
                      {!expense && r.notes && (
                        <span className="italic text-[#8DA3A8]">· "{r.notes}"</span>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#EEF5F6]">
                    <span
                      className={`font-black text-lg sm:text-xl ${
                        expense ? "text-[#D96C6C]" : "text-[#20836F]"
                      }`}
                    >
                      {expense ? `- ${formatCurrency(r.amount)}` : `+ ${formatCurrency(r.amount)}`}
                    </span>

                    {expense ? (
                      <Button
                        size="sm"
                        variant={r.status === "paid" ? "outline" : "default"}
                        onClick={() => handleToggleExpenseStatus(r)}
                        className={`font-black text-xs ${
                          r.status === "paid"
                            ? ""
                            : "bg-[#D96C6C] hover:bg-[#C25858] text-white"
                        }`}
                      >
                        {r.status === "paid" ? "Marcar a Pagar" : "Dar Baixa na Conta"}
                      </Button>
                    ) : r.status === "paid" ? (
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

      {/* Unified Add Modal (Receita vs Despesa) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] max-w-md w-full p-6 space-y-4 shadow-xl animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-[#19323A]">Novo Lançamento Financeiro</h3>
            </div>

            {/* Switcher: Receita vs Despesa */}
            <div className="flex bg-[#EEF5F6] p-1 rounded-2xl border-2 border-[#D8E5E7] gap-1">
              <button
                type="button"
                onClick={() => setEntryType("income")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  entryType === "income"
                    ? "bg-[#20836F] text-white shadow-xs"
                    : "text-[#19323A] hover:bg-white/60"
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Receita (Entrada)</span>
              </button>

              <button
                type="button"
                onClick={() => setEntryType("expense")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  entryType === "expense"
                    ? "bg-[#D96C6C] text-white shadow-xs"
                    : "text-[#19323A] hover:bg-white/60"
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Despesa (Saída)</span>
              </button>
            </div>

            {/* Form Fields: Income (Receita) */}
            {entryType === "income" && (
              <div className="space-y-3">
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
                      { value: "pending", label: "Pendente (A Receber)" },
                      { value: "paid", label: "Pago (Já Quitado)" },
                    ]}
                  />
                </div>

                <Input
                  label="Observações / Detalhes"
                  placeholder="Ex: Mensalidade 4 sessões de agosto..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            )}

            {/* Form Fields: Expense (Despesa / Contas da Clínica) */}
            {entryType === "expense" && (
              <div className="space-y-3">
                <Select
                  label="Categoria da Despesa *"
                  value={form.expense_category}
                  onChange={(e) => setForm({ ...form, expense_category: e.target.value })}
                  options={EXPENSE_CATEGORIES.map((c) => ({
                    value: c.value,
                    label: c.label,
                  }))}
                />

                <Input
                  label="Descrição da Conta / Gasto *"
                  placeholder="Ex: Aluguel da sala, Compra de jogos de alfabetização..."
                  value={form.expense_description}
                  onChange={(e) => setForm({ ...form, expense_description: e.target.value })}
                />

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
                    label="Valor da Conta (R$)"
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                  <Select
                    label="Status da Despesa"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    options={[
                      { value: "paid", label: "Pago (Já Quitado)" },
                      { value: "pending", label: "A Pagar (Pendente)" },
                    ]}
                  />
                </div>

                <Input
                  label="Observações Adicionais (Opcional)"
                  placeholder="Ex: Pago via PIX pelo banco Inter..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-[#EEF5F6]">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancelar
              </Button>
              <Button
                loading={saving}
                onClick={handleAddRecord}
                className={entryType === "expense" ? "bg-[#D96C6C] hover:bg-[#C25858] text-white" : ""}
              >
                {entryType === "income" ? "Salvar Receita" : "Registrar Despesa"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
