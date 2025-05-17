import { config } from "dotenv";
import path from "path";
import fs from "fs";

const envProfile = process.env.APP_ENV;

if (envProfile) {
  const envPath = path.resolve(process.cwd(), `.env.${envProfile}`);

  if (!fs.existsSync(envPath)) {
    console.warn(`⚠️ Environment file "${envPath}" not found. Using default .env`);
    config(); // fallback: .env dosyası yükle
  } else {
    config({ path: envPath });
    console.log(`✅ Loaded environment: ${envPath}`);
  }

  process.env.ACTIVE_META_PROFILE = envProfile;
} else {
  // Hiç profile yoksa doğrudan .env yükle
  console.log("✅ No APP_ENV set. Using default .env file.");
  config();
}
