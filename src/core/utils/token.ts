import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// 📦 Ortama özel .env dosyasını yükle (.env.ensotek, .env.clientX, vs.)
const envProfile = process.env.APP_ENV;
const envPath = envProfile
  ? path.resolve(process.cwd(), `.env.${envProfile}`)
  : null;

if (envPath && fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`🔐 Token env loaded from ${envPath}`);
} else {
  console.log("ℹ️ No APP_ENV set or env file missing, loading default .env");
  dotenv.config(); // fallback: .env dosyasını yükler
}

// ✅ Env değişkenini oku
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  // fallback dev secret eklemek istersen buraya yazabilirsin
  throw new Error("❌ JWT_SECRET is missing in your environment configuration.");
}

/**
 * ✅ JWT Token üretir
 */
export const generateToken = ({
  id,
  role,
}: {
  id: string;
  role: string;
}): string => {
  return jwt.sign({ id, role }, JWT_SECRET, {
    expiresIn: "7d",
  });
};

/**
 * ✅ JWT Token doğrular
 */
export const verifyToken = (
  token: string
): { id: string; role: string } => {
  return jwt.verify(token, JWT_SECRET) as { id: string; role: string };
};
