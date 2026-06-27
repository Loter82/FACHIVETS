import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import type { AppEnv } from '@/config/env.validation';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // GCM рекомендує 96-біт IV
const TAG_LEN = 16;

/**
 * AES-256-GCM шифрування JSON-кредів зовнішніх систем (MSSQL/JSON-агент).
 * Ключ читається з ENCRYPTION_KEY (base64 або hex від 32 байт).
 * Формат cipher: base64( iv || authTag || ciphertext ).
 */
@Injectable()
export class CredentialsCipherService {
  private readonly key: Buffer;

  constructor(config: ConfigService<AppEnv, true>) {
    const raw = config.get('ENCRYPTION_KEY', { infer: true });
    this.key = CredentialsCipherService.deriveKey(raw);
  }

  encrypt<T>(value: T): string {
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const plain = Buffer.from(JSON.stringify(value), 'utf8');
    const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ct]).toString('base64');
  }

  decrypt<T>(cipherText: string): T {
    const buf = Buffer.from(cipherText, 'base64');
    if (buf.length < IV_LEN + TAG_LEN + 1) {
      throw new Error('Невалідний cipher: занадто короткий');
    }
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ct = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv(ALGO, this.key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
    return JSON.parse(plain.toString('utf8')) as T;
  }

  private static deriveKey(raw: string): Buffer {
    const tryBase64 = Buffer.from(raw, 'base64');
    if (tryBase64.length === 32) return tryBase64;
    const tryHex = /^[0-9a-fA-F]+$/.test(raw) ? Buffer.from(raw, 'hex') : null;
    if (tryHex && tryHex.length === 32) return tryHex;
    throw new Error(
      'ENCRYPTION_KEY має бути 32 байти у форматі base64 або hex. Згенеруй: `openssl rand -base64 32`',
    );
  }
}
