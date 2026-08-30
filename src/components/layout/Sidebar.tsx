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
  LogOut,
  Heart,
  Lightbulb,
  CreditCard,
  Sparkles,
  Crown,
} from "lucide-react"
import { cn, getInitials } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"
import { isMasterUser } from "@/lib/teamAccess"
import { isSuperAdmin } from "@/lib/superAdminService"
import { getDailyTip, getDailyTipIndex, getNextRandomTip } from "@/lib/dailyTips"
import { useState } from "react"

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

export function Sidebar() {
  const { user, professional, signOut } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const [currentTipIndex, setCurrentTipIndex] = useState(getDailyTipIndex)
  const [currentTip, setCurrentTip] = useState(getDailyTip)
  const [isRotating, setIsRotating] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  const isMaster = isMasterUser(professional)
  const isSuper = isSuperAdmin(user, professional)
  const navItems = baseNavItems

  function handleNextTip() {
    setIsRotating(true)
    const next = getNextRandomTip(currentTipIndex)
    setCurrentTip(next.tip)
    setCurrentTipIndex(next.index)
    setTimeout(() => setIsRotating(false), 300)
  }

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen bg-[#0D2329] text-white transition-all duration-300 relative select-none border-r border-[#193F4A] shadow-2xl z-[60]",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* 1. TOP LOGO: EvoluIA Gestão Psicopedagógica */}
      <div
        onClick={() => navigate("/dashboard")}
        title="Ir para o Dashboard"
        className={cn(
          "flex items-center gap-3 px-5 py-5 border-b border-white/10 bg-[#091B20] cursor-pointer hover:bg-white/5 transition-all",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#7C3AED] flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(124,58,237,0.4)]">
          <Brain className="w-5 h-5 text-white" />
        </div>

        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-lg tracking-tight leading-none flex items-center gap-0.5">
              <span className="text-white">Evolu</span>
              <span className="text-[#A855F7]">IA</span>
            </h1>
            <p className="text-[10px] font-semibold text-[#7EA2AA] tracking-wide mt-1 truncate">
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
            className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer group shadow-2xs active:scale-98"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#193F4A] border border-[#7C3AED]/50 overflow-hidden flex items-center justify-center font-black text-xs text-white shrink-0 shadow-xs">
              {professional?.logo_url ? (
                <img src={professional.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white">
                  {professional?.full_name ? getInitials(professional.full_name) : "P"}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white group-hover:text-[#A855F7] transition-colors truncate leading-tight">
                {professional?.full_name || "Priscila Carbone"}
              </p>
              <p className="text-[10px] font-bold text-[#A855F7] truncate leading-tight mt-0.5">
                {professional?.crp ? `CBO ${professional.crp}` : "Psicopedagoga Clínica"}
              </p>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-[#7EA2AA] group-hover:text-white transition-colors" />
          </div>
        </div>
      )}

      {/* 3. NAVIGATION MENU */}
      <nav className="flex-1 py-3 px-3 space-y-1.5 overflow-y-auto scrollbar-thin">
        {!collapsed && (
          <p className="text-[10px] font-black uppercase tracking-wider text-[#7EA2AA] px-3 py-1">
            Navegação Principal
          </p>
        )}

        {navItems.map(({ to, icon: Icon, label }) => {
          const basePath = to.split("?")[0]
          const isActive =
            location.pathname === basePath &&
            (!to.includes("?") || location.search.includes(to.split("?")[1]))

          return (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all group relative",
                collapsed && "justify-center px-2 py-3",
                isActive
                  ? "bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white font-black shadow-[0_4px_16px_rgba(124,58,237,0.4)]"
                  : "text-[#8CAAB1] hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110",
                  isActive ? "text-white" : "text-[#7EA2AA] group-hover:text-white"
                )}
              />
              {!collapsed && <span className="truncate flex-1">{label}</span>}
              {!collapsed && (
                <ChevronRight
                  className={cn("w-3.5 h-3.5 opacity-30", isActive && "opacity-80 text-white")}
                />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* 4. BOTTOM SECTION: Meu Plano (Master), Dica do Dia & Logout */}
      <div className="p-3 border-t border-white/10 space-y-2 bg-[#091B20]/85">
        {/* BOTÃO MEU PLANO (EXCLUSIVO PARA MASTER NA PARTE INFERIOR) */}
        {isMaster && (
          <NavLink
            to="/meu-plano"
            title={collapsed ? "Meu Plano & Assinatura" : undefined}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all group active:scale-98",
              collapsed && "justify-center px-1",
              location.pathname === "/meu-plano"
                ? "bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white font-black shadow-[0_2px_12px_rgba(124,58,237,0.4)]"
                : "bg-white/5 hover:bg-white/10 text-[#C4B5FD] hover:text-white border border-[#7C3AED]/30"
            )}
          >
            <CreditCard className="w-4 h-4 shrink-0 text-[#A855F7] group-hover:text-white transition-colors" />
            {!collapsed && <span className="truncate flex-1">Meu Plano & Assinatura</span>}
            {!collapsed && (
              <ChevronRight
                className={cn(
                  "w-3.5 h-3.5 opacity-40 group-hover:opacity-100",
                  location.pathname === "/meu-plano" && "opacity-90"
                )}
              />
            )}
          </NavLink>
        )}

        {/* Dica do Dia Card (Clicável e Dinâmica com 50 Frases) */}
        {!collapsed && (
          <div
            onClick={handleNextTip}
            title="Clique para ver outra dica inspiradora 💡"
            className="p-3 rounded-2xl bg-gradient-to-br from-[#1E193A] to-[#2B1B4A] border border-[#6D28D9]/40 text-white space-y-1 relative shadow-2xs overflow-hidden cursor-pointer hover:border-[#A855F7] hover:shadow-md transition-all active:scale-98 group select-none"
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#C4B5FD]">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-[#F59E0B] group-hover:rotate-12 transition-transform" />
                <span className="text-[10px] font-black tracking-wide uppercase">Dica do dia</span>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#A855F7] opacity-0 group-hover:opacity-100 transition-opacity" />
                <Heart className="w-3 h-3 text-[#EC4899] fill-current opacity-80" />
              </div>
            </div>
            <p
              className={cn(
                "text-[11px] text-[#DDD6FE] leading-snug font-medium pt-0.5 transition-all duration-300",
                isRotating ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
              )}
            >
              {currentTip}
            </p>
          </div>
        )}

        {/* Sair da Conta */}
        <button
          onClick={() => signOut()}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all active:scale-95",
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
        className="absolute -right-3.5 top-6 w-7 h-7 bg-[#0D2329] border-2 border-[#193F4A] text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 hover:border-[#7C3AED] transition-all z-[70] cursor-pointer"
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
