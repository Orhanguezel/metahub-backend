import { config } from "dotenv";
import path from "path";
import fs from "fs";

const envProfile = process.env.APP_ENV || "metahub";

const envPath = path.resolve(process.cwd(), `.env.${envProfile}`);

if (!fs.existsSync(envPath)) {
  console.warn(`⚠️  Environment file "${envPath}" not found. Using fallback defaults.`);
} else {
  config({ path: envPath });
  console.log(`✅ Loaded environment: ${envPath}`);
}


process.env.ACTIVE_META_PROFILE = envProfile;
