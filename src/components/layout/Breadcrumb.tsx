import { Link, useLocation } from "react-router-dom"
import { ChevronRight, Home, Users, Calendar, UserCheck, DollarSign, FileText, Settings, FolderOpen, Brain } from "lucide-react"

const ROUTE_LABELS: Record<string, { label: string; icon?: any; parent?: string }> = {
  "/dashboard": { label: "Início", icon: Home },
  "/agenda": { label: "Agenda", icon: Calendar },
  "/criancas": { label: "Crianças & Pacientes", icon: Users },
  "/responsaveis": { label: "Responsáveis & Família", icon: UserCheck },
  "/financeiro": { label: "Financeiro & Cobrança", icon: DollarSign },
  "/relatorios": { label: "Relatórios & Documentos", icon: FileText },
  "/biblioteca": { label: "Biblioteca", icon: FolderOpen },
  "/configuracoes": { label: "Configurações", icon: Settings },
}

export function Breadcrumb() {
  const location = useLocation()
  const pathname = location.pathname

  if (pathname === "/dashboard" || pathname === "/") {
    return (
      <div className="flex items-center gap-1.5 text-xs font-bold text-[#6B7C83]">
        <Home className="w-3.5 h-3.5 text-[#245C6B]" />
        <span className="text-[#19323A] font-black">Visão Geral</span>
      </div>
    )
  }

  // Handle nested routes
  if (pathname.startsWith("/criancas/")) {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium text-[#6B7C83]">
        <Link to="/dashboard" className="hover:text-[#245C6B] flex items-center gap-1 transition-colors">
          <Home className="w-3.5 h-3.5 text-[#8DA3A8]" />
          <span className="hidden sm:inline">Início</span>
        </Link>
        <ChevronRight className="w-3 h-3 text-[#B8CBCF]" />
        <Link to="/criancas" className="hover:text-[#245C6B] flex items-center gap-1 transition-colors">
          <Users className="w-3.5 h-3.5 text-[#8DA3A8]" />
          <span>Crianças</span>
        </Link>
        <ChevronRight className="w-3 h-3 text-[#B8CBCF]" />
        <span className="font-black text-[#19323A] bg-[#EAF3F5] text-[#245C6B] px-2 py-0.5 rounded-md border border-[#245C6B]/20">
          Ficha do Paciente
        </span>
      </nav>
    )
  }

  if (pathname.startsWith("/atendimento/")) {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium text-[#6B7C83]">
        <Link to="/dashboard" className="hover:text-[#245C6B] flex items-center gap-1 transition-colors">
          <Home className="w-3.5 h-3.5 text-[#8DA3A8]" />
          <span className="hidden sm:inline">Início</span>
        </Link>
        <ChevronRight className="w-3 h-3 text-[#B8CBCF]" />
        <Link to="/agenda" className="hover:text-[#245C6B] flex items-center gap-1 transition-colors">
          <Calendar className="w-3.5 h-3.5 text-[#8DA3A8]" />
          <span>Agenda</span>
        </Link>
        <ChevronRight className="w-3 h-3 text-[#B8CBCF]" />
        <span className="font-black text-[#20836F] bg-[#E8F8F5] px-2 py-0.5 rounded-md border border-[#63C7B2]/30 flex items-center gap-1">
          <Brain className="w-3.5 h-3.5" />
          Sessão Clínica Ativa
        </span>
      </nav>
    )
  }

  const current = ROUTE_LABELS[pathname] || { label: pathname.replace("/", ""), icon: null }
  const Icon = current.icon

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium text-[#6B7C83]">
      <Link to="/dashboard" className="hover:text-[#245C6B] flex items-center gap-1 transition-colors">
        <Home className="w-3.5 h-3.5 text-[#8DA3A8]" />
        <span className="hidden sm:inline">Início</span>
      </Link>
      <ChevronRight className="w-3 h-3 text-[#B8CBCF]" />
      <span className="font-black text-[#19323A] flex items-center gap-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#245C6B]" />}
        {current.label}
      </span>
    </nav>
  )
}
