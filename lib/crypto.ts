import crypto from 'crypto'
import { parseEncryptionKeyBase64 } from '@/lib/env'

function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY?.trim() ?? ''
  if (!raw) {
    throw new Error('Missing ENCRYPTION_KEY: set a 32-byte base64 key in .env.')
  }
  return parseEncryptionKeyBase64(raw)
}

export function encryptApiKey(plaintext: string): string {
  if (!plaintext) {
    throw new Error('API key cannot be empty.')
  }
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decryptApiKey(payload: string): string {
  const parts = payload.split(':')
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error('Invalid encrypted API key payload format.')
  }
  const iv = Buffer.from(parts[0], 'base64')
  const tag = Buffer.from(parts[1], 'base64')
  const ciphertext = Buffer.from(parts[2], 'base64')
  if (iv.length !== 12 || tag.length !== 16) {
    throw new Error('Invalid encrypted API key metadata.')
  }
  const key = getEncryptionKey()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf8')
}

export function getKeyLast4(apiKey: string): string {
  const trimmed = apiKey.trim()
  if (trimmed.length <= 4) return trimmed
  return trimmed.slice(-4)
}

export function redactSecret(message: string, secret?: string | null): string {
  if (!secret || secret.length < 4) return message
  return message.split(secret).join('[REDACTED]')
}

