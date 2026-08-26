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
  Smartphone,
} from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { getInitials, cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Início / Dashboard" },
  { to: "/agenda", icon: Calendar, label: "Agenda de Atendimentos" },
  { to: "/criancas", icon: Users, label: "Crianças & Pacientes" },
  { to: "/responsaveis", icon: UserCheck, label: "Responsáveis & Família" },
  { to: "/financeiro", icon: DollarSign, label: "Financeiro & Cobrança" },
  { to: "/relatorios", icon: FileText, label: "Relatórios & Documentos" },
  { to: "/configuracoes", icon: Settings, label: "Meu Perfil & Configurações" },
]

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const { professional, signOut } = useAuthStore()
  const navigate = useNavigate()

  function handleNavigate(to: string) {
    navigate(to)
    setIsOpen(false)
  }

  return (
    <>
      {/* Top Mobile Bar */}
      <header className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsOpen(true)}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2" onClick={() => navigate("/dashboard")}>
            <div className="w-7 h-7 bg-foreground rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-background" />
            </div>
            <div>
              <p className="font-bold text-sm leading-none">EvoluIA</p>
              <p className="text-[10px] text-muted-foreground leading-tight truncate max-w-[140px]">
                {professional?.clinic_name || "Gestão Psicopedagógica"}
              </p>
            </div>
          </div>
        </div>

        {/* Right action / profile */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/agenda?novo=true")}
            className="h-8 px-2.5 bg-foreground text-background text-xs font-semibold rounded-lg flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agendar</span>
          </button>

          <button
            onClick={() => navigate("/configuracoes")}
            className="w-8 h-8 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0"
          >
            {professional?.logo_url ? (
              <img src={professional.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold">
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-4/5 max-w-xs bg-background h-full shadow-2xl flex flex-col z-10 border-r border-border animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-border bg-muted/40">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-foreground rounded-lg flex items-center justify-center">
                    <Brain className="w-4 h-4 text-background" />
                  </div>
                  <span className="font-bold text-sm">EvoluIA</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Professional card inside drawer */}
              <div className="flex items-center gap-3 pt-1">
                <div className="w-10 h-10 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
                  {professional?.logo_url ? (
                    <img src={professional.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold">
                      {professional?.full_name ? getInitials(professional.full_name) : "P"}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-foreground truncate">
                    {professional?.full_name || "Priscila Carbone"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {professional?.crp ? `CRP ${professional.crp}` : "Psicopedagoga"}
                  </p>
                </div>
              </div>
            </div>

            {/* Nav links */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-1.5">
                Navegação
              </p>
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      isActive
                        ? "bg-foreground text-background font-semibold shadow-sm"
                        : "text-foreground/80 hover:bg-muted"
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                </NavLink>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="p-3 border-t border-border bg-muted/20 space-y-2">
              <button
                onClick={() => {
                  setIsOpen(false)
                  signOut()
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
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
