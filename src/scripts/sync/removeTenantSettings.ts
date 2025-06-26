// scripts/sync/removeTenantSettingsAndUnusedMetas.ts
import "@/core/config/envLoader";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { ModuleMeta, ModuleSetting } from "@/modules/modules/admin.models";

// Bir tenant'a ait tüm ayarları sil, ayrıca klasörü olmayan meta ve settings'leri de kaldır!
async function removeTenantSettingsAndUnusedMetas(tenantSlug: string) {
  // 1. Tenant'ın tüm settings kayıtlarını sil
  const deletedSettings = await ModuleSetting.deleteMany({
    tenant: tenantSlug,
  });

  // 2. (Eğer meta'da tenants array'ı varsa) — genelde yok, ama kod örnek olsun diye ekliyorum:
  await ModuleMeta.updateMany(
    { tenants: tenantSlug },
    { $pull: { tenants: tenantSlug } }
  );

  // 3. File system'daki modülleri bul
  const modulesDir = path.resolve(process.cwd(), "src/modules");
  const moduleFolders = fs.existsSync(modulesDir)
    ? fs
        .readdirSync(modulesDir)
        .filter((f) => fs.statSync(path.join(modulesDir, f)).isDirectory())
    : [];

  // 4. DB'deki tüm meta kayıtlarını al
  const allMetas = await ModuleMeta.find();
  let deletedMetas = 0,
    deletedOrphanSettings = 0;

  for (const meta of allMetas) {
    // Klasörü olmayan meta (yani projenizde kullanılmayan, orphan meta)
    if (!moduleFolders.includes(meta.name)) {
      // O meta'ya ait tüm settings'leri de sil
      const delSet = await ModuleSetting.deleteMany({ module: meta.name });
      await ModuleMeta.deleteOne({ name: meta.name });
      deletedMetas++;
      deletedOrphanSettings += delSet.deletedCount;
      console.log(
        `[CLEANUP] '${meta.name}' meta ve ${delSet.deletedCount} ayarı silindi (klasör yok).`
      );
    }
  }

  console.log(
    `[RESULT] ${deletedSettings.deletedCount} setting '${tenantSlug}' için silindi. ${deletedMetas} orphan meta ve ${deletedOrphanSettings} ayarı kaldırıldı.`
  );
}

const tenantSlug = process.argv[2];
if (!tenantSlug) {
  console.error(
    "Kullanım: node removeTenantSettingsAndUnusedMetas.js <tenantSlug>"
  );
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => removeTenantSettingsAndUnusedMetas(tenantSlug))
  .then(() => process.exit(0));

export { removeTenantSettingsAndUnusedMetas };
