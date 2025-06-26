import "@/core/config/envLoader";
import fs from "fs/promises";
import path from "path";
import { seedSettingsForNewModule } from "./seedSettingsForNewModule";
import { Tenants } from "@/modules/tenants/tenants.model";

interface Tenant {
  name: Record<string, string>;
  slug: string;
  mongoUri: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// --- Tüm tenantlara tüm modülleri seed et ---
export const getAllModuleNames = async (): Promise<string[]> => {
  const modulesPath = path.join(__dirname, "..", "..", "modules");
  const modules = await fs.readdir(modulesPath, { withFileTypes: true });
  return modules.filter((m) => m.isDirectory()).map((m) => m.name);
};

export const seedAllModulesForAllTenants = async () => {
  const moduleNames = await getAllModuleNames();
  const allTenants = (await Tenants.find({
    isActive: true,
  }).lean()) as Tenant[];

  for (const moduleName of moduleNames) {
    for (const tenant of allTenants) {
      try {
        await seedSettingsForNewModule(moduleName, tenant.slug);
        console.log(`✅ [Seed] ${moduleName} → ${tenant.slug} tamamlandı.`);
      } catch (e) {
        console.error(
          `❌ [Seed] ${moduleName} → ${tenant.slug} hata:`,
          (e as any).message
        );
      }
    }
  }
};
