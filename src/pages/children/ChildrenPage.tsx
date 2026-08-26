import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Plus, Search, Filter, Users } from "lucide-react"
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
  const { professional } = useAuthStore()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [showNewDialog, setShowNewDialog] = useState(searchParams.get("nova") === "true")

  useEffect(() => {
    if (professional) loadChildren()
  }, [professional])

  async function loadChildren() {
    setLoading(true)
    const { data } = await supabase
      .from("children")
      .select("*")
      .eq("professional_id", professional!.id)
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
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Crianças</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {children.length} criança{children.length !== 1 ? "s" : ""} cadastrada{children.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="w-4 h-4" />
          Nova criança
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar criança..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 h-10 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            {children.length === 0 ? (
              <>
                <p className="font-semibold text-lg">Nenhuma criança cadastrada</p>
                <p className="text-sm text-muted-foreground mt-2 mb-6">
                  Comece cadastrando a primeira criança para acompanhar.
                </p>
                <Button onClick={() => setShowNewDialog(true)}>
                  <Plus className="w-4 h-4" />
                  Cadastrar primeira criança
                </Button>
              </>
            ) : (
              <>
                <p className="font-semibold">Nenhum resultado encontrado</p>
                <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros.</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((child) => (
            <Card
              key={child.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/criancas/${child.id}`)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                {/* Avatar */}
                <div className="w-11 h-11 bg-foreground/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-foreground/70">
                    {child.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{child.full_name}</p>
                    <Badge statusKey={child.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                    {child.birth_date && (
                      <span>{calculateAge(child.birth_date)} anos</span>
                    )}
                    {child.school && <span>· {child.school}</span>}
                    {child.grade && <span>· {child.grade}</span>}
                  </div>
                </div>

                {/* Date */}
                <div className="text-right hidden sm:block flex-shrink-0">
                  <p className="text-xs text-muted-foreground">Cadastro</p>
                  <p className="text-sm font-medium">{formatDate(child.created_at)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
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
