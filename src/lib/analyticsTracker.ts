/**
 * ANALYTICS TRACKER — EVOLUIA
 * Coletor 100% real de telemetria de páginas, tráfego e horários de uso
 * SEM dados fictícios ou simulações
 */

export interface PageviewEvent {
  path: string
  timestamp: number
  date: string // YYYY-MM-DD
  hour: number // 0-23
  userEmail?: string
}

const STORAGE_KEY = "evoluia_internal_analytics"

/**
 * Registra a visualização de uma página de forma assíncrona e ultraleve
 */
export function trackPageView(path: string, userEmail?: string) {
  try {
    const now = new Date()
    const dateStr = now.toISOString().split("T")[0]
    const hour = now.getHours()

    const raw = localStorage.getItem(STORAGE_KEY)
    let events: PageviewEvent[] = raw ? JSON.parse(raw) : []

    // Adiciona o novo evento real
    events.push({
      path,
      timestamp: Date.now(),
      date: dateStr,
      hour,
      userEmail: userEmail ? userEmail.trim().toLowerCase() : undefined,
    })

    // Mantém no máximo os últimos 5.000 eventos reais para não sobrecarregar
    if (events.length > 5000) {
      events = events.slice(-5000)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch (e) {
    // Falha silenciosa para nunca atrapalhar a experiência do usuário
  }
}

/**
 * Obtém o último timestamp de acesso real para um determinado e-mail de usuário
 */
export function getLastUserAccessTime(email: string): string | null {
  try {
    const cleanEmail = (email || "").trim().toLowerCase()
    if (!cleanEmail) return null

    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const events: PageviewEvent[] = JSON.parse(raw)
    const userEvents = events.filter((e) => e.userEmail && e.userEmail === cleanEmail)
    if (userEvents.length === 0) return null

    const latest = userEvents.reduce((max, curr) => (curr.timestamp > max.timestamp ? curr : max), userEvents[0])
    return new Date(latest.timestamp).toISOString()
  } catch {
    return null
  }
}

/**
 * Retorna as estatísticas agregadas de tráfego 100% REAIS dos últimos N dias
 * SEM preenchimento artificial
 */
export function getTrafficAnalytics(days: number = 14) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const events: PageviewEvent[] = raw ? JSON.parse(raw) : []

    const now = new Date()
    const dailyMap: Record<string, { date: string; label: string; views: number }> = {}

    // Inicializa os últimos N dias no mapa com 0
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dStr = d.toISOString().split("T")[0]
      const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
      dailyMap[dStr] = { date: dStr, label, views: 0 }
    }

    const pathMap: Record<string, number> = {}
    const hourMap: number[] = new Array(24).fill(0)
    let totalViews = 0

    // Processa EXCLUSIVAMENTE os eventos reais gravados
    events.forEach((ev) => {
      totalViews++
      if (dailyMap[ev.date]) {
        dailyMap[ev.date].views++
      }
      const cleanPath = ev.path.split("?")[0]
      pathMap[cleanPath] = (pathMap[cleanPath] || 0) + 1
      if (ev.hour >= 0 && ev.hour < 24) {
        hourMap[ev.hour]++
      }
    })

    return {
      dailyTraffic: Object.values(dailyMap),
      topPages: Object.entries(pathMap)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count),
      hourlyDistribution: hourMap.map((count, hour) => ({
        hour: `${String(hour).padStart(2, "0")}h`,
        count,
      })),
      totalViews,
      hasData: events.length > 0,
    }
  } catch (e) {
    return {
      dailyTraffic: [],
      topPages: [],
      hourlyDistribution: [],
      totalViews: 0,
      hasData: false,
    }
  }
}
