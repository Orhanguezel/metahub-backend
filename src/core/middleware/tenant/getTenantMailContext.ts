import type { Request } from "express";
import type { SupportedLocale } from "@/types/common";

/**
 * Tenant’a özel e-posta/marka context’i döner.
 * - Brand adı, gönderen email, admin email, domain ve frontend url
 * - Her endpointte DRY şekilde çağırılır.
 */
export function getTenantMailContext(req: Request) {
  // Multi-locale için
  const tenantData = (req as any).tenantData;
  const locale: SupportedLocale =
    (req as any).locale ||
    process.env.LOG_LOCALE ||
    "en";

  const brandName =
    (tenantData?.name?.[locale] ||
      tenantData?.name?.en ||
      tenantData?.name) ?? "Brand";

  const senderEmail =
    tenantData?.emailSettings?.senderEmail || "noreply@example.com";

  // Opsiyonel: admin email veya destek email (tenant ayarında varsa)
  const adminEmail =
    tenantData?.emailSettings?.adminEmail ||
    tenantData?.emailSettings?.senderEmail ||
    "admin@example.com";

  // Tenant’ın ana domain’i (varsa)
  let frontendUrl =
    (tenantData?.domain?.main?.replace(/\/$/, "") || "").trim();


  return {
    brandName,
    senderEmail,
    adminEmail,
    frontendUrl,
    tenantSlug: tenantData?.slug,
  };
}
