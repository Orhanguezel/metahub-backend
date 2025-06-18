import express, { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { analyticsLogger } from "@/core/middleware/logger/analyticsLogger";
import logger from "@/core/middleware/logger/logger";

// ---- Tenant ve Dil tespiti örneği ----
function getCurrentTenant(): string {
  // Bunu ortamına göre değiştir!
  return process.env.TENANT || "metahub";
}
function getDefaultLocale(): string {
  return process.env.DEFAULT_LOCALE || "en";
}

// ---- Router Factory ----
export const getRouter = async (): Promise<Router> => {
  const router = express.Router();

  const tenant = getCurrentTenant();
  const locale = getDefaultLocale();

  // Modül yolu ve tenant’a özel meta-config yolu
  const modulesPath = path.join(__dirname, "..", "modules");
  const metaConfigDir = path.resolve(process.cwd(), "src/meta-configs", tenant);

  // ENV üzerinden gelen enabled modüller (küçük harfe çevir)
  const enabledModules =
    process.env.ENABLED_MODULES?.split(",").map((m) =>
      m.trim().toLowerCase()
    ) ?? [];

  // Directory exists check
  try {
    await fs.access(metaConfigDir);
  } catch {
    throw new Error(
      `❌ Meta config directory not found for tenant: ${tenant} (${metaConfigDir})`
    );
  }

  // Modülleri tara
  const modules = await fs.readdir(modulesPath, { withFileTypes: true });

  for (const mod of modules) {
    if (!mod.isDirectory()) continue;

    const moduleName = mod.name;
    const moduleNameLower = moduleName.toLowerCase();

    if (!enabledModules.includes(moduleNameLower)) {
      logger.info(
        `[ROUTER][${tenant}] ⏭️  [SKIP] ${moduleName} is not listed in ENABLED_MODULES`,
        {
          tenant,
          locale,
          module: moduleName,
          event: "router.skip",
        }
      );
      continue;
    }

    const moduleDir = path.join(modulesPath, moduleName);
    const metaFile = path.join(metaConfigDir, `${moduleNameLower}.meta.json`);

    try {
      const metaRaw = await fs.readFile(metaFile, "utf-8");
      const meta = JSON.parse(metaRaw);

      // Dinamik import (CJS/TS)
      const indexImport = await import(
        path.join(moduleDir, "index.ts").replace(".ts", "")
      );
      const modRouter = indexImport.default;

      if (!modRouter) {
        logger.warn(
          `[ROUTER][${tenant}] ⚠️  [WARN] ${moduleName}/index.ts has no default export.`,
          {
            tenant,
            locale,
            module: moduleName,
            event: "router.noDefaultExport",
          }
        );
        continue;
      }

      const prefix = meta.prefix || `/${moduleNameLower}`;

      // Analytics middleware sadece gerektiğinde
      if (meta.useAnalytics === true) {
        router.use(prefix, analyticsLogger, modRouter);
        logger.info(
          `[ROUTER][${tenant}] ✅ [OK] Mounted ${prefix} with analytics`,
          {
            tenant,
            locale,
            module: moduleName,
            prefix,
            event: "router.mount.analytics",
          }
        );
      } else {
        router.use(prefix, modRouter);
        logger.info(
          `[ROUTER][${tenant}] ✅ [OK] Mounted ${prefix} without analytics`,
          { tenant, locale, module: moduleName, prefix, event: "router.mount" }
        );
      }
    } catch (err: any) {
      logger.error(
        `[ROUTER][${tenant}] ❌ [FAIL] Failed to load module "${moduleName}": ${err.message}`,
        {
          tenant,
          locale,
          module: moduleName,
          event: "router.loadFail",
          error: err,
        }
      );
    }
  }

  return router;
};
