import { config } from "dotenv";
import path from "path";
import fs from "fs";

// APP_ENV tanımlıysa onu kullan, değilse "metahub"
const envProfile = process.env.APP_ENV || "metahub";

// Proje kökünden .env dosyasının tam yolunu al
const envPath = path.resolve(process.cwd(), `.env.${envProfile}`);

// Dosya var mı kontrolü
if (!fs.existsSync(envPath)) {
  console.warn(`⚠️  Environment file "${envPath}" not found. Using fallback defaults.`);
} else {
  config({ path: envPath });
  console.log(`✅ Loaded environment: ${envPath}`);
}

// Profil bazlı meta yapılarını da erişilebilir kılmak için
process.env.ACTIVE_META_PROFILE = envProfile;
