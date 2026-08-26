import * as React from "react"
import { cn, STATUS_LABELS, STATUS_COLORS } from "@/lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  statusKey?: string
  variant?: "default" | "outline" | "secondary"
}

export function Badge({ className, statusKey, variant = "default", children, ...props }: BadgeProps) {
  if (statusKey) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-xl border-2 px-3 py-1 text-xs font-black tracking-wide shadow-xs",
          STATUS_COLORS[statusKey] || "bg-[#EEF5F6] text-[#4F6C74] border-[#D8E5E7]",
          className
        )}
        {...props}
      >
        {STATUS_LABELS[statusKey] || statusKey}
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
