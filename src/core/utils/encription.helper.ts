// src/core/utils/encryption.ts

import crypto from "crypto-js";

// Read from env
const encryptionKey = process.env.ENCRYPTION_KEY;

if (!encryptionKey) {
  throw new Error("❌ ENCRYPTION_KEY is not defined in environment.");
}

/**
 * Encrypts a string using AES and the shared secret key from .env
 */
export const encryptData = (data: string): string => {
  return crypto.AES.encrypt(data, encryptionKey).toString();
};

/**
 * Decrypts a previously encrypted string using AES and the shared secret key.
 */
export const decryptData = (encrypted: string): string => {
  const bytes = crypto.AES.decrypt(encrypted, encryptionKey);
  return bytes.toString(crypto.enc.Utf8);
};
