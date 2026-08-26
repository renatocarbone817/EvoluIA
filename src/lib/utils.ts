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
  // time is "HH:mm:ss" from postgres
  return time.substring(0, 5)
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true })
}

export function calculateAge(birthDate: string | Date): number {
  return differenceInYears(new Date(), new Date(birthDate))
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
  initial_assessment: "Avaliação Inicial",
  in_progress: "Em Acompanhamento",
  paused: "Pausado",
  closed: "Encerrado",
  archived: "Arquivado",
  scheduled: "Agendado",
  confirmed: "Confirmado",
  in_progress_appt: "Em Andamento",
  done: "Realizado",
  cancelled: "Cancelado",
  missed: "Faltou",
  rescheduled: "Reagendado",
}

export const STATUS_COLORS: Record<string, string> = {
  initial_assessment: "bg-amber-100 text-amber-700 border-amber-200",
  in_progress: "bg-emerald-100 text-emerald-700 border-emerald-200",
  paused: "bg-slate-100 text-slate-600 border-slate-200",
  closed: "bg-zinc-100 text-zinc-600 border-zinc-200",
  archived: "bg-zinc-100 text-zinc-500 border-zinc-200",
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  done: "bg-slate-100 text-slate-600 border-slate-200",
  cancelled: "bg-red-100 text-red-600 border-red-200",
  missed: "bg-orange-100 text-orange-700 border-orange-200",
  rescheduled: "bg-purple-100 text-purple-700 border-purple-200",
}
