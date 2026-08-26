import { useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import {
  Menu,
  X,
  Brain,
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  FileText,
  DollarSign,
  Settings,
  LogOut,
  Plus,
  ChevronRight,
  Smartphone,
} from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { getInitials, cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Início / Dashboard" },
  { to: "/agenda", icon: Calendar, label: "Agenda de Atendimentos" },
  { to: "/criancas", icon: Users, label: "Crianças & Pacientes" },
  { to: "/responsaveis", icon: UserCheck, label: "Responsáveis & Família" },
  { to: "/financeiro", icon: DollarSign, label: "Financeiro & Cobrança" },
  { to: "/relatorios", icon: FileText, label: "Relatórios & Documentos" },
  { to: "/configuracoes", icon: Settings, label: "Meu Perfil & Configurações" },
]

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const { professional, signOut } = useAuthStore()
  const navigate = useNavigate()

  return (
    <>
      {/* Top Mobile Bar */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#D8E5E7] px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsOpen(true)}
            className="w-9 h-9 rounded-xl bg-[#EEF5F6] flex items-center justify-center text-[#19323A] hover:bg-[#E2ECEE] transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <div className="w-7 h-7 bg-[#245C6B] rounded-lg flex items-center justify-center shadow-sm">
              <Brain className="w-4 h-4 text-[#63C7B2]" />
            </div>
            <div>
              <p className="font-bold text-sm leading-none">
                <span className="text-[#19323A]">Evolu</span>
                <span className="text-[#245C6B]">IA</span>
              </p>
              <p className="text-[10px] text-[#6B7C83] leading-tight truncate max-w-[140px] mt-0.5">
                {professional?.clinic_name || "Gestão Psicopedagógica"}
              </p>
            </div>
          </div>
        </div>

        {/* Right action / profile */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/agenda?novo=true")}
            className="h-8 px-3 bg-[#245C6B] text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm hover:bg-[#1E4E5B] transition-colors active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agendar</span>
          </button>

          <button
            onClick={() => navigate("/configuracoes")}
            className="w-8 h-8 rounded-full bg-[#EEF5F6] border border-[#D8E5E7] overflow-hidden flex items-center justify-center shrink-0"
          >
            {professional?.logo_url ? (
              <img src={professional.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-[#245C6B]">
                {professional?.full_name ? getInitials(professional.full_name) : "P"}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Slide-over Mobile Drawer / Menu Suspenso */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-[#19323A]/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 border-r border-[#D8E5E7] animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#D8E5E7] bg-[#EEF5F6]/70">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[#245C6B] rounded-lg flex items-center justify-center shadow-sm">
                    <Brain className="w-4 h-4 text-[#63C7B2]" />
                  </div>
                  <span className="font-bold text-sm">
                    <span className="text-[#19323A]">Evolu</span>
                    <span className="text-[#245C6B]">IA</span>
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white border border-[#D8E5E7] flex items-center justify-center text-[#6B7C83] hover:text-[#19323A]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Professional card inside drawer */}
              <div
                onClick={() => {
                  setIsOpen(false)
                  navigate("/configuracoes")
                }}
                className="flex items-center gap-3 pt-1 cursor-pointer hover:opacity-90"
              >
                <div className="w-11 h-11 rounded-full bg-[#245C6B] border border-[#63C7B2]/40 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                  {professional?.logo_url ? (
                    <img src={professional.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-white">
                      {professional?.full_name ? getInitials(professional.full_name) : "P"}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-[#19323A] truncate">
                    {professional?.full_name || "Priscila Carbone"}
                  </p>
                  <p className="text-xs text-[#6B7C83] truncate">
                    {professional?.crp ? `CRP ${professional.crp}` : "Psicopedagoga"}
                  </p>
                </div>
              </div>
            </div>

            {/* Nav links */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7C83] px-3 py-1.5">
                Navegação
              </p>
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "bg-[#245C6B] text-white font-bold shadow-sm"
                        : "text-[#19323A] hover:bg-[#EEF5F6]"
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                </NavLink>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="p-3 border-t border-[#D8E5E7] bg-[#EEF5F6]/40 space-y-2">
              <button
                onClick={() => {
                  setIsOpen(false)
                  signOut()
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#D96C6C] hover:bg-[#FDF0F0] transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da Conta</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
