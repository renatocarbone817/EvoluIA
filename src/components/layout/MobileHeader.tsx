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
  BookOpen,
  CreditCard,
  Crown,
} from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { isMasterUser } from "@/lib/teamAccess"
import { isSuperAdmin } from "@/lib/superAdminService"
import { getInitials, cn } from "@/lib/utils"
import { NotificationCenter } from "./NotificationCenter"

const baseNavItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Início / Dashboard" },
  { to: "/agenda", icon: Calendar, label: "Agenda de Atendimentos" },
  { to: "/criancas", icon: Users, label: "Crianças & Pacientes" },
  { to: "/responsaveis", icon: UserCheck, label: "Responsáveis & Família" },
  { to: "/financeiro", icon: DollarSign, label: "Financeiro & Cobrança" },
  { to: "/relatorios", icon: FileText, label: "Relatórios & Documentos" },
  { to: "/biblioteca", icon: BookOpen, label: "Biblioteca de Atividades" },
  { to: "/configuracoes", icon: Settings, label: "Meu Perfil & Configurações" },
]

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, professional, signOut } = useAuthStore()
  const navigate = useNavigate()

  const isMaster = isMasterUser(professional)
  const isSuper = isSuperAdmin(user, professional)
  const navItems = baseNavItems

  return (
    <>
      {/* Top Mobile Bar */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-[#D8E5E7] px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsOpen(true)}
            className="w-9 h-9 rounded-2xl bg-[#EDE9FE] border border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center hover:bg-[#DDD6FE] transition-all active:scale-95"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <div className="w-7 h-7 bg-gradient-to-tr from-[#6366F1] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-xs">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-black text-sm leading-none">
                <span className="text-[#0D2329]">Evolu</span>
                <span className="text-[#7C3AED]">IA</span>
              </p>
              <p className="text-[10px] font-bold text-[#6B7C83] leading-tight truncate max-w-[140px] mt-0.5">
                {professional?.clinic_name || "Gestão Psicopedagógica"}
              </p>
            </div>
          </div>
        </div>

        {/* Right action / profile */}
        <div className="flex items-center gap-2">
          {/* Notification Center */}
          <NotificationCenter />

          <button
            onClick={() => navigate("/agenda?novo=true")}
            className="h-8 px-3 bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white text-xs font-black rounded-xl flex items-center gap-1 shadow-md active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">Agendar</span>
          </button>

          <button
            onClick={() => navigate("/configuracoes")}
            className="w-8 h-8 rounded-full bg-[#EDE9FE] border-2 border-[#DDD6FE] overflow-hidden flex items-center justify-center shrink-0 shadow-2xs"
          >
            {professional?.logo_url ? (
              <img src={professional.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-black text-[#7C3AED]">
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
            className="fixed inset-0 bg-[#0D2329]/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 border-r-2 border-[#D8E5E7] animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b-2 border-[#EEF5F6] bg-gradient-to-b from-[#F5F3FF] to-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-tr from-[#6366F1] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-xs">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-black text-base">
                    <span className="text-[#0D2329]">Evolu</span>
                    <span className="text-[#7C3AED]">IA</span>
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white border-2 border-[#D8E5E7] flex items-center justify-center text-[#6B7C83] hover:text-[#0D2329] active:scale-95"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Professional card inside drawer */}
              <div
                onClick={() => {
                  setIsOpen(false)
                  navigate("/configuracoes")
                }}
                className="flex items-center gap-3 pt-1 cursor-pointer hover:opacity-90 active:scale-98 transition-all p-2 rounded-2xl bg-white border border-[#DDD6FE] shadow-2xs"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#EDE9FE] border-2 border-[#DDD6FE] overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                  {professional?.logo_url ? (
                    <img src={professional.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-black text-[#7C3AED]">
                      {professional?.full_name ? getInitials(professional.full_name) : "P"}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-sm text-[#0D2329] truncate">
                    {professional?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Minha Conta"}
                  </p>
                  <p className="text-[11px] font-bold text-[#7C3AED] truncate">
                    {professional?.crp ? `CBO ${professional.crp}` : "Psicopedagoga Clínica"}
                  </p>
                </div>
              </div>
            </div>

            {/* Nav links */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#8CAAB1] px-3 py-1">
                Navegação Principal
              </p>
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all",
                      isActive
                        ? "bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white shadow-md"
                        : "text-[#0D2329] hover:bg-[#F7FAFA] hover:text-[#7C3AED]"
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </NavLink>
              ))}
            </div>

            {/* Bottom Actions: Meu Plano & Sair */}
            <div className="p-3 border-t-2 border-[#EEF5F6] bg-[#F8FAFB] space-y-2">
              {isMaster && (
                <NavLink
                  to="/meu-plano"
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all",
                      isActive
                        ? "bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white shadow-md"
                        : "bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE] hover:bg-[#EDE9FE]"
                    )
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-4 h-4 shrink-0" />
                    <span>Meu Plano & Assinatura</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </NavLink>
              )}

              <button
                onClick={() => {
                  setIsOpen(false)
                  signOut()
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-black text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all active:scale-95"
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
