import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from 'node:crypto';

const FALLBACK_DEV_SECRET = 'mgd_ephemeral_dev_secret_rotate_in_production_2026';

function getSigningSecret(): string {
  return process.env.APP_SESSION_SECRET || FALLBACK_DEV_SECRET;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  if (!salt || !originalHex) return false;
  try {
    const derived = scryptSync(password, salt, 64);
    const originalBuf = Buffer.from(originalHex, 'hex');
    if (derived.length !== originalBuf.length) return false;
    return timingSafeEqual(derived, originalBuf);
  } catch {
    return false;
  }
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export interface SignedTokenPayload {
  sub: string;
  role?: string;
  purpose: 'session' | 'download' | 'csrf';
  exp: number;
  meta?: Record<string, string | number>;
}

export function signToken(payload: Omit<SignedTokenPayload, 'exp'>, ttlSeconds: number): string {
  const fullPayload: SignedTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), 'utf8').toString('base64url');
  const sig = createHmac('sha256', getSigningSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySignedToken(
  token: string,
  expectedPurpose: SignedTokenPayload['purpose']
): SignedTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;
  const expectedSig = createHmac('sha256', getSigningSecret()).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SignedTokenPayload;
    if (parsed.purpose !== expectedPurpose) return null;
    if (typeof parsed.exp !== 'number' || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function verifyWebhookHmac(rawBody: string, signatureHeader: string, secret: string): boolean {
  if (!secret || !signatureHeader) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = signatureHeader.replace(/^sha256=/i, '').trim();
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function generateReference(prefix: string): string {
  const rand = randomBytes(4).toString('hex').toUpperCase();
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  return `${prefix}-${ts}-${rand}`;
}
