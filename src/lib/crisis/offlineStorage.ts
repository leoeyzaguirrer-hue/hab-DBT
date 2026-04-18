/**
 * Almacenamiento offline del plan de crisis en IndexedDB.
 *
 * El plan se guarda cifrado con la llave de dispositivo, exactamente
 * igual que las tarjetas diarias. Esto permite:
 *   1. Carga instantánea (sin esperar al servidor)
 *   2. Funcionar sin conexión una vez que el plan fue guardado
 *
 * Flujo:
 *   Guardar: encriptar con deviceKey → almacenar en IndexedDB
 *   Cargar:  leer de IndexedDB → desencriptar con deviceKey
 */

import { get, set, del } from 'idb-keyval'
import { getOrCreateDeviceKey } from '@/lib/crypto/deviceKey'
import { encryptData } from '@/lib/crypto/encrypt'
import { decryptData } from '@/lib/crypto/decrypt'
import type { CrisisPlanContent } from './types'

const KEY_PREFIX = 'habdbt_crisis_'

interface StoredCrisisPlan {
  ciphertext: string
  iv: string
  savedAt: string
}

/** Guarda el plan de crisis en IndexedDB (cifrado con llave de dispositivo) */
export async function saveCrisisPlanOffline(
  userId: string,
  plan: CrisisPlanContent
): Promise<void> {
  const key = await getOrCreateDeviceKey(userId)
  const { ciphertext, iv } = await encryptData(plan, key)
  const stored: StoredCrisisPlan = { ciphertext, iv, savedAt: new Date().toISOString() }
  await set(`${KEY_PREFIX}${userId}`, JSON.stringify(stored))
}

/** Carga el plan de crisis desde IndexedDB. Devuelve null si no existe o si falla. */
export async function loadCrisisPlanOffline(
  userId: string
): Promise<CrisisPlanContent | null> {
  try {
    const raw = await get<string>(`${KEY_PREFIX}${userId}`)
    if (!raw) return null

    const { ciphertext, iv } = JSON.parse(raw) as StoredCrisisPlan
    const key = await getOrCreateDeviceKey(userId)
    return await decryptData<CrisisPlanContent>(ciphertext, iv, key)
  } catch {
    return null
  }
}

/** Elimina el plan de crisis de IndexedDB (al hacer logout) */
export async function clearCrisisPlanOffline(userId: string): Promise<void> {
  await del(`${KEY_PREFIX}${userId}`)
}
