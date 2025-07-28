import type { Request } from "express";
import type { SupportedLocale } from "@/types/common";

/**
 * Tenant’a özel e-posta/marka context’i döner.
 * - Brand adı, gönderen email, admin email, domain ve frontend url
 * - Her endpointte DRY şekilde çağırılır.
 */
export function getTenantMailContext(req: Request) {
  const tenantData = (req as any).tenantData || {};
  let locale: SupportedLocale = (
    (req as any).locale ||
    process.env.LOG_LOCALE ||
    "en"
  ) as SupportedLocale;

  if (typeof locale !== "string" || locale.length !== 2) locale = "en";

  const brandName =
    tenantData.name?.[locale] ||
    tenantData.name?.en ||
    tenantData.name ||
    "Brand";

  const senderEmail =
    tenantData.emailSettings?.senderEmail || "noreply@example.com";

  const adminEmail =
    tenantData.emailSettings?.adminEmail ||
    tenantData.emailSettings?.senderEmail ||
    "admin@example.com";

  // Ana domain'i normalize et
  let frontendUrl = tenantData.domain?.main || "";
  frontendUrl = frontendUrl.replace(/\/$/, ""); // sağdaki slash’ı sil
  if (frontendUrl && !/^https?:\/\//.test(frontendUrl)) {
    frontendUrl = "https://" + frontendUrl;
  }
  if (!frontendUrl) {
    frontendUrl = process.env.BRAND_WEBSITE || "https://guezelwebdesign.com";
  }

  return {
    brandName,
    senderEmail,
    adminEmail,
    frontendUrl,
    tenantSlug: tenantData.slug,
  };
}
