/**
 * Gestión de llaves asimétricas (X25519) con libsodium.
 *
 * REGLAS:
 * - La llave pública se sube a profiles.public_key
 * - La llave privada NUNCA sale del dispositivo en texto plano
 * - La llave privada se cifra con argon2id + XSalsa20-Poly1305 antes de guardarse
 */

// libsodium-wrappers-sumo incluye crypto_pwhash (argon2id)
// la versión base (wrappers) no lo trae
import _sodium from 'libsodium-wrappers-sumo'

async function getSodium() {
  await _sodium.ready
  return _sodium
}

export interface EncryptedPrivateKey {
  ciphertext: string // base64
  nonce: string      // base64 — vector de inicialización aleatorio
  salt: string       // base64 — sal para argon2id
}

export interface KeyPair {
  publicKey: string  // base64 — se sube al servidor
  privateKey: string // base64 — solo en memoria, nunca persiste en plano
}

/**
 * Genera un par de llaves X25519 para cifrado asimétrico.
 * crypto_box_keypair usa Curve25519 internamente.
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const sodium = await getSodium()
  const pair = sodium.crypto_box_keypair()
  return {
    publicKey: sodium.to_base64(pair.publicKey),
    privateKey: sodium.to_base64(pair.privateKey),
  }
}

/**
 * Cifra la llave privada con la contraseña del usuario.
 * Usa argon2id para derivar una llave de cifrado desde la contraseña,
 * luego XSalsa20-Poly1305 para cifrar la llave privada.
 *
 * El resultado se guarda en IndexedDB — nunca en texto plano.
 */
export async function encryptPrivateKey(
  privateKeyB64: string,
  password: string
): Promise<EncryptedPrivateKey> {
  const sodium = await getSodium()

  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES)

  // Derivar llave simétrica con argon2id (parámetros interactivos: ~1s, ~64MB RAM)
  const derivedKey = sodium.crypto_pwhash(
    sodium.crypto_secretbox_KEYBYTES,
    password,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  )

  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
  const privateKey = sodium.from_base64(privateKeyB64)
  const ciphertext = sodium.crypto_secretbox_easy(privateKey, nonce, derivedKey)

  return {
    ciphertext: sodium.to_base64(ciphertext),
    nonce: sodium.to_base64(nonce),
    salt: sodium.to_base64(salt),
  }
}

/**
 * Descifra la llave privada usando la contraseña del usuario.
 * Retorna null si la contraseña es incorrecta o los datos están corruptos.
 */
export async function decryptPrivateKey(
  encrypted: EncryptedPrivateKey,
  password: string
): Promise<string | null> {
  const sodium = await getSodium()

  try {
    const derivedKey = sodium.crypto_pwhash(
      sodium.crypto_secretbox_KEYBYTES,
      password,
      sodium.from_base64(encrypted.salt),
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    )

    const decrypted = sodium.crypto_secretbox_open_easy(
      sodium.from_base64(encrypted.ciphertext),
      sodium.from_base64(encrypted.nonce),
      derivedKey
    )

    return sodium.to_base64(decrypted)
  } catch {
    // Contraseña incorrecta o datos corruptos → crypto_secretbox_open_easy lanza excepción
    return null
  }
}
