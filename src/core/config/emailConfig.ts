import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// 📁 Ortama göre .env dosyasını yükle
const envProfile = process.env.APP_ENV || "metahub";
const envPath = path.resolve(process.cwd(), `.env.${envProfile}`);

// 🛡️ Güvenli yükleme
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`📧 Mailer config loaded from: ${envPath}`);
} else {
  console.warn(`⚠️ .env.${envProfile} not found. Default vars may be used.`);
}

// 🧪 Gerekli tüm env değerleri var mı kontrol et
const requiredVars = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
const missingVars = requiredVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  console.warn(
    `⚠️ Missing SMTP configuration values: ${missingVars.join(", ")}`
  );
}

// 📤 Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true", // true: 465, false: 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ✅ Bağlantı testi (isteğe bağlı)
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP bağlantı hatası:", error);
  } else {
    console.log("✅ SMTP bağlantısı başarılı, mail gönderilmeye hazır.");
  }
});

export default transporter;
