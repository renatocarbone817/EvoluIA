import { useState, useEffect, useMemo } from "react"
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
  MessageSquare,
  Sparkles,
  CreditCard,
  Building2,
  ShoppingBag,
  Zap,
  Trash2,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Wallet,
  Repeat,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { formatCurrency, formatDate } from "@/lib/utils"
import toast from "react-hot-toast"
import { ConfirmPaymentModal } from "./ConfirmPaymentModal"

interface FinancialRecordWithDetails {
  id: string
  professional_id: string
  child_id: string | null
  month: number
  year: number
  amount: number
  status: "pending" | "paid" | "cancelled"
  payment_date?: string | null
  notes?: string | null
  discount?: number | null
  created_at: string
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
  { value: "Luz, Água & Internet", label: "💡 Luz, Água & Internet" },
  { value: "Marketing & Anúncios", label: "📢 Marketing & Anúncios" },
  { value: "Software, Sistemas & Cursos", label: "💻 Software, Sistemas & Cursos" },
  { value: "Outras Despesas", label: "🏷️ Outras Despesas" },
]

export function FinancialPage() {
  const navigate = useNavigate()
  const { user, professional } = useAuthStore()
  const profId = professional?.id || user?.id

  const [records, setRecords] = useState<FinancialRecordWithDetails[]>([])
  const [children, setChildren] = useState<{ id: string; full_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Month & Year state for full page reactivity
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth)
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [typeFilter, setTypeFilter] = useState<string>("all")

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [entryType, setEntryType] = useState<"income" | "expense">("income")
  const [confirmingRecord, setConfirmingRecord] = useState<FinancialRecordWithDetails | null>(null)
  const [saving, setSaving] = useState(false)

  // Advanced Expense Frequency Form State
  const [expenseRepetition, setExpenseRepetition] = useState<"single" | "recurring" | "installments">("single")
  const [recurringMonthsCount, setRecurringMonthsCount] = useState<number>(12)
  const [installmentsCount, setInstallmentsCount] = useState<number>(6)

  // Form state
  const [formData, setFormData] = useState({
    child_id: "",
    description: "",
    amount: "",
    month: currentMonth,
    year: currentYear,
    category: "Sessões",
    firstMonthStatus: "pending" as "pending" | "paid",
    payment_method: "pix",
    notes: "",
  })

  useEffect(() => {
    if (profId) {
      loadData()
      loadChildren()
    }
  }, [profId])

  async function loadChildren() {
    if (!profId) return
    const { data } = await supabase
      .from("children")
      .select("id, full_name")
      .eq("professional_id", profId)
      .order("full_name")
    setChildren(data || [])
    if (data && data.length > 0 && !formData.child_id) {
      setFormData((prev) => ({ ...prev, child_id: data[0].id }))
    }
  }

  async function loadData() {
    if (!profId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
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

      if (error) throw error
      setRecords((data as any) || [])
    } catch (err) {
      console.error(err)
      toast.error("Erro ao carregar dados financeiros")
    } finally {
      setLoading(false)
    }
  }

  // =========================================================================
  // HELPER: PARSE RECORD DETAILS (INCOME VS EXPENSE, CATEGORY & DESCRIPTION)
  // =========================================================================
  function getRecordInfo(r: FinancialRecordWithDetails) {
    const rawNotes = r.notes || ""

    // Check if expense
    if (rawNotes.includes("[DESPESA:") || (!r.child_id && !r.child)) {
      const match = rawNotes.match(/\[DESPESA:\s*([^\]]+)\]\s*(.*)/)
      if (match) {
        return {
          isExpense: true,
          category: match[1].trim(),
          description: match[2].trim() || "Despesa Operacional",
        }
      }
      return {
        isExpense: true,
        category: "Despesas",
        description: rawNotes || "Despesa Operacional",
      }
    }

    // Check if explicit income note
    if (rawNotes.includes("[RECEITA:")) {
      const match = rawNotes.match(/\[RECEITA:\s*([^\]]+)\]\s*(.*)/)
      if (match) {
        return {
          isExpense: false,
          category: match[1].trim(),
          description: match[2].trim() || (r.child?.full_name ? `Sessão - ${r.child.full_name}` : "Atendimento"),
        }
      }
    }

    // Default child session income
    return {
      isExpense: false,
      category: "Sessões",
      description: r.child?.full_name ? `Sessão - ${r.child.full_name}` : rawNotes || "Sessão Psicopedagógica",
    }
  }

  // =========================================================================
  // HANDLE CREATE RECORD (COMPATIBLE WITH SUPABASE DATABASE SCHEMA)
  // =========================================================================
  async function handleCreateRecord(e: React.FormEvent) {
    e.preventDefault()
    if (!profId || !formData.amount) return

    setSaving(true)
    try {
      const rawAmount = parseFloat(formData.amount.replace(",", "."))
      if (isNaN(rawAmount) || rawAmount <= 0) {
        toast.error("Por favor, digite um valor válido.")
        setSaving(false)
        return
      }

      const isIncome = entryType === "income"
      const startMonth = Number(formData.month)
      const startYear = Number(formData.year)

      if (isIncome) {
        // Income entry (Single)
        const noteTag = formData.description
          ? `[RECEITA: ${formData.category || "Sessões"}] ${formData.description}${formData.notes ? ` - ${formData.notes}` : ""}`
          : (formData.notes || null)

        const { error } = await supabase.from("financial_records").insert({
          professional_id: profId,
          child_id: formData.child_id || null,
          month: startMonth,
          year: startYear,
          amount: rawAmount,
          status: formData.firstMonthStatus,
          payment_date: formData.firstMonthStatus === "paid" ? new Date().toISOString().split("T")[0] : null,
          notes: noteTag,
        })

        if (error) throw error
        toast.success("Receita lançada com sucesso!")
      } else {
        // Expense entry (Single, Recurring or Installments)
        const recordsToInsert: any[] = []
        const expCategory = formData.category || "Aluguel & Condomínio"
        const expDesc = formData.description.trim() || "Despesa Operacional"

        if (expenseRepetition === "single") {
          const noteTag = `[DESPESA: ${expCategory}] ${expDesc}${formData.notes ? ` - ${formData.notes}` : ""}`
          recordsToInsert.push({
            professional_id: profId,
            child_id: null,
            month: startMonth,
            year: startYear,
            amount: rawAmount,
            status: formData.firstMonthStatus,
            payment_date: formData.firstMonthStatus === "paid" ? new Date().toISOString().split("T")[0] : null,
            notes: noteTag,
          })
        } else if (expenseRepetition === "recurring") {
          // Generates 1 record for each recurring month
          for (let i = 0; i < recurringMonthsCount; i++) {
            let m = startMonth + i
            let y = startYear
            while (m > 12) {
              m -= 12
              y += 1
            }
            const noteTag = `[DESPESA: ${expCategory}] ${expDesc} (${i + 1}/${recurringMonthsCount} meses)${formData.notes ? ` - ${formData.notes}` : ""}`
            recordsToInsert.push({
              professional_id: profId,
              child_id: null,
              month: m,
              year: y,
              amount: rawAmount,
              status: i === 0 ? formData.firstMonthStatus : "pending",
              payment_date: i === 0 && formData.firstMonthStatus === "paid" ? new Date().toISOString().split("T")[0] : null,
              notes: noteTag,
            })
          }
        } else if (expenseRepetition === "installments") {
          // Generates 1 record for each installment
          const installmentVal = Number((rawAmount / installmentsCount).toFixed(2))
          for (let i = 0; i < installmentsCount; i++) {
            let m = startMonth + i
            let y = startYear
            while (m > 12) {
              m -= 12
              y += 1
            }
            const installmentDesc = `${expDesc} (Parcela ${i + 1}/${installmentsCount})`
            const noteTag = `[DESPESA: ${expCategory}] ${installmentDesc}${formData.notes ? ` - ${formData.notes}` : ""}`
            recordsToInsert.push({
              professional_id: profId,
              child_id: null,
              month: m,
              year: y,
              amount: installmentVal,
              status: i === 0 ? formData.firstMonthStatus : "pending",
              payment_date: i === 0 && formData.firstMonthStatus === "paid" ? new Date().toISOString().split("T")[0] : null,
              notes: noteTag,
            })
          }
        }

        const { error } = await supabase.from("financial_records").insert(recordsToInsert)
        if (error) throw error

        if (expenseRepetition === "recurring") {
          toast.success(`🎉 ${recurringMonthsCount} meses de conta fixa programados com sucesso!`)
        } else if (expenseRepetition === "installments") {
          toast.success(`🎉 Despesa parcelada em ${installmentsCount}x com sucesso!`)
        } else {
          toast.success("Despesa registrada com sucesso!")
        }
      }

      setShowAddModal(false)
      setSelectedMonth(startMonth)
      setSelectedYear(startYear)
      setFormData({
        child_id: children[0]?.id || "",
        description: "",
        amount: "",
        month: startMonth,
        year: startYear,
        category: entryType === "income" ? "Sessões" : "Aluguel & Condomínio",
        firstMonthStatus: "pending",
        payment_method: "pix",
        notes: "",
      })
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Erro ao salvar lançamento financeiro")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteRecord(id: string) {
    if (!confirm("Deseja realmente excluir este lançamento?")) return
    try {
      const { error } = await supabase.from("financial_records").delete().eq("id", id)
      if (error) throw error
      toast.success("Lançamento excluído!")
      setRecords(records.filter((r) => r.id !== id))
    } catch (err) {
      toast.error("Erro ao excluir lançamento")
    }
  }

  function handleSendWhatsApp(record: FinancialRecordWithDetails) {
    const guardian = record.child?.guardians?.[0]?.guardian
    const rawPhone = guardian?.whatsapp || guardian?.phone
    if (!rawPhone) {
      toast.error("Nenhum telefone de responsável cadastrado para este paciente.")
      return
    }

    const cleanPhone = rawPhone.replace(/\D/g, "")
    const defaultTpl = "Olá! 🌟 Passando para enviar a cobrança referente ao acompanhamento de {nome_crianca} do mês de {mes}. Valor: {valor}. Chave PIX: {chave_pix}. Qualquer dúvida estou à disposição!"
    const savedTpl = localStorage.getItem("evoluia_billing_template") || defaultTpl
    const childName = record.child?.full_name || "seu filho(a)"
    const monthName = record.month ? MONTHS[record.month - 1] : MONTHS[new Date().getMonth()]
    const valFormatted = formatCurrency(record.amount)
    const pixKey = (professional as any)?.pix_key || "Não cadastrada"

    const finalMsg = savedTpl
      .replace("{nome_crianca}", childName)
      .replace("{mes}", monthName)
      .replace("{valor}", valFormatted)
      .replace("{chave_pix}", pixKey)

    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(finalMsg)}`, "_blank")
  }

  // =========================================================================
  // REAL REACTIVE CALCULATIONS FOR SELECTED MONTH & YEAR
  // =========================================================================

  // Records for current selected month
  const monthRecords = useMemo(() => {
    return records.filter((r) => {
      const m = Number(r.month) || (new Date(r.created_at).getMonth() + 1)
      const y = Number(r.year) || new Date(r.created_at).getFullYear()
      return m === selectedMonth && y === selectedYear
    })
  }, [records, selectedMonth, selectedYear])

  // Records for previous month
  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear
  const prevMonthRecords = useMemo(() => {
    return records.filter((r) => {
      const m = Number(r.month) || (new Date(r.created_at).getMonth() + 1)
      const y = Number(r.year) || new Date(r.created_at).getFullYear()
      return m === prevMonth && y === prevYear
    })
  }, [records, prevMonth, prevYear])

  // Current Month Totals
  const realTotalIncome = useMemo(() => {
    return monthRecords
      .filter((r) => !getRecordInfo(r).isExpense && r.status !== "cancelled")
      .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)
  }, [monthRecords])

  const realReceivedIncome = useMemo(() => {
    return monthRecords
      .filter((r) => !getRecordInfo(r).isExpense && r.status === "paid")
      .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)
  }, [monthRecords])

  const realPendingIncome = useMemo(() => {
    return monthRecords
      .filter((r) => !getRecordInfo(r).isExpense && r.status === "pending")
      .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)
  }, [monthRecords])

  const realTotalExpense = useMemo(() => {
    return monthRecords
      .filter((r) => getRecordInfo(r).isExpense && r.status !== "cancelled")
      .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)
  }, [monthRecords])

  const realNetResult = realReceivedIncome - realTotalExpense

  // Previous Month Totals
  const prevTotalIncome = useMemo(() => {
    return prevMonthRecords
      .filter((r) => !getRecordInfo(r).isExpense && r.status !== "cancelled")
      .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)
  }, [prevMonthRecords])

  const prevReceivedIncome = useMemo(() => {
    return prevMonthRecords
      .filter((r) => !getRecordInfo(r).isExpense && r.status === "paid")
      .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)
  }, [prevMonthRecords])

  const prevPendingIncome = useMemo(() => {
    return prevMonthRecords
      .filter((r) => !getRecordInfo(r).isExpense && r.status === "pending")
      .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)
  }, [prevMonthRecords])

  const prevTotalExpense = useMemo(() => {
    return prevMonthRecords
      .filter((r) => getRecordInfo(r).isExpense && r.status !== "cancelled")
      .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)
  }, [prevMonthRecords])

  // Growth percentages
  function calcGrowth(curr: number, prev: number) {
    if (prev === 0) return curr > 0 ? "+100%" : "0%"
    const diff = ((curr - prev) / prev) * 100
    const sign = diff >= 0 ? "+" : ""
    return `${sign}${Math.round(diff)}%`
  }

  const incomeGrowth = calcGrowth(realTotalIncome, prevTotalIncome)
  const receivedGrowth = calcGrowth(realReceivedIncome, prevReceivedIncome)
  const pendingGrowth = calcGrowth(realPendingIncome, prevPendingIncome)
  const expenseGrowth = calcGrowth(realTotalExpense, prevTotalExpense)

  // 3. Weekly Cash Flow Breakdown (Sem 1 to Sem 5)
  const weeklyData = useMemo(() => {
    const weeks = [
      { label: "Sem 1", range: [1, 7], inc: 0, exp: 0 },
      { label: "Sem 2", range: [8, 14], inc: 0, exp: 0 },
      { label: "Sem 3", range: [15, 21], inc: 0, exp: 0 },
      { label: "Sem 4", range: [22, 28], inc: 0, exp: 0 },
      { label: "Sem 5", range: [29, 31], inc: 0, exp: 0 },
    ]

    monthRecords.forEach((r) => {
      const d = new Date(r.created_at || r.payment_date || new Date())
      const day = d.getDate()
      const amt = Number(r.amount) || 0
      const isExp = getRecordInfo(r).isExpense
      const targetWeek = weeks.find((w) => day >= w.range[0] && day <= w.range[1]) || weeks[4]
      if (isExp) {
        targetWeek.exp += amt
      } else {
        targetWeek.inc += amt
      }
    })

    const maxVal = Math.max(...weeks.map((w) => Math.max(w.inc, w.exp)), 1)
    return { weeks, maxVal }
  }, [monthRecords])

  // 4. Donut Chart Percentages
  const donutData = useMemo(() => {
    const total = realReceivedIncome + realTotalExpense + realPendingIncome
    if (total === 0) {
      return { pctReceived: 0, pctExpense: 0, pctPending: 0, offset1: 0, offset2: 0, total: 0 }
    }
    const pctReceived = Math.round((realReceivedIncome / total) * 100)
    const pctExpense = Math.round((realTotalExpense / total) * 100)
    const pctPending = Math.max(0, 100 - pctReceived - pctExpense)

    const circumference = 238.76 // 2 * PI * 38
    const offset1 = circumference - (circumference * pctReceived) / 100
    const offset2 = offset1 - (circumference * pctExpense) / 100

    return { pctReceived, pctExpense, pctPending, offset1, offset2, total }
  }, [realReceivedIncome, realTotalExpense, realPendingIncome])

  // 5. Contas a Receber (Pending Incomes for selected month)
  const pendingIncomesList = useMemo(() => {
    return monthRecords.filter((r) => !getRecordInfo(r).isExpense && r.status === "pending")
  }, [monthRecords])

  // 6. Contas a Pagar (Expenses for selected month)
  const payablesList = useMemo(() => {
    return monthRecords.filter((r) => getRecordInfo(r).isExpense)
  }, [monthRecords])

  // 7. Formas de Pagamento Breakdown
  const paymentMethodsBreakdown = useMemo(() => {
    const paidRecords = monthRecords.filter((r) => !getRecordInfo(r).isExpense && r.status === "paid")
    const totalPaid = paidRecords.reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

    let credit = 0
    let pix = 0
    let transfer = 0

    paidRecords.forEach((r) => {
      const amt = Number(r.amount) || 0
      const notesLower = (r.notes || "").toLowerCase()
      if (notesLower.includes("cart") || notesLower.includes("credit")) credit += amt
      else if (notesLower.includes("transf") || notesLower.includes("ted") || notesLower.includes("doc") || notesLower.includes("boleto")) transfer += amt
      else pix += amt // default PIX
    })

    return {
      credit: { amount: credit, pct: totalPaid > 0 ? Math.round((credit / totalPaid) * 100) : 0 },
      pix: { amount: pix, pct: totalPaid > 0 ? Math.round((pix / totalPaid) * 100) : 0 },
      transfer: { amount: transfer, pct: totalPaid > 0 ? Math.round((transfer / totalPaid) * 100) : 0 },
    }
  }, [monthRecords])

  // 8. Filtered Recent Entries for Table
  const filteredRecords = useMemo(() => {
    return monthRecords.filter((r) => {
      const info = getRecordInfo(r)
      const childName = r.child?.full_name || ""
      const matchSearch =
        info.description.toLowerCase().includes(search.toLowerCase()) ||
        childName.toLowerCase().includes(search.toLowerCase()) ||
        info.category.toLowerCase().includes(search.toLowerCase())

      if (!matchSearch) return false
      if (typeFilter === "income") return !info.isExpense
      if (typeFilter === "expense") return info.isExpense
      if (typeFilter === "pending") return r.status === "pending"
      return true
    })
  }, [monthRecords, search, typeFilter])

  return (
    <div className="p-4 md:p-8 max-w-[1550px] mx-auto space-y-6">
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-[#0D2329] tracking-tight">
              Financeiro
            </h1>
            <span className="p-1 rounded-lg bg-[#E8F8F5] text-[#10B981] font-bold text-sm">
              💵
            </span>
          </div>
          <p className="text-sm font-medium text-[#6B7C83]">
            Acompanhe as finanças da sua clínica de forma simples e organizada.
          </p>
        </div>

        {/* Global Month & Year Picker + Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border-2 border-[#D8E5E7] shadow-2xs">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-black bg-transparent text-[#0D2329] px-2 py-1 focus:outline-none cursor-pointer"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-black bg-transparent text-[#0D2329] px-1 py-1 focus:outline-none cursor-pointer border-l border-[#EEF5F6]"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setEntryType("income")
              setFormData((prev) => ({
                ...prev,
                month: selectedMonth,
                year: selectedYear,
                category: "Sessões",
                child_id: children[0]?.id || "",
              }))
              setShowAddModal(true)
            }}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Nova Receita</span>
          </button>

          <button
            onClick={() => {
              setEntryType("expense")
              setFormData((prev) => ({
                ...prev,
                month: selectedMonth,
                year: selectedYear,
                category: "Aluguel & Condomínio",
              }))
              setShowAddModal(true)
            }}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#EF4444] to-[#DC2626] hover:from-[#DC2626] hover:to-[#B91C1C] text-white text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Nova Despesa</span>
          </button>
        </div>
      </div>

      {/* 2. TOP 4 METRIC CARDS WITH REAL SPARKLINES & REAL VALUES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Receita Total */}
        <div className="p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] hover:border-[#10B981] hover:shadow-md transition-all space-y-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#6B7C83]">Receita Total ({MONTHS[selectedMonth - 1]})</p>
              <p className="text-2xl font-black text-[#0D2329] tracking-tight mt-0.5">
                {formatCurrency(realTotalIncome)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#E8F8F5] text-[#10B981] flex items-center justify-center font-black text-base shadow-2xs">
              $
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className={`text-[11px] font-bold flex items-center gap-0.5 ${incomeGrowth.startsWith("-") ? "text-[#EF4444]" : "text-[#10B981]"}`}>
              {incomeGrowth.startsWith("-") ? `↓ ${incomeGrowth.replace("-", "")}` : `↑ ${incomeGrowth}`} em relação ao mês anterior
            </span>
            <svg className="w-20 h-6 stroke-[#10B981] fill-none stroke-[2.5]" viewBox="0 0 100 30">
              <path d="M0,22 Q20,10 40,18 T70,8 T100,3" />
              <circle cx="100" cy="3" r="3" className="fill-[#10B981]" />
            </svg>
          </div>
        </div>

        {/* Receita Recebida */}
        <div className="p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] hover:border-[#7C3AED] hover:shadow-md transition-all space-y-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#6B7C83]">Receita Recebida</p>
              <p className="text-2xl font-black text-[#0D2329] tracking-tight mt-0.5">
                {formatCurrency(realReceivedIncome)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shadow-2xs">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className={`text-[11px] font-bold flex items-center gap-0.5 ${receivedGrowth.startsWith("-") ? "text-[#EF4444]" : "text-[#10B981]"}`}>
              {receivedGrowth.startsWith("-") ? `↓ ${receivedGrowth.replace("-", "")}` : `↑ ${receivedGrowth}`} em relação ao mês anterior
            </span>
            <svg className="w-20 h-6 stroke-[#7C3AED] fill-none stroke-[2.5]" viewBox="0 0 100 30">
              <path d="M0,25 Q25,28 50,15 T80,18 T100,5" />
              <circle cx="100" cy="5" r="3" className="fill-[#7C3AED]" />
            </svg>
          </div>
        </div>

        {/* Receita Pendente */}
        <div className="p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] hover:border-[#F59E0B] hover:shadow-md transition-all space-y-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#6B7C83]">Receita Pendente</p>
              <p className="text-2xl font-black text-[#0D2329] tracking-tight mt-0.5">
                {formatCurrency(realPendingIncome)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#FEF8EC] text-[#F59E0B] flex items-center justify-center shadow-2xs">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className={`text-[11px] font-bold flex items-center gap-0.5 ${pendingGrowth.startsWith("-") ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
              {pendingGrowth.startsWith("-") ? `↓ ${pendingGrowth.replace("-", "")}` : `↑ ${pendingGrowth}`} em relação ao mês anterior
            </span>
            <svg className="w-20 h-6 stroke-[#F59E0B] fill-none stroke-[2.5]" viewBox="0 0 100 30">
              <path d="M0,25 Q30,22 55,18 T80,10 T100,4" />
              <circle cx="100" cy="4" r="3" className="fill-[#F59E0B]" />
            </svg>
          </div>
        </div>

        {/* Despesas Totais */}
        <div className="p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] hover:border-[#0284C7] hover:shadow-md transition-all space-y-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#6B7C83]">Despesas Totais</p>
              <p className="text-2xl font-black text-[#0D2329] tracking-tight mt-0.5">
                {formatCurrency(realTotalExpense)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shadow-2xs">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className={`text-[11px] font-bold flex items-center gap-0.5 ${expenseGrowth.startsWith("+") ? "text-[#EF4444]" : "text-[#10B981]"}`}>
              {expenseGrowth.startsWith("+") ? `↑ ${expenseGrowth}` : `↓ ${expenseGrowth.replace("-", "")}`} em relação ao mês anterior
            </span>
            <svg className="w-20 h-6 stroke-[#0284C7] fill-none stroke-[2.5]" viewBox="0 0 100 30">
              <path d="M0,28 Q20,20 45,22 T75,10 T100,4" />
              <circle cx="100" cy="4" r="3" className="fill-[#0284C7]" />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. CHARTS & SIDEBAR SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ==========================================
            MIDDLE LEFT: FLUXO DE CAIXA REAL (5 COLS)
            ========================================== */}
        <div className="lg:col-span-5 p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-[#0D2329]">Fluxo de Caixa</h2>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-bold bg-[#F7FAFA] border border-[#D8E5E7] rounded-xl px-2.5 py-1 text-[#0D2329] focus:outline-none"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-[#00A896]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#00A896]" /> Receitas
            </span>
            <span className="flex items-center gap-1.5 text-[#7C3AED]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#7C3AED]" /> Despesas
            </span>
          </div>

          {/* Real Grouped Bar Chart SVG */}
          <div className="pt-2">
            <div className="h-48 w-full relative flex items-end justify-between px-3 sm:px-4 pb-4 border-b border-[#EEF5F6]">
              {/* Y-Axis guide lines */}
              <div className="absolute left-0 right-0 top-0 text-[9px] text-[#8CAAB1] border-b border-[#F0F5F6] pointer-events-none">
                {formatCurrency(weeklyData.maxVal)}
              </div>
              <div className="absolute left-0 right-0 top-1/2 text-[9px] text-[#8CAAB1] border-b border-[#F0F5F6] pointer-events-none">
                {formatCurrency(weeklyData.maxVal / 2)}
              </div>

              {/* Bars per Week calculated dynamically */}
              {weeklyData.weeks.map((item, i) => {
                const incHeight = weeklyData.maxVal > 0 ? (item.inc / weeklyData.maxVal) * 100 : 0
                const expHeight = weeklyData.maxVal > 0 ? (item.exp / weeklyData.maxVal) * 100 : 0

                return (
                  <div key={i} className="flex flex-col items-center gap-1 z-10">
                    <div className="flex items-end gap-1.5 h-36">
                      {/* Receitas Bar */}
                      <div
                        style={{ height: `${Math.max(incHeight, 4)}%` }}
                        className="w-4 sm:w-5 bg-[#00A896] rounded-t-md hover:opacity-90 transition-all shadow-2xs group relative cursor-pointer"
                        title={`${item.label} Receitas: ${formatCurrency(item.inc)}`}
                      />
                      {/* Despesas Bar */}
                      <div
                        style={{ height: `${Math.max(expHeight, 4)}%` }}
                        className="w-4 sm:w-5 bg-[#7C3AED] rounded-t-md hover:opacity-90 transition-all shadow-2xs group relative cursor-pointer"
                        title={`${item.label} Despesas: ${formatCurrency(item.exp)}`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-[#8CAAB1] mt-1">{item.label}</span>
                  </div>
                )
              })}
            </div>

            {realTotalIncome === 0 && realTotalExpense === 0 && (
              <p className="text-[11px] text-center text-[#8CAAB1] pt-2 italic">
                Nenhum lançamento registrado em {MONTHS[selectedMonth - 1]} de {selectedYear}.
              </p>
            )}
          </div>
        </div>

        {/* ==========================================
            MIDDLE CENTER: RESUMO DO MÊS (DONUT REAL) (4 COLS)
            ========================================== */}
        <div className="lg:col-span-4 p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-[#0D2329]">Resumo do Mês</h2>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-bold bg-[#F7FAFA] border border-[#D8E5E7] rounded-xl px-2.5 py-1 text-[#0D2329] focus:outline-none"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            {/* Donut Chart SVG calculated dynamically */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#F1F5F9" strokeWidth="12" />

                {donutData.total > 0 && (
                  <>
                    {/* Segment 1: Recebidas */}
                    {donutData.pctReceived > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="none"
                        stroke="#00A896"
                        strokeWidth="12"
                        strokeDasharray="238.76"
                        strokeDashoffset={donutData.offset1}
                        className="transition-all duration-700"
                      />
                    )}

                    {/* Segment 2: Despesas */}
                    {donutData.pctExpense > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="none"
                        stroke="#7C3AED"
                        strokeWidth="12"
                        strokeDasharray="238.76"
                        strokeDashoffset={donutData.offset2}
                        className="transition-all duration-700"
                      />
                    )}

                    {/* Segment 3: Pendências */}
                    {donutData.pctPending > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="12"
                        strokeDasharray="238.76"
                        strokeDashoffset="0"
                        className="transition-all duration-700"
                      />
                    )}
                  </>
                )}
              </svg>

              {/* Center Net Result */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
                <span className="text-[9px] font-bold text-[#8CAAB1] uppercase">Resultado</span>
                <span className={`text-xs font-black mt-0.5 ${realNetResult >= 0 ? "text-[#0D2329]" : "text-[#EF4444]"}`}>
                  {formatCurrency(realNetResult)}
                </span>
                <span className={`text-[9px] font-extrabold mt-0.5 ${realNetResult >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                  {realNetResult >= 0 ? "Líquido +" : "Déficit -"}
                </span>
              </div>
            </div>

            {/* Legend & Breakdown with Real Values */}
            <div className="space-y-3 flex-1 min-w-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0D2329]">
                  <span className="w-2 h-2 rounded-full bg-[#00A896] shrink-0" />
                  <span className="truncate">Receitas Recebidas</span>
                </div>
                <p className="text-xs font-black text-[#00A896] pl-3.5">
                  {formatCurrency(realReceivedIncome)} ({donutData.pctReceived}%)
                </p>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0D2329]">
                  <span className="w-2 h-2 rounded-full bg-[#7C3AED] shrink-0" />
                  <span className="truncate">Despesas</span>
                </div>
                <p className="text-xs font-black text-[#7C3AED] pl-3.5">
                  {formatCurrency(realTotalExpense)} ({donutData.pctExpense}%)
                </p>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0D2329]">
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B] shrink-0" />
                  <span className="truncate">Pendências</span>
                </div>
                <p className="text-xs font-black text-[#F59E0B] pl-3.5">
                  {formatCurrency(realPendingIncome)} ({donutData.pctPending}%)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================
            RIGHT COLUMN: CONTAS A RECEBER / PAGAR REAL (3 COLS)
            ========================================== */}
        <div className="lg:col-span-3 space-y-4">
          {/* Contas a Receber (Real Pendências) */}
          <div className="p-4 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[#0D2329]">Contas a Receber</h3>
              <span onClick={() => setTypeFilter("pending")} className="text-[10px] font-bold text-[#7C3AED] hover:underline cursor-pointer">
                Ver todas
              </span>
            </div>

            {pendingIncomesList.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#8CAAB1] italic bg-[#F7FAFA] rounded-2xl border border-dashed border-[#EEF5F6]">
                Nenhuma pendência em {MONTHS[selectedMonth - 1]} 🎉
              </div>
            ) : (
              <div className="space-y-2">
                {pendingIncomesList.slice(0, 3).map((item) => {
                  const d = new Date(item.created_at || item.payment_date || new Date())
                  const day = d.getDate().toString().padStart(2, "0")
                  const month = MONTHS[d.getMonth()].slice(0, 3).toUpperCase()
                  const info = getRecordInfo(item)

                  return (
                    <div key={item.id} className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-[#F7FAFA] transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#E0F7FA] border border-[#BAE6FD] text-[#00A896] flex flex-col items-center justify-center font-black text-[10px] shrink-0 leading-none">
                          <span>{day}</span>
                          <span className="text-[7px] uppercase">{month}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-[#0D2329] truncate">{info.description}</p>
                          <p className="text-[9px] text-[#8CAAB1] truncate">{info.category}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-[#0D2329]">{formatCurrency(item.amount)}</p>
                        <span className="text-[8px] font-bold px-1.5 py-0.2 bg-[#FEF8EC] text-[#F59E0B] rounded-md">
                          Pendente
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <button
              onClick={() => setTypeFilter("pending")}
              className="w-full pt-1 text-center text-[11px] font-bold text-[#00A896] hover:underline flex items-center justify-center gap-1"
            >
              Ver todas as pendências ({pendingIncomesList.length}) →
            </button>
          </div>

          {/* Contas a Pagar (Real Despesas) */}
          <div className="p-4 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[#0D2329]">Contas a Pagar</h3>
              <span onClick={() => setTypeFilter("expense")} className="text-[10px] font-bold text-[#7C3AED] hover:underline cursor-pointer">
                Ver todas
              </span>
            </div>

            {payablesList.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#8CAAB1] italic bg-[#F7FAFA] rounded-2xl border border-dashed border-[#EEF5F6]">
                Nenhuma despesa em {MONTHS[selectedMonth - 1]}
              </div>
            ) : (
              <div className="space-y-2">
                {payablesList.slice(0, 3).map((item) => {
                  const d = new Date(item.created_at || item.payment_date || new Date())
                  const day = d.getDate().toString().padStart(2, "0")
                  const month = MONTHS[d.getMonth()].slice(0, 3).toUpperCase()
                  const isPaid = item.status === "paid"
                  const info = getRecordInfo(item)

                  return (
                    <div key={item.id} className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-[#F7FAFA] transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#FDF2F8] border border-[#FBCFE8] text-[#DB2777] flex flex-col items-center justify-center font-black text-[10px] shrink-0 leading-none">
                          <span>{day}</span>
                          <span className="text-[7px] uppercase">{month}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-[#0D2329] truncate">{info.description}</p>
                          <p className="text-[9px] text-[#8CAAB1] truncate">{info.category}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-[#0D2329]">{formatCurrency(item.amount)}</p>
                        <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-md ${
                          isPaid ? "bg-[#E8F8F5] text-[#10B981]" : "bg-[#FEF8EC] text-[#F59E0B]"
                        }`}>
                          {isPaid ? "Pago" : "Pendente"}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <button
              onClick={() => setTypeFilter("expense")}
              className="w-full pt-1 text-center text-[11px] font-bold text-[#7C3AED] hover:underline flex items-center justify-center gap-1"
            >
              Ver todas as despesas ({payablesList.length}) →
            </button>
          </div>

          {/* Formas de Pagamento Real */}
          <div className="p-4 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-3">
            <h3 className="text-xs font-black text-[#0D2329]">Formas de Pagamento</h3>
            <div className="space-y-2.5">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#0D2329]">
                  <span className="flex items-center gap-1.5">💳 Cartão de Crédito</span>
                  <span className="text-[#7C3AED]">
                    {formatCurrency(paymentMethodsBreakdown.credit.amount)} ({paymentMethodsBreakdown.credit.pct}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#EDE9FE] rounded-full mt-1">
                  <div
                    style={{ width: `${paymentMethodsBreakdown.credit.pct}%` }}
                    className="h-full bg-[#7C3AED] rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#0D2329]">
                  <span className="flex items-center gap-1.5">💠 PIX</span>
                  <span className="text-[#10B981]">
                    {formatCurrency(paymentMethodsBreakdown.pix.amount)} ({paymentMethodsBreakdown.pix.pct}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#E8F8F5] rounded-full mt-1">
                  <div
                    style={{ width: `${paymentMethodsBreakdown.pix.pct}%` }}
                    className="h-full bg-[#10B981] rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#0D2329]">
                  <span className="flex items-center gap-1.5">🏛️ Transferência / Outros</span>
                  <span className="text-[#0284C7]">
                    {formatCurrency(paymentMethodsBreakdown.transfer.amount)} ({paymentMethodsBreakdown.transfer.pct}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#E0F2FE] rounded-full mt-1">
                  <div
                    style={{ width: `${paymentMethodsBreakdown.transfer.pct}%` }}
                    className="h-full bg-[#0284C7] rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. LANÇAMENTOS RECENTES TABLE & DICA FINANCEIRA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Table of Recent Entries (8 cols) */}
        <div className="lg:col-span-8 p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-[#0D2329]">
                Lançamentos de {MONTHS[selectedMonth - 1]} de {selectedYear}
              </h2>
              <p className="text-xs text-[#8CAAB1]">Extrato completo deste mês</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8CAAB1]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar lançamento..."
                  className="pl-8 pr-3 py-1 text-xs rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white focus:outline-none"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs font-bold bg-[#F7FAFA] border border-[#D8E5E7] rounded-xl px-2.5 py-1 text-[#0D2329]"
              >
                <option value="all">Todos</option>
                <option value="income">Receitas</option>
                <option value="expense">Despesas</option>
                <option value="pending">Pendentes</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#EEF5F6] text-[11px] font-bold text-[#8CAAB1]">
                  <th className="pb-2.5">Data</th>
                  <th className="pb-2.5">Descrição</th>
                  <th className="pb-2.5">Categoria</th>
                  <th className="pb-2.5">Tipo</th>
                  <th className="pb-2.5">Valor</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF5F6]">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-[#8CAAB1]">
                      Nenhum lançamento encontrado em {MONTHS[selectedMonth - 1]} de {selectedYear}.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => {
                    const info = getRecordInfo(record)
                    const isPaid = record.status === "paid"

                    return (
                      <tr key={record.id} className="hover:bg-[#F7FAFA] transition-colors group">
                        <td className="py-3 text-[#6B7C83] font-semibold">
                          {formatDate(record.created_at)}
                        </td>
                        <td className="py-3 font-bold text-[#0D2329] max-w-[200px] truncate">
                          {info.description}
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EAF8FC] text-[#00B4D8]">
                            {info.category}
                          </span>
                        </td>
                        <td className="py-3 font-bold">
                          {!info.isExpense ? (
                            <span className="text-[#10B981] flex items-center gap-0.5">Receita ↑</span>
                          ) : (
                            <span className="text-[#EF4444] flex items-center gap-0.5">Despesa ↓</span>
                          )}
                        </td>
                        <td className="py-3 font-black text-[#0D2329]">
                          {formatCurrency(record.amount)}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPaid
                              ? "bg-[#E8F8F5] text-[#10B981]"
                              : "bg-[#FEF8EC] text-[#F59E0B]"
                          }`}>
                            {isPaid ? (!info.isExpense ? "Recebido" : "Pago") : "Pendente"}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* WhatsApp button if income & has phone */}
                            {!info.isExpense && !isPaid && record.child && (
                              <button
                                onClick={() => handleSendWhatsApp(record)}
                                className="p-1 text-[#10B981] hover:bg-[#E8F8F5] rounded-lg transition-colors"
                                title="Enviar Cobrança WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Confirm Payment button if pending */}
                            {!isPaid && (
                              <button
                                onClick={() => setConfirmingRecord(record)}
                                className="px-2 py-0.5 bg-[#10B981] text-white text-[10px] font-bold rounded-lg hover:bg-[#059669] transition-colors shadow-2xs"
                              >
                                Dar Baixa
                              </button>
                            )}

                            {/* Delete button */}
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
                              className="p-1 text-[#8CAAB1] hover:text-[#EF4444] rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dica Financeira Card (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-3xl bg-gradient-to-r from-[#F3E8FF] via-[#EDE9FE] to-[#FAF5FF] border-2 border-[#DDD6FE] shadow-sm relative overflow-hidden flex flex-col justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 text-2xl">
              🐷
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-black text-[#4C1D95] uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" /> Dica Financeira
              </h3>
              <p className="text-xs text-[#5B21B6] font-medium leading-relaxed">
                Mantenha suas finanças organizadas para investir no que realmente importa: seus pacientes.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/relatorios")}
            className="w-full py-2 bg-[#4338CA] hover:bg-[#3730A3] text-white text-xs font-black rounded-xl shadow-sm active:scale-95 transition-all text-center"
          >
            Ver relatório completo
          </button>
        </div>
      </div>

      {/* =========================================================================
          5. COMPLETE ADVANCED MODAL: NOVO LANÇAMENTO (RECEITA & DESPESA COM RECORRÊNCIA / PARCELAS)
          ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in-50 zoom-in-95 my-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#EEF5F6] pb-3">
              <h3 className="text-base font-black text-[#0D2329]">
                Novo Lançamento Financeiro
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#8CAAB1] hover:text-[#0D2329] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Type Switcher Tabs (Receita vs Despesa) */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F7FAFA] rounded-2xl border border-[#D8E5E7]">
              <button
                type="button"
                onClick={() => {
                  setEntryType("income")
                  setFormData((prev) => ({ ...prev, category: "Sessões" }))
                }}
                className={`py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
                  entryType === "income"
                    ? "bg-[#00A896] text-white shadow-xs"
                    : "text-[#6B7C83] hover:text-[#0D2329]"
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>↙ Receita (Entrada)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEntryType("expense")
                  setFormData((prev) => ({ ...prev, category: "Aluguel & Condomínio" }))
                }}
                className={`py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
                  entryType === "expense"
                    ? "bg-[#D96C6C] text-white shadow-xs"
                    : "text-[#6B7C83] hover:text-[#0D2329]"
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>↗ Despesa (Saída / Contas)</span>
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-4 text-xs">
              {/* If Income: Paciente */}
              {entryType === "income" ? (
                <div>
                  <label className="font-bold text-[#0D2329] block mb-1">Paciente / Criança (Opcional)</label>
                  <select
                    value={formData.child_id}
                    onChange={(e) => setFormData({ ...formData, child_id: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-semibold focus:outline-none focus:border-[#00A896]"
                  >
                    <option value="">Selecione um paciente...</option>
                    {children.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                /* If Expense: Categoria da Despesa */
                <div>
                  <label className="font-bold text-[#0D2329] block mb-1">Categoria da Despesa *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-semibold focus:outline-none focus:border-[#D96C6C]"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Descrição */}
              <div>
                <label className="font-bold text-[#0D2329] block mb-1">
                  {entryType === "income" ? "Descrição da Receita *" : "DESCRIÇÃO DA CONTA OU COMPRA *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={entryType === "income" ? "Ex: Sessão Psicopedagógica, Avaliação..." : "Ex: Aluguel da sala, Bebedouro elétrico, Folhas sulfite..."}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-semibold focus:outline-none focus:bg-white"
                />
              </div>

              {/* FREQUÊNCIA / TIPO DE PAGAMENTO (Para Despesas) */}
              {entryType === "expense" && (
                <div className="p-3 bg-[#F7FAFA] rounded-2xl border border-[#D8E5E7] space-y-2.5">
                  <label className="font-black text-[11px] uppercase tracking-wide text-[#0D2329] block">
                    FREQUÊNCIA / TIPO DE PAGAMENTO:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setExpenseRepetition("single")}
                      className={`p-2 rounded-xl text-center font-bold text-[10px] transition-all border ${
                        expenseRepetition === "single"
                          ? "bg-[#19323A] text-white border-[#19323A] shadow-xs"
                          : "bg-white text-[#6B7C83] border-[#D8E5E7] hover:border-[#19323A]"
                      }`}
                    >
                      <p className="font-black text-xs leading-tight">Apenas este Mês</p>
                      <p className="text-[9px] opacity-80 mt-0.5">(Gasto Único)</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpenseRepetition("recurring")}
                      className={`p-2 rounded-xl text-center font-bold text-[10px] transition-all border ${
                        expenseRepetition === "recurring"
                          ? "bg-[#00B4D8] text-white border-[#00B4D8] shadow-xs"
                          : "bg-white text-[#6B7C83] border-[#D8E5E7] hover:border-[#00B4D8]"
                      }`}
                    >
                      <p className="font-black text-xs leading-tight flex items-center justify-center gap-1">
                        <Repeat className="w-3 h-3" /> Conta Fixa
                      </p>
                      <p className="text-[9px] opacity-80 mt-0.5">(Aluguel/Todo mês)</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpenseRepetition("installments")}
                      className={`p-2 rounded-xl text-center font-bold text-[10px] transition-all border ${
                        expenseRepetition === "installments"
                          ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-xs"
                          : "bg-white text-[#6B7C83] border-[#D8E5E7] hover:border-[#7C3AED]"
                      }`}
                    >
                      <p className="font-black text-xs leading-tight flex items-center justify-center gap-1">
                        <CreditCard className="w-3 h-3" /> Parcelado
                      </p>
                      <p className="text-[9px] opacity-80 mt-0.5">(Ex: em 6x, 10x)</p>
                    </button>
                  </div>

                  {/* Frequency Option Sub-Selectors */}
                  {expenseRepetition === "recurring" && (
                    <div className="pt-1 flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#0D2329]">Repetir por quantos meses?</span>
                      <select
                        value={recurringMonthsCount}
                        onChange={(e) => setRecurringMonthsCount(Number(e.target.value))}
                        className="p-1.5 bg-white border border-[#D8E5E7] rounded-xl font-bold text-xs"
                      >
                        <option value={3}>3 meses</option>
                        <option value={6}>6 meses</option>
                        <option value={12}>12 meses (1 ano)</option>
                        <option value={24}>24 meses (2 anos)</option>
                      </select>
                    </div>
                  )}

                  {expenseRepetition === "installments" && (
                    <div className="pt-1 flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#0D2329]">Número de Parcelas:</span>
                      <select
                        value={installmentsCount}
                        onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                        className="p-1.5 bg-white border border-[#D8E5E7] rounded-xl font-bold text-xs"
                      >
                        {[2, 3, 4, 5, 6, 8, 10, 12, 18, 24].map((num) => (
                          <option key={num} value={num}>{num}x</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Mês de Início & Ano */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0D2329] block mb-1">Mês de Início</label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-semibold focus:outline-none"
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#0D2329] block mb-1">ANO</label>
                  <input
                    type="number"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Valor & Status da 1ª Parcela */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0D2329] block mb-1">
                    {entryType === "expense" && expenseRepetition === "recurring"
                      ? "VALOR MENSAL (R$)"
                      : entryType === "expense" && expenseRepetition === "installments"
                      ? "VALOR TOTAL DA COMPRA (R$)"
                      : "VALOR (R$)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-black text-sm focus:outline-none"
                  />
                  {entryType === "expense" && expenseRepetition === "installments" && formData.amount && (
                    <p className="text-[10px] text-[#7C3AED] font-bold mt-1">
                      = {installmentsCount}x de {formatCurrency(Number(formData.amount) / installmentsCount)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="font-bold text-[#0D2329] block mb-1">
                    {entryType === "income" ? "Status do Pagamento" : "Status da 1ª Parcela / Mês"}
                  </label>
                  <select
                    value={formData.firstMonthStatus}
                    onChange={(e) => setFormData({ ...formData, firstMonthStatus: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-semibold focus:outline-none"
                  >
                    <option value="pending">A Pagar / Receber (Pendente)</option>
                    <option value="paid">Já Pago / Recebido</option>
                  </select>
                </div>
              </div>

              {/* Observações Adicionais */}
              <div>
                <label className="font-bold text-[#0D2329] block mb-1">
                  OBSERVAÇÕES ADICIONAIS (OPCIONAL)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pago via PIX, parcelado no cartão Nubank..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-semibold focus:outline-none"
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-3 border-t border-[#EEF5F6] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#D8E5E7] text-[#6B7C83] font-bold hover:bg-[#F7FAFA]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-5 py-2.5 rounded-xl text-white font-black shadow-sm active:scale-95 transition-all ${
                    entryType === "income"
                      ? "bg-[#00A896] hover:bg-[#008f7f]"
                      : "bg-[#D96C6C] hover:bg-[#c05858]"
                  }`}
                >
                  {saving ? "Registrando..." : entryType === "income" ? "Registrar Receita" : "Registrar Despesa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: CONFIRM PAYMENT (DAR BAIXA) */}
      {confirmingRecord && (
        <ConfirmPaymentModal
          open={!!confirmingRecord}
          record={confirmingRecord}
          onClose={() => setConfirmingRecord(null)}
          onSuccess={() => {
            setConfirmingRecord(null)
            loadData()
          }}
        />
      )}
    </div>
  )
}
