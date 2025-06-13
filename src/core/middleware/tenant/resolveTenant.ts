// src/core/middleware/resolveTenant.ts
const tenantMap: Record<string, string> = {
  "koenigsmassage.com": "anastasia",
  "guezelwebdesign.com": "metahub",
  "metahub.localhost": "metahub",
  "anastasia.localhost": "anastasia",
};

export const resolveTenantFromHost = (host: string): string => {
  const normalized = host.toLowerCase();
  for (const key in tenantMap) {
    if (normalized.includes(key)) return tenantMap[key];
  }
  return "default";
};
