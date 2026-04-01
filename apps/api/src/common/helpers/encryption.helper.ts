import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const VERSION_PREFIX = 'enc:v1:';

function getEncryptionKey(): Buffer {
  const secret = process.env.MESSAGE_ENCRYPTION_KEY || 'mustiq-default-secret-key-32-chars-!!';
  return scryptSync(secret, 'mustiq-salt', 32);
}

/**
 * Encrypts plain text using AES-256-GCM
 * Output format: enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */
export function encrypt(text: string): string {
  if (!text) return text;
  
  const iv = randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return `${VERSION_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts text if it starts with the version prefix.
 * Otherwise returns the text as-is (legacy support).
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText || !encryptedText.startsWith(VERSION_PREFIX)) {
    return encryptedText;
  }
  
  try {
    const parts = encryptedText.replace(VERSION_PREFIX, '').split(':');
    if (parts.length !== 3) return encryptedText;
    
    const [ivHex, tagHex, ciphertextHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('[Encryption] Decryption failed:', err.message);
    return encryptedText;
  }
}
