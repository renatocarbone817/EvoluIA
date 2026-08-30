/**
 * RATE LIMITER DE SEGURANÇA — EVOLUIA
 * Proteção ativa contra ataques de força bruta e adivinhação de senhas
 */

const STORAGE_PREFIX = "evoluia_rl_"
const DEFAULT_MAX_ATTEMPTS = 5
const DEFAULT_LOCKOUT_MS = 15 * 60 * 1000 // 15 minutos

interface RateLimitRecord {
  attempts: number
  lockedUntil: number | null
  firstAttemptAt: number
}

function getRecord(key: string): RateLimitRecord {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
    if (!raw) {
      return { attempts: 0, lockedUntil: null, firstAttemptAt: Date.now() }
    }
    const parsed = JSON.parse(raw) as RateLimitRecord
    // Limpeza de bloqueio expirado
    if (parsed.lockedUntil && Date.now() > parsed.lockedUntil) {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
      return { attempts: 0, lockedUntil: null, firstAttemptAt: Date.now() }
    }
    return parsed
  } catch {
    return { attempts: 0, lockedUntil: null, firstAttemptAt: Date.now() }
  }
}

function saveRecord(key: string, record: RateLimitRecord): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(record))
  } catch {}
}

/**
 * Verifica se a chave fornecida está atualmente bloqueada por excesso de tentativas
 */
export function checkRateLimit(
  key: string,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  lockoutMs = DEFAULT_LOCKOUT_MS
): {
  isLocked: boolean
  remainingAttempts: number
  lockoutRemainingSeconds: number
} {
  const normalizedKey = key.trim().toLowerCase()
  const record = getRecord(normalizedKey)
  const now = Date.now()

  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000)
    return {
      isLocked: true,
      remainingAttempts: 0,
      lockoutRemainingSeconds: remainingSeconds,
    }
  }

  const remaining = Math.max(0, maxAttempts - record.attempts)
  return {
    isLocked: false,
    remainingAttempts: remaining,
    lockoutRemainingSeconds: 0,
  }
}

/**
 * Registra uma tentativa com falha. Se atingir o limite, aplica o bloqueio temporário
 */
export function recordFailedAttempt(
  key: string,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  lockoutMs = DEFAULT_LOCKOUT_MS
): {
  isLocked: boolean
  remainingAttempts: number
  lockoutRemainingSeconds: number
} {
  const normalizedKey = key.trim().toLowerCase()
  const record = getRecord(normalizedKey)
  const now = Date.now()

  // Se já estava bloqueado e não expirou
  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000)
    return {
      isLocked: true,
      remainingAttempts: 0,
      lockoutRemainingSeconds: remainingSeconds,
    }
  }

  const newAttempts = record.attempts + 1
  if (newAttempts >= maxAttempts) {
    const lockedUntil = now + lockoutMs
    saveRecord(normalizedKey, {
      attempts: newAttempts,
      lockedUntil,
      firstAttemptAt: record.firstAttemptAt,
    })
    return {
      isLocked: true,
      remainingAttempts: 0,
      lockoutRemainingSeconds: Math.ceil(lockoutMs / 1000),
    }
  }

  saveRecord(normalizedKey, {
    attempts: newAttempts,
    lockedUntil: null,
    firstAttemptAt: record.firstAttemptAt,
  })

  return {
    isLocked: false,
    remainingAttempts: maxAttempts - newAttempts,
    lockoutRemainingSeconds: 0,
  }
}

/**
 * Reseta o contador após uma autenticação bem-sucedida
 */
export function clearRateLimit(key: string): void {
  try {
    const normalizedKey = key.trim().toLowerCase()
    localStorage.removeItem(`${STORAGE_PREFIX}${normalizedKey}`)
  } catch {}
}

/**
 * Formata os segundos restantes em minutos e segundos legíveis (ex: "14m 30s")
 */
export function formatLockoutRemaining(seconds: number): string {
  if (seconds <= 0) return "0s"
  const minutes = Math.floor(seconds / 60)
  const remainingSecs = seconds % 60
  if (minutes === 0) return `${remainingSecs}s`
  return `${minutes}m ${remainingSecs.toString().padStart(2, "0")}s`
}
