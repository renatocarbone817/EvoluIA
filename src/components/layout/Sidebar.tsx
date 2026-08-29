import { NavLink, useNavigate, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  FileText,
  BookOpen,
  DollarSign,
  Settings,
  Brain,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Heart,
  Lightbulb,
} from "lucide-react"
import { cn, getInitials } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"
import { useState } from "react"

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Início / Dashboard" },
  { to: "/agenda", icon: Calendar, label: "Agenda de Atendimentos" },
  { to: "/criancas", icon: Users, label: "Crianças & Pacientes" },
  { to: "/responsaveis", icon: UserCheck, label: "Responsáveis & Família" },
  { to: "/financeiro", icon: DollarSign, label: "Financeiro & Cobrança" },
  { to: "/relatorios", icon: FileText, label: "Relatórios & Documentos" },
  { to: "/biblioteca", icon: BookOpen, label: "Biblioteca de Atividades" },
  { to: "/configuracoes", icon: Settings, label: "Meu Perfil & Configurações" },
]

export function Sidebar() {
  const { professional, signOut } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen bg-white text-[#0D2329] transition-all duration-300 relative select-none border-r-2 border-[#D8E5E7] shadow-xl z-40",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* 1. TOP LOGO: EvoluIA Gestão Psicopedagógica */}
      <div
        onClick={() => navigate("/dashboard")}
        title="Ir para o Dashboard"
        className={cn(
          "flex items-center gap-3 px-5 py-5 border-b-2 border-[#EEF5F6] bg-gradient-to-b from-[#F5F3FF]/70 to-white cursor-pointer hover:opacity-90 transition-all",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#7C3AED] flex items-center justify-center flex-shrink-0 shadow-md">
          <Brain className="w-5 h-5 text-white" />
        </div>

        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-lg tracking-tight leading-none flex items-center gap-0.5">
              <span className="text-[#0D2329]">Evolu</span>
              <span className="text-[#7C3AED]">IA</span>
            </h1>
            <p className="text-[10px] font-bold text-[#6B7C83] tracking-wide mt-1 truncate">
              {professional?.clinic_name || "Gestão Psicopedagógica"}
            </p>
          </div>
        )}
      </div>

      {/* 2. USER PROFILE CARD (TOP SECTION) */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <div
            onClick={() => navigate("/configuracoes")}
            className="flex items-center gap-3 p-2.5 rounded-2xl bg-white hover:bg-[#F5F3FF] border-2 border-[#DDD6FE] transition-all cursor-pointer group shadow-2xs active:scale-98"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] border-2 border-[#DDD6FE] overflow-hidden flex items-center justify-center font-black text-xs text-[#7C3AED] shrink-0 shadow-xs">
              {professional?.logo_url ? (
                <img src={professional.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[#7C3AED]">
                  {professional?.full_name ? getInitials(professional.full_name) : "P"}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-[#0D2329] group-hover:text-[#7C3AED] transition-colors truncate leading-tight">
                {professional?.full_name || "Priscila Carbone"}
              </p>
              <p className="text-[10px] font-bold text-[#7C3AED] truncate leading-tight mt-0.5">
                {professional?.crp ? `CBO ${professional.crp}` : "Psicopedagoga Clínica"}
              </p>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-[#8CAAB1] group-hover:text-[#7C3AED] transition-colors" />
          </div>
        </div>
      )}

      {/* 3. NAVIGATION MENU */}
      <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        {!collapsed && (
          <p className="text-[10px] font-black uppercase tracking-wider text-[#8CAAB1] px-3 py-1.5">
            Navegação Principal
          </p>
        )}

        {navItems.map(({ to, icon: Icon, label }) => {
          const basePath = to.split("?")[0]
          const isActive = location.pathname === basePath && (!to.includes("?") || location.search.includes(to.split("?")[1]))
          return (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all group relative",
                collapsed && "justify-center px-2 py-3",
                isActive
                  ? "bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white shadow-md"
                  : "text-[#0D2329] hover:bg-[#F7FAFA] hover:text-[#7C3AED]"
              )}
            >
              <Icon className={cn("w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-[#6B7C83] group-hover:text-[#7C3AED]")} />
              {!collapsed && <span className="truncate flex-1">{label}</span>}
              {!collapsed && <ChevronRight className={cn("w-3.5 h-3.5 opacity-40", isActive && "opacity-80 text-white")} />}
            </NavLink>
          )
        })}
      </nav>

      {/* 4. BOTTOM SECTION: Motivation Card & Logout */}
      <div className="p-3 border-t-2 border-[#EEF5F6] space-y-2 bg-[#F8FAFB]">
        {/* Dica do Dia Card (Visible when expanded) */}
        {!collapsed && (
          <div className="p-3 rounded-2xl bg-[#EDE9FE]/60 border-2 border-[#DDD6FE] text-[#0D2329] space-y-1 relative shadow-2xs overflow-hidden">
            <div className="flex items-center justify-between text-xs font-bold text-[#7C3AED]">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span className="text-[10px] font-black tracking-wide uppercase">Dica do dia</span>
              </div>
              <Heart className="w-3 h-3 text-[#EC4899] fill-current opacity-80" />
            </div>
            <p className="text-[11px] text-[#6D28D9] leading-snug font-semibold pt-0.5">
              Pequenas intervenções geram grandes evoluções.
            </p>
          </div>
        )}

        {/* Sair da Conta */}
        <button
          onClick={() => signOut()}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-black text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all active:scale-95",
            collapsed && "justify-center px-1"
          )}
          title="Sair da Conta"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sair da Conta</span>}
        </button>
      </div>

      {/* Collapse toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3.5 top-12 w-7 h-7 bg-white border-2 border-[#D8E5E7] text-[#7C3AED] rounded-full flex items-center justify-center shadow-md hover:scale-110 hover:border-[#7C3AED] transition-all z-20"
        aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
        )}
      </button>
    </aside>
  )
}
