/**
 * Módulo de criptografía — punto de entrada unificado.
 *
 * Niveles de cifrado:
 *   Nivel 1 → HTTPS + Supabase DB encryption (automático)
 *   Nivel 2 → E2EE con llave compartida: diary cards, mensajes, tareas
 *   Nivel 3 → E2EE solo consultante: plan de crisis
 */

export { generateKeyPair, encryptPrivateKey, decryptPrivateKey } from './keys'
export type { KeyPair, EncryptedPrivateKey } from './keys'

export {
  generateRecoveryPhrase,
  validateRecoveryPhrase,
  keyFromRecoveryPhrase,
  getVerificationIndices,
  verifyRecoveryWords,
} from './recovery'

export { generateSessionKey, encryptSessionKeyFor, decryptSessionKey } from './session'

export { encryptData } from './encrypt'
export type { EncryptedPayload } from './encrypt'

export { decryptData } from './decrypt'

export {
  storeEncryptedPrivateKey,
  getEncryptedPrivateKey,
  storePublicKey,
  getPublicKey,
  clearDeviceData,
  hasPrivateKey,
} from './storage'
