// src/scripts/metaValidator.ts
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { getEnvProfiles } from "../tools/getEnvProfiles";

const metaDir = path.join(__dirname, "..", "meta-configs", "metahub");
const modulesDir = path.join(__dirname, "..", "modules");
const requiredFields = ["name", "icon", "routes"];

const metaFiles = fs.readdirSync(metaDir).filter((f) => f.endsWith(".meta.json"));
const profiles = getEnvProfiles();

let hasError = false;

for (const file of metaFiles) {
  const filePath = path.join(metaDir, file);
  const moduleName = file.replace(".meta.json", "");

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const meta = JSON.parse(raw);

    for (const field of requiredFields) {
      if (!(field in meta)) {
        console.error(`❌ Missing field "${field}" in ${file}`);
        hasError = true;
      }
    }

    const modulePath = path.join(modulesDir, moduleName);
    if (!fs.existsSync(modulePath)) {
      console.warn(`⚠️ Module folder missing for: ${moduleName}`);
    }

    for (const profile of profiles) {
      const envPath = path.resolve(process.cwd(), `.env.${profile}`);
      if (!fs.existsSync(envPath)) continue;

      const parsed = dotenv.parse(fs.readFileSync(envPath));
      const enabledModules =
        parsed.ENABLED_MODULES?.split(",").map((m) => m.trim().toLowerCase()) ?? [];

      if (!enabledModules.includes(moduleName.toLowerCase())) {
        console.warn(`⚠️ Module "${moduleName}" is not enabled in .env.${profile}`);
      }
    }

  } catch (err: any) {
    console.error(`❌ Invalid JSON in ${file}: ${err.message}`);
    hasError = true;
  }
}

if (hasError) {
  console.error("❌ Meta validation failed.");
  process.exit(1);
} else {
  console.log("✅ All meta files are valid.");
}
