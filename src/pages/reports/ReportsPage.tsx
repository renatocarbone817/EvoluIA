import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { FileText, Eye, Printer, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { formatDate } from "@/lib/utils"
import type { Report } from "@/types/database"

interface ReportWithChild extends Report {
  child?: {
    id: string
    full_name: string
  }
}

export function ReportsPage() {
  const navigate = useNavigate()
  const { professional } = useAuthStore()
  const [reports, setReports] = useState<ReportWithChild[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (professional) loadReports()
  }, [professional])

  async function loadReports() {
    setLoading(true)
    const { data } = await supabase
      .from("reports")
      .select("*, child:children(id, full_name)")
      .eq("professional_id", professional!.id)
      .order("created_at", { ascending: false })

    setReports((data || []) as ReportWithChild[])
    setLoading(false)
  }

  const filtered = reports.filter((r) => {
    const text = `${r.title} ${r.child?.full_name || ""}`.toLowerCase()
    return text.includes(search.toLowerCase())
  })

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Central de Relatórios</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Consulte e imprima todos os relatórios emitidos para seus pacientes.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar relatório ou criança..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 h-10 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
            Nenhum relatório emitido ainda. Você pode emitir relatórios na aba "Relatórios" do perfil de cada criança.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((rep) => (
            <Card key={rep.id} className="hover:border-foreground/30 transition-colors">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-sm">{rep.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    Paciente: <strong>{rep.child?.full_name}</strong> · Emitido em {formatDate(rep.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/criancas/${rep.child_id}`)}
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    Abrir Ficha
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
