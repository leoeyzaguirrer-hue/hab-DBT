/**
 * Frase de recuperación BIP39.
 *
 * Se genera al registrarse — el usuario DEBE anotarla.
 * Si pierde contraseña Y frase → los datos cifrados quedan inaccesibles para siempre.
 *
 * Flujo:
 * 1. generateRecoveryPhrase() → muestra 12 palabras al usuario
 * 2. Usuario las anota y confirma 3 palabras al azar (verificación)
 * 3. keyFromRecoveryPhrase() → deriva la llave privada original para recuperación
 */

import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39'

/**
 * Genera una frase mnemónica de 12 palabras (128 bits de entropía).
 * Usa la lista de palabras estándar BIP39 en inglés.
 */
export function generateRecoveryPhrase(): string {
  return generateMnemonic(128) // 128 bits → 12 palabras
}

/**
 * Valida que una frase tenga formato BIP39 correcto.
 */
export function validateRecoveryPhrase(phrase: string): boolean {
  return validateMnemonic(phrase.trim().toLowerCase())
}

/**
 * Deriva una semilla de 32 bytes desde la frase de recuperación.
 * Esta semilla se puede usar para re-cifrar la llave privada en caso de pérdida de contraseña.
 *
 * NUNCA almacenar la semilla — derivarla solo cuando sea necesario y limpiarla después.
 */
export function keyFromRecoveryPhrase(phrase: string): Uint8Array | null {
  const clean = phrase.trim().toLowerCase()
  if (!validateMnemonic(clean)) return null

  // Tomar los primeros 32 bytes del seed BIP39 (512 bits totales)
  const seed = mnemonicToSeedSync(clean)
  return seed.slice(0, 32)
}

/**
 * Verifica que el usuario anotó correctamente la frase.
 * Retorna 3 índices aleatorios para que el usuario complete las palabras.
 */
export function getVerificationIndices(phrase: string): number[] {
  const words = phrase.split(' ')
  const total = words.length
  const indices = new Set<number>()
  while (indices.size < 3) {
    indices.add(Math.floor(Math.random() * total))
  }
  return Array.from(indices).sort((a, b) => a - b)
}

/**
 * Verifica que el usuario ingresó correctamente las palabras en las posiciones indicadas.
 */
export function verifyRecoveryWords(
  phrase: string,
  indices: number[],
  answers: string[]
): boolean {
  const words = phrase.split(' ')
  return indices.every((idx, i) => words[idx]?.toLowerCase() === answers[i]?.toLowerCase().trim())
}
