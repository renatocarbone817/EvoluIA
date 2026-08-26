import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  loading?: boolean
}

const variantStyles = {
  default:
    "bg-[#245C6B] text-white border-2 border-[#1E4E5B] hover:bg-[#1E4E5B] shadow-[0_3px_0_0_#143741] active:translate-y-0.5 active:shadow-none font-bold",
  outline:
    "border-2 border-[#D8E5E7] bg-white text-[#19323A] hover:bg-[#EEF5F6] hover:border-[#245C6B] shadow-[0_2px_0_0_#D8E5E7] active:translate-y-0.5 active:shadow-none font-bold",
  ghost:
    "border-2 border-transparent text-[#19323A] hover:bg-[#EEF5F6] font-bold",
  destructive:
    "bg-[#D96C6C] text-white border-2 border-[#B84E4E] hover:bg-[#C85B5B] shadow-[0_3px_0_0_#A03E3E] active:translate-y-0.5 active:shadow-none font-bold",
  secondary:
    "bg-[#63C7B2] text-[#14282F] border-2 border-[#48A894] hover:bg-[#52BCA6] shadow-[0_3px_0_0_#388E7D] active:translate-y-0.5 active:shadow-none font-bold",
  link:
    "text-[#245C6B] underline-offset-4 hover:underline font-bold border-none",
}

const sizeStyles = {
  default: "h-11 px-5 py-2.5 text-sm rounded-xl",
  sm: "h-9 px-3.5 text-xs rounded-lg",
  lg: "h-12 px-7 text-base rounded-2xl",
  icon: "h-10 w-10 rounded-xl",
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 transition-all select-none cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#245C6B]/20",
          "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"
