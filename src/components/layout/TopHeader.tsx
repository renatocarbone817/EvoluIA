import { useNavigate } from "react-router-dom"
import { Plus, Sparkles } from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { getInitials } from "@/lib/utils"
import { Breadcrumb } from "./Breadcrumb"
import { NotificationCenter } from "./NotificationCenter"
import { Button } from "@/components/ui/Button"

export function TopHeader() {
  const { professional } = useAuthStore()
  const navigate = useNavigate()

  return (
    <header className="hidden md:flex sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b-2 border-[#B8CBD1] px-6 items-center justify-between shadow-2xs">
      {/* Left: Breadcrumb Navigation */}
      <div className="flex items-center gap-3">
        <Breadcrumb />
      </div>

      {/* Right: Quick actions, Notification Center & Professional Pill */}
      <div className="flex items-center gap-3">
        {/* Quick Action Button */}
        <Button
          size="sm"
          onClick={() => navigate("/agenda?novo=true")}
          className="h-8 gap-1.5 text-xs font-bold bg-[#245C6B] hover:bg-[#1E4E5B] text-white shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Agendamento</span>
        </Button>

        {/* Central de Notificações (Sino) */}
        <NotificationCenter />

        <div className="w-px h-6 bg-[#B8CBD1]" />

        {/* User Pill / Consultório */}
        <div
          onClick={() => navigate("/configuracoes")}
          title="Ver perfil e configurações"
          className="flex items-center gap-2 px-2.5 py-1 rounded-xl hover:bg-[#EEF5F6] border border-transparent hover:border-[#B8CBD1] transition-all cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-lg bg-[#245C6B] text-white overflow-hidden flex items-center justify-center font-black text-xs shrink-0 border border-[#63C7B2]/40 shadow-2xs">
            {professional?.logo_url ? (
              <img src={professional.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span>{professional?.full_name ? getInitials(professional.full_name) : "P"}</span>
            )}
          </div>
          <div className="text-left hidden lg:block">
            <p className="text-xs font-black text-[#19323A] group-hover:text-[#245C6B] transition-colors leading-none">
              {professional?.full_name || "Priscila Carbone"}
            </p>
            <p className="text-[10px] text-[#6B7C83] leading-none mt-1">
              {professional?.clinic_name || "Aprender ensinando"}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
