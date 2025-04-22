import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import fsSync from "fs";

// 🌍 Ortama özel .env dosyasını yükle
const envProfile = process.env.APP_ENV || "metahub";
const envPath = path.resolve(process.cwd(), `.env.${envProfile}`);

if (fsSync.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn(`⚠️ No env file found for profile: ${envPath}`);
}

export const getEnabledModules = async (): Promise<string[]> => {
  const modulesPath = path.resolve(__dirname, "../../modules"); // ✅ düzeltildi

  const enabledModulesEnv =
    process.env.ENABLED_MODULES?.split(",").map((m) => m.trim()) || [];

  if (enabledModulesEnv.length === 0) {
    console.warn(
      "⚠️ No modules enabled in the environment. Please set ENABLED_MODULES."
    );
    return [];
  }

  const modules = await fs.readdir(modulesPath, { withFileTypes: true });

  return modules
    .filter((mod) => mod.isDirectory())
    .map((mod) => mod.name)
    .filter((name) => enabledModulesEnv.includes(name));
};
