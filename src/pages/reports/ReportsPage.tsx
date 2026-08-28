import { useState, useEffect } from "react"
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

      setReports((data || []) as ReportWithChild[])
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
          introduction:
            "O presente relatório tem como objetivo apresentar a evolução psicopedagógica, os aspectos cognitivos observados e o desempenho nas atividades propostas durante o período de atendimento.",
          development:
            "Durante os atendimentos realizados no período, foram trabalhadas habilidades de leitura, escrita, raciocínio lógico-matemático, atenção concentrada e funções executivas. A criança demonstrou engajamento nas intervenções lúdicas e psicopedagógicas.",
          conclusion:
            "Com base nas atividades e estímulos aplicados, recomenda-se a continuidade dos atendimentos psicopedagógicos com foco no fortalecimento da autonomia e estratégias de aprendizagem.",
          attachments: [],
        },
        period_start: selectedChild.created_at ? selectedChild.created_at.split("T")[0] : null,
        period_end: new Date().toISOString().split("T")[0],
      })

      if (reportError) throw reportError

      // 2. Atualizar status da criança para EM RELATÓRIO
      await supabase
        .from("children")
        .update({ status: "report_in_progress" })
        .eq("id", selectedChild.id)

      toast.success("Relatório iniciado com sucesso! Redirecionando para a ficha...", { icon: "📝" })
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
          <p className="text-xs sm:text-sm font-semibold text-[#6B7C83]">
            Acompanhe e gerencie os relatórios dos seus pacientes.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setShowNewReportModal(true)}
          className="h-10 px-5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white text-xs font-black flex items-center gap-2 shadow-md active:scale-95 transition-all shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Novo Relatório</span>
        </button>
      </div>

      {/* 2. 3 SUMMARY CARDS (DADOS REAIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: TOTAL DE RELATÓRIOS */}
        <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm flex items-center justify-between hover:border-[#7C3AED]/40 transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase text-[#6B7C83] tracking-wider">
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
        <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm flex items-center justify-between hover:border-[#F59E0B]/40 transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase text-[#6B7C83] tracking-wider">
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
        <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm flex items-center justify-between hover:border-[#0284C7]/40 transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase text-[#6B7C83] tracking-wider">
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

      {/* 3. TOOLBAR: BUSCA & FILTRO */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-[#D8E5E7] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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

          {/* Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto shrink-0">
            {[
              { id: "todos", label: "Todos", count: totalReports },
              { id: "in_progress", label: "Em Relatório", count: inProgressReports },
              { id: "final", label: "Finalizados", count: completedReports },
            ].map((f) => {
              const isSelected = filterType === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id as ReportFilterType)}
                  className={`px-3.5 py-2 rounded-xl border-2 text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                    isSelected
                      ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-xs"
                      : "bg-white text-[#4F6C74] border-[#D8E5E7] hover:border-[#7C3AED]/40 hover:bg-[#F7FAFA]"
                  }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                      isSelected ? "bg-white/25 text-white" : "bg-[#F7FAFA] text-[#6B7C83] border border-[#D8E5E7]"
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

      {/* 4. LISTA PRINCIPAL DE RELATÓRIOS */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-white border-2 border-[#D8E5E7] animate-pulse rounded-3xl shadow-xs" />
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
                className="mt-3 px-5 py-2.5 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black inline-flex items-center gap-2 shadow-md transition-all active:scale-95"
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
        <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] shadow-sm overflow-hidden divide-y divide-[#EEF5F6]">
          {filtered.map((rep) => {
            const childName = rep.child?.full_name || "Paciente"
            const isCompleted = rep.status === "final" || rep.status === "completed" || rep.child?.status === "report_completed"

            return (
              <div
                key={rep.id}
                onClick={() => navigate(`/criancas/${rep.child_id}?tab=relatorios`)}
                className="p-4 sm:p-5 hover:bg-[#FAF5FF] transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                {/* 1. Criança / Paciente */}
                <div className="flex items-center gap-3.5 min-w-0 md:w-1/4">
                  <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] border-2 border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center font-black text-base overflow-hidden shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    {rep.child?.photo_url ? (
                      <img src={rep.child.photo_url} alt={childName} className="w-full h-full object-cover" />
                    ) : (
                      childName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-sm text-[#0D2329] group-hover:text-[#7C3AED] truncate transition-colors">
                      {childName}
                    </h3>
                    <p className="text-xs font-semibold text-[#6B7C83] truncate mt-0.5">
                      {rep.child?.school ? `🏫 ${rep.child.school}` : "Escola não informada"}
                    </p>
                  </div>
                </div>

                {/* 2. Título do Relatório */}
                <div className="min-w-0 md:w-1/4">
                  <p className="font-black text-xs text-[#0D2329] truncate">
                    {rep.title || "Relatório Psicopedagógico"}
                  </p>
                  <p className="text-[11px] font-semibold text-[#6B7C83]">
                    {rep.period_end ? `Avaliação até ${formatDate(rep.period_end)}` : "Acompanhamento clínico"}
                  </p>
                </div>

                {/* 3. Status */}
                <div className="min-w-0 md:w-1/6">
                  <span
                    className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
                      isCompleted
                        ? "bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]"
                        : "bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE]"
                    }`}
                  >
                    {isCompleted ? "✅ Finalizado" : "📝 Em Relatório"}
                  </span>
                </div>

                {/* 4. Datas: Iniciado / Finalizado */}
                <div className="min-w-0 md:w-1/5 text-xs space-y-0.5 text-[#6B7C83]">
                  <p className="font-semibold">
                    Iniciado em: <strong className="text-[#0D2329]">{formatDate(rep.created_at)}</strong>
                  </p>
                  <p className="font-semibold">
                    Finalizado em:{" "}
                    {isCompleted && rep.updated_at ? (
                      <strong className="text-[#0D2329]">{formatDate(rep.updated_at)}</strong>
                    ) : (
                      <span className="text-[#8CAAB1]">—</span>
                    )}
                  </p>
                </div>

                {/* 5. Ações */}
                <div className="flex items-center gap-2 shrink-0 justify-end">
                  {isCompleted ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/criancas/${rep.child_id}?tab=relatorios`)
                      }}
                      className="px-3.5 py-2 text-[#0284C7] bg-[#E0F2FE] hover:bg-[#0284C7] hover:text-white rounded-xl border border-[#BAE6FD] transition-all text-xs font-black flex items-center gap-1.5 shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visualizar</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/criancas/${rep.child_id}?tab=relatorios`)
                      }}
                      className="px-3.5 py-2 text-white bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] rounded-xl transition-all text-xs font-black flex items-center gap-1.5 shadow-xs active:scale-95"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Continuar</span>
                    </button>
                  )}

                  <div className="w-8 h-8 rounded-xl bg-[#F7FAFA] group-hover:bg-[#EDE9FE] text-[#6B7C83] group-hover:text-[#7C3AED] flex items-center justify-center transition-colors">
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
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
