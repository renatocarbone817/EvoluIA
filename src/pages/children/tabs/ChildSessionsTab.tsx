import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Plus,
  Search,
  Calendar,
  FileText,
  Paperclip,
  ChevronRight,
  Activity,
  X,
  Edit3,
  Trash2,
  Save,
  Clock,
  Loader2,
  CheckCircle2,
  Target,
  Sparkles,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { formatDate } from "@/lib/utils"
import toast from "react-hot-toast"
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

  // Edit session state
  const [editingSession, setEditingSession] = useState<SessionWithDocs | null>(null)
  const [editForm, setEditForm] = useState({
    session_number: 1,
    date: "",
    start_time: "",
    end_time: "",
    objective: "",
    what_was_worked: "",
    activities: "",
    test_results: "",
    professional_notes: "",
    next_objectives: "",
  })
  const [savingEdit, setSavingEdit] = useState(false)

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

  function handleStartEdit(session: SessionWithDocs, e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    setEditingSession(session)
    setEditForm({
      session_number: session.session_number || 1,
      date: session.date || new Date().toISOString().split("T")[0],
      start_time: session.start_time?.substring(0, 5) || "",
      end_time: session.end_time?.substring(0, 5) || "",
      objective: session.objective || "",
      what_was_worked: session.what_was_worked || "",
      activities: session.activities || "",
      test_results: session.test_results || "",
      professional_notes: session.professional_notes || "",
      next_objectives: session.next_objectives || "",
    })
  }

  async function handleSaveEdit() {
    if (!editingSession) return
    setSavingEdit(true)
    try {
      const { error } = await supabase
        .from("sessions")
        .update({
          session_number: Number(editForm.session_number) || 1,
          date: editForm.date,
          start_time: editForm.start_time || null,
          end_time: editForm.end_time || null,
          objective: editForm.objective || null,
          what_was_worked: editForm.what_was_worked || null,
          activities: editForm.activities || null,
          test_results: editForm.test_results || null,
          professional_notes: editForm.professional_notes || null,
          next_objectives: editForm.next_objectives || null,
        })
        .eq("id", editingSession.id)

      if (error) throw error
      toast.success("Sessão atualizada com sucesso! ✨")
      setEditingSession(null)
      if (selectedSession && selectedSession.id === editingSession.id) {
        setSelectedSession({
          ...selectedSession,
          ...editForm,
          session_number: Number(editForm.session_number) || 1,
        })
      }
      loadSessions()
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar alterações da sessão")
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDeleteSession(sessionId: string, sessionNumber?: number, e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    if (!confirm(`Deseja realmente excluir a Sessão #${sessionNumber || ""}? Esta ação não pode ser desfeita.`)) {
      return
    }
    try {
      const { error } = await supabase.from("sessions").delete().eq("id", sessionId)
      if (error) throw error
      toast.success("Sessão excluída com sucesso!")
      setSelectedSession(null)
      setEditingSession(null)
      loadSessions()
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir sessão")
    }
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
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nova Sessão</span>
        </button>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-[#F1F5F9] animate-pulse rounded-2xl border-2 border-[#D8E5E7]" />
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
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white text-xs font-black inline-flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Registrar Primeira Sessão</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((s) => {
            const isMissed = (s.objective || "").includes("Falta") || (s.professional_notes || "").includes("Motivo da ausência") || (s.professional_notes || "").includes("Motivo informado")

            return (
              <Card
                key={s.id}
                className={`cursor-pointer transition-all hover:shadow-md rounded-3xl group ${
                  isMissed
                    ? "border-2 border-[#FECACA] bg-[#FEFDFD] hover:border-[#EF4444]"
                    : "border-2 border-[#D8E5E7] bg-white hover:border-[#7C3AED]"
                }`}
                onClick={() => setSelectedSession(s)}
              >
                <CardContent className="p-4 sm:p-5">
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
                          <Badge variant="secondary" className="capitalize text-xs font-bold bg-[#EDE9FE] text-[#7C3AED] border-none">
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

                    {/* Quick Action Buttons on Card */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleStartEdit(s, e)}
                        className="p-2 rounded-xl text-[#6B7C83] hover:text-[#7C3AED] hover:bg-[#EDE9FE] transition-all cursor-pointer"
                        title="Editar Sessão"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(s.id, s.session_number, e)}
                        className="p-2 rounded-xl text-[#8CAAB1] hover:text-[#EF4444] hover:bg-red-50 transition-all cursor-pointer"
                        title="Excluir Sessão"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-[#8CAAB1] group-hover:text-[#7C3AED] group-hover:translate-x-0.5 transition-all ml-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* =========================================================================
          1. SESSION DETAILS MODAL (Visualização Completa com Edição e Exclusão)
          ========================================================================= */}
      {selectedSession && !editingSession && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="bg-white rounded-3xl border-2 border-[#D8E5E7] max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStartEdit(selectedSession)}
                  className="px-3.5 py-2 rounded-2xl bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#7C3AED] text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
                  title="Editar Sessão"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSession(null)}
                  className="w-9 h-9 rounded-2xl bg-[#F8FAFB] hover:bg-[#EDE9FE] text-[#6B7C83] hover:text-[#7C3AED] transition-all flex items-center justify-center border border-[#D8E5E7] shrink-0 cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Scrollable Body with Clean Cards */}
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

              {/* 2. O que foi trabalhado */}
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

            {/* Footer with Edit and Delete actions */}
            <div className="p-4 sm:p-5 border-t-2 border-[#EEF5F6] bg-[#F8FAFB] flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleDeleteSession(selectedSession.id, selectedSession.session_number)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Sessão</span>
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedSession(null)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white hover:bg-[#EEF5F6] text-[#6B7C83] border-2 border-[#D8E5E7] text-xs font-black transition-all active:scale-95 cursor-pointer"
                >
                  Fechar
                </button>

                <button
                  type="button"
                  onClick={() => handleStartEdit(selectedSession)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Editar Sessão</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. EDIT SESSION MODAL (Formulário Completo de Edição)
          ========================================================================= */}
      {editingSession && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setEditingSession(null)}
        >
          <div
            className="bg-white rounded-3xl border-2 border-[#D8E5E7] max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b-2 border-[#EEF5F6] flex items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] border-2 border-[#DDD6FE] flex items-center justify-center shrink-0 shadow-2xs">
                  <Edit3 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#0D2329]">
                    Editar Sessão #{editForm.session_number}
                  </h3>
                  <p className="text-xs font-semibold text-[#6B7C83]">
                    {childName} · Atualize as anotações clínicas e pedagógicas
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="w-9 h-9 rounded-2xl bg-[#F8FAFB] hover:bg-[#EDE9FE] text-[#6B7C83] hover:text-[#7C3AED] transition-all flex items-center justify-center border border-[#D8E5E7] shrink-0 cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs font-semibold text-[#2E4A52]">
              {/* Date & Times & Number */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-black text-[#0D2329]">Data da Sessão</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-[#0D2329]">Início</label>
                  <input
                    type="time"
                    value={editForm.start_time}
                    onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-[#0D2329]">Término</label>
                  <input
                    type="time"
                    value={editForm.end_time}
                    onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>

              {/* Objetivo */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-[#0D2329] flex items-center gap-1.5">
                  <span>🎯 Objetivo da Sessão</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Avaliação de consciência fonológica e leitura..."
                  value={editForm.objective}
                  onChange={(e) => setEditForm({ ...editForm, objective: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              {/* O que foi trabalhado */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-[#0D2329] flex items-center gap-1.5">
                  <span>⚡ O que foi trabalhado / Habilidades</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Descreva as habilidades trabalhadas com a criança..."
                  value={editForm.what_was_worked}
                  onChange={(e) => setEditForm({ ...editForm, what_was_worked: e.target.value })}
                  className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] resize-none"
                />
              </div>

              {/* Atividades e Jogos */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-[#0D2329] flex items-center gap-1.5">
                  <span>🎲 Atividades e Jogos Utilizados</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Jogo Lince das Letras, trilha fonológica, escrita guiada..."
                  value={editForm.activities}
                  onChange={(e) => setEditForm({ ...editForm, activities: e.target.value })}
                  className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] resize-none"
                />
              </div>

              {/* Testes e Resultados */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-[#0D2329] flex items-center gap-1.5">
                  <span>📋 Testes e Resultados (Opcional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Resultados de testagens psicopedagógicas aplicadas..."
                  value={editForm.test_results}
                  onChange={(e) => setEditForm({ ...editForm, test_results: e.target.value })}
                  className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] resize-none"
                />
              </div>

              {/* Observações Profissionais */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-[#0D2329] flex items-center gap-1.5">
                  <span>📝 Observações Clínicas & Comportamento</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Anotações sobre foco, engajamento, humor e observações clínicas..."
                  value={editForm.professional_notes}
                  onChange={(e) => setEditForm({ ...editForm, professional_notes: e.target.value })}
                  className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] resize-none"
                />
              </div>

              {/* Próximos Objetivos */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-[#0D2329] flex items-center gap-1.5">
                  <span>🚀 Próximos Passos & Planejamento</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Planejamento para a próxima sessão..."
                  value={editForm.next_objectives}
                  onChange={(e) => setEditForm({ ...editForm, next_objectives: e.target.value })}
                  className="w-full p-3 rounded-2xl border-2 border-[#D8E5E7] bg-white text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED] resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t-2 border-[#EEF5F6] bg-[#F8FAFB] flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleDeleteSession(editingSession.id, editingSession.session_number)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Sessão</span>
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => setEditingSession(null)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white hover:bg-[#EEF5F6] text-[#6B7C83] border-2 border-[#D8E5E7] text-xs font-black transition-all active:scale-95 cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={handleSaveEdit}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 stroke-[2.5]" />
                  )}
                  <span>{savingEdit ? "Salvando..." : "Salvar Alterações"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
