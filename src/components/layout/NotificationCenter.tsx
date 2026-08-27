import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  Bell,
  CheckCircle2,
  DollarSign,
  Calendar,
  Cake,
  RefreshCw,
  X,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { formatCurrency } from "@/lib/utils"

export interface NotificationItem {
  id: string
  type: "financial" | "appointment" | "system" | "birthday"
  title: string
  description: string
  timeAgo: string
  actionUrl: string
  actionLabel: string
  urgency: "high" | "medium" | "low" | "info"
}

export function NotificationCenter() {
  const { user, professional } = useAuthStore()
  const profId = professional?.id || user?.id
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("evoluia_dismissed_notifications")
    return saved ? JSON.parse(saved) : []
  })

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  useEffect(() => {
    if (profId) {
      loadNotifications()
    }
  }, [profId])

  async function loadNotifications() {
    if (!profId) return
    setLoading(true)
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd")
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()

      const [
        { data: pendingFinances },
        { data: todayAppts },
        { data: childrenData },
      ] = await Promise.all([
        supabase
          .from("financial_records")
          .select("*, child:children(full_name)")
          .eq("professional_id", profId)
          .eq("status", "pending")
          .limit(6),

        supabase
          .from("appointments")
          .select("*, child:children(full_name)")
          .eq("professional_id", profId)
          .gte("start_time", `${todayStr}T00:00:00`)
          .lte("start_time", `${todayStr}T23:59:59`)
          .neq("status", "cancelled")
          .order("start_time", { ascending: true }),

        supabase
          .from("children")
          .select("id, full_name, birth_date")
          .eq("professional_id", profId)
          .not("birth_date", "is", null),
      ])

      const list: NotificationItem[] = []

      // 1. Cobranças Pendentes ou Vencidas
      if (pendingFinances && pendingFinances.length > 0) {
        const overdueCount = pendingFinances.filter(
          (f) => f.year < currentYear || (f.year === currentYear && f.month < currentMonth)
        ).length

        const totalAmount = pendingFinances.reduce((sum, f) => sum + Number(f.amount || 0), 0)

        if (overdueCount > 0) {
          list.push({
            id: `fin-overdue-${todayStr}`,
            type: "financial",
            title: `${overdueCount} cobrança(s) em atraso`,
            description: `Total de ${formatCurrency(totalAmount)} aguardando pagamento de mensalidade.`,
            timeAgo: "Vencido",
            actionUrl: "/financeiro",
            actionLabel: "Cobrar via WhatsApp",
            urgency: "high",
          })
        } else {
          list.push({
            id: `fin-pending-${todayStr}`,
            type: "financial",
            title: `${pendingFinances.length} mensalidade(s) a receber`,
            description: `Total de ${formatCurrency(totalAmount)} previsto para este mês.`,
            timeAgo: "Este mês",
            actionUrl: "/financeiro",
            actionLabel: "Ver Financeiro",
            urgency: "medium",
          })
        }
      }

      // 2. Atendimentos de Hoje
      if (todayAppts && todayAppts.length > 0) {
        const nextAppt = todayAppts[0]
        list.push({
          id: `appt-today-${todayStr}`,
          type: "appointment",
          title: `${todayAppts.length} atendimento(s) hoje`,
          description: `Próximo: ${nextAppt.child?.full_name || "Paciente"} às ${format(
            new Date(nextAppt.start_time),
            "HH:mm"
          )}.`,
          timeAgo: "Hoje",
          actionUrl: "/agenda",
          actionLabel: "Abrir Agenda",
          urgency: "medium",
        })
      }

      // 3. Aniversários Próximos
      if (childrenData) {
        const today = new Date()
        childrenData.forEach((c) => {
          if (!c.birth_date) return
          const [by, bm, bd] = c.birth_date.split("-").map(Number)
          const bdayThisYear = new Date(today.getFullYear(), bm - 1, bd)
          const diffDays = Math.ceil(
            (bdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          )

          if (diffDays >= 0 && diffDays <= 7) {
            list.push({
              id: `bday-${c.id}-${today.getFullYear()}`,
              type: "birthday",
              title: diffDays === 0 ? `🎉 Aniversário Hoje: ${c.full_name}!` : `🎂 Aniversário de ${c.full_name}`,
              description: diffDays === 0 ? "Comemore com o paciente!" : `Em ${diffDays} dias (${bd}/${bm}).`,
              timeAgo: diffDays === 0 ? "Hoje" : `${diffDays}d`,
              actionUrl: `/criancas/${c.id}`,
              actionLabel: "Ver Ficha",
              urgency: "info",
            })
          }
        })
      }

      // 4. Status de Conexão com Google Agenda
      list.push({
        id: "system-google-calendar",
        type: "system",
        title: "Google Agenda Sincronizada",
        description: "Seus horários estão atualizados em tempo real no seu celular.",
        timeAgo: "Ativo",
        actionUrl: "/configuracoes",
        actionLabel: "Configurações",
        urgency: "low",
      })

      setNotifications(list)
    } catch (err) {
      console.error("Erro ao carregar notificações:", err)
    } finally {
      setLoading(false)
    }
  }

  const visibleNotifications = notifications.filter((n) => !dismissedIds.includes(n.id))
  const unreadCount = visibleNotifications.length

  function handleDismissAll() {
    const allIds = notifications.map((n) => n.id)
    setDismissedIds(allIds)
    localStorage.setItem("evoluia_dismissed_notifications", JSON.stringify(allIds))
  }

  function handleDismissOne(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const updated = [...dismissedIds, id]
    setDismissedIds(updated)
    localStorage.setItem("evoluia_dismissed_notifications", JSON.stringify(updated))
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Sino Botão */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-[#4F6C74] hover:text-[#19323A] hover:bg-[#EEF5F6] border border-[#D8E5E7] bg-white transition-all shadow-2xs active:scale-95 flex items-center justify-center"
        aria-label="Abrir notificações"
        title="Central de Notificações"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#D96C6C] text-[10px] font-black text-white ring-2 ring-white shadow-xs animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Menu Suspenso */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-[#FAFCFC] to-[#EEF5F6] border-b border-[#D8E5E7] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#245C6B] text-white flex items-center justify-center font-bold">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#19323A]">Notificações</h4>
                <p className="text-[10px] text-[#6B7C83]">
                  {unreadCount === 0 ? "Nenhum aviso pendente" : `${unreadCount} alerta(s) importantes`}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleDismissAll}
                className="text-[11px] font-bold text-[#245C6B] hover:underline bg-white px-2 py-1 rounded-lg border border-[#D8E5E7] shadow-2xs"
              >
                Limpar todas
              </button>
            )}
          </div>

          {/* Body List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#EEF5F6] p-1 scrollbar-thin">
            {loading ? (
              <div className="p-6 text-center text-xs text-[#8DA3A8]">Carregando notificações...</div>
            ) : visibleNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#E8F8F5] text-[#20836F] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-xs font-black text-[#19323A]">Tudo em dia por aqui!</p>
                <p className="text-[11px] text-[#6B7C83]">
                  Nenhuma cobrança ou atendimento requer sua atenção imediata.
                </p>
              </div>
            ) : (
              visibleNotifications.map((n) => {
                const isHigh = n.urgency === "high"
                const isMed = n.urgency === "medium"
                const isInfo = n.urgency === "info"

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      setOpen(false)
                      navigate(n.actionUrl)
                    }}
                    className={`p-3 rounded-xl m-1 transition-all cursor-pointer flex items-start gap-3 hover:bg-[#F7FAFA] border ${
                      isHigh
                        ? "bg-[#FDF0F0]/60 border-[#D96C6C]/30 hover:border-[#D96C6C]"
                        : isMed
                        ? "bg-[#FEF8EC]/60 border-[#F4C95D]/30 hover:border-[#F4C95D]"
                        : isInfo
                        ? "bg-[#EAF3F5]/60 border-[#245C6B]/30 hover:border-[#245C6B]"
                        : "bg-white border-transparent hover:border-[#D8E5E7]"
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isHigh
                          ? "bg-[#FDF0F0] text-[#D96C6C] border border-[#D96C6C]/40"
                          : isMed
                          ? "bg-[#FEF8EC] text-[#B8871E] border border-[#F4C95D]/50"
                          : isInfo
                          ? "bg-[#EAF3F5] text-[#245C6B] border border-[#245C6B]/30"
                          : "bg-[#E8F8F5] text-[#20836F] border border-[#63C7B2]/40"
                      }`}
                    >
                      {n.type === "financial" && <DollarSign className="w-4 h-4" />}
                      {n.type === "appointment" && <Calendar className="w-4 h-4" />}
                      {n.type === "birthday" && <Cake className="w-4 h-4" />}
                      {n.type === "system" && <RefreshCw className="w-4 h-4" />}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-black text-[#19323A] truncate">{n.title}</p>
                        <span className="text-[10px] font-bold text-[#8DA3A8] shrink-0">
                          {n.timeAgo}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B7C83] leading-snug">{n.description}</p>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-black text-[#245C6B] hover:underline flex items-center gap-0.5">
                          {n.actionLabel}
                          <ChevronRight className="w-3 h-3" />
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleDismissOne(e, n.id)}
                          className="text-[#8DA3A8] hover:text-[#19323A] p-0.5 rounded transition-colors"
                          title="Dispensar aviso"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
