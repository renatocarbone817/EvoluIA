import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Plus,
  Search,
  Users,
  ChevronRight,
  School,
  Calendar,
  UserCheck,
  Phone,
  MessageSquare,
  Sparkles,
  BookOpen,
  Cake,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { calculateAge, formatDate, formatPhone } from "@/lib/utils"
import type { Child, Guardian } from "@/types/database"
import { NewChildDialog } from "./NewChildDialog"

interface ChildWithDetails extends Child {
  guardians?: {
    relationship: string | null
    is_primary: boolean
    guardian: Guardian | null
  }[]
}

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
  const [children, setChildren] = useState<ChildWithDetails[]>([])
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
    try {
      const { data, error } = await supabase
        .from("children")
        .select(`
          *,
          guardians:guardian_children(
            relationship,
            is_primary,
            guardian:guardians(id, full_name, phone, whatsapp)
          )
        `)
        .eq("professional_id", profId)
        .order("full_name")

      if (!error && data) {
        setChildren(data as any)
      } else {
        const { data: fallback } = await supabase
          .from("children")
          .select("*")
          .eq("professional_id", profId)
          .order("full_name")
        setChildren(fallback || [])
      }
    } finally {
      setLoading(false)
    }
  }

  // Smart search: matches child name, school, complaint OR parent name/phone!
  const filtered = children.filter((c) => {
    const q = search.toLowerCase().trim()
    const matchStatus = !statusFilter || c.status === statusFilter
    if (!matchStatus) return false
    if (!q) return true

    const childText = `${c.full_name} ${c.school || ""} ${c.grade || ""} ${c.main_complaint || ""}`.toLowerCase()
    if (childText.includes(q)) return true

    // Match parent name or phone
    const guardianMatch = c.guardians?.some((g) =>
      g.guardian?.full_name?.toLowerCase().includes(q) ||
      g.guardian?.phone?.includes(q)
    )
    if (guardianMatch) return true

    return false
  })

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#19323A] tracking-tight">
            Crianças & Pacientes
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7C83] mt-1">
            {children.length} paciente{children.length !== 1 ? "s" : ""} cadastrado{children.length !== 1 ? "s" : ""} no consultório
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
            placeholder="Buscar por nome da criança, responsável, escola ou queixa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 h-11 rounded-xl border-2 border-[#D8E5E7] bg-[#F7FAFA] text-sm font-semibold text-[#19323A] focus-visible:outline-none focus-visible:border-[#245C6B] focus-visible:bg-white transition-all placeholder:text-[#8DA3A8] placeholder:font-normal"
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

      {/* Grid of Children Cards (2 Columns - Rich details like Guardians) */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-56 bg-white border-2 border-[#D8E5E7] animate-pulse rounded-2xl" />
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
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((child) => {
            const age = child.birth_date ? calculateAge(child.birth_date) : null
            const linkedGuardians = child.guardians?.filter((g) => g.guardian) || []
            const primaryGuardian = linkedGuardians[0]?.guardian
            const rawPhone = primaryGuardian?.whatsapp || primaryGuardian?.phone || ""
            const cleanPhone = rawPhone.replace(/\D/g, "")

            return (
              <div
                key={child.id}
                onClick={() => navigate(`/criancas/${child.id}`)}
                className="p-5 rounded-2xl border-2 border-[#D8E5E7] bg-white hover:border-[#245C6B] hover:shadow-md cursor-pointer transition-all space-y-4 flex flex-col justify-between group"
              >
                {/* 1. Header: Avatar + Name + Status + WhatsApp */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[#245C6B] text-white font-black text-lg flex items-center justify-center shrink-0 border-2 border-[#63C7B2]/40 shadow-xs group-hover:scale-105 transition-transform">
                        {child.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-base text-[#19323A] group-hover:text-[#245C6B] transition-colors truncate leading-tight">
                            {child.full_name}
                          </h3>
                        </div>
                        <div className="mt-1">
                          <Badge statusKey={child.status} />
                        </div>
                      </div>
                    </div>

                    {cleanPhone && (
                      <a
                        href={`https://wa.me/55${cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs bg-[#E8F8F5] text-[#20836F] border-2 border-[#63C7B2]/40 hover:bg-[#63C7B2] hover:text-white px-3 py-1.5 rounded-xl font-black flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 shrink-0"
                        title="Enviar WhatsApp para o responsável"
                      >
                        <MessageSquare className="w-3.5 h-3.5 fill-current" />
                        WhatsApp
                      </a>
                    )}
                  </div>

                  {/* 2. School & Age Badges */}
                  <div className="flex items-center gap-2 text-xs font-bold text-[#19323A] flex-wrap pt-1">
                    {age !== null && (
                      <span className="inline-flex items-center gap-1 bg-[#EEF5F6] border border-[#D8E5E7] px-2.5 py-1 rounded-xl">
                        <Cake className="w-3.5 h-3.5 text-[#245C6B]" />
                        {age} anos {child.birth_date && `(${formatDate(child.birth_date)})`}
                      </span>
                    )}

                    {child.school && (
                      <span className="inline-flex items-center gap-1 bg-[#EEF5F6] border border-[#D8E5E7] px-2.5 py-1 rounded-xl truncate max-w-[200px]">
                        <School className="w-3.5 h-3.5 text-[#245C6B] shrink-0" />
                        <span className="truncate">{child.school}</span>
                      </span>
                    )}

                    {child.grade && (
                      <span className="inline-flex items-center gap-1 bg-[#EEF5F6] border border-[#D8E5E7] px-2.5 py-1 rounded-xl">
                        <BookOpen className="w-3.5 h-3.5 text-[#245C6B]" />
                        {child.grade}
                      </span>
                    )}
                  </div>

                  {/* 3. Guardians Linked */}
                  <div className="pt-2 pb-1 border-t-2 border-[#EEF5F6] space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#6B7C83] flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-[#245C6B]" />
                      Responsável / Família:
                    </p>

                    {linkedGuardians.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {linkedGuardians.map((link, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F7FAFA] border-2 border-[#D8E5E7] text-xs font-bold text-[#19323A]"
                          >
                            <span>👤 {link.guardian!.full_name}</span>
                            {link.relationship && (
                              <span className="text-[10px] bg-[#EEF5F6] px-1.5 py-0.5 rounded-md font-semibold text-[#6B7C83]">
                                {link.relationship}
                              </span>
                            )}
                            {link.guardian!.phone && (
                              <span className="text-[11px] text-[#6B7C83]">
                                • {formatPhone(link.guardian!.phone)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#8DA3A8] italic">
                        Nenhum responsável vinculado ainda.
                      </p>
                    )}
                  </div>

                  {/* 4. Clinical Complaint / Motivo */}
                  {child.main_complaint && (
                    <div className="p-3 bg-[#FEF8EC]/60 border-2 border-[#F4C95D]/40 rounded-xl text-xs text-[#8B6514] font-medium leading-relaxed italic">
                      💬 "{child.main_complaint}"
                    </div>
                  )}
                </div>

                {/* 5. Bottom: Registration Date & Action Button */}
                <div className="flex items-center justify-between pt-3 border-t-2 border-[#EEF5F6] text-xs font-bold">
                  <span className="text-[#8DA3A8] uppercase tracking-wider text-[10px]">
                    Cadastrado em {formatDate(child.created_at)}
                  </span>

                  <span className="inline-flex items-center gap-1 text-[#245C6B] group-hover:underline font-black">
                    Abrir Ficha Completa
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
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
