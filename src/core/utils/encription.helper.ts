import crypto from "crypto-js";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// 🔄 Ortama özel .env dosyasını yükle
const envProfile = process.env.APP_ENV || "metahub";
const envPath = path.resolve(process.cwd(), `.env.${envProfile}`);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`🔐 Encryption env loaded from ${envPath}`);
} else {
  console.warn(`⚠️ Encryption env file not found: ${envPath}`);
}

const encryptionKey = process.env.ENCRYPTION_KEY;

if (!encryptionKey) {
  throw new Error("❌ ENCRYPTION_KEY is not defined in your .env file.");
}

/**
 * Veriyi AES algoritması ile şifreler.
 * @param data - Düz metin string
 * @returns Şifrelenmiş string
 */
export const encryptData = (data: string): string => {
  return crypto.AES.encrypt(data, encryptionKey).toString();
};

/**
 * AES şifrelenmiş veriyi çözer.
 * @param encrypted - Şifrelenmiş string
 * @returns Düz metin
 */
export const decryptData = (encrypted: string): string => {
  const bytes = crypto.AES.decrypt(encrypted, encryptionKey);
  return bytes.toString(crypto.enc.Utf8);
};
