import crypto from "crypto-js";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";


const envProfile = process.env.APP_ENV || "ensotek";
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

export const encryptData = (data: string): string => {
  return crypto.AES.encrypt(data, encryptionKey).toString();
};


export const decryptData = (encrypted: string): string => {
  const bytes = crypto.AES.decrypt(encrypted, encryptionKey);
  return bytes.toString(crypto.enc.Utf8);
};
