export function maskPII(text: string): string {
  if (!text) return text;

  let masked = text;

  // 1. Email Addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;
  masked = masked.replace(emailRegex, '[EMAIL REDACTED]');

  // 2. Phone Numbers (Simple international formats, e.g., +1-800... or (123) 456-7890)
  const phoneRegex = /\b(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})\b/g;
  masked = masked.replace(phoneRegex, '[PHONE REDACTED]');

  // 3. Social Security Numbers (SSN) -> XXX-XX-XXXX
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  masked = masked.replace(ssnRegex, '[SSN REDACTED]');

  // 4. Common API Keys (e.g. JWTs, Bearer Tokens, standard Sk- prefixes, generic 32+ hex strings)
  const bearerRegex = /\bBearer\s+[A-Za-z0-9\-\._~\+\/]+=*/gi;
  masked = masked.replace(bearerRegex, 'Bearer [TOKEN REDACTED]');

  const skRegex = /\b(sk-[a-zA-Z0-9]{20,})\b/g;
  masked = masked.replace(skRegex, '[API KEY REDACTED]');

  // Generic UUIDs (sometimes leak IDs or auth codes)
  const uuidRegex = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
  masked = masked.replace(uuidRegex, '[UUID REDACTED]');

  return masked;
}
