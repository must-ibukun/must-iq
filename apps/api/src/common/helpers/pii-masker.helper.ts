export function maskPII(text: string): { masked: string; detected: boolean } {
  if (!text) return { masked: text, detected: false };

  let masked = text;

  // 1. JWT Tokens (before Bearer, more specific)
  const jwtRegex = /\beyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\b/g;
  masked = masked.replace(jwtRegex, '[JWT REDACTED]');

  // 2. Bearer Tokens
  const bearerRegex = /\bBearer\s+[A-Za-z0-9\-\._~\+\/]+=*/gi;
  masked = masked.replace(bearerRegex, 'Bearer [TOKEN REDACTED]');

  // 3. Credentials embedded in URLs (e.g. postgres://user:pass@host)
  const credUrlRegex = /([a-z][a-z0-9+\-.]*:\/\/)[^:@\s]+:[^@\s]+@/gi;
  masked = masked.replace(credUrlRegex, '$1[CREDENTIALS REDACTED]@');

  // 4. Email Addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;
  masked = masked.replace(emailRegex, '[EMAIL REDACTED]');

  // 5. API Keys — AWS Access Keys
  const awsKeyRegex = /\bAKIA[0-9A-Z]{16}\b/g;
  masked = masked.replace(awsKeyRegex, '[AWS KEY REDACTED]');

  // 6. API Keys — GitHub tokens (ghp_, gho_, ghs_, ghu_, ghr_)
  const ghTokenRegex = /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g;
  masked = masked.replace(ghTokenRegex, '[GH TOKEN REDACTED]');

  // 7. API Keys — Stripe (pk_live_, sk_live_, pk_test_, sk_test_, rk_live_)
  const stripeRegex = /\b(?:pk|sk|rk)_(?:live|test)_[A-Za-z0-9]{24,}\b/g;
  masked = masked.replace(stripeRegex, '[STRIPE KEY REDACTED]');

  // 8. API Keys — OpenAI / generic sk- prefixed keys
  const skRegex = /\b(sk-[a-zA-Z0-9]{20,})\b/g;
  masked = masked.replace(skRegex, '[API KEY REDACTED]');

  // 9. Credit Card Numbers (Visa, MasterCard, Amex, Discover)
  const ccRegex = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g;
  masked = masked.replace(ccRegex, '[CARD REDACTED]');

  // 10. Social Security Numbers (SSN) -> XXX-XX-XXXX
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  masked = masked.replace(ssnRegex, '[SSN REDACTED]');

  // 11. International Phone Numbers (+XX XXXXXXXXXX)
  const intlPhoneRegex = /\+(?:[0-9] ?){6,14}[0-9]\b/g;
  masked = masked.replace(intlPhoneRegex, '[PHONE REDACTED]');

  // 12. US Phone Numbers (e.g. (123) 456-7890 or +1-800-...)
  const phoneRegex = /\b(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})\b/g;
  masked = masked.replace(phoneRegex, '[PHONE REDACTED]');

  // 13. IPv4 Addresses
  const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
  masked = masked.replace(ipv4Regex, '[IP REDACTED]');

  // 14. password/secret/token key=value pairs in logs or query strings
  const secretKvRegex = /\b(password|passwd|secret|token|api_key|apikey|access_key)(\s*[:=]\s*)["']?[^\s"'&,}]{4,}["']?/gi;
  masked = masked.replace(secretKvRegex, '$1$2[REDACTED]');

  // 15. Crypto Wallet Addresses (Ethereum, Bitcoin legacy + bech32)
  const cryptoRegex = /\b(0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})\b/g;
  masked = masked.replace(cryptoRegex, '[WALLET REDACTED]');

  // 16. Generic UUIDs (sometimes leak IDs or auth codes)
  const uuidRegex = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
  masked = masked.replace(uuidRegex, '[UUID REDACTED]');

  return { masked, detected: masked !== text };
}
