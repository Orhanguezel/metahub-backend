import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const envProfile = process.env.APP_ENV || "default";
const envFile = `.env.${envProfile}`;
const envPath = path.resolve(process.cwd(), envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`✅ Loaded environment from ${envFile}`);
} else {
  console.warn(`⚠️ ${envFile} not found. Trying fallback .env...`);
  const fallbackPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(fallbackPath)) {
    dotenv.config({ path: fallbackPath });
    console.log("✅ Loaded fallback .env");
  } else {
    console.warn("⚠️ No .env file found. Environment variables may be undefined.");
  }
}

process.env.ACTIVE_META_PROFILE = envProfile;
console.log(`🌐 Active profile: ${envProfile}`);
