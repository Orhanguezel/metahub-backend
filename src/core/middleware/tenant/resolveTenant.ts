// src/core/middleware/tenant/resolveTenant.ts
const tenantMap: Record<string, string> = {
  "koenigsmassage.com": "anastasia",
  "guezelwebdesign.com": "metahub",
  "ensotek.de": "ensotek",
  "metahub.localhost": "metahub",
  "anastasia.localhost": "anastasia",
};

export const resolveTenantFromRequest = (req: {
  headers: any;
  hostname: string;
}): string => {
  // 1️⃣ Öncelik: Header üzerinden gelen tenant adı
  const tenantHeader = req.headers["x-tenant"];
  if (tenantHeader && typeof tenantHeader === "string") {
    return tenantHeader.toLowerCase();
  }

  // 2️⃣ Fallback: Hostname kontrolü
  const normalized = req.hostname.toLowerCase();
  for (const key in tenantMap) {
    if (normalized.includes(key)) return tenantMap[key];
  }

  return "default";
};
