import { useState, useEffect } from "react"
import {
  DollarSign, Plus, Trash2, CheckCircle2, Settings, Calendar,
  CreditCard, AlertCircle, Edit2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { formatCurrency, formatDate } from "@/lib/utils"
import toast from "react-hot-toast"
import { ConfirmPaymentModal } from "@/pages/financial/ConfirmPaymentModal"
import { CarePlanDialog } from "./CarePlanDialog"

interface ChildFinancialTabProps {
  childId: string
  childName?: string
}

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

const BILLING_LABEL: Record<string, string> = {
  mensal: "💰 Mensal",
  por_sessao: "🎯 Por Sessão",
  pacote: "📦 Pacote",
}
export const INCOME_CATEGORIES = [
  { value: "Sessões", label: "⚡ Sessão / Atendimento", color: "bg-[#E8F8F5] text-[#065F46] border-[#A7F3D0]" },
  { value: "Material Didático", label: "📚 Material Didático / Livro / Jogo", color: "bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]" },
  { value: "Avaliações", label: "📋 Avaliação / Anamnese Inicial", color: "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]" },
  { value: "Relatórios & Devolutivas", label: "📑 Relatório / Devolutiva", color: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]" },
  { value: "Reposição / Aula Extra", label: "🔄 Reposição / Aula Extra", color: "bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]" },
  { value: "Taxa / Ressarcimento", label: "⚠️ Taxa / Ressarcimento / Dano", color: "bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]" },
  { value: "Outros", label: "🏷️ Outros Lançamentos", color: "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]" },
]

export function parseRecordInfo(r: any) {
  const rawNotes = (r.notes || "").trim()

  if (rawNotes.includes("[RECEITA:")) {
    const match = rawNotes.match(/\[RECEITA:\s*([^\]]+)\]\s*(.*)/)
    if (match) {
      const cat = match[1].trim()
      const desc = match[2].trim()
      const catObj = INCOME_CATEGORIES.find(c => c.value === cat) || INCOME_CATEGORIES[6]
      return {
        category: cat,
        categoryLabel: catObj.label,
        categoryColor: catObj.color,
        description: desc || "Cobrança Avulsa",
      }
    }
  }

  if (rawNotes.toLowerCase().includes("sessão") || rawNotes.toLowerCase().includes("atendimento") || rawNotes.toLowerCase().includes("presença")) {
    return {
      category: "Sessões",
      categoryLabel: "⚡ Sessão",
      categoryColor: "bg-[#E8F8F5] text-[#065F46] border-[#A7F3D0]",
      description: rawNotes || "Sessão Psicopedagógica",
    }
  }

  if (rawNotes) {
    let inferredCat = "Outros"
    let catObj = INCOME_CATEGORIES[6]
    const lower = rawNotes.toLowerCase()
    if (lower.includes("livro") || lower.includes("material") || lower.includes("jogo") || lower.includes("rasgou") || lower.includes("danific")) {
      inferredCat = "Material Didático"
      catObj = INCOME_CATEGORIES[1]
    } else if (lower.includes("avalia") || lower.includes("anamnese")) {
      inferredCat = "Avaliações"
      catObj = INCOME_CATEGORIES[2]
    } else if (lower.includes("relat") || lower.includes("devolut")) {
      inferredCat = "Relatórios & Devolutivas"
      catObj = INCOME_CATEGORIES[3]
    } else if (lower.includes("reposi") || lower.includes("extra")) {
      inferredCat = "Reposição / Aula Extra"
      catObj = INCOME_CATEGORIES[4]
    }

    return {
      category: inferredCat,
      categoryLabel: catObj.label,
      categoryColor: catObj.color,
      description: rawNotes,
    }
  }

  return {
    category: "Sessões",
    categoryLabel: "⚡ Sessão",
    categoryColor: "bg-[#E8F8F5] text-[#065F46] border-[#A7F3D0]",
    description: "Sessão / Mensalidade",
  }
}


export function ChildFinancialTab({ childId, childName = "Paciente" }: ChildFinancialTabProps) {
  const { professional } = useAuthStore()
  const [records, setRecords] = useState<any[]>([])
  const [carePlan, setCarePlan] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCarePlanDialog, setShowCarePlanDialog] = useState(false)
  const [confirmingRecord, setConfirmingRecord] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    amount: localStorage.getItem("evoluia_default_price") || (professional as any)?.default_price || "180",
    category: "Sessões",
    description: "",
    status: "pending",
    notes: "",
  })

  useEffect(() => {
    loadAll()
  }, [childId])

  async function loadAll() {
    setLoading(true)
    try {
      const [recordsRes, planRes] = await Promise.all([
        supabase
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
          .order("created_at", { ascending: false }),

        supabase
          .from("care_plans")
          .select("*")
          .eq("child_id", childId)
          .single(),
      ])

      setRecords(recordsRes.data || [])
      setCarePlan(planRes.data || null)

      // Pre-fill the form with care plan amount if available
      if (planRes.data?.price_per_session) {
        setForm((prev) => ({ ...prev, amount: String(planRes.data.price_per_session) }))
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAddRecord() {
    if (!professional) return
    setSaving(true)
    try {
      const desc = (form.description || form.notes || "").trim() || "Cobrança avulsa"
      const noteTag = `[RECEITA: ${form.category || "Sessões"}] ${desc}`

      const { error } = await supabase.from("financial_records").insert({
        professional_id: professional.id,
        child_id: childId,
        month: Number(form.month),
        year: Number(form.year),
        amount: Number(form.amount) || 0,
        status: form.status as any,
        payment_date: form.status === "paid" ? new Date().toISOString().split("T")[0] : null,
        notes: noteTag,
      })

      if (error) throw error
      toast.success("Lançamento financeiro registrado com sucesso!")
      setShowAddModal(false)
      loadAll()
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
        .update({ status: "pending", payment_date: null })
        .eq("id", rec.id)

      if (error) throw error
      toast.success("Marcado como pendente!")
      loadAll()
    } catch {
      toast.error("Erro ao atualizar status")
    }
  }

  async function handleDelete(rec: any) {
    if (!confirm(`Excluir lançamento de ${formatCurrency(rec.amount)}?`)) return
    try {
      const { error } = await supabase.from("financial_records").delete().eq("id", rec.id)
      if (error) throw error
      toast.success("Lançamento excluído!")
      loadAll()
    } catch {
      toast.error("Erro ao excluir lançamento")
    }
  }

  // Open modal and reset form with care plan amount
  function openAddModal() {
    setForm({
      month: String(new Date().getMonth() + 1),
      year: String(new Date().getFullYear()),
      amount: carePlan?.price_per_session ? String(carePlan.price_per_session) : "0",
      category: "Material Didático",
      description: "",
      status: "pending",
      notes: "",
    })
    setShowAddModal(true)
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-[#19323A]">Controle Financeiro</h2>
          <p className="text-xs font-semibold text-[#6B7C83]">
            Acompanhe pagamentos, mensalidades e comprovantes de WhatsApp.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Lançamento</span>
        </button>
      </div>

      {/* ── Care Plan Info Card ─────────────────────────────── */}
      {!loading && (
        carePlan ? (
          <div className="bg-gradient-to-r from-[#19323A] to-[#245C6B] rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#A0D4CB] mb-2">
                  📋 Plano de Cobrança Configurado
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] text-[#A0D4CB] uppercase font-bold">Valor</p>
                    <p className="text-xl font-black text-white mt-0.5">
                      {formatCurrency(carePlan.price_per_session)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#A0D4CB] uppercase font-bold">Forma de Cobrança</p>
                    <p className="text-sm font-black text-white mt-0.5">
                      {BILLING_LABEL[carePlan.payment_type] || carePlan.payment_type}
                    </p>
                  </div>
                  {carePlan.payment_type !== "por_sessao" && carePlan.payment_due_day && (
                    <div>
                      <p className="text-[10px] text-[#A0D4CB] uppercase font-bold">Vencimento</p>
                      <p className="text-sm font-black text-white mt-0.5">
                        Dia {carePlan.payment_due_day}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-[#A0D4CB] uppercase font-bold">Frequência</p>
                    <p className="text-sm font-black text-white mt-0.5">
                      {carePlan.frequency === 0
                        ? "Quinzenal"
                        : carePlan.frequency === 1
                        ? "1× / semana"
                        : `${carePlan.frequency}× / semana`}
                    </p>
                  </div>
                </div>
                {carePlan.notes && (
                  <p className="text-xs text-[#A0D4CB] mt-3 italic border-t border-white/10 pt-2">
                    📝 {carePlan.notes}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowCarePlanDialog(true)}
                className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-[#63C7B2] hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition-all"
                title="Editar plano de cobrança"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Editar
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-amber-800">Nenhum plano de cobrança configurado</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Configure o valor e forma de cobrança na aba <strong>Resumo → Acompanhamento & Frequência</strong> para que os lançamentos sejam criados automaticamente.
              </p>
            </div>
            <button
              onClick={() => setShowCarePlanDialog(true)}
              className="shrink-0 text-xs font-black text-white bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded-xl transition-all shadow-xs active:scale-95"
            >
              Configurar
            </button>
          </div>
        )
      )}

      {/* ── Records List ────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[#EEF5F6] animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-white border-2 border-dashed border-[#D8E5E7] text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-[#EDE9FE] border-2 border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center mx-auto shadow-xs">
            <DollarSign className="w-8 h-8" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-black text-[#0D2329]">Nenhum lançamento registrado</h3>
            <p className="text-xs font-semibold text-[#6B7C83] leading-relaxed">
              Crie cobranças mensais, pacotes de sessões ou lançamentos avulsos para <strong>{childName || "este paciente"}</strong>.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={openAddModal}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white text-xs font-black inline-flex items-center gap-2 shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Lançar Cobrança</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div
              key={r.id}
              className="p-4 rounded-2xl border-2 border-[#D8E5E7] bg-white hover:border-[#245C6B] transition-all flex items-center justify-between gap-4 group"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
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
                    {r.status === "paid" ? "✅ Pago" : "⏳ Pendente"}
                  </span>
                </div>
                {r.payment_date && (
                  <p className="text-xs font-semibold text-[#6B7C83]">
                    Pago em: {formatDate(r.payment_date)}
                  </p>
                )}
                {r.notes && (
                  <p className="text-xs text-[#8DA3A8] italic truncate max-w-xs">"{r.notes}"</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="font-black text-base text-[#19323A]">{formatCurrency(r.amount)}</span>

                {r.status === "paid" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkPending(r)}
                    className="font-bold text-xs"
                  >
                    Desfazer
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setConfirmingRecord(r)}
                    className="font-black text-xs bg-[#245C6B] hover:bg-[#1B4752] text-white gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#63C7B2]" />
                    Confirmar
                  </Button>
                )}

                <button
                  onClick={() => handleDelete(r)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-[#8DA3A8] hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  title="Excluir lançamento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Payment Modal */}
      <ConfirmPaymentModal
        open={!!confirmingRecord}
        record={confirmingRecord}
        onClose={() => setConfirmingRecord(null)}
        onSuccess={() => {
          setConfirmingRecord(null)
          loadAll()
        }}
      />

      {/* Care Plan Dialog (edit from financial tab too) */}
      <CarePlanDialog
        open={showCarePlanDialog}
        childId={childId}
        childName={childName}
        onClose={() => setShowCarePlanDialog(false)}
        onSuccess={() => {
          setShowCarePlanDialog(false)
          loadAll()
        }}
      />

      {/* New Record Modal with Category & Description */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl">
            <div>
              <h3 className="text-lg font-black text-[#0D2329]">Novo Lançamento Financeiro</h3>
              <p className="text-xs text-[#6B7C83] mt-0.5">
                Crie uma cobrança de sessão, material didático, taxa ou avaliação para <strong>{childName}</strong>.
              </p>
            </div>

            {/* Categoria */}
            <div className="space-y-1">
              <label className="text-xs font-black text-[#0D2329]">Categoria do Lançamento *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs"
              >
                {INCOME_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Descrição / Detalhe */}
            <div className="space-y-1">
              <label className="text-xs font-black text-[#0D2329]">Descrição / Detalhe *</label>
              <input
                type="text"
                required
                placeholder="Ex: Livro que o aluno rasgou, Material didático, Sessão avulsa..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] shadow-2xs placeholder:text-[#8CAAB1]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-black text-[#0D2329]">Mês</label>
                <select
                  value={form.month}
                  onChange={(e) => setForm({ ...form, month: e.target.value })}
                  className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold focus:outline-none focus:border-[#7C3AED]"
                >
                  {months.map((m, idx) => (
                    <option key={m} value={String(idx + 1)}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-[#0D2329]">Ano</label>
                <input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold focus:outline-none focus:border-[#7C3AED]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-black text-[#0D2329]">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-black text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-[#0D2329]">Status Inicial</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full p-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold focus:outline-none focus:border-[#7C3AED]"
                >
                  <option value="pending">⏳ Pendente</option>
                  <option value="paid">✓ Pago</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#EEF5F6]">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 rounded-2xl bg-white border-2 border-[#D8E5E7] hover:bg-[#F8FAFB] text-xs font-black text-[#6B7C83] transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleAddRecord}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar Lançamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
