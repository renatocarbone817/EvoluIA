import { useState } from "react"
import { Calendar, Clock, DollarSign, Edit, User, UserPlus, Phone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { calculateAge, formatDate, formatDateTime, formatCurrency, formatPhone } from "@/lib/utils"
import type { Child, Guardian, Appointment } from "@/types/database"
import { AddGuardianDialog } from "./AddGuardianDialog"
import { CarePlanDialog } from "./CarePlanDialog"

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

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Idade</p>
            <p className="text-xl font-bold mt-1">
              {child.birth_date ? `${calculateAge(child.birth_date)} anos` : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {child.birth_date ? formatDate(child.birth_date) : "Nasc. não informado"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sessões Realizadas</p>
            <p className="text-xl font-bold mt-1">{sessionCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total concluídas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Escola / Série</p>
            <p className="text-sm font-semibold mt-1 truncate">{child.school || "Não informada"}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{child.grade || "Série não informada"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Próxima Sessão</p>
            <p className="text-sm font-semibold mt-1 truncate">
              {nextAppointment ? formatDateTime(nextAppointment.start_time) : "Nenhum agendamento"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {nextAppointment ? nextAppointment.type : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Info Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Complaints & Notes */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Queixa Principal / Motivo</CardTitle>
            </CardHeader>
            <CardContent>
              {child.main_complaint ? (
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {child.main_complaint}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Nenhuma queixa principal registrada ainda.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Observações Gerais</CardTitle>
            </CardHeader>
            <CardContent>
              {child.notes ? (
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {child.notes}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Nenhuma observação cadastrada.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Guardians & Care Plan */}
        <div className="space-y-6">
          {/* Guardians Card */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Responsáveis</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowAddGuardian(true)}>
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                Vincular
              </Button>
            </CardHeader>
            <CardContent>
              {guardians.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Nenhum responsável vinculado.
                </p>
              ) : (
                <div className="space-y-3">
                  {guardians.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{g.full_name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {g.phone && <span>{formatPhone(g.phone)}</span>}
                          {g.email && <span>{g.email}</span>}
                        </div>
                      </div>
                      {g.whatsapp && (
                        <a
                          href={`https://wa.me/55${g.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-2 py-1 rounded font-medium flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuração do Acompanhamento */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Acompanhamento & Frequência</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowCarePlan(true)}>
                <Edit className="w-3.5 h-3.5 mr-1" />
                Configurar
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span>Início:</span>
                <span className="font-medium text-foreground">{formatDate(child.created_at)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span>Status Atual:</span>
                <span className="font-medium text-foreground capitalize">
                  {child.status.replace("_", " ")}
                </span>
              </div>
            </CardContent>
          </Card>
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
        onClose={() => setShowCarePlan(false)}
        onSuccess={() => {
          setShowCarePlan(false)
          onReload()
        }}
      />
    </div>
  )
}
