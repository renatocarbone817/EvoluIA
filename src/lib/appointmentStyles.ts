export type AppointmentCategoryType =
  | "interview"     // Entrevista Inicial (AZUL)
  | "intervention"  // Aula de Intervenção (LARANJA)
  | "session"       // Sessão Psicopedagógica / Avaliação (ROXO)
  | "devolutiva"    // Devolutiva (VERDE)
  | "meeting"       // Reunião / Bloqueio (CINZA / SLATE)

export interface AppointmentStyleConfig {
  category: AppointmentCategoryType
  categoryName: string
  // Full card styles (used in Agenda)
  bg: string
  border: string
  text: string
  subtext: string
  badgeBg: string
  dot: string
  // Pill badge style (used in Dashboard subtitle & tags)
  pillBg: string
  pillText: string
  pillBorder: string
  pillCls: string
}

export function getAppointmentCategory(type?: string | null, notes?: string | null): AppointmentCategoryType {
  const typeLower = (type || "").toLowerCase()
  const notesLower = (notes || "").toLowerCase()

  // 1. Entrevista Inicial (com os pais / anamnese) -> AZUL
  if (typeLower.includes("entrevista") || typeLower.includes("anamnese")) {
    return "interview"
  }

  // 2. Aula de Intervenção -> LARANJA
  if (typeLower.includes("interven") || typeLower.includes("aula")) {
    return "intervention"
  }

  // 3. Devolutiva -> VERDE
  if (typeLower.includes("devolutiva")) {
    return "devolutiva"
  }

  // 4. Reunião / Bloqueio / Estudo -> SLATE
  if (
    typeLower.includes("reuni") ||
    typeLower.includes("estudo") ||
    typeLower.includes("planeja") ||
    notesLower.includes("bloqueio") ||
    notesLower.includes("[bloqueio]")
  ) {
    return "meeting"
  }

  // 5. Default: Sessão Psicopedagógica / Avaliação Clínica -> ROXO
  return "session"
}

export function getAppointmentStyle(appt: { type?: string | null; notes?: string | null; status?: string | null }): AppointmentStyleConfig {
  const category = getAppointmentCategory(appt.type, appt.notes)

  // Se foi falta registrada
  if (appt.status === "missed") {
    return {
      category,
      categoryName: "Falta Registrada",
      bg: "bg-[#FEF2F2] hover:bg-[#FEE2E2]",
      border: "border-[#FECACA]",
      text: "text-[#991B1B]",
      subtext: "text-[#DC2626]",
      badgeBg: "bg-[#EF4444] text-white",
      dot: "bg-[#EF4444]",
      pillBg: "bg-[#FEF2F2]",
      pillText: "text-[#EF4444]",
      pillBorder: "border-[#FECACA]",
      pillCls: "bg-[#FEF2F2] text-[#EF4444] border-[#FECACA]",
    }
  }

  switch (category) {
    // 🔵 AZUL: Entrevista Inicial
    case "interview":
      return {
        category: "interview",
        categoryName: "Entrevista Inicial",
        bg: "bg-[#F0F9FF] hover:bg-[#E0F2FE]",
        border: "border-[#BAE6FD]",
        text: "text-[#0369A1]",
        subtext: "text-[#0284C7]",
        badgeBg: "bg-[#0284C7] text-white",
        dot: "bg-[#0284C7]",
        pillBg: "bg-[#E0F2FE]",
        pillText: "text-[#0284C7]",
        pillBorder: "border-[#BAE6FD]",
        pillCls: "bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]",
      }

    // 🟠 LARANJA: Aula de Intervenção
    case "intervention":
      return {
        category: "intervention",
        categoryName: "Aula de Intervenção",
        bg: "bg-[#FFF7ED] hover:bg-[#FFEDD5]",
        border: "border-[#FED7AA]",
        text: "text-[#C2410C]",
        subtext: "text-[#EA580C]",
        badgeBg: "bg-[#EA580C] text-white",
        dot: "bg-[#EA580C]",
        pillBg: "bg-[#FFEDD5]",
        pillText: "text-[#EA580C]",
        pillBorder: "border-[#FED7AA]",
        pillCls: "bg-[#FFEDD5] text-[#EA580C] border-[#FED7AA]",
      }

    // 🟢 VERDE: Devolutiva
    case "devolutiva":
      return {
        category: "devolutiva",
        categoryName: "Devolutiva",
        bg: "bg-[#F0FDF4] hover:bg-[#DCFCE7]",
        border: "border-[#BBF7D0]",
        text: "text-[#166534]",
        subtext: "text-[#15803D]",
        badgeBg: "bg-[#16A34A] text-white",
        dot: "bg-[#16A34A]",
        pillBg: "bg-[#DCFCE7]",
        pillText: "text-[#15803D]",
        pillBorder: "border-[#BBF7D0]",
        pillCls: "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]",
      }

    // ⚪ SLATE: Reunião / Bloqueio
    case "meeting":
      return {
        category: "meeting",
        categoryName: "Reunião / Estudo",
        bg: "bg-[#F8FAFC] hover:bg-[#F1F5F9]",
        border: "border-[#CBD5E1]",
        text: "text-[#475569]",
        subtext: "text-[#64748B]",
        badgeBg: "bg-[#64748B] text-white",
        dot: "bg-[#64748B]",
        pillBg: "bg-[#F1F5F9]",
        pillText: "text-[#475569]",
        pillBorder: "border-[#CBD5E1]",
        pillCls: "bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]",
      }

    // 🟣 ROXO: Sessão Psicopedagógica / Avaliação
    case "session":
    default:
      return {
        category: "session",
        categoryName: "Sessão Psicopedagógica",
        bg: "bg-[#FAF5FF] hover:bg-[#F3E8FF]",
        border: "border-[#DDD6FE]",
        text: "text-[#6B21A8]",
        subtext: "text-[#7C3AED]",
        badgeBg: "bg-[#7C3AED] text-white",
        dot: "bg-[#7C3AED]",
        pillBg: "bg-[#EDE9FE]",
        pillText: "text-[#7C3AED]",
        pillBorder: "border-[#DDD6FE]",
        pillCls: "bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE]",
      }
  }
}
