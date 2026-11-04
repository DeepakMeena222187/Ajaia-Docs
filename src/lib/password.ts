import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

// scrypt parameters follow the OWASP Password Storage Cheat Sheet minimum (N=2^17, r=8, p=1).
const N = 2 ** 17;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 256 * 1024 * 1024;

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  // Refuse parameters outside what we issue, so a tampered hash can't make us burn CPU.
  if (Number(n) !== N || Number(r) !== R || Number(p) !== P) return false;
  const expected = Buffer.from(keyB64, "base64");
  if (expected.length !== KEYLEN) return false;
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), KEYLEN, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });
  return timingSafeEqual(key, expected);
}

// Verified against when the email is unknown, so a login attempt takes the same time
// whether or not the account exists (prevents account enumeration by timing).
let dummyHash: Promise<string> | undefined;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}
