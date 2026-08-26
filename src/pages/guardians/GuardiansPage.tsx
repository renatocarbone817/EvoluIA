import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Search,
  Plus,
  Phone,
  Mail,
  UserCheck,
  MessageSquare,
  Baby,
  ChevronRight,
  ExternalLink,
  Users,
  Sparkles,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { formatPhone, formatDate } from "@/lib/utils"
import type { Guardian, Child } from "@/types/database"

interface GuardianWithChildren extends Guardian {
  children?: {
    relationship: string | null
    is_primary: boolean
    child: Child | null
  }[]
}

export function GuardiansPage() {
  const navigate = useNavigate()
  const { user, professional } = useAuthStore()
  const [guardians, setGuardians] = useState<GuardianWithChildren[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const profId = professional?.id || user?.id

  useEffect(() => {
    if (profId) loadGuardians()
  }, [profId])

  async function loadGuardians() {
    if (!profId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("guardians")
        .select(`
          *,
          children:guardian_children(
            relationship,
            is_primary,
            child:children(id, full_name, status, birth_date)
          )
        `)
        .eq("professional_id", profId)
        .order("full_name")

      if (!error && data) {
        setGuardians(data as any)
      } else {
        // Fallback simple query
        const { data: simpleData } = await supabase
          .from("guardians")
          .select("*")
          .eq("professional_id", profId)
          .order("full_name")
        setGuardians(simpleData || [])
      }
    } finally {
      setLoading(false)
    }
  }

  // Smart Search: matches Guardian Name, Phone, Email, CPF OR Child Name!
  const filtered = guardians.filter((g) => {
    const q = search.toLowerCase().trim()
    if (!q) return true

    const guardianText = `${g.full_name} ${g.phone || ""} ${g.email || ""} ${g.cpf || ""}`.toLowerCase()
    if (guardianText.includes(q)) return true

    // Check if any linked child matches the search
    const childrenMatch = g.children?.some((link) =>
      link.child?.full_name?.toLowerCase().includes(q)
    )
    if (childrenMatch) return true

    return false
  })

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#19323A] tracking-tight">
            Responsáveis & Família
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7C83] mt-1">
            {guardians.length} responsável(is) cadastrado(s) no consultório
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => navigate("/criancas?nova=true")}
          className="gap-2"
        >
          <Plus className="w-5 h-5" />
          Cadastrar com Criança
        </Button>
      </div>

      {/* Smart Search Bar */}
      <div className="bg-white p-3 rounded-2xl border-2 border-[#D8E5E7] shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8DA3A8]" />
          <input
            type="text"
            placeholder="Buscar por nome do pai/mãe, telefone OU pelo nome do filho(a)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 h-11 rounded-xl border-2 border-[#D8E5E7] bg-[#F7FAFA] text-sm font-semibold text-[#19323A] focus-visible:outline-none focus-visible:border-[#245C6B] focus-visible:bg-white transition-all placeholder:text-[#8DA3A8] placeholder:font-normal"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-white border-2 border-[#D8E5E7] animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-2 border-dashed border-[#D8E5E7] text-center py-16">
          <CardContent className="space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#EEF5F6] border-2 border-[#D8E5E7] flex items-center justify-center mx-auto text-[#245C6B]">
              <UserCheck className="w-8 h-8" />
            </div>
            {guardians.length === 0 ? (
              <>
                <h3 className="font-black text-lg text-[#19323A]">Nenhum responsável cadastrado ainda</h3>
                <p className="text-xs text-[#6B7C83] max-w-sm mx-auto">
                  Os dados dos pais e responsáveis são adicionados automaticamente ao cadastrar ou editar uma criança.
                </p>
                <Button size="lg" onClick={() => navigate("/criancas?nova=true")} className="mt-2">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Cadastrar Criança e Responsável
                </Button>
              </>
            ) : (
              <>
                <h3 className="font-bold text-base text-[#19323A]">Nenhum responsável encontrado</h3>
                <p className="text-xs text-[#6B7C83]">
                  Não encontramos ninguém com o termo <strong>"{search}"</strong> (pesquisado entre pais e filhos).
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((g) => {
            const rawPhone = g.whatsapp || g.phone || ""
            const cleanPhone = rawPhone.replace(/\D/g, "")
            const linkedChildren = g.children?.filter((c) => c.child) || []

            return (
              <div
                key={g.id}
                className="p-5 rounded-2xl border-2 border-[#D8E5E7] bg-white hover:border-[#245C6B] hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top: Name + WhatsApp button */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-[#245C6B] text-white font-black text-sm flex items-center justify-center shrink-0 border-2 border-[#63C7B2]/40 shadow-xs">
                        {g.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-base text-[#19323A] truncate leading-tight">
                          {g.full_name}
                        </h3>
                        {g.cpf ? (
                          <p className="text-[11px] font-semibold text-[#8DA3A8] mt-0.5">
                            CPF: {g.cpf}
                          </p>
                        ) : (
                          <p className="text-[11px] font-semibold text-[#8DA3A8] mt-0.5">
                            Responsável
                          </p>
                        )}
                      </div>
                    </div>

                    {cleanPhone && (
                      <a
                        href={`https://wa.me/55${cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs bg-[#E8F8F5] text-[#20836F] border-2 border-[#63C7B2]/40 hover:bg-[#63C7B2] hover:text-white px-3 py-1.5 rounded-xl font-black flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 shrink-0"
                      >
                        <MessageSquare className="w-3.5 h-3.5 fill-current" />
                        WhatsApp
                      </a>
                    )}
                  </div>

                  {/* Section: Linked Children (Filhos / Dependentes) */}
                  <div className="pt-2 pb-1 border-t-2 border-[#EEF5F6] space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#6B7C83] flex items-center gap-1">
                      <Baby className="w-3.5 h-3.5 text-[#245C6B]" />
                      Filho(a) / Dependente vinculado:
                    </p>

                    {linkedChildren.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {linkedChildren.map((link, idx) => (
                          <button
                            key={idx}
                            onClick={() => navigate(`/criancas/${link.child!.id}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EEF5F6] hover:bg-[#245C6B] hover:text-white text-[#19323A] border-2 border-[#D8E5E7] hover:border-[#245C6B] text-xs font-bold transition-all group/btn shadow-2xs"
                          >
                            <span>🧒 {link.child!.full_name}</span>
                            {link.relationship && (
                              <span className="text-[10px] bg-white group-hover/btn:bg-white/20 px-1.5 py-0.5 rounded-md font-semibold text-[#6B7C83] group-hover/btn:text-white">
                                {link.relationship}
                              </span>
                            )}
                            <ChevronRight className="w-3.5 h-3.5 opacity-50 group-hover/btn:opacity-100" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#8DA3A8] italic">
                        Nenhuma criança vinculada diretamente ainda.
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Contacts */}
                <div className="space-y-1 text-xs font-semibold text-[#6B7C83] pt-2 border-t-2 border-[#EEF5F6]">
                  {g.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#245C6B]" />
                      <span>{formatPhone(g.phone)}</span>
                    </div>
                  )}
                  {g.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-[#245C6B]" />
                      <span className="truncate">{g.email}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
