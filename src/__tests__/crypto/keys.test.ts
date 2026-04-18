import { describe, it, expect } from 'vitest'
import { generateKeyPair, encryptPrivateKey, decryptPrivateKey } from '@/lib/crypto/keys'

describe('generateKeyPair', () => {
  it('genera un par de llaves en base64', async () => {
    const pair = await generateKeyPair()
    expect(pair.publicKey).toBeTruthy()
    expect(pair.privateKey).toBeTruthy()
    // X25519 keys son 32 bytes → ~44 chars en base64
    expect(pair.publicKey.length).toBeGreaterThan(30)
    expect(pair.privateKey.length).toBeGreaterThan(30)
  })

  it('genera pares únicos cada vez', async () => {
    const p1 = await generateKeyPair()
    const p2 = await generateKeyPair()
    expect(p1.publicKey).not.toBe(p2.publicKey)
    expect(p1.privateKey).not.toBe(p2.privateKey)
  })
})

describe('encryptPrivateKey / decryptPrivateKey', () => {
  it('cifra y descifra correctamente con la contraseña correcta', async () => {
    const { privateKey } = await generateKeyPair()
    const password = 'MiContraseña-Segura-123!'

    const encrypted = await encryptPrivateKey(privateKey, password)

    expect(encrypted.ciphertext).toBeTruthy()
    expect(encrypted.nonce).toBeTruthy()
    expect(encrypted.salt).toBeTruthy()

    const recovered = await decryptPrivateKey(encrypted, password)
    expect(recovered).toBe(privateKey)
  }, 15000) // argon2 tarda ~1s

  it('retorna null con contraseña incorrecta', async () => {
    const { privateKey } = await generateKeyPair()
    const encrypted = await encryptPrivateKey(privateKey, 'contraseña-correcta-123!')

    const result = await decryptPrivateKey(encrypted, 'contraseña-incorrecta-456!')
    expect(result).toBeNull()
  }, 30000)

  it('el ciphertext es distinto para la misma llave (nonce aleatorio)', async () => {
    const { privateKey } = await generateKeyPair()
    const password = 'MiContraseña-123!'

    const e1 = await encryptPrivateKey(privateKey, password)
    const e2 = await encryptPrivateKey(privateKey, password)

    expect(e1.ciphertext).not.toBe(e2.ciphertext)
    expect(e1.nonce).not.toBe(e2.nonce)
    expect(e1.salt).not.toBe(e2.salt)
  }, 30000)
})
