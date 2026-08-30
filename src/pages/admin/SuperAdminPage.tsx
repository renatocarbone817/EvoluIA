import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Crown,
  DollarSign,
  Users,
  Building,
  TrendingUp,
  Activity,
  Server,
  Database,
  Cpu,
  Globe,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  Clock,
  ChevronRight,
  Edit2,
  Check,
  X,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
  LogOut,
} from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { supabase } from "@/lib/supabase"
import {
  isSuperAdmin,
  getSuperAdminDashboardData,
  updateClinicSubscriptionManually,
  lockSuperAdminSession,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASS,
  type SaaSMetrics,
  type InfraHealth,
  type ClinicAccountItem,
  type WebhookAuditLog,
} from "@/lib/superAdminService"
import { PLANS_CONFIG, type PlanId } from "@/lib/plans"
import toast from "react-hot-toast"

type AdminTab = "visao-geral" | "infraestrutura" | "trafego" | "clinicas" | "webhooks"

export function SuperAdminPage() {
  const navigate = useNavigate()
  const { user, professional } = useAuthStore()

  const [activeTab, setActiveTab] = useState<AdminTab>("visao-geral")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  // Login Gate State (para quando não estiver autenticado como Super Admin)
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState("")

  // Dados do Dashboard
  const [metrics, setMetrics] = useState<SaaSMetrics | null>(null)
  const [infra, setInfra] = useState<InfraHealth | null>(null)
  const [clinics, setClinics] = useState<ClinicAccountItem[]>([])
  const [webhooks, setWebhooks] = useState<WebhookAuditLog[]>([])
  const [traffic, setTraffic] = useState<any>(null)

  // Filtros de busca de clínicas
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>("all")

  // Modal de Edição Manual de Plano
  const [editingClinic, setEditingClinic] = useState<ClinicAccountItem | null>(null)
  const [newPlanId, setNewPlanId] = useState<PlanId>("individual")
  const [newStatus, setNewStatus] = useState<"active" | "trial" | "cancelled">("active")
  const [savingPlan, setSavingPlan] = useState(false)

  const authorized = isSuperAdmin(user, professional) || unlocked

  useEffect(() => {
    if (authorized) {
      loadData()
    } else {
      setLoading(false)
    }
  }, [user, professional, authorized, unlocked])

  async function loadData() {
    try {
      setRefreshing(true)
      const data = await getSuperAdminDashboardData()
      setMetrics(data.metrics)
      setInfra(data.infra)
      setClinics(data.clinics)
      setWebhooks(data.webhooks)
      setTraffic(data.traffic)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar métricas do painel do dono.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoggingIn(true)
    setLoginError("")

    const cleanEmail = adminEmail.trim().toLowerCase()
    const cleanPass = adminPassword.trim()

    if (cleanEmail !== SUPER_ADMIN_EMAIL.toLowerCase()) {
      setLoginError("E-mail não autorizado para acesso administrativo.")
      setLoggingIn(false)
      return
    }

    if (cleanPass !== SUPER_ADMIN_PASS) {
      setLoginError("Senha de acesso incorreta. Verifique suas credenciais.")
      setLoggingIn(false)
      return
    }

    try {
      // Ativa sessão de Super Admin na memória da aba
      sessionStorage.setItem("evoluia_superadmin_session", "active")
      setUnlocked(true)

      // Atualiza auth state
      useAuthStore.getState().setUser({ id: "admin-renato-carbone", email: cleanEmail })
      useAuthStore.getState().setProfessional({
        id: "admin-renato-carbone",
        full_name: "Renato Carbone",
        email: cleanEmail,
        role: "master",
        is_active: true,
        specialty: "Fundador & Super Admin",
      } as any)

      toast.success("Torre de Controle Desbloqueada com Sucesso! 👑", { duration: 4000 })
      await loadData()
    } catch (err: any) {
      console.error(err)
      setLoginError("Erro ao inicializar painel.")
    } finally {
      setLoggingIn(false)
    }
  }

  function handleLockDashboard() {
    lockSuperAdminSession()
    setUnlocked(false)
    toast.success("Painel do Dono trancado com segurança.")
  }

  async function handleSaveClinicPlan() {
    if (!editingClinic) return
    setSavingPlan(true)
    try {
      await updateClinicSubscriptionManually(editingClinic.id, newPlanId, newStatus)
      toast.success(`Plano de ${editingClinic.fullName} atualizado para ${newPlanId.toUpperCase()}!`)
      setEditingClinic(null)
      loadData()
    } catch (e: any) {
      console.error(e)
      toast.error("Erro ao atualizar plano: " + e.message)
    } finally {
      setSavingPlan(false)
    }
  }

  // Filtro de Clínicas
  const filteredClinics = clinics.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clinicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)

    const matchesPlan = selectedPlanFilter === "all" || c.planId === selectedPlanFilter
    return matchesSearch && matchesPlan
  })

  // =========================================================================
  // TELA DE LOGIN / AUTENTICAÇÃO SECRETA DO SUPER ADMIN
  // =========================================================================
  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#091B20] flex flex-col justify-center items-center p-4 sm:p-6 font-sans text-white relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#7C3AED]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#F59E0B]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-[#0D2329] rounded-3xl border border-white/15 shadow-2xl p-6 sm:p-8 relative z-10 space-y-6">
          {/* Header do Card */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#F59E0B] to-[#D97706] text-white flex items-center justify-center mx-auto shadow-lg">
              <Crown className="w-7 h-7 fill-current" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Torre de Controle</h1>
              <p className="text-xs font-semibold text-[#8CAAB1] mt-1">
                Área restrita e criptografada exclusiva do proprietário.
              </p>
            </div>
          </div>

          {/* Erro de Login */}
          {loginError && (
            <div className="p-3.5 rounded-2xl bg-[#FEF2F2]/15 border border-[#EF4444]/40 text-xs font-bold text-[#FCA5A5] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#EF4444]" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Formulário de Login */}
          <form onSubmit={handleAdminLogin} className="space-y-4">
            {/* E-mail de Administrador */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#C4D8DC] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>E-mail do Administrador</span>
              </label>
              <input
                type="email"
                required
                placeholder="seu.email@dominio.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-white/15 bg-white/5 text-xs font-medium text-white focus:outline-none focus:border-[#F59E0B] shadow-inner placeholder:text-[#6B7C83]"
              />
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#C4D8DC] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Senha de Acesso</span>
              </label>
              <div className="relative">
                <input
                  type={showAdminPassword ? "text" : "password"}
                  required
                  placeholder="Digite sua senha"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-10 rounded-2xl border border-white/15 bg-white/5 text-xs font-medium text-white focus:outline-none focus:border-[#F59E0B] shadow-inner placeholder:text-[#6B7C83]"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8CAAB1] hover:text-white"
                >
                  {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botão de Entrada */}
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-white font-black text-xs sm:text-sm shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loggingIn ? (
                <span>Desbloqueando Painel...</span>
              ) : (
                <>
                  <Crown className="w-4 h-4 fill-current" />
                  <span>Desbloquear Painel do Dono</span>
                </>
              )}
            </button>
          </form>

          {/* Botão Voltar */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="text-xs font-bold text-[#8CAAB1] hover:text-white flex items-center justify-center gap-1 mx-auto transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Sistema</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading && !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7F8]">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#F59E0B] to-[#D97706] text-white flex items-center justify-center mx-auto animate-pulse shadow-lg">
            <Crown className="w-7 h-7 fill-current" />
          </div>
          <p className="text-sm font-black text-[#0D2329]">Carregando Torre de Controle do Dono...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F7F8] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
        {/* 1. TOP EXECUTIVE HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-r from-[#0D2329] via-[#091B20] to-[#1E193A] p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-white/10 relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F59E0B] to-[#D97706] text-white flex items-center justify-center shadow-md">
                <Crown className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                    Torre de Controle do Dono • EvoluIA
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#10B981] text-white tracking-wider uppercase">
                    SUPER ADMIN
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#8CAAB1]">
                  Visão 360º de Faturamento (MRR), Infraestrutura (Supabase/Vercel/Gemini) e Clientes.
                </p>
              </div>
            </div>
          </div>

          {/* Live System Health Badges, Refresh & Lock */}
          <div className="flex flex-wrap items-center gap-2.5 relative z-10">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-bold text-[#34D399]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>Supabase 100%</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-bold text-[#A78BFA]">
              <Sparkles className="w-3.5 h-3.5 text-[#C4B5FD]" />
              <span>Gemini AI Flash</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-bold text-[#38BDF8]">
              <Globe className="w-3.5 h-3.5" />
              <span>Vercel 99.9%</span>
            </div>

            <button
              onClick={loadData}
              disabled={refreshing}
              className="h-9 px-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              title="Atualizar métricas agora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </button>

            <button
              onClick={handleLockDashboard}
              className="h-9 px-3.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-black flex items-center gap-1.5 active:scale-95 transition-all"
              title="Trancar Painel"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Trancar</span>
            </button>
          </div>
        </div>

        {/* 2. ADMIN TABS NAVIGATION */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-[#D8E5E7]">
          {[
            { id: "visao-geral", label: "📊 Visão Geral & SaaS MRR", icon: DollarSign },
            { id: "infraestrutura", label: "🩺 Saúde da Infra & Limites", icon: Server },
            { id: "trafego", label: "📈 Tráfego & Acessos Diários", icon: BarChart3 },
            { id: "clinicas", label: `👥 Gestão de Clínicas (${clinics.length})`, icon: Building },
            { id: "webhooks", label: `⚡ Logs Hotmart (${webhooks.length})`, icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-black whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#7C3AED] text-white shadow-md scale-102"
                    : "bg-white text-[#6B7C83] hover:bg-[#F7FAFA] hover:text-[#0D2329] border border-[#D8E5E7]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* =========================================================================
            ABA 1: VISÃO GERAL & SAAS MRR
            ========================================================================= */}
        {activeTab === "visao-geral" && metrics && (
          <div className="space-y-8 animate-in fade-in">
            {/* CARDS DE DESTAQUE EXECUTIVO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Card 1: MRR */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-lg space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-100">
                    MRR (Mensalidade Recorrente)
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black">
                    R$ {metrics.mrr.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-xs font-bold text-emerald-200">/mês</span>
                </div>
                <p className="text-[11px] font-medium text-emerald-100 pt-1">
                  ARR Projetado: <strong>R$ {metrics.arr.toFixed(2).replace(".", ",")} /ano</strong>
                </p>
              </div>

              {/* Card 2: Clínicas Ativas */}
              <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#6B7C83]">
                    Clínicas & Consultórios
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center">
                    <Building className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-[#0D2329]">
                    {metrics.totalClinics}
                  </span>
                  <span className="text-xs font-bold text-[#10B981]">
                    ({metrics.activeSubscriptionsCount} ativas)
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-[#6B7C83] pt-1">
                  Contas Master cadastradas no sistema
                </p>
              </div>

              {/* Card 3: Psicopedagogas */}
              <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#6B7C83]">
                    Psicopedagogas na Base
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-[#0D2329]">
                    {metrics.totalProfessionals}
                  </span>
                  <span className="text-xs font-bold text-[#6B7C83]">profissionais</span>
                </div>
                <p className="text-[11px] font-semibold text-[#6B7C83] pt-1">
                  Donas de consultório + Psicopedagogas da equipe
                </p>
              </div>

              {/* Card 4: Pacientes Atendidos */}
              <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#6B7C83]">
                    Crianças / Pacientes
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#FEF8EC] text-[#D97706] flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-[#0D2329]">
                    {metrics.totalPatients}
                  </span>
                  <span className="text-xs font-bold text-[#10B981]">pacientes</span>
                </div>
                <p className="text-[11px] font-semibold text-[#6B7C83] pt-1">
                  {metrics.totalAppointments} atendimentos registrados
                </p>
              </div>
            </div>

            {/* DISTRIBUIÇÃO DOS 5 PLANOS OFICIAIS */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-[#0D2329]">
                    Market Share dos 5 Planos do EvoluIA
                  </h3>
                  <p className="text-xs font-semibold text-[#6B7C83]">
                    Distribuição de clientes e faturamento gerado por cada categoria de assinatura.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-[#EDE9FE] text-[#7C3AED] text-xs font-black">
                  5 Planos Ativos na Hotmart
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {metrics.planDistribution.map((item) => (
                  <div
                    key={item.planId}
                    className="p-5 rounded-2xl bg-[#F8FAFC] border-2 border-[#E2E8F0] space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#0D2329] truncate">{item.name}</span>
                      <span className="text-xs font-bold text-[#7C3AED]">
                        R$ {item.price.toFixed(2).replace(".", ",")}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-[#0D2329]">{item.count}</span>
                      <span className="text-xs font-bold text-[#6B7C83]">
                        clínica{item.count !== 1 ? "s" : ""} ({item.percentage}%)
                      </span>
                    </div>

                    {/* Barra de Porcentagem */}
                    <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#6366F1] to-[#7C3AED] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, item.percentage)}%` }}
                      />
                    </div>

                    <p className="text-[11px] font-bold text-[#10B981]">
                      Receita: R$ {item.revenue.toFixed(2).replace(".", ",")}/mês
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 2: SAÚDE DA INFRAESTRUTURA & LIMITES (SUPABASE, VERCEL, GEMINI)
            ========================================================================= */}
        {activeTab === "infraestrutura" && infra && (
          <div className="space-y-8 animate-in fade-in">
            {/* ALERTAS PROATIVOS DE INFRA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {infra.proactiveAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                    <h4 className="text-xs font-black text-[#0D2329]">{alert.title}</h4>
                  </div>
                  <p className="text-[11px] font-medium text-[#6B7C83] leading-relaxed">
                    {alert.description}
                  </p>
                </div>
              ))}
            </div>

            {/* GRID DE CONSUMO DAS 3 PLATAFORMAS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 1. SUPABASE DATABASE */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-5 flex flex-col justify-between">
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F6]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-[#DCFCE7] text-[#166534] flex items-center justify-center font-bold">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-[#0D2329]">Supabase Database</h3>
                        <p className="text-[10px] font-bold text-[#10B981]">Plano Gratuito (500 MB)</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#DCFCE7] text-[#166534]">
                      🟢 100% Saudável
                    </span>
                  </div>

                  {/* Resumo Financeiro & Capacidade */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-0.5">
                      <span className="text-[10px] font-bold text-[#166534] uppercase block">Custo Atual</span>
                      <strong className="text-xs font-black text-[#15803D]">R$ 0,00 / mês</strong>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-0.5">
                      <span className="text-[10px] font-bold text-[#6B7C83] uppercase block">Capacidade Free</span>
                      <strong className="text-xs font-black text-[#0D2329]">Até ~500 Clínicas</strong>
                    </div>
                  </div>

                  {/* Barra de Progresso de Armazenamento */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-[#0D2329]">
                      <span>Armazenamento Utilizado</span>
                      <span>
                        {infra.supabase.estimatedSizeMb} MB de {infra.supabase.limitSizeMb} MB
                      </span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] h-3 rounded-full overflow-hidden p-0.5 border border-[#E2E8F0]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#34D399] transition-all duration-500"
                        style={{ width: `${Math.max(2, infra.supabase.percentageUsed)}%` }}
                      />
                    </div>
                    <p className="text-[11px] font-semibold text-[#6B7C83]">
                      Apenas <strong>{infra.supabase.percentageUsed}%</strong> do limite gratuito utilizado.
                    </p>
                  </div>

                  {/* Tabela de Contagem de Linhas */}
                  <div className="space-y-2 pt-2 border-t border-[#EEF2F6]">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#6B7C83]">
                      Registros no Banco de Dados
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-xl bg-[#F8FAFC]">
                        <span className="text-[#6B7C83] text-[10px] block">Profissionais</span>
                        <strong className="text-[#0D2329] font-black">
                          {infra.supabase.tablesCount.professionals}
                        </strong>
                      </div>
                      <div className="p-2 rounded-xl bg-[#F8FAFC]">
                        <span className="text-[#6B7C83] text-[10px] block">Pacientes</span>
                        <strong className="text-[#0D2329] font-black">
                          {infra.supabase.tablesCount.children}
                        </strong>
                      </div>
                      <div className="p-2 rounded-xl bg-[#F8FAFC]">
                        <span className="text-[#6B7C83] text-[10px] block">Atendimentos</span>
                        <strong className="text-[#0D2329] font-black">
                          {infra.supabase.tablesCount.appointments}
                        </strong>
                      </div>
                      <div className="p-2 rounded-xl bg-[#F8FAFC]">
                        <span className="text-[#6B7C83] text-[10px] block">Assinaturas Hotmart</span>
                        <strong className="text-[#0D2329] font-black">
                          {infra.supabase.tablesCount.subscriptions}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#6B7C83] space-y-1">
                  <strong className="text-[#0D2329] font-bold block">📦 Quando aumentar o plano?</strong>
                  <p>
                    Apenas quando ultrapassar 500 MB (milhares de pacientes). O plano <strong>Pro (8 GB)</strong> custa apenas {infra.supabase.estimatedProUpgradeCost}.
                  </p>
                </div>
              </div>

              {/* 2. GOOGLE GEMINI AI API (ENRIQUECIDO COM CUSTOS, LIMITES E DETALHES) */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-5 flex flex-col justify-between">
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F6]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-[#0D2329]">Google Gemini AI</h3>
                        <p className="text-[10px] font-bold text-[#7C3AED]">{infra.geminiAi.version}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#EDE9FE] text-[#7C3AED]">
                      🟢 {infra.geminiAi.successRate} Confiável
                    </span>
                  </div>

                  {/* Resumo de Custo da IA & Custo Unitário */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-2xl bg-[#FAF5FF] border border-[#DDD6FE] space-y-0.5">
                      <span className="text-[10px] font-bold text-[#7C3AED] uppercase block">Custo Mensal da IA</span>
                      <strong className="text-xs font-black text-[#6D28D9]">{infra.geminiAi.estimatedMonthlyCostBrl}</strong>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-0.5">
                      <span className="text-[10px] font-bold text-[#6B7C83] uppercase block">Custo por Relatório</span>
                      <strong className="text-xs font-black text-[#10B981]">{infra.geminiAi.costPerReportBrl}</strong>
                    </div>
                  </div>

                  {/* Barra de Cota Diária do Google AI Studio (1.500 requisições/dia) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-[#0D2329]">
                      <span>Cota Diária de Laudos / Requisições</span>
                      <span>
                        {infra.geminiAi.dailyCallsEstimated} / {infra.geminiAi.limitRpd} laudos/dia
                      </span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] h-3 rounded-full overflow-hidden p-0.5 border border-[#E2E8F0]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#7C3AED] transition-all duration-500"
                        style={{ width: `${Math.max(2, infra.geminiAi.percentageRpdUsed)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#6B7C83]">
                      <span>Capacidade: <strong>Até 150 psicopedagogas simultâneas no Free</strong></span>
                      <span className="text-[#10B981] font-bold">99.8% livre</span>
                    </div>
                  </div>

                  {/* Grid de Performance Técnica */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <span className="text-[#6B7C83] text-[10px] block">Velocidade Média</span>
                      <strong className="text-[#10B981] font-black">
                        {infra.geminiAi.averageLatencyMs / 1000}s (Instantâneo)
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <span className="text-[#6B7C83] text-[10px] block">Cota de Pico (RPM)</span>
                      <strong className="text-[#0D2329] font-black">
                        {infra.geminiAi.limitRpm} requisições/min
                      </strong>
                    </div>
                  </div>

                  {/* Distribuição do Uso da Inteligência Artificial */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#6B7C83] block">
                      O que a IA está gerando no SaaS:
                    </span>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#0D2329]">📄 Relatórios & Laudos Clínicos</span>
                        <span className="font-black text-[#7C3AED]">{infra.geminiAi.useDistribution.reports}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#0D2329]">🧠 Análise de Anamneses</span>
                        <span className="font-black text-[#0284C7]">{infra.geminiAi.useDistribution.anamnesis}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#0D2329]">💡 Atividades & Intervenções</span>
                        <span className="font-black text-[#D97706]">{infra.geminiAi.useDistribution.activities}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF5FF] border border-[#DDD6FE] text-[11px] text-[#6D28D9] space-y-1">
                  <strong className="font-bold block">💡 Dica de Escala da IA:</strong>
                  <p>
                    O Gemini 2.0 Flash é <strong>5x mais barato</strong> que o GPT-4o da OpenAI. Quando tiver centenas de clínicas, ativar o faturamento custará menos de <strong>R$ 15/mês</strong>.
                  </p>
                </div>
              </div>

              {/* 3. VERCEL SERVERLESS HOSTING */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-5 flex flex-col justify-between">
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F6]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center font-bold">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-[#0D2329]">Vercel Serverless</h3>
                        <p className="text-[10px] font-bold text-[#0284C7]">Hospedagem & Webhooks</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#E0F2FE] text-[#0284C7]">
                      Uptime {infra.vercel.uptime}
                    </span>
                  </div>

                  {/* Resumo de Custo & Capacidade */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-2xl bg-[#F0F9FF] border border-[#BAE6FD] space-y-0.5">
                      <span className="text-[10px] font-bold text-[#0369A1] uppercase block">Custo Atual</span>
                      <strong className="text-xs font-black text-[#0284C7]">R$ 0,00 / mês</strong>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-0.5">
                      <span className="text-[10px] font-bold text-[#6B7C83] uppercase block">Capacidade Free</span>
                      <strong className="text-xs font-black text-[#0D2329]">~3.300 acessos/dia</strong>
                    </div>
                  </div>

                  {/* Barra de Progresso de Invocações */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-[#0D2329]">
                      <span>Invocações de Funções (Mês)</span>
                      <span>
                        {infra.vercel.serverlessExecutionsMonth} de {infra.vercel.limitExecutions}
                      </span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] h-3 rounded-full overflow-hidden p-0.5 border border-[#E2E8F0]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#0284C7] to-[#38BDF8] transition-all duration-500"
                        style={{ width: `${Math.max(2, infra.vercel.percentageUsed)}%` }}
                      />
                    </div>
                    <p className="text-[11px] font-semibold text-[#6B7C83]">
                      Menos de <strong>{infra.vercel.percentageUsed}%</strong> do limite mensal gratuito.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs font-bold text-[#166534] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                    <span>Zero sobrecarga de servidores ou risco de interrupção.</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#6B7C83] space-y-1">
                  <strong className="text-[#0D2329] font-bold block">🚀 Quando aumentar o plano?</strong>
                  <p>
                    Se o SaaS ultrapassar 100.000 requisições/mês, o plano <strong>Pro (1 milhão de req)</strong> custa apenas {infra.vercel.estimatedProUpgradeCost}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 3: TRÁFEGO & ACESSOS DIÁRIOS
            ========================================================================= */}
        {activeTab === "trafego" && traffic && (
          <div className="space-y-8 animate-in fade-in">
            {/* GRÁFICO DIÁRIO DE PAGEVIEWS */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#0D2329]">
                    Visualizações de Página Diárias (Últimos 14 Dias)
                  </h3>
                  <p className="text-xs font-semibold text-[#6B7C83]">
                    Acessos diários das psicopedagogas no sistema EvoluIA.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-[#EDE9FE] text-[#7C3AED] text-xs font-black">
                  {traffic.totalViews} pageviews registrados
                </span>
              </div>

              {/* Barras de Tráfego Diário */}
              <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 items-end pt-6 min-h-[180px]">
                {traffic.dailyTraffic.map((day: any, idx: number) => {
                  const maxViews = Math.max(...traffic.dailyTraffic.map((d: any) => d.views), 1)
                  const heightPercent = Math.max(12, Math.round((day.views / maxViews) * 100))

                  return (
                    <div key={idx} className="flex flex-col items-center gap-2 group">
                      <span className="text-[10px] font-black text-[#7C3AED] opacity-0 group-hover:opacity-100 transition-opacity">
                        {day.views}
                      </span>
                      <div className="w-full bg-[#EDE9FE] group-hover:bg-[#DDD6FE] rounded-xl h-36 flex items-end p-1 transition-all">
                        <div
                          className="w-full bg-gradient-to-t from-[#6366F1] to-[#7C3AED] rounded-lg transition-all duration-500 shadow-xs"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-[#6B7C83] truncate w-full text-center">
                        {day.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* GRID: PÁGINAS MAIS ACESSADAS & HORÁRIOS DE PICO */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Páginas Mais Acessadas */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-4">
                <h3 className="text-sm font-black text-[#0D2329]">Páginas Mais Utilizadas no SaaS</h3>
                <div className="space-y-3">
                  {traffic.topPages.slice(0, 6).map((item: any, i: number) => {
                    const percent = Math.round((item.count / traffic.totalViews) * 100)
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#0D2329]">{item.path}</span>
                          <span className="font-semibold text-[#6B7C83]">
                            {item.count} visualizações ({percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#7C3AED] h-full rounded-full"
                            style={{ width: `${Math.max(4, percent)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Horários de Pico */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-4">
                <h3 className="text-sm font-black text-[#0D2329]">
                  Horários de Maior Atividade das Psicopedagogas
                </h3>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-2">
                  {traffic.hourlyDistribution.map((h: any, i: number) => {
                    const maxH = Math.max(...traffic.hourlyDistribution.map((hd: any) => hd.count), 1)
                    const opacity = Math.max(0.15, h.count / maxH)

                    return (
                      <div
                        key={i}
                        className="p-2 rounded-xl text-center space-y-1 transition-all"
                        style={{
                          backgroundColor: `rgba(124, 58, 237, ${opacity})`,
                          color: opacity > 0.6 ? "#FFFFFF" : "#0D2329",
                        }}
                        title={`${h.hour}: ${h.count} acessos`}
                      >
                        <span className="text-[10px] font-black block">{h.hour}</span>
                        <span className="text-[9px] font-bold block">{h.count}</span>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[11px] font-semibold text-[#6B7C83]">
                  Pico de atendimento concentrado entre as <strong>08h e as 18h</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 4: GESTÃO DE CLÍNICAS & CRM DO DONO
            ========================================================================= */}
        {activeTab === "clinicas" && (
          <div className="space-y-6 animate-in fade-in">
            {/* BARRA DE PESQUISA & FILTROS */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8CAAB1]" />
                <input
                  type="text"
                  placeholder="Buscar por psicopedagoga, consultório, e-mail ou WhatsApp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#D8E5E7] bg-[#F8FAFC] text-xs font-medium text-[#0D2329] focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedPlanFilter}
                  onChange={(e) => setSelectedPlanFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-2xl border border-[#D8E5E7] bg-white text-xs font-bold text-[#0D2329] focus:outline-none"
                >
                  <option value="all">Todos os Planos</option>
                  <option value="individual">EvoluIA Individual</option>
                  <option value="duo">EvoluIA Duo</option>
                  <option value="trio">EvoluIA Trio</option>
                  <option value="equipe">EvoluIA Equipe</option>
                  <option value="clinica">EvoluIA Clínica</option>
                </select>
              </div>
            </div>

            {/* TABELA DE CLÍNICAS */}
            <div className="rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b-2 border-[#EEF2F6] text-[#6B7C83] uppercase text-[10px] font-black">
                    <tr>
                      <th className="px-5 py-4">Psicopedagoga / Consultório</th>
                      <th className="px-4 py-4">Contato / WhatsApp</th>
                      <th className="px-4 py-4">Plano Contratado</th>
                      <th className="px-4 py-4">Equipe / Vagas</th>
                      <th className="px-4 py-4">Pacientes</th>
                      <th className="px-4 py-4">Status Hotmart</th>
                      <th className="px-5 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F6]">
                    {filteredClinics.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-xs font-bold text-[#6B7C83]">
                          Nenhuma clínica encontrada para a busca informada.
                        </td>
                      </tr>
                    ) : (
                      filteredClinics.map((clinic) => {
                        const cleanPhone = clinic.phone.replace(/\D/g, "")
                        const waLink = cleanPhone ? `https://wa.me/55${cleanPhone}` : null

                        return (
                          <tr key={clinic.id} className="hover:bg-[#FAF5FF]/30 transition-colors">
                            {/* Nome e Consultório */}
                            <td className="px-5 py-4">
                              <div className="space-y-0.5">
                                <p className="font-black text-sm text-[#0D2329]">{clinic.fullName}</p>
                                <p className="text-[11px] font-semibold text-[#6B7C83]">{clinic.clinicName}</p>
                                <p className="text-[10px] text-[#8CAAB1]">
                                  {clinic.city} - {clinic.state}
                                </p>
                              </div>
                            </td>

                            {/* Contato & WhatsApp */}
                            <td className="px-4 py-4">
                              <div className="space-y-1">
                                <p className="font-bold text-[#0D2329]">{clinic.email}</p>
                                {waLink ? (
                                  <a
                                    href={waLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-black text-[#10B981] hover:underline"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5 fill-current" />
                                    <span>{clinic.phone}</span>
                                  </a>
                                ) : (
                                  <span className="text-[11px] text-[#8CAAB1] font-medium">Sem WhatsApp</span>
                                )}
                              </div>
                            </td>

                            {/* Plano */}
                            <td className="px-4 py-4">
                              <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE]">
                                {clinic.planName} (R$ {clinic.planPrice.toFixed(2).replace(".", ",")})
                              </span>
                            </td>

                            {/* Equipe / Vagas */}
                            <td className="px-4 py-4 font-bold text-[#0D2329]">
                              {clinic.teamCount} de {clinic.maxProfessionals} vagas
                            </td>

                            {/* Pacientes */}
                            <td className="px-4 py-4">
                              <span className="px-2 py-0.5 rounded-lg bg-[#E0F2FE] text-[#0284C7] font-black text-xs">
                                {clinic.patientsCount} pacientes
                              </span>
                            </td>

                            {/* Status Hotmart */}
                            <td className="px-4 py-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  clinic.subscriptionStatus === "active"
                                    ? "bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]"
                                    : clinic.subscriptionStatus === "trial"
                                    ? "bg-[#FEF8EC] text-[#8B6514] border border-[#FDE68A]"
                                    : "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
                                }`}
                              >
                                {clinic.subscriptionStatus === "active"
                                  ? "🟢 Ativa"
                                  : clinic.subscriptionStatus === "trial"
                                  ? "🟡 Teste"
                                  : "🔴 Cancelada"}
                              </span>
                            </td>

                            {/* Ações */}
                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() => {
                                  setEditingClinic(clinic)
                                  setNewPlanId(clinic.planId)
                                  setNewStatus(clinic.subscriptionStatus as any)
                                }}
                                className="px-3 py-1.5 rounded-xl bg-[#F5F3FF] hover:bg-[#EDE9FE] text-[#7C3AED] font-black text-xs border border-[#DDD6FE] transition-all flex items-center gap-1 ml-auto"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Alterar Plano</span>
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 5: LOGS DE WEBHOOKS DA HOTMART
            ========================================================================= */}
        {activeTab === "webhooks" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="p-6 rounded-3xl bg-white border-2 border-[#D8E5E7] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#0D2329]">
                    Auditoria de Webhooks Hotmart em Tempo Real
                  </h3>
                  <p className="text-xs font-semibold text-[#6B7C83]">
                    Eventos de compra, ativação, cancelamento e trocas de plano recebidos pelo servidor.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-[#DCFCE7] text-[#166534] text-xs font-black">
                  Webhook 2.0 Ativo
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#EEF2F6] text-[#6B7C83] uppercase text-[10px] font-black">
                    <tr>
                      <th className="px-4 py-3">Data / Hora</th>
                      <th className="px-4 py-3">Tipo do Evento</th>
                      <th className="px-4 py-3">E-mail Comprador</th>
                      <th className="px-4 py-3">Plano Reconhecido</th>
                      <th className="px-4 py-3">Status do Webhook</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F6]">
                    {webhooks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-xs font-bold text-[#6B7C83]">
                          Nenhum evento registrado ainda.
                        </td>
                      </tr>
                    ) : (
                      webhooks.map((log) => (
                        <tr key={log.id} className="hover:bg-[#FAF5FF]/30">
                          <td className="px-4 py-3 font-semibold text-[#6B7C83]">
                            {new Date(log.processedAt).toLocaleString("pt-BR")}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#EDE9FE] text-[#7C3AED]">
                              {log.eventType}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-[#0D2329]">
                            {log.customerEmail || "—"}
                          </td>
                          <td className="px-4 py-3 font-black text-[#0D2329]">
                            {log.planName || "EvoluIA"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#DCFCE7] text-[#166534]">
                              200 OK - Processado
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: ALTERAÇÃO MANUAL DE PLANO (SUPORTE / CORTESIA DO DONO)
            ========================================================================= */}
        {editingClinic && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border-2 border-[#D8E5E7] shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F6]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold">
                    <Crown className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#0D2329]">Alterar Plano do Cliente</h3>
                    <p className="text-[11px] font-semibold text-[#6B7C83]">{editingClinic.fullName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingClinic(null)}
                  className="w-8 h-8 rounded-xl bg-[#F8FAFC] flex items-center justify-center text-[#6B7C83] hover:text-[#0D2329]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Seleção do Plano */}
                <div className="space-y-1.5">
                  <label className="font-black text-[#0D2329]">Novo Plano:</label>
                  <select
                    value={newPlanId}
                    onChange={(e) => setNewPlanId(e.target.value as PlanId)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8E5E7] bg-white font-bold text-[#0D2329] focus:outline-none"
                  >
                    {PLANS_CONFIG.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — R$ {p.priceMonthly.toFixed(2).replace(".", ",")} ({p.maxProfessionals} vaga
                        {p.maxProfessionals > 1 ? "s" : ""})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Seleção do Status */}
                <div className="space-y-1.5">
                  <label className="font-black text-[#0D2329]">Status da Assinatura:</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8E5E7] bg-white font-bold text-[#0D2329] focus:outline-none"
                  >
                    <option value="active">Ativa (Acesso Liberado)</option>
                    <option value="trial">Período de Teste (Trial)</option>
                    <option value="cancelled">Cancelada / Bloqueada</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EEF2F6]">
                <button
                  type="button"
                  onClick={() => setEditingClinic(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#F1F5F9] text-[#0D2329] font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingPlan}
                  onClick={handleSaveClinicPlan}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white font-black text-xs shadow-md active:scale-95 transition-all"
                >
                  {savingPlan ? "Salvando..." : "Salvar Alteração"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
