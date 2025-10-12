import express, { Router } from "express";
import fs from "fs/promises";
import path from "path";
import os from "os";
import logger from "@/core/middleware/logger/logger";

/** Paralel import sayısı (ENV ile override edilebilir) */
const DEFAULT_CONCURRENCY = Math.min(os.cpus().length, 8);
const CONCURRENCY =
  Number(process.env.ROUTER_IMPORT_CONCURRENCY || DEFAULT_CONCURRENCY) || DEFAULT_CONCURRENCY;

type ModDir = { moduleName: string; importPath: string };

type LoadedOk = { moduleName: string; ok: true; router: Router | any; loadMs: number };
type LoadedFail = { moduleName: string; ok: false; error: unknown; loadMs: number };
type Loaded = LoadedOk | LoadedFail;

/** Basit concurrency havuzu (ekstra paket yok) */
async function runPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length) as R[];
  let cursor = 0;

  async function runner() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) break;
      results[i] = await worker(items[i], i);
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, () => runner());
  await Promise.all(runners);
  return results;
}

function isFail(x: Loaded): x is LoadedFail {
  return x.ok === false;
}

function isMiddleware(x: any): x is Router | ((...args: any[]) => any) {
  return typeof x === "function" || (x && typeof x.handle === "function");
}

export const getRouter = async (): Promise<Router> => {
  const t0 = Date.now();

  const router = express.Router();
  const modulesPath = path.join(__dirname, "..", "modules");
  const dirents = await fs.readdir(modulesPath, { withFileTypes: true });

  // Klasörleri topla → deterministik mount için isimle sırala
  const moduleDirs: ModDir[] = dirents
    .filter((d) => d.isDirectory())
    .map((d) => {
      const moduleName = d.name;
      const importPath = path
        .join(modulesPath, moduleName, "index.ts")
        .replace(/\.ts$/, ""); // ts-node dynamic import uyumlu
      return { moduleName, importPath };
    })
    .sort((a, b) => a.moduleName.localeCompare(b.moduleName));

  console.log(
    "📦 [ROUTER] Bulunan modüller:",
    moduleDirs.map((m) => m.moduleName).join(", ")
  );
  console.log(`⏩ [ROUTER] Import concurrency: ${CONCURRENCY}`);

  // Import’ları paralel yap (sadece hızlanma; davranış aynı)
  const loadedArr = await runPool<ModDir, Loaded>(
    moduleDirs,
    CONCURRENCY,
    async ({ moduleName, importPath }) => {
      const s = Date.now();
      try {
        const indexImport = await import(importPath);
        const loadMs = Date.now() - s;
        return { moduleName, ok: true, router: indexImport.default, loadMs };
      } catch (error) {
        const loadMs = Date.now() - s;
        return { moduleName, ok: false, error, loadMs };
      }
    }
  );

  // Map'e al (mount sırasında hızlı erişim için)
  const loadedMap = new Map<string, Loaded>();
  for (const item of loadedArr) loadedMap.set(item.moduleName, item);

  let mounted = 0;
  let skipped = 0;
  let failed = 0;

  // Deterministik sırada mount et (orijinal davranış)
  for (const { moduleName } of moduleDirs) {
    const res = loadedMap.get(moduleName);
    if (!res) {
      failed++;
      logger.error(`[ROUTER] ❌ [FAIL] Missing import result for "${moduleName}"`, {
        module: moduleName,
        event: "router.loadMissing",
      });
      console.log(`[ROUTER] ❌ Failed to mount /${moduleName.toLowerCase()}`);
      continue;
    }

    if (isFail(res)) {
      failed++;
      const errMsg =
        (res.error as any)?.message ??
        (typeof res.error === "string" ? res.error : JSON.stringify(res.error));
      logger.error(`[ROUTER] ❌ [FAIL] Failed to load module "${moduleName}": ${errMsg}`, {
        module: moduleName,
        event: "router.loadFail",
        error: res.error,
      });
      console.log(`[ROUTER] ❌ Failed to mount /${moduleName.toLowerCase()}`);
      continue;
    }

    const modRouter = res.router;

    if (!modRouter) {
      skipped++;
      logger.warn(
        `[ROUTER] ⚠️  [WARN] ${moduleName}/index.ts has no default export.`,
        { module: moduleName, event: "router.noDefaultExport" }
      );
      console.log(
        `[ROUTER] ⚠️ Skipped /${moduleName.toLowerCase()} (no default export)`
      );
      continue;
    }

    if (!isMiddleware(modRouter)) {
      skipped++;
      logger.warn(
        `[ROUTER] ⚠️  [WARN] ${moduleName}/index.ts default export Router/middleware değil.`,
        { module: moduleName, event: "router.invalidDefault" }
      );
      console.log(
        `[ROUTER] ⚠️ Skipped /${moduleName.toLowerCase()} (invalid default export)`
      );
      continue;
    }

    router.use(`/${moduleName.toLowerCase()}`, modRouter);
    mounted++;
    logger.info(`[ROUTER] Mounted /${moduleName.toLowerCase()}`, {
      module: moduleName,
      event: "router.mount",
    });
    console.log(
      `[ROUTER] ✅ Mounted /${moduleName.toLowerCase()} (${res.loadMs} ms)`
    );
  }

  const totalMs = Date.now() - t0;
  console.log(
    `✅ [ROUTER] Tüm modüller yüklendi & mount edildi. toplam=${moduleDirs.length}, mounted=${mounted}, failed=${failed}, skipped=${skipped}, süre=${totalMs} ms (pool=${CONCURRENCY})`
  );

  return router;
};
