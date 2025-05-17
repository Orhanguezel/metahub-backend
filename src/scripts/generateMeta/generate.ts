import fs from "fs";
import path from "path";
import mongoose from "mongoose";

import connectDB from "@/core/config/connect";
import { extractRoutesFromFile, getAllRouteFiles } from "./utils/extractRoutes";
import { updateMetaVersionLog } from "./utils/versionHelpers";
import { getEnvProfiles } from "@/tools/getEnvProfiles";
import { readAllEnvFiles } from "./utils/envHelpers";
import { metaConfig } from "./generateMeta.config";
import { getValidationBodySchema } from "./utils/validationSchemaReader";

import {
  ModuleMeta,
  ModuleSetting,
} from "../../modules/admin";

export const generateMeta = async () => {
  await connectDB();

  const envProfile = process.env.ACTIVE_META_PROFILE || process.env.APP_ENV || "ensotek";
console.log(`🛠 Using meta profile: ${envProfile}`);


  const modulesPath = path.join(__dirname, "../../modules");
  const metaProjectDir = path.join(__dirname, `../../meta-configs/${envProfile}`);


  if (!fs.existsSync(metaProjectDir)) {
    fs.mkdirSync(metaProjectDir, { recursive: true });
  }

  const allModules = fs
    .readdirSync(modulesPath)
    .filter((mod) => fs.statSync(path.join(modulesPath, mod)).isDirectory());
  const existingMetaFiles = fs
    .readdirSync(metaProjectDir)
    .filter((f) => f.endsWith(".meta.json"));
  const modulesInFs = new Set(allModules);

  const envProfiles = getEnvProfiles();
  const envConfigs = readAllEnvFiles(envProfiles);

  // 🧹 Orphan Meta Cleanup
  await Promise.all(existingMetaFiles.map(async (file) => {
    const modName = file.replace(".meta.json", "");
    if (!modulesInFs.has(modName)) {
      console.warn(`🗑️ Orphan meta found: ${modName}`);
      try {
        fs.unlinkSync(path.join(metaProjectDir, file));
        console.log(`🧹 Deleted meta file: ${file}`);
      } catch (err) {
        console.error(`❌ Failed to delete meta file for ${modName}:`, err);
      }
      try {
        await ModuleMeta.deleteOne({ name: modName });
        await ModuleSetting.deleteMany({ module: modName });
        console.log(`🧹 Deleted DB records for module: ${modName}`);
      } catch (err) {
        console.error(`❌ Failed to delete DB records for ${modName}:`, err);
      }
    }
  }));

  // 📦 Meta generate
  await Promise.all(allModules.map(async (mod) => {
    if (metaConfig.ignoreModules.includes(mod)) {
      console.warn(`🚫 Skipped ignored module: ${mod}`);
      return;
    }

    const modPath = path.join(modulesPath, mod);
    const routeFiles = getAllRouteFiles(modPath);

    if (routeFiles.length === 0) {
      console.warn(`⚠️ Skipped module: ${mod} (no .routes.ts files found)`);
      return;
    }

    const metaPath = path.join(metaProjectDir, `${mod}.meta.json`);
    let existing = {};

    try {
      if (fs.existsSync(metaPath)) {
        existing = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      }
    } catch (err) {
      console.error(`❌ Failed to read meta for ${mod}:`, err);
    }

    let routes = routeFiles.flatMap((routeFile) => {
      const fileRoutes = extractRoutesFromFile(routeFile);
      const filename = path.basename(routeFile).replace(".routes.ts", "");
      const prefix = filename.replace(mod, "").replace(/^[A-Z]/, (m) => m.toLowerCase());
      return fileRoutes.map((route) => ({ ...route, pathPrefix: prefix || undefined }));
    });

    // ✨ Validation şemalarını otomatik bağla
    for (const route of routes) {
      if (route.validationName) {
        try {
            const bodySchema = await getValidationBodySchema(mod, route.path);

          if (bodySchema) {
            route.body = bodySchema.definitions?.[Object.keys(bodySchema.definitions || {})[0]] || bodySchema;
          }
        } catch (err) {
          console.warn(`⚠️ Failed to attach validation schema for route: ${route.summary}`);
        }
      }
    }

    const meta = updateMetaVersionLog({
      name: mod,
      icon: (existing as any).icon || "box",
      roles: (existing as any).roles || ["admin"],
      useAnalytics: (existing as any).useAnalytics ?? false,
      language: (existing as any).language || "en",
      routes,
    });

    try {
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");
    } catch (err) {
      console.error(`❌ Failed to write meta file for ${mod}:`, err);
      return;
    }

    try {
      await ModuleMeta.updateOne({ name: mod }, { $set: meta }, { upsert: true });
    } catch (err) {
      console.error(`❌ DB update failed for ${mod}:`, err);
    }

    // 🌍 Update per profile
    await Promise.all(envProfiles.map(async (profile) => {
      const envVars = envConfigs[profile];
      if (!envVars) return;

      const enabledModules = envVars.ENABLED_MODULES?.split(",").map((m) => m.trim()) || [];
      const isEnabled = enabledModules.includes(mod);

      try {
        await ModuleSetting.updateOne(
          { project: profile, module: mod },
          { $set: { enabled: isEnabled, visibleInSidebar: true } },
          { upsert: true }
        );
      } catch (err) {
        console.error(`❌ DB setting update failed for ${mod} (${profile}):`, err);
      }
    }));

    // ✅ Konsolda her modülün kaç route ürettiğini göster
    console.log(`✅ ${mod} (${routes.length} routes)`);
  }));

  mongoose.connection.close();
};
