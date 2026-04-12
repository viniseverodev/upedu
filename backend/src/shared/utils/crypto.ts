// AES-256-GCM — criptografia para CPF/RG (LGPD)
// Chave de 32 bytes via variável de ambiente ENCRYPTION_KEY (gerenciada pelo Doppler)
// Formato armazenado: IV (16 bytes) + TAG (16 bytes) + ENCRYPTED (n bytes) → BYTEA no PostgreSQL

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY não configurada');
  return Buffer.from(key, 'hex');
}

export function encrypt(text: string): Buffer {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: IV (16) + TAG (16) + ENCRYPTED
  return Buffer.concat([iv, tag, encrypted]);
}

export function decrypt(data: Buffer): string {
  const iv = data.subarray(0, 16);
  const tag = data.subarray(16, 32);
  const encrypted = data.subarray(32);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

export function maskCpf(cpf: string): string {
  return cpf.replace(/(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/, '•••.$2.•••-••');
}

export function maskRg(rg: string): string {
  return rg.replace(/.(?=.{3})/g, '•');
}
