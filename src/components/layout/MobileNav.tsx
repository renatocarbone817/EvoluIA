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
    <nav className="md:hidden border-t border-border bg-background/95 backdrop-blur-md flex items-center justify-around px-2 py-1.5 safe-area-bottom z-30">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all",
              isActive
                ? "text-foreground font-bold bg-muted"
                : "text-muted-foreground hover:text-foreground active:scale-95"
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
