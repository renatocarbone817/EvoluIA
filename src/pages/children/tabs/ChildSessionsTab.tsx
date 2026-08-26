import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Search, Calendar, FileText, Paperclip, ChevronRight, Activity } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { formatDate } from "@/lib/utils"
import type { Session, SessionDocument } from "@/types/database"

interface ChildSessionsTabProps {
  childId: string
  childName: string
}

interface SessionWithDocs extends Session {
  session_documents?: SessionDocument[]
}

export function ChildSessionsTab({ childId, childName }: ChildSessionsTabProps) {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionWithDocs[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedSession, setSelectedSession] = useState<SessionWithDocs | null>(null)

  useEffect(() => {
    loadSessions()
  }, [childId])

  async function loadSessions() {
    setLoading(true)
    const { data } = await supabase
      .from("sessions")
      .select("*, session_documents(*)")
      .eq("child_id", childId)
      .order("session_number", { ascending: false })

    setSessions((data || []) as SessionWithDocs[])
    setLoading(false)
  }

  const filtered = sessions.filter((s) => {
    const text = `${s.objective || ""} ${s.what_was_worked || ""} ${s.activities || ""} ${s.test_results || ""} ${s.professional_notes || ""}`.toLowerCase()
    return text.includes(search.toLowerCase())
  })

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar nas anotações das sessões..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 h-10 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button onClick={() => navigate(`/atendimento/nova/${childId}`)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Registrar Nova Sessão
        </Button>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold text-base">Nenhuma sessão registrada</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Comece a registrar as sessões de acompanhamento para construir o histórico.
            </p>
            <Button onClick={() => navigate(`/atendimento/nova/${childId}`)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Registrar Primeira Sessão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((s) => (
            <Card
              key={s.id}
              className="cursor-pointer hover:border-foreground/40 transition-all hover:shadow-sm"
              onClick={() => setSelectedSession(s)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-base">
                        Sessão #{s.session_number || "—"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(s.date)}
                      </span>
                      {s.start_time && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {s.start_time.substring(0, 5)} {s.end_time ? `- ${s.end_time.substring(0, 5)}` : ""}
                        </span>
                      )}
                      <Badge variant="secondary" className="capitalize text-xs">
                        {s.status === "completed" ? "Finalizada" : "Em andamento"}
                      </Badge>
                    </div>

                    {s.objective && (
                      <p className="text-sm font-medium text-foreground line-clamp-1">
                        🎯 {s.objective}
                      </p>
                    )}

                    {s.what_was_worked && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {s.what_was_worked}
                      </p>
                    )}

                    {s.session_documents && s.session_documents.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{s.session_documents.length} anexo(s)</span>
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border border-border max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  Sessão #{selectedSession.session_number} — {childName}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(selectedSession.date)}
                  {selectedSession.start_time && ` às ${selectedSession.start_time.substring(0, 5)}`}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedSession(null)}>
                Fechar
              </Button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {selectedSession.objective && (
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Objetivo da Sessão
                  </h4>
                  <p className="bg-muted/40 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                    {selectedSession.objective}
                  </p>
                </div>
              )}

              {selectedSession.what_was_worked && (
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    O que foi trabalhado
                  </h4>
                  <p className="bg-muted/40 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                    {selectedSession.what_was_worked}
                  </p>
                </div>
              )}

              {selectedSession.activities && (
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Atividades Realizadas
                  </h4>
                  <p className="bg-muted/40 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                    {selectedSession.activities}
                  </p>
                </div>
              )}

              {selectedSession.test_results && (
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Testes e Resultados
                  </h4>
                  <p className="bg-muted/40 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                    {selectedSession.test_results}
                  </p>
                </div>
              )}

              {selectedSession.professional_notes && (
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Observações Profissionais
                  </h4>
                  <p className="bg-muted/40 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                    {selectedSession.professional_notes}
                  </p>
                </div>
              )}

              {selectedSession.next_objectives && (
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Próximos Objetivos
                  </h4>
                  <p className="bg-muted/40 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                    {selectedSession.next_objectives}
                  </p>
                </div>
              )}

              {selectedSession.session_documents && selectedSession.session_documents.length > 0 && (
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Anexos da Sessão ({selectedSession.session_documents.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedSession.session_documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg border border-border/50"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="truncate text-xs font-medium">{doc.file_name}</span>
                        </div>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-foreground underline hover:opacity-75 shrink-0 ml-2"
                        >
                          Visualizar
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
              <Button onClick={() => setSelectedSession(null)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
