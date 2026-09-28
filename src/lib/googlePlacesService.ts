export interface GooglePlaceResult {
  id: string
  nome: string
  telefone?: string | null
  whatsapp?: string | null
  endereco?: string | null
  cidade?: string | null
  estado?: string | null
  site?: string | null
  rating?: number | null
  userRatingCount?: number | null
  alreadyImported?: boolean
}

const GOOGLE_KEY_STORAGE = "evoluia_google_places_api_key"

export function getStoredGoogleKey(): string {
  try {
    return localStorage.getItem(GOOGLE_KEY_STORAGE) || ""
  } catch {
    return ""
  }
}

export function saveStoredGoogleKey(key: string) {
  try {
    localStorage.setItem(GOOGLE_KEY_STORAGE, key.trim())
  } catch (e) {
    console.warn("Could not save Google key:", e)
  }
}

/**
 * Busca estabelecimentos no Google Maps através da Places API (New)
 */
export async function searchGooglePlaces(
  query: string,
  apiKey: string
): Promise<GooglePlaceResult[]> {
  if (!query.trim()) return []
  if (!apiKey.trim()) {
    throw new Error("Chave da Google Places API não informada.")
  }

  const endpoint = "https://places.googleapis.com/v1/places:searchText"

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey.trim(),
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.addressComponents",
    },
    body: JSON.stringify({
      textQuery: query.trim(),
      languageCode: "pt-BR",
      maxResultCount: 20,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    if (response.status === 403 || response.status === 400) {
      throw new Error(
        `Erro na Google API: Verifique se a 'Places API (New)' está ativada no seu Google Cloud e se a chave está correta. (${response.status})`
      )
    }
    throw new Error(`Falha na busca do Google (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  const places = data.places || []

  return places.map((p: any): GooglePlaceResult => {
    // Extrai cidade e estado a partir de addressComponents
    let cidade: string | null = null
    let estado: string | null = null

    if (Array.isArray(p.addressComponents)) {
      for (const comp of p.addressComponents) {
        if (comp.types?.includes("administrative_area_level_2")) {
          cidade = comp.longText || comp.shortText || null
        }
        if (comp.types?.includes("administrative_area_level_1")) {
          estado = comp.shortText || comp.longText || null
        }
      }
    }

    // Fallback: tentar extrair Cidade - UF da string de endereço formatado
    if (!cidade || !estado) {
      const addrStr = p.formattedAddress || ""
      // Padrão comum no Brasil: "..., Cidade - UF, CEP"
      const match = addrStr.match(/,\s*([^,-]+)\s*-\s*([A-Z]{2})\b/)
      if (match) {
        if (!cidade) cidade = match[1].trim()
        if (!estado) estado = match[2].trim()
      }
    }

    const phone = p.nationalPhoneNumber || p.internationalPhoneNumber || null

    return {
      id: p.id,
      nome: p.displayName?.text || "Sem nome",
      telefone: phone,
      whatsapp: phone,
      endereco: p.formattedAddress || null,
      cidade,
      estado,
      site: p.websiteUri || null,
      rating: p.rating || null,
      userRatingCount: p.userRatingCount || null,
    }
  })
}
