import * as crypto from "crypto-js";

export const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || "must-iq-dev-secret-key-32-chars";

/**
 * crypto-js returns an empty string (or a garbage CipherParams) when
 * the input is plain text (e.g. seeded directly without encryption).
 * In that case we fall back to the raw stored value.
 */
export function tryDecrypt(cipherOrPlain: string): string {
    if (!cipherOrPlain) return cipherOrPlain;
    try {
        const bytes = crypto.AES.decrypt(cipherOrPlain, ENCRYPTION_SECRET);
        const decrypted = bytes.toString(crypto.enc.Utf8);
        return decrypted || cipherOrPlain;
    } catch {
        return cipherOrPlain;
    }
}

export function encryptText(plainText: string): string {
    if (!plainText) return plainText;
    return crypto.AES.encrypt(plainText, ENCRYPTION_SECRET).toString();
}
