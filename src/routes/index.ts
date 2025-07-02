import express, { Router } from "express";
import fs from "fs/promises";
import path from "path";
import logger from "@/core/middleware/logger/logger";

export const getRouter = async (): Promise<Router> => {
  const router = express.Router();
  const modulesPath = path.join(__dirname, "..", "modules");
  const modules = await fs.readdir(modulesPath, { withFileTypes: true });

  console.log(
    `📦 [ROUTER] Bulunan modüller:`,
    modules.map((m) => m.name).join(", ")
  );

  for (const mod of modules) {
    if (!mod.isDirectory()) continue;

    const moduleName = mod.name;
    const moduleDir = path.join(modulesPath, moduleName);

    try {
      // Dinamik import için: .ts uzantısını kaldır
      const indexImport = await import(
        path.join(moduleDir, "index.ts").replace(/\.ts$/, "")
      );
      const modRouter = indexImport.default;

      if (!modRouter) {
        logger.warn(
          `[ROUTER] ⚠️  [WARN] ${moduleName}/index.ts has no default export.`,
          { module: moduleName, event: "router.noDefaultExport" }
        );
        continue;
      }

      router.use(`/${moduleName.toLowerCase()}`, modRouter);

      logger.info(`[ROUTER] Mounted /${moduleName.toLowerCase()}`, {
        module: moduleName,
        event: "router.mount",
      });
      console.log(`[ROUTER] ✅ Mounted /${moduleName.toLowerCase()}`);
    } catch (err: any) {
      logger.error(
        `[ROUTER] ❌ [FAIL] Failed to load module "${moduleName}": ${err.message}`,
        { module: moduleName, event: "router.loadFail", error: err }
      );

      // Yeni log: Modül mount edilemediyse
      console.log(`[ROUTER] ❌ Failed to mount /${moduleName.toLowerCase()}`);
      continue;
    }
  }

  console.log("✅ [ROUTER] Tüm modüller mount edildi ve router hazır.");
  return router;
};
