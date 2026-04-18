/**
 * Descifrado simétrico de datos con XSalsa20-Poly1305.
 * Par de encrypt.ts — misma llave de sesión, mismo nonce/IV.
 *
 * Los datos se descifran SOLO en memoria del cliente.
 * Nunca persistir el resultado en plano.
 */

import _sodium from 'libsodium-wrappers'

async function getSodium() {
  await _sodium.ready
  return _sodium
}

/**
 * Descifra datos previamente cifrados con encryptData().
 *
 * @param ciphertextB64 - Datos cifrados en base64
 * @param ivB64 - Nonce/IV usado al cifrar, en base64
 * @param sessionKeyB64 - Llave de sesión en base64
 * @returns El objeto original, o null si la llave/IV son incorrectos
 */
export async function decryptData<T = unknown>(
  ciphertextB64: string,
  ivB64: string,
  sessionKeyB64: string
): Promise<T | null> {
  const sodium = await getSodium()

  try {
    const key = sodium.from_base64(sessionKeyB64)
    const nonce = sodium.from_base64(ivB64)
    const ciphertext = sodium.from_base64(ciphertextB64)

    const plaintext = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key)
    const json = new TextDecoder().decode(plaintext)
    return JSON.parse(json) as T
  } catch {
    // Llave incorrecta, IV incorrecto o datos corruptos
    return null
  }
}
