import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Search,
  Calendar,
  Plus,
  UserPlus,
  CalendarPlus,
  FilePlus,
  Sparkles,
  BookPlus,
  ChevronDown,
  X,
} from "lucide-react"
import { Breadcrumb } from "./Breadcrumb"
import { NotificationCenter } from "./NotificationCenter"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"

export function TopHeader() {
  const navigate = useNavigate()
  const { professional, user } = useAuthStore()
  const profId = professional?.id || user?.id

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [menuNovoOpen, setMenuNovoOpen] = useState(false)
  const menuNovoRef = useRef<HTMLDivElement>(null)

  // Close "+ Novo" dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuNovoRef.current && !menuNovoRef.current.contains(event.target as Node)) {
        setMenuNovoOpen(false)
      }
    }
    if (menuNovoOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [menuNovoOpen])

  // Keyboard shortcut ⌘K or Ctrl+K to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        document.getElementById("global-search-input")?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  async function handleFastSearch(query: string) {
    setSearchQuery(query)
    if (!query.trim() || !profId) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      const { data } = await supabase
        .from("children")
        .select("id, full_name, photo_url, school, status")
        .eq("professional_id", profId)
        .ilike("full_name", `%${query.trim()}%`)
        .limit(5)

      setSearchResults(data || [])
    } finally {
      setSearchLoading(false)
    }
  }

  return (
    <header className="hidden md:flex sticky top-0 z-50 h-16 bg-white/95 backdrop-blur-md border-b-2 border-[#D8E5E7] px-6 items-center justify-between shadow-2xs gap-4">
      {/* 1. Left / Center: Global Search Bar */}
      <div className="flex-1 max-w-xl relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8CAAB1]" />
          <input
            id="global-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => handleFastSearch(e.target.value)}
            placeholder="Buscar paciente, avaliação, atividade..."
            className="w-full pl-10 pr-12 py-2 rounded-xl border-2 border-[#D8E5E7] bg-[#F7FAFA] hover:bg-white focus:bg-white text-xs font-semibold text-[#0D2329] placeholder:text-[#8CAAB1] focus:outline-none focus:border-[#00B4D8] transition-all shadow-2xs"
          />
          {searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery("")
                setSearchResults([])
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8CAAB1] hover:text-[#0D2329]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-bold text-[#8CAAB1] bg-white border border-[#D8E5E7] rounded-md shadow-2xs">
              ⌘ K
            </kbd>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchQuery.trim() && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border-2 border-[#D8E5E7] shadow-xl overflow-hidden z-50 divide-y divide-[#EEF5F6] animate-in fade-in-50">
            {searchLoading ? (
              <div className="p-4 text-center text-xs text-[#8CAAB1]">Buscando pacientes...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#8CAAB1]">Nenhum paciente encontrado para "{searchQuery}"</div>
            ) : (
              searchResults.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    navigate(`/criancas/${c.id}`)
                    setSearchQuery("")
                    setSearchResults([])
                  }}
                  className="p-3 hover:bg-[#F7FAFA] cursor-pointer flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#E0F4F0] text-[#00A896] flex items-center justify-center font-black text-xs shrink-0">
                      {c.full_name?.charAt(0) || "P"}
                    </div>
                    <p className="text-xs font-black text-[#0D2329] truncate">{c.full_name}</p>
                  </div>
                  <span className="text-[10px] text-[#00B4D8] font-bold bg-[#EAF8FC] px-2 py-0.5 rounded-md">
                    Ver Ficha →
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 2. Right: Calendar, Notification Center & "+ Novo" Button */}
      <div className="flex items-center gap-3">
        {/* Quick Calendar Button */}
        <button
          onClick={() => navigate("/agenda")}
          className="p-2 rounded-xl text-[#556A72] hover:text-[#0D2329] hover:bg-[#EEF5F6] border border-[#D8E5E7] bg-white transition-all shadow-2xs active:scale-95 flex items-center justify-center"
          title="Ver Agenda"
        >
          <Calendar className="w-4 h-4" />
        </button>

        {/* Central de Notificações (Sino) */}
        <NotificationCenter />

        {/* "+ Novo" Quick Action Button with Dropdown */}
        <div className="relative" ref={menuNovoRef}>
          <button
            onClick={() => setMenuNovoOpen(!menuNovoOpen)}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white text-xs font-black flex items-center gap-1.5 shadow-[0_4px_12px_rgba(124,58,237,0.35)] active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Novo</span>
            <ChevronDown className="w-3 h-3 opacity-80" />
          </button>

          {menuNovoOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border-2 border-[#D8E5E7] shadow-xl p-1.5 z-50 space-y-1 animate-in fade-in-50 zoom-in-95">
              <button
                onClick={() => {
                  setMenuNovoOpen(false)
                  navigate("/agenda?novo=true")
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#0D2329] hover:bg-[#F7FAFA] hover:text-[#6366F1] transition-colors text-left"
              >
                <CalendarPlus className="w-4 h-4 text-[#6366F1]" />
                <span>Novo Agendamento</span>
              </button>

              <button
                onClick={() => {
                  setMenuNovoOpen(false)
                  navigate("/criancas?novo=true")
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#0D2329] hover:bg-[#F7FAFA] hover:text-[#00B4D8] transition-colors text-left"
              >
                <UserPlus className="w-4 h-4 text-[#00B4D8]" />
                <span>Novo Paciente</span>
              </button>

              <button
                onClick={() => {
                  setMenuNovoOpen(false)
                  navigate("/relatorios?novo=true")
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#0D2329] hover:bg-[#F7FAFA] hover:text-[#10B981] transition-colors text-left"
              >
                <FilePlus className="w-4 h-4 text-[#10B981]" />
                <span>Nova Avaliação / PEI</span>
              </button>

              <button
                onClick={() => {
                  setMenuNovoOpen(false)
                  navigate("/biblioteca?novo=true")
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#0D2329] hover:bg-[#F7FAFA] hover:text-[#F59E0B] transition-colors text-left"
              >
                <BookPlus className="w-4 h-4 text-[#F59E0B]" />
                <span>Nova Atividade</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
