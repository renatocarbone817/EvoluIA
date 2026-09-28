import { useState, useEffect, useRef, useMemo } from "react"
import {
  Search, Upload, Plus, MessageCircle, Link2, ChevronDown,
  X, Loader2, Filter, Trash2, Check, MapPin, Globe, Phone,
  TrendingUp, Users, Zap, Star, Lock, LogOut, Target, Map,
  Sparkles, Key, ExternalLink, RefreshCw
} from "lucide-react"
import { toast } from "react-hot-toast"
import {
  listLeads, createLead, updateLead, deleteLead, importLeadsFromCSV,
  formatWhatsAppLink, normalizeInstagram,
  STATUS_CONFIG,
  type Lead, type LeadStatus, type LeadInsert
} from "@/lib/leadsService"
import {
  searchGooglePlaces, getStoredGoogleKey, saveStoredGoogleKey,
  type GooglePlaceResult
} from "@/lib/googlePlacesService"

// ─── Credenciais de acesso do painel de leads ──────────────────────────────────
const LEADS_EMAIL = "leads@evoluia.com.br"
const LEADS_PASS  = "EvoluIA@Leads2025"
const SESSION_KEY = "evoluia_leads_session"
const LEADS_OWNER_ID = "00000000-0000-0000-0000-000000000001"

function checkLeadsSession(): boolean {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return false
    const { expires } = JSON.parse(raw)
    return Date.now() < expires
  } catch {
    return false
  }
}

function createLeadsSession() {
  const expires = Date.now() + 8 * 60 * 60 * 1000 // 8 horas
  localStorage.setItem(SESSION_KEY, JSON.stringify({ expires }))
}

function clearLeadsSession() {
  localStorage.removeItem(SESSION_KEY)
}

// ─── Tela de Login do Painel de Leads ─────────────────────────────────────────

function LeadsLoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail]     = useState("")
  const [pass,  setPass]      = useState("")
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    await new Promise((r) => setTimeout(r, 400))

    if (
      email.trim().toLowerCase() === LEADS_EMAIL.toLowerCase() &&
      pass === LEADS_PASS
    ) {
      createLeadsSession()
      onSuccess()
    } else {
      setError("E-mail ou senha incorretos.")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0D2329] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-[#6366F1] to-[#7C3AED] flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.5)] mb-4">
            <Target className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">
            Evolu<span className="text-[#A855F7]">IA</span>
          </h1>
          <p className="text-xs font-bold text-[#7EA2AA] mt-1">Painel de Leads & Prospecção</p>
        </div>

        <div className="bg-[#132830] border border-[#193F4A] rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-4 h-4 text-[#A855F7]" />
            <h2 className="text-sm font-black text-white">Acesso Comercial</h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-black text-[#A6C5CC] mb-1.5 block">E-mail</label>
              <input
                type="email"
                autoComplete="username"
                required
                className="w-full bg-[#0D2329] border border-[#193F4A] rounded-2xl px-4 py-2.5 text-sm text-white placeholder-[#4A7A8A] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 focus:border-[#7C3AED] transition-all"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-black text-[#A6C5CC] mb-1.5 block">Senha</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                className="w-full bg-[#0D2329] border border-[#193F4A] rounded-2xl px-4 py-2.5 text-sm text-white placeholder-[#4A7A8A] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 focus:border-[#7C3AED] transition-all"
                placeholder="••••••••"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                ⚠️ {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl text-sm font-black bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#7C3AED]/30"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Entrar
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-[#4A7A8A] mt-4">
          Acesso exclusivo — time comercial EvoluIA
        </p>
      </div>
    </div>
  )
}

// ─── Status config ─────────────────────────────────────────────────────────────

const ALL_STATUSES = Object.entries(STATUS_CONFIG) as [LeadStatus, typeof STATUS_CONFIG[LeadStatus]][]

function StatusBadge({ status, small }: { status: LeadStatus; small?: boolean }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1 border rounded-full font-bold whitespace-nowrap
        ${small ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"}
        ${cfg.bg} ${cfg.color}`}
    >
      {cfg.emoji} {cfg.label}
    </span>
  )
}

// ─── Modal: Busca Direta no Google Maps ─────────────────────────────────────────

interface GoogleMapsModalProps {
  existingLeads: Lead[]
  onClose: () => void
  onImported: (importedCount: number) => void
}

// Leads de exemplo em Votuporanga e Rio Preto para teste instantâneo
const DEMO_VOTUPORANGA_LEADS: GooglePlaceResult[] = [
  {
    id: "votu_1",
    nome: "Dra. Rosemary Morais - M&M Clínica Integrada",
    telefone: "(17) 99732-4386",
    whatsapp: "(17) 99732-4386",
    endereco: "Rua Ponta Porã, 3190 – Bairro San Remo, Votuporanga - SP",
    cidade: "Votuporanga",
    estado: "SP",
    site: null,
    rating: 5.0,
    userRatingCount: 16,
  },
  {
    id: "votu_2",
    nome: "Adriana Ricci - Neuropsicopedagoga",
    telefone: "(17) 99736-0906",
    whatsapp: "(17) 99736-0906",
    endereco: "Votuporanga - SP (Atendimento Clínico e Domiciliar)",
    cidade: "Votuporanga",
    estado: "SP",
    site: null,
    rating: 4.9,
    userRatingCount: 11,
  },
  {
    id: "votu_3",
    nome: "Mônica Sartori Tavares da Silva - Psicopedagogia",
    telefone: "(17) 99751-3269",
    whatsapp: "(17) 99751-3269",
    endereco: "Rua Minas Gerais, 3419, Votuporanga - SP",
    cidade: "Votuporanga",
    estado: "SP",
    site: null,
    rating: 5.0,
    userRatingCount: 8,
  },
  {
    id: "votu_4",
    nome: "Centro Especializado de Desenvolvimento Infantil",
    telefone: "(17) 99243-1833",
    whatsapp: "(17) 99243-1833",
    endereco: "Rua Tibagi, 2906 – Vila Nova, Votuporanga - SP",
    cidade: "Votuporanga",
    estado: "SP",
    site: null,
    rating: 4.8,
    userRatingCount: 24,
  },
  {
    id: "votu_5",
    nome: "Núcleo de Psicologia, Neuropsicologia e Reabilitação",
    telefone: "(17) 99636-0544",
    whatsapp: "(17) 99636-0544",
    endereco: "Rua Tibagi, 3072 – Patrimônio Novo, Votuporanga - SP",
    cidade: "Votuporanga",
    estado: "SP",
    site: null,
    rating: 4.9,
    userRatingCount: 19,
  },
  {
    id: "votu_6",
    nome: "Ariadne Ribeiro Mariotti - Psicopedagoga",
    telefone: "(17) 99745-8331",
    whatsapp: "(17) 99745-8331",
    endereco: "Votuporanga - SP",
    cidade: "Votuporanga",
    estado: "SP",
    site: null,
    rating: 4.7,
    userRatingCount: 6,
  }
]

const DEMO_RIO_PRETO_LEADS: GooglePlaceResult[] = [
  {
    id: "demo_1",
    nome: "Espaço Integrar - Psicopedagogia e Neuroaprendizagem",
    telefone: "(17) 99781-2244",
    whatsapp: "(17) 99781-2244",
    endereco: "Av. Alberto Andaló, 3450 - Centro, São José do Rio Preto - SP",
    cidade: "São José do Rio Preto",
    estado: "SP",
    site: "https://espacointegrarped.com.br",
    rating: 5.0,
    userRatingCount: 14,
  },
  {
    id: "demo_2",
    nome: "Clínica Crescer - Psicopedagogia Clínica & TDAH",
    telefone: "(17) 99144-8833",
    whatsapp: "(17) 99144-8833",
    endereco: "R. Bernardino de Campos, 2810 - Redentora, São José do Rio Preto - SP",
    cidade: "São José do Rio Preto",
    estado: "SP",
    site: "https://clinicacrescer.com.br",
    rating: 4.9,
    userRatingCount: 22,
  },
  {
    id: "demo_3",
    nome: "Instituto Aprender Mais - Apoio Psicopedagógico",
    telefone: "(17) 99655-1122",
    whatsapp: "(17) 99655-1122",
    endereco: "R. XV de Novembro, 3120 - Vila Redentora, São José do Rio Preto - SP",
    cidade: "São José do Rio Preto",
    estado: "SP",
    site: null,
    rating: 4.8,
    userRatingCount: 19,
  }
]

function GoogleMapsModal({ existingLeads, onClose, onImported }: GoogleMapsModalProps) {
  const [query, setQuery] = useState("psicopedagoga em são josé do rio preto sp")
  const [apiKey, setApiKey] = useState(getStoredGoogleKey)
  const [showConfig, setShowConfig] = useState(!apiKey)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<GooglePlaceResult[]>([])
  const [importingAll, setImportingAll] = useState(false)
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set())

  // Mapear telefones e nomes já cadastrados para indicar duplicatas
  const existingPhones = useMemo(() => {
    return new Set(
      existingLeads
        .map((l) => (l.whatsapp || l.telefone || "").replace(/\D/g, ""))
        .filter(Boolean)
    )
  }, [existingLeads])

  const existingNames = useMemo(() => {
    return new Set(existingLeads.map((l) => l.nome.toLowerCase().trim()))
  }, [existingLeads])

  function isPlaceAlreadySaved(place: GooglePlaceResult): boolean {
    const rawP = (place.whatsapp || place.telefone || "").replace(/\D/g, "")
    if (rawP && existingPhones.has(rawP)) return true
    if (existingNames.has(place.nome.toLowerCase().trim())) return true
    return false
  }

  async function handleSearch() {
    if (!query.trim()) {
      toast.error("Digite o termo de busca (ex: psicopedagoga em rio preto sp)")
      return
    }

    if (!apiKey.trim()) {
      setShowConfig(true)
      toast.error("Informe a chave da Google Places API ou teste com os dados de demonstração abaixo")
      return
    }

    setLoading(true)
    try {
      saveStoredGoogleKey(apiKey)
      const data = await searchGooglePlaces(query, apiKey)
      setResults(data)
      if (data.length === 0) {
        toast("Nenhum estabelecimento encontrado com este termo.")
      } else {
        toast.success(`${data.length} psicopedagogas encontradas no Google Maps!`)
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro na busca do Google Places")
    } finally {
      setLoading(false)
    }
  }

  function handleLoadDemo() {
    setResults(DEMO_RIO_PRETO_LEADS)
    toast.success("5 leads de exemplo em Rio Preto carregados!")
  }

  async function importSinglePlace(place: GooglePlaceResult) {
    try {
      const newLead: LeadInsert = {
        professional_id: LEADS_OWNER_ID,
        nome: place.nome,
        telefone: place.telefone || null,
        whatsapp: place.whatsapp || place.telefone || null,
        site: place.site || null,
        cidade: place.cidade || null,
        estado: place.estado || null,
        endereco: place.endereco || null,
        status: "novo",
        observacao: place.rating ? `Google Maps ⭐ ${place.rating} (${place.userRatingCount || 0} avaliações)` : "Importado via Google Maps",
      }

      await createLead(newLead)
      setImportedIds((prev) => new Set([...prev, place.id]))
      toast.success(`"${place.nome}" importado!`)
      onImported(1)
    } catch (e: any) {
      toast.error(e?.message || "Erro ao importar lead")
    }
  }

  async function handleImportAll() {
    const toImport = results.filter((p) => !isPlaceAlreadySaved(p) && !importedIds.has(p.id))
    if (toImport.length === 0) {
      toast("Todos os leads da lista já foram importados!")
      return
    }

    setImportingAll(true)
    let count = 0
    try {
      for (const place of toImport) {
        const newLead: LeadInsert = {
          professional_id: LEADS_OWNER_ID,
          nome: place.nome,
          telefone: place.telefone || null,
          whatsapp: place.whatsapp || place.telefone || null,
          site: place.site || null,
          cidade: place.cidade || null,
          estado: place.estado || null,
          endereco: place.endereco || null,
          status: "novo",
          observacao: place.rating ? `Google Maps ⭐ ${place.rating} (${place.userRatingCount || 0} avaliações)` : "Importado via Google Maps",
        }
        await createLead(newLead)
        count++
        setImportedIds((prev) => new Set([...prev, place.id]))
      }
      toast.success(`🎉 ${count} leads importados com sucesso!`)
      onImported(count)
    } catch (e: any) {
      toast.error("Erro durante a importação em lote")
    } finally {
      setImportingAll(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#0D2329] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#34A853] to-[#4285F4] flex items-center justify-center">
              <Map className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black flex items-center gap-1.5">
                Buscador Google Maps <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">API Oficial</span>
              </h2>
              <p className="text-[10px] text-[#A6C5CC]">Pesquise clínicas e psicopedagogas por cidade em tempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
              title="Configurar chave da Google Places API"
            >
              <Key className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Configuração da Chave da API */}
        {showConfig && (
          <div className="px-6 py-4 bg-amber-50/80 border-b border-amber-200/60 text-amber-950 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black flex items-center gap-1.5 text-amber-900">
                <Key className="w-3.5 h-3.5" /> Chave Google Places API
              </span>
              <a
                href="https://console.cloud.google.com/google/maps-apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline flex items-center gap-1"
              >
                Gerar chave no Google Cloud (US$ 200/mês grátis) <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Cole sua chave aqui (AIzaSy...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <button
                onClick={() => {
                  saveStoredGoogleKey(apiKey)
                  setShowConfig(false)
                  toast.success("Chave salva!")
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black"
              >
                Salvar
              </button>
            </div>
          </div>
        )}

        {/* Barra de Pesquisa */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] shadow-xs"
                placeholder="Ex: psicopedagoga em são josé do rio preto sp"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch() }}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-5 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2 shadow-md shadow-[#7C3AED]/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar
            </button>
          </div>

          {/* Sugestões rápidas de pesquisa */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide mr-1">Atalhos:</span>
            {[
              "Psicopedagoga em Votuporanga SP",
              "Psicopedagoga em São José do Rio Preto SP",
              "Psicopedagoga em Ribeirão Preto SP",
              "Psicopedagoga em Campinas SP",
            ].map((q) => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white border border-gray-200 hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors"
              >
                {q.replace("Psicopedagoga em ", "")}
              </button>
            ))}
            <button
              onClick={() => {
                setResults(DEMO_VOTUPORANGA_LEADS)
                toast.success("7 psicopedagogas de Votuporanga carregadas!")
              }}
              className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-colors ml-auto flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-emerald-600" /> Puxar Votuporanga SP
            </button>
          </div>
        </div>

        {/* Resultados da busca */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
              <p className="text-sm font-bold text-gray-600">Consultando o Google Maps em tempo real...</p>
              <p className="text-xs text-gray-400">Buscando clínicas, telefones e endereços</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3 text-center">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center text-3xl">
                🗺️
              </div>
              <h3 className="font-black text-gray-700 text-sm">Pesquise psicopedagogas no Google Maps</h3>
              <p className="text-xs text-gray-400 max-w-sm">
                Digite a cidade no campo acima ou clique em "Testar com dados de Rio Preto" para visualizar a lista imediatamente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="text-xs font-black text-gray-700">
                  {results.length} resultados encontrados
                </span>
                <button
                  onClick={handleImportAll}
                  disabled={importingAll}
                  className="px-4 py-1.5 rounded-xl text-xs font-black bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-60"
                >
                  {importingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Importar Todos para Leads
                </button>
              </div>

              <div className="grid gap-2.5">
                {results.map((place) => {
                  const alreadySaved = isPlaceAlreadySaved(place) || importedIds.has(place.id)
                  const waLink = formatWhatsAppLink(place.whatsapp || place.telefone)

                  return (
                    <div
                      key={place.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        alreadySaved
                          ? "bg-gray-50 border-gray-200 opacity-75"
                          : "bg-white border-gray-200 hover:border-[#7C3AED]/40 hover:shadow-xs"
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-[#0D2329] truncate" title={place.nome}>
                            {place.nome}
                          </h4>
                          {place.rating && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              ⭐ {place.rating} ({place.userRatingCount || 0})
                            </span>
                          )}
                          {alreadySaved && (
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-200/80 px-2 py-0.5 rounded-full">
                              Já Cadastrado
                            </span>
                          )}
                        </div>

                        {place.endereco && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 truncate" title={place.endereco}>
                            <MapPin className="w-3 h-3 shrink-0 text-gray-400" />
                            {place.endereco}
                          </p>
                        )}

                        <div className="flex items-center gap-3 pt-1 flex-wrap">
                          {place.telefone ? (
                            <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-green-600" /> {place.telefone}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Sem telefone público</span>
                          )}

                          {place.site && (
                            <a
                              href={place.site}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                            >
                              <Globe className="w-3 h-3" /> {place.site.replace(/^https?:\/\//, "")}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Botão de Ação */}
                      <div className="shrink-0 flex flex-col gap-1 items-end">
                        {alreadySaved ? (
                          <span className="text-xs font-bold text-green-600 flex items-center gap-1 px-3 py-1.5 bg-green-50 rounded-xl border border-green-200">
                            <Check className="w-3.5 h-3.5" /> Salvo
                          </span>
                        ) : (
                          <button
                            onClick={() => importSinglePlace(place)}
                            className="text-xs font-black px-3 py-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white flex items-center gap-1 shadow-xs transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" /> Importar
                          </button>
                        )}
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-bold text-green-700 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <MessageCircle className="w-3 h-3" /> Testar Zap
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span>Google Places API · Dados em tempo real</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-bold border border-gray-200 text-gray-600 hover:bg-white transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: Editar / Novo Lead Manual ──────────────────────────────────────────

interface LeadModalProps {
  lead?: Lead | null
  onClose: () => void
  onSaved: (lead: Lead) => void
}

function LeadModal({ lead, onClose, onSaved }: LeadModalProps) {
  const isEdit = !!lead
  const [form, setForm] = useState<Partial<LeadInsert>>({
    nome: lead?.nome ?? "",
    telefone: lead?.telefone ?? "",
    whatsapp: lead?.whatsapp ?? "",
    instagram: lead?.instagram ?? "",
    site: lead?.site ?? "",
    cidade: lead?.cidade ?? "",
    estado: lead?.estado ?? "",
    endereco: lead?.endereco ?? "",
    status: lead?.status ?? "novo",
    observacao: lead?.observacao ?? "",
    professional_id: LEADS_OWNER_ID,
  })
  const [saving, setSaving] = useState(false)

  function set(key: keyof LeadInsert, val: string) {
    setForm((f) => ({ ...f, [key]: val || null }))
  }

  async function handleSave() {
    if (!form.nome?.trim()) { toast.error("Nome é obrigatório"); return }
    setSaving(true)
    try {
      let saved: Lead
      const payload = { ...form, nome: form.nome!.trim(), professional_id: LEADS_OWNER_ID }
      if (isEdit && lead) {
        saved = await updateLead(lead.id, payload)
      } else {
        saved = await createLead(payload as LeadInsert)
      }
      toast.success(isEdit ? "Lead atualizado!" : "Lead adicionado!")
      onSaved(saved)
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar lead")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-black text-[#0D2329]">
            {isEdit ? "✏️ Editar Lead" : "➕ Novo Lead"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="text-xs font-black text-[#0D2329] mb-1 block">Nome / Empresa *</label>
            <input
              className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              placeholder="Ex: Psicopedagoga Maria Silva"
              value={form.nome ?? ""}
              onChange={(e) => set("nome", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-[#0D2329] mb-1 block">Telefone</label>
              <input
                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                placeholder="(11) 99999-9999"
                value={form.telefone ?? ""}
                onChange={(e) => set("telefone", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-black text-[#0D2329] mb-1 block">WhatsApp</label>
              <input
                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                placeholder="(11) 99999-9999"
                value={form.whatsapp ?? ""}
                onChange={(e) => set("whatsapp", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-[#0D2329] mb-1 block">Instagram</label>
              <input
                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                placeholder="@psicopedagoga"
                value={form.instagram ?? ""}
                onChange={(e) => set("instagram", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-black text-[#0D2329] mb-1 block">Site</label>
              <input
                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                placeholder="https://..."
                value={form.site ?? ""}
                onChange={(e) => set("site", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-[#0D2329] mb-1 block">Cidade</label>
              <input
                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                placeholder="São Paulo"
                value={form.cidade ?? ""}
                onChange={(e) => set("cidade", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-black text-[#0D2329] mb-1 block">Estado</label>
              <input
                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                placeholder="SP"
                maxLength={2}
                value={form.estado ?? ""}
                onChange={(e) => set("estado", e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-[#0D2329] mb-1 block">Endereço</label>
            <input
              className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              placeholder="Rua, número, bairro"
              value={form.endereco ?? ""}
              onChange={(e) => set("endereco", e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-black text-[#0D2329] mb-1 block">Status</label>
            <select
              className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              {ALL_STATUSES.map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-black text-[#0D2329] mb-1 block">Observação</label>
            <textarea
              rows={3}
              className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              placeholder="Ex: Disse que usa planilhas. Interessada em demonstração."
              value={form.observacao ?? ""}
              onChange={(e) => set("observacao", e.target.value)}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-2xl text-sm font-black bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dropdown de Status inline ─────────────────────────────────────────────────

function StatusDropdown({ lead, onUpdate }: { lead: Lead; onUpdate: (l: Lead) => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  async function changeStatus(status: LeadStatus) {
    setOpen(false)
    setLoading(true)
    try {
      const updated = await updateLead(lead.id, { status })
      onUpdate(updated)
    } catch {
      toast.error("Erro ao atualizar status")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="flex items-center gap-1 group"
      >
        <StatusBadge status={lead.status} small />
        {loading
          ? <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
          : <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
        }
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-2xl shadow-xl py-1.5 min-w-[180px]">
          {ALL_STATUSES.map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => changeStatus(key)}
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-bold hover:bg-gray-50 transition-colors"
            >
              <span>{cfg.emoji}</span>
              <span className={cfg.color}>{cfg.label}</span>
              {lead.status === key && <Check className="w-3 h-3 ml-auto text-gray-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Linha da tabela ───────────────────────────────────────────────────────────

function LeadRow({
  lead, onUpdate, onDelete, onEdit
}: {
  lead: Lead
  onUpdate: (l: Lead) => void
  onDelete: (id: string) => void
  onEdit: (l: Lead) => void
}) {
  const [editObs, setEditObs] = useState(false)
  const [obs, setObs] = useState(lead.observacao ?? "")
  const [savingObs, setSavingObs] = useState(false)

  async function saveObs() {
    setSavingObs(true)
    try {
      const updated = await updateLead(lead.id, { observacao: obs || null })
      onUpdate(updated)
      setEditObs(false)
    } catch {
      toast.error("Erro ao salvar observação")
    } finally {
      setSavingObs(false)
    }
  }

  const waLink = formatWhatsAppLink(lead.whatsapp || lead.telefone)
  const instaHandle = normalizeInstagram(lead.instagram)

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors group">
      {/* Nome */}
      <td className="px-4 py-3 min-w-[180px]">
        <div className="font-bold text-sm text-[#0D2329] truncate max-w-[200px]" title={lead.nome}>
          {lead.nome}
        </div>
        {(lead.cidade || lead.estado) && (
          <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
            <MapPin className="w-2.5 h-2.5 shrink-0" />
            {[lead.cidade, lead.estado].filter(Boolean).join(", ")}
          </div>
        )}
      </td>

      {/* Contatos */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1.5">
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1 rounded-full transition-colors whitespace-nowrap shadow-2xs"
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              Abrir WhatsApp
            </a>
          )}
          {instaHandle && (
            <a
              href={`https://instagram.com/${instaHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-600 bg-pink-50 hover:bg-pink-100 border border-pink-200 px-2.5 py-1 rounded-full transition-colors whitespace-nowrap"
            >
              <Link2 className="w-3.5 h-3.5 shrink-0" />
              Instagram
            </a>
          )}
          {!waLink && !instaHandle && lead.telefone && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <Phone className="w-3 h-3" /> {lead.telefone}
            </span>
          )}
          {lead.site && (
            <a
              href={lead.site.startsWith("http") ? lead.site : `https://${lead.site}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 transition-colors truncate max-w-[140px]"
              title={lead.site}
            >
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate">{lead.site.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
            </a>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusDropdown lead={lead} onUpdate={onUpdate} />
      </td>

      {/* Observação */}
      <td className="px-4 py-3 min-w-[200px] max-w-[260px]">
        {editObs ? (
          <div className="flex flex-col gap-1.5">
            <textarea
              autoFocus
              rows={2}
              className="w-full text-xs border border-gray-200 rounded-xl px-3 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setEditObs(false) }}
            />
            <div className="flex gap-1.5">
              <button
                onClick={saveObs}
                disabled={savingObs}
                className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#7C3AED] text-white hover:opacity-90"
              >
                {savingObs ? "..." : "Salvar"}
              </button>
              <button
                onClick={() => { setEditObs(false); setObs(lead.observacao ?? "") }}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditObs(true)}
            className="text-left text-xs text-gray-500 hover:text-gray-800 leading-snug transition-colors w-full group/obs"
          >
            {lead.observacao ? (
              <span className="line-clamp-2">{lead.observacao}</span>
            ) : (
              <span className="italic text-gray-300 group-hover/obs:text-gray-500">
                Clique para adicionar observação...
              </span>
            )}
          </button>
        )}
      </td>

      {/* Data + ações */}
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end gap-2">
          <span className="text-[10px] text-gray-400">
            {new Date(lead.created_at).toLocaleDateString("pt-BR")}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(lead)}
              className="p-1 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors"
              title="Editar lead"
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Excluir "${lead.nome}"?`)) onDelete(lead.id)
              }}
              className="p-1 rounded-lg hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors"
              title="Excluir lead"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ─── Painel principal (após login) ─────────────────────────────────────────────

function LeadsDashboard({ onLogout }: { onLogout: () => void }) {
  const [leads, setLeads]               = useState<Lead[]>([])
  const [loading, setLoading]           = useState(true)
  const [modalLead, setModalLead]       = useState<Lead | null | undefined>(undefined)
  const [showMapsModal, setShowMapsModal] = useState(false)

  const [search,       setSearch]       = useState("")
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "">("")
  const [filterCidade, setFilterCidade] = useState("")
  const [filterEstado, setFilterEstado] = useState("")

  const fileRef   = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  async function loadLeads() {
    setLoading(true)
    try {
      const data = await listLeads(LEADS_OWNER_ID)
      setLeads(data)
    } catch {
      toast.error("Erro ao carregar leads")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeads()
  }, [])

  const stats = useMemo(() => ({
    total:      leads.length,
    novos:      leads.filter((l) => l.status === "novo").length,
    contatados: leads.filter((l) => l.status === "contatado").length,
    testando:   leads.filter((l) => l.status === "testando").length,
    clientes:   leads.filter((l) => l.status === "cliente").length,
  }), [leads])

  const filtered = useMemo(() => {
    let list = leads
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (l) =>
          l.nome.toLowerCase().includes(q) ||
          (l.telefone ?? "").includes(q) ||
          (l.whatsapp ?? "").includes(q) ||
          (l.cidade ?? "").toLowerCase().includes(q)
      )
    }
    if (filterStatus) list = list.filter((l) => l.status === filterStatus)
    if (filterCidade.trim()) list = list.filter((l) => (l.cidade ?? "").toLowerCase().includes(filterCidade.toLowerCase()))
    if (filterEstado.trim()) list = list.filter((l) => (l.estado ?? "").toUpperCase() === filterEstado.toUpperCase())
    return list
  }, [leads, search, filterStatus, filterCidade, filterEstado])

  const cidades = useMemo(() => [...new Set(leads.map((l) => l.cidade).filter(Boolean))].sort() as string[], [leads])
  const estados = useMemo(() => [...new Set(leads.map((l) => l.estado).filter(Boolean))].sort() as string[], [leads])

  function handleUpdate(updated: Lead) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
  }

  async function handleDelete(id: string) {
    try {
      await deleteLead(id)
      setLeads((prev) => prev.filter((l) => l.id !== id))
      toast.success("Lead excluído")
    } catch {
      toast.error("Erro ao excluir lead")
    }
  }

  function handleSaved(lead: Lead) {
    setLeads((prev) => {
      const exists = prev.find((l) => l.id === lead.id)
      if (exists) return prev.map((l) => (l.id === lead.id ? lead : l))
      return [lead, ...prev]
    })
    setModalLead(undefined)
  }

  async function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    setImporting(true)
    try {
      const text = await file.text()
      const result = await importLeadsFromCSV(text, LEADS_OWNER_ID)
      await loadLeads()
      toast.success(
        `✅ ${result.imported} importados · ${result.duplicates} duplicatas ignoradas`,
        { duration: 5000 }
      )
    } catch (e: any) {
      toast.error(e?.message || "Erro ao importar CSV")
    } finally {
      setImporting(false)
    }
  }

  const hasFilters = search || filterStatus || filterCidade || filterEstado

  return (
    <div className="min-h-screen bg-[#F4F7F8]">
      {/* Header fixo do Portal Comercial */}
      <div className="bg-[#0D2329] border-b border-[#193F4A] px-4 sm:px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#7C3AED] flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.3)]">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white flex items-center gap-1.5">
              Evolu<span className="text-[#A855F7]">IA</span> · Prospecção
            </h1>
            <p className="text-[10px] text-[#7EA2AA] font-bold">Portal Comercial de Leads</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadLeads()}
            title="Atualizar lista"
            className="p-2 rounded-xl text-[#7EA2AA] hover:text-white hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        
        {/* Barra de Ações Rápidas */}
        <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-3.5 rounded-3xl border border-gray-100 shadow-xs">
          <div>
            <h2 className="text-sm font-black text-[#0D2329] flex items-center gap-2">
              🎯 Gestão de Leads
            </h2>
            <p className="text-xs text-gray-500">Busque novas psicopedagogas no Google Maps ou importe contatos</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* BOTÃO GOOGLE MAPS EM DESTAQUE */}
            <button
              onClick={() => setShowMapsModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-[#10B981] to-[#059669] text-white hover:opacity-95 shadow-md shadow-emerald-500/20 transition-all active:scale-98"
            >
              <Map className="w-4 h-4" />
              Buscar no Google Maps
            </button>

            {/* Importar CSV */}
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold border border-gray-200 text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-60"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Importar CSV
            </button>

            {/* Novo Lead Manual */}
            <button
              onClick={() => setModalLead(null)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white hover:opacity-90 shadow-md shadow-[#7C3AED]/25 transition-all active:scale-98"
            >
              <Plus className="w-4 h-4" />
              Novo Lead
            </button>
          </div>
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total",      value: stats.total,      emoji: "📊", color: "text-gray-700",   bg: "bg-white" },
            { label: "Novos",      value: stats.novos,      emoji: "🟡", color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "Contatados", value: stats.contatados, emoji: "🔵", color: "text-blue-600",   bg: "bg-blue-50" },
            { label: "Testando",   value: stats.testando,   emoji: "🟠", color: "text-orange-600", bg: "bg-orange-50" },
            { label: "Clientes",   value: stats.clientes,   emoji: "🟢", color: "text-green-600",  bg: "bg-green-50" },
          ].map(({ label, value, emoji, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl border border-gray-100 shadow-xs px-4 py-3`}>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{emoji} {label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs px-4 py-3 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
              placeholder="Pesquisar por nome, telefone ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select
              className="pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none appearance-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as LeadStatus | "")}
            >
              <option value="">Todos os status</option>
              {ALL_STATUSES.map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          <select
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none"
            value={filterCidade}
            onChange={(e) => setFilterCidade(e.target.value)}
          >
            <option value="">Todas as cidades</option>
            {cidades.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none"
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
          >
            <option value="">Todos os estados</option>
            {estados.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>

          {hasFilters && (
            <button
              onClick={() => { setSearch(""); setFilterStatus(""); setFilterCidade(""); setFilterEstado("") }}
              className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 px-2 py-2 rounded-xl hover:bg-gray-50"
            >
              <X className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
        </div>

        {/* Tabela de Leads */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span className="text-sm font-bold">Carregando leads...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              {leads.length === 0 ? (
                <>
                  <div className="text-4xl">🗺️</div>
                  <p className="font-black text-gray-600 text-sm">Nenhum lead na sua lista ainda</p>
                  <p className="text-xs text-gray-400 max-w-sm text-center">
                    Clique no botão verde abaixo para buscar psicopedagogas no Google Maps e adicioná-las com 1 clique!
                  </p>
                  <button
                    onClick={() => setShowMapsModal(true)}
                    className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-[#10B981] to-[#059669] text-white hover:opacity-95 shadow-md"
                  >
                    <Map className="w-4 h-4" /> Buscar no Google Maps
                  </button>
                </>
              ) : (
                <>
                  <div className="text-4xl">🔍</div>
                  <p className="font-black text-gray-500">Nenhum lead encontrado com esses filtros</p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="px-4 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wide">Lead / Clínica</th>
                    <th className="px-4 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wide">Ação Rápida WhatsApp</th>
                    <th className="px-4 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wide">Observação</th>
                    <th className="px-4 py-3 text-right text-[11px] font-black text-gray-400 uppercase tracking-wide">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => (
                    <LeadRow
                      key={lead.id}
                      lead={lead}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      onEdit={(l) => setModalLead(l)}
                    />
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 font-bold text-right">
                {filtered.length === leads.length
                  ? `${leads.length} leads no total`
                  : `${filtered.length} de ${leads.length} leads filtrados`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Busca no Google Maps */}
      {showMapsModal && (
        <GoogleMapsModal
          existingLeads={leads}
          onClose={() => setShowMapsModal(false)}
          onImported={async () => {
            await loadLeads()
          }}
        />
      )}

      {/* Modal de Criação / Edição Manual */}
      {modalLead !== undefined && (
        <LeadModal
          lead={modalLead}
          onClose={() => setModalLead(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

// ─── Componente Principal Exportado ───────────────────────────────────────────

export function LeadsPage() {
  const [hasAccess, setHasAccess] = useState<boolean>(() => checkLeadsSession())

  function handleLogin() {
    setHasAccess(true)
  }

  function handleLogout() {
    clearLeadsSession()
    setHasAccess(false)
  }

  if (!hasAccess) {
    return <LeadsLoginScreen onSuccess={handleLogin} />
  }

  return <LeadsDashboard onLogout={handleLogout} />
}
