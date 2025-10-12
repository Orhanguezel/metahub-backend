import express, { Router } from "express";
import fs from "fs/promises";
import path from "path";
import logger from "@/core/middleware/logger/logger";
import { getStatus, setStatus, ensureEntry } from "@/core/router/lazyRegistry";

/**
 * Lazy mount:
 * - importPathNoExt: "<...>/index" (".ts" uzantısı verilmez; ts-node ile uyumlu dynamic import)
 * - İlk istekte import, hata olursa JSON hata + log. Retry/backoff + circuit breaker destekli.
 * - Dev'de HOT_RELOAD=1 ise mtime tabanlı cache-bust ile canlı yenileme yapılır.
 */

// ENV ile ayarlar
const RETRY_BASE_MS = Math.max(250, Number(process.env.ROUTER_RETRY_BASE_MS || 1000)); // ilk bekleme
const RETRY_MAX_MS = Math.max(1000, Number(process.env.ROUTER_RETRY_MAX_MS || 8000)); // üst sınır
const CIRCUIT_LIMIT = Math.max(2, Number(process.env.ROUTER_CIRCUIT_LIMIT || 5)); // ardışık hata sınırı
const CIRCUIT_COOLDOWN = Math.max(
  2000,
  Number(process.env.ROUTER_CIRCUIT_COOLDOWN_MS || 10000)
); // circuit açık kalma süresi
const HOT_RELOAD = process.env.HOT_RELOAD === "1";

export function createLazyMount(moduleName: string, importPathNoExt: string): Router {
  const placeholder = express.Router();

  ensureEntry(moduleName);

  let loaded = false;
  let inner: Router | null = null;
  let loading: Promise<void> | null = null;
  let lastLoadedAt = 0; // epoch ms
  let lastMtimeAtLoad = 0; // dosya mtime (ms)

  // index dosyasının tam yolu (ts-node ile .ts)
  const indexTsFullPath = `${importPathNoExt}.ts`;

  // Exponential backoff hesabı
  function nextCooldownMs(failCount: number) {
    const backoff = Math.min(RETRY_BASE_MS * Math.pow(2, failCount - 1), RETRY_MAX_MS);
    return backoff;
  }

  async function getImportSpecifier(): Promise<string> {
    if (!HOT_RELOAD) return importPathNoExt; // dev değilse cache-bust yok
    try {
      const st = await fs.stat(indexTsFullPath);
      const mtime = Math.floor(st.mtimeMs);
      return `${importPathNoExt}?v=${mtime}`; // ESM import cache kırılır
    } catch {
      // dosya yoksa bile query ekleyelim (import yine hata verip düzgün raporlar)
      return `${importPathNoExt}?v=${Date.now()}`;
    }
  }

  async function needsReload(): Promise<boolean> {
    if (!HOT_RELOAD) return false;
    try {
      const st = await fs.stat(indexTsFullPath);
      const mtime = Math.floor(st.mtimeMs);
      // İlk yükleme yoksa ya da dosya güncellendiyse reload
      return !loaded || mtime > lastMtimeAtLoad;
    } catch {
      // dosya kayıpsa yeniden denesin
      return true;
    }
  }

  async function importModule(): Promise<void> {
    const st = getStatus(moduleName);

    // Circuit açık mı?
    if (st.status === "open" && st.cooldownUntil && Date.now() < st.cooldownUntil) {
      const left = st.cooldownUntil - Date.now();
      throw Object.assign(new Error(`circuit-open; retry in ${left}ms`), { _meta: { type: "circuit" } });
    }

    // Cooldown devam mı?
    if (st.cooldownUntil && Date.now() < st.cooldownUntil) {
      const left = st.cooldownUntil - Date.now();
      throw Object.assign(new Error(`cooldown; retry in ${left}ms`), { _meta: { type: "cooldown" } });
    }

    // Hot-reload: dosya güncellenmişse force yenile
    if (HOT_RELOAD) {
      const reload = await needsReload();
      if (reload) {
        loaded = false;
        inner = null;
      }
    }

    const t0 = Date.now();
    setStatus(moduleName, { status: "loading", attempts: st.attempts + 1 });

    const spec = await getImportSpecifier(); // cache-bust’lu specifier (dev)
    const mod = await import(spec); // ts-node ile birebir uyumlu kalıp
    const def = mod?.default;
    if (!def) {
      throw new Error(`${moduleName}/index.ts default export (Router) yok`);
    }

    const inst = typeof def === "function" ? def() : def;
    inner = inst as Router;
    loaded = true;
    lastLoadedAt = Date.now();

    // Hot-reload: o anda kullandığımız mtime’ı kaydet
    try {
      const fst = await fs.stat(indexTsFullPath);
      lastMtimeAtLoad = Math.floor(fst.mtimeMs);
    } catch {
      lastMtimeAtLoad = lastLoadedAt;
    }

    const ms = Date.now() - t0;
    setStatus(moduleName, {
      status: "ready",
      loadMs: ms,
      lastLoadedAt,
      lastError: undefined,
      failCount: 0,
      cooldownUntil: undefined,
    });

    logger.info(`[LAZY] Loaded ${moduleName} in ${ms}ms${HOT_RELOAD ? " (hot)" : ""}`, {
      module: moduleName,
      event: "router.lazyLoad.done",
      loadMs: ms,
      hot: HOT_RELOAD,
    });
    console.log(
      `[ROUTER] 💤→🟢 Lazy loaded /${moduleName.toLowerCase()} (${ms} ms)${
        HOT_RELOAD ? " [hot]" : ""
      }`
    );
  }

  async function ensureLoaded(): Promise<void> {
    // Hot-reload: her istekte güncel mi bakalım
    if (HOT_RELOAD && loaded) {
      const changed = await needsReload();
      if (changed) {
        loaded = false;
        inner = null;
      }
    }

    if (loaded && inner) return;

    if (!loading) {
      loading = importModule().catch((err) => {
        // import hatası -> backoff + circuit
        const msg = err?.message || String(err);
        const st = getStatus(moduleName);
        const newFail = (st.failCount || 0) + 1;

        let cooldownMs = nextCooldownMs(newFail);

        if (newFail >= CIRCUIT_LIMIT) {
          // circuit açık
          cooldownMs = Math.max(cooldownMs, CIRCUIT_COOLDOWN);
          setStatus(moduleName, {
            status: "open",
            lastError: msg,
            failCount: newFail,
            openedAt: Date.now(),
            cooldownUntil: Date.now() + cooldownMs,
          });
          logger.error(`[LAZY] ❌ Circuit OPEN for ${moduleName} (${newFail} fails): ${msg}`, {
            module: moduleName,
            event: "router.lazyLoad.circuitOpen",
            failCount: newFail,
            cooldownMs,
          });
        } else {
          setStatus(moduleName, {
            status: "failed",
            lastError: msg,
            failCount: newFail,
            cooldownUntil: Date.now() + cooldownMs,
          });
          logger.error(`[LAZY] ❌ Failed ${moduleName} (fail=${newFail}): ${msg}`, {
            module: moduleName,
            event: "router.lazyLoad.fail",
            failCount: newFail,
            cooldownMs,
          });
        }

        loading = null; // bir sonraki istekte tekrar denesin
        throw err;
      });
    }
    return loading;
  }

  // Tüm HTTP metodları için içteki router’a delege + runtime hata yakalama
  placeholder.use(async (req, res, next) => {
    try {
      await ensureLoaded();

      if (!inner) {
        // bu noktaya düşerse gerçekten kritik
        const st = getStatus(moduleName);
        return res.status(500).json({
          ok: false,
          code: "router.init_failed",
          message: `Module "${moduleName}" router init başarısız.`,
          i18nKey: "router.init_failed",
          module: moduleName,
          status: st,
        });
      }

      // inner router çağrısı, sync hataları yakalıyoruz
      try {
        return (inner as any)(req, res, next);
      } catch (e: any) {
        const msg = e?.message || String(e);
        logger.error(`[ROUTER] ❌ Runtime error in ${moduleName}: ${msg}`, {
          module: moduleName,
          event: "router.runtimeError",
          error: e,
        });
        return next(e); // app genel error handler devreye girsin
      }
    } catch (err: any) {
      // import aşamasında/circuit/cooldown durumu
      const st = getStatus(moduleName);
      const kind = err?._meta?.type;

      if (kind === "circuit") {
        return res.status(503).json({
          ok: false,
          code: "router.circuit_open",
          message: `Module "${moduleName}" temporarily unavailable (circuit open).`,
          i18nKey: "router.circuit_open",
          module: moduleName,
          status: st,
        });
      }
      if (kind === "cooldown") {
        return res.status(503).json({
          ok: false,
          code: "router.cooldown",
          message: `Module "${moduleName}" cooling down, retry later.`,
          i18nKey: "router.cooldown",
          module: moduleName,
          status: st,
        });
      }

      // gerçek import hatası: 500
      return res.status(500).json({
        ok: false,
        code: "router.import_failed",
        message: err?.message || String(err),
        i18nKey: "router.import_failed",
        module: moduleName,
        status: st,
      });
    }
  });

  return placeholder;
}
