// src/utils/envHelpers.ts

import fs from "fs";
import path from "path";
import dotenv from "dotenv";

/**
 * Her tenant için ENABLED_MODULES listesini ilgili .env dosyasından okur.
 * @param tenant Tenant adı (zorunlu!)
 */
export const getEnabledModulesFromEnv = (tenant: string): string[] => {
  const envPath = path.resolve(process.cwd(), `.env.${tenant}`);
  if (!fs.existsSync(envPath)) {
    throw new Error(`[envHelpers] .env.${tenant} not found: ${envPath}`);
  }
  const envContent = fs.readFileSync(envPath, "utf-8");
  const parsed = dotenv.parse(envContent);
  return (parsed.ENABLED_MODULES || "")
    .split(",")
    .map((mod) => mod.trim())
    .filter(Boolean);
};
