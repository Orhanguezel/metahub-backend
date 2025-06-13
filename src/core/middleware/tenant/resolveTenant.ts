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
  const tenantHeader = req.headers["x-tenant"];
  if (tenantHeader && typeof tenantHeader === "string") {
    return tenantHeader.toLowerCase();
  }

  const normalized = req.hostname.toLowerCase();
  for (const key in tenantMap) {
    if (normalized.includes(key)) return tenantMap[key];
  }

  throw new Error(
    `❌ Tenant could not be resolved for hostname: ${normalized}`
  );
};
