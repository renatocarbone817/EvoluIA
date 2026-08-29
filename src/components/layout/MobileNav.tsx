import { NavLink } from "react-router-dom"
import { LayoutDashboard, Calendar, Users, DollarSign, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Início" },
  { to: "/agenda", icon: Calendar, label: "Agenda" },
  { to: "/criancas", icon: Users, label: "Crianças" },
  { to: "/financeiro", icon: DollarSign, label: "Financeiro" },
  { to: "/relatorios", icon: FileText, label: "Relatórios" },
]

export function MobileNav() {
  return (
    <nav className="md:hidden border-t-2 border-[#D8E5E7] bg-white/95 backdrop-blur-md flex items-center justify-around px-2 py-1.5 safe-area-bottom z-30 shadow-lg">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl text-[11px] font-black transition-all",
              isActive
                ? "text-[#7C3AED] bg-[#EDE9FE] shadow-2xs"
                : "text-[#6B7C83] hover:text-[#0D2329] active:scale-95"
            )
          }
        >
          <Icon className="w-5 h-5 shrink-0" />
          <span className="leading-none">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
