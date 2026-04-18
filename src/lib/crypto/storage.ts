/**
 * Almacenamiento seguro de llaves en IndexedDB.
 *
 * REGLAS:
 * - Las llaves privadas cifradas van en IndexedDB (persisten entre sesiones)
 * - NUNCA en localStorage (sincrónico, menos seguro, legible por más código)
 * - NUNCA enviar al servidor
 *
 * idb-keyval provee una API simple sobre IndexedDB del navegador.
 * Solo disponible en el cliente (browser) — no funciona en SSR.
 */

import { get, set, del } from 'idb-keyval'
import type { EncryptedPrivateKey } from './keys'

const PREFIX = 'habdbt'

function privateKeyStorageKey(userId: string): string {
  return `${PREFIX}_pk_${userId}`
}

function publicKeyStorageKey(userId: string): string {
  return `${PREFIX}_pub_${userId}`
}

/**
 * Guarda la llave privada cifrada en IndexedDB.
 * Llamar después de encryptPrivateKey() al registrarse o cambiar contraseña.
 */
export async function storeEncryptedPrivateKey(
  userId: string,
  encryptedKey: EncryptedPrivateKey
): Promise<void> {
  await set(privateKeyStorageKey(userId), encryptedKey)
}

/**
 * Recupera la llave privada cifrada desde IndexedDB.
 * Retorna undefined si no existe (dispositivo nuevo, datos borrados).
 */
export async function getEncryptedPrivateKey(
  userId: string
): Promise<EncryptedPrivateKey | undefined> {
  return get<EncryptedPrivateKey>(privateKeyStorageKey(userId))
}

/**
 * Guarda la llave pública en IndexedDB para acceso rápido sin ir al servidor.
 */
export async function storePublicKey(userId: string, publicKeyB64: string): Promise<void> {
  await set(publicKeyStorageKey(userId), publicKeyB64)
}

/**
 * Recupera la llave pública local.
 */
export async function getPublicKey(userId: string): Promise<string | undefined> {
  return get<string>(publicKeyStorageKey(userId))
}

/**
 * Elimina todos los datos del usuario en este dispositivo.
 * Usar al cerrar sesión con "borrar datos del dispositivo".
 * Después de esto, el usuario necesitará su recovery phrase para recuperar acceso.
 */
export async function clearDeviceData(userId: string): Promise<void> {
  await Promise.all([
    del(privateKeyStorageKey(userId)),
    del(publicKeyStorageKey(userId)),
  ])
}

/**
 * Verifica si este dispositivo tiene la llave privada del usuario.
 * Si no la tiene, pedir recovery phrase o contraseña para re-derivarla.
 */
export async function hasPrivateKey(userId: string): Promise<boolean> {
  const key = await getEncryptedPrivateKey(userId)
  return key !== undefined
}
