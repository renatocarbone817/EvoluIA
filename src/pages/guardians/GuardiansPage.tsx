import { useState, useEffect } from "react"
import { Search, Plus, Phone, Mail, UserCheck, MessageSquare } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { formatPhone, formatDate } from "@/lib/utils"
import type { Guardian } from "@/types/database"

export function GuardiansPage() {
  const { professional } = useAuthStore()
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (professional) loadGuardians()
  }, [professional])

  async function loadGuardians() {
    setLoading(true)
    const { data } = await supabase
      .from("guardians")
      .select("*")
      .eq("professional_id", professional!.id)
      .order("full_name")

    setGuardians(data || [])
    setLoading(false)
  }

  const filtered = guardians.filter((g) => {
    const text = `${g.full_name} ${g.phone || ""} ${g.email || ""}`.toLowerCase()
    return text.includes(search.toLowerCase())
  })

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Responsáveis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cadastro de pais, mães e responsáveis pelas crianças.
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar responsável por nome, telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 h-10 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold text-base">Nenhum responsável cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Os responsáveis podem ser cadastrados diretamente na ficha de cada criança.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((g) => (
            <Card key={g.id} className="hover:border-foreground/30 transition-colors">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base">{g.full_name}</h3>
                    {g.cpf && (
                      <p className="text-xs text-muted-foreground">CPF: {g.cpf}</p>
                    )}
                  </div>
                  {g.whatsapp && (
                    <a
                      href={`https://wa.me/55${g.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  )}
                </div>

                <div className="space-y-1 text-xs text-muted-foreground pt-1 border-t border-border/50">
                  {g.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{formatPhone(g.phone)}</span>
                    </div>
                  )}
                  {g.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{g.email}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
