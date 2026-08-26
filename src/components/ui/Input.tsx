import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className="text-xs font-black uppercase tracking-wider text-[#19323A] flex items-center gap-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "flex h-11 w-full rounded-xl border-2 border-[#D8E5E7] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#19323A]",
            "placeholder:text-[#8DA3A8] placeholder:font-normal",
            "focus-visible:outline-none focus-visible:border-[#245C6B] focus-visible:ring-4 focus-visible:ring-[#245C6B]/10 transition-all",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#EEF5F6]",
            error && "border-[#D96C6C] focus-visible:border-[#D96C6C] focus-visible:ring-[#D96C6C]/10",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs font-bold text-[#D96C6C]">{error}</p>}
        {hint && !error && <p className="text-xs text-[#6B7C83] font-medium">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = "Input"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className="text-xs font-black uppercase tracking-wider text-[#19323A] flex items-center gap-1">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "flex min-h-[90px] w-full rounded-xl border-2 border-[#D8E5E7] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#19323A]",
            "placeholder:text-[#8DA3A8] placeholder:font-normal leading-relaxed",
            "focus-visible:outline-none focus-visible:border-[#245C6B] focus-visible:ring-4 focus-visible:ring-[#245C6B]/10 transition-all",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#EEF5F6] resize-none",
            error && "border-[#D96C6C] focus-visible:border-[#D96C6C] focus-visible:ring-[#D96C6C]/10",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs font-bold text-[#D96C6C]">{error}</p>}
        {hint && !error && <p className="text-xs text-[#6B7C83] font-medium">{hint}</p>}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"
