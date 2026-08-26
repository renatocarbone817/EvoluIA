import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Plus, Search, Filter, Users, ChevronRight, School, Calendar } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { calculateAge, formatDate } from "@/lib/utils"
import type { Child } from "@/types/database"
import { NewChildDialog } from "./NewChildDialog"

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "initial_assessment", label: "Avaliação Inicial" },
  { value: "in_progress", label: "Em Acompanhamento" },
  { value: "paused", label: "Pausado" },
  { value: "closed", label: "Encerrado" },
  { value: "archived", label: "Arquivado" },
]

export function ChildrenPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, professional } = useAuthStore()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [showNewDialog, setShowNewDialog] = useState(searchParams.get("nova") === "true")

  const profId = professional?.id || user?.id

  useEffect(() => {
    if (profId) loadChildren()
  }, [profId])

  async function loadChildren() {
    if (!profId) return
    setLoading(true)
    const { data } = await supabase
      .from("children")
      .select("*")
      .eq("professional_id", profId)
      .order("full_name")
    setChildren(data || [])
    setLoading(false)
  }

  const filtered = children.filter((c) => {
    const matchSearch = c.full_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || c.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#19323A] tracking-tight">
            Crianças & Pacientes
          </h1>
          <p className="text-[#6B7C83] text-xs font-semibold uppercase tracking-wider mt-1">
            {children.length} paciente{children.length !== 1 ? "s" : ""} registrado{children.length !== 1 ? "s" : ""} no consultório
          </p>
        </div>
        <Button size="lg" onClick={() => setShowNewDialog(true)} className="gap-2">
          <Plus className="w-5 h-5" />
          Nova Criança
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3 flex-wrap bg-white p-3 rounded-2xl border-2 border-[#D8E5E7] shadow-sm">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8DA3A8]" />
          <input
            type="text"
            placeholder="Buscar paciente por nome..."
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
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* List of Children */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white border-2 border-[#D8E5E7] animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-2 border-dashed border-[#D8E5E7] text-center py-16">
          <CardContent className="space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#EEF5F6] border-2 border-[#D8E5E7] flex items-center justify-center mx-auto text-[#245C6B]">
              <Users className="w-8 h-8" />
            </div>
            {children.length === 0 ? (
              <>
                <h3 className="font-black text-lg text-[#19323A]">Nenhuma criança cadastrada ainda</h3>
                <p className="text-xs text-[#6B7C83] max-w-sm mx-auto">
                  Cadastre o primeiro paciente para gerenciar anamnese, sessões e relatórios.
                </p>
                <Button size="lg" onClick={() => setShowNewDialog(true)} className="mt-2">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Cadastrar Primeira Criança
                </Button>
              </>
            ) : (
              <>
                <h3 className="font-bold text-base text-[#19323A]">Nenhum paciente encontrado</h3>
                <p className="text-xs text-[#6B7C83]">Tente buscar com outro termo ou filtro.</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((child) => {
            const age = child.birth_date ? calculateAge(child.birth_date) : null
            return (
              <div
                key={child.id}
                onClick={() => navigate(`/criancas/${child.id}`)}
                className="p-5 rounded-2xl border-2 border-[#D8E5E7] bg-white hover:border-[#245C6B] hover:shadow-md cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                {/* Left: Avatar + Info */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-13 h-13 w-12 h-12 rounded-2xl bg-[#245C6B] text-white font-black text-lg flex items-center justify-center shrink-0 border-2 border-[#63C7B2]/40 shadow-xs group-hover:scale-105 transition-transform">
                    {child.full_name.charAt(0).toUpperCase()}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-black text-base text-[#19323A] group-hover:text-[#245C6B] transition-colors truncate">
                        {child.full_name}
                      </h3>
                      <Badge statusKey={child.status} />
                    </div>

                    <div className="flex items-center gap-3 text-xs font-semibold text-[#6B7C83] flex-wrap">
                      {age !== null && (
                        <span className="bg-[#EEF5F6] px-2 py-0.5 rounded-md text-[#19323A]">
                          {age} anos
                        </span>
                      )}
                      {child.school && (
                        <span className="flex items-center gap-1">
                          <School className="w-3.5 h-3.5 text-[#245C6B]" />
                          {child.school}
                        </span>
                      )}
                      {child.grade && <span>· {child.grade}</span>}
                    </div>

                    {child.main_complaint && (
                      <p className="text-xs text-[#8DA3A8] line-clamp-1 italic">
                        "{child.main_complaint}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Date & Arrow */}
                <div className="flex items-center gap-4 justify-between sm:justify-end shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#EEF5F6]">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-bold uppercase text-[#8DA3A8]">Cadastrado em</p>
                    <p className="text-xs font-bold text-[#19323A]">{formatDate(child.created_at)}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-[#EEF5F6] group-hover:bg-[#245C6B] group-hover:text-white flex items-center justify-center text-[#19323A] transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <NewChildDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onSuccess={() => {
          setShowNewDialog(false)
          loadChildren()
        }}
      />
    </div>
  )
}
