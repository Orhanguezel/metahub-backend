import { config } from "dotenv";
import path from "path";

// Eğer NODE_ENV belirtilmişse ona göre .env dosyasını oku
const envFile = process.env.APP_ENV || "metahub";
const envPath = path.resolve(process.cwd(), `.env.${envFile}`);

config({ path: envPath });

console.log(`✅ Loaded environment: ${envPath}`);
