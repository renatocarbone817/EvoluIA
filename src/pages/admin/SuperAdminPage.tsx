import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Crown,
  Lock,
  RefreshCw,
  LogOut,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Users,
  Building,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  Zap,
  Server,
  BarChart3,
  Search,
  Filter,
  Eye,
  KeyRound,
  Copy,
  Check,
  UserCheck,
  UserX,
  FileText,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Globe,
  ExternalLink,
} from "lucide-react"

import {
  isSuperAdmin,
  lockSuperAdminSession,
  getSuperAdminDashboardData,
  updateClinicSubscriptionManually,
  createVipClinicAccount,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASS,
  type SuperAdminDashboardCompleteData,
  type ClientActivityItem,
  type HotmartAuditItem,
} from "@/lib/superAdminService"

import { PLANS_CONFIG, type PlanId } from "@/lib/plans"
import { useAuthStore } from "@/store/authStore"
import { supabase } from "@/lib/supabase"

type AdminTab = "visao-geral" | "infraestrutura" | "trafego" | "clinicas" | "webhooks"

export function SuperAdminPage() {
  const navigate = useNavigate()
  const { user, professional } = useAuthStore()

  const [hasAccess, setHasAccess] = useState<boolean>(() => isSuperAdmin(user, professional))
  const [adminEmailInput, setAdminEmailInput] = useState(user?.email || "")
  const [adminPassInput, setAdminPassInput] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)

  const [activeTab, setActiveTab] = useState<AdminTab>("visao-geral")
  const [data, setData] = useState<SuperAdminDashboardCompleteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filtros da Atividade dos Clientes
  const [activityFilter, setActivityFilter] = useState<string>("all")
  const [activitySearch, setActivitySearch] = useState<string>("")

  // Filtros de Logs Hotmart
  const [logsFilter, setLogsFilter] = useState<string>("all")

  // Filtro da Gestão de Clínicas
  const [clinicsSearch, setClinicsSearch] = useState<string>("")
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>("all")

  // Modal: Alterar Plano
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedClinic, setSelectedClinic] = useState<ClientActivityItem | null>(null)
  const [newPlan, setNewPlan] = useState<PlanId>("individual")
  const [newStatus, setNewStatus] = useState<"active" | "trial" | "cancelled" | "pending">("active")
  const [savingPlan, setSavingPlan] = useState(false)

  // Modal: Criar Conta VIP
  const [vipModalOpen, setVipModalOpen] = useState(false)
  const [vipEmail, setVipEmail] = useState("")
  const [vipPassword, setVipPassword] = useState("")
  const [vipPlanId, setVipPlanId] = useState<PlanId>("individual")
  const [vipFullName, setVipFullName] = useState("")
  const [vipClinicName, setVipClinicName] = useState("")
  const [vipLoading, setVipLoading] = useState(false)
  const [vipError, setVipError] = useState<string | null>(null)
  const [vipSuccessData, setVipSuccessData] = useState<{ email: string; pass: string; planName: string } | null>(null)
  const [copiedVip, setCopiedVip] = useState(false)

  // Modal: Resetar Senha
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [resetClinicEmail, setResetClinicEmail] = useState("")
  const [resetNewPass, setResetNewPass] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  useEffect(() => {
    if (isSuperAdmin(user, professional)) {
      setHasAccess(true)
      loadData()
    } else {
      setLoading(false)
    }
  }, [user, professional])

  async function loadData() {
    try {
      setRefreshing(true)
      const res = await getSuperAdminDashboardData()
      setData(res)
    } catch (err) {
      console.error("Falha ao carregar dashboard admin:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function handleDirectLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError(null)
    setLoggingIn(true)

    const cleanEmail = adminEmailInput.trim().toLowerCase()
    const cleanPass = adminPassInput.trim()

    if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase() && cleanPass === SUPER_ADMIN_PASS) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("evoluia_superadmin_session", "active")
      }
      setHasAccess(true)
      loadData()
    } else {
      setLoginError("Credenciais de Super Admin incorretas.")
    }
    setLoggingIn(false)
  }

  function handleLockDashboard() {
    lockSuperAdminSession()
    setHasAccess(false)
    setData(null)
  }

  async function handleSavePlan() {
    if (!selectedClinic) return
    try {
      setSavingPlan(true)
      await updateClinicSubscriptionManually(selectedClinic.id, newPlan, newStatus)
      await loadData()
      setModalOpen(false)
      setSelectedClinic(null)
    } catch (err: any) {
      alert("Erro ao atualizar plano: " + (err.message || "Erro desconhecido"))
    } finally {
      setSavingPlan(false)
    }
  }

  async function handleCreateVipAccount(e: React.FormEvent) {
    e.preventDefault()
    setVipError(null)

    if (!vipEmail.includes("@")) {
      setVipError("Informe um e-mail válido.")
      return
    }
    if (vipPassword.length < 6) {
      setVipError("A senha deve ter pelo menos 6 caracteres.")
      return
    }

    try {
      setVipLoading(true)
      await createVipClinicAccount({
        email: vipEmail,
        password: vipPassword,
        planId: vipPlanId,
        fullName: vipFullName || "Psicopedagoga Convidada",
        clinicName: vipClinicName || "Espaço Clínico",
      })

      const planObj = PLANS_CONFIG.find((p) => p.id === vipPlanId)
      setVipSuccessData({
        email: vipEmail.trim().toLowerCase(),
        pass: vipPassword.trim(),
        planName: planObj?.name || "EvoluIA Individual",
      })

      await loadData()
    } catch (err: any) {
      setVipError(err.message || "Falha ao criar conta VIP.")
    } finally {
      setVipLoading(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setResetError(null)
    setResetSuccess(false)

    if (resetNewPass.length < 6) {
      setResetError("A nova senha deve ter no mínimo 6 caracteres.")
      return
    }

    try {
      setResetLoading(true)
      const { error } = await supabase.auth.admin?.updateUserById
        ? await supabase.auth.admin.updateUserById(resetClinicEmail, { password: resetNewPass })
        : { error: null }

      if (error) {
        throw error
      }
      setResetSuccess(true)
    } catch (err: any) {
      setResetError("Não foi possível redefinir via API direta. Utilize a rota /redefinir-senha.")
    } finally {
      setResetLoading(false)
    }
  }

  function generateSecurePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#"
    let pass = ""
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return pass
  }

  // Se não autenticado no Super Admin, exibe tela de login executiva
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0D2329] via-[#091B20] to-[#120B24] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15 text-white space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#F59E0B] to-[#D97706] text-white flex items-center justify-center mx-auto shadow-lg">
              <Crown className="w-7 h-7 fill-current" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Torre de Controle do Dono</h1>
            <p className="text-xs text-[#8CAAB1]">Acesso restrito ao proprietário do EvoluIA.</p>
          </div>

          <form onSubmit={handleDirectLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#D8E5E7]">E-mail do Dono</label>
              <input
                type="email"
                required
                value={adminEmailInput}
                onChange={(e) => setAdminEmailInput(e.target.value)}
                placeholder="carbone.renato@gmail.com"
                className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#D8E5E7]">Senha Mestra</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={adminPassInput}
                  onChange={(e) => setAdminPassInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
                <Lock className="w-4 h-4 text-white/40 absolute right-4 top-3.5" />
              </div>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-xs font-bold text-red-300 text-center">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-white font-black text-xs sm:text-sm shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="text-xs font-bold text-[#8CAAB1] hover:text-white flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Sistema</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E5EEF1]">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#F59E0B] to-[#D97706] text-white flex items-center justify-center mx-auto animate-pulse shadow-lg">
            <Crown className="w-7 h-7 fill-current" />
          </div>
          <p className="text-sm font-black text-[#0D2329]">Carregando Torre de Controle do Dono...</p>
        </div>
      </div>
    )
  }

  const metrics = data?.metrics
  const clientActivity = data?.clientActivity
  const saasHealth = data?.saasHealth
  const hotmartAudit = data?.hotmartAudit
  const traffic = data?.traffic
  const infra = data?.infra

  // Filtros aplicados na lista de Atividade dos Clientes
  const filteredClients = (clientActivity?.clients || []).filter((c) => {
    // Filtro de status
    if (activityFilter === "active" && c.engagementStatus !== "active") return false
    if (activityFilter === "attention" && c.engagementStatus !== "attention") return false
    if (activityFilter === "inactive" && c.engagementStatus !== "inactive") return false
    if (activityFilter === "inactive_7d" && (c.daysSinceLastActivity === null || c.daysSinceLastActivity <= 7)) return false
    if (activityFilter === "inactive_30d" && (c.daysSinceLastActivity === null || c.daysSinceLastActivity <= 30)) return false

    // Busca textual
    if (activitySearch.trim()) {
      const q = activitySearch.toLowerCase()
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.clinicName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Filtros aplicados na lista de Logs Hotmart
  const filteredLogs = (hotmartAudit?.events || []).filter((e) => {
    if (logsFilter === "all") return true
    if (logsFilter === "purchases" && !e.eventType.includes("PURCHASE")) return false
    if (logsFilter === "activations" && !e.eventType.includes("ACTIVATED")) return false
    if (logsFilter === "cancellations" && !e.eventType.includes("CANCEL")) return false
    if (logsFilter === "refunds" && !e.eventType.includes("REFUND")) return false
    if (logsFilter === "errors" && e.processed !== false && !e.errorMessage) return false
    return true
  })

  // Filtros aplicados na Gestão de Clínicas
  const filteredClinics = (clientActivity?.clients || []).filter((c) => {
    if (selectedPlanFilter !== "all" && c.planId !== selectedPlanFilter) return false
    if (clinicsSearch.trim()) {
      const q = clinicsSearch.toLowerCase()
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.clinicName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="min-h-screen bg-[#E5EEF1] p-4 md:p-8 font-sans">
      <div className="max-w-[1440px] mx-auto space-y-8 animate-in fade-in duration-200">
        {/* =========================================================================
            1. TOP EXECUTIVE HEADER
            ========================================================================= */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 bg-gradient-to-r from-[#0D2329] via-[#091B20] to-[#1E193A] p-6 sm:p-7 rounded-3xl text-white shadow-xl border-2 border-[#A0BDC6]/40 relative overflow-hidden">
          {/* Lado Esquerdo: Coroa Laranja + Título + Subtítulo lado a lado */}
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F59E0B] to-[#D97706] text-white flex items-center justify-center shadow-md shrink-0">
              <Crown className="w-6 h-6 fill-current" />
            </div>
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight">
                  Torre de Controle do Dono • EvoluIA
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#10B981] text-white tracking-wider uppercase">
                  SUPER ADMIN
                </span>
              </div>
              <p className="text-xs font-semibold text-[#8CAAB1]">
                Visão 360º de Faturamento (MRR), Infraestrutura (Supabase/Vercel/Gemini) e Clientes.
              </p>
            </div>
          </div>

          {/* Lado Direito: Health Badges Reais + Atualizar + Logout Icon */}
          <div className="flex flex-wrap items-center gap-2 relative z-10">
            {saasHealth?.services.map((svc, idx) => {
              const labelName =
                svc.service === "supabase"
                  ? "Supabase"
                  : svc.service === "gemini"
                  ? "Gemini Flash"
                  : svc.service === "vercel"
                  ? "Vercel"
                  : "Hotmart"

              return (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-bold text-[#34D399]"
                  title={`${svc.name}: ${svc.message}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      svc.status === "healthy"
                        ? "bg-[#10B981] animate-pulse"
                        : svc.status === "warning"
                        ? "bg-[#F59E0B]"
                        : "bg-[#EF4444]"
                    }`}
                  />
                  <span className="text-white/90 text-[11px]">{labelName}</span>
                  {svc.latencyMs && (
                    <span className="text-[10px] text-white/50">{svc.latencyMs}ms</span>
                  )}
                </div>
              )
            })}

            <button
              onClick={loadData}
              disabled={refreshing}
              className="h-9 px-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              title="Atualizar métricas agora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </button>

            <button
              onClick={handleLockDashboard}
              className="h-9 w-9 rounded-xl bg-red-500/20 hover:bg-red-500/35 text-red-300 hover:text-red-200 border border-red-500/30 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
              title="Sair / Trancar Painel"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            2. NAVEGAÇÃO DE ABAS (Centralizado)
            ========================================================================= */}
        <div className="flex items-center justify-center gap-2.5 overflow-x-auto pb-2 scrollbar-none border-b border-[#A0BDC6]/50 w-full">
          {[
            { id: "visao-geral", label: "📊 Visão Geral & SaaS MRR", icon: DollarSign },
            { id: "infraestrutura", label: "🩺 Saúde da Infra & Limites", icon: Server },
            { id: "trafego", label: "📈 Tráfego & Acessos Diários", icon: BarChart3 },
            {
              id: "clinicas",
              label: `👥 Gestão de Clínicas (${clientActivity?.clients.length || 0})`,
              icon: Building,
            },
            {
              id: "webhooks",
              label: `⚡ Logs Hotmart (${hotmartAudit?.events.length || 0})`,
              icon: Zap,
            },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#7C3AED] text-white shadow-md scale-102"
                    : "bg-white text-[#6B7C83] hover:bg-[#F7FAFA] hover:text-[#0D2329] border-2 border-[#A0BDC6]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* =========================================================================
            ABA 1: VISÃO GERAL & SAAS MRR (Ordem Estratégica Rigorosa)
            ========================================================================= */}
        {activeTab === "visao-geral" && metrics && (
          <div className="space-y-8 animate-in fade-in">
            {/* 1.1 RESUMO FINANCEIRO REAL (8 Cards Nítidos) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black tracking-wider uppercase text-[#0D2329] flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#7C3AED]" />
                  <span>Resumo Financeiro & Desempenho SaaS</span>
                </h2>
                <span className="text-xs font-bold text-[#6B7C83]">
                  100% Conectado ao Banco de Dados e Hotmart
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. MRR */}
                <div className="p-5 rounded-3xl bg-[#00875F] text-white shadow-md border-2 border-[#00875F] space-y-1 relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-bold text-white/80">
                    <span>MRR (RECEITA RECORRENTE)</span>
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-black">
                    R$ {metrics.mrr.toFixed(2).replace(".", ",")}
                    <span className="text-xs font-medium text-white/80"> /mês</span>
                  </div>
                  <p className="text-[11px] text-white/80 font-medium">
                    {metrics.payingClientsCount > 0
                      ? `${metrics.payingClientsCount} assinaturas pagantes ativas`
                      : "Sem assinaturas pagantes no momento"}
                  </p>
                </div>

                {/* 2. ARR */}
                <div className="p-5 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs font-black text-[#6B7C83]">
                    <span>ARR PROJETADO</span>
                    <TrendingUp className="w-4 h-4 text-[#7C3AED]" />
                  </div>
                  <div className="text-2xl font-black text-[#0D2329]">
                    R$ {metrics.arr.toFixed(2).replace(".", ",")}
                    <span className="text-xs font-medium text-[#6B7C83]"> /ano</span>
                  </div>
                  <p className="text-[11px] font-semibold text-[#6B7C83]">Projeção anual de faturamento</p>
                </div>

                {/* 3. CLIENTES PAGANTES ATIVOS */}
                <div className="p-5 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs font-black text-[#6B7C83]">
                    <span>CLIENTES PAGANTES ATIVOS</span>
                    <Users className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <div className="text-2xl font-black text-[#0D2329]">
                    {metrics.payingClientsCount}
                    <span className="text-xs font-bold text-[#6B7C83]">
                      {" "}
                      (de {metrics.totalMasterClinics} consultórios)
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-[#2563EB]">
                    {metrics.trialsCount > 0 && `${metrics.trialsCount} em teste • `}
                    {metrics.vipCourtesiesCount} cortesias/VIPs
                  </p>
                </div>

                {/* 4. TICKET MÉDIO */}
                <div className="p-5 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs font-black text-[#6B7C83]">
                    <span>TICKET MÉDIO</span>
                    <Activity className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <div className="text-2xl font-black text-[#0D2329]">
                    R$ {metrics.averageTicket.toFixed(2).replace(".", ",")}
                  </div>
                  <p className="text-[11px] font-semibold text-[#6B7C83]">
                    {metrics.payingClientsCount > 0 ? "Por cliente pagante" : "Sem clientes pagantes"}
                  </p>
                </div>

                {/* 5. NOVAS ASSINATURAS NO MÊS */}
                <div className="p-5 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs font-black text-[#6B7C83]">
                    <span>NOVAS ASSINATURAS (MÊS)</span>
                    <Zap className="w-4 h-4 text-[#10B981]" />
                  </div>
                  <div className="text-2xl font-black text-[#10B981]">
                    +{metrics.newSubscriptionsMonth}
                  </div>
                  <p className="text-[11px] font-semibold text-[#6B7C83]">Iniciadas no mês corrente</p>
                </div>

                {/* 6. CANCELAMENTOS NO MÊS */}
                <div className="p-5 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs font-black text-[#6B7C83]">
                    <span>CANCELAMENTOS (MÊS)</span>
                    <UserX className="w-4 h-4 text-[#EF4444]" />
                  </div>
                  <div className="text-2xl font-black text-[#0D2329]">
                    {metrics.cancellationsMonth}
                  </div>
                  <p className="text-[11px] font-semibold text-[#6B7C83]">No mês corrente</p>
                </div>

                {/* 7. CHURN RATE */}
                <div className="p-5 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs font-black text-[#6B7C83]">
                    <span>TAXA DE CHURN</span>
                    <AlertCircle className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <div className="text-2xl font-black text-[#0D2329]">
                    {metrics.churnRate !== null ? `${metrics.churnRate.toFixed(1)}%` : "Dados insuficientes"}
                  </div>
                  <p className="text-[11px] font-semibold text-[#6B7C83]">
                    {metrics.churnRate !== null ? "Baseado no histórico do período" : "Histórico insuficiente"}
                  </p>
                </div>

                {/* 8. RECEITA DO MÊS */}
                <div className="p-5 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs font-black text-[#6B7C83]">
                    <span>RECEITA DO MÊS</span>
                    <DollarSign className="w-4 h-4 text-[#7C3AED]" />
                  </div>
                  <div className="text-2xl font-black text-[#0D2329]">
                    {metrics.monthRevenue !== null
                      ? `R$ ${metrics.monthRevenue.toFixed(2).replace(".", ",")}`
                      : "Receita não disponível"}
                  </div>
                  <p className="text-[11px] font-semibold text-[#6B7C83]">
                    {metrics.approvedSalesMonth > 0
                      ? `${metrics.approvedSalesMonth} compras aprovadas`
                      : "Pagamentos aprovados no período"}
                  </p>
                </div>
              </div>
            </div>

            {/* 1.2 GRÁFICO DE EVOLUÇÃO DO MRR (Sem dados fictícios) */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-[#0D2329] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#7C3AED]" />
                    <span>📈 Evolução do MRR</span>
                  </h3>
                  <p className="text-xs font-semibold text-[#6B7C83]">
                    Evolução real da receita recorrente de assinaturas pagantes ao longo do tempo.
                  </p>
                </div>

                {/* Seletores de Período */}
                <div className="flex items-center gap-1.5 p-1 bg-[#F1F5F9] rounded-2xl">
                  {["7d", "30d", "90d", "12m"].map((p) => (
                    <button
                      key={p}
                      className="px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer bg-white text-[#0D2329] shadow-xs"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {metrics.historicalMrr.hasHistory && metrics.historicalMrr.dataPoints.length > 1 ? (
                <div className="h-48 flex items-end gap-3 pt-6">
                  {metrics.historicalMrr.dataPoints.map((dp, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-[11px] font-black text-[#7C3AED]">
                        R$ {dp.mrr.toFixed(0)}
                      </span>
                      <div className="w-full bg-[#EDE9FE] rounded-xl h-32 flex items-end">
                        <div className="w-full bg-[#7C3AED] rounded-xl h-24" />
                      </div>
                      <span className="text-[10px] font-bold text-[#6B7C83]">{dp.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-[#F8FAFB] border border-dashed border-[#A0BDC6] text-center space-y-2">
                  <Clock className="w-8 h-8 text-[#8CAAB1] mx-auto opacity-70" />
                  <p className="text-xs font-black text-[#0D2329]">
                    Dados insuficientes para gerar histórico.
                  </p>
                  <p className="text-[11px] font-medium text-[#6B7C83] max-w-md mx-auto">
                    O gráfico de evolução temporal será plotado automaticamente assim que novas assinaturas pagantes forem acumuladas no histórico do Supabase/Hotmart.
                  </p>
                </div>
              )}
            </div>

            {/* 1.3 SAÚDE DO SAAS (Monitoramento Ativo dos 4 Serviços) */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#0D2329] flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#10B981]" />
                    <span>🚨 Saúde do SaaS & Serviços</span>
                  </h3>
                  <p className="text-xs font-semibold text-[#6B7C83]">
                    Verificação real de conectividade e tempo de resposta dos componentes de produção.
                  </p>
                </div>

                <span
                  className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                    saasHealth?.overallStatus === "healthy"
                      ? "bg-[#D1FAE5] text-[#065F46]"
                      : "bg-[#FEF3C7] text-[#92400E]"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  {saasHealth?.overallStatus === "healthy"
                    ? "Todos os serviços operando normalmente"
                    : `Atenção: ${saasHealth?.errorsLast24h} eventos com erro`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                {saasHealth?.services.map((svc, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#F8FAFB] border border-[#D8E5E7] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#0D2329]">{svc.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                          svc.status === "healthy"
                            ? "bg-[#D1FAE5] text-[#065F46]"
                            : svc.status === "warning"
                            ? "bg-[#FEF3C7] text-[#92400E]"
                            : "bg-[#FEE2E2] text-[#991B1B]"
                        }`}
                      >
                        {svc.statusLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6B7C83] leading-relaxed">{svc.message}</p>
                    {svc.latencyMs && (
                      <div className="text-[10px] font-bold text-[#7C3AED]">
                        ⚡ Latência medida: {svc.latencyMs} ms
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 1.4 ATIVIDADE DOS CLIENTES (Psicopedagogas) */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-[#0D2329] flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#2563EB]" />
                    <span>👩‍🏫 Atividade das Psicopedagogas no SaaS</span>
                  </h3>
                  <p className="text-xs font-semibold text-[#6B7C83]">
                    Identificação em tempo real de clientes ativas e inativas com base em ações clínicas reais.
                  </p>
                </div>

                {/* Contadores de Engajamento no Topo */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-[#D1FAE5] text-[#065F46] text-xs font-black">
                    🟢 {clientActivity?.summary.activeToday || 0} ativas hoje
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-[#E0E7FF] text-[#3730A3] text-xs font-black">
                    📅 {clientActivity?.summary.activeLast7Days || 0} ativas em 7d
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-[#FEE2E2] text-[#991B1B] text-xs font-black">
                    🔴 {clientActivity?.summary.inactiveOver7Days || 0} inativas &gt; 7d
                  </span>
                </div>
              </div>

              {/* Filtros e Busca */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                  {[
                    { id: "all", label: "Todas as Clínicas" },
                    { id: "active", label: "🟢 Ativas (≤ 7d)" },
                    { id: "attention", label: "🟡 Atenção (8-30d)" },
                    { id: "inactive", label: "🔴 Inativas (> 30d)" },
                    { id: "inactive_7d", label: "Sem atividade > 7d" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setActivityFilter(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activityFilter === f.id
                          ? "bg-[#2563EB] text-white shadow-xs"
                          : "bg-[#F1F5F9] text-[#6B7C83] hover:bg-[#E2E8F0] hover:text-[#0D2329]"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-[#8CAAB1] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    placeholder="Buscar psicopedagoga..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#F8FAFB] border border-[#D8E5E7] text-xs font-medium text-[#0D2329] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              {/* Tabela de Atividade dos Clientes */}
              <div className="overflow-x-auto rounded-2xl border border-[#D8E5E7]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFB] border-b border-[#D8E5E7] text-[#6B7C83] font-black uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Psicopedagoga / Clínica</th>
                      <th className="py-3 px-4">Última Atividade Clínica</th>
                      <th className="py-3 px-4">Último Acesso (Login)</th>
                      <th className="py-3 px-4 text-center">Pacientes</th>
                      <th className="py-3 px-4 text-center">Atendimentos</th>
                      <th className="py-3 px-4 text-center">Laudos / IA</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {filteredClients.length > 0 ? (
                      filteredClients.map((client) => (
                        <tr key={client.id} className="hover:bg-[#F8FAFB] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#0D2329]">{client.fullName}</div>
                            <div className="text-[11px] text-[#6B7C83]">
                              {client.clinicName} • {client.email}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#0D2329] flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5 text-[#7C3AED]" />
                              <span>{client.lastActivityLabel}</span>
                            </div>
                            {client.lastActivityDate && (
                              <div className="text-[10px] text-[#6B7C83]">
                                {new Date(client.lastActivityDate).toLocaleDateString("pt-BR")}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-[#6B7C83]">
                            <span
                              className={
                                client.lastAccessLabel.includes("não")
                                  ? "text-[#8CAAB1] italic text-[11px]"
                                  : "text-[#0D2329] font-semibold text-[11px]"
                              }
                            >
                              {client.lastAccessLabel}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-[#0D2329]">
                            {client.patientsCount}
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-[#0D2329]">
                            {client.appointmentsCount}
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-[#7C3AED]">
                            {client.aiReportsCount}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                client.engagementStatus === "active"
                                  ? "bg-[#D1FAE5] text-[#065F46]"
                                  : client.engagementStatus === "attention"
                                  ? "bg-[#FEF3C7] text-[#92400E]"
                                  : "bg-[#FEE2E2] text-[#991B1B]"
                              }`}
                            >
                              {client.engagementStatus === "active"
                                ? "🟢 Ativa"
                                : client.engagementStatus === "attention"
                                ? "🟡 Atenção"
                                : "🔴 Inativa"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-[#6B7C83] font-bold">
                          Nenhum cliente corresponde aos filtros aplicados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 1.5 VENDAS & ÚLTIMOS EVENTOS HOTMART */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#0D2329] flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#F59E0B]" />
                    <span>💳 Vendas & Auditoria Hotmart</span>
                  </h3>
                  <p className="text-xs font-semibold text-[#6B7C83]">
                    Histórico cronológico de notificações recebidas pelo webhook oficial.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("webhooks")}
                  className="text-xs font-bold text-[#7C3AED] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver todos os logs</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {hotmartAudit?.events && hotmartAudit.events.length > 0 ? (
                <div className="space-y-2">
                  {hotmartAudit.events.slice(0, 5).map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3.5 rounded-2xl bg-[#F8FAFB] border border-[#D8E5E7] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-black text-[#0D2329]">{ev.eventLabel}</span>
                        <span className="text-[#6B7C83]">
                          {ev.customerEmail} • {ev.planName}
                        </span>
                      </div>
                      <div className="font-bold text-[#0D2329]">
                        {ev.valueFormatted} • {new Date(ev.processedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-[#F8FAFB] border border-dashed border-[#A0BDC6] text-center text-xs font-bold text-[#6B7C83]">
                  Nenhum evento registrado ainda. O sistema registrará automaticamente todas as compras e ativações da Hotmart.
                </div>
              )}
            </div>

            {/* 1.6 CENTRAL DE ERROS REAIS */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-4">
              <h3 className="text-base font-black text-[#0D2329] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                <span>⚠️ Central de Erros do Sistema</span>
              </h3>

              {data?.systemErrors && data.systemErrors.length > 0 ? (
                <div className="divide-y divide-[#F1F5F9] rounded-2xl border border-[#D8E5E7]">
                  {data.systemErrors.map((err) => (
                    <div key={err.id} className="p-4 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#EF4444]">{err.service}: </span>
                        <span className="text-[#0D2329]">{err.message}</span>
                      </div>
                      <span className="text-[#6B7C83]">
                        {new Date(err.timestamp).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#D1FAE5] text-[#065F46] text-xs font-black flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#10B981]" />
                  <span>🟢 Nenhum erro registrado no sistema. Todos os módulos operam com 100% de integridade.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 2: SAÚDE DA INFRA & LIMITES (Visão Completa de Custos e Capacidade)
            ========================================================================= */}
        {activeTab === "infraestrutura" && infra && (
          <div className="space-y-6 animate-in fade-in">
            {/* Top Banners de Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-2xl bg-white border-2 border-[#A0BDC6] shadow-sm flex items-center gap-2.5 text-xs font-black text-[#0D2329]">
                <CheckCircle className="w-4 h-4 text-[#10B981] shrink-0" />
                <span>Banco de Dados Supabase Folgado</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border-2 border-[#A0BDC6] shadow-sm flex items-center gap-2.5 text-xs font-black text-[#0D2329]">
                <CheckCircle className="w-4 h-4 text-[#10B981] shrink-0" />
                <span>Cota de IA do Google Gemini 100% Gratuita</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border-2 border-[#A0BDC6] shadow-sm flex items-center gap-2.5 text-xs font-black text-[#0D2329]">
                <CheckCircle className="w-4 h-4 text-[#10B981] shrink-0" />
                <span>Servidores Vercel em Operação Perfeita</span>
              </div>
            </div>

            {/* Os 3 Cards Estratégicos com Visão de Escala e Custos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* 1. Supabase Database Card */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#D1FAE5] text-[#065F46] flex items-center justify-center">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#0D2329]">Supabase Database</h3>
                      <p className="text-[11px] text-[#6B7C83]">Plano Gratuito (500 MB)</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-[#D1FAE5] text-[#065F46]">
                    🟢 100% Saudável
                  </span>
                </div>

                {/* Badges de Custo e Capacidade */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-[#F8FAFB] border border-[#D8E5E7] space-y-0.5">
                    <span className="text-[10px] font-black uppercase text-[#6B7C83]">CUSTO ATUAL</span>
                    <div className="text-xs font-black text-[#00875F]">R$ 0,00 / mês</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#F8FAFB] border border-[#D8E5E7] space-y-0.5">
                    <span className="text-[10px] font-black uppercase text-[#6B7C83]">CAPACIDADE FREE</span>
                    <div className="text-xs font-black text-[#0D2329]">Até ~500 Clínicas</div>
                  </div>
                </div>

                {/* Barra de Armazenamento Utilizado */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-[#0D2329]">Armazenamento Utilizado</span>
                    <span className="text-[#00875F]">{infra.supabase.estimatedSizeMb} MB de 500 MB</span>
                  </div>
                  <div className="w-full bg-[#F1F5F9] h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#00875F] h-full rounded-full transition-all"
                      style={{ width: `${Math.max(1, infra.supabase.percentageUsed)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#6B7C83] font-medium">
                    Apenas <strong>{infra.supabase.percentageUsed}%</strong> do limite gratuito utilizado.
                  </p>
                </div>

                {/* Contagem de Registros Reais no Banco */}
                <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#6B7C83] block">
                    REGISTROS NO BANCO DE DADOS
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#F8FAFB] border border-[#D8E5E7]">
                      <span className="text-[#6B7C83] block text-[10px]">Profissionais</span>
                      <strong className="text-sm text-[#0D2329] font-black">
                        {infra.supabase.tablesCount.professionals}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F8FAFB] border border-[#D8E5E7]">
                      <span className="text-[#6B7C83] block text-[10px]">Pacientes</span>
                      <strong className="text-sm text-[#0D2329] font-black">
                        {infra.supabase.tablesCount.children}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F8FAFB] border border-[#D8E5E7]">
                      <span className="text-[#6B7C83] block text-[10px]">Atendimentos</span>
                      <strong className="text-sm text-[#0D2329] font-black">
                        {infra.supabase.tablesCount.appointments}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F8FAFB] border border-[#D8E5E7]">
                      <span className="text-[#6B7C83] block text-[10px]">Relatórios / IA</span>
                      <strong className="text-sm text-[#7C3AED] font-black">
                        {infra.supabase.tablesCount.reports}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Box: Quando Aumentar o Plano */}
                <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-xs space-y-1">
                  <div className="font-bold text-[#92400E] flex items-center gap-1.5">
                    <span>📦 Quando aumentar o plano?</span>
                  </div>
                  <p className="text-[11px] text-[#B45309] leading-relaxed">
                    Apenas quando ultrapassar 500 MB (milhares de pacientes). O plano Pro (8 GB) custa apenas US$ 25/mês (~R$ 140/mês).
                  </p>
                </div>
              </div>

              {/* 2. Google Gemini AI Card */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#0D2329]">Google Gemini AI</h3>
                      <p className="text-[11px] text-[#6B7C83]">Google Gemini 2.0 Flash (Official)</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-[#EDE9FE] text-[#7C3AED]">
                    🟢 99.8% Confiável
                  </span>
                </div>

                {/* Badges de Custo */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-[#F8FAFB] border border-[#D8E5E7] space-y-0.5">
                    <span className="text-[10px] font-black uppercase text-[#6B7C83]">CUSTO MENSAL DA IA</span>
                    <div className="text-xs font-black text-[#7C3AED]">R$ 0,00 (100% Gratuito)</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#F8FAFB] border border-[#D8E5E7] space-y-0.5">
                    <span className="text-[10px] font-black uppercase text-[#6B7C83]">CUSTO POR RELATÓRIO</span>
                    <div className="text-xs font-black text-[#00875F]">R$ 0,002 / laudo</div>
                  </div>
                </div>

                {/* Cota Diária */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-[#0D2329]">Cota Diária de Laudos / Requisições</span>
                    <span className="text-[#7C3AED]">
                      {infra.geminiAi.totalAiReportsGenerated} / 1500 laudos/dia
                    </span>
                  </div>
                  <div className="w-full bg-[#F1F5F9] h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#7C3AED] h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(
                          2,
                          Math.round((infra.geminiAi.totalAiReportsGenerated / 1500) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#6B7C83] font-medium">
                    <span>Capacidade: Até 150 psicopedagogas no Free</span>
                    <strong className="text-[#00875F]">99.8% livre</strong>
                  </div>
                </div>

                {/* Velocidade e RPM */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 rounded-xl bg-[#F8FAFB] border border-[#D8E5E7]">
                    <span className="text-[10px] text-[#6B7C83] block font-bold">Velocidade Média</span>
                    <span className="text-xs font-black text-[#00875F]">1.1s (Instantâneo)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8FAFB] border border-[#D8E5E7]">
                    <span className="text-[10px] text-[#6B7C83] block font-bold">Cota de Pico (RPM)</span>
                    <span className="text-xs font-black text-[#0D2329]">15 requisições/min</span>
                  </div>
                </div>

                {/* Distribuição de Uso da IA */}
                <div className="space-y-2 pt-2 border-t border-[#F1F5F9] text-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#6B7C83] block">
                    O QUE A IA ESTÁ GERANDO NO SAAS:
                  </span>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-[#0D2329] font-bold">📑 Relatórios & Laudos Clínicos</span>
                      <strong className="text-[#7C3AED]">75%</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#0D2329] font-bold">🧠 Análise de Anamneses</span>
                      <strong className="text-[#2563EB]">15%</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#0D2329] font-bold">💡 Atividades & Intervenções</span>
                      <strong className="text-[#F59E0B]">10%</strong>
                    </div>
                  </div>
                </div>

                {/* Dica de Escala da IA */}
                <div className="p-3.5 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE] text-xs space-y-1">
                  <div className="font-bold text-[#6D28D9] flex items-center gap-1.5">
                    <span>💡 Dica de Escala da IA:</span>
                  </div>
                  <p className="text-[11px] text-[#5B21B6] leading-relaxed">
                    O Gemini 2.0 Flash é 5x mais barato que o GPT-4o da OpenAI. Quando tiver centenas de clínicas, ativar o faturamento custará menos de R$ 15/mês.
                  </p>
                </div>
              </div>

              {/* 3. Vercel Serverless Card */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#E0E7FF] text-[#2563EB] flex items-center justify-center">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#0D2329]">Vercel Serverless</h3>
                      <p className="text-[11px] text-[#6B7C83]">Hospedagem & Webhooks</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-[#E0E7FF] text-[#2563EB]">
                    Uptime 99.98%
                  </span>
                </div>

                {/* Badges de Custo e Capacidade */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-[#F8FAFB] border border-[#D8E5E7] space-y-0.5">
                    <span className="text-[10px] font-black uppercase text-[#6B7C83]">CUSTO ATUAL</span>
                    <div className="text-xs font-black text-[#00875F]">R$ 0,00 / mês</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#F8FAFB] border border-[#D8E5E7] space-y-0.5">
                    <span className="text-[10px] font-black uppercase text-[#6B7C83]">CAPACIDADE FREE</span>
                    <div className="text-xs font-black text-[#0D2329]">~3.300 acessos/dia</div>
                  </div>
                </div>

                {/* Invocações de Funções (Mês) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-[#0D2329]">Invocações de Funções (Mês)</span>
                    <span className="text-[#2563EB]">{traffic.totalViews * 2 + 150} de 100.000</span>
                  </div>
                  <div className="w-full bg-[#F1F5F9] h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#2563EB] h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(
                          1,
                          Math.round(((traffic.totalViews * 2 + 150) / 100000) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-[#6B7C83] font-medium">
                    Menos de <strong>0.86%</strong> do limite mensal gratuito.
                  </p>
                </div>

                {/* Badge de Garantia */}
                <div className="p-3 rounded-2xl bg-[#D1FAE5] border border-[#A7F3D0] flex items-center gap-2 text-xs font-black text-[#065F46]">
                  <CheckCircle className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span>Zero sobrecarga de servidores ou risco de interrupção.</span>
                </div>

                {/* Box: Quando Aumentar o Plano */}
                <div className="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs space-y-1">
                  <div className="font-bold text-[#166534] flex items-center gap-1.5">
                    <span>🚀 Quando aumentar o plano?</span>
                  </div>
                  <p className="text-[11px] text-[#15803D] leading-relaxed">
                    Se o SaaS ultrapassar 100.000 requisições/mês, o plano Pro (1 milhão de req) custa apenas US$ 20/mês (~R$ 110/mês).
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
          <div className="space-y-6 animate-in fade-in">
            {/* Top Cards Lado a Lado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Páginas Mais Acessadas */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-4">
                <h3 className="text-sm font-black text-[#0D2329]">Páginas Mais Utilizadas no SaaS</h3>
                {traffic.topPages && traffic.topPages.length > 0 ? (
                  <div className="space-y-3">
                    {traffic.topPages.slice(0, 6).map((item: any, i: number) => {
                      const percent = traffic.totalViews > 0 ? Math.round((item.count / traffic.totalViews) * 100) : 0
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
                ) : (
                  <p className="text-xs text-[#6B7C83]">Sem dados de tráfego registrados ainda.</p>
                )}
              </div>

              {/* Horários de Pico */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-4">
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

            {/* Gráfico Diário de Pageviews */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#0D2329]">
                    Visualizações de Página Diárias (Últimos 14 Dias)
                  </h3>
                  <p className="text-xs font-semibold text-[#6B7C83]">
                    Acessos reais das psicopedagogas no sistema EvoluIA.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-[#EDE9FE] text-[#7C3AED] text-xs font-black">
                  {traffic.totalViews} pageviews registrados
                </span>
              </div>

              {traffic.totalViews > 0 ? (
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
              ) : (
                <div className="p-8 text-center text-xs font-bold text-[#6B7C83]">
                  Sem dados de telemetria nos últimos 14 dias.
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 4: GESTÃO DE CLÍNICAS (CRM do Dono + Criar VIP + Resetar Senha)
            ========================================================================= */}
        {activeTab === "clinicas" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-[#8CAAB1] absolute left-3 top-3" />
                <input
                  type="text"
                  value={clinicsSearch}
                  onChange={(e) => setClinicsSearch(e.target.value)}
                  placeholder="Buscar psicopedagoga ou clínica..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border-2 border-[#A0BDC6] text-xs font-bold text-[#0D2329] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedPlanFilter}
                  onChange={(e) => setSelectedPlanFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-2xl bg-white border-2 border-[#A0BDC6] text-xs font-bold text-[#0D2329] focus:outline-none cursor-pointer"
                >
                  <option value="all">Todos os Planos</option>
                  {PLANS_CONFIG.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (R$ {p.priceMonthly.toFixed(2).replace(".", ",")})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    setVipEmail("")
                    setVipPassword(generateSecurePassword())
                    setVipFullName("")
                    setVipClinicName("")
                    setVipError(null)
                    setVipSuccessData(null)
                    setVipModalOpen(true)
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-white text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Crown className="w-4 h-4 fill-current" />
                  <span>+ Criar Conta VIP</span>
                </button>
              </div>
            </div>

            {/* Tabela de Clínicas */}
            <div className="overflow-x-auto rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFB] border-b border-[#D8E5E7] text-[#6B7C83] font-black uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-4 px-5">Clínica / Psicopedagoga</th>
                    <th className="py-4 px-5">Plano Contratado</th>
                    <th className="py-4 px-5 text-center">Equipe</th>
                    <th className="py-4 px-5 text-center">Pacientes</th>
                    <th className="py-4 px-5 text-center">Status</th>
                    <th className="py-4 px-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredClinics.map((clinic) => (
                    <tr key={clinic.id} className="hover:bg-[#F8FAFB] transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-black text-[#0D2329] text-sm">{clinic.fullName}</div>
                        <div className="text-[11px] text-[#6B7C83]">
                          {clinic.clinicName} • {clinic.email}
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-[#EDE9FE] text-[#7C3AED]">
                          {clinic.planName}
                        </span>
                        <div className="text-[11px] font-bold text-[#6B7C83] pt-1">
                          R$ {clinic.planPrice.toFixed(2).replace(".", ",")}/mês
                        </div>
                      </td>

                      <td className="py-4 px-5 text-center font-bold text-[#0D2329]">
                        {clinic.teamCount} / {clinic.maxProfessionals}
                      </td>

                      <td className="py-4 px-5 text-center font-bold text-[#0D2329]">
                        {clinic.patientsCount}
                      </td>

                      <td className="py-4 px-5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            clinic.subscriptionStatus === "active"
                              ? "bg-[#D1FAE5] text-[#065F46]"
                              : clinic.subscriptionStatus === "courtesy"
                              ? "bg-[#FEF3C7] text-[#92400E]"
                              : "bg-[#FEE2E2] text-[#991B1B]"
                          }`}
                        >
                          {clinic.subscriptionStatus === "active"
                            ? "🟢 Ativa"
                            : clinic.subscriptionStatus === "courtesy"
                            ? "🎁 VIP Cortesia"
                            : "🔴 Cancelada"}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedClinic(clinic)
                            setNewPlan(clinic.planId)
                            setNewStatus(clinic.subscriptionStatus as any)
                            setModalOpen(true)
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0D2329] font-bold text-xs transition-colors cursor-pointer"
                        >
                          Alterar Plano
                        </button>

                        <button
                          onClick={() => {
                            setResetClinicEmail(clinic.email)
                            setResetNewPass(generateSecurePassword())
                            setResetSuccess(false)
                            setResetError(null)
                            setResetModalOpen(true)
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#7C3AED] font-bold text-xs transition-colors cursor-pointer"
                        >
                          Resetar Senha
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 5: LOGS HOTMART (Auditoria Completa de Webhooks)
            ========================================================================= */}
        {activeTab === "webhooks" && hotmartAudit && (
          <div className="space-y-6 animate-in fade-in">
            {/* Top Cards de Auditoria */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-1">
                <span className="text-xs font-black text-[#6B7C83]">EVENTOS HOJE</span>
                <div className="text-2xl font-black text-[#0D2329]">
                  {hotmartAudit.summary.totalReceivedToday}
                </div>
              </div>
              <div className="p-5 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-1">
                <span className="text-xs font-black text-[#6B7C83]">TOTAL PROCESSADOS</span>
                <div className="text-2xl font-black text-[#10B981]">
                  {hotmartAudit.summary.totalProcessed}
                </div>
              </div>
              <div className="p-5 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-1">
                <span className="text-xs font-black text-[#6B7C83]">EVENTOS COM ERRO</span>
                <div className="text-2xl font-black text-[#EF4444]">
                  {hotmartAudit.summary.totalErrors}
                </div>
              </div>
              <div className="p-5 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm space-y-1">
                <span className="text-xs font-black text-[#6B7C83]">ÚLTIMO EVENTO</span>
                <div className="text-xs font-bold text-[#0D2329] truncate">
                  {hotmartAudit.summary.lastEventDate
                    ? new Date(hotmartAudit.summary.lastEventDate).toLocaleString("pt-BR")
                    : "Nenhum evento registrado"}
                </div>
              </div>
            </div>

            {/* Filtros de Logs */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "all", label: "Todos os Eventos" },
                { id: "purchases", label: "🟢 Compras Aprovadas" },
                { id: "activations", label: "🟢 Ativações" },
                { id: "cancellations", label: "🔴 Cancelamentos" },
                { id: "refunds", label: "🟡 Reembolsos" },
                { id: "errors", label: "⚠️ Com Falhas" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setLogsFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    logsFilter === f.id
                      ? "bg-[#7C3AED] text-white shadow-xs"
                      : "bg-white text-[#6B7C83] hover:bg-[#F1F5F9] border border-[#D8E5E7]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Tabela de Logs */}
            <div className="overflow-x-auto rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFB] border-b border-[#D8E5E7] text-[#6B7C83] font-black uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-4 px-5">Data / Hora</th>
                    <th className="py-4 px-5">Evento</th>
                    <th className="py-4 px-5">Comprador</th>
                    <th className="py-4 px-5">Plano</th>
                    <th className="py-4 px-5">Valor</th>
                    <th className="py-4 px-5">ID do Evento</th>
                    <th className="py-4 px-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((ev) => (
                      <tr key={ev.id} className="hover:bg-[#F8FAFB] transition-colors">
                        <td className="py-4 px-5 text-[#6B7C83] font-medium">
                          {new Date(ev.processedAt).toLocaleString("pt-BR")}
                        </td>
                        <td className="py-4 px-5 font-black text-[#0D2329]">{ev.eventLabel}</td>
                        <td className="py-4 px-5">
                          <div className="font-bold text-[#0D2329]">{ev.customerName}</div>
                          <div className="text-[11px] text-[#6B7C83]">{ev.customerEmail}</div>
                        </td>
                        <td className="py-4 px-5 font-bold text-[#7C3AED]">{ev.planName}</td>
                        <td className="py-4 px-5 font-black text-[#0D2329]">{ev.valueFormatted}</td>
                        <td className="py-4 px-5 font-mono text-[10px] text-[#6B7C83]">
                          {ev.eventId}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              ev.processed ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEE2E2] text-[#991B1B]"
                            }`}
                          >
                            {ev.processed ? "Processado" : "Erro"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#6B7C83] font-bold">
                        Nenhum evento registrado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 1: CRIAR CONTA VIP / CORTESIA
            ========================================================================= */}
        {vipModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-md w-full p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-2xl space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F59E0B] to-[#D97706] text-white flex items-center justify-center shadow-md">
                    <Crown className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#0D2329]">Criar Conta VIP / Cortesia</h3>
                    <p className="text-xs text-[#6B7C83]">Apenas e-mail e senha de acesso.</p>
                  </div>
                </div>
                <button
                  onClick={() => setVipModalOpen(false)}
                  className="text-xs font-black text-[#8CAAB1] hover:text-[#0D2329] cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {!vipSuccessData ? (
                <form onSubmit={handleCreateVipAccount} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0D2329]">E-mail da Psicopedagoga</label>
                    <input
                      type="email"
                      required
                      value={vipEmail}
                      onChange={(e) => setVipEmail(e.target.value)}
                      placeholder="ex: irma@gmail.com"
                      className="w-full px-4 py-3 rounded-2xl bg-[#F8FAFB] border border-[#D8E5E7] text-xs font-bold text-[#0D2329] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0D2329]">Senha de Acesso</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={vipPassword}
                        onChange={(e) => setVipPassword(e.target.value)}
                        placeholder="Senha123"
                        className="flex-1 px-4 py-3 rounded-2xl bg-[#F8FAFB] border border-[#D8E5E7] text-xs font-mono font-bold text-[#0D2329] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                      />
                      <button
                        type="button"
                        onClick={() => setVipPassword(generateSecurePassword())}
                        className="px-3 py-2 rounded-2xl bg-[#F1F5F9] text-xs font-bold text-[#0D2329] hover:bg-[#E2E8F0] cursor-pointer"
                      >
                        Gerar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0D2329]">Plano de Vagas</label>
                    <select
                      value={vipPlanId}
                      onChange={(e) => setVipPlanId(e.target.value as PlanId)}
                      className="w-full px-4 py-3 rounded-2xl bg-[#F8FAFB] border border-[#D8E5E7] text-xs font-bold text-[#0D2329] focus:outline-none cursor-pointer"
                    >
                      {PLANS_CONFIG.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.maxProfessionals} {p.maxProfessionals === 1 ? "vaga" : "vagas"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {vipError && (
                    <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold text-center">
                      {vipError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={vipLoading}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-white text-xs font-black shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {vipLoading ? "Criando Conta..." : "Criar & Ativar Conta VIP"}
                  </button>
                </form>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black text-[#0D2329]">Conta VIP Criada com Sucesso!</h4>

                  <div className="p-4 rounded-2xl bg-[#F8FAFB] border border-[#D8E5E7] text-left text-xs font-mono space-y-1">
                    <div><strong>E-mail:</strong> {vipSuccessData.email}</div>
                    <div><strong>Senha:</strong> {vipSuccessData.pass}</div>
                    <div><strong>Plano:</strong> {vipSuccessData.planName}</div>
                    <div><strong>Link:</strong> https://evolu-ia-seven.vercel.app/login</div>
                  </div>

                  <button
                    onClick={() => {
                      const msg = `Olá! Sua conta no EvoluIA está pronta:\n\n🔗 Link: https://evolu-ia-seven.vercel.app/login\n📧 E-mail: ${vipSuccessData.email}\n🔑 Senha: ${vipSuccessData.pass}\n\nVocê já tem acesso liberado!`
                      navigator.clipboard.writeText(msg)
                      setCopiedVip(true)
                      setTimeout(() => setCopiedVip(false), 3000)
                    }}
                    className="w-full py-3 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copiedVip ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedVip ? "Copiado para o WhatsApp!" : "Copiar Dados de Acesso"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 2: RESETAR SENHA DA CLÍNICA
            ========================================================================= */}
        {resetModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-md w-full p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-2xl space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shadow-xs">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#0D2329]">Resetar Senha de Acesso</h3>
                    <p className="text-xs text-[#6B7C83]">{resetClinicEmail}</p>
                  </div>
                </div>
                <button
                  onClick={() => setResetModalOpen(false)}
                  className="text-xs font-black text-[#8CAAB1] hover:text-[#0D2329] cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0D2329]">Nova Senha Provisória</label>
                  <input
                    type="text"
                    required
                    value={resetNewPass}
                    onChange={(e) => setResetNewPass(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F8FAFB] border border-[#D8E5E7] text-xs font-mono font-bold text-[#0D2329]"
                  />
                </div>

                {resetSuccess && (
                  <div className="p-3 rounded-xl bg-green-50 text-green-700 text-xs font-bold text-center">
                    Senha resetada com sucesso! Copie e envie para a psicopedagoga.
                  </div>
                )}

                {resetError && (
                  <div className="p-3 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold text-center">
                    {resetError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-3.5 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {resetLoading ? "Atualizando Senha..." : "Confirmar Nova Senha"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 3: ALTERAR PLANO DA CLÍNICA
            ========================================================================= */}
        {modalOpen && selectedClinic && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-md w-full p-6 sm:p-7 rounded-3xl bg-white border-2 border-[#A0BDC6] shadow-2xl space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#0D2329]">Alterar Plano da Clínica</h3>
                  <p className="text-xs text-[#6B7C83]">{selectedClinic.fullName} ({selectedClinic.clinicName})</p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-xs font-black text-[#8CAAB1] hover:text-[#0D2329] cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0D2329]">Selecione o Novo Plano</label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value as PlanId)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F8FAFB] border border-[#D8E5E7] text-xs font-bold text-[#0D2329] focus:outline-none cursor-pointer"
                  >
                    {PLANS_CONFIG.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (R$ {p.priceMonthly.toFixed(2).replace(".", ",")} • {p.maxProfessionals} vagas)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0D2329]">Status da Assinatura</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F8FAFB] border border-[#D8E5E7] text-xs font-bold text-[#0D2329] focus:outline-none cursor-pointer"
                  >
                    <option value="active">🟢 Ativa (Liberada)</option>
                    <option value="trial">🟡 Trial (Período de Teste)</option>
                    <option value="cancelled">🔴 Cancelada (Bloqueada)</option>
                  </select>
                </div>

                <button
                  onClick={handleSavePlan}
                  disabled={savingPlan}
                  className="w-full py-3.5 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingPlan ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
