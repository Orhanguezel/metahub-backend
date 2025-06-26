import path from "path";

/**
 * İlk harfi büyük yapar.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Modül dosya yollarını döndürür.
 * @param moduleName - Modül adı
 */
export function getPaths(moduleName: string) {
  const modulesPath = path.resolve(process.cwd(), "src/modules");
  const modulePath = path.join(modulesPath, moduleName);

  return { modulesPath, modulePath };
}
