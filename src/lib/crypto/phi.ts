// src/lib/crypto/phi.ts - Simplified version without encryption for now
import crypto from "node:crypto";

const ENCRYPTION_ENABLED = process.env.HIPAA_MODE === "true" && process.env.HIPAA_ENCRYPTION_KEY;
const KEY_HEX = process.env.HIPAA_ENCRYPTION_KEY || "";
const KEY = KEY_HEX.length === 64 ? Buffer.from(KEY_HEX, "hex") : undefined;

export type CipherBundle = { 
  ciphertext: Buffer; 
  iv: Buffer; 
  tag: Buffer; 
  sha256: string;
};

export function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

export function encryptPHI(plain: string): CipherBundle {
  if (!ENCRYPTION_ENABLED || !KEY) {
    // Store as plain text with dummy crypto fields for compatibility
    const plainBuffer = Buffer.from(plain, "utf8");
    return {
      ciphertext: plainBuffer,
      iv: Buffer.from("000000000000000000000000", "hex"), // dummy IV
      tag: Buffer.from("0000000000000000000000000000000000000000000000000000000000000000", "hex"), // dummy tag
      sha256: sha256(plain)
    };
  }

  // Real encryption when properly configured
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext, iv, tag, sha256: sha256(plain) };
}

export function decryptPHI(bundle: { ciphertext: Buffer; iv: Buffer; tag: Buffer }): string {
  if (!ENCRYPTION_ENABLED || !KEY) {
    // Data is stored as plain text
    return bundle.ciphertext.toString("utf8");
  }

  // Real decryption when properly configured
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, bundle.iv);
  decipher.setAuthTag(bundle.tag);
  const plain = Buffer.concat([decipher.update(bundle.ciphertext), decipher.final()]);
  return plain.toString("utf8");
}