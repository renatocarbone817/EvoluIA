import { NavLink, useNavigate, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Calendar,
  Users,
  ClipboardList,
  Target,
  ListTodo,
  ScrollText,
  FileText,
  MessageCircle,
  FolderArchive,
  DollarSign,
  Settings,
  Brain,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Sparkles,
  Heart,
  Lightbulb,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"
import { getInitials } from "@/lib/utils"
import { useState } from "react"

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/agenda", icon: Calendar, label: "Agenda" },
  { to: "/criancas", icon: Users, label: "Pacientes" },
  { to: "/criancas?tab=avaliacoes", icon: ClipboardList, label: "Avaliações" },
  { to: "/atendimento", icon: Target, label: "Intervenções" },
  { to: "/biblioteca", icon: ListTodo, label: "Atividades" },
  { to: "/relatorios?tab=planos", icon: ScrollText, label: "Planos de Intervenção" },
  { to: "/relatorios", icon: FileText, label: "Relatórios" },
  { to: "/responsaveis", icon: MessageCircle, label: "Comunicações" },
  { to: "/biblioteca?tab=recursos", icon: FolderArchive, label: "Recursos" },
  { to: "/financeiro", icon: DollarSign, label: "Financeiro" },
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
]

export function Sidebar() {
  const { professional, signOut } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen bg-[#0D2329] text-white transition-all duration-300 relative select-none border-r border-[#193F4A] shadow-2xl z-40",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* 1. TOP LOGO: EvoluIA Gestão Psicopedagógica */}
      <div
        onClick={() => navigate("/dashboard")}
        title="Ir para o Dashboard"
        className={cn(
          "flex items-center gap-3 px-5 py-5 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00A896] to-[#02C39A] flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(2,195,154,0.35)]">
          <Brain className="w-5 h-5 text-white" />
        </div>

        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-lg tracking-tight leading-none flex items-center gap-0.5">
              <span className="text-white">Evolu</span>
              <span className="text-[#02C39A]">IA</span>
            </h1>
            <p className="text-[10px] font-semibold text-[#7EA2AA] tracking-wide mt-1 truncate">
              Gestão Psicopedagógica
            </p>
          </div>
        )}
      </div>

      {/* 2. NAVIGATION MENU */}
      <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map(({ to, icon: Icon, label }) => {
          const basePath = to.split("?")[0]
          const isActive = location.pathname === basePath && (!to.includes("?") || location.search.includes(to.split("?")[1]))
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all group relative",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-[#00B4D8] text-white shadow-[0_4px_12px_rgba(0,180,216,0.35)]"
                  : "text-[#8CAAB1] hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className={cn("w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-[#7EA2AA] group-hover:text-white")} />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* 3. BOTTOM SECTION: User Profile & Motivation Card */}
      <div className="p-3 border-t border-white/5 space-y-2.5 bg-[#091B20]/60">
        {/* User Card */}
        <div
          onClick={() => navigate("/configuracoes")}
          className={cn(
            "flex items-center gap-2.5 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all cursor-pointer group",
            collapsed && "justify-center p-1.5"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-[#193F4A] overflow-hidden flex items-center justify-center font-black text-xs shrink-0 border border-[#02C39A]/40 shadow-xs">
            {professional?.logo_url ? (
              <img src={professional.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white">{professional?.full_name ? getInitials(professional.full_name) : "P"}</span>
            )}
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white group-hover:text-[#02C39A] transition-colors truncate leading-tight">
                {professional?.full_name || "Priscila Souza"}
              </p>
              <p className="text-[10px] text-[#7EA2AA] truncate leading-tight mt-0.5">
                {professional?.specialty || "Psicopedagoga"}
              </p>
            </div>
          )}

          {!collapsed && (
            <ChevronDown className="w-3.5 h-3.5 text-[#7EA2AA] group-hover:text-white transition-colors" />
          )}
        </div>

        {/* Dica do Dia Card (Visible when expanded) */}
        {!collapsed && (
          <div className="p-3 rounded-2xl bg-gradient-to-br from-[#1E193A] to-[#2B1B4A] border border-[#6D28D9]/30 text-white space-y-1 relative shadow-sm overflow-hidden">
            <div className="flex items-center justify-between text-xs font-bold text-[#C4B5FD]">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-[#FBBF24]" />
                <span className="text-[11px] font-black tracking-wide uppercase">Dica do dia</span>
              </div>
              <Heart className="w-3 h-3 text-[#EC4899] fill-current opacity-80" />
            </div>
            <p className="text-[11px] text-[#DDD6FE] leading-snug font-medium pt-0.5">
              Pequenas intervenções geram grandes evoluções.
            </p>
          </div>
        )}
      </div>

      {/* Collapse toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-12 w-6 h-6 bg-white border border-[#B8CBD1] rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all z-10"
        aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-[#0D2329]" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-[#0D2329]" />
        )}
      </button>
    </aside>
  )
}
