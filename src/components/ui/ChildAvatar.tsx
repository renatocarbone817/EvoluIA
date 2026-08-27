import React from "react"
import { cn } from "@/lib/utils"

interface ChildAvatarProps {
  photoUrl?: string | null
  name?: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
}

// 5 cute, distinct illustrated child avatar variations
function getAvatarIndex(name: string = "") {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 4
}

export function ChildAvatar({
  photoUrl,
  name = "Criança",
  size = "md",
  className,
}: ChildAvatarProps) {
  const sizeClasses = {
    xs: "w-6 h-6 rounded-lg",
    sm: "w-9 h-9 rounded-xl",
    md: "w-12 h-12 rounded-2xl",
    lg: "w-16 h-16 rounded-2xl",
    xl: "w-24 h-24 rounded-3xl",
  }

  // If real photo is uploaded, display it
  if (photoUrl) {
    return (
      <div
        className={cn(
          sizeClasses[size],
          "overflow-hidden border-2 border-[#63C7B2]/50 shadow-xs shrink-0 bg-[#EEF5F6]",
          className
        )}
      >
        <img
          src={photoUrl}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    )
  }

  // Otherwise, render a super cute, colorful illustrated child avatar!
  const avatarType = getAvatarIndex(name)

  const palettes = [
    { bg: "bg-[#E0F2FE] border-[#7DD3FC]", hair: "#F59E0B", skin: "#FED7AA", shirt: "#38BDF8" }, // Blue palette
    { bg: "bg-[#FEF3C7] border-[#FDE68A]", hair: "#78350F", skin: "#FCD34D", shirt: "#F59E0B" }, // Amber palette
    { bg: "bg-[#F3E8FF] border-[#DDD6FE]", hair: "#4C1D95", skin: "#FED7AA", shirt: "#A855F7" }, // Purple palette
    { bg: "bg-[#E8F8F5] border-[#A7F3D0]", hair: "#B45309", skin: "#FDE68A", shirt: "#10B981" }, // Mint palette
  ]

  const p = palettes[avatarType]

  return (
    <div
      className={cn(
        sizeClasses[size],
        "border-2 flex items-center justify-center shrink-0 shadow-xs select-none overflow-hidden",
        p.bg,
        className
      )}
      title={name}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {avatarType === 0 && (
          // Kid with baseball cap / short hair
          <g>
            {/* Shirt */}
            <circle cx="50" cy="102" r="38" fill={p.shirt} />
            {/* Neck */}
            <rect x="44" y="65" width="12" height="15" rx="3" fill="#FDBA74" />
            {/* Head */}
            <circle cx="50" cy="48" r="24" fill="#FED7AA" />
            {/* Ears */}
            <circle cx="26" cy="48" r="5" fill="#FED7AA" />
            <circle cx="74" cy="48" r="5" fill="#FED7AA" />
            {/* Cap */}
            <path d="M26 44C26 31 37 22 50 22C63 22 74 31 74 44H26Z" fill="#0284C7" />
            <path d="M50 22C65 22 80 28 88 34C88 34 76 40 50 40H26C26 31 37 22 50 22Z" fill="#0369A1" />
            {/* Eyes */}
            <circle cx="41" cy="50" r="3.5" fill="#1E293B" />
            <circle cx="42" cy="49" r="1.2" fill="#FFFFFF" />
            <circle cx="59" cy="50" r="3.5" fill="#1E293B" />
            <circle cx="60" cy="49" r="1.2" fill="#FFFFFF" />
            {/* Rosy Cheeks */}
            <circle cx="35" cy="54" r="4" fill="#FDA4AF" opacity="0.6" />
            <circle cx="65" cy="54" r="4" fill="#FDA4AF" opacity="0.6" />
            {/* Happy Smile */}
            <path d="M44 57C46 61 54 61 56 57" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {avatarType === 1 && (
          // Kid with ponytails / curly hair
          <g>
            {/* Hair back */}
            <circle cx="26" cy="34" r="10" fill="#78350F" />
            <circle cx="74" cy="34" r="10" fill="#78350F" />
            {/* Shirt */}
            <circle cx="50" cy="102" r="38" fill="#F59E0B" />
            {/* Neck */}
            <rect x="44" y="65" width="12" height="15" rx="3" fill="#FDBA74" />
            {/* Head */}
            <circle cx="50" cy="48" r="24" fill="#FED7AA" />
            {/* Ears */}
            <circle cx="26" cy="50" r="4.5" fill="#FED7AA" />
            <circle cx="74" cy="50" r="4.5" fill="#FED7AA" />
            {/* Hair bangs */}
            <path d="M26 44C26 30 37 23 50 23C63 23 74 30 74 44C66 36 58 38 50 35C42 38 34 36 26 44Z" fill="#78350F" />
            {/* Hair ribbons */}
            <circle cx="28" cy="34" r="4" fill="#EF4444" />
            <circle cx="72" cy="34" r="4" fill="#EF4444" />
            {/* Eyes */}
            <circle cx="41" cy="50" r="3.5" fill="#1E293B" />
            <circle cx="42" cy="49" r="1.2" fill="#FFFFFF" />
            <circle cx="59" cy="50" r="3.5" fill="#1E293B" />
            <circle cx="60" cy="49" r="1.2" fill="#FFFFFF" />
            {/* Rosy Cheeks */}
            <circle cx="35" cy="54" r="4" fill="#FDA4AF" opacity="0.6" />
            <circle cx="65" cy="54" r="4" fill="#FDA4AF" opacity="0.6" />
            {/* Big Smile */}
            <path d="M43 56C45 61 55 61 57 56" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {avatarType === 2 && (
          // Kid with messy / spiked hair
          <g>
            {/* Shirt */}
            <circle cx="50" cy="102" r="38" fill="#8B5CF6" />
            {/* Neck */}
            <rect x="44" y="65" width="12" height="15" rx="3" fill="#FDBA74" />
            {/* Head */}
            <circle cx="50" cy="48" r="24" fill="#FED7AA" />
            {/* Ears */}
            <circle cx="26" cy="49" r="5" fill="#FED7AA" />
            <circle cx="74" cy="49" r="5" fill="#FED7AA" />
            {/* Fun Hair */}
            <path d="M26 42C24 32 32 20 42 22C46 16 54 16 58 21C64 17 74 24 74 38C68 34 60 36 50 32C40 36 32 34 26 42Z" fill="#4C1D95" />
            {/* Eyes */}
            <circle cx="41" cy="49" r="3.5" fill="#1E293B" />
            <circle cx="42" cy="48" r="1.2" fill="#FFFFFF" />
            <circle cx="59" cy="49" r="3.5" fill="#1E293B" />
            <circle cx="60" cy="48" r="1.2" fill="#FFFFFF" />
            {/* Rosy Cheeks */}
            <circle cx="35" cy="54" r="4" fill="#FDA4AF" opacity="0.6" />
            <circle cx="65" cy="54" r="4" fill="#FDA4AF" opacity="0.6" />
            {/* Smile */}
            <path d="M43 56C46 61 54 61 57 56" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {avatarType === 3 && (
          // Kid with round glasses & friendly grin
          <g>
            {/* Shirt */}
            <circle cx="50" cy="102" r="38" fill="#10B981" />
            {/* Neck */}
            <rect x="44" y="65" width="12" height="15" rx="3" fill="#FDBA74" />
            {/* Head */}
            <circle cx="50" cy="48" r="24" fill="#FED7AA" />
            {/* Ears */}
            <circle cx="26" cy="48" r="5" fill="#FED7AA" />
            <circle cx="74" cy="48" r="5" fill="#FED7AA" />
            {/* Hair */}
            <path d="M26 44C26 28 36 22 50 22C64 22 74 28 74 44C66 36 56 36 50 34C44 36 34 36 26 44Z" fill="#B45309" />
            {/* Glasses */}
            <circle cx="40" cy="49" r="7" stroke="#0F766E" strokeWidth="2.5" fill="none" />
            <circle cx="60" cy="49" r="7" stroke="#0F766E" strokeWidth="2.5" fill="none" />
            <path d="M47 49H53" stroke="#0F766E" strokeWidth="2.5" />
            {/* Eyes */}
            <circle cx="40" cy="49" r="2.8" fill="#1E293B" />
            <circle cx="60" cy="49" r="2.8" fill="#1E293B" />
            {/* Rosy Cheeks */}
            <circle cx="33" cy="54" r="3.5" fill="#FDA4AF" opacity="0.6" />
            <circle cx="67" cy="54" r="3.5" fill="#FDA4AF" opacity="0.6" />
            {/* Smile */}
            <path d="M44 58C46 62 54 62 56 58" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </div>
  )
}
