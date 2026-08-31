import { useState, useMemo } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
  Brain,
  Sparkles,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  MessageCircle,
  FileText,
  Users,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Star,
  Lock,
  Play,
  Calendar,
  DollarSign,
  HeartHandshake,
  Smartphone,
  ChevronRight,
  TrendingUp,
  Award,
} from "lucide-react"
import { PLANS_CONFIG, type PlanId } from "@/lib/plans"
import { useAuthStore } from "@/store/authStore"

export function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // State
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly")
  const [interactiveTab, setInteractiveTab] = useState<"laudo" | "whatsapp" | "prontuario" | "financeiro">("laudo")
  const [patientsCount, setPatientsCount] = useState<number>(15)
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({ 0: true })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // ROI Calculator Calculations
  const hoursSavedPerMonth = useMemo(() => {
    // ~1.5h saved per patient per month on paperwork + reports + reminders
    return Math.round(patientsCount * 1.5)
  }, [patientsCount])

  const monetaryValueRecovered = useMemo(() => {
    // Average session value ~R$ 120/hour
    return hoursSavedPerMonth * 120
  }, [hoursSavedPerMonth])

  function toggleFaq(index: number) {
    setFaqOpen((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  return (
    <div className="min-h-screen bg-[#091B20] text-[#F8FAFB] font-sans antialiased selection:bg-[#7C3AED] selection:text-white overflow-x-hidden">
      {/* =========================================================================
          1. HEADER / NAVBAR FIXA GLASSMORPHISM
          ========================================================================= */}
      <header className="sticky top-0 z-50 bg-[#091B20]/80 backdrop-blur-xl border-b border-white/10 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#7C3AED] flex items-center justify-center text-white shadow-[0_0_20px_rgba(124,58,237,0.5)] group-hover:scale-105 transition-all">
              <Brain className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-black text-xl sm:text-2xl tracking-tight leading-none text-white">
                Evolu<span className="text-[#A855F7]">IA</span>
              </span>
              <p className="text-[10px] font-bold text-[#8CAAB1] tracking-wider uppercase">
                Gestão Psicopedagógica
              </p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-[#D8E5E7]">
            <a href="#recursos" className="hover:text-[#A855F7] transition-colors">
              Recursos
            </a>
            <a href="#comparativo" className="hover:text-[#A855F7] transition-colors">
              Antes vs Depois
            </a>
            <a href="#simulador" className="hover:text-[#A855F7] transition-colors">
              Calculadora
            </a>
            <a href="#planos" className="hover:text-[#A855F7] transition-colors">
              Planos & Preços
            </a>
            <a href="#faq" className="hover:text-[#A855F7] transition-colors">
              Dúvidas
            </a>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2.5 rounded-2xl bg-[#193F4A] hover:bg-[#235866] text-white text-xs font-black border border-white/10 transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                Ir para o Consultório →
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2.5 rounded-2xl text-xs font-black text-[#D8E5E7] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                Já sou cliente / Entrar
              </button>
            )}

            <a
              href="#planos"
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6366F1] hover:from-[#6D28D9] hover:to-[#4F46E5] text-white text-xs font-black shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Testar 14 Dias Grátis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-white"
          >
            <div className="w-5 h-4 flex flex-col justify-between">
              <span className="w-full h-0.5 bg-white rounded-full" />
              <span className="w-full h-0.5 bg-white rounded-full" />
              <span className="w-full h-0.5 bg-white rounded-full" />
            </div>
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-[#0D2329] border-b border-white/10 px-4 py-6 space-y-4 animate-in fade-in slide-in-from-top-2">
            <nav className="flex flex-col gap-3 text-sm font-bold text-[#D8E5E7]">
              <a href="#recursos" onClick={() => setMobileMenuOpen(false)} className="py-1">
                Recursos
              </a>
              <a href="#comparativo" onClick={() => setMobileMenuOpen(false)} className="py-1">
                Antes vs Depois
              </a>
              <a href="#simulador" onClick={() => setMobileMenuOpen(false)} className="py-1">
                Calculadora de Economia
              </a>
              <a href="#planos" onClick={() => setMobileMenuOpen(false)} className="py-1">
                Planos & Preços
              </a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-1">
                Perguntas Frequentes
              </a>
            </nav>
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              <button
                onClick={() => navigate("/login")}
                className="w-full py-3 rounded-2xl bg-white/5 text-white text-xs font-bold text-center"
              >
                Já sou cliente / Entrar
              </button>
              <a
                href="#planos"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 rounded-2xl bg-[#7C3AED] text-white text-xs font-black text-center shadow-md"
              >
                Testar 14 Dias Grátis
              </a>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          2. HERO SECTION — O IMPACTO EM 3 SEGUNDOS
          ========================================================================= */}
      <section className="relative pt-12 pb-24 lg:pt-20 lg:pb-32 overflow-hidden">
        {/* Background Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[400px] bg-gradient-to-tr from-[#7C3AED]/25 to-[#00C48C]/15 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-12 left-10 w-72 h-72 bg-[#6366F1]/15 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10 text-center">
          {/* Top Pill / Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/15 backdrop-blur-md shadow-inner text-xs font-black text-[#A855F7] animate-pulse">
            <Sparkles className="w-4 h-4 text-[#A855F7]" />
            <span>O 1º Ecossistema com Inteligência Artificial para Psicopedagogia</span>
          </div>

          {/* Main Headline */}
          <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-white">
              Chega de perder seus domingos digitando{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] via-[#C084FC] to-[#38BDF8]">
                laudos e cadernos.
              </span>
            </h1>

            <p className="text-base sm:text-xl font-medium text-[#94A3B8] max-w-2xl mx-auto leading-relaxed">
              O <strong className="text-white">EvoluIA</strong> organiza cada paciente, gera relatórios
              clínicos com IA em segundos e cobra mensalidades no WhatsApp em 1 clique.
              <br className="hidden sm:block" />
              Recupere seu tempo livre e valorize o seu consultório.
            </p>
          </div>

          {/* Primary CTA & Trust Proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a
              href="#planos"
              className="w-full sm:w-auto px-8 py-4 rounded-3xl bg-gradient-to-r from-[#7C3AED] via-[#6D28D9] to-[#6366F1] hover:from-[#6D28D9] hover:to-[#4F46E5] text-white text-base font-black shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_40px_rgba(124,58,237,0.7)] transition-all active:scale-95 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Começar Teste de 14 Dias Grátis</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>

            <a
              href="#simulador"
              className="w-full sm:w-auto px-6 py-4 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/15 text-[#D8E5E7] hover:text-white text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4 text-[#38BDF8]" />
              <span>Simular Horas Economizadas</span>
            </a>
          </div>

          {/* Social Proof Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-semibold text-[#94A3B8]">
            <div className="flex items-center gap-1.5">
              <div className="flex text-[#F59E0B]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
              <span className="text-white font-bold">5.0</span> • Avaliado por Psicopedagogas
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <span>Criptografia de Nível Clínico & Sigilo Total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-[#38BDF8]" />
              <span>Sem Fidelidade • Cancele com 1 Clique</span>
            </div>
          </div>

          {/* =========================================================================
              LIVE INTERACTIVE APP PREVIEW MOCKUP (MacBook/iPad Style)
              ========================================================================= */}
          <div className="pt-10 max-w-5xl mx-auto">
            <div className="rounded-3xl sm:rounded-[36px] bg-gradient-to-b from-white/15 via-white/5 to-transparent p-2 sm:p-3.5 shadow-2xl border border-white/20 backdrop-blur-2xl">
              <div className="rounded-2xl sm:rounded-[30px] bg-[#0D2329] border border-white/10 overflow-hidden text-left">
                {/* Mockup Top Window Bar */}
                <div className="px-5 py-4 bg-[#091B20] border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
                    <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                    <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                    <span className="text-xs font-bold text-[#8CAAB1] ml-2 hidden sm:inline">
                      EvoluIA • Demonstração Interativa
                    </span>
                  </div>

                  {/* Interactive Tab Switcher */}
                  <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 text-xs font-bold">
                    {[
                      { id: "laudo", label: "🤖 Laudo com IA", icon: Sparkles },
                      { id: "whatsapp", label: "📲 WhatsApp & PIX", icon: MessageCircle },
                      { id: "prontuario", label: "📋 Prontuário & PEI", icon: FileText },
                      { id: "financeiro", label: "💵 Financeiro", icon: DollarSign },
                    ].map((tab) => {
                      const Icon = tab.icon
                      const isActive = interactiveTab === tab.id
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setInteractiveTab(tab.id as any)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                            isActive
                              ? "bg-[#7C3AED] text-white shadow-md font-black scale-102"
                              : "text-[#8CAAB1] hover:text-white"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{tab.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Mockup Interactive Body */}
                <div className="p-6 sm:p-8 min-h-[380px] bg-[#0B1E24]">
                  {/* 1. Tab Laudo IA */}
                  {interactiveTab === "laudo" && (
                    <div className="space-y-5 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-black">
                            🤖
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white">
                              Gerador de Laudos & Devolutivas com IA Gemini 2.0
                            </h4>
                            <p className="text-xs text-[#8CAAB1]">
                              Transforma 3 tópicos anotados na sessão em um documento técnico completo.
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30">
                          ⚡ Gerado em 2.4 segundos
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* Entrada / Anotações */}
                        <div className="p-4 rounded-2xl bg-[#08171B] border border-white/10 space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-wider text-[#8CAAB1]">
                            Suas Anotações Rápidas (Entrada):
                          </p>
                          <p className="text-slate-300 font-mono text-[11px] leading-relaxed">
                            - Paciente Arthur, 8 anos, queixa de dispersão na leitura.
                            <br />
                            - Apresentou melhora na discriminação fonológica com jogos lúdicos.
                            <br />- Recomendado manter 2x/semana e orientação à professora.
                          </p>
                        </div>

                        {/* Saída IA Formatada */}
                        <div className="p-4 rounded-2xl bg-[#132A32] border border-[#7C3AED]/40 space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-wider text-[#A855F7] flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Relatório Psicopedagógico Gerado (Saída):
                          </p>
                          <p className="text-white font-medium text-[11px] leading-relaxed">
                            <strong>1. Síntese do Desenvolvimento:</strong> O paciente evidenciou
                            avanços consistentes no processamento auditivo e decodificação grafema-fonema...
                            <br />
                            <strong>2. Recomendações Pedagógicas:</strong> Sugere-se adaptação curricular
                            com pausas estratégicas e reforço positivo em ambiente escolar.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Tab WhatsApp */}
                  {interactiveTab === "whatsapp" && (
                    <div className="space-y-5 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#D1FAE5] text-[#065F46] flex items-center justify-center font-black">
                            💬
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white">
                              Automação de WhatsApp em 1 Toque
                            </h4>
                            <p className="text-xs text-[#8CAAB1]">
                              Lembretes de sessão e cobrança profissional com a sua chave PIX.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="max-w-md mx-auto p-4 rounded-2xl bg-[#075E54]/20 border border-[#25D366]/30 space-y-3">
                        <div className="p-3.5 rounded-2xl bg-[#DCF8C6] text-[#075E54] text-xs font-medium space-y-1.5 shadow-sm">
                          <p className="font-bold text-[11px] text-[#075E54]">
                            📱 Mensagem Automática Formatada:
                          </p>
                          <p className="leading-relaxed">
                            Olá, tudo bem? 🌟 Passando para confirmar a sessão psicopedagógica do{" "}
                            <strong>Arthur</strong> hoje às <strong>14:00</strong>.
                            <br />
                            Chave PIX (Celular): <strong>17 99758-0663</strong>. Qualquer dúvida estamos à disposição!
                          </p>
                        </div>
                        <div className="flex justify-end">
                          <span className="px-3 py-1 rounded-xl bg-[#25D366] text-white text-[10px] font-black flex items-center gap-1 shadow-sm">
                            <CheckCircle2 className="w-3 h-3" /> Enviado com 1 clique pelo EvoluIA
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Tab Prontuário */}
                  {interactiveTab === "prontuario" && (
                    <div className="space-y-5 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center font-black">
                            📋
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white">
                              Prontuário Clínico & Linha do Tempo
                            </h4>
                            <p className="text-xs text-[#8CAAB1]">
                              Histórico escolar, queixas da família, plano de intervenção e evolução.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="p-3.5 rounded-2xl bg-[#08171B] border border-white/10 space-y-1">
                          <span className="text-[10px] font-bold text-[#8CAAB1]">HISTÓRICO</span>
                          <p className="font-black text-white">Anamnese Completa</p>
                          <p className="text-[11px] text-[#94A3B8]">Marcos de desenvolvimento registrados</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[#08171B] border border-white/10 space-y-1">
                          <span className="text-[10px] font-bold text-[#8CAAB1]">PLANO DE ENSINO</span>
                          <p className="font-black text-white">PEI Integrado</p>
                          <p className="text-[11px] text-[#94A3B8]">Metas e objetivos por período</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[#08171B] border border-white/10 space-y-1">
                          <span className="text-[10px] font-bold text-[#8CAAB1]">DOCUMENTOS</span>
                          <p className="font-black text-white">Devolutivas em PDF</p>
                          <p className="text-[11px] text-[#94A3B8]">Impressão com cabeçalho e logo</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. Tab Financeiro */}
                  {interactiveTab === "financeiro" && (
                    <div className="space-y-5 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-black">
                            💵
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white">
                              Controle Financeiro Sem Planilhas
                            </h4>
                            <p className="text-xs text-[#8CAAB1]">
                              Baixa em PIX, Cartão e Dinheiro com recibos gerados na hora.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3.5 rounded-2xl bg-[#08171B] border border-white/10">
                          <p className="text-[10px] text-[#8CAAB1] font-bold">RECEBIDO NO MÊS</p>
                          <p className="text-lg font-black text-[#10B981] mt-0.5">R$ 6.840,00</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[#08171B] border border-white/10">
                          <p className="text-[10px] text-[#8CAAB1] font-bold">PENDENTE</p>
                          <p className="text-lg font-black text-[#F59E0B] mt-0.5">R$ 480,00</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[#08171B] border border-white/10">
                          <p className="text-[10px] text-[#8CAAB1] font-bold">FORMA FAVORITA</p>
                          <p className="text-lg font-black text-[#38BDF8] mt-0.5">92% PIX</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-[#08171B] border border-white/10">
                          <p className="text-[10px] text-[#8CAAB1] font-bold">INADIMPLÊNCIA</p>
                          <p className="text-lg font-black text-[#34D399] mt-0.5">0% (Zero)</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. ANTES VS DEPOIS — O CONTRASTE BRUTAL QUE VENDE
          ========================================================================= */}
      <section id="comparativo" className="py-20 lg:py-32 bg-[#08171B] border-y border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-black tracking-widest text-[#7C3AED] uppercase">
              A Diferença é Brutal
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Como é sua rotina hoje vs com o EvoluIA
            </h2>
            <p className="text-sm sm:text-base text-[#94A3B8] font-medium">
              Você estudou anos para transformar a aprendizagem de crianças, não para ser escrava de burocracia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            {/* Lado 1: Sem EvoluIA */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#120B16] border-2 border-red-500/20 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center font-black text-lg">
                  ❌
                </div>
                <div>
                  <h3 className="text-lg font-black text-red-200">Sem o EvoluIA (O Jeito Antigo)</h3>
                  <p className="text-xs text-red-400/80">Desgaste mental, perda de tempo e estresse</p>
                </div>
              </div>

              <ul className="space-y-4 text-xs font-medium text-red-200/90">
                <li className="flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Domingos perdidos:</strong> 4 a 6 horas redigindo laudos, devolutivas e relatórios do zero.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Cadernos e papéis espalhados:</strong> Risco de perder anotações importantes da evolução do paciente.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Cobrança constrangedora:</strong> Ficar mandando mensagens manuais para os pais cobrando mensalidades atrasadas.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Faltas surpresa:</strong> Famílias esquecendo a sessão porque você não teve tempo de mandar lembrete de manhã.
                  </span>
                </li>
              </ul>
            </div>

            {/* Lado 2: Com EvoluIA */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0D2A24] border-2 border-[#10B981]/40 shadow-[0_0_30px_rgba(16,185,129,0.15)] space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#10B981]/20 text-[#34D399] flex items-center justify-center font-black text-lg">
                  🟢
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#D1FAE5]">Com o EvoluIA (O Consultório Moderno)</h3>
                  <p className="text-xs text-[#34D399]">Leveza, autoridade máxima e fins de semana livres</p>
                </div>
              </div>

              <ul className="space-y-4 text-xs font-medium text-[#D1FAE5]/95">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                  <span>
                    <strong>Laudos com IA em 30 segundos:</strong> Estrutura técnica impecável, terminologia pedagógica correta e exportação em PDF.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                  <span>
                    <strong>Prontuário 100% Digital & Seguro:</strong> Acesse a história completa de qualquer criança em 2 segundos pelo celular ou notebook.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                  <span>
                    <strong>Cobrança PIX Automática e Elegante:</strong> Mensagem profissional pré-formatada sem vergonha e com alta taxa de pagamento pontual.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                  <span>
                    <strong>Agenda & Lembretes no WhatsApp:</strong> Pais confirmando presenças e agenda sempre cheia e organizada.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. OS 4 SUPERPODERES DO EVOLUIA
          ========================================================================= */}
      <section id="recursos" className="py-20 lg:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-black tracking-widest text-[#7C3AED] uppercase">
              Tudo o Que Seu Espaço Precisa
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Os 4 Pilares da Sua Nova Rotina Clínica
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pilar 1 */}
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-[#7C3AED] transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-white">IA de Laudos & Devolutivas</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Escreva pequenos tópicos da sessão e a inteligência artificial gera um relatório técnico,
                ético e fundamentado pronto para impressão.
              </p>
            </div>

            {/* Pilar 2 */}
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-[#10B981] transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-[#D1FAE5] text-[#065F46] flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-white">WhatsApp & PIX com 1 Toque</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Envie confirmações de horário e cobranças carinhosas com a sua chave PIX diretamente
                para os responsáveis sem nenhum constrangimento.
              </p>
            </div>

            {/* Pilar 3 */}
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-[#38BDF8] transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-white">Prontuário & Linha do Tempo</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Histórico escolar, queixas iniciais, evolução atendimento por atendimento e anexos em um só lugar
                protegido por senha.
              </p>
            </div>

            {/* Pilar 4 */}
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-[#F59E0B] transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-white">Gestão de Equipe & Vagas</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Seu consultório pode crescer: adicione 2, 3, 4 ou mais psicopedagogas compartilhando a mesma clínica
                com controle total de acessos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. SIMULADOR INTERATIVO DE ECONOMIA DE TEMPO
          ========================================================================= */}
      <section id="simulador" className="py-20 lg:py-32 bg-gradient-to-b from-[#08171B] to-[#091B20] border-t border-white/10 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-black tracking-widest text-[#38BDF8] uppercase">
              Calculadora de Liberdade
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Quanto tempo você vai recuperar por mês?
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8]">
              Arraste a barra para ver o impacto direto do EvoluIA na sua rotina e na sua renda.
            </p>
          </div>

          <div className="p-6 sm:p-10 rounded-3xl bg-white/5 border-2 border-white/15 backdrop-blur-xl space-y-8 shadow-2xl">
            {/* Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#D8E5E7]">Quantos pacientes você atende na semana?</span>
                <span className="text-2xl font-black text-[#A855F7] bg-[#7C3AED]/20 px-4 py-1 rounded-2xl border border-[#7C3AED]/40">
                  {patientsCount} pacientes
                </span>
              </div>

              <input
                type="range"
                min="3"
                max="40"
                value={patientsCount}
                onChange={(e) => setPatientsCount(Number(e.target.value))}
                className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#7C3AED]"
              />

              <div className="flex justify-between text-[11px] text-[#6B7C83] font-bold">
                <span>3 pacientes (Início)</span>
                <span>20 pacientes</span>
                <span>40 pacientes (Clínica Cheia)</span>
              </div>
            </div>

            {/* Resultado do Cálculo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div className="p-5 rounded-2xl bg-[#0D2A24] border border-[#10B981]/40 text-center sm:text-left space-y-1">
                <span className="text-[11px] font-black uppercase text-[#34D399] tracking-wider">
                  ⏱️ Tempo Livre Recuperado
                </span>
                <div className="text-3xl sm:text-4xl font-black text-white">
                  {hoursSavedPerMonth} horas <span className="text-sm text-[#34D399]">/mês</span>
                </div>
                <p className="text-[11px] text-[#A7F3D0]">
                  São cerca de <strong>{Math.round(hoursSavedPerMonth / 8)} dias inteiros</strong> de folga a mais para você todo mês.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#1E1233] border border-[#7C3AED]/40 text-center sm:text-left space-y-1">
                <span className="text-[11px] font-black uppercase text-[#C084FC] tracking-wider">
                  💰 Valor do Seu Tempo Economizado
                </span>
                <div className="text-3xl sm:text-4xl font-black text-white">
                  R$ {monetaryValueRecovered.toLocaleString("pt-BR")},00
                </div>
                <p className="text-[11px] text-[#DDD6FE]">
                  Tempo que você pode usar para abrir novos horários ou descansar com sua família.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. TABELA DE PLANOS & PREÇOS (HOTMART READY)
          ========================================================================= */}
      <section id="planos" className="py-20 lg:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-xs font-black tracking-widest text-[#7C3AED] uppercase">
              Investimento Transparente
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Planos que Cabem no Bolso do Seu Consultório
            </h2>
            <p className="text-sm text-[#94A3B8] font-medium">
              Todos os planos incluem <strong>14 dias de teste grátis</strong> sem cobrança imediata no cartão.
            </p>

            {/* Monthly / Yearly Toggle */}
            <div className="pt-4 flex items-center justify-center gap-3">
              <span className={`text-xs font-bold ${billingPeriod === "monthly" ? "text-white" : "text-[#6B7C83]"}`}>
                Mensal
              </span>
              <button
                onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "yearly" : "monthly")}
                className="w-14 h-7 bg-[#7C3AED] rounded-full p-1 transition-colors relative cursor-pointer"
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    billingPeriod === "yearly" ? "translate-x-7" : "translate-x-0"
                  }`}
                />
              </button>
              <span className={`text-xs font-bold flex items-center gap-1 ${billingPeriod === "yearly" ? "text-white" : "text-[#6B7C83]"}`}>
                <span>Anual</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#10B981] text-white">
                  2 Meses Grátis 🎁
                </span>
              </span>
            </div>
          </div>

          {/* Cards dos 5 Planos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch">
            {PLANS_CONFIG.map((plan) => {
              const isPopular = plan.isPopular
              const price = billingPeriod === "monthly" ? plan.priceMonthly : Math.round(plan.priceMonthly * 10 / 12)

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl p-5 flex flex-col justify-between transition-all border-2 ${
                    isPopular
                      ? "bg-gradient-to-b from-[#1A1033] to-[#0D2329] border-[#7C3AED] shadow-[0_0_30px_rgba(124,58,237,0.3)] scale-102"
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  }`}
                >
                  {/* Badge Mais Escolhido */}
                  {isPopular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#10B981] text-white text-[10px] font-black uppercase tracking-wider shadow-md whitespace-nowrap">
                      Mais Escolhido ⭐
                    </span>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-black text-white">{plan.name}</h3>
                      <p className="text-[11px] text-[#94A3B8] mt-1 leading-snug">{plan.description}</p>
                    </div>

                    {/* Preço */}
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">
                          R$ {price.toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-[10px] font-bold text-[#8CAAB1]">/mês</span>
                      </div>
                      <p className="text-[10px] font-black text-[#A855F7] mt-1 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{plan.maxProfessionals === 1 ? "1 Psicopedagoga" : `Até ${plan.maxProfessionals} Profissionais`}</span>
                      </p>
                    </div>

                    {/* Recursos */}
                    <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-white/10">
                      {plan.features.slice(0, 4).map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Botão de Compra / Teste */}
                  <div className="pt-6">
                    <a
                      href={plan.hotmartCheckoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full py-3 rounded-2xl text-xs font-black shadow-md flex items-center justify-center gap-1 transition-all active:scale-95 text-center cursor-pointer ${
                        isPopular
                          ? "bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-[0_0_20px_rgba(124,58,237,0.5)]"
                          : "bg-white/10 hover:bg-white/20 text-white"
                      }`}
                    >
                      <span>Testar 14 Dias Grátis</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                    <p className="text-[9px] text-[#6B7C83] text-center mt-2 font-bold">
                      Zero cobrança hoje • Cancele quando quiser
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. GARANTIA BLINDADA DE RISCO ZERO (14D + 7D)
          ========================================================================= */}
      <section className="py-16 bg-[#08171B] border-y border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-[#10B981]/20 text-[#34D399] flex items-center justify-center mx-auto shadow-lg border border-[#10B981]/30">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Garantia Blindada de Risco Zero: 21 Dias de Segurança Total
          </h2>

          <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed max-w-2xl mx-auto">
            Você tem <strong>14 dias de teste grátis</strong> sem pagar nada. Se decidir continuar, ainda tem mais{" "}
            <strong>7 dias de garantia incondicional pela Hotmart</strong>. Se o EvoluIA não economizar o seu tempo
            e organizar o seu consultório, devolvemos 100% do seu dinheiro. Sem perguntas.
          </p>
        </div>
      </section>

      {/* =========================================================================
          8. FAQ INTERATIVO (QUEBRA DE OBJEÇÕES)
          ========================================================================= */}
      <section id="faq" className="py-20 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-black tracking-widest text-[#7C3AED] uppercase">
              Tire Suas Dúvidas
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "Como funcionam os 14 dias de teste grátis?",
                a: "Você cria sua conta em 1 minuto e tem acesso total a todas as funcionalidades (IA de Laudos, Agenda, Prontuário e WhatsApp). Nenhum valor é cobrado no primeiro dia. Se não gostar, pode cancelar a qualquer momento sem pagar nada.",
              },
              {
                q: "Preciso instalar algum programa no meu computador?",
                a: "Não! O EvoluIA funciona 100% em nuvem. Você pode acessar de qualquer celular, tablet, notebook ou computador através do navegador, de onde estiver.",
              },
              {
                q: "Os dados dos meus pacientes e das crianças estão seguros?",
                a: "Sim, segurança absoluta. Utilizamos o banco de dados Supabase com criptografia de nível bancário e isolamento rigoroso (Row Level Security). Nenhuma outra psicopedagoga ou terceiro tem acesso aos seus prontuários.",
              },
              {
                q: "A inteligência artificial substitui a psicopedagoga?",
                a: "Jamais! A IA é a sua assistente pessoal que digita e estrutura o laudo com velocidade extrema, mas você sempre tem controle total para editar, ajustar e assinar o documento final.",
              },
              {
                q: "Posso cancelar quando quiser?",
                a: "Sim! Não temos contrato de fidelidade e nenhuma multa. Se quiser cancelar, basta 1 clique no painel da Hotmart ou nas configurações da sua conta.",
              },
            ].map((faq, index) => {
              const isOpen = !!faqOpen[index]
              return (
                <div
                  key={index}
                  className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-black text-sm text-white cursor-pointer hover:bg-white/5"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#A855F7] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#8CAAB1] shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-[#94A3B8] leading-relaxed border-t border-white/5 pt-3 animate-in fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. FINAL CALL TO ACTION (CONVERSÃO MÁXIMA)
          ========================================================================= */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-tr from-[#7C3AED]/30 via-[#6366F1]/20 to-[#091B20] border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Pronta para recuperar seus domingos e transformar seu consultório?
          </h2>

          <p className="text-sm sm:text-base text-[#D8E5E7] max-w-xl mx-auto">
            Junte-se a psicopedagogas que economizam até 15 horas de trabalho por semana com o EvoluIA.
          </p>

          <div className="pt-2">
            <a
              href="#planos"
              className="inline-flex items-center gap-2 px-9 py-4 rounded-3xl bg-white text-[#0D2329] hover:bg-[#F8FAFB] text-base font-black shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 transition-all active:scale-95 cursor-pointer"
            >
              <span>Começar Meus 14 Dias Grátis</span>
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* =========================================================================
          10. RODAPÉ INSTITUCIONAL & LEGAL
          ========================================================================= */}
      <footer className="bg-[#061216] border-t border-white/10 py-12 text-xs text-[#6B7C83]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#7C3AED] flex items-center justify-center text-white">
              <Brain className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="font-black text-sm text-white">
              Evolu<span className="text-[#A855F7]">IA</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 font-bold text-[#8CAAB1]">
            <Link to="/login" className="hover:text-white transition-colors">
              Acessar Consultório (Login)
            </Link>
            <a href="#planos" className="hover:text-white transition-colors">
              Planos & Vagas
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              Suporte & Dúvidas
            </a>
          </div>

          <p className="text-[11px]">
            © {new Date().getFullYear()} EvoluIA. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
