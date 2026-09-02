import { useState, useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  FileText,
  Eye,
  Search,
  Paperclip,
  Calendar,
  User,
  Plus,
  Filter,
  ChevronRight,
  Sparkles,
  FileCheck,
  Clock,
  CheckCircle2,
  Users,
  Smile,
  Edit2,
  ArrowRight,
  BookOpen,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getAccessibleProfessionalIds } from "@/lib/teamAccess"
import { useAuthStore } from "@/store/authStore"
import { formatDate } from "@/lib/utils"
import type { Report, Child } from "@/types/database"
import { addDashboardTask } from "@/lib/dashboardTasks"
import toast from "react-hot-toast"

interface ReportWithChild extends Report {
  child?: Child | null
}

type ReportFilterType = "todos" | "in_progress" | "final"

export function ReportsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, professional } = useAuthStore()
  const [reports, setReports] = useState<ReportWithChild[]>([])
  const [allChildren, setAllChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<ReportFilterType>("todos")
  const filterRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    const el = filterRefs.current[filterType]
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
    }
  }, [filterType])
  const [showNewReportModal, setShowNewReportModal] = useState(searchParams.get("novo") === "true")
  const [selectedChildIdForNew, setSelectedChildIdForNew] = useState("")
  const [creatingReport, setCreatingReport] = useState(false)

  const profId = professional?.id || user?.id

  useEffect(() => {
    if (profId) {
      loadReports()
      loadChildren()
    }
  }, [profId])

  useEffect(() => {
    if (searchParams.get("novo") === "true") {
      setShowNewReportModal(true)
    }
  }, [searchParams])

  async function loadReports() {
    if (!profId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from("reports")
        .select("*, child:children(*)")
        .in("professional_id", getAccessibleProfessionalIds(professional, profId))
        .order("created_at", { ascending: false })

      const validReports = ((data || []) as ReportWithChild[]).filter((r) => {
        if (!r.content || typeof r.content !== "object") return false
        return Object.keys(r.content).length > 0
      })

      setReports(validReports)
    } finally {
      setLoading(false)
    }
  }

  async function loadChildren() {
    if (!profId) return
    try {
      const { data } = await supabase
        .from("children")
        .select("*")
        .in("professional_id", getAccessibleProfessionalIds(professional, profId))
        .order("full_name", { ascending: true })

      setAllChildren(data || [])
    } catch (e) {
      console.error(e)
    }
  }

  // Handle "+ Novo Relatório" Action
  async function handleStartNewReportFromPicker() {
    if (!selectedChildIdForNew) {
      toast.error("Por favor, selecione um paciente da lista.")
      return
    }

    const selectedChild = allChildren.find((c) => c.id === selectedChildIdForNew)
    if (!selectedChild) return

    // REGRA CONTRA DUPLICAÇÃO: Verificar se a criança já possui um relatório ativo
    const existingActive = reports.find((r) => r.child_id === selectedChild.id)

    if (existingActive) {
      toast("Esta criança já possui um relatório cadastrado. Redirecionando...", { icon: "ℹ️" })
      setShowNewReportModal(false)
      navigate(`/criancas/${selectedChild.id}?tab=relatorios`)
      return
    }

    setCreatingReport(true)
    try {
      // 1. Criar novo registro de relatório
      const { error: reportError } = await supabase.from("reports").insert({
        professional_id: profId,
        child_id: selectedChild.id,
        title: `Relatório Psicopedagógico - ${selectedChild.full_name}`,
        status: "draft",
        content: {
          introduction: "",
          development: "",
          conclusion: "",
          attachments: [],
        },
        period_start: new Date().toISOString().split("T")[0],
        period_end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      })

      if (reportError) throw reportError

      // 2. Atualizar status da criança para EM RELATÓRIO
      await supabase
        .from("children")
        .update({ status: "report_in_progress" })
        .eq("id", selectedChild.id)

      // Criar automaticamente a tarefa no dashboard da clínica
      const due = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      addDashboardTask(profId, {
        text: `Finalizar relatório ${selectedChild.full_name}`,
        dueDate: due,
      })

      toast.success(`Relatório iniciado! Tarefa criada na clínica.`, { icon: "📝" })
      setShowNewReportModal(false)
      navigate(`/criancas/${selectedChild.id}?tab=relatorios`)
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar relatório")
    } finally {
      setCreatingReport(false)
    }
  }

  // Counts for 3 Summary Cards
  const totalReports = reports.length
  const inProgressReports = reports.filter((r) => r.status === "draft" || r.status === "in_progress" || r.child?.status === "report_in_progress").length
  const completedReports = reports.filter((r) => r.status === "final" || r.status === "completed" || r.child?.status === "report_completed").length

  // Filtered List
  const filtered = reports.filter((r) => {
    const isCompleted = r.status === "final" || r.status === "completed" || r.child?.status === "report_completed"
    if (filterType === "in_progress" && isCompleted) return false
    if (filterType === "final" && !isCompleted) return false

    if (!search.trim()) return true
    const q = search.toLowerCase().trim()
    const matchChild = r.child?.full_name?.toLowerCase().includes(q)
    const matchTitle = r.title?.toLowerCase().includes(q)
    return matchChild || matchTitle
  })

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-[#0D2329] tracking-tight">
              Relatórios
            </h1>
            <div className="w-8 h-8 rounded-2xl bg-[#EDE9FE] border border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xs sm:text-sm font-bold text-[#081B20]">
            Acompanhe e gerencie os relatórios dos seus pacientes.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setShowNewReportModal(true)}
          className="h-10 px-5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white text-xs font-black flex items-center gap-2 shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Novo Relatório</span>
        </button>
      </div>

      {/* 2. 3 SUMMARY CARDS (DADOS REAIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: TOTAL DE RELATÓRIOS */}
        <div className="p-5 rounded-3xl bg-white border-2 border-white shadow-sm flex items-center justify-between hover:border-[#7C3AED]/40 transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase text-[#0D2329] tracking-wider">
              Total de Relatórios
            </p>
            <h3 className="text-2xl font-black text-[#0D2329]">{totalReports}</h3>
            <span className="inline-block text-[11px] font-bold text-[#7C3AED]">
              Registros no sistema
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] border border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: EM RELATÓRIO */}
        <div className="p-5 rounded-3xl bg-white border-2 border-white shadow-sm flex items-center justify-between hover:border-[#F59E0B]/40 transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase text-[#0D2329] tracking-wider">
              Em Relatório
            </p>
            <h3 className="text-2xl font-black text-[#0D2329]">{inProgressReports}</h3>
            <span className="inline-block text-[11px] font-bold text-[#EA580C]">
              Em elaboração clínica
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FEF8EC] border border-[#FDE68A] text-[#F59E0B] flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: FINALIZADOS */}
        <div className="p-5 rounded-3xl bg-white border-2 border-white shadow-sm flex items-center justify-between hover:border-[#0284C7]/40 transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase text-[#0D2329] tracking-wider">
              Finalizados
            </p>
            <h3 className="text-2xl font-black text-[#0D2329]">{completedReports}</h3>
            <span className="inline-block text-[11px] font-bold text-[#0284C7]">
              Concluídos e emitidos
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] border border-[#BAE6FD] text-[#0284C7] flex items-center justify-center shrink-0 shadow-xs">
            <FileCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR: BUSCA & FILTROS MODERNOS */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-[#D8E5E7] shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8CAAB1]" />
            <input
              type="text"
              placeholder="Buscar criança ou relatório..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all placeholder:text-[#8CAAB1]"
            />
          </div>

          {/* Filter Chips (Modern Pills Style) */}
          <div className="overflow-x-auto -mx-1 px-1 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth">
            <div className="flex items-center gap-1.5 p-1 bg-[#F8FAFB] rounded-full sm:rounded-2xl border-2 border-[#D8E5E7] w-max sm:w-auto">
              {[
                { id: "todos", label: "Todos", count: totalReports },
                { id: "in_progress", label: "Em Relatório", count: inProgressReports },
                { id: "final", label: "Finalizados", count: completedReports },
              ].map((f) => {
                const isSelected = filterType === f.id
                return (
                  <button
                    key={f.id}
                    ref={(el) => {
                      filterRefs.current[f.id] = el
                    }}
                    type="button"
                    onClick={() => {
                      setFilterType(f.id as ReportFilterType)
                      filterRefs.current[f.id]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
                    }}
                    className={`px-3.5 py-1.5 sm:py-2 rounded-full sm:rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 active:scale-95 cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white shadow-md"
                        : "text-[#4F6C74] hover:text-[#0D2329] hover:bg-white bg-transparent"
                    }`}
                  >
                    <span>{f.label}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
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
        </div>
      </div>

      {/* 4. LISTA PRINCIPAL DE RELATÓRIOS (CARDS MODERNOS & RESPONSIVOS) */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white border-2 border-[#D8E5E7] animate-pulse rounded-3xl shadow-xs" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border-2 border-dashed border-[#D8E5E7] text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#EDE9FE] border-2 border-[#DDD6FE] flex items-center justify-center mx-auto text-[#7C3AED] shadow-xs">
            <FileText className="w-8 h-8" />
          </div>
          {reports.length === 0 ? (
            <div className="space-y-2">
              <h3 className="font-black text-lg text-[#0D2329]">Nenhum relatório cadastrado ainda</h3>
              <p className="text-xs font-semibold text-[#6B7C83] max-w-md mx-auto">
                Inicie o primeiro relatório psicopedagógico selecionando um paciente da sua clínica.
              </p>
              <button
                onClick={() => setShowNewReportModal(true)}
                className="mt-3 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white text-xs font-black inline-flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Novo Relatório</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <h3 className="font-black text-base text-[#0D2329]">Nenhum relatório encontrado</h3>
              <p className="text-xs font-semibold text-[#6B7C83]">
                Tente buscar com outro termo ou alterar o filtro selecionado.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((rep) => {
            const childName = rep.child?.full_name || "Paciente"
            const isCompleted = rep.status === "final" || rep.status === "completed" || rep.child?.status === "report_completed"

            return (
              <div
                key={rep.id}
                onClick={() => navigate(`/criancas/${rep.child_id}?tab=relatorios`)}
                className="p-4 sm:p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] hover:border-[#7C3AED]/60 hover:shadow-lg transition-all cursor-pointer space-y-3.5 group"
              >
                {/* Top Row: Criança Info + Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] border-2 border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center font-black text-base overflow-hidden shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                      {rep.child?.photo_url ? (
                        <img src={rep.child.photo_url} alt={childName} className="w-full h-full object-cover" />
                      ) : (
                        childName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-sm sm:text-base text-[#0D2329] group-hover:text-[#7C3AED] truncate transition-colors leading-tight">
                        {childName}
                      </h3>
                      <p className="text-xs font-semibold text-[#6B7C83] truncate mt-0.5 flex items-center gap-1">
                        <span>🏫</span>
                        <span className="truncate">{rep.child?.school || "Escola não informada"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 shrink-0 shadow-2xs ${
                      isCompleted
                        ? "bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]"
                        : "bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE]"
                    }`}
                  >
                    <span>{isCompleted ? "✅ Finalizado" : "📝 Em Elaboração"}</span>
                  </span>
                </div>

                {/* Middle Info: Título do Documento & Período */}
                <div className="p-3 bg-[#F8FAFB] rounded-2xl border border-[#EEF5F6] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-white text-[#7C3AED] flex items-center justify-center shrink-0 border border-[#D8E5E7] shadow-2xs font-bold">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-xs text-[#0D2329] truncate">
                        {rep.title || "Relatório Psicopedagógico"}
                      </p>
                      <p className="text-[10px] font-semibold text-[#6B7C83]">
                        {rep.period_end ? `Avaliação clínica até ${formatDate(rep.period_end)}` : "Acompanhamento longitudinal"}
                      </p>
                    </div>
                  </div>

                  {/* Datas em Pílulas */}
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[#6B7C83] shrink-0 pt-1 sm:pt-0 border-t sm:border-none border-[#EEF5F6]">
                    <span className="bg-white px-2.5 py-1 rounded-xl border border-[#D8E5E7]">
                      Início: <strong className="text-[#0D2329]">{formatDate(rep.created_at)}</strong>
                    </span>
                    {isCompleted && rep.updated_at && (
                      <span className="bg-white px-2.5 py-1 rounded-xl border border-[#D8E5E7]">
                        Conclusão: <strong className="text-[#0D2329]">{formatDate(rep.updated_at)}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  {isCompleted ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/criancas/${rep.child_id}?tab=relatorios`)
                      }}
                      className="px-4 py-2 text-[#0284C7] bg-[#E0F2FE] hover:bg-[#0284C7] hover:text-white rounded-2xl border border-[#BAE6FD] transition-all text-xs font-black flex items-center gap-1.5 shadow-2xs active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visualizar Relatório</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/criancas/${rep.child_id}?tab=relatorios`)
                      }}
                      className="px-4 py-2 text-white bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] rounded-2xl transition-all text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Continuar Editando</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL DE SELEÇÃO DE PACIENTE PARA "+ NOVO RELATÓRIO"
          ========================================================================= */}
      {showNewReportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#EEF5F6] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0D2329]">Novo Relatório</h3>
                  <p className="text-xs font-semibold text-[#6B7C83]">Selecione a criança para iniciar</p>
                </div>
              </div>

              <button
                onClick={() => setShowNewReportModal(false)}
                className="w-7 h-7 rounded-full bg-[#F7FAFA] text-[#6B7C83] hover:text-[#0D2329] flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-[#0D2329]">
                Selecione o Paciente / Criança *
              </label>

              <select
                value={selectedChildIdForNew}
                onChange={(e) => setSelectedChildIdForNew(e.target.value)}
                className="w-full px-4 py-3 text-xs font-bold rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] focus:bg-white text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all"
              >
                <option value="">Selecione um paciente...</option>
                {allChildren.map((c) => {
                  const hasActive = reports.some((r) => r.child_id === c.id)
                  return (
                    <option key={c.id} value={c.id}>
                      {c.full_name} {hasActive ? "(Possui Relatório)" : ""}
                    </option>
                  )
                })}
              </select>

              <p className="text-[11px] font-medium text-[#6B7C83]">
                Ao selecionar, o relatório será criado e vinculado diretamente ao prontuário da criança.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EEF5F6]">
              <button
                type="button"
                onClick={() => setShowNewReportModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B7C83] hover:bg-[#F7FAFA]"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={creatingReport || !selectedChildIdForNew}
                onClick={handleStartNewReportFromPicker}
                className="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5"
              >
                {creatingReport ? <Clock className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
                <span>{creatingReport ? "Iniciando..." : "Iniciar Relatório"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
