import { NavLink, useLocation } from "react-router-dom"
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
]

export function Sidebar() {
  const { professional, signOut } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen bg-foreground text-background transition-all duration-300 relative",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-white/10",
        collapsed && "justify-center px-2"
      )}>
        <div className="flex-shrink-0 w-8 h-8 bg-background rounded-lg flex items-center justify-center">
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

      {/* User area */}
      <div className={cn(
        "border-t border-white/10 p-3",
        collapsed && "flex justify-center"
      )}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {professional?.logo_url ? (
                <img src={professional.logo_url} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-background">
                  {professional?.full_name ? getInitials(professional.full_name) : "?"}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-background truncate">{professional?.full_name || "Profissional"}</p>
              <p className="text-xs text-white/50 truncate">{professional?.crp ? `CRP ${professional.crp}` : ""}</p>
            </div>
            <button
              onClick={signOut}
              className="text-white/40 hover:text-white/80 transition-colors text-xs"
              title="Sair"
            >
              Sair
            </button>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
            {professional?.logo_url ? (
              <img src={professional.logo_url} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-semibold text-background">
                {professional?.full_name ? getInitials(professional.full_name) : "?"}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow z-10"
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
