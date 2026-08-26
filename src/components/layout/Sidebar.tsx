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
        "hidden md:flex flex-col h-screen bg-foreground text-background transition-all duration-300 relative select-none",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div
        onClick={() => navigate("/dashboard")}
        className={cn(
          "flex items-center gap-3 px-4 py-5 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="flex-shrink-0 w-8 h-8 bg-background rounded-lg flex items-center justify-center shadow-sm">
          <Brain className="w-5 h-5 text-foreground" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold leading-tight">EvoluIA</p>
            <p className="text-xs text-white/50 leading-tight">Gestão Psicopedagógica</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto scrollbar-thin">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-white/15 text-background font-medium"
                  : "text-white/60 hover:bg-white/10 hover:text-background"
              )
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User profile area — Clickable to open Settings/Clinic Profile */}
      <div className="border-t border-white/10 p-2">
        <div
          onClick={() => navigate("/configuracoes")}
          title="Clique para abrir as configurações do consultório"
          className={cn(
            "flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-white/10 transition-all group",
            collapsed && "justify-center p-1.5",
            location.pathname === "/configuracoes" && "bg-white/15"
          )}
        >
          {/* Avatar / Logo */}
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/20 group-hover:scale-105 transition-transform">
            {professional?.logo_url ? (
              <img src={professional.logo_url} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-background">
                {professional?.full_name ? getInitials(professional.full_name) : "P"}
              </span>
            )}
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold text-background truncate group-hover:underline">
                {professional?.full_name || "Priscila Carbone"}
              </p>
              <p className="text-[11px] text-white/60 truncate flex items-center gap-1">
                <span>{professional?.crp ? `CRP ${professional.crp}` : "Configurações"}</span>
              </p>
            </div>
          )}

          {!collapsed && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                signOut()
              }}
              className="text-white/40 hover:text-red-400 p-1 rounded hover:bg-white/10 transition-colors shrink-0"
              title="Sair da Conta"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Collapse toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow z-10"
        aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-foreground" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-foreground" />
        )}
      </button>
    </aside>
  )
}
