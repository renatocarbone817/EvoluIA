import * as React from "react"
import { cn, STATUS_LABELS, STATUS_COLORS } from "@/lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  statusKey?: string
  type?: "child" | "appointment" | "financial"
  variant?: "default" | "outline" | "secondary"
}

export function Badge({ className, statusKey, type, variant = "default", children, ...props }: BadgeProps) {
  if (statusKey) {
    let label = STATUS_LABELS[statusKey] || statusKey
    let color = STATUS_COLORS[statusKey] || "bg-[#EEF5F6] text-[#4F6C74] border-[#D8E5E7]"

    if (type === "child" && statusKey === "in_progress") {
      label = "🌱 Em Acompanhamento"
      color = "bg-[#E8F8F5] text-[#20836F] border-[#63C7B2]/40 font-semibold"
    } else if ((!type || type === "appointment") && statusKey === "in_progress") {
      label = "▶ Em Andamento"
      color = "bg-[#245C6B] text-white border-[#19323A] font-semibold"
    }

    return (
      <span
        className={cn(
          "inline-flex items-center rounded-xl border-2 px-3 py-1 text-xs font-black tracking-wide shadow-xs",
          color,
          className
        )}
        {...props}
      >
        {label}
      </span>
    )
  }

  const variants = {
    default: "bg-[#245C6B] text-white border-2 border-[#1E4E5B]",
    outline: "border-2 border-[#D8E5E7] text-[#19323A] bg-white",
    secondary: "bg-[#63C7B2] text-[#14282F] border-2 border-[#48A894]",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xl border-2 px-3 py-1 text-xs font-black tracking-wide shadow-xs",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
