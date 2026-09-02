import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
  Target,
  Brain,
  MessageCircle,
  Home,
  Save,
  CheckSquare,
  Square,
  AlertCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { ChildAvatar } from "@/components/ui/ChildAvatar"
import { formatDate } from "@/lib/utils"
import toast from "react-hot-toast"
import type { Child, Appointment } from "@/types/database"

export const INTERVENTION_SKILL_AREAS = [
  { name: "Leitura & Decodificação", icon: "📖", badgeCls: "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]" },
  { name: "Compreensão Textual", icon: "💡", badgeCls: "bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE]" },
  { name: "Escrita & Ortografia", icon: "✍️", badgeCls: "bg-[#FEF8EC] text-[#B8871E] border-[#FDE68A]" },
  { name: "Raciocínio Matemático", icon: "🔢", badgeCls: "bg-[#E8F8F5] text-[#065F46] border-[#A7F3D0]" },
  { name: "Atenção & Concentração", icon: "🎯", badgeCls: "bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]" },
  { name: "Funções Executivas & Memória", icon: "🧠", badgeCls: "bg-[#FDF2F8] text-[#BE185D] border-[#FBCFE8]" },
]

const BEHAVIOR_PRESETS = [
  { id: "focada", label: "🌟 Focada & Participativa" },
  { id: "agitada", label: "⚡ Agitada / Inquieta" },
  { id: "dispersa", label: "💭 Dispersa / Desatenta" },
  { id: "cansada", label: "😴 Cansada / Sonolenta" },
  { id: "ansiosa", label: "😟 Ansiosa / Resistente" },
  { id: "colaborativa", label: "🤝 Colaborativa & Motivada" },
]

export function ActiveInterventionSessionPage() {
  const { appointmentId, childId: paramChildId } = useParams<{
    appointmentId?: string
    childId?: string
  }>()
  const navigate = useNavigate()
  const { professional } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [child, setChild] = useState<Child | null>(null)
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [sessionNumber, setSessionNumber] = useState<number>(1)

  // Areas active for this child
  const [activeAreas, setActiveAreas] = useState<string[]>([])
  const [areaNotes, setAreaNotes] = useState<Record<string, { what_was_worked: string; child_response: string }>>({})

  // General fields
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [startTime, setStartTime] = useState(new Date().toTimeString().substring(0, 5))
  const [endTime, setEndTime] = useState("")
  const [behavior, setBehavior] = useState<string>("")
  const [generalNotes, setGeneralNotes] = useState("")
  const [familyRecommendation, setFamilyRecommendation] = useState("")
  const [nextSessionPlan, setNextSessionPlan] = useState("")

  useEffect(() => {
    loadContext()
  }, [appointmentId, paramChildId, professional?.id])

  async function loadContext() {
    const profId = professional?.id || useAuthStore.getState().user?.id
    if (!profId) return
    setLoading(true)

    try {
      let resolvedChildId = paramChildId

      if (appointmentId) {
        const { data: apptData } = await supabase
          .from("appointments")
          .select("*, child:children(*)")
          .eq("id", appointmentId)
          .single()

        if (apptData) {
          setAppointment(apptData)
          resolvedChildId = apptData.child_id
          setChild((apptData as any).child)
          if (apptData.start_time) {
            const dt = new Date(apptData.start_time)
            setDate(dt.toISOString().split("T")[0])
            setStartTime(dt.toTimeString().substring(0, 5))
          }
        }
      } else if (paramChildId) {
        const { data: childData } = await supabase
          .from("children")
          .select("*")
          .eq("id", paramChildId)
          .single()
        setChild(childData)
      }

      if (resolvedChildId) {
        // 1. Calculate next session number for intervention sessions
        const { count } = await supabase
          .from("intervention_sessions")
          .select("*", { count: "exact", head: true })
          .eq("child_id", resolvedChildId)

        setSessionNumber((count || 0) + 1)

        // 2. Load configured areas for this child
        const { data: areasData } = await supabase
          .from("intervention_areas")
          .select("area")
          .eq("child_id", resolvedChildId)

        if (areasData && areasData.length > 0) {
          const loaded = areasData.map((a) => a.area)
          setActiveAreas(loaded)
        } else {
          // If none explicitly configured in intervention_areas, check if child has goals by area
          const { data: goalsData } = await supabase
            .from("intervention_goals")
            .select("area")
            .eq("child_id", resolvedChildId)

          if (goalsData && goalsData.length > 0) {
            const uniqueGoalAreas = Array.from(new Set(goalsData.map((g) => g.area)))
            setActiveAreas(uniqueGoalAreas)
          } else {
            // Default to first 2 common areas so it's not empty
            setActiveAreas([INTERVENTION_SKILL_AREAS[0].name, INTERVENTION_SKILL_AREAS[1].name])
          }
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleToggleArea(areaName: string) {
    if (activeAreas.includes(areaName)) {
      setActiveAreas(activeAreas.filter((a) => a !== areaName))
    } else {
      setActiveAreas([...activeAreas, areaName])
    }
  }

  function handleAreaNoteChange(areaName: string, field: "what_was_worked" | "child_response", value: string) {
    setAreaNotes((prev) => ({
      ...prev,
      [areaName]: {
        what_was_worked: field === "what_was_worked" ? value : prev[areaName]?.what_was_worked || "",
        child_response: field === "child_response" ? value : prev[areaName]?.child_response || "",
      },
    }))
  }

  async function handleFinalize() {
    const profId = professional?.id || useAuthStore.getState().user?.id
    if (!child || !profId) {
      toast.error("Criança ou profissional não identificados.")
      return
    }

    if (activeAreas.length === 0) {
      toast.error("Selecione ao menos 1 área trabalhada nesta intervenção.")
      return
    }

    setSaving(true)
    try {
      // 1. Ensure active areas are saved in intervention_areas for this child
      for (const area of activeAreas) {
        await supabase
          .from("intervention_areas")
          .upsert(
            {
              professional_id: profId,
              child_id: child.id,
              area,
            },
            { onConflict: "child_id,area" }
          )
      }

      // 2. Insert intervention_session
      const { data: sessionData, error: sessionError } = await supabase
        .from("intervention_sessions")
        .insert({
          professional_id: profId,
          child_id: child.id,
          appointment_id: appointment?.id || null,
          session_number: sessionNumber,
          date,
          start_time: startTime || null,
          end_time: endTime || null,
          behavior: behavior || null,
          general_notes: generalNotes.trim() || null,
          family_recommendation: familyRecommendation.trim() || null,
          next_session_plan: nextSessionPlan.trim() || null,
          status: "completed",
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // 3. Insert notes for each area
      if (sessionData) {
        const areaInserts = activeAreas
          .map((area) => ({
            session_id: sessionData.id,
            area,
            what_was_worked: areaNotes[area]?.what_was_worked?.trim() || null,
            child_response: areaNotes[area]?.child_response?.trim() || null,
          }))
          .filter((item) => item.what_was_worked || item.child_response)

        if (areaInserts.length > 0) {
          const { error: areaErr } = await supabase
            .from("intervention_session_areas")
            .insert(areaInserts)
          if (areaErr) console.warn("Aviso ao salvar detalhes das áreas:", areaErr)
        }
      }

      // 4. Mark appointment done if linked
      if (appointment?.id) {
        await supabase
          .from("appointments")
          .update({ status: "done" })
          .eq("id", appointment.id)
      }

      // 5. If family recommendation filled, auto-add to intervention orientations
      if (familyRecommendation.trim()) {
        try {
          await supabase.from("intervention_orientations").insert({
            professional_id: profId,
            child_id: child.id,
            type: "familia",
            content: familyRecommendation.trim(),
          })
        } catch (e) {
          console.warn("Could not auto-add orientation:", e)
        }
      }

      // 6. Care plan finance sync (like regular sessions)
      try {
        const { data: carePlan } = await supabase
          .from("care_plans")
          .select("*")
          .eq("child_id", child.id)
          .single()

        if (carePlan && carePlan.price_per_session > 0) {
          const isFechamento =
            carePlan.payment_type === "por_sessao" &&
            (carePlan.notes?.includes("[TIMING:fechamento]") ||
              (carePlan.payment_due_day && carePlan.payment_due_day > 0))

          if (!isFechamento) {
            await supabase.from("financial_records").insert({
              professional_id: profId,
              child_id: child.id,
              type: "income",
              amount: carePlan.price_per_session,
              due_date: date,
              payment_date: date,
              status: "paid",
              description: `Aula de Intervenção #${sessionNumber} - ${child.full_name}`,
              category: "Intervenção Psicopedagógica",
            })
          }
        }
      } catch (finErr) {
        console.warn("Financial record check error:", finErr)
      }

      toast.success("Aula de Intervenção registrada com sucesso!")
      navigate(`/criancas/${child.id}?tab=intervencao`)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Erro ao salvar aula de intervenção.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7FAFA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-[#6B7C83]">Carregando aula de intervenção...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7FAFA] pb-24">
      {/* ── TOP HEADER ── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b-2 border-[#E2ECEE] px-4 py-3 sm:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl text-[#0D2329] hover:bg-[#F0F5F6] transition-all cursor-pointer shrink-0"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {child && (
              <div className="flex items-center gap-3 min-w-0">
                <ChildAvatar
                  name={child.full_name}
                  photoUrl={child.photo_url || undefined}
                  size="sm"
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-base sm:text-lg font-black text-[#0D2329] truncate">
                      {child.full_name}
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE]">
                      Aula #{sessionNumber}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#6B7C83]">
                    Atendimento de Intervenção Psicopedagógica
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleFinalize}
            disabled={saving}
            className="h-10 px-5 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white text-xs font-black flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{saving ? "Salvando..." : "Finalizar Aula"}</span>
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Banner Informativo */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#EDE9FE]/70 via-white to-[#FDF2F8]/70 border-2 border-[#DDD6FE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#7C3AED] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-[#0D2329]">
                Registro Direcionado por Habilidade
              </h2>
              <p className="text-xs font-medium text-[#4B5563] mt-0.5">
                Preencha apenas as áreas que você trabalhou hoje. Na hora de gerar o relatório, tudo estará organizado por área de evolução.
              </p>
            </div>
          </div>

          {/* Date & Time Mini Form */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#D8E5E7] text-xs font-bold text-[#0D2329]">
              <Calendar className="w-3.5 h-3.5 text-[#7C3AED]" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent focus:outline-none text-xs font-bold"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#D8E5E7] text-xs font-bold text-[#0D2329]">
              <Clock className="w-3.5 h-3.5 text-[#7C3AED]" />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-transparent focus:outline-none text-xs font-bold"
              />
            </div>
          </div>
        </div>

        {/* ── SELETOR DE ÁREAS TRABALHADAS ── */}
        <div className="bg-white p-5 rounded-3xl border-2 border-[#E2ECEE] shadow-2xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-black text-[#0D2329] flex items-center gap-2">
                <Target className="w-4 h-4 text-[#7C3AED]" />
                Áreas Trabalhadas Nesta Intervenção
              </h3>
              <p className="text-xs font-medium text-[#6B7C83]">
                Clique nas habilidades para ativar ou ocultar os campos desta sessão:
              </p>
            </div>
            <span className="text-xs font-black text-[#7C3AED] bg-[#EDE9FE] px-3 py-1 rounded-full border border-[#DDD6FE]">
              {activeAreas.length} {activeAreas.length === 1 ? "área ativa" : "áreas ativas"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
            {INTERVENTION_SKILL_AREAS.map((item) => {
              const isSelected = activeAreas.includes(item.name)
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleToggleArea(item.name)}
                  className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? "bg-white border-[#7C3AED] shadow-sm ring-2 ring-[#7C3AED]/20"
                      : "bg-[#F7FAFA] border-[#E2ECEE] hover:border-[#D8E5E7] opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{item.icon}</span>
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#7C3AED]" />
                    ) : (
                      <Square className="w-4 h-4 text-[#94A3B8]" />
                    )}
                  </div>
                  <span className="text-[11px] font-black text-[#0D2329] leading-tight">
                    {item.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── CAMPOS ESPECÍFICOS DE CADA ÁREA ATIVA ── */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#6B7C83] px-1 flex items-center gap-2">
            <span>Campos por Área Selecionada</span>
            <div className="h-0.5 flex-1 bg-[#E2ECEE]" />
          </h3>

          {activeAreas.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white border-2 border-dashed border-[#D8E5E7] text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-[#94A3B8] mx-auto" />
              <p className="text-sm font-bold text-[#0D2329]">
                Nenhuma área selecionada
              </p>
              <p className="text-xs text-[#6B7C83]">
                Clique em uma ou mais caixinhas acima para abrir os campos de registro.
              </p>
            </div>
          ) : (
            activeAreas.map((areaName) => {
              const areaMeta = INTERVENTION_SKILL_AREAS.find((a) => a.name === areaName) || {
                icon: "📌",
                badgeCls: "bg-gray-100 text-gray-700 border-gray-200",
              }
              const currentNotes = areaNotes[areaName] || { what_was_worked: "", child_response: "" }

              return (
                <div
                  key={areaName}
                  className="bg-white p-5 rounded-3xl border-2 border-[#E2ECEE] shadow-2xs space-y-4 animate-in fade-in-50 duration-200"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#F0F5F6]">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl p-2 rounded-2xl bg-[#F7FAFA] border border-[#E2ECEE]">
                        {areaMeta.icon}
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-[#0D2329]">{areaName}</h4>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border mt-0.5 ${areaMeta.badgeCls}`}>
                          Habilidade em Trabalho
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleArea(areaName)}
                      className="text-[11px] font-bold text-red-500 hover:text-red-700 hover:underline cursor-pointer"
                    >
                      Remover desta aula
                    </button>
                  </div>

                  {/* 2 Fields: What was worked & How child responded */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#0D2329] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
                        <span>O que foi trabalhado?</span>
                      </label>
                      <textarea
                        rows={3}
                        value={currentNotes.what_was_worked}
                        onChange={(e) => handleAreaNoteChange(areaName, "what_was_worked", e.target.value)}
                        placeholder="Jogos, fichas, dinâmicas e materiais utilizados..."
                        className="w-full p-3 rounded-2xl border-2 border-[#E2ECEE] bg-[#F7FAFA] text-xs font-medium text-[#0D2329] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#0D2329] flex items-center gap-1.5">
                        <Brain className="w-3.5 h-3.5 text-[#0369A1]" />
                        <span>Como a criança respondeu?</span>
                      </label>
                      <textarea
                        rows={3}
                        value={currentNotes.child_response}
                        onChange={(e) => handleAreaNoteChange(areaName, "child_response", e.target.value)}
                        placeholder="Evolução percebida, facilidades, pontos de trava ou recaídas..."
                        className="w-full p-3 rounded-2xl border-2 border-[#E2ECEE] bg-[#F7FAFA] text-xs font-medium text-[#0D2329] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ── REGISTRO GERAL DO ATENDIMENTO ── */}
        <div className="bg-white p-5 rounded-3xl border-2 border-[#E2ECEE] shadow-2xs space-y-5">
          <h3 className="text-sm font-black text-[#0D2329] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#7C3AED]" />
            Registro Geral da Aula de Intervenção
          </h3>

          {/* Behavior / Mood Chips */}
          <div className="space-y-2">
            <label className="text-xs font-black text-[#0D2329]">
              Disposição e Comportamento da Criança Hoje:
            </label>
            <div className="flex flex-wrap gap-2">
              {BEHAVIOR_PRESETS.map((preset) => {
                const isSelected = behavior === preset.label
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setBehavior(isSelected ? "" : preset.label)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#EDE9FE] text-[#7C3AED] border-[#7C3AED] shadow-2xs scale-105"
                        : "bg-[#F7FAFA] text-[#4B5563] border-[#E2ECEE] hover:border-[#D8E5E7]"
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Observações Clínicas Gerais */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#0D2329]">
              Observações Profissionais Gerais (Campo Livre)
            </label>
            <textarea
              rows={3}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Notas qualitativas sobre o atendimento, vínculo terapêutico, acontecimentos relevantes..."
              className="w-full p-3 rounded-2xl border-2 border-[#E2ECEE] bg-[#F7FAFA] text-xs font-medium text-[#0D2329] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all resize-none"
            />
          </div>

          {/* Orientações para a Família */}
          <div className="p-4 rounded-2xl bg-[#FEF8EC] border-2 border-[#FDE68A] space-y-2">
            <label className="text-xs font-black text-[#B8871E] flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5" />
              <span>Orientações / Recado para a Família (Salvo no prontuário da criança)</span>
            </label>
            <textarea
              rows={2}
              value={familyRecommendation}
              onChange={(e) => setFamilyRecommendation(e.target.value)}
              placeholder="Ex: Praticar a leitura das fichas amarelas 10 minutos por dia antes de dormir..."
              className="w-full p-3 rounded-xl border border-[#FDE68A] bg-white text-xs font-medium text-[#0D2329] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#B8871E] transition-all resize-none"
            />
          </div>

          {/* Planejamento Próxima Aula */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#0D2329]">
              Planejamento para a Próxima Aula (O que continuar ou introduzir)
            </label>
            <input
              type="text"
              value={nextSessionPlan}
              onChange={(e) => setNextSessionPlan(e.target.value)}
              placeholder="Ex: Trazer o jogo do Lince para avançar em decodificação rápida..."
              className="w-full p-3 rounded-2xl border-2 border-[#E2ECEE] bg-[#F7FAFA] text-xs font-medium text-[#0D2329] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#7C3AED] transition-all"
            />
          </div>
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl border-2 border-[#E2ECEE] bg-white text-xs font-black text-[#6B7C83] hover:text-[#0D2329] hover:bg-[#F7FAFA] transition-all cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleFinalize}
            disabled={saving}
            className="h-12 px-8 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white text-sm font-black flex items-center gap-2 shadow-lg hover:shadow-xl active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>{saving ? "Salvando Atendimento..." : "Finalizar & Salvar Aula de Intervenção"}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
