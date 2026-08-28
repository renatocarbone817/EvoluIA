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
        <button
          onClick={() => navigate(`/atendimento/nova/${childId}`)}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nova Sessão</span>
        </button>
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
            <button
              onClick={() => navigate(`/atendimento/nova/${childId}`)}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Primeira Sessão</span>
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((s) => {
            const isMissed = (s.objective || "").includes("Falta") || (s.professional_notes || "").includes("Motivo da ausência") || (s.professional_notes || "").includes("Motivo informado")

            return (
              <Card
                key={s.id}
                className={`cursor-pointer transition-all hover:shadow-sm ${
                  isMissed
                    ? "border-2 border-[#FECACA] bg-[#FEFDFD] hover:border-[#EF4444]"
                    : "border-2 border-[#D8E5E7] hover:border-[#7C3AED]"
                }`}
                onClick={() => setSelectedSession(s)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {isMissed ? (
                          <span className="px-2.5 py-0.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs font-black flex items-center gap-1">
                            ⚠️ Falta Registrada
                          </span>
                        ) : (
                          <span className="font-black text-base text-[#0D2329]">
                            Sessão #{s.session_number || "—"}
                          </span>
                        )}

                        <span className="text-xs font-bold text-[#6B7C83]">
                          {formatDate(s.date)}
                        </span>
                        {s.start_time && (
                          <span className="text-xs font-bold text-[#4F6C74] bg-[#EEF5F6] px-2 py-0.5 rounded-lg border border-[#D8E5E7]">
                            {s.start_time.substring(0, 5)} {s.end_time ? `- ${s.end_time.substring(0, 5)}` : ""}
                          </span>
                        )}
                        {!isMissed && (
                          <Badge variant="secondary" className="capitalize text-xs">
                            {s.status === "completed" ? "Finalizada" : "Em andamento"}
                          </Badge>
                        )}
                      </div>

                      {isMissed ? (
                        <div className="p-3 rounded-2xl bg-[#FEF8F8] border border-[#FECACA] space-y-1">
                          <p className="text-xs font-black text-[#991B1B]">
                            {s.what_was_worked || "Paciente não compareceu."}
                          </p>
                          {s.professional_notes && (
                            <p className="text-xs text-[#B91C1C] font-semibold whitespace-pre-line">
                              {s.professional_notes}
                            </p>
                          )}
                        </div>
                      ) : (
                        <>
                          {s.objective && (
                            <p className="text-sm font-bold text-[#0D2329] line-clamp-1">
                              🎯 {s.objective}
                            </p>
                          )}

                          {s.what_was_worked && (
                            <p className="text-xs text-[#6B7C83] font-medium line-clamp-2">
                              {s.what_was_worked}
                            </p>
                          )}
                        </>
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
            )
          })}
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
