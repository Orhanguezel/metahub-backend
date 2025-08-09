export function mergeModuleMetaAndSetting(meta, setting) {
  return {
    // Meta alanları (asla setting'den override edilmez!)
    name: meta.name,
    label: meta.label,
    icon: meta.icon,
    language: meta.language,
    version: meta.version,
    statsKey: meta.statsKey,
    history: meta.history,
    routes: meta.routes,
    // Override edilebilen alanlar:
    enabled: setting?.enabled !== undefined ? setting.enabled : meta.enabled,
    visibleInSidebar: setting?.visibleInSidebar ?? false,
    useAnalytics: setting?.useAnalytics ?? false,
    showInDashboard: setting?.showInDashboard ?? false,
    roles: setting?.roles || meta.roles,
    order: setting?.order !== undefined ? setting.order : meta.order,
    // SEO override alanları
    seoTitle: setting?.seoTitle ?? {},
    seoDescription: setting?.seoDescription ?? {},
    seoSummary: setting?.seoSummary ?? {},
    seoOgImage: setting?.seoOgImage ?? "",
    // Diğer setting-only alanlar ileride eklenirse buraya
    createdAt: meta.createdAt, // Orijinal meta'nın tarihi
    updatedAt: setting?.updatedAt || meta.updatedAt,
  };
}
