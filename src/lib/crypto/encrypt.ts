/**
 * Cifrado simétrico de datos con XSalsa20-Poly1305 (libsodium secretbox).
 *
 * Equivalente en seguridad a AES-256-GCM pero más rápido y resistente a
 * ataques de tiempo. El IV (nonce) se genera aleatoriamente cada vez.
 *
 * Uso:
 *   const sessionKey = await decryptSessionKey(...)
 *   const { ciphertext, iv } = await encryptData(diaryData, sessionKey)
 *   // Guardar ciphertext + iv en la DB, sessionKey solo en memoria
 */

import _sodium from 'libsodium-wrappers'

async function getSodium() {
  await _sodium.ready
  return _sodium
}

export interface EncryptedPayload {
  ciphertext: string // base64
  iv: string         // base64 — nonce aleatorio, único por cifrado
}

/**
 * Cifra un objeto JS con la llave de sesión.
 * El objeto se serializa a JSON antes de cifrar.
 *
 * @param data - Cualquier objeto serializable (DiaryCardData, CrisisPlanData, etc.)
 * @param sessionKeyB64 - Llave de sesión en base64
 */
export async function encryptData(
  data: unknown,
  sessionKeyB64: string
): Promise<EncryptedPayload> {
  const sodium = await getSodium()

  const key = sodium.from_base64(sessionKeyB64)
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES) // 24 bytes aleatorios
  const plaintext = new TextEncoder().encode(JSON.stringify(data))

  const ciphertext = sodium.crypto_secretbox_easy(plaintext, nonce, key)

  return {
    ciphertext: sodium.to_base64(ciphertext),
    iv: sodium.to_base64(nonce),
  }
}
