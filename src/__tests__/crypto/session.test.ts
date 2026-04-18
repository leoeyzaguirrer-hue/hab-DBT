import { describe, it, expect } from 'vitest'
import { generateKeyPair } from '@/lib/crypto/keys'
import { generateSessionKey, encryptSessionKeyFor, decryptSessionKey } from '@/lib/crypto/session'

describe('generateSessionKey', () => {
  it('genera una llave de 32 bytes en base64', async () => {
    const key = await generateSessionKey()
    expect(key).toBeTruthy()
    expect(key.length).toBeGreaterThan(30)
  })

  it('genera llaves únicas cada vez', async () => {
    const k1 = await generateSessionKey()
    const k2 = await generateSessionKey()
    expect(k1).not.toBe(k2)
  })
})

describe('encryptSessionKeyFor / decryptSessionKey', () => {
  it('terapeuta puede descifrar la llave cifrada para él', async () => {
    const therapist = await generateKeyPair()
    const sessionKey = await generateSessionKey()

    const encryptedForTherapist = await encryptSessionKeyFor(sessionKey, therapist.publicKey)
    const decrypted = await decryptSessionKey(
      encryptedForTherapist,
      therapist.publicKey,
      therapist.privateKey
    )

    expect(decrypted).toBe(sessionKey)
  })

  it('consultante puede descifrar la llave cifrada para él', async () => {
    const client = await generateKeyPair()
    const sessionKey = await generateSessionKey()

    const encryptedForClient = await encryptSessionKeyFor(sessionKey, client.publicKey)
    const decrypted = await decryptSessionKey(
      encryptedForClient,
      client.publicKey,
      client.privateKey
    )

    expect(decrypted).toBe(sessionKey)
  })

  it('no se puede descifrar con la llave privada incorrecta', async () => {
    const real = await generateKeyPair()
    const other = await generateKeyPair()
    const sessionKey = await generateSessionKey()

    const encryptedForReal = await encryptSessionKeyFor(sessionKey, real.publicKey)
    const result = await decryptSessionKey(encryptedForReal, other.publicKey, other.privateKey)

    expect(result).toBeNull()
  })
})
