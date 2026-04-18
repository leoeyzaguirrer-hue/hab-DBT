/**
 * Llave de sesión compartida (AES-256 / XSalsa20).
 *
 * Se genera una llave por cada relación terapeuta-consultante.
 * Esa llave se cifra con la llave pública de cada uno (sealed box X25519).
 * Cada parte descifra su copia con su llave privada.
 *
 * El servidor solo ve datos cifrados — nunca la llave en plano.
 */

import _sodium from 'libsodium-wrappers'

async function getSodium() {
  await _sodium.ready
  return _sodium
}

/**
 * Genera una llave simétrica aleatoria de 32 bytes (256 bits).
 * Se usa para cifrar diary_cards, mensajes y tareas.
 */
export async function generateSessionKey(): Promise<string> {
  const sodium = await getSodium()
  const key = sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES) // 32 bytes
  return sodium.to_base64(key)
}

/**
 * Cifra la llave de sesión para un destinatario específico usando su llave pública.
 * Usa crypto_box_seal (sealed box) — el remitente es anónimo.
 *
 * El resultado se guarda en la DB: therapist_client_relationships.shared_encryption_key
 * (un campo por cada parte de la relación)
 */
export async function encryptSessionKeyFor(
  sessionKeyB64: string,
  recipientPublicKeyB64: string
): Promise<string> {
  const sodium = await getSodium()
  const sessionKey = sodium.from_base64(sessionKeyB64)
  const recipientPublicKey = sodium.from_base64(recipientPublicKeyB64)

  // crypto_box_seal usa X25519 + XSalsa20-Poly1305 con llave efímera
  const sealed = sodium.crypto_box_seal(sessionKey, recipientPublicKey)
  return sodium.to_base64(sealed)
}

/**
 * Descifra la llave de sesión usando la llave privada del destinatario.
 * Requiere tanto la llave privada como la pública del mismo usuario.
 *
 * Retorna null si falla (llave incorrecta o datos corruptos).
 */
export async function decryptSessionKey(
  encryptedB64: string,
  userPublicKeyB64: string,
  userPrivateKeyB64: string
): Promise<string | null> {
  const sodium = await getSodium()
  try {
    const encrypted = sodium.from_base64(encryptedB64)
    const publicKey = sodium.from_base64(userPublicKeyB64)
    const privateKey = sodium.from_base64(userPrivateKeyB64)

    const decrypted = sodium.crypto_box_seal_open(encrypted, publicKey, privateKey)
    return sodium.to_base64(decrypted)
  } catch {
    return null
  }
}
