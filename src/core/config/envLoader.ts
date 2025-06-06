import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const envProfile = process.env.APP_ENV;
const envPath = path.resolve(process.cwd(), `.env.${envProfile}`);

if (!fs.existsSync(envPath)) {
  throw new Error(`❌ .env.${envProfile} not found. Please create it before running the server.`);
}

dotenv.config({ path: envPath });
console.log(`✅ Loaded environment from ${envPath}`);
