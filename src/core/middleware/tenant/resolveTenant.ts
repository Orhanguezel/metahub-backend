import { Request, Response, NextFunction } from "express";
import { Tenants } from "@/modules/tenants/tenants.model";
import logger from "../logger/logger";
import translations from "./i18n";
import { t } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { getRequestContext } from "../logger/logRequestContext";

// Request tipi genişletme
export interface RequestWithTenant extends Request {
  tenant?: string;
  tenantData?: any;
  enabledModules?: string[];
}

// Hostname'den portu atlatmak için aşağıdaki satırı kullanabilirsin:
// hostname.split(":")[0]
function normalizeHost(hostname: string) {
  // Portu kaldırma ve küçük harfe çevirme
  return hostname
    .replace(/^www\./, "")
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, ""); // Portu kaldır
}

// Tenant tespiti ve injection işlemi
export const resolveTenant = async (
  req: RequestWithTenant,
  res: Response,
  next: NextFunction
) => {
  const locale = req.locale || getLogLocale();
  const tenantHeader = req.headers["x-tenant"]?.toString().trim() || "";

  let tenantDoc = null;

  // Loglama (istenirse geliştirilebilir)
  logger.info(
    `Resolving tenant for request: ${req.hostname}, X-Tenant: ${tenantHeader}`,
    {
      ...getRequestContext(req),
      tenant: tenantHeader || "unknown",
      module: "tenant",
      event: "tenant.resolve",
      status: "start",
      domain: req.hostname,
    }
  );

  // 1. Superadmin için header override kontrolü
  if (tenantHeader && req.user && req.user.role === "superadmin") {
    tenantDoc = await Tenants.findOne({
      slug: tenantHeader.toLowerCase(),
    }).lean();
  }

  // 2. Domain/subdomain üzerinden tenant çözümü
  if (!tenantDoc) {
    const normalizedHost = normalizeHost(
      req.hostname || (req.headers.host as string) || ""
    );

    // Subdomain kontrolü
    tenantDoc = await Tenants.findOne({
      $or: [
        { "domain.main": normalizedHost }, // Ana domain kontrolü
        { "domain.customDomains": normalizedHost }, // Custom domains kontrolü
      ],
    }).lean();
  }

  if (tenantDoc) {
    req.tenant = tenantDoc.slug;
    req.tenantData = tenantDoc;
    req.enabledModules = (tenantDoc.enabledModules || []).map((m: string) =>
      m.trim().toLowerCase()
    );

    logger.info(
      t("tenant.resolve.success", locale, translations, {
        domain: tenantDoc.domain?.main,
        tenant: tenantDoc.slug,
      }),
      {
        ...getRequestContext(req),
        tenant: tenantDoc.slug,
        module: "tenant",
        event: "tenant.resolve",
        status: "success",
        domain: tenantDoc.domain?.main,
      }
    );
    return next();
  }

  // Tenant bulunamadı, logla ve hata döndür
  const userAgent = req.headers["user-agent"] || "";
  const isDev = process.env.NODE_ENV !== "production";
  const isPostman =
    typeof userAgent === "string" &&
    userAgent.toLowerCase().includes("postman");

  logger.error(
    t("tenant.resolve.fail", locale, translations, {
      host: req.hostname || (req.headers.host as string),
      tenantHeader: tenantHeader,
    }),
    {
      ...getRequestContext(req),
      tenant: "unknown",
      module: "tenant",
      event: "tenant.resolve",
      status: "fail",
      host: req.hostname || (req.headers.host as string),
      tenantHeader: tenantHeader,
    }
  );

  // DEVELOPMENT veya POSTMAN için hata vermez, sadece loglar ve devam eder!
  if (isDev || isPostman) {
    console.warn(
      "[resolveTenant] WARNING: Tenant bulunamadı, DEV/POSTMAN devam ediyor."
    );
    return next();
  }

  // PROD ortamında hata döndürülür
  return res.status(404).json({
    success: false,
    message: t("tenant.resolve.fail", locale, translations, {
      host: req.hostname || (req.headers.host as string),
      tenantHeader,
    }),
    detail:
      "Tenant slug not found on request object. (Did you forget to use resolveTenant middleware?)",
  });
};
