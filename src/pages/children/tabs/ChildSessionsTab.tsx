import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Search, Calendar, FileText, Paperclip, ChevronRight, Activity, X } from "lucide-react"
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
  areas_worked?: string[] | null
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
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8CAAB1]" />
          <input
            type="text"
            placeholder="Buscar nas anotações das sessões..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED] transition-all shadow-2xs placeholder:text-[#8CAAB1]"
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
        <div className="p-8 sm:p-12 rounded-3xl bg-white border-2 border-dashed border-[#D8E5E7] text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-[#EDE9FE] border-2 border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center mx-auto shadow-xs">
            <Activity className="w-8 h-8" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-black text-[#0D2329]">Nenhuma sessão registrada</h3>
            <p className="text-xs font-semibold text-[#6B7C83] leading-relaxed">
              Comece a registrar as sessões de acompanhamento para construir o histórico clínico e pedagógico de <strong>{childName || "este paciente"}</strong>.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate(`/atendimento/nova/${childId}`)}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white text-xs font-black inline-flex items-center gap-2 shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Registrar Primeira Sessão</span>
            </button>
          </div>
        </div>
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

      {/* Session Details Modal (Design Moderno & Colorido) */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b-2 border-[#EEF5F6] flex items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] border-2 border-[#DDD6FE] flex items-center justify-center shrink-0 shadow-2xs">
                  <Activity className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-[#0D2329] truncate">
                      Sessão #{selectedSession.session_number || "—"} — {childName}
                    </h2>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#E8F8F5] text-[#065F46] border border-[#A7F3D0]">
                      ✓ Realizada
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#6B7C83] mt-0.5">
                    {formatDate(selectedSession.date)}
                    {selectedSession.start_time && ` às ${selectedSession.start_time.substring(0, 5)}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="w-9 h-9 rounded-2xl bg-[#F8FAFB] hover:bg-[#EDE9FE] text-[#6B7C83] hover:text-[#7C3AED] transition-all flex items-center justify-center border border-[#D8E5E7] shrink-0"
                title="Fechar"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Scrollable Body with Clean Pastel Cards */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {/* 1. Objetivo da Sessão */}
              {selectedSession.objective && (
                <div className="p-4 rounded-2xl bg-[#F8FAFB] border border-[#EEF5F6] space-y-1.5">
                  <h4 className="font-black text-xs text-[#0D2329] uppercase tracking-wide flex items-center gap-1.5">
                    <span>🎯</span>
                    <span>Objetivo da Sessão</span>
                  </h4>
                  <p className="text-xs sm:text-sm font-medium text-[#2E4A52] leading-relaxed whitespace-pre-wrap">
                    {selectedSession.objective}
                  </p>
                </div>
              )}

              {/* 2. O que foi trabalhado / Habilidades */}
              {(selectedSession.what_was_worked || (selectedSession.areas_worked && selectedSession.areas_worked.length > 0)) && (
                <div className="p-4 rounded-2xl bg-[#F8FAFB] border border-[#EEF5F6] space-y-2">
                  <h4 className="font-black text-xs text-[#0D2329] uppercase tracking-wide flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>O que foi trabalhado</span>
                  </h4>

                  {selectedSession.areas_worked && selectedSession.areas_worked.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5 pb-1">
                      {selectedSession.areas_worked.map((area: string) => (
                        <span
                          key={area}
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#E8F8F5] text-[#065F46] border border-[#A7F3D0]"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  )}

                  {selectedSession.what_was_worked && (
                    <p className="text-xs sm:text-sm font-medium text-[#2E4A52] leading-relaxed whitespace-pre-wrap">
                      {selectedSession.what_was_worked}
                    </p>
                  )}
                </div>
              )}

              {/* 3. Atividades Realizadas */}
              {selectedSession.activities && (
                <div className="p-4 rounded-2xl bg-[#F8FAFB] border border-[#EEF5F6] space-y-1.5">
                  <h4 className="font-black text-xs text-[#0D2329] uppercase tracking-wide flex items-center gap-1.5">
                    <span>🎲</span>
                    <span>Atividades e Jogos Realizados</span>
                  </h4>
                  <p className="text-xs sm:text-sm font-medium text-[#2E4A52] leading-relaxed whitespace-pre-wrap">
                    {selectedSession.activities}
                  </p>
                </div>
              )}

              {/* 4. Testes e Resultados */}
              {selectedSession.test_results && (
                <div className="p-4 rounded-2xl bg-[#F8FAFB] border border-[#EEF5F6] space-y-1.5">
                  <h4 className="font-black text-xs text-[#0D2329] uppercase tracking-wide flex items-center gap-1.5">
                    <span>📋</span>
                    <span>Testes e Resultados</span>
                  </h4>
                  <p className="text-xs sm:text-sm font-medium text-[#2E4A52] leading-relaxed whitespace-pre-wrap">
                    {selectedSession.test_results}
                  </p>
                </div>
              )}

              {/* 5. Observações Profissionais */}
              {selectedSession.professional_notes && (
                <div className="p-4 rounded-2xl bg-[#F8FAFB] border border-[#EEF5F6] space-y-1.5">
                  <h4 className="font-black text-xs text-[#0D2329] uppercase tracking-wide flex items-center gap-1.5">
                    <span>📝</span>
                    <span>Observações Profissionais & Comportamento</span>
                  </h4>
                  <p className="text-xs sm:text-sm font-medium text-[#2E4A52] leading-relaxed whitespace-pre-wrap">
                    {selectedSession.professional_notes}
                  </p>
                </div>
              )}

              {/* 6. Próximos Objetivos */}
              {selectedSession.next_objectives && (
                <div className="p-4 rounded-2xl bg-[#F8FAFB] border border-[#EEF5F6] space-y-1.5">
                  <h4 className="font-black text-xs text-[#0D2329] uppercase tracking-wide flex items-center gap-1.5">
                    <span>🚀</span>
                    <span>Próximos Objetivos & Planejamento</span>
                  </h4>
                  <p className="text-xs sm:text-sm font-medium text-[#2E4A52] leading-relaxed whitespace-pre-wrap">
                    {selectedSession.next_objectives}
                  </p>
                </div>
              )}

              {/* 7. Anexos */}
              {selectedSession.session_documents && selectedSession.session_documents.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#F8FAFB] border border-[#EEF5F6] space-y-2">
                  <h4 className="font-black text-xs text-[#0D2329] uppercase tracking-wide flex items-center gap-1.5">
                    <span>📎</span>
                    <span>Anexos da Sessão ({selectedSession.session_documents.length})</span>
                  </h4>
                  <div className="space-y-1.5">
                    {selectedSession.session_documents.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-[#D8E5E7]"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="w-4 h-4 text-[#7C3AED] shrink-0" />
                          <span className="truncate text-xs font-bold text-[#0D2329]">{doc.file_name}</span>
                        </div>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-black text-[#7C3AED] hover:underline shrink-0 ml-2"
                        >
                          Visualizar
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t-2 border-[#EEF5F6] bg-white flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#8CAAB1]">
                🔒 Registro clínico confidencial
              </span>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
