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
    <nav className="md:hidden border-t border-border bg-background flex">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors",
              isActive ? "text-foreground font-medium" : "text-muted-foreground"
            )
          }
        >
          <Icon className="w-5 h-5" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
