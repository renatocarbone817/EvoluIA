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
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
          STATUS_COLORS[statusKey] || "bg-gray-100 text-gray-600 border-gray-200",
          className
        )}
        {...props}
      >
        {STATUS_LABELS[statusKey] || statusKey}
      </span>
    )
  }

  const variants = {
    default: "bg-foreground text-background border-transparent",
    outline: "border-border text-foreground",
    secondary: "bg-secondary text-secondary-foreground border-transparent",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
