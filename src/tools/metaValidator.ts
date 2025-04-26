// src/scripts/metaValidator.ts
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { getEnvProfiles } from "./getEnvProfiles";

const metaDir = path.join(__dirname, "..", "meta-configs", "metahub");
const modulesDir = path.join(__dirname, "..", "modules");
const requiredFields = ["name", "icon", "routes", "version", "updatedBy", "lastUpdatedAt", "history"];
const validMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function isValidSemver(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version);
}

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
    if (!isValidSemver(meta.version)) {
      console.error(`❌ Invalid version format in ${file}`);
      hasError = true;
    }
    if (!isoDateRegex.test(meta.lastUpdatedAt)) {
      console.error(`❌ Invalid lastUpdatedAt format in ${file}`);
      hasError = true;
    }

    if (typeof meta.updatedBy !== "string" || !meta.updatedBy.trim()) {
      console.error(`❌ Invalid updatedBy field in ${file}`);
      hasError = true;
    }

    if (typeof meta.version !== "string" || !isValidSemver(meta.version)) {
      console.error(`❌ Invalid or missing version format in ${file}`);
      hasError = true;
    }
    
    if (!Array.isArray(meta.history) || meta.history.length === 0) {
      console.error(`❌ Missing or invalid history array in ${file}`);
      hasError = true;
    } else {
      for (const entry of meta.history) {
        if (
          typeof entry.version !== "string" ||
          typeof entry.by !== "string" ||
          !isoDateRegex.test(entry.at)
        ) {
          console.error(`❌ Invalid entry in history array in ${file}`);
          hasError = true;
          break;
        }
      }
    }

    if (!Array.isArray(meta.roles) || meta.roles.length === 0) {
      console.error(`❌ Invalid or missing roles in ${file}`);
      hasError = true;
    }

    if (!Array.isArray(meta.routes)) {
      console.error(`❌ routes must be an array in ${file}`);
      hasError = true;
    } else {
      for (const route of meta.routes) {
        if (
          typeof route.method !== "string" ||
          !validMethods.includes(route.method.toUpperCase()) ||
          typeof route.path !== "string"
        ) {
          console.error(`❌ Invalid route definition in ${file}: ${JSON.stringify(route)}`);
          hasError = true;
        }
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
