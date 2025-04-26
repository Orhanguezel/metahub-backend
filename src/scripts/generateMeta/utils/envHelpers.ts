// src/scripts/generateMeta/utils/envHelpers.ts

import fs from "fs";
import path from "path";
import dotenv from "dotenv";

export type EnvConfig = Record<string, string>;

export function readAllEnvFiles(profiles: string[]): Record<string, EnvConfig> {
  const envConfigs: Record<string, EnvConfig> = {};

  for (const profile of profiles) {
    const envPath = path.resolve(process.cwd(), `.env.${profile}`);
    if (!fs.existsSync(envPath)) continue;

    try {
      const parsed = dotenv.parse(fs.readFileSync(envPath));
      envConfigs[profile] = parsed;
    } catch (err) {
      console.error(`❌ Failed to read .env.${profile}:`, err);
    }
  }

  return envConfigs;
}
