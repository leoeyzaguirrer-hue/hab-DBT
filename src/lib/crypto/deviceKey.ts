/**
 * Llave de cifrado por dispositivo (puente hacia E2EE completo).
 *
 * Mientras el flujo E2EE con llave compartida terapeuta-consultante no esté
 * integrado en el registro, se usa una llave aleatoria por dispositivo.
 * Esta llave se genera una vez, se guarda en IndexedDB y se usa para
 * cifrar las tarjetas diarias de ese dispositivo.
 *
 * TODO: reemplazar con decryptSessionKey() cuando el registro genere
 *       llaves asimétricas y la llave compartida esté disponible.
 */

import { get, set } from 'idb-keyval'
import _sodium from 'libsodium-wrappers'

const KEY_PREFIX = 'habdbt_dkey_'

export async function getOrCreateDeviceKey(userId: string): Promise<string> {
  await _sodium.ready
  const storageKey = `${KEY_PREFIX}${userId}`

  const existing = await get<string>(storageKey)
  if (existing) return existing

  // Primera vez en este dispositivo: generar llave aleatoria
  const key = _sodium.to_base64(_sodium.randombytes_buf(32))
  await set(storageKey, key)
  return key
}
