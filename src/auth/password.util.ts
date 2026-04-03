import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const HASH_PREFIX = 'scrypt';
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${HASH_PREFIX}:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [prefix, salt, hash] = storedHash.split(':');

  if (prefix !== HASH_PREFIX || !salt || !hash) {
    return password === storedHash;
  }

  const candidate = scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, 'hex');

  if (candidate.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(candidate, expected);
}
