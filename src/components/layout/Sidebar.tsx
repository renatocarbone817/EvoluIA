import { NavLink, useNavigate, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  FileText,
  DollarSign,
  Settings,
  Brain,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"
import { getInitials } from "@/lib/utils"
import { useState } from "react"

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/agenda", icon: Calendar, label: "Agenda" },
  { to: "/criancas", icon: Users, label: "Crianças" },
  { to: "/responsaveis", icon: UserCheck, label: "Responsáveis" },
  { to: "/financeiro", icon: DollarSign, label: "Financeiro" },
  { to: "/relatorios", icon: FileText, label: "Relatórios" },
  { to: "/biblioteca", icon: FolderOpen, label: "Biblioteca" },
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
]

export function Sidebar() {
  const { professional, signOut } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen bg-[#19323A] text-white transition-all duration-300 relative select-none border-r border-[#245C6B]/40 shadow-xl",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* 1. TOP: Psicopedagoga & Consultório -> Direciona para o Dashboard */}
      <div
        onClick={() => navigate("/dashboard")}
        title="Ir para o Início / Dashboard"
        className={cn(
          "flex items-center gap-3 px-4 py-4 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-all group",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="w-10 h-10 rounded-xl bg-[#245C6B] border border-[#63C7B2]/40 flex items-center justify-center flex-shrink-0 overflow-hidden group-hover:scale-105 transition-transform shadow-md">
          {professional?.logo_url ? (
            <img
              src={professional.logo_url}
              alt="Logo"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-bold text-white">
              {professional?.full_name ? getInitials(professional.full_name) : "P"}
            </span>
          )}
        </div>

        {!collapsed && (
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-bold text-white truncate group-hover:text-[#63C7B2] transition-colors leading-tight">
              {professional?.full_name || "Priscila Carbone"}
            </p>
            <p className="text-xs text-[#A0B4B9] truncate leading-tight mt-0.5">
              {professional?.clinic_name || (professional?.crp ? `CRP ${professional.crp}` : "Psicopedagoga")}
            </p>
          </div>
        )}
      </div>

      {/* 2. Navigation Menu */}
      <nav className="flex-1 py-4 space-y-1.5 px-3 overflow-y-auto scrollbar-thin">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all font-medium",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-[#245C6B] text-white font-bold shadow-sm border-l-4 border-[#63C7B2]"
                  : "text-[#B8CBCF] hover:bg-white/10 hover:text-white"
              )
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* 3. BOTTOM: Marca EvoluIA (Evolu em branco + IA em menta) + Botão Sair */}
      <div className="border-t border-white/10 p-3 bg-[#14282F]/70">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 bg-[#245C6B] rounded-lg flex items-center justify-center shrink-0 border border-[#63C7B2]/30">
                <Brain className="w-4 h-4 text-[#63C7B2]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight">
                  <span className="text-white">Evolu</span>
                  <span className="text-[#63C7B2]">IA</span>
                </p>
                <p className="text-[10px] text-[#8DA3A8] leading-tight truncate">
                  Gestão Psicopedagógica
                </p>
              </div>
            </div>

            <button
              onClick={signOut}
              className="text-[#8DA3A8] hover:text-[#D96C6C] p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
              title="Sair da Conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-7 h-7 bg-[#245C6B] rounded-lg flex items-center justify-center border border-[#63C7B2]/30" title="EvoluIA">
              <Brain className="w-4 h-4 text-[#63C7B2]" />
            </div>
            <button
              onClick={signOut}
              className="text-[#8DA3A8] hover:text-[#D96C6C] p-1 rounded transition-colors"
              title="Sair"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Collapse toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#FFFFFF] border border-[#D8E5E7] rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all z-10"
        aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-[#19323A]" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-[#19323A]" />
        )}
      </button>
    </aside>
  )
}
