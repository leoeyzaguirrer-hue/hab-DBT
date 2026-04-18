import { describe, it, expect } from 'vitest'
import { generateSessionKey } from '@/lib/crypto/session'
import { encryptData } from '@/lib/crypto/encrypt'
import { decryptData } from '@/lib/crypto/decrypt'
import type { DiaryCardData } from '@/types/database'

describe('encryptData / decryptData', () => {
  it('cifra y descifra un objeto correctamente', async () => {
    const sessionKey = await generateSessionKey()
    const original = { name: 'test', value: 42, nested: { ok: true } }

    const { ciphertext, iv } = await encryptData(original, sessionKey)
    const recovered = await decryptData<typeof original>(ciphertext, iv, sessionKey)

    expect(recovered).toEqual(original)
  })

  it('cifra datos de tarjeta diaria (DiaryCardData)', async () => {
    const sessionKey = await generateSessionKey()
    const diary: DiaryCardData = {
      emotions: { tristeza: 7, ansiedad: 5 },
      urges: { autolesion: 2 },
      skills_used: ['TIPP', 'ACCEPTS'],
      skill_effectiveness: 7,
      notes: 'Fue un día difícil pero usé las habilidades.',
    }

    const { ciphertext, iv } = await encryptData(diary, sessionKey)

    // El ciphertext no contiene los datos en plano
    const decoded = Buffer.from(ciphertext, 'base64').toString('utf8')
    expect(decoded).not.toContain('tristeza')
    expect(decoded).not.toContain('TIPP')

    const recovered = await decryptData<DiaryCardData>(ciphertext, iv, sessionKey)
    expect(recovered).toEqual(diary)
  })

  it('retorna null con llave incorrecta', async () => {
    const key1 = await generateSessionKey()
    const key2 = await generateSessionKey()
    const { ciphertext, iv } = await encryptData({ secret: 'data' }, key1)

    const result = await decryptData(ciphertext, iv, key2)
    expect(result).toBeNull()
  })

  it('retorna null con IV incorrecto', async () => {
    const key = await generateSessionKey()
    const { ciphertext } = await encryptData({ test: 1 }, key)
    const { iv: wrongIv } = await encryptData({ other: 2 }, key)

    const result = await decryptData(ciphertext, wrongIv, key)
    expect(result).toBeNull()
  })

  it('el ciphertext es diferente para el mismo dato (IV aleatorio)', async () => {
    const key = await generateSessionKey()
    const data = { same: 'content' }

    const e1 = await encryptData(data, key)
    const e2 = await encryptData(data, key)

    expect(e1.ciphertext).not.toBe(e2.ciphertext)
    expect(e1.iv).not.toBe(e2.iv)
  })
})

describe('recovery phrase', () => {
  it('genera frases válidas de 12 palabras', async () => {
    const { generateRecoveryPhrase, validateRecoveryPhrase } = await import('@/lib/crypto/recovery')
    const phrase = generateRecoveryPhrase()
    const words = phrase.split(' ')

    expect(words).toHaveLength(12)
    expect(validateRecoveryPhrase(phrase)).toBe(true)
  })

  it('frases únicas cada vez', async () => {
    const { generateRecoveryPhrase } = await import('@/lib/crypto/recovery')
    const p1 = generateRecoveryPhrase()
    const p2 = generateRecoveryPhrase()
    expect(p1).not.toBe(p2)
  })

  it('rechaza frases inválidas', async () => {
    const { validateRecoveryPhrase } = await import('@/lib/crypto/recovery')
    expect(validateRecoveryPhrase('estas palabras no son bip39 válidas hola mundo prueba test')).toBe(false)
    expect(validateRecoveryPhrase('')).toBe(false)
  })
})
