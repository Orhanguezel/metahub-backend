import express, { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { analyticsLogger } from "@/core/middleware/logger/analyticsLogger";
import logger from "@/core/middleware/logger/logger";

export const getRouter = async (): Promise<Router> => {
  const router = express.Router();

  // --- Tüm modülleri başta mount et ---
  const modulesPath = path.join(__dirname, "..", "modules");
  const modules = await fs.readdir(modulesPath, { withFileTypes: true });

  console.log(
    `📦 [ROUTER] Bulunan modüller:`,
    modules.map((m) => m.name).join(", ")
  );

  for (const mod of modules) {
    if (!mod.isDirectory()) continue;
    const moduleName = mod.name;
    const moduleNameLower = moduleName.toLowerCase();

    const moduleDir = path.join(modulesPath, moduleName);
    const metaFile = path.join(
      process.cwd(),
      "src/meta-configs/default",
      `${moduleNameLower}.meta.json`
    );

    let meta: any = {};
    try {
      const metaRaw = await fs.readFile(metaFile, "utf-8");
      meta = JSON.parse(metaRaw);
    } catch {
      meta = { prefix: `/${moduleNameLower}` };
    }

    const prefix = meta.prefix || `/${moduleNameLower}`;

    try {
      const indexImport = await import(
        path.join(moduleDir, "index.ts").replace(".ts", "")
      );
      const modRouter = indexImport.default;

      if (!modRouter) {
        logger.warn(
          `[ROUTER] ⚠️  [WARN] ${moduleName}/index.ts has no default export.`,
          { module: moduleName, event: "router.noDefaultExport" }
        );
        console.log(
          `[ROUTER] [WARN] ${moduleName}/index.ts has no default export.`
        );
        continue;
      }

      if (meta.useAnalytics === true) {
        router.use(prefix, analyticsLogger, modRouter);
        logger.info(`[ROUTER] ✅ [OK] Mounted ${prefix} with analytics`, {
          module: moduleName,
          prefix,
          event: "router.mount.analytics",
        });
        console.log(`[ROUTER] ✅ [OK] Mounted ${prefix} with analytics`);
      } else {
        router.use(prefix, modRouter);
        logger.info(`[ROUTER] ✅ [OK] Mounted ${prefix} without analytics`, {
          module: moduleName,
          prefix,
          event: "router.mount",
        });
        console.log(`[ROUTER] ✅ [OK] Mounted ${prefix} without analytics`);
      }
    } catch (err: any) {
      logger.error(
        `[ROUTER] ❌ [FAIL] Failed to load module "${moduleName}": ${err.message}`,
        { module: moduleName, event: "router.loadFail", error: err }
      );
      console.log(
        `[ROUTER] ❌ [FAIL] Failed to load module "${moduleName}": ${err.message}`
      );
      continue;
    }
  }

  // Modül mounting bitti
  console.log("✅ [ROUTER] Tüm modüller mount edildi ve router hazır.");
  return router;
};
