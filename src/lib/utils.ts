import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, differenceInYears } from "date-fns"
import { ptBR } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, fmt = "dd/MM/yyyy") {
  return format(new Date(date), fmt, { locale: ptBR })
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatTime(time: string) {
  return time.substring(0, 5)
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true })
}

export function calculateAge(birthDate: string | Date): number {
  return differenceInYears(new Date(), new Date(birthDate))
}

export function calculateDetailedAge(birthDate: string | Date | null | undefined): string {
  if (!birthDate) return "Não informada"
  const bdate = typeof birthDate === "string" ? new Date(birthDate.includes("T") ? birthDate : birthDate + "T12:00:00") : birthDate
  if (isNaN(bdate.getTime())) return "Não informada"

  const now = new Date()
  let years = now.getFullYear() - bdate.getFullYear()
  let months = now.getMonth() - bdate.getMonth()
  let days = now.getDate() - bdate.getDate()

  if (days < 0) {
    months--
  }
  if (months < 0) {
    years--
    months += 12
  }

  if (years < 0) return "Não informada"
  if (years === 0 && months === 0) return "Recém-nascido"
  if (years === 0) return `${months} m${months !== 1 ? "eses" : "ês"}`
  if (months === 0) return `${years} ano${years !== 1 ? "s" : ""}`
  return `${years} ano${years !== 1 ? "s" : ""} e ${months} m${months !== 1 ? "eses" : "ês"}`
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return phone
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

export const STATUS_LABELS: Record<string, string> = {
  // Etapas Clínicas da Criança
  initial_assessment: "🟡 Entrevista Inicial",
  in_progress: "🔵 Em Avaliação",
  assessment_in_progress: "🔵 Em Avaliação",
  report_in_progress: "🟣 Relatório em elaboração",
  report_completed: "🟢 Relatório Finalizado",
  in_intervention: "🟠 Em Intervenção",
  intervention_in_progress: "🟠 Em Intervenção",
  closed: "⚪ Acompanhamento encerrado",
  paused: "⏸️ Pausado",
  archived: "📦 Arquivado",

  // Agendamentos & Atendimentos
  scheduled: "● Agendado",
  confirmed: "✓ Confirmado",
  in_progress_appt: "▶ Em Andamento",
  done: "✓ Realizado",
  cancelled: "✕ Cancelado",
  missed: "⚠ Faltou",
  rescheduled: "🔄 Reagendado",

  // Financeiro
  paid: "✓ Pago",
  pending: "⏳ Pendente",
  overdue: "⚠ Atrasado",
}

export const STATUS_COLORS: Record<string, string> = {
  // 🟡 Entrevista Inicial (Amarelo / Dourado)
  initial_assessment: "bg-[#FEF8EC] text-[#B8871E] border-[#FDE68A] font-black",

  // 🔵 Em Avaliação (Azul Suave & Elegante)
  in_progress: "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD] font-black",
  assessment_in_progress: "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD] font-black",

  // 🟣 Relatório em elaboração (Roxo / Lavanda)
  report_in_progress: "bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE] font-black",

  // 🟢 Relatório Finalizado (Verde Menta / Esmeralda)
  report_completed: "bg-[#E8F8F5] text-[#065F46] border-[#A7F3D0] font-black",

  // 🟠 Em Intervenção (Laranja / Âmbar vibrante)
  in_intervention: "bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA] font-black",
  intervention_in_progress: "bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA] font-black",

  // ⚪ Acompanhamento encerrado / Neutros
  closed: "bg-[#F8FAFB] text-[#6B7C83] border-[#D8E5E7] font-black",
  paused: "bg-[#EEF5F6] text-[#6B7C83] border-[#D8E5E7] font-bold",
  archived: "bg-[#EEF5F6] text-[#6B7C83] border-[#D8E5E7] font-bold",

  // Agendamentos
  confirmed: "bg-[#E8F8F5] text-[#20836F] border-[#63C7B2]/40 font-semibold",
  paid: "bg-[#E8F8F5] text-[#20836F] border-[#63C7B2]/40 font-semibold",
  pending: "bg-[#FEF8EC] text-[#B8871E] border-[#F4C95D]/40 font-semibold",
  scheduled: "bg-[#EAF3F5] text-[#245C6B] border-[#245C6B]/30 font-semibold",
  in_progress_appt: "bg-[#245C6B] text-white border-transparent font-semibold",
  done: "bg-[#EEF5F6] text-[#4F6C74] border-[#D8E5E7]",

  // Cancelamentos / Alertas
  cancelled: "bg-[#FDF0F0] text-[#D96C6C] border-[#D96C6C]/30 font-semibold",
  overdue: "bg-[#FDF0F0] text-[#D96C6C] border-[#D96C6C]/30 font-semibold",
  missed: "bg-[#FEF4E8] text-[#C06A1C] border-[#F4A75D]/40 font-semibold",
  rescheduled: "bg-[#F0EFFB] text-[#5D55A6] border-[#A89FE2]/40 font-semibold",
}
