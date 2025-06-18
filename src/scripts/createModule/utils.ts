// src/tools/utils/getPaths.ts

import path from "path";

/**
 * İlk harfi büyük yapar.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Modül dosya yollarını (tenant context ile) döndürür.
 * @param moduleName - Modül adı
 * @param tenant - Tenant ismi (zorunlu!)
 */
export function getPaths(moduleName: string, tenant: string) {
  if (!tenant || typeof tenant !== "string" || !tenant.trim()) {
    throw new Error("getPaths: tenant parametresi zorunludur!");
  }

  // Modül klasörleri global kalıyor, meta dosyaları tenant context'inde
  const modulesPath = path.resolve(process.cwd(), "src/modules");
  const metaConfigDir = path.resolve(process.cwd(), "src/meta-configs", tenant);

  // {tenant}/{module}.meta.json (örn: src/meta-configs/anastasia/blog.meta.json)
  const metaPath = path.join(metaConfigDir, `${moduleName}.meta.json`);
  const modulePath = path.join(modulesPath, moduleName);

  return { modulesPath, metaPath, modulePath };
}
