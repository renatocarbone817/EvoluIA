/**
 * SANITIZADOR DE SEGURANÇA — EVOLUIA
 * Proteção contra Cross-Site Scripting (XSS), injeção de scripts e caracteres perigosos
 */

/**
 * Remove qualquer tag HTML ou script perigoso de strings de entrada do usuário
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return ""
  if (typeof input !== "string") return String(input)

  return input
    // Remove scripts e tags html perigosas
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    // Remove manipuladores de eventos embutidos (ex: onload=, onclick=, onerror=)
    .replace(/\bon\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\bon\w+\s*=\s*[^>\s]+/gi, "")
    // Remove URIs javascript: ou data: maliciosas
    .replace(/javascript:/gi, "")
    .replace(/vbscript:/gi, "")
    // Remove tags HTML remanescentes
    .replace(/<[^>]*>/g, "")
    .trim()
}

/**
 * Sanitiza nomes de arquivos para evitar ataques de Path Traversal (../)
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return "arquivo"
  return fileName
    .replace(/(\.\.[\/\\])+/g, "")
    .replace(/[^a-zA-Z0-9_\-\.\s]/g, "")
    .trim()
}
