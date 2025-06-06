// src/core/swagger/getEnabledModules.ts

import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

/**
 * Reads enabled modules from environment and validates their meta files.
 */
export const getEnabledModules = async (): Promise<string[]> => {
  const envProfile = process.env.APP_ENV;
  const enabledModulesRaw = process.env.ENABLED_MODULES;

  if (!envProfile) {
    throw new Error("❌ APP_ENV is not defined. Cannot resolve meta-config path.");
  }

  if (!enabledModulesRaw) {
    console.warn("⚠️ ENABLED_MODULES is not defined in environment.");
    return [];
  }

  const enabledModules = enabledModulesRaw.split(",").map((m) => m.trim());
  const metaConfigsPath = path.resolve(process.cwd(), "src/meta-configs", envProfile);

  if (!fsSync.existsSync(metaConfigsPath)) {
    console.warn(`⚠️ Meta-config path not found: ${metaConfigsPath}`);
    return [];
  }

  const metaFiles = await fs.readdir(metaConfigsPath);

  const availableModules = metaFiles
    .filter((file) => file.endsWith(".meta.json"))
    .map((file) => file.replace(".meta.json", ""));

  return enabledModules.filter((mod) => availableModules.includes(mod));
};

