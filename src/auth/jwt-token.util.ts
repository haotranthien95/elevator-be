import { createHmac, timingSafeEqual } from 'crypto';

function encodeBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function createSignature(unsignedToken: string, secret: string) {
  return createHmac('sha256', secret).update(unsignedToken).digest('base64url');
}

export function parseJwtExpiresIn(value: string | number | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const raw = String(value ?? '8h').trim().toLowerCase();
  const match = raw.match(/^(\d+)(s|m|h|d)?$/);

  if (!match) {
    return 60 * 60 * 8;
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? 's';

  switch (unit) {
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 60 * 60;
    case 'd':
      return amount * 60 * 60 * 24;
    default:
      return amount;
  }
}

export function signJwtToken(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSeconds: number,
) {
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const unsignedToken = `${encodeBase64Url(JSON.stringify(header))}.${encodeBase64Url(
    JSON.stringify(tokenPayload),
  )}`;

  const signature = createSignature(unsignedToken, secret);
  return `${unsignedToken}.${signature}`;
}

export function verifyJwtToken<T>(token: string, secret: string) {
  const [header, payload, signature] = token.split('.');

  if (!header || !payload || !signature) {
    throw new Error('Malformed token');
  }

  const unsignedToken = `${header}.${payload}`;
  const expectedSignature = createSignature(unsignedToken, secret);
  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid signature');
  }

  const parsedPayload = JSON.parse(decodeBase64Url(payload)) as T & { exp?: number };

  if (
    typeof parsedPayload.exp === 'number' &&
    parsedPayload.exp <= Math.floor(Date.now() / 1000)
  ) {
    throw new Error('Token expired');
  }

  return parsedPayload;
}
