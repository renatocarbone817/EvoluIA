import { useState, useEffect, useMemo, useRef } from "react"
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
  Globe,
  Edit3,
  Eye,
  FileText,
  RotateCcw,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getAccessibleProfessionalIds } from "@/lib/teamAccess"
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
  const [showMobileSearch, setShowMobileSearch] = useState(false)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const currentDay = now.getDate()

  // Month & Year state for charts and indicators
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth)
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)

  // Table Period Scope: "month", "current", "year", "overdue", "all"
  const [tablePeriod, setTablePeriod] = useState<"month" | "current" | "year" | "overdue" | "all">("month")

  // Table Filter Pills
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense" | "pending" | "paid">("all")
  const typeFilterRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    const el = typeFilterRefs.current[typeFilter]
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
    }
  }, [typeFilter])

  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [entryType, setEntryType] = useState<"income" | "expense">("income")
  const [confirmingRecord, setConfirmingRecord] = useState<FinancialRecordWithDetails | null>(null)
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<FinancialRecordWithDetails | null>(null)
  const [editingRecord, setEditingRecord] = useState<FinancialRecordWithDetails | null>(null)
  const [saving, setSaving] = useState(false)

  // Advanced Expense Frequency Form State
  const [expenseRepetition, setExpenseRepetition] = useState<"single" | "recurring" | "installments">("single")
  const [recurringMonthsCount, setRecurringMonthsCount] = useState<number>(12)
  const [installmentsCount, setInstallmentsCount] = useState<number>(6)

  // Form state (with explicit Day selection)
  const [formData, setFormData] = useState({
    child_id: "",
    description: "",
    amount: localStorage.getItem("evoluia_default_price") || (professional as any)?.default_price || "180",
    day: String(currentDay),
    month: currentMonth,
    year: currentYear,
    category: "Sessões",
    firstMonthStatus: "pending" as "pending" | "paid",
    payment_method: "pix",
    notes: "",
  })

  // Edit Form state
  const [editFormData, setEditFormData] = useState({
    description: "",
    amount: "",
    day: String(currentDay),
    month: currentMonth,
    year: currentYear,
    category: "Sessões",
    status: "pending" as "pending" | "paid",
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
      .in("professional_id", getAccessibleProfessionalIds(professional, profId))
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
        .in("professional_id", getAccessibleProfessionalIds(professional, profId))
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
  // HELPER: PARSE RECORD DETAILS & EXACT DAY
  // =========================================================================
  function getRecordDay(r: FinancialRecordWithDetails): number {
    if (r.payment_date) {
      const parts = r.payment_date.split("-")
      if (parts.length === 3) {
        const dNum = Number(parts[2])
        if (dNum >= 1 && dNum <= 31) return dNum
      }
    }
    if (r.created_at) {
      const d = new Date(r.created_at)
      return d.getDate()
    }
    return 10
  }

  function getRecordInfo(r: FinancialRecordWithDetails) {
    const rawNotes = (r.notes || "").trim()

    // 1. DESPESA
    if (rawNotes.includes("[DESPESA:") || (!r.child_id && !r.child && rawNotes.includes("[DESPESA]"))) {
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

    // 2. RECEITA com tag explícita [RECEITA: Categoria] Descrição
    if (rawNotes.includes("[RECEITA:")) {
      const match = rawNotes.match(/\[RECEITA:\s*([^\]]+)\]\s*(.*)/)
      if (match) {
        const cat = match[1].trim()
        const desc = match[2].trim()
        return {
          isExpense: false,
          category: cat,
          description: desc || (r.child?.full_name ? `Atendimento - ${r.child.full_name}` : "Receita"),
        }
      }
    }

    // 2.5. RECEITA de Fechamento de Sessões
    if (rawNotes.toLowerCase().includes("fechamento")) {
      const firstLine = rawNotes.split("\n")[0].trim()
      return {
        isExpense: false,
        category: "Sessões",
        description: r.child?.full_name ? `${firstLine} — ${r.child.full_name}` : firstLine,
      }
    }

    // 3. RECEITA de Sessão automática
    if (rawNotes.toLowerCase().includes("sessão") || rawNotes.toLowerCase().includes("atendimento") || rawNotes.toLowerCase().includes("presença")) {
      return {
        isExpense: false,
        category: "Sessões",
        description: rawNotes.split("\n")[0] || (r.child?.full_name ? `Sessão - ${r.child.full_name}` : "Sessão Psicopedagógica"),
      }
    }

    // 4. Se tiver notas personalizadas (ex: "Livro que o seu filho rasgou"), usar as notas como descrição!
    if (rawNotes) {
      let inferredCat = "Outros"
      const lower = rawNotes.toLowerCase()
      if (lower.includes("livro") || lower.includes("material") || lower.includes("jogo") || lower.includes("rasgou") || lower.includes("danific")) {
        inferredCat = "Material Didático"
      } else if (lower.includes("avalia") || lower.includes("anamnese")) {
        inferredCat = "Avaliações"
      } else if (lower.includes("relat") || lower.includes("devolut")) {
        inferredCat = "Relatórios & Devolutivas"
      } else if (lower.includes("reposi") || lower.includes("extra")) {
        inferredCat = "Reposição / Aula Extra"
      }

      return {
        isExpense: false,
        category: inferredCat,
        description: r.child?.full_name ? `${rawNotes} (${r.child.full_name})` : rawNotes,
      }
    }

    // 5. Default fallback
    return {
      isExpense: false,
      category: "Sessões",
      description: r.child?.full_name ? `Sessão - ${r.child.full_name}` : "Sessão Psicopedagógica",
    }
  }

  // =========================================================================
  // HANDLE CREATE RECORD (WITH EXPLICIT DAY, MONTH & YEAR)
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
      const chosenDay = Math.min(Math.max(Number(formData.day) || 10, 1), 31)
      const startMonth = Number(formData.month)
      const startYear = Number(formData.year)

      if (isIncome) {
        const noteTag = formData.description
          ? `[RECEITA: ${formData.category || "Sessões"}] ${formData.description}${formData.notes ? ` - ${formData.notes}` : ""}`
          : (formData.notes || null)

        const dateObj = new Date(startYear, startMonth - 1, chosenDay, 12, 0, 0)
        const dateStr = dateObj.toISOString()
        const paymentDateStr = `${startYear}-${String(startMonth).padStart(2, "0")}-${String(chosenDay).padStart(2, "0")}`

        const { error } = await supabase.from("financial_records").insert({
          professional_id: profId,
          child_id: formData.child_id || null,
          month: startMonth,
          year: startYear,
          amount: rawAmount,
          status: formData.firstMonthStatus,
          payment_date: formData.firstMonthStatus === "paid" ? paymentDateStr : paymentDateStr,
          notes: noteTag,
          created_at: dateStr,
        })

        if (error) throw error
        toast.success("Receita lançada com sucesso!")
      } else {
        const recordsToInsert: any[] = []
        const expCategory = formData.category || "Aluguel & Condomínio"
        const expDesc = formData.description.trim() || "Despesa Operacional"

        if (expenseRepetition === "single") {
          const noteTag = `[DESPESA: ${expCategory}] ${expDesc}${formData.notes ? ` - ${formData.notes}` : ""}`
          const dateObj = new Date(startYear, startMonth - 1, chosenDay, 12, 0, 0)
          const dateStr = dateObj.toISOString()
          const paymentDateStr = `${startYear}-${String(startMonth).padStart(2, "0")}-${String(chosenDay).padStart(2, "0")}`

          recordsToInsert.push({
            professional_id: profId,
            child_id: null,
            month: startMonth,
            year: startYear,
            amount: rawAmount,
            status: formData.firstMonthStatus,
            payment_date: formData.firstMonthStatus === "paid" ? paymentDateStr : paymentDateStr,
            notes: noteTag,
            created_at: dateStr,
          })
        } else if (expenseRepetition === "recurring") {
          for (let i = 0; i < recurringMonthsCount; i++) {
            let m = startMonth + i
            let y = startYear
            while (m > 12) {
              m -= 12
              y += 1
            }
            const noteTag = `[DESPESA: ${expCategory}] ${expDesc} (${i + 1}/${recurringMonthsCount} meses)${formData.notes ? ` - ${formData.notes}` : ""}`
            const curDateObj = new Date(y, m - 1, chosenDay, 12, 0, 0)
            const curDateStr = curDateObj.toISOString()
            const curPayDate = `${y}-${String(m).padStart(2, "0")}-${String(chosenDay).padStart(2, "0")}`

            recordsToInsert.push({
              professional_id: profId,
              child_id: null,
              month: m,
              year: y,
              amount: rawAmount,
              status: i === 0 ? formData.firstMonthStatus : "pending",
              payment_date: i === 0 && formData.firstMonthStatus === "paid" ? curPayDate : curPayDate,
              notes: noteTag,
              created_at: curDateStr,
            })
          }
        } else if (expenseRepetition === "installments") {
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
            const curDateObj = new Date(y, m - 1, chosenDay, 12, 0, 0)
            const curDateStr = curDateObj.toISOString()
            const curPayDate = `${y}-${String(m).padStart(2, "0")}-${String(chosenDay).padStart(2, "0")}`

            recordsToInsert.push({
              professional_id: profId,
              child_id: null,
              month: m,
              year: y,
              amount: installmentVal,
              status: i === 0 ? formData.firstMonthStatus : "pending",
              payment_date: i === 0 && formData.firstMonthStatus === "paid" ? curPayDate : curPayDate,
              notes: noteTag,
              created_at: curDateStr,
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
        day: String(chosenDay),
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

  // Start editing a record
  function handleStartEdit(record: FinancialRecordWithDetails) {
    const info = getRecordInfo(record)
    const day = getRecordDay(record)
    setEditingRecord(record)
    setEditFormData({
      amount: String(record.amount),
      description: info.description.replace(/\s*\(.*?\)$/, ""),
      category: info.category,
      month: record.month,
      year: record.year,
      day: String(day),
      status: record.status as any,
      notes: record.notes || "",
    })
    setSelectedDetailRecord(null)
  }

  // Save edited record
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingRecord) return
    setSaving(true)
    try {
      const rawAmount = parseFloat(editFormData.amount.replace(",", "."))
      if (isNaN(rawAmount) || rawAmount <= 0) {
        toast.error("Por favor, digite um valor válido.")
        setSaving(false)
        return
      }

      const isExpense = editingRecord.notes?.includes("[DESPESA:") || !editingRecord.child_id
      let finalNotes = editFormData.notes
      if (editFormData.description) {
        if (isExpense) {
          finalNotes = `[DESPESA: ${editFormData.category}] ${editFormData.description}`
        } else {
          finalNotes = `[RECEITA: ${editFormData.category}] ${editFormData.description}`
        }
      }

      const chosenDay = Math.min(Math.max(Number(editFormData.day) || 10, 1), 31)
      const paymentDateStr = `${editFormData.year}-${String(editFormData.month).padStart(2, "0")}-${String(chosenDay).padStart(2, "0")}`

      const { error } = await supabase
        .from("financial_records")
        .update({
          amount: rawAmount,
          month: Number(editFormData.month),
          year: Number(editFormData.year),
          status: editFormData.status as any,
          payment_date: editFormData.status === "paid" ? paymentDateStr : null,
          notes: finalNotes,
        })
        .eq("id", editingRecord.id)

      if (error) throw error
      toast.success("Lançamento atualizado com sucesso! ✨")
      setEditingRecord(null)
      loadData()
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar alterações.")
    } finally {
      setSaving(false)
    }
  }

  // Quick toggle paid <-> pending
  async function handleToggleStatus(record: FinancialRecordWithDetails) {
    const newStatus = record.status === "paid" ? "pending" : "paid"
    const paymentDate = newStatus === "paid" ? new Date().toISOString().split("T")[0] : null
    try {
      const { error } = await supabase
        .from("financial_records")
        .update({ status: newStatus, payment_date: paymentDate })
        .eq("id", record.id)
      if (error) throw error
      toast.success(newStatus === "paid" ? "Lançamento marcado como Pago! ✅" : "Lançamento reaberto como Pendente! ⏳")
      if (selectedDetailRecord && selectedDetailRecord.id === record.id) {
        setSelectedDetailRecord({ ...selectedDetailRecord, status: newStatus, payment_date: paymentDate })
      }
      loadData()
    } catch (err: any) {
      toast.error("Erro ao atualizar status do lançamento.")
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

  const monthRecords = useMemo(() => {
    return records.filter((r) => {
      const m = Number(r.month) || (new Date(r.created_at).getMonth() + 1)
      const y = Number(r.year) || new Date(r.created_at).getFullYear()
      return m === selectedMonth && y === selectedYear
    })
  }, [records, selectedMonth, selectedYear])

  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear
  const prevMonthRecords = useMemo(() => {
    return records.filter((r) => {
      const m = Number(r.month) || (new Date(r.created_at).getMonth() + 1)
      const y = Number(r.year) || new Date(r.created_at).getFullYear()
      return m === prevMonth && y === prevYear
    })
  }, [records, prevMonth, prevYear])

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

  // =========================================================================
  // WEEKLY CASH FLOW BREAKDOWN (ACCURATE BY RECORD'S EXACT DAY)
  // Sem 1: 1-7, Sem 2: 8-14, Sem 3: 15-21, Sem 4: 22-28, Sem 5: 29-31
  // =========================================================================
  const weeklyData = useMemo(() => {
    const weeks = [
      { label: "Sem 1", range: [1, 7], inc: 0, exp: 0 },
      { label: "Sem 2", range: [8, 14], inc: 0, exp: 0 },
      { label: "Sem 3", range: [15, 21], inc: 0, exp: 0 },
      { label: "Sem 4", range: [22, 28], inc: 0, exp: 0 },
      { label: "Sem 5", range: [29, 31], inc: 0, exp: 0 },
    ]

    monthRecords.forEach((r) => {
      const day = getRecordDay(r)
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

  // Donut Chart
  const donutData = useMemo(() => {
    const total = realReceivedIncome + realTotalExpense + realPendingIncome
    if (total === 0) {
      return { pctReceived: 0, pctExpense: 0, pctPending: 0, offset1: 0, offset2: 0, total: 0 }
    }
    const pctReceived = Math.round((realReceivedIncome / total) * 100)
    const pctExpense = Math.round((realTotalExpense / total) * 100)
    const pctPending = Math.max(0, 100 - pctReceived - pctExpense)

    const circumference = 238.76
    const offset1 = circumference - (circumference * pctReceived) / 100
    const offset2 = offset1 - (circumference * pctExpense) / 100

    return { pctReceived, pctExpense, pctPending, offset1, offset2, total }
  }, [realReceivedIncome, realTotalExpense, realPendingIncome])

  // Right column real lists
  const pendingIncomesList = useMemo(() => {
    return monthRecords.filter((r) => !getRecordInfo(r).isExpense && r.status === "pending")
  }, [monthRecords])

  const paymentMethodsBreakdown = useMemo(() => {
    const paidRecords = monthRecords.filter((r) => !getRecordInfo(r).isExpense && r.status === "paid")
    const totalPaid = paidRecords.reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

    let pix = 0
    let credit = 0
    let cash = 0
    let transfer = 0

    paidRecords.forEach((r) => {
      const amt = Number(r.amount) || 0
      const notesLower = (r.notes || "").toLowerCase()

      if (
        notesLower.includes("dinheiro") ||
        notesLower.includes("espécie") ||
        notesLower.includes("especie") ||
        notesLower.includes("cash")
      ) {
        cash += amt
      } else if (
        notesLower.includes("cart") ||
        notesLower.includes("credit") ||
        notesLower.includes("débito") ||
        notesLower.includes("debito") ||
        notesLower.includes("crédito") ||
        notesLower.includes("credito")
      ) {
        credit += amt
      } else if (
        notesLower.includes("transf") ||
        notesLower.includes("ted") ||
        notesLower.includes("doc") ||
        notesLower.includes("boleto") ||
        notesLower.includes("bancár") ||
        notesLower.includes("banco")
      ) {
        transfer += amt
      } else if (notesLower.includes("pix")) {
        pix += amt
      } else {
        // Fallback default
        pix += amt
      }
    })

    return {
      pix: { amount: pix, pct: totalPaid > 0 ? Math.round((pix / totalPaid) * 100) : 0 },
      credit: { amount: credit, pct: totalPaid > 0 ? Math.round((credit / totalPaid) * 100) : 0 },
      cash: { amount: cash, pct: totalPaid > 0 ? Math.round((cash / totalPaid) * 100) : 0 },
      transfer: { amount: transfer, pct: totalPaid > 0 ? Math.round((transfer / totalPaid) * 100) : 0 },
    }
  }, [monthRecords])

  // Available Years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>()
    yearsSet.add(currentYear)

    records.forEach((r) => {
      const y = Number(r.year) || (r.created_at ? new Date(r.created_at).getFullYear() : null)
      if (y && y >= currentYear) {
        yearsSet.add(y)
      }
    })

    return Array.from(yearsSet).sort((a, b) => a - b)
  }, [records, currentYear])

  // Period Scoped Records
  const scopedRecords = useMemo(() => {
    return records.filter((r) => {
      const m = Number(r.month) || (new Date(r.created_at).getMonth() + 1)
      const y = Number(r.year) || new Date(r.created_at).getFullYear()

      if (tablePeriod === "month") {
        return m === selectedMonth && y === selectedYear
      }
      if (tablePeriod === "current") {
        return m === currentMonth && y === currentYear
      }
      if (tablePeriod === "year") {
        return y === currentYear
      }
      if (tablePeriod === "overdue") {
        if (r.status !== "pending") return false
        if (y < currentYear) return true
        if (y === currentYear && m < currentMonth) return true
        return false
      }
      if (tablePeriod === "all") {
        return true
      }
      return true
    })
  }, [records, tablePeriod, selectedMonth, selectedYear, currentMonth, currentYear])

  // Dynamic filter counts
  const filterCounts = useMemo(() => {
    const total = scopedRecords.length
    const incomes = scopedRecords.filter((r) => !getRecordInfo(r).isExpense).length
    const expenses = scopedRecords.filter((r) => getRecordInfo(r).isExpense).length
    const pendings = scopedRecords.filter((r) => r.status === "pending").length
    const paids = scopedRecords.filter((r) => r.status === "paid").length
    const overdueCount = records.filter((r) => {
      if (r.status !== "pending") return false
      const m = Number(r.month) || (new Date(r.created_at).getMonth() + 1)
      const y = Number(r.year) || new Date(r.created_at).getFullYear()
      return y < currentYear || (y === currentYear && m < currentMonth)
    }).length

    return { total, incomes, expenses, pendings, paids, overdueCount }
  }, [scopedRecords, records, currentMonth, currentYear])

  // Categories
  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    scopedRecords.forEach((r) => {
      const info = getRecordInfo(r)
      if (info.category) set.add(info.category)
    })
    return Array.from(set)
  }, [scopedRecords])

  // Final Filtered Records for Table
  const filteredRecords = useMemo(() => {
    return scopedRecords.filter((r) => {
      const info = getRecordInfo(r)
      const childName = r.child?.full_name || ""

      if (typeFilter === "income" && info.isExpense) return false
      if (typeFilter === "expense" && !info.isExpense) return false
      if (typeFilter === "pending" && r.status !== "pending") return false
      if (typeFilter === "paid" && r.status !== "paid") return false

      if (categoryFilter !== "all" && info.category.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false
      }

      const matchSearch =
        info.description.toLowerCase().includes(search.toLowerCase()) ||
        childName.toLowerCase().includes(search.toLowerCase()) ||
        info.category.toLowerCase().includes(search.toLowerCase()) ||
        (r.notes || "").toLowerCase().includes(search.toLowerCase())

      return matchSearch
    })
  }, [scopedRecords, typeFilter, categoryFilter, search])

  // Table summary
  const tableFilteredSum = useMemo(() => {
    let inc = 0
    let exp = 0
    filteredRecords.forEach((r) => {
      const amt = Number(r.amount) || 0
      if (getRecordInfo(r).isExpense) exp += amt
      else inc += amt
    })
    return { inc, exp, count: filteredRecords.length }
  }, [filteredRecords])

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-5">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-[#0D2329] tracking-tight">
              Financeiro
            </h1>
            <span className="p-1 rounded-lg bg-[#E8F8F5] text-[#10B981] font-bold text-sm">
              💵
            </span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-[#081B20]">
            Acompanhe as finanças da sua clínica de forma simples e organizada.
          </p>
        </div>

        {/* Global Month & Year Picker + Action Buttons (Symmetrical & Responsive) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          {/* Seletor Mês / Ano */}
          <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-white p-1.5 rounded-2xl border-2 border-white shadow-sm">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="flex-1 sm:flex-none text-xs font-black bg-transparent text-[#0D2329] px-2 py-1 focus:outline-none cursor-pointer"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-black bg-transparent text-[#0D2329] px-2 py-1 focus:outline-none cursor-pointer border-l-2 border-slate-200"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Botões de Ação Perfeitamente Alinhados (50% cada no celular, lado a lado) */}
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
            <button
              onClick={() => {
                setEntryType("income")
                setFormData((prev) => ({
                  ...prev,
                  month: selectedMonth,
                  year: selectedYear,
                  day: String(new Date().getDate()),
                  category: "Sessões",
                  child_id: children[0]?.id || "",
                }))
                setShowAddModal(true)
              }}
              className="h-10 px-4 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Nova Receita"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nova Receita</span>
            </button>

            <button
              onClick={() => {
                setEntryType("expense")
                setFormData((prev) => ({
                  ...prev,
                  month: selectedMonth,
                  year: selectedYear,
                  day: String(new Date().getDate()),
                  category: "Aluguel & Condomínio",
                }))
                setShowAddModal(true)
              }}
              className="h-10 px-4 rounded-2xl bg-gradient-to-r from-[#EF4444] to-[#DC2626] hover:from-[#DC2626] hover:to-[#B91C1C] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Nova Despesa"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nova Despesa</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. TOP 4 METRIC CARDS WITH REAL VALUES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Receita Total */}
        <div className="p-5 rounded-2xl bg-white border-2 border-white shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-black text-[#0D2329] uppercase tracking-wide">Receita Total ({MONTHS[selectedMonth - 1]})</p>
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
        <div className="p-5 rounded-2xl bg-white border-2 border-white shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-black text-[#0D2329] uppercase tracking-wide">Recebido no Mês</p>
              <p className="text-2xl font-black text-[#10B981] tracking-tight mt-0.5">
                {formatCurrency(realReceivedIncome)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#E8F8F5] text-[#10B981] flex items-center justify-center font-black text-base shadow-2xs">
              ✓
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className={`text-[11px] font-bold flex items-center gap-0.5 ${receivedGrowth.startsWith("-") ? "text-[#EF4444]" : "text-[#10B981]"}`}>
              {receivedGrowth.startsWith("-") ? `↓ ${receivedGrowth.replace("-", "")}` : `↑ ${receivedGrowth}`} vs mês anterior
            </span>
            <svg className="w-20 h-6 stroke-[#10B981] fill-none stroke-[2.5]" viewBox="0 0 100 30">
              <path d="M0,20 Q25,8 50,15 T80,5 T100,2" />
              <circle cx="100" cy="2" r="3" className="fill-[#10B981]" />
            </svg>
          </div>
        </div>

        {/* Receita Pendente */}
        <div className="p-5 rounded-2xl bg-white border-2 border-white shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-black text-[#0D2329] uppercase tracking-wide">A Receber / Pendente</p>
              <p className="text-2xl font-black text-[#F59E0B] tracking-tight mt-0.5">
                {formatCurrency(realPendingIncome)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#FEF8EC] text-[#F59E0B] flex items-center justify-center font-black text-base shadow-2xs">
              ⏳
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-bold text-[#EA580C] flex items-center gap-0.5">
              {pendingGrowth.startsWith("-") ? `↓ ${pendingGrowth.replace("-", "")}` : `↑ ${pendingGrowth}`} vs mês anterior
            </span>
            <svg className="w-20 h-6 stroke-[#F59E0B] fill-none stroke-[2.5]" viewBox="0 0 100 30">
              <path d="M0,15 Q30,25 60,10 T100,18" />
              <circle cx="100" cy="18" r="3" className="fill-[#F59E0B]" />
            </svg>
          </div>
        </div>

        {/* Despesas do Mês */}
        <div className="p-5 rounded-2xl bg-white border-2 border-white shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-black text-[#0D2329] uppercase tracking-wide">Total de Despesas</p>
              <p className="text-2xl font-black text-[#EF4444] tracking-tight mt-0.5">
                {formatCurrency(realTotalExpense)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center font-black text-base shadow-2xs">
              📉
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className={`text-[11px] font-bold flex items-center gap-0.5 ${expenseGrowth.startsWith("+") ? "text-[#EF4444]" : "text-[#10B981]"}`}>
              {expenseGrowth.startsWith("-") ? `↓ ${expenseGrowth.replace("-", "")}` : `${expenseGrowth}`} vs mês anterior
            </span>
            <svg className="w-20 h-6 stroke-[#EF4444] fill-none stroke-[2.5]" viewBox="0 0 100 30">
              <path d="M0,10 Q25,20 50,12 T80,25 T100,28" />
              <circle cx="100" cy="28" r="3" className="fill-[#EF4444]" />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. CHARTS & SIDEBAR SECTION (COMPACT & SEAMLESS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* ==========================================
            MIDDLE LEFT: FLUXO DE CAIXA REAL (5 COLS)
            ========================================== */}
        <div className="lg:col-span-5 p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-3 flex flex-col justify-between">
          <div>
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

            <div className="flex items-center gap-4 text-xs font-bold mt-2">
              <span className="flex items-center gap-1.5 text-[#00A896]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#00A896]" /> Receitas
              </span>
              <span className="flex items-center gap-1.5 text-[#7C3AED]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#7C3AED]" /> Despesas
              </span>
            </div>
          </div>

          {/* Grouped Bar Chart SVG (Sem 1 a Sem 5 de acordo com o Dia exato) */}
          <div className="pt-2">
            <div className="h-44 w-full relative flex items-end justify-between px-3 sm:px-4 pb-3 border-b border-[#EEF5F6]">
              <div className="absolute left-0 right-0 top-0 text-[9px] text-[#8CAAB1] border-b border-[#F0F5F6] pointer-events-none">
                {formatCurrency(weeklyData.maxVal)}
              </div>
              <div className="absolute left-0 right-0 top-1/2 text-[9px] text-[#8CAAB1] border-b border-[#F0F5F6] pointer-events-none">
                {formatCurrency(weeklyData.maxVal / 2)}
              </div>

              {weeklyData.weeks.map((item, i) => {
                const incHeight = weeklyData.maxVal > 0 ? (item.inc / weeklyData.maxVal) * 100 : 0
                const expHeight = weeklyData.maxVal > 0 ? (item.exp / weeklyData.maxVal) * 100 : 0

                return (
                  <div key={i} className="flex flex-col items-center gap-1 z-10">
                    <div className="flex items-end gap-1.5 h-32">
                      <div
                        style={{ height: `${Math.max(incHeight, 4)}%` }}
                        className="w-4 sm:w-5 bg-[#00A896] rounded-t-md hover:opacity-90 transition-all shadow-2xs cursor-pointer"
                        title={`${item.label} (Dias ${item.range[0]}-${item.range[1]}): Receitas ${formatCurrency(item.inc)}`}
                      />
                      <div
                        style={{ height: `${Math.max(expHeight, 4)}%` }}
                        className="w-4 sm:w-5 bg-[#7C3AED] rounded-t-md hover:opacity-90 transition-all shadow-2xs cursor-pointer"
                        title={`${item.label} (Dias ${item.range[0]}-${item.range[1]}): Despesas ${formatCurrency(item.exp)}`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-[#8CAAB1] mt-1">{item.label}</span>
                  </div>
                )
              })}
            </div>

            {realTotalIncome === 0 && realTotalExpense === 0 && (
              <p className="text-[11px] text-center text-[#8CAAB1] pt-1.5 italic">
                Nenhum lançamento em {MONTHS[selectedMonth - 1]}.
              </p>
            )}
          </div>
        </div>

        {/* ==========================================
            MIDDLE CENTER: RESUMO DO MÊS (DONUT REAL) (4 COLS)
            ========================================== */}
        <div className="lg:col-span-4 p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-3 flex flex-col justify-between">
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

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#F1F5F9" strokeWidth="12" />
                {donutData.total > 0 && (
                  <>
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

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
                <span className="text-[8px] font-bold text-[#8CAAB1] uppercase">Resultado</span>
                <span className={`text-xs font-black mt-0.5 ${realNetResult >= 0 ? "text-[#0D2329]" : "text-[#EF4444]"}`}>
                  {formatCurrency(realNetResult)}
                </span>
                <span className={`text-[8px] font-extrabold mt-0.5 ${realNetResult >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                  {realNetResult >= 0 ? "Líquido +" : "Déficit -"}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 flex-1 min-w-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0D2329]">
                  <span className="w-2 h-2 rounded-full bg-[#00A896] shrink-0" />
                  <span className="truncate">Recebidas</span>
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
            RIGHT COLUMN: COMPACT QUICK METRICS (3 COLS)
            ========================================== */}
        <div className="lg:col-span-3 space-y-3 flex flex-col justify-between">
          <div className="p-3.5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[#0D2329]">Pendências de {MONTHS[selectedMonth - 1]}</h3>
              <span
                onClick={() => {
                  setTablePeriod("month")
                  setTypeFilter("pending")
                }}
                className="text-[10px] font-bold text-[#7C3AED] hover:underline cursor-pointer"
              >
                Ver todas ({pendingIncomesList.length})
              </span>
            </div>

            {pendingIncomesList.length === 0 ? (
              <p className="text-[11px] text-[#8CAAB1] italic">Sem pendências a receber 🎉</p>
            ) : (
              <div className="space-y-1.5">
                {pendingIncomesList.slice(0, 2).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs p-1 rounded-lg hover:bg-[#F7FAFA]">
                    <span className="font-bold text-[#0D2329] truncate max-w-[130px]">{getRecordInfo(item).description}</span>
                    <span className="font-black text-[#F59E0B]">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-2">
            <h3 className="text-xs font-black text-[#0D2329]">Formas de Pagamento</h3>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between font-bold">
                <span className="text-[#10B981] flex items-center gap-1">💠 PIX</span>
                <span>{formatCurrency(paymentMethodsBreakdown.pix.amount)} ({paymentMethodsBreakdown.pix.pct}%)</span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span className="text-[#7C3AED] flex items-center gap-1">💳 Cartão</span>
                <span>{formatCurrency(paymentMethodsBreakdown.credit.amount)} ({paymentMethodsBreakdown.credit.pct}%)</span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span className="text-[#059669] flex items-center gap-1">💵 Dinheiro</span>
                <span>{formatCurrency(paymentMethodsBreakdown.cash.amount)} ({paymentMethodsBreakdown.cash.pct}%)</span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span className="text-[#0284C7] flex items-center gap-1">🏛️ Transferência</span>
                <span>{formatCurrency(paymentMethodsBreakdown.transfer.amount)} ({paymentMethodsBreakdown.transfer.pct}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. EXPANDED FINANCIAL ENTRIES TABLE & ADVANCED MOBILE TOOLBAR
          ========================================================================= */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-4">
        {/* ROW 1: COMPACT PERIOD SELECTOR, CATEGORY & SEARCH TOOLBAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-[#EEF5F6]">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Period Dropdown Selector */}
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={
                  tablePeriod === "current"
                    ? "current"
                    : tablePeriod === "year"
                    ? "year"
                    : tablePeriod === "overdue"
                    ? "overdue"
                    : tablePeriod === "all"
                    ? "all"
                    : String(selectedMonth)
                }
                onChange={(e) => {
                  const val = e.target.value
                  if (val === "current") {
                    setSelectedMonth(currentMonth)
                    setTablePeriod("current")
                  } else if (val === "year") {
                    setTablePeriod("year")
                  } else if (val === "overdue") {
                    setTablePeriod("overdue")
                  } else if (val === "all") {
                    setTablePeriod("all")
                  } else {
                    setSelectedMonth(Number(val))
                    setTablePeriod("month")
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-2xl border-2 border-[#DDD6FE] bg-[#F5F3FF] hover:bg-[#EDE9FE] text-xs font-black text-[#7C3AED] focus:outline-none focus:border-[#7C3AED] transition-all cursor-pointer shadow-2xs"
              >
                <option value="current">📅 Mês Atual ({MONTHS[currentMonth - 1]})</option>
                <optgroup label="Escolher Mês Específico">
                  {MONTHS.map((m, idx) => (
                    <option key={m} value={String(idx + 1)}>
                      🗓️ {m} ({currentYear})
                    </option>
                  ))}
                </optgroup>
                <option value="year">📊 Ano Inteiro ({currentYear})</option>
                <option value="overdue">🚨 Em Atraso ({filterCounts.overdueCount})</option>
                <option value="all">🌐 Todo o Histórico ({records.length})</option>
              </select>
            </div>

            {/* Category Selector */}
            <div className="flex-1 sm:flex-initial">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold bg-[#F8FAFB] border-2 border-[#D8E5E7] rounded-2xl text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all cursor-pointer"
              >
                <option value="all">📁 Todas as Categorias</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
                <option value="Sessões">🟢 Sessões</option>
                <option value="Avaliações">🟢 Avaliações</option>
                {availableCategories
                  .filter((c) => !EXPENSE_CATEGORIES.some((ec) => ec.value === c) && c !== "Sessões" && c !== "Avaliações")
                  .map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
              </select>
            </div>

            {/* Mobile Search Toggle Button */}
            <button
              type="button"
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className={`p-2.5 rounded-2xl border-2 transition-all sm:hidden shrink-0 ${
                showMobileSearch || search
                  ? "bg-[#7C3AED] text-white border-[#7C3AED]"
                  : "bg-[#F8FAFB] text-[#6B7C83] border-[#D8E5E7]"
              }`}
              title="Buscar lançamentos"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input (Always visible on Desktop, togglable/visible on Mobile) */}
          <div className={`relative w-full sm:w-64 ${showMobileSearch ? "block" : "hidden sm:block"}`}>
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8CAAB1]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar lançamento ou paciente..."
              className="w-full pl-9 pr-8 py-2 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F8FAFB] focus:bg-white focus:outline-none focus:border-[#7C3AED] text-[#0D2329] transition-all placeholder:text-[#8CAAB1]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8CAAB1] hover:text-[#0D2329] p-0.5"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ROW 2: SINGLE SCROLLABLE CHIP ROW FOR TYPES */}
        <div className="overflow-x-auto -mx-1 px-1 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth pb-1">
          <div className="flex items-center gap-1.5 p-1 bg-[#F8FAFB] rounded-full sm:rounded-2xl border-2 border-[#D8E5E7] w-max">
            {[
              { id: "all", label: "Todos", count: filterCounts.total },
              { id: "income", label: "Receitas", count: filterCounts.incomes, dot: "bg-[#10B981]" },
              { id: "expense", label: "Despesas", count: filterCounts.expenses, dot: "bg-[#EF4444]" },
              { id: "pending", label: "Pendentes", count: filterCounts.pendings, dot: "bg-[#F59E0B]" },
              { id: "paid", label: "Pagos / Recebidos", count: filterCounts.paids, dot: "bg-[#10B981]" },
            ].map((f) => {
              const isSelected = typeFilter === f.id
              return (
                <button
                  key={f.id}
                  ref={(el) => {
                    typeFilterRefs.current[f.id] = el
                  }}
                  type="button"
                  onClick={() => {
                    setTypeFilter(f.id as any)
                    typeFilterRefs.current[f.id]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
                  }}
                  className={`px-3.5 py-1.5 sm:py-2 rounded-full sm:rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer ${
                    isSelected
                      ? "bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white shadow-md"
                      : "text-[#4F6C74] hover:text-[#0D2329] hover:bg-white bg-transparent"
                  }`}
                >
                  {f.dot && (
                    <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : f.dot}`} />
                  )}
                  <span>{f.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      isSelected
                        ? "bg-white/25 text-white"
                        : "bg-white text-[#6B7C83] border border-[#D8E5E7]"
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Dynamic Filter Summary Bar */}
        <div className="p-3 rounded-2xl bg-[#F8FAFB] border border-[#EEF5F6] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#6B7C83] gap-2">
          <span className="font-semibold">
            Exibindo <strong>{tableFilteredSum.count}</strong> lançamento(s)
          </span>
          <div className="flex items-center gap-3 font-black text-xs flex-wrap">
            <span className="text-[#10B981]">Receitas: {formatCurrency(tableFilteredSum.inc)}</span>
            <span className="text-[#6B7C83]">•</span>
            <span className="text-[#EF4444]">Despesas: {formatCurrency(tableFilteredSum.exp)}</span>
            <span className="text-[#6B7C83]">•</span>
            <span className="text-[#0D2329]">Saldo: {formatCurrency(tableFilteredSum.inc - tableFilteredSum.exp)}</span>
          </div>
        </div>

        {/* 1. MOBILE CARDS VIEW (Clean & Stacked for Phone Screens) */}
        <div className="block sm:hidden space-y-3 pt-1">
          {filteredRecords.length === 0 ? (
            <div className="py-8 text-center text-xs font-semibold text-[#8CAAB1]">
              Nenhum lançamento encontrado para os filtros selecionados.
            </div>
          ) : (
            filteredRecords.map((record) => {
              const info = getRecordInfo(record)
              const isPaid = record.status === "paid"
              const day = getRecordDay(record)
              const dayStr = String(day).padStart(2, "0")
              const mStr = String(record.month).padStart(2, "0")
              const yStr = record.year || currentYear

              return (
                <div
                  key={record.id}
                  onClick={() => setSelectedDetailRecord(record)}
                  className="p-4 rounded-3xl bg-white border-2 border-[#D8E5E7] hover:border-[#7C3AED]/40 cursor-pointer shadow-xs space-y-3 group transition-all"
                >
                  {/* Top Row: Description + Amount */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border-2 ${
                        !info.isExpense
                          ? "bg-[#E8F8F5] text-[#10B981] border-[#A7F3D0]"
                          : "bg-red-50 text-[#EF4444] border-red-200"
                      }`}>
                        {!info.isExpense ? "↑" : "↓"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-[#0D2329] leading-snug">
                          {info.description}
                        </p>
                        <p className="text-[10px] font-semibold text-[#6B7C83] mt-0.5">
                          {dayStr}/{mStr}/{yStr} ({MONTHS[record.month - 1]})
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`text-sm font-black ${!info.isExpense ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                        {!info.isExpense ? "+ " : "- "}
                        {formatCurrency(record.amount)}
                      </p>
                    </div>
                  </div>

                  {/* Badges & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#EEF5F6] gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#EAF8FC] text-[#0284C7] border border-[#BAE6FD]">
                        {info.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isPaid
                          ? "bg-[#E8F8F5] text-[#10B981] border border-[#A7F3D0]"
                          : "bg-[#FEF8EC] text-[#F59E0B] border border-[#FDE68A]"
                      }`}>
                        {isPaid ? (!info.isExpense ? "Recebido" : "Pago") : "Pendente"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {!info.isExpense && !isPaid && record.child && (
                        <button
                          onClick={() => handleSendWhatsApp(record)}
                          className="px-2.5 py-1 text-[#065F46] bg-[#E8F8F5] hover:bg-[#10B981] hover:text-white rounded-xl border border-[#10B981]/30 transition-all text-xs font-black flex items-center gap-1 shadow-2xs"
                          title="Cobrança WhatsApp"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Cobrar</span>
                        </button>
                      )}

                      {isPaid ? (
                        <button
                          onClick={() => handleToggleStatus(record)}
                          className="px-2.5 py-1 bg-white border-2 border-[#D8E5E7] hover:bg-[#F8FAFB] text-[#6B7C83] text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1"
                          title="Voltar para Pendente"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Desfazer</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmingRecord(record)}
                          className="px-3 py-1 bg-[#10B981] text-white text-xs font-black rounded-xl hover:bg-[#059669] transition-all shadow-2xs active:scale-95"
                        >
                          Dar Baixa
                        </button>
                      )}

                      <button
                        onClick={() => handleStartEdit(record)}
                        className="p-1.5 text-[#6B7C83] hover:text-[#7C3AED] hover:bg-[#EDE9FE] rounded-xl transition-all"
                        title="Editar Lançamento"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteRecord(record.id)}
                        className="p-1.5 text-[#8CAAB1] hover:text-[#EF4444] hover:bg-red-50 rounded-xl transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* 2. DESKTOP TABLE VIEW (Full Structured Grid) */}
        <div className="hidden sm:block overflow-x-auto pt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#EEF5F6] text-[11px] font-bold text-[#8CAAB1]">
                <th className="pb-2.5">Data / Vencimento</th>
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
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const info = getRecordInfo(record)
                  const isPaid = record.status === "paid"
                  const day = getRecordDay(record)
                  const dayStr = String(day).padStart(2, "0")
                  const mStr = String(record.month).padStart(2, "0")
                  const yStr = record.year || currentYear

                  return (
                    <tr
                      key={record.id}
                      onClick={() => setSelectedDetailRecord(record)}
                      className="hover:bg-[#F7FAFA] cursor-pointer transition-colors group"
                    >
                      <td className="py-3 text-[#6B7C83] font-semibold">
                        <div className="font-bold text-[#0D2329]">
                          {dayStr}/{mStr}/{yStr}
                        </div>
                        <span className="text-[10px] text-[#8CAAB1]">
                          {MONTHS[record.month - 1]}
                        </span>
                      </td>
                      <td className="py-3 font-bold text-[#0D2329] max-w-[240px] truncate">
                        {info.description}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EAF8FC] text-[#7C3AED]">
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
                      <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {!info.isExpense && !isPaid && record.child && (
                            <button
                              onClick={() => handleSendWhatsApp(record)}
                              className="p-1 text-[#10B981] hover:bg-[#E8F8F5] rounded-lg transition-colors"
                              title="Enviar Cobrança WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isPaid ? (
                            <button
                              onClick={() => handleToggleStatus(record)}
                              className="px-2.5 py-1 bg-white border border-[#D8E5E7] hover:bg-[#F8FAFB] text-[#6B7C83] text-[10px] font-bold rounded-lg transition-colors shadow-2xs"
                              title="Desfazer Baixa (Voltar para Pendente)"
                            >
                              Desfazer
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmingRecord(record)}
                              className="px-2.5 py-1 bg-[#10B981] text-white text-[10px] font-bold rounded-lg hover:bg-[#059669] transition-colors shadow-2xs"
                            >
                              Dar Baixa
                            </button>
                          )}

                          <button
                            onClick={() => handleStartEdit(record)}
                            className="p-1 text-[#6B7C83] hover:text-[#7C3AED] hover:bg-[#EDE9FE] rounded-lg transition-colors"
                            title="Editar Lançamento"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

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

      {/* =========================================================================
          5. COMPLETE ADVANCED MODAL: NOVO LANÇAMENTO COM DATA EXATA (DIA, MÊS, ANO)
          ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in-50 zoom-in-95 my-8">
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

            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F7FAFA] rounded-2xl border border-[#D8E5E7]">
              <button
                type="button"
                onClick={() => {
                  setEntryType("income")
                  setFormData((prev) => ({ ...prev, category: "Sessões", amount: prev.amount || localStorage.getItem("evoluia_default_price") || (professional as any)?.default_price || "180" }))
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
              {entryType === "income" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                  <div>
                    <label className="font-bold text-[#0D2329] block mb-1">Categoria da Receita *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-semibold focus:outline-none focus:border-[#00A896]"
                    >
                      <option value="Sessões">⚡ Sessão / Atendimento</option>
                      <option value="Material Didático">📚 Material Didático / Livro / Jogo</option>
                      <option value="Avaliações">📋 Avaliação / Anamnese Inicial</option>
                      <option value="Relatórios & Devolutivas">📑 Relatório / Devolutiva</option>
                      <option value="Reposição / Aula Extra">🔄 Reposição / Aula Extra</option>
                      <option value="Taxa / Ressarcimento">⚠️ Taxa / Ressarcimento / Dano</option>
                      <option value="Outros">🏷️ Outros Lançamentos</option>
                    </select>
                  </div>
                </div>
              ) : (
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
                          ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-xs"
                          : "bg-white text-[#6B7C83] border-[#D8E5E7] hover:border-[#7C3AED]"
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

              {/* DATA EXATA: DIA, MÊS, ANO */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-bold text-[#0D2329] block mb-1">
                    Dia (Vencimento) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    placeholder="Ex: 05, 10"
                    value={formData.day}
                    onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-bold text-[#0D2329] focus:outline-none focus:bg-white focus:border-[#10B981]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#0D2329] block mb-1">
                    Mês de Início *
                  </label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-semibold focus:outline-none focus:border-[#10B981]"
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#0D2329] block mb-1">
                    ANO *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-semibold focus:outline-none focus:border-[#10B981]"
                  />
                </div>
              </div>

              {/* Valor & Status */}
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
                    className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-black text-sm focus:outline-none focus:bg-white"
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

      {/* 6. MODAL: CONFIRM PAYMENT */}
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

      {/* 7. MODAL: DETALHES DO LANÇAMENTO */}
      {selectedDetailRecord && (() => {
        const info = getRecordInfo(selectedDetailRecord)
        const isPaid = selectedDetailRecord.status === "paid"
        const day = getRecordDay(selectedDetailRecord)
        const dayStr = String(day).padStart(2, "0")
        const mStr = String(selectedDetailRecord.month).padStart(2, "0")
        const yStr = selectedDetailRecord.year || currentYear
        const notesStr = (selectedDetailRecord.notes || "").trim()
        const isFechamento = notesStr.toLowerCase().includes("fechamento") || notesStr.includes("• Sessão")
        const sessionLines = notesStr
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.startsWith("• Sessão") || l.startsWith("• ") || l.startsWith("Sessão #"))

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 animate-in zoom-in-95 my-8">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-[#EEF5F6] pb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg border-2 shrink-0 ${
                    !info.isExpense
                      ? "bg-[#E8F8F5] text-[#10B981] border-[#A7F3D0]"
                      : "bg-red-50 text-[#EF4444] border-red-200"
                  }`}>
                    {!info.isExpense ? "↑" : "↓"}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#8CAAB1]">
                      {!info.isExpense ? "Receita / Cobrança" : "Despesa Operacional"}
                    </span>
                    <h3 className="text-base font-black text-[#0D2329] leading-snug">
                      {info.description}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDetailRecord(null)}
                  className="w-8 h-8 rounded-full bg-[#F8FAFB] hover:bg-[#EEF5F6] text-[#8CAAB1] flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Informações Principais */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-[#F8FAFB] border border-[#EEF5F6] space-y-1">
                  <span className="text-[10px] font-black text-[#8CAAB1] uppercase">Valor Total</span>
                  <p className={`text-xl sm:text-2xl font-black ${!info.isExpense ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                    {formatCurrency(selectedDetailRecord.amount)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#F8FAFB] border border-[#EEF5F6] space-y-1">
                  <span className="text-[10px] font-black text-[#8CAAB1] uppercase">Status Atual</span>
                  <div className="pt-0.5">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${
                      isPaid
                        ? "bg-[#E8F8F5] text-[#10B981] border border-[#A7F3D0]"
                        : "bg-[#FEF8EC] text-[#F59E0B] border border-[#FDE68A]"
                    }`}>
                      {isPaid ? "✅ Pago / Recebido" : "⏳ Pendente"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detalhes de Data e Categoria */}
              <div className="p-4 rounded-2xl bg-white border border-[#D8E5E7] space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#6B7C83]">Data / Vencimento:</span>
                  <span className="font-black text-[#0D2329]">
                    {dayStr}/{mStr}/{yStr} ({MONTHS[selectedDetailRecord.month - 1]})
                  </span>
                </div>
                {selectedDetailRecord.payment_date && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#6B7C83]">Data de Pagamento:</span>
                    <span className="font-black text-[#10B981]">
                      {formatDate(selectedDetailRecord.payment_date)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#6B7C83]">Categoria:</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#EAF8FC] text-[#7C3AED] font-black border border-[#DDD6FE]">
                    {info.category}
                  </span>
                </div>
                {selectedDetailRecord.child && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#6B7C83]">Paciente Vinculado:</span>
                    <span className="font-black text-[#0D2329]">
                      {selectedDetailRecord.child.full_name}
                    </span>
                  </div>
                )}
              </div>

              {/* Lista de Sessões Agrupadas no Fechamento */}
              {isFechamento && sessionLines.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#F8FAFB] border border-[#DDD6FE] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#7C3AED] flex items-center gap-1.5">
                      🎯 Fechamento Mensal ({sessionLines.length} {sessionLines.length === 1 ? "sessão" : "sessões acumuladas"})
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {sessionLines.map((line, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-white rounded-xl border border-[#EEF5F6] text-xs font-bold text-[#19323A] flex items-center justify-between shadow-2xs"
                      >
                        <span>{line.replace(/^•\s*/, "")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observações / Notas */}
              {notesStr && !isFechamento && (
                <div className="p-3.5 rounded-2xl bg-[#F8FAFB] border border-[#EEF5F6] text-xs text-[#6B7C83]">
                  <p className="font-bold text-[#0D2329] mb-1">Observações:</p>
                  <p className="italic">{notesStr}</p>
                </div>
              )}

              {/* Ações / Botões */}
              <div className="pt-2 border-t border-[#EEF5F6] flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  {isPaid ? (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(selectedDetailRecord)}
                      className="px-4 py-2.5 rounded-2xl bg-white border-2 border-[#D8E5E7] hover:bg-[#F8FAFB] text-xs font-black text-[#6B7C83] flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Desfazer Baixa (Voltar para Pendente)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const rec = selectedDetailRecord
                        setSelectedDetailRecord(null)
                        setConfirmingRecord(rec)
                      }}
                      className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>Dar Baixa no Lançamento</span>
                    </button>
                  )}

                  {!info.isExpense && selectedDetailRecord.child && (
                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(selectedDetailRecord)}
                      className="p-2.5 text-[#065F46] bg-[#E8F8F5] hover:bg-[#10B981] hover:text-white rounded-2xl border border-[#10B981]/30 transition-all text-xs font-black flex items-center gap-1.5 shadow-2xs"
                      title="Enviar Cobrança / Recibo por WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(selectedDetailRecord)}
                    className="px-4 py-2.5 rounded-2xl bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#7C3AED] font-black text-xs flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const id = selectedDetailRecord.id
                      setSelectedDetailRecord(null)
                      handleDeleteRecord(id)
                    }}
                    className="p-2.5 text-[#8CAAB1] hover:text-[#EF4444] hover:bg-red-50 rounded-2xl transition-all"
                    title="Excluir Lançamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 8. MODAL: EDITAR LANÇAMENTO */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-4 animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-[#EEF5F6] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0D2329]">Editar Lançamento</h3>
                  <p className="text-[11px] font-semibold text-[#6B7C83]">
                    Altere valores, vencimento, categoria ou status.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="w-8 h-8 rounded-full bg-[#F8FAFB] hover:bg-[#EEF5F6] text-[#8CAAB1] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* Descrição */}
              <div>
                <label className="font-bold text-[#0D2329] block mb-1">
                  Descrição do Lançamento *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-bold text-[#0D2329] focus:outline-none focus:bg-white focus:border-[#7C3AED]"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="font-bold text-[#0D2329] block mb-1">Categoria *</label>
                <input
                  type="text"
                  required
                  value={editFormData.category}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-bold text-[#0D2329] focus:outline-none focus:bg-white focus:border-[#7C3AED]"
                />
              </div>

              {/* Data: Dia, Mês, Ano */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-bold text-[#0D2329] block mb-1">Dia *</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={editFormData.day}
                    onChange={(e) => setEditFormData({ ...editFormData, day: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-bold text-[#0D2329] focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0D2329] block mb-1">Mês *</label>
                  <select
                    value={editFormData.month}
                    onChange={(e) => setEditFormData({ ...editFormData, month: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-bold focus:outline-none"
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#0D2329] block mb-1">Ano *</label>
                  <input
                    type="number"
                    required
                    value={editFormData.year}
                    onChange={(e) => setEditFormData({ ...editFormData, year: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* Valor & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#0D2329] block mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-black text-sm text-[#0D2329] focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0D2329] block mb-1">Status *</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-bold focus:outline-none"
                  >
                    <option value="pending">⏳ Pendente</option>
                    <option value="paid">✅ Pago / Recebido</option>
                  </select>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="font-bold text-[#0D2329] block mb-1">Observações Adicionais</label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#D8E5E7] bg-[#F7FAFA] text-xs font-medium focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#EEF5F6] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#D8E5E7] text-[#6B7C83] font-bold hover:bg-[#F7FAFA]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-white font-black bg-[#7C3AED] hover:bg-[#6D28D9] shadow-sm active:scale-95 transition-all"
                >
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
