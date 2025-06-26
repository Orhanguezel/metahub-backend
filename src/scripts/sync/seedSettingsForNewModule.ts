// scripts/sync/seedSettingsForNewModule.ts
import "@/core/config/envLoader";
import mongoose from "mongoose";
import { ModuleMeta, ModuleSetting } from "@/modules/modules/admin.models";
import { Tenants } from "@/modules/tenants/tenants.model";

/**
 * Tek modül için istenen tenant(lar)a setting açar.
 * Eğer tenantSlug verilirse sadece o tenant için;
 * verilmezse tüm aktif tenantlar için açar.
 */
export async function seedSettingsForNewModule(
  moduleName: string,
  tenantSlug?: string
) {
  // mod'u as any olarak force cast ile kullan!
  const mod = (await ModuleMeta.findOne({ name: moduleName }).lean()) as any;
  if (!mod) {
    console.error("Modül bulunamadı:", moduleName);
    return;
  }

  // Tenant: sadece tenantSlug verilmişse onu kullan, yoksa tüm aktif tenantlar
  let tenants: string[] = [];
  if (tenantSlug) {
    tenants = [tenantSlug];
  } else {
    tenants = (await Tenants.find({ isActive: true })).map((t) => t.slug);
  }

  let count = 0;
  for (const tenant of tenants) {
    const exists = await ModuleSetting.findOne({ module: moduleName, tenant });
    if (!exists) {
      await ModuleSetting.create({
        module: mod.name,
        tenant,
        enabled: mod.enabled ?? true,
        visibleInSidebar: mod.visibleInSidebar ?? true,
        useAnalytics: mod.useAnalytics ?? false,
        showInDashboard: mod.showInDashboard ?? true,
        roles: Array.isArray(mod.roles) ? mod.roles : ["admin"],
        // diğer otomatik alanlar mongoose tarafından set edilir
      });
      count++;
      console.log(`[SYNC] ${tenant} için ${moduleName} setting açıldı`);
    }
  }
  console.log(`[RESULT] ${count} setting açıldı`);
}
