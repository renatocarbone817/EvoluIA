import { useState, useEffect } from "react"
import { DollarSign, CheckCircle2, Clock, Calendar, ArrowUpRight } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { FinancialRecord } from "@/types/database"

interface FinancialRecordWithChild extends FinancialRecord {
  child?: {
    full_name: string
  }
}

export function FinancialPage() {
  const { professional } = useAuthStore()
  const [records, setRecords] = useState<FinancialRecordWithChild[]>([])
  const [loading, setLoading] = useState(true)
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    if (professional) loadFinancials()
  }, [professional])

  async function loadFinancials() {
    setLoading(true)
    const { data } = await supabase
      .from("financial_records")
      .select("*, child:children(full_name)")
      .eq("professional_id", professional!.id)
      .order("year", { ascending: false })
      .order("month", { ascending: false })

    setRecords((data || []) as FinancialRecordWithChild[])
    setLoading(false)
  }

  // Monthly stats
  const currentMonthRecords = records.filter(
    (r) => r.month === currentMonth && r.year === currentYear
  )
  const totalReceived = currentMonthRecords
    .filter((r) => r.status === "paid")
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

  const totalPending = currentMonthRecords
    .filter((r) => r.status === "pending")
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)

  const totalExpected = totalReceived + totalPending

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ]

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Resumo e controle de mensalidades e atendimentos recebidos.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalReceived)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Recebido em {months[currentMonth - 1]}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pendente em {months[currentMonth - 1]}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="w-9 h-9 bg-muted text-foreground rounded-lg flex items-center justify-center mb-3">
              <DollarSign className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalExpected)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total Previsto no Mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <div className="space-y-4">
        <h2 className="font-bold text-lg">Histórico de Cobranças</h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              Nenhum lançamento financeiro registrado.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {records.map((r) => (
              <Card key={r.id} className="hover:border-foreground/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-sm">{r.child?.full_name || "Paciente"}</h3>
                    <p className="text-xs text-muted-foreground">
                      Referência: {months[r.month - 1]} / {r.year}
                      {r.payment_date ? ` · Pago em ${formatDate(r.payment_date)}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        r.status === "paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {r.status === "paid" ? "Pago" : "Pendente"}
                    </span>
                    <span className="font-bold text-base">{formatCurrency(r.amount)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
