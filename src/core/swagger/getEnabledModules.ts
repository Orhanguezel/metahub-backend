// src/core/swagger/getEnabledModules.ts

import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import fsSync from "fs";

// 🌍 Ortama özel .env dosyasını yükle
const envProfile = process.env.APP_ENV || "metahub";
const envPath = path.resolve(process.cwd(), `.env.${envProfile}`);

if (fsSync.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`✅ Loaded environment: ${envPath}`);
} else {
  console.warn(`⚠️ No env file found for profile: ${envPath}`);
}

export const getEnabledModules = async (): Promise<string[]> => {
  const metaConfigsPath = path.resolve(__dirname, "../../meta-configs/metahub");

  const enabledModulesEnv =
    process.env.ENABLED_MODULES?.split(",").map((m) => m.trim()) || [];

  if (enabledModulesEnv.length === 0) {
    console.warn("⚠️ No modules enabled in the environment. Please set ENABLED_MODULES.");
    return [];
  }

  const metaFiles = await fs.readdir(metaConfigsPath);

  const availableModules = metaFiles
    .filter((file) => file.endsWith(".meta.json"))
    .map((file) => file.replace(".meta.json", ""));

  return enabledModulesEnv.filter((mod) => availableModules.includes(mod));
};
