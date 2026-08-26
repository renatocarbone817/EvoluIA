import { supabase } from "@/lib/supabase"
import type { AppointmentWithChild } from "@/types/database"

/**
 * Generates an iCalendar (.ics) string containing all appointments for a professional.
 * This format is universally accepted by Google Calendar, Apple Calendar, Outlook, Android, etc.
 */
export function generateICalFeed(
  appointments: AppointmentWithChild[],
  professionalName = "Priscila Carbone"
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EvoluIA//Gestao Psicopedagogica//PT",
    `X-WR-CALNAME:EvoluIA - ${professionalName}`,
    "X-WR-TIMEZONE:America/Sao_Paulo",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ]

  appointments.forEach((appt) => {
    if (appt.status === "cancelled") return

    const startDate = new Date(appt.start_time)
    const endDate = new Date(appt.end_time)

    const formatICSDate = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
    }

    const summary = `${appt.child?.full_name || "Paciente"} - ${appt.type}`
    const description = `Atendimento Psicopedagógico\\nPaciente: ${appt.child?.full_name || ""}\\nStatus: ${appt.status}\\nObservações: ${appt.notes || "Nenhuma"}`

    lines.push("BEGIN:VEVENT")
    lines.push(`UID:evolui-${appt.id}@evolui.com.br`)
    lines.push(`DTSTAMP:${formatICSDate(new Date())}`)
    lines.push(`DTSTART:${formatICSDate(startDate)}`)
    lines.push(`DTEND:${formatICSDate(endDate)}`)
    lines.push(`SUMMARY:${summary}`)
    lines.push(`DESCRIPTION:${description}`)
    lines.push(`STATUS:CONFIRMED`)
    // 30 min before alarm notification
    lines.push("BEGIN:VALARM")
    lines.push("TRIGGER:-PT30M")
    lines.push("ACTION:DISPLAY")
    lines.push(`DESCRIPTION:Lembrete de Atendimento: ${appt.child?.full_name || ""}`)
    lines.push("END:VALARM")
    lines.push("END:VEVENT")
  })

  lines.push("END:VCALENDAR")
  return lines.join("\r\n")
}
