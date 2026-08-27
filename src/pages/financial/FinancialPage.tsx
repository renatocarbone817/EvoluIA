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
  Repeat,
  Layers,
  Trash2,
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
  { value: "Aluguel & Condomínio", label: "🏢 Aluguel & Condomínio" },
  { value: "Materiais, Jogos & Folhas", label: "📚 Materiais, Jogos & Folhas" },
  { value: "Marketing & Anúncios", label: "📢 Marketing & Anúncios" },
  { value: "Luz, Água & Internet", label: "💡 Luz, Água & Internet" },
  { value: "Software, Sistemas & Cursos", label: "💻 Software, Sistemas & Cursos" },
  { value: "Outras Despesas", label: "🏷️ Outras Despesas" },
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

  // Recurrence for Expense: "single" (avulsa) | "recurring" (aluguel/conta fixa) | "installments" (parcelada)
  const [expenseRepetition, setExpenseRepetition] = useState<"single" | "recurring" | "installments">("single")
  const [recurringMonthsCount, setRecurringMonthsCount] = useState<number>(12) // 12 months default for rent
  const [installmentsCount, setInstallmentsCount] = useState<number>(6) // 6x default for purchases

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

  async function handleDeleteRecord(rec: FinancialRecordWithDetails) {
    const isExp = isExpense(rec)
    const title = isExp ? getExpenseInfo(rec).desc : rec.child?.full_name || "Lançamento"

    if (!confirm(`Deseja realmente excluir o lançamento de "${title}"?`)) return

    try {
      const { error } = await supabase.from("financial_records").delete().eq("id", rec.id)
      if (error) throw error
      toast.success("Lançamento excluído com sucesso!")
      loadFinancials()
    } catch (err: any) {
      toast.error("Erro ao excluir lançamento")
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
        })
        if (error) throw error
        toast.success("Receita lançada com sucesso!")
      } else {
        // Expense entry (Support Single, Recurring, Installments!)
        if (!form.expense_description.trim()) {
          toast.error("Digite o nome da despesa (ex: Aluguel da sala)")
          setSaving(false)
          return
        }

        const startMonth = Number(form.month)
        const startYear = Number(form.year)
        const amountPerMonth = Number(form.amount) || 0

        const recordsToInsert: any[] = []

        if (expenseRepetition === "single") {
          const formattedNotes = `[DESPESA: ${form.expense_category}] ${form.expense_description}${form.notes ? ` - ${form.notes}` : ""}`
          recordsToInsert.push({
            professional_id: profId,
            child_id: null,
            month: startMonth,
            year: startYear,
            amount: amountPerMonth,
            status: form.status as any,
            payment_date: form.status === "paid" ? new Date().toISOString().split("T")[0] : null,
            notes: formattedNotes,
          })
        } else if (expenseRepetition === "recurring") {
          // Recurring fixed expense for N months (e.g. Rent 12 months)
          for (let i = 0; i < recurringMonthsCount; i++) {
            let m = startMonth + i
            let y = startYear
            while (m > 12) {
              m -= 12
              y += 1
            }

            const formattedNotes = `[DESPESA: ${form.expense_category}] ${form.expense_description}${form.notes ? ` - ${form.notes}` : ""}`
            recordsToInsert.push({
              professional_id: profId,
              child_id: null,
              month: m,
              year: y,
              amount: amountPerMonth,
              // Only first month takes initial status, upcoming months are scheduled pending
              status: i === 0 ? (form.status as any) : "pending",
              payment_date: i === 0 && form.status === "paid" ? new Date().toISOString().split("T")[0] : null,
              notes: formattedNotes,
            })
          }
        } else if (expenseRepetition === "installments") {
          // Installments purchase (e.g. Bebedouro 6x)
          for (let i = 0; i < installmentsCount; i++) {
            let m = startMonth + i
            let y = startYear
            while (m > 12) {
              m -= 12
              y += 1
            }

            const installmentDesc = `${form.expense_description} (Parcela ${i + 1}/${installmentsCount})`
            const formattedNotes = `[DESPESA: ${form.expense_category}] ${installmentDesc}${form.notes ? ` - ${form.notes}` : ""}`

            recordsToInsert.push({
              professional_id: profId,
              child_id: null,
              month: m,
              year: y,
              amount: amountPerMonth,
              status: i === 0 ? (form.status as any) : "pending",
              payment_date: i === 0 && form.status === "paid" ? new Date().toISOString().split("T")[0] : null,
              notes: formattedNotes,
            })
          }
        }

        const { error } = await supabase.from("financial_records").insert(recordsToInsert)
        if (error) throw error

        toast.success(
          recordsToInsert.length > 1
            ? `🎉 ${recordsToInsert.length} meses de despesa lançados com sucesso no fluxo de caixa!`
            : "Despesa registrada no fluxo de caixa!"
        )
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

  // Forecast until end of month (Total expected income - Total expected expenses)
  const monthForecastProfit =
    currentMonthIncome + currentMonthPendingIncome - (currentMonthExpenses + currentMonthPendingExpenses)

  // Overdue Records (past months pending)
  const overdueRecords = records.filter((r) => {
    if (r.status !== "pending") return false
    if (r.year < currentYear) return true
    if (r.year === currentYear && r.month < currentMonth) return true
    return false
  })
  const overdueAmount = overdueRecords.reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

  // Future Pending Records (upcoming months)
  const futureRecords = records.filter((r) => {
    if (r.status !== "pending") return false
    if (r.year > currentYear) return true
    if (r.year === currentYear && r.month > currentMonth) return true
    return false
  })
  const futurePendingAmount = futureRecords.reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

  // Total Pending All Time
  const totalPendingAll = overdueAmount + currentMonthPendingIncome + futurePendingAmount

  // Category Expenses Breakdown for Current Month
  const expensesByCategory: Record<string, number> = {}
  currentMonthRecords
    .filter((r) => isExpense(r))
    .forEach((r) => {
      const cat = getExpenseInfo(r).category
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (Number(r.amount) || 0)
    })

  // 6-Month Cash Flow Data for Chart
  const last6MonthsData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const m = d.getMonth() + 1
    const y = d.getFullYear()

    const mRecords = records.filter((r) => r.month === m && r.year === y)
    const income = mRecords
      .filter((r) => !isExpense(r) && r.status === "paid")
      .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)
    const expense = mRecords
      .filter((r) => isExpense(r) && r.status === "paid")
      .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

    return {
      monthLabel: MONTHS[m - 1].slice(0, 3),
      fullMonth: `${MONTHS[m - 1]} / ${y}`,
      income,
      expense,
      profit: income - expense,
      isCurrent: m === currentMonth && y === currentYear,
    }
  })

  const maxChartValue = Math.max(
    ...last6MonthsData.map((d) => Math.max(d.income, d.expense)),
    1000
  )

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
    if (typeFilter === "overdue") {
      const isLate =
        r.status === "pending" &&
        (r.year < currentYear || (r.year === currentYear && r.month < currentMonth))
      if (!isLate) return false
    }
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

  // Counters for quick chips
  const countIncomes = records.filter((r) => !isExpense(r)).length
  const countExpenses = records.filter((r) => isExpense(r)).length
  const countPending = records.filter((r) => r.status === "pending").length
  const countPaid = records.filter((r) => r.status === "paid").length

  return (
    <div className="p-4 md:p-8 max-w-[92%] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#19323A] tracking-tight">
            Controle Financeiro & Fluxo de Caixa
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7C83] mt-1">
            Receitas de atendimentos, contas fixas, previsão do mês e gráficos
          </p>
        </div>

        <Button size="lg" onClick={() => setShowAddModal(true)} className="gap-2 shadow-sm">
          <Plus className="w-5 h-5" />
          Novo Lançamento
        </Button>
      </div>

      {/* KPI Cards Grid - Cash Flow Overview & Detailed Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Receitas Realizadas (Entradas) */}
        <div className="p-4 sm:p-5 rounded-2xl border-2 border-[#63C7B2]/40 bg-[#E8F8F5] shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
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
        <div className="p-4 sm:p-5 rounded-2xl border-2 border-[#D96C6C]/40 bg-[#FDF0F0] shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
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

        {/* 3. Lucro Líquido Real & Previsão do Mês */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border-2 shadow-xs flex flex-col justify-between space-y-3 ${
            currentMonthNetProfit >= 0
              ? "border-[#245C6B]/40 bg-[#EAF3F5]"
              : "border-[#D96C6C] bg-[#FDF0F0]"
          }`}
        >
          <div className="flex items-center justify-between">
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
            <div className="mt-1 pt-1.5 border-t border-[#D8E5E7] flex items-center justify-between text-[11px]">
              <span className="text-[#6B7C83] font-semibold">Previsão final:</span>
              <span className="font-black text-[#245C6B]">{formatCurrency(monthForecastProfit)}</span>
            </div>
          </div>
        </div>

        {/* 4. A Receber Detalhado (Vencido, Este Mês, Futuro) */}
        <div className="p-4 sm:p-5 rounded-2xl border-2 border-[#F4C95D]/60 bg-[#FEF8EC] shadow-xs flex flex-col justify-between space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#F4C95D] text-[#8B6514] flex items-center justify-center font-black">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase text-[#8B6514] bg-white px-2 py-0.5 rounded-md border border-[#F4C95D]/40">
              A Receber Total
            </span>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-[#8B6514] tracking-tight">
              {formatCurrency(totalPendingAll)}
            </p>

            {/* Detailed Sub-deadlines */}
            <div className="mt-2 pt-2 border-t border-[#F4C95D]/40 space-y-1 text-[10px] font-bold">
              {overdueAmount > 0 && (
                <div className="flex items-center justify-between text-[#D96C6C]">
                  <span>🔴 Vencido:</span>
                  <span>{formatCurrency(overdueAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-[#8B6514]">
                <span>🟡 Vence este mês:</span>
                <span>{formatCurrency(currentMonthPendingIncome)}</span>
              </div>
              {futurePendingAmount > 0 && (
                <div className="flex items-center justify-between text-[#6B7C83]">
                  <span>⚪ Futuro / Próx.:</span>
                  <span>{formatCurrency(futurePendingAmount)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Chart & Categories Distribution Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: 6-Month Cash Flow Visual Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border-2 border-[#D8E5E7] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-base text-[#19323A] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#20836F]" />
                <span>Fluxo Financeiro — Últimos 6 Meses</span>
              </h3>
              <p className="text-xs text-[#6B7C83] mt-0.5">
                Comparativo de Receitas (entradas) vs Despesas (saídas)
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-[#20836F]">
                <span className="w-2.5 h-2.5 rounded bg-[#20836F]" />
                Receitas
              </span>
              <span className="flex items-center gap-1.5 text-[#D96C6C]">
                <span className="w-2.5 h-2.5 rounded bg-[#D96C6C]" />
                Despesas
              </span>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-4 pb-2 flex items-end justify-between gap-3 h-44 border-b border-[#EEF5F6]">
            {last6MonthsData.map((m, idx) => {
              const incomeHeight = Math.max((m.income / maxChartValue) * 100, 4)
              const expenseHeight = Math.max((m.expense / maxChartValue) * 100, 4)

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 bg-[#19323A] text-white text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    <p className="font-black">{m.fullMonth}</p>
                    <p className="text-[#63C7B2]">Receitas: {formatCurrency(m.income)}</p>
                    <p className="text-[#FF9B9B]">Despesas: {formatCurrency(m.expense)}</p>
                    <p className="text-white border-t border-white/20 pt-0.5">Lucro: {formatCurrency(m.profit)}</p>
                  </div>

                  <div className="w-full flex items-end justify-center gap-1 h-32">
                    {/* Income Bar */}
                    <div
                      style={{ height: `${incomeHeight}%` }}
                      className={`w-3.5 sm:w-5 rounded-t-md transition-all ${
                        m.isCurrent
                          ? "bg-[#20836F] ring-2 ring-[#63C7B2]"
                          : "bg-[#20836F]/80 hover:bg-[#20836F]"
                      }`}
                    />
                    {/* Expense Bar */}
                    <div
                      style={{ height: `${expenseHeight}%` }}
                      className={`w-3.5 sm:w-5 rounded-t-md transition-all ${
                        m.isCurrent
                          ? "bg-[#D96C6C] ring-2 ring-[#D96C6C]/40"
                          : "bg-[#D96C6C]/80 hover:bg-[#D96C6C]"
                      }`}
                    />
                  </div>

                  <span
                    className={`text-xs font-black capitalize ${
                      m.isCurrent ? "text-[#20836F] underline" : "text-[#6B7C83]"
                    }`}
                  >
                    {m.monthLabel}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Gastos por Categoria no Mês (1 Col) */}
        <div className="bg-white p-5 rounded-2xl border-2 border-[#D8E5E7] shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="font-black text-base text-[#19323A] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#D96C6C]" />
              <span>Gastos por Categoria ({MONTHS[currentMonth - 1]})</span>
            </h3>
            <p className="text-xs text-[#6B7C83] mt-0.5">
              Distribuição das despesas do consultório
            </p>
          </div>

          <div className="space-y-2.5 py-1">
            {Object.keys(expensesByCategory).length === 0 ? (
              <p className="text-xs text-[#8DA3A8] italic text-center py-6">
                Nenhuma despesa registrada neste mês.
              </p>
            ) : (
              Object.entries(expensesByCategory).map(([cat, val], idx) => {
                const pct = currentMonthExpenses > 0 ? Math.round((val / currentMonthExpenses) * 100) : 0
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-[#19323A]">
                      <span className="truncate max-w-[170px]">{cat}</span>
                      <span>{formatCurrency(val)} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-[#EEF5F6] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-[#D96C6C] rounded-full transition-all"
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEntryType("expense")
              setShowAddModal(true)
            }}
            className="w-full text-xs font-bold text-[#D96C6C] border-[#D96C6C]/40 hover:bg-[#FDF0F0]"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Registrar Nova Despesa
          </Button>
        </div>
      </div>

      {/* Period Tabs & Quick Switcher */}
      <div className="space-y-3 bg-white p-3.5 rounded-2xl border-2 border-[#D8E5E7] shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
              🗓️ Outro Mês
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
                className="h-9 px-3 rounded-xl border-2 border-[#D8E5E7] bg-[#F7FAFA] text-xs font-bold text-[#19323A]"
              >
                {MONTHS.map((m, idx) => (
                  <option key={idx} value={idx + 1}>{m}</option>
                ))}
              </select>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-20 h-9 px-3 rounded-xl border-2 border-[#D8E5E7] bg-[#F7FAFA] text-xs font-bold text-[#19323A]"
              />
            </div>
          )}

          {/* Search bar */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8DA3A8]" />
            <input
              type="text"
              placeholder="Buscar por paciente, despesa ou observação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-9 rounded-xl border-2 border-[#D8E5E7] bg-[#F7FAFA] text-xs font-semibold text-[#19323A] focus-visible:outline-none focus-visible:border-[#245C6B] focus-visible:bg-white transition-all placeholder:text-[#8DA3A8]"
            />
          </div>
        </div>

        {/* Type Quick Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 border-t border-[#EEF5F6]">
          <div className="flex items-center gap-1 text-xs font-bold text-[#6B7C83] mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Tipo:</span>
          </div>
          {[
            { id: "all", label: "Todos", count: records.length },
            { id: "income", label: "↑ Receitas", count: countIncomes, dot: "bg-[#20836F]" },
            { id: "expense", label: "↓ Despesas", count: countExpenses, dot: "bg-[#D96C6C]" },
            { id: "pending", label: "⏳ Pendentes", count: countPending, dot: "bg-[#F4C95D]" },
            { id: "paid", label: "✓ Pagos", count: countPaid, dot: "bg-[#245C6B]" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all flex items-center gap-1.5 shrink-0 ${
                typeFilter === f.id
                  ? "bg-[#19323A] text-white border-[#19323A] shadow-xs"
                  : "bg-white text-[#4F6C74] border-[#D8E5E7] hover:border-[#245C6B]"
              }`}
            >
              {f.dot && (
                <span
                  className={`w-2 h-2 rounded-full ${typeFilter === f.id ? "bg-white" : f.dot}`}
                />
              )}
              <span>{f.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  typeFilter === f.id ? "bg-white/20 text-white" : "bg-[#EEF5F6] text-[#6B7C83]"
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* List of Financial Transactions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-[#19323A]">
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
              const rawPhone = primaryGuardian?.whatsapp || primaryGuardian?.phone || ""
              const cleanPhone = rawPhone.replace(/\D/g, "")

              const whatsappMessage = encodeURIComponent(
                `Olá, ${primaryGuardian?.full_name || "tudo bem"}! Passando para lembrar da mensalidade psicopedagógica de ${r.child?.full_name || "seu filho(a)"} referente a ${MONTHS[r.month - 1]}/${r.year} no valor de ${formatCurrency(r.amount)}. Segue nossa chave PIX para pagamento. Qualquer dúvida, estou à disposição!`
              )

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
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#EEF5F6]">
                    <span
                      className={`font-black text-lg sm:text-xl ${
                        expense ? "text-[#D96C6C]" : "text-[#20836F]"
                      }`}
                    >
                      {expense ? `- ${formatCurrency(r.amount)}` : `+ ${formatCurrency(r.amount)}`}
                    </span>

                    {expense ? (
                      <div className="flex items-center gap-1.5">
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
                          {r.status === "paid" ? "Marcar a Pagar" : "Dar Baixa"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRecord(r)}
                          className="text-[#D96C6C] hover:bg-[#FDF0F0] px-2"
                          title="Excluir despesa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : r.status === "paid" ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkPending(r)}
                          className="font-bold text-xs"
                        >
                          Marcar Pendente
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRecord(r)}
                          className="text-[#8DA3A8] hover:text-[#D96C6C] hover:bg-[#FDF0F0] px-2"
                          title="Excluir lançamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/55${cleanPhone}?text=${whatsappMessage}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 bg-[#E8F8F5] text-[#20836F] hover:bg-[#20836F] hover:text-white rounded-xl text-xs font-black flex items-center gap-1 border border-[#63C7B2]/40 transition-all shadow-2xs"
                            title="Enviar cobrança pelo WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5 fill-current" />
                            <span>Cobrar</span>
                          </a>
                        )}

                        <Button
                          size="sm"
                          onClick={() => setConfirmingRecord(r)}
                          className="font-black text-xs bg-[#245C6B] hover:bg-[#1B4752] text-white gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4 text-[#63C7B2]" />
                          Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRecord(r)}
                          className="text-[#8DA3A8] hover:text-[#D96C6C] hover:bg-[#FDF0F0] px-2"
                          title="Excluir lançamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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

      {/* Unified Add Modal (Receita vs Despesas com Recorrência e Parcelamento) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] max-w-lg w-full p-6 space-y-4 shadow-xl animate-in fade-in-50 duration-200 max-h-[85vh] overflow-y-auto">
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
                <span>Despesa (Saída / Contas)</span>
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

            {/* Form Fields: Expense (Despesa / Aluguel / Bebedouro / Contas) */}
            {entryType === "expense" && (
              <div className="space-y-3.5">
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
                  label="Descrição da Conta ou Compra *"
                  placeholder="Ex: Aluguel da sala, Bebedouro elétrico, Folhas sulfite..."
                  value={form.expense_description}
                  onChange={(e) => setForm({ ...form, expense_description: e.target.value })}
                />

                {/* Repetition Selector: Única vs Fixa Mensal (Aluguel) vs Parcelada (Bebedouro) */}
                <div className="p-3.5 rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] space-y-2.5">
                  <label className="text-xs font-black uppercase tracking-wider text-[#19323A] block">
                    Frequência / Tipo de Pagamento:
                  </label>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setExpenseRepetition("single")}
                      className={`py-2 px-2 rounded-xl text-xs font-black border-2 transition-all text-center leading-tight ${
                        expenseRepetition === "single"
                          ? "bg-[#245C6B] text-white border-[#19323A] shadow-xs"
                          : "bg-white text-[#19323A] border-[#D8E5E7] hover:border-[#245C6B]"
                      }`}
                    >
                      Apenas este Mês
                      <span className="block text-[10px] font-normal opacity-80 mt-0.5">(Gasto Único)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpenseRepetition("recurring")}
                      className={`py-2 px-2 rounded-xl text-xs font-black border-2 transition-all text-center leading-tight ${
                        expenseRepetition === "recurring"
                          ? "bg-[#245C6B] text-white border-[#19323A] shadow-xs"
                          : "bg-white text-[#19323A] border-[#D8E5E7] hover:border-[#245C6B]"
                      }`}
                    >
                      🔁 Conta Fixa
                      <span className="block text-[10px] font-normal opacity-80 mt-0.5">(Aluguel/Todo mês)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpenseRepetition("installments")}
                      className={`py-2 px-2 rounded-xl text-xs font-black border-2 transition-all text-center leading-tight ${
                        expenseRepetition === "installments"
                          ? "bg-[#245C6B] text-white border-[#19323A] shadow-xs"
                          : "bg-white text-[#19323A] border-[#D8E5E7] hover:border-[#245C6B]"
                      }`}
                    >
                      💳 Parcelado
                      <span className="block text-[10px] font-normal opacity-80 mt-0.5">(Ex: em 6x, 10x)</span>
                    </button>
                  </div>

                  {/* Sub-options for Recurring (Aluguel) */}
                  {expenseRepetition === "recurring" && (
                    <div className="pt-2 border-t border-[#D8E5E7] space-y-1.5 animate-in fade-in-50 duration-200">
                      <label className="text-xs font-bold text-[#6B7C83]">
                        Lançar automaticamente para os próximos:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { count: 12, label: "12 meses (1 ano)" },
                          { count: 24, label: "24 meses (2 anos)" },
                          { count: 6, label: "6 meses" },
                        ].map((item) => (
                          <button
                            key={item.count}
                            type="button"
                            onClick={() => setRecurringMonthsCount(item.count)}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold border-2 transition-all ${
                              recurringMonthsCount === item.count
                                ? "bg-[#63C7B2] text-[#14282F] border-[#48A894] font-black shadow-xs"
                                : "bg-white text-[#6B7C83] border-[#D8E5E7]"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sub-options for Installments (Bebedouro em 6x) */}
                  {expenseRepetition === "installments" && (
                    <div className="pt-2 border-t border-[#D8E5E7] space-y-1.5 animate-in fade-in-50 duration-200">
                      <label className="text-xs font-bold text-[#6B7C83]">
                        Quantidade de parcelas da compra:
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[2, 3, 4, 6, 8, 10, 12, 18].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setInstallmentsCount(num)}
                            className={`py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                              installmentsCount === num
                                ? "bg-[#63C7B2] text-[#14282F] border-[#48A894] font-black shadow-xs"
                                : "bg-white text-[#6B7C83] border-[#D8E5E7]"
                            }`}
                          >
                            {num}x parcelas
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Mês de Início"
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
                    label={expenseRepetition === "installments" ? "Valor de Cada Parcela (R$)" : "Valor Mensal (R$)"}
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                  <Select
                    label="Status da 1ª Parcela / Mês"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    options={[
                      { value: "paid", label: "Pago (Já Quitado Hoje)" },
                      { value: "pending", label: "A Pagar (Pendente)" },
                    ]}
                  />
                </div>

                <Input
                  label="Observações Adicionais (Opcional)"
                  placeholder="Ex: Pago via PIX, parcelado no cartão Nubank..."
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
                {entryType === "income"
                  ? "Salvar Receita"
                  : expenseRepetition === "recurring"
                  ? `Registrar Despesa (${recurringMonthsCount} meses)`
                  : expenseRepetition === "installments"
                  ? `Registrar Despesa (${installmentsCount}x parcelas)`
                  : "Registrar Despesa"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
