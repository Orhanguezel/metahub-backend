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

function normalizeHost(hostname: string) {
  return hostname
    .replace(/^www\./, "")
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
}

// --- API subdomainlerini tanımla (gerekirse env'den oku) ---
const API_DOMAINS = [
  "api.guezelwebdesign.com",
  // Diğer API subdomainleri de eklenebilir!
];

export const resolveTenant = async (
  req: RequestWithTenant,
  res: Response,
  next: NextFunction
) => {
  const locale = req.locale || getLogLocale();
  const tenantHeader = req.headers["x-tenant"]?.toString().trim() || "";

  let tenantDoc = null;

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
  let normalizedHost = normalizeHost(
    req.hostname || (req.headers.host as string) || ""
  );

  if (!tenantDoc) {
    // Eğer API domainine istek geldiyse, Origin/Referer ile tenant tespit etmeye çalış!
    if (API_DOMAINS.includes(normalizedHost)) {
      // Origin veya Referer'dan tenant domainini tespit et
      const origin =
        (req.headers.origin as string) || (req.headers.referer as string) || "";
      if (origin) {
        const originHost = normalizeHost(origin.replace(/^https?:\/\//, ""));
        normalizedHost = originHost;
      }
    }

    // Subdomain ve main domain kontrolü
    tenantDoc = await Tenants.findOne({
      $or: [
        { "domain.main": normalizedHost }, // Ana domain kontrolü
        { "domain.customDomains": normalizedHost }, // Custom domains kontrolü
      ],
    }).lean();
  }

  // 3. Yine bulamazsa, fallback olarak x-tenant header'a bak (herkes için)
  if (!tenantDoc && tenantHeader) {
    tenantDoc = await Tenants.findOne({
      slug: tenantHeader.toLowerCase(),
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
  const isPostman =
    typeof userAgent === "string" &&
    userAgent.toLowerCase().includes("postman");

  if (process.env.NODE_ENV === "production" || !isPostman) {
    return res.status(404).json({
      success: false,
      message: t("tenant.resolve.fail", locale, translations, {
        host: req.hostname || (req.headers.host as string),
        tenantHeader: tenantHeader,
      }),
      detail:
        "Tenant slug not found on request object. (Did you forget to use resolveTenant middleware?)",
    });
  }

  return res.status(404).json({
    success: false,
    message: t("tenant.resolve.fail", locale, translations, {
      host: req.hostname || (req.headers.host as string),
      tenantHeader: tenantHeader,
    }),
    detail:
      "Tenant slug not found on request object in DEV environment. Please check your request and tenant setup.",
  });
};
