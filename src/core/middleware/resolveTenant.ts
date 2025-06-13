// src/core/middleware/resolveTenant.ts
export const resolveTenantFromHost = (host: string): string => {
  if (host.includes("koenigsmassage.com")) return "anastasia";
  if (host.includes("guezelwebdesign.com")) return "metahub";
  if (host.includes("metahub.localhost")) return "metahub";
  if (host.includes("anastasia.localhost")) return "anastasia";
  // başka tenantlar...
  return "default";
};
