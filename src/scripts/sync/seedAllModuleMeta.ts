import "@/core/config/envLoader";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { Tenants } from "@/modules/tenants/tenants.model";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";

const t = (key: string, lng = "tr", params?: any) =>
  translate(key, lng as any, translations, params);

const DEFAULT_META = {
  icon: "box",
  enabled: true,
  roles: ["admin"],
  language: "en",
  version: "1.0.0",
  order: 0,
  routes: [] as any[],
  history: [] as any[],
  statsKey: "",
};

function resolveModulesDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "src/modules"),
    path.resolve(__dirname, "../../modules"),
    path.resolve(process.cwd(), "dist/modules"),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  throw new Error(`modules klasörü bulunamadı.`);
}

// ✅ Master (Tenants) için bağlantı açık mı? Değilse aç.
async function ensureMasterConnection() {
  if (mongoose.connection.readyState === 1) return; // connected
  const uri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/metahub";
  const dbName = process.env.MONGO_DB || undefined;

  logger.info(`[META] Mongo'ya bağlanılıyor: ${uri} db=${dbName ?? "(default)"}`);
  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  } as any);
  logger.info("[META] Mongo bağlantısı kuruldu.");
}

export async function seedAllModuleMeta() {
  // ✅ Master bağlantı garantisi
  await ensureMasterConnection();

  const modulesDir = resolveModulesDir();
  logger.info(`[META] modulesDir = ${modulesDir}`);

  // 1) Aktif tenantlar
  const tenants = await Tenants.find({ isActive: true }).lean();
  if (!tenants.length) {
    logger.warn("[META] Hiç aktif tenant yok!");
    return;
  }

  // 2) Modül klasörleri
  const entries = fs.readdirSync(modulesDir);
  const modules = entries.filter((e) => {
    const full = path.join(modulesDir, e);
    return fs.statSync(full).isDirectory() && !e.startsWith("_");
  });

  if (!modules.length) {
    logger.warn(`[META] Modül klasörü yok: ${modulesDir}`);
    return;
  }

  // 3) Tenant başına upsert (sadece insert yoksa)
  let createdCount = 0;

  for (const tenant of tenants) {
    const conn = await getTenantDbConnection(tenant.slug);
    const { ModuleMeta } = getTenantModelsFromConnection(conn);

    try {
      for (const moduleName of modules) {
        const label = fillAllLocales(moduleName);

        // 🔑 ÖNEMLİ: Sadece $setOnInsert — mevcut varsa dokunma!
        const res = await ModuleMeta.updateOne(
          { tenant: tenant.slug, name: moduleName },
          {
            $setOnInsert: {
              ...DEFAULT_META,
              label,
              name: moduleName,
              tenant: tenant.slug,
              history: [
                {
                  version: DEFAULT_META.version,
                  by: "seed",
                  date: new Date(),
                  note: "Module created by seed",
                },
              ],
            },
          },
          { upsert: true }
        );

        // Mongoose 7: res.upsertedCount doğrudur; eski sürümde res.upserted olabilir.
        const upserted =
          (res as any).upsertedCount ||
          ((res as any).upserted && (res as any).upserted.length);

        if (upserted) {
          createdCount++;
          logger.info(
            t("sync.metaCreated", "tr", { moduleName }) ||
              `[META] ${moduleName} eklendi → ${tenant.slug}`
          );
        } else {
          logger.info(
            t("sync.metaExists", "tr", { moduleName }) ||
              `[META] ${moduleName} zaten var → ${tenant.slug}`
          );
        }
      }
    } catch (err: any) {
      logger.error(
        `[META] ${tenant.slug} için seed hata: ${err.message}`,
        { tenant: tenant.slug, module: "seedAllModuleMeta" }
      );
    } finally {
      // ✅ tenant bağlantısını kapat
      try {
        await conn.close();
      } catch {}
    }
  }

  logger.info(
    t("sync.metaSummary", "tr", { count: createdCount }) ||
      `[META] Toplam ${createdCount} yeni meta kaydı.`
  );
  console.log(`[META] Toplam ${createdCount} yeni meta kaydı eklendi.`);
}

// CLI çalıştırma
if (require.main === module) {
  (async () => {
    try {
      await ensureMasterConnection(); // ✅
      await seedAllModuleMeta();
      await mongoose.disconnect();    // ✅
      console.log("[META] Seed tamamlandı.");
      process.exit(0);
    } catch (err) {
      console.error("[META] Seed hata:", err);
      try { await mongoose.disconnect(); } catch {}
      process.exit(1);
    }
  })();
}
