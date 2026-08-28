import { useState } from "react"
import {
  Calendar,
  Clock,
  DollarSign,
  Edit,
  User,
  UserPlus,
  Phone,
  MessageSquare,
  Copy,
  Check,
  School,
  Cake,
  Activity,
  Sparkles,
  Heart,
  Baby,
  Smile,
  CheckCircle2,
  AlertCircle,
  FileText,
  Bookmark,
} from "lucide-react"
import { calculateAge, formatDate, formatDateTime, formatPhone, STATUS_LABELS } from "@/lib/utils"
import { Badge } from "@/components/ui/Badge"
import type { Child, Guardian, Appointment } from "@/types/database"
import { AddGuardianDialog } from "./AddGuardianDialog"
import { CarePlanDialog } from "./CarePlanDialog"
import toast from "react-hot-toast"

interface ChildSummaryTabProps {
  child: Child
  guardians: Guardian[]
  nextAppointment: Appointment | null
  sessionCount: number
  onReload: () => void
}

export function ChildSummaryTab({
  child,
  guardians,
  nextAppointment,
  sessionCount,
  onReload,
}: ChildSummaryTabProps) {
  const [showAddGuardian, setShowAddGuardian] = useState(false)
  const [showCarePlan, setShowCarePlan] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function handleCopyPhone(e: React.MouseEvent, id: string, phone: string) {
    e.stopPropagation()
    const clean = phone.replace(/\D/g, "")
    navigator.clipboard.writeText(clean || phone)
    setCopiedId(id)
    toast.success("Telefone copiado!")
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 1. TOP METRICS CARDS (Dashboard-style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Idade */}
        <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm flex items-center justify-between hover:border-[#F59E0B]/40 transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase text-[#6B7C83] tracking-wider">
              Idade do Paciente
            </p>
            <h3 className="text-2xl font-black text-[#0D2329]">
              {child.birth_date ? `${calculateAge(child.birth_date)} anos` : "—"}
            </h3>
            <span className="inline-block text-[11px] font-bold text-[#B8871E]">
              {child.birth_date ? `Nasc: ${formatDate(child.birth_date)}` : "Data não informada"}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FEF8EC] border border-[#FDE68A] text-[#F59E0B] flex items-center justify-center shrink-0 shadow-xs">
            <Cake className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Sessões Realizadas */}
        <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm flex items-center justify-between hover:border-[#7C3AED]/40 transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase text-[#6B7C83] tracking-wider">
              Sessões Concluídas
            </p>
            <h3 className="text-2xl font-black text-[#0D2329]">{sessionCount}</h3>
            <span className="inline-block text-[11px] font-bold text-[#7C3AED]">
              Atendimentos realizados
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] border border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center shrink-0 shadow-xs">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Escola / Série */}
        <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm flex items-center justify-between hover:border-[#0284C7]/40 transition-all">
          <div className="space-y-1 min-w-0 pr-2">
            <p className="text-[11px] font-black uppercase text-[#6B7C83] tracking-wider">
              Escola / Série
            </p>
            <h3 className="text-sm sm:text-base font-black text-[#0D2329] truncate">
              {child.school || "Não informada"}
            </h3>
            <span className="inline-block text-[11px] font-bold text-[#0284C7] truncate">
              {child.grade || "Série não informada"}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] border border-[#BAE6FD] text-[#0284C7] flex items-center justify-center shrink-0 shadow-xs">
            <School className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Próximo Atendimento */}
        <div className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm flex items-center justify-between hover:border-[#10B981]/40 transition-all">
          <div className="space-y-1 min-w-0 pr-2">
            <p className="text-[11px] font-black uppercase text-[#6B7C83] tracking-wider">
              Próxima Sessão
            </p>
            <h3 className="text-sm font-black text-[#0D2329] truncate">
              {nextAppointment ? formatDateTime(nextAppointment.start_time) : "Sem agendamento"}
            </h3>
            <span className="inline-block text-[11px] font-bold text-[#10B981] truncate">
              {nextAppointment ? nextAppointment.type : "Nenhum horário marcado"}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#E8F8F5] border border-[#A7F3D0] text-[#10B981] flex items-center justify-center shrink-0 shadow-xs">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Queixa & Observações */}
        <div className="space-y-6">
          {/* Card Queixa Principal */}
          <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-3.5 hover:border-[#F59E0B]/50 transition-all">
            <div className="flex items-center gap-2.5 text-[#B8871E]">
              <div className="w-8 h-8 rounded-xl bg-[#FEF8EC] border border-[#FDE68A] flex items-center justify-center text-[#F59E0B]">
                <Bookmark className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-[#0D2329]">
                Queixa Principal / Motivo Inicial
              </h3>
            </div>

            {child.main_complaint ? (
              <div className="p-4 rounded-2xl bg-[#FEF8EC] border border-[#FDE68A] text-[#8B6514] text-xs font-bold leading-relaxed shadow-2xs">
                "{child.main_complaint}"
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#F7FAFA] border border-[#D8E5E7] text-[#8CAAB1] text-xs font-semibold italic text-center">
                Nenhuma queixa principal registrada ainda.
              </div>
            )}
          </div>

          {/* Card Observações Gerais */}
          <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-3.5 hover:border-[#7C3AED]/50 transition-all">
            <div className="flex items-center gap-2.5 text-[#7C3AED]">
              <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED]">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-[#0D2329]">
                Observações Gerais & Histórico
              </h3>
            </div>

            {child.notes ? (
              <div className="p-4 rounded-2xl bg-[#F7FAFA] border border-[#D8E5E7] text-[#0D2329] text-xs font-semibold leading-relaxed whitespace-pre-wrap">
                {child.notes}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#F7FAFA] border border-[#D8E5E7] text-[#8CAAB1] text-xs font-semibold italic text-center">
                Nenhuma observação cadastrada.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Responsáveis & Acompanhamento */}
        <div className="space-y-6">
          {/* Card Responsáveis */}
          <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-4 hover:border-[#10B981]/50 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E8F8F5] border border-[#A7F3D0] flex items-center justify-center text-[#10B981]">
                  <Baby className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-[#0D2329]">
                  Responsáveis & Família ({guardians.length})
                </h3>
              </div>

              <button
                onClick={() => setShowAddGuardian(true)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white text-xs font-black flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Vincular</span>
              </button>
            </div>

            {guardians.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#F7FAFA] border border-[#D8E5E7] text-[#8CAAB1] text-xs font-semibold italic text-center">
                Nenhum responsável vinculado a esta criança ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {guardians.map((g) => {
                  const rawPhone = g.whatsapp || g.phone || ""
                  const cleanPhone = rawPhone.replace(/\D/g, "")
                  const isCopied = copiedId === g.id

                  return (
                    <div
                      key={g.id}
                      className="p-3.5 rounded-2xl border-2 border-[#D8E5E7] bg-[#F7FAFA] hover:bg-white hover:border-[#7C3AED]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] text-[#7C3AED] font-black text-sm flex items-center justify-center shrink-0 border border-[#DDD6FE]">
                          {g.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-xs text-[#0D2329] truncate">{g.full_name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#6B7C83] font-bold">
                            {rawPhone ? (
                              <span className="font-mono text-[#065F46] font-black">{formatPhone(rawPhone)}</span>
                            ) : (
                              <span className="italic text-[#8CAAB1]">Sem telefone</span>
                            )}
                            {g.cpf && <span>• CPF: {g.cpf}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        {rawPhone && (
                          <button
                            type="button"
                            onClick={(e) => handleCopyPhone(e, g.id, rawPhone)}
                            className="px-2 py-1 bg-white hover:bg-[#EDE9FE] text-[#6B7C83] hover:text-[#7C3AED] border border-[#D8E5E7] rounded-lg transition-colors text-[10px] font-bold"
                            title="Copiar telefone"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}

                        {cleanPhone && (
                          <a
                            href={`https://wa.me/55${cleanPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-[#E8F8F5] text-[#065F46] hover:bg-[#10B981] hover:text-white border border-[#10B981]/30 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs"
                          >
                            <MessageSquare className="w-3.5 h-3.5 fill-current" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Card Acompanhamento & Frequência */}
          <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-4 hover:border-[#0284C7]/50 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E0F2FE] border border-[#BAE6FD] flex items-center justify-center text-[#0284C7]">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-[#0D2329]">
                  Acompanhamento & Frequência
                </h3>
              </div>

              <button
                onClick={() => setShowCarePlan(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#F7FAFA] hover:bg-[#EDE9FE] text-[#6B7C83] hover:text-[#7C3AED] border-2 border-[#D8E5E7] text-xs font-bold transition-all shadow-2xs"
              >
                <Edit className="w-3.5 h-3.5 inline mr-1" />
                <span>Configurar</span>
              </button>
            </div>

            <div className="space-y-2 text-xs divide-y divide-[#EEF5F6]">
              <div className="flex items-center justify-between py-2">
                <span className="font-bold text-[#6B7C83]">Início do Atendimento:</span>
                <span className="font-black text-[#0D2329] bg-[#F7FAFA] px-2.5 py-1 rounded-lg border border-[#D8E5E7]">
                  📅 {formatDate(child.created_at)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="font-bold text-[#6B7C83]">Status Atual:</span>
                <Badge statusKey={child.status} type="child" />
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="font-bold text-[#6B7C83]">Atendimentos Realizados:</span>
                <span className="font-black text-[#7C3AED] bg-[#EDE9FE] px-2.5 py-1 rounded-lg border border-[#DDD6FE]">
                  ✨ {sessionCount} sessões concluídas
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddGuardianDialog
        open={showAddGuardian}
        childId={child.id}
        onClose={() => setShowAddGuardian(false)}
        onSuccess={() => {
          setShowAddGuardian(false)
          onReload()
        }}
      />

      <CarePlanDialog
        open={showCarePlan}
        childId={child.id}
        childName={child.full_name}
        onClose={() => setShowCarePlan(false)}
        onSuccess={() => {
          setShowCarePlan(false)
          onReload()
        }}
      />
    </div>
  )
}
