// src/lib/crypto/phi.ts
import crypto from "node:crypto";

const KEY_HEX = process.env.HIPAA_ENCRYPTION_KEY || ""; // 64 hex chars (32 bytes)
if (process.env.HIPAA_MODE === "true" && KEY_HEX.length !== 64) {
  throw new Error("HIPAA_MODE is true but HIPAA_ENCRYPTION_KEY is missing/invalid (expected 64 hex chars).");
}
const KEY = KEY_HEX ? Buffer.from(KEY_HEX, "hex") : undefined;

export type CipherBundle = { ciphertext: Buffer; iv: Buffer; tag: Buffer; sha256: string };

export function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

export function encryptPHI(plain: string): CipherBundle {
  if (!KEY) throw new Error("Encryption key not configured");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext, iv, tag, sha256: sha256(plain) };
}

export function decryptPHI(bundle: { ciphertext: Buffer; iv: Buffer; tag: Buffer }): string {
  if (!KEY) throw new Error("Encryption key not configured");
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, bundle.iv);
  decipher.setAuthTag(bundle.tag);
  const plain = Buffer.concat([decipher.update(bundle.ciphertext), decipher.final()]);
  return plain.toString("utf8");
}
