import express, { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { analyticsLogger } from "@/core/middleware/analyticsLogger";

export const getRouter = async (): Promise<Router> => {
  const router = express.Router();

  const modulesPath = path.join(__dirname, "..", "modules");
  const enabledModules =
    process.env.ENABLED_MODULES?.split(",").map((m) => m.trim().toLowerCase()) ?? [];

  const metaConfigPath = path.resolve(process.cwd(), process.env.META_CONFIG_PATH || "src/meta-configs/ensotek");
  const modules = await fs.readdir(modulesPath, { withFileTypes: true });

  for (const mod of modules) {
    if (!mod.isDirectory()) continue;

    const moduleName = mod.name;
    const moduleNameLower = moduleName.toLowerCase();

    if (!enabledModules.includes(moduleNameLower)) {
      console.log(`⏭️  [SKIP] ${moduleName} is not listed in ENABLED_MODULES`);
      continue;
    }

    const moduleDir = path.join(modulesPath, moduleName);
    const metaFile = path.join(metaConfigPath, `${moduleNameLower}.meta.json`);

    try {
      const metaRaw = await fs.readFile(metaFile, "utf-8");
      const meta = JSON.parse(metaRaw);

      const indexImport = await import(path.join(moduleDir, "index.ts").replace(".ts", ""));
      const modRouter = indexImport.default;

      if (!modRouter) {
        console.warn(`⚠️  [WARN] ${moduleName}/index.ts has no default export.`);
        continue;
      }

      const prefix = meta.prefix || `/${moduleNameLower}`;

      if (meta.useAnalytics) {
        router.use(prefix, analyticsLogger, modRouter);
      } else {
        router.use(prefix, modRouter);
      }

      console.log(`✅ [OK] Mounted ${prefix} (${moduleName})`);
    } catch (err: any) {
      console.error(`❌ [FAIL] Failed to load module "${moduleName}":`, err.message);
    }
  }

  return router;
};
