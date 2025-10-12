import type { SitemapProvider } from "./types";
// İsteğe bağlı özel provider'lar burada kayıtlı olabilir.
// import apartmentProvider from "./apartment.provider";
// import aboutProvider from "./about.provider";
// import serviceCatalogProvider from "./servicecatalog.provider";

const registry: Record<string, SitemapProvider> = Object.create(null);

export function register(p: SitemapProvider) {
  registry[p.module] = p;
}

// Özel provider eklemek istersen aktif et:
// [apartmentProvider, aboutProvider, serviceCatalogProvider].forEach(register);

export function getProvider(moduleName: string): SitemapProvider | undefined {
  return registry[moduleName];
}
export function getAllProviders(): SitemapProvider[] {
  return Object.values(registry);
}

export * from "./types";
export { makeAutoProvider } from "./auto.provider";
