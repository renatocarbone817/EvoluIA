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
  Check,
  Copy,
  Printer,
  CalendarCheck,
  MousePointerClick,
  SlidersHorizontal,
  HelpCircle,
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
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({ 0: true, 1: true })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // ROI Calculator Calculations
  const hoursSavedPerMonth = useMemo(() => {
    return Math.round(patientsCount * 1.5)
  }, [patientsCount])

  const monetaryValueRecovered = useMemo(() => {
    return hoursSavedPerMonth * 120
  }, [hoursSavedPerMonth])

  function toggleFaq(index: number) {
    setFaqOpen((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased selection:bg-[#7C3AED] selection:text-white overflow-x-hidden">
      {/* =========================================================================
          1. HEADER / NAVBAR FIXA
          ========================================================================= */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b-2 border-slate-200 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#7C3AED] flex items-center justify-center text-white shadow-md shadow-purple-500/25 group-hover:scale-105 transition-all">
              <Brain className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-black text-xl sm:text-2xl tracking-tight leading-none text-[#0F172A]">
                Evolu<span className="text-[#7C3AED]">IA</span>
              </span>
              <p className="text-[10px] font-extrabold text-[#64748B] tracking-wider uppercase">
                Gestão Psicopedagógica
              </p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-[#334155]">
            <a href="#recursos" className="hover:text-[#7C3AED] transition-colors">
              Recursos
            </a>
            <a href="#comparativo" className="hover:text-[#7C3AED] transition-colors">
              Antes vs Depois
            </a>
            <a href="#simulador" className="hover:text-[#7C3AED] transition-colors">
              Calculadora
            </a>
            <a href="#planos" className="hover:text-[#7C3AED] transition-colors">
              Planos & Preços
            </a>
            <a href="#faq" className="hover:text-[#7C3AED] transition-colors">
              Dúvidas
            </a>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2.5 rounded-2xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-xs font-black border-2 border-slate-300 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                Ir para o Consultório →
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-[#475569] hover:text-[#0F172A] hover:bg-slate-100 transition-all cursor-pointer"
              >
                Já sou cliente / Entrar
              </button>
            )}

            <a
              href="#planos"
              className="px-5 py-2.5 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black shadow-md shadow-purple-500/25 hover:shadow-lg hover:shadow-purple-500/35 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Testar 14 Dias Grátis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 rounded-xl bg-slate-100 border-2 border-slate-300 text-slate-800"
          >
            <div className="w-5 h-4 flex flex-col justify-between">
              <span className="w-full h-0.5 bg-slate-800 rounded-full" />
              <span className="w-full h-0.5 bg-slate-800 rounded-full" />
              <span className="w-full h-0.5 bg-slate-800 rounded-full" />
            </div>
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white border-b-2 border-slate-200 px-4 py-6 space-y-4 shadow-xl">
            <nav className="flex flex-col gap-3 text-sm font-bold text-slate-700">
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
            <div className="pt-3 border-t-2 border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => navigate("/login")}
                className="w-full py-3 rounded-2xl bg-slate-100 text-slate-800 text-xs font-bold text-center"
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
          2. HERO SECTION — CLARA, ELEGANTE E COM ALTO CONTRASTE
          ========================================================================= */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-32 overflow-hidden bg-gradient-to-b from-purple-50/60 via-white to-[#F8FAFC]">
        {/* Soft Background Accent Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-tr from-purple-200/40 via-indigo-100/30 to-emerald-100/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10 text-center">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 border-2 border-purple-300 shadow-xs text-xs font-black text-[#7C3AED]">
            <Sparkles className="w-4 h-4 text-[#7C3AED]" />
            <span>Inteligência Artificial Feita Sob Medida para Psicopedagogia</span>
          </div>

          {/* Main Headline */}
          <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-[#0F172A]">
              Chega de perder seus domingos digitando{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#0284C7]">
                laudos e relatórios.
              </span>
            </h1>

            <p className="text-base sm:text-xl font-medium text-[#475569] max-w-2xl mx-auto leading-relaxed">
              O <strong className="text-[#0F172A] font-black">EvoluIA</strong> organiza cada paciente, gera
              relatórios clínicos com IA em segundos e cobra mensalidades no WhatsApp em 1 clique.
              <br className="hidden sm:block" />
              Recupere seu tempo livre e tenha um consultório 100% profissional.
            </p>
          </div>

          {/* CTA & Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a
              href="#planos"
              className="w-full sm:w-auto px-8 py-4 rounded-3xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-base font-black shadow-lg shadow-purple-600/30 hover:shadow-xl hover:shadow-purple-600/40 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Começar Teste de 14 Dias Grátis</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>

            <a
              href="#simulador"
              className="w-full sm:w-auto px-6 py-4 rounded-3xl bg-white hover:bg-slate-50 border-2 border-slate-300 text-[#334155] hover:text-[#0F172A] text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xs"
            >
              <Clock className="w-4 h-4 text-[#0284C7]" />
              <span>Simular Horas Economizadas</span>
            </a>
          </div>

          {/* Social Proof */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-semibold text-[#64748B]">
            <div className="flex items-center gap-1.5">
              <div className="flex text-[#F59E0B]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
              <span className="text-[#0F172A] font-black">5.0</span> • Avaliado por Psicopedagogas
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <span>Criptografia de Nível Clínico & Sigilo Total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-[#0284C7]" />
              <span>Sem Fidelidade • Cancele com 1 Clique</span>
            </div>
          </div>

          {/* =========================================================================
              LIVE INTERACTIVE APP PREVIEW (COM INSTRUÇÃO EXPLÍCITA DE CLIQUE)
              ========================================================================= */}
          <div className="pt-8 max-w-5xl mx-auto space-y-3">
            {/* Visual Action Indicator Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600 text-white text-xs font-black shadow-md shadow-purple-600/30 animate-pulse">
              <MousePointerClick className="w-4 h-4" />
              <span>👆 TESTE AO VIVO: CLIQUE NAS 4 ABAS ABAIXO PARA VER O SISTEMA FUNCIONANDO</span>
            </div>

            <div className="rounded-3xl sm:rounded-[36px] bg-slate-900/5 p-2 sm:p-3 shadow-2xl border-2 border-slate-300 backdrop-blur-xl">
              <div className="rounded-2xl sm:rounded-[30px] bg-white border-2 border-slate-300 overflow-hidden text-left shadow-lg">
                {/* Mockup Header Bar */}
                <div className="px-5 py-4 bg-[#F8FAFC] border-b-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
                    <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                    <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                    <span className="text-xs font-black text-[#475569] ml-2 hidden sm:inline">
                      EvoluIA • Consultório Digital ao Vivo
                    </span>
                  </div>

                  {/* Interactive Switcher */}
                  <div className="w-full sm:w-auto grid grid-cols-2 sm:flex sm:items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 border-2 border-slate-200">
                    {[
                      { id: "laudo", label: "Laudos com IA", emoji: "🤖" },
                      { id: "whatsapp", label: "WhatsApp & PIX", emoji: "💬" },
                      { id: "prontuario", label: "Prontuário & PEI", emoji: "📋" },
                      { id: "financeiro", label: "Financeiro", emoji: "💵" },
                    ].map((tab) => {
                      const isActive = interactiveTab === tab.id
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setInteractiveTab(tab.id as any)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl text-xs transition-all cursor-pointer select-none text-center ${
                            isActive
                              ? "bg-[#7C3AED] text-white shadow-md font-black scale-[1.02]"
                              : "bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 font-bold"
                          }`}
                        >
                          <span className="text-sm">{tab.emoji}</span>
                          <span className="whitespace-nowrap">{tab.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Mockup Body */}
                <div className="p-6 sm:p-8 min-h-[380px] bg-white">
                  {/* 1. Tab Laudo IA */}
                  {interactiveTab === "laudo" && (
                    <div className="space-y-5 animate-in fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#7C3AED] flex items-center justify-center font-black border-2 border-purple-200">
                            🤖
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-[#0F172A]">
                              Gerador de Laudos & Devolutivas com IA Gemini 2.0
                            </h4>
                            <p className="text-xs text-[#64748B]">
                              Transforma pequenos tópicos da sessão em um documento técnico completo.
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border-2 border-emerald-300 self-start sm:self-auto shadow-xs">
                          ⚡ Gerado em 2.4 segundos
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* Entrada / Anotações */}
                        <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                            Suas Anotações Rápidas (Entrada):
                          </p>
                          <p className="text-slate-800 font-mono text-[11px] leading-relaxed bg-white p-3 rounded-xl border-2 border-slate-200 shadow-xs">
                            - Paciente Arthur, 8 anos, queixa de dispersão na leitura.
                            <br />
                            - Apresentou melhora na discriminação fonológica com jogos lúdicos.
                            <br />- Recomendado manter 2x/semana e orientação à professora.
                          </p>
                        </div>

                        {/* Saída IA Formatada */}
                        <div className="p-4 rounded-2xl bg-purple-50 border-2 border-purple-300 space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-wider text-[#7C3AED] flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Relatório Psicopedagógico Gerado (Saída):
                          </p>
                          <p className="text-slate-900 font-medium text-[11px] leading-relaxed bg-white p-3 rounded-xl border-2 border-purple-200 shadow-xs">
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
                          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black border-2 border-emerald-200">
                            💬
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-[#0F172A]">
                              Automação de WhatsApp em 1 Toque
                            </h4>
                            <p className="text-xs text-[#64748B]">
                              Lembretes de sessão e cobrança carinhosa com sua chave PIX.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-3">
                        <div className="p-4 rounded-2xl bg-[#DCF8C6] text-[#075E54] text-xs font-medium space-y-2 shadow-xs border border-[#B7E4A8]">
                          <p className="font-black text-[11px] text-[#075E54]">
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
                          <span className="px-3 py-1.5 rounded-xl bg-[#25D366] text-white text-[10px] font-black flex items-center gap-1 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Enviado com 1 clique pelo EvoluIA
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
                          <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-black border-2 border-sky-200">
                            📋
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-[#0F172A]">
                              Prontuário Clínico & Linha do Tempo
                            </h4>
                            <p className="text-xs text-[#64748B]">
                              Histórico escolar, queixas da família, plano de intervenção e evolução.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-1">
                          <span className="text-[10px] font-black text-sky-700 uppercase">HISTÓRICO</span>
                          <p className="font-black text-[#0F172A]">Anamnese Completa</p>
                          <p className="text-[11px] text-slate-600">Marcos de desenvolvimento registrados</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-1">
                          <span className="text-[10px] font-black text-purple-700 uppercase">PLANO DE ENSINO</span>
                          <p className="font-black text-[#0F172A]">PEI Integrado</p>
                          <p className="text-[11px] text-slate-600">Metas e objetivos por período</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-1">
                          <span className="text-[10px] font-black text-emerald-700 uppercase">DOCUMENTOS</span>
                          <p className="font-black text-[#0F172A]">Devolutivas em PDF</p>
                          <p className="text-[11px] text-slate-600">Impressão com cabeçalho e logo</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. Tab Financeiro */}
                  {interactiveTab === "financeiro" && (
                    <div className="space-y-5 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black border-2 border-amber-200">
                            💵
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-[#0F172A]">
                              Controle Financeiro Sem Planilhas
                            </h4>
                            <p className="text-xs text-[#64748B]">
                              Baixa em PIX, Cartão e Dinheiro com recibos gerados na hora.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200">
                          <p className="text-[10px] text-emerald-700 font-bold">RECEBIDO NO MÊS</p>
                          <p className="text-lg font-black text-emerald-950 mt-0.5">R$ 6.840,00</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200">
                          <p className="text-[10px] text-amber-700 font-bold">PENDENTE</p>
                          <p className="text-lg font-black text-amber-950 mt-0.5">R$ 480,00</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-sky-50 border-2 border-sky-200">
                          <p className="text-[10px] text-sky-700 font-bold">FORMA FAVORITA</p>
                          <p className="text-lg font-black text-sky-950 mt-0.5">92% PIX</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-purple-50 border-2 border-purple-200">
                          <p className="text-[10px] text-purple-700 font-bold">INADIMPLÊNCIA</p>
                          <p className="text-lg font-black text-purple-950 mt-0.5">0% (Zero)</p>
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
          3. ANTES VS DEPOIS — O CONTRASTE BRUTAL
          ========================================================================= */}
      <section id="comparativo" className="py-20 lg:py-32 bg-slate-100 border-y-2 border-slate-300 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-black tracking-widest text-[#7C3AED] uppercase">
              A Diferença é Brutal
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-[#0F172A] tracking-tight">
              Como é sua rotina hoje vs com o EvoluIA
            </h2>
            <p className="text-sm sm:text-base text-[#475569] font-medium">
              Você estudou anos para transformar a aprendizagem de crianças, não para ser escrava de burocracia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            {/* Lado 1: Sem EvoluIA */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-red-300 shadow-md space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-black text-lg border-2 border-red-200">
                  ❌
                </div>
                <div>
                  <h3 className="text-lg font-black text-red-950">Sem o EvoluIA (O Jeito Antigo)</h3>
                  <p className="text-xs text-red-600 font-bold">Desgaste mental, perda de tempo e estresse</p>
                </div>
              </div>

              <ul className="space-y-4 text-xs font-medium text-slate-700">
                <li className="flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Domingos perdidos:</strong> 4 a 6 horas redigindo laudos, devolutivas e relatórios do zero.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Cadernos e papéis espalhados:</strong> Risco de perder anotações importantes da evolução do paciente.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Cobrança constrangedora:</strong> Ficar mandando mensagens manuais para os pais cobrando mensalidades atrasadas.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Faltas surpresa:</strong> Famílias esquecendo a sessão porque você não teve tempo de mandar lembrete de manhã.
                  </span>
                </li>
              </ul>
            </div>

            {/* Lado 2: Com EvoluIA */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-emerald-400 shadow-xl shadow-emerald-500/10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-lg border-2 border-emerald-200">
                  🟢
                </div>
                <div>
                  <h3 className="text-lg font-black text-emerald-950">Com o EvoluIA (O Consultório Moderno)</h3>
                  <p className="text-xs text-emerald-700 font-bold">Leveza, autoridade máxima e fins de semana livres</p>
                </div>
              </div>

              <ul className="space-y-4 text-xs font-medium text-slate-800">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Laudos com IA em 30 segundos:</strong> Estrutura técnica impecável, terminologia pedagógica correta e exportação em PDF.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Prontuário 100% Digital & Seguro:</strong> Acesse a história completa de qualquer criança em 2 segundos pelo celular ou notebook.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Cobrança PIX Automática e Elegante:</strong> Mensagem profissional pré-formatada sem vergonha e com alta taxa de pagamento pontual.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
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
      <section id="recursos" className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-black tracking-widest text-[#7C3AED] uppercase">
              Tudo o Que Seu Espaço Precisa
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-[#0F172A] tracking-tight">
              Os 4 Pilares da Sua Nova Rotina Clínica
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pilar 1 */}
            <div className="p-6 rounded-3xl bg-[#F8FAFC] border-2 border-slate-200 hover:border-purple-400 hover:shadow-lg transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#7C3AED] flex items-center justify-center group-hover:scale-110 transition-transform border-2 border-purple-200">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-[#0F172A]">IA de Laudos & Devolutivas</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Escreva pequenos tópicos da sessão e a inteligência artificial gera um relatório técnico,
                ético e fundamentado pronto para impressão.
              </p>
            </div>

            {/* Pilar 2 */}
            <div className="p-6 rounded-3xl bg-[#F8FAFC] border-2 border-slate-200 hover:border-emerald-400 hover:shadow-lg transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform border-2 border-emerald-200">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-[#0F172A]">WhatsApp & PIX com 1 Toque</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Envie confirmações de horário e cobranças carinhosas com a sua chave PIX diretamente
                para os responsáveis sem nenhum constrangimento.
              </p>
            </div>

            {/* Pilar 3 */}
            <div className="p-6 rounded-3xl bg-[#F8FAFC] border-2 border-slate-200 hover:border-sky-400 hover:shadow-lg transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center group-hover:scale-110 transition-transform border-2 border-sky-200">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-[#0F172A]">Prontuário & Linha do Tempo</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Histórico escolar, queixas iniciais, evolução atendimento por atendimento e anexos em um só lugar
                protegido por senha.
              </p>
            </div>

            {/* Pilar 4 */}
            <div className="p-6 rounded-3xl bg-[#F8FAFC] border-2 border-slate-200 hover:border-amber-400 hover:shadow-lg transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform border-2 border-amber-200">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-[#0F172A]">Gestão de Equipe & Vagas</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Seu consultório pode crescer: adicione 2, 3, 4 ou mais psicopedagogas compartilhando a mesma clínica
                com controle total de acessos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. SIMULADOR INTERATIVO DE ECONOMIA DE TEMPO (COM INSTRUÇÃO EXPLÍCITA)
          ========================================================================= */}
      <section id="simulador" className="py-20 lg:py-32 bg-purple-50/70 border-t-2 border-slate-300 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-black tracking-widest text-[#7C3AED] uppercase">
              Calculadora de Liberdade
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-[#0F172A] tracking-tight">
              Quanto tempo você vai recuperar por mês?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Simule abaixo de acordo com a quantidade de atendimentos da sua rotina.
            </p>
          </div>

          <div className="p-6 sm:p-10 rounded-3xl bg-white border-2 border-slate-300 shadow-xl space-y-8">
            {/* Visual Slider Callout */}
            <div className="p-3.5 rounded-2xl bg-purple-50 border-2 border-purple-200 flex items-center gap-3">
              <SlidersHorizontal className="w-5 h-5 text-[#7C3AED] shrink-0" />
              <p className="text-xs font-black text-[#7C3AED]">
                👉 ARRASTE A BOLINHA PARA OS LADOS PARA VER SUAS HORAS E GANHOS:
              </p>
            </div>

            {/* Slider */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs sm:text-sm font-black text-slate-800">Quantos pacientes você atende na semana?</span>
                <span className="text-2xl font-black text-[#7C3AED] bg-purple-100 px-4 py-1.5 rounded-2xl border-2 border-[#7C3AED] self-start sm:self-auto shadow-sm">
                  {patientsCount} pacientes
                </span>
              </div>

              {/* Slider Track Container with highly visible outline and guidance */}
              <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-white to-purple-50 border-2 border-purple-300 shadow-sm space-y-2">
                <div className="relative py-1 flex items-center">
                  <input
                    type="range"
                    min="3"
                    max="40"
                    value={patientsCount}
                    onChange={(e) => setPatientsCount(Number(e.target.value))}
                    className="custom-slider w-full h-4 sm:h-5 cursor-grab active:cursor-grabbing"
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-700 font-black px-1">
                  <span className="flex items-center gap-1 text-slate-600">
                    <span>◀</span> 3 pacientes (Início)
                  </span>
                  <span className="text-[#7C3AED] bg-purple-100/80 px-2.5 py-0.5 rounded-full border border-purple-200 hidden sm:inline">
                    20 pacientes
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    40 pacientes (Clínica Cheia) <span>▶</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Resultado do Cálculo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t-2 border-slate-100">
              <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-center sm:text-left space-y-1">
                <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wider">
                  ⏱️ Tempo Livre Recuperado
                </span>
                <div className="text-3xl sm:text-4xl font-black text-emerald-950">
                  {hoursSavedPerMonth} horas <span className="text-sm text-emerald-700">/mês</span>
                </div>
                <p className="text-[11px] text-emerald-900 font-semibold">
                  São cerca de <strong>{Math.round(hoursSavedPerMonth / 8)} dias inteiros</strong> de folga a mais para você todo mês.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-purple-50 border-2 border-purple-300 text-center sm:text-left space-y-1">
                <span className="text-[11px] font-black uppercase text-purple-800 tracking-wider">
                  💰 Valor do Seu Tempo Economizado
                </span>
                <div className="text-3xl sm:text-4xl font-black text-purple-950">
                  R$ {monetaryValueRecovered.toLocaleString("pt-BR")},00
                </div>
                <p className="text-[11px] text-purple-900 font-semibold">
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
      <section id="planos" className="py-20 lg:py-32 bg-white relative">
        <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-xs font-black tracking-widest text-[#7C3AED] uppercase">
              Investimento Transparente
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-[#0F172A] tracking-tight">
              Planos que Cabem no Bolso do Seu Consultório
            </h2>
            <p className="text-sm text-slate-600 font-medium">
              Todos os planos incluem <strong>14 dias de teste grátis</strong> sem cobrança imediata no cartão.
            </p>

            {/* Monthly / Yearly Toggle */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <span className="text-xs font-bold text-slate-500">
                👇 Clique no botão para alternar Mensal / Anual:
              </span>
              <div className="flex items-center gap-3 p-1.5 rounded-2xl bg-slate-100 border-2 border-slate-200">
                <span className={`text-xs font-black px-2 ${billingPeriod === "monthly" ? "text-slate-900" : "text-slate-500"}`}>
                  Mensal
                </span>
                <button
                  onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "yearly" : "monthly")}
                  className="w-14 h-7 bg-[#7C3AED] rounded-full p-1 transition-colors relative cursor-pointer shadow-xs"
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      billingPeriod === "yearly" ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className={`text-xs font-black flex items-center gap-1 px-2 ${billingPeriod === "yearly" ? "text-slate-900" : "text-slate-500"}`}>
                  <span>Anual</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                    2 Meses Grátis 🎁
                  </span>
                </span>
              </div>
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
                      ? "bg-gradient-to-b from-purple-50/70 to-white border-[#7C3AED] shadow-xl ring-2 ring-purple-400/30 scale-102"
                      : "bg-white border-2 border-slate-300 hover:border-slate-400 shadow-sm"
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
                      <h3 className="text-base font-black text-[#0F172A]">{plan.name}</h3>
                      <p className="text-[11px] text-slate-600 mt-1 leading-snug font-medium">{plan.description}</p>
                    </div>

                    {/* Preço Bem Distribuído & Centralizado */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-2 shadow-2xs">
                      {/* Top Row: Investimento + Vagas Centralizados Juntos */}
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          Investimento
                        </span>
                        <div className="px-2 py-0.5 rounded-lg bg-purple-100 border border-purple-200 text-[#7C3AED] text-[10px] font-black flex items-center gap-1 shrink-0 whitespace-nowrap">
                          <Users className="w-3 h-3 shrink-0" />
                          <span>
                            {plan.maxProfessionals === 1
                              ? "1 Vaga"
                              : `Até ${plan.maxProfessionals} Vagas`}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Row: Preço Grande e /mês Junto na Mesma Linha */}
                      <div className="flex items-baseline justify-center gap-1 pt-1">
                        <span className="text-3xl sm:text-4xl font-black text-[#0F172A] tracking-tight whitespace-nowrap">
                          R$ {price.toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                          /mês
                        </span>
                      </div>
                    </div>

                    {/* Recursos */}
                    <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t-2 border-slate-100">
                      {plan.features.slice(0, 4).map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[11px] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Botão de Compra / Teste */}
                  <div className="pt-6 space-y-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/cadastro?plano=${plan.id}`)}
                      className={`w-full py-3 rounded-2xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 text-center cursor-pointer ${
                        isPopular
                          ? "bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-purple-500/25"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                    >
                      <span>Testar 14 Dias Grátis</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <div className="text-center">
                      <a
                        href={plan.hotmartCheckoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-slate-400 hover:text-[#7C3AED] transition-colors"
                      >
                        Ou assinar direto com cartão →
                      </a>
                    </div>
                    <p className="text-[9px] text-slate-500 text-center font-semibold">
                      Zero cobrança hoje • Sem cartão
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
      <section className="py-16 bg-slate-100 border-y-2 border-slate-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-md border-2 border-emerald-300">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-[#0F172A] tracking-tight">
            Garantia Blindada de Risco Zero: 21 Dias de Segurança Total
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto font-medium">
            Você tem <strong>14 dias de teste grátis</strong> sem pagar nada. Se decidir continuar, ainda tem mais{" "}
            <strong>7 dias de garantia incondicional pela Hotmart</strong>. Se o EvoluIA não economizar o seu tempo
            e organizar o seu consultório, devolvemos 100% do seu dinheiro. Sem perguntas.
          </p>
        </div>
      </section>

      {/* =========================================================================
          8. FAQ INTERATIVO (COM INSTRUÇÃO DE CLIQUE)
          ========================================================================= */}
      <section id="faq" className="py-20 lg:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-black tracking-widest text-[#7C3AED] uppercase">
              Tire Suas Dúvidas
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-[#0F172A] tracking-tight">
              Perguntas Frequentes
            </h2>
            <p className="text-xs font-black text-[#7C3AED]">
              👇 CLIQUE EM QUALQUER PERGUNTA PARA ABRIR E LER A RESPOSTA:
            </p>
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
                  className="rounded-2xl bg-slate-50 border-2 border-slate-200 overflow-hidden transition-all shadow-xs"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-black text-sm text-[#0F172A] cursor-pointer hover:bg-slate-100"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-[#7C3AED] shrink-0 stroke-[3]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-500 shrink-0 stroke-[3]" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-700 leading-relaxed border-t-2 border-slate-200/80 pt-3 animate-in fade-in font-medium">
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
          9. FINAL CALL TO ACTION
          ========================================================================= */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-tr from-purple-700 via-indigo-600 to-purple-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Pronta para recuperar seus domingos e transformar seu consultório?
          </h2>

          <p className="text-sm sm:text-base text-purple-100 max-w-xl mx-auto font-medium">
            Junte-se a psicopedagogas que economizam até 15 horas de trabalho por semana com o EvoluIA.
          </p>

          <div className="pt-2">
            <a
              href="#planos"
              className="inline-flex items-center gap-2 px-9 py-4 rounded-3xl bg-white text-[#0F172A] hover:bg-slate-100 text-base font-black shadow-xl shadow-black/20 hover:scale-105 transition-all active:scale-95 cursor-pointer"
            >
              <span>Começar Meus 14 Dias Grátis</span>
              <ArrowRight className="w-5 h-5 text-[#7C3AED]" />
            </a>
          </div>
        </div>
      </section>

      {/* =========================================================================
          10. RODAPÉ INSTITUCIONAL & LEGAL
          ========================================================================= */}
      <footer className="bg-white border-t-2 border-slate-200 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#7C3AED] flex items-center justify-center text-white">
              <Brain className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="font-black text-sm text-[#0F172A]">
              Evolu<span className="text-[#7C3AED]">IA</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 font-bold text-slate-600">
            <Link to="/login" className="hover:text-[#7C3AED] transition-colors">
              Acessar Consultório (Login)
            </Link>
            <a href="#planos" className="hover:text-[#7C3AED] transition-colors">
              Planos & Vagas
            </a>
            <a href="#faq" className="hover:text-[#7C3AED] transition-colors">
              Suporte & Dúvidas
            </a>
          </div>

          <p className="text-[11px] text-slate-400 font-medium">
            © {new Date().getFullYear()} EvoluIA. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
