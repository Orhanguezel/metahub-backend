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

// Subdomain olarak gelen API domainleri (gerekirse ENV'den oku)
const API_DOMAINS = [
  "api.guezelwebdesign.com",
  // ... diğer API subdomainleri
];

export const resolveTenant = async (
  req: RequestWithTenant,
  res: Response,
  next: NextFunction
) => {
  const locale = req.locale || getLogLocale();
  const tenantHeader = req.headers["x-tenant"]?.toString().trim() || "";
  let tenantDoc = null;

  logger.info(`[DEBUG] [TENANT] Giriş isteği:`, {
    hostname: req.hostname,
    xTenant: tenantHeader,
    headers: req.headers,
  });

  // 1️⃣ Süperadmin için x-tenant override (PROD ve DEV)
  if (tenantHeader && req.user && req.user.role === "superadmin") {
    tenantDoc = await Tenants.findOne({
      slug: tenantHeader.toLowerCase(),
    }).lean();
    logger.info(
      `[DEBUG] [TENANT] Süperadmin override ile çözümlendi. tenant: ${
        tenantDoc?.slug || "null"
      }, mongoUri: ${tenantDoc?.mongoUri}`
    );
  }

  // 2️⃣ Domain/subdomain mapping ile tenant bul
  if (!tenantDoc) {
    let normalizedHost = normalizeHost(
      req.hostname || (req.headers.host as string) || ""
    );

    // Eğer API subdomain ise, origin/referer üzerinden tenantı bul
    if (API_DOMAINS.includes(normalizedHost)) {
      const origin =
        (req.headers.origin as string) || (req.headers.referer as string) || "";
      if (origin) {
        const originHost = normalizeHost(origin.replace(/^https?:\/\//, ""));
        normalizedHost = originHost;
      }
      logger.info(
        `[DEBUG] [TENANT] API_SUBDOMAIN. Origin/Referer ile host normalize edildi: ${normalizedHost}`
      );
    }

    tenantDoc = await Tenants.findOne({
      $or: [
        { "domain.main": normalizedHost },
        { "domain.customDomains": normalizedHost },
      ],
    }).lean();
    logger.info(
      `[DEBUG] [TENANT] Domain mapping ile tenant çözümlendi mi?: ${
        tenantDoc?.slug || "null"
      }, mongoUri: ${tenantDoc?.mongoUri}`
    );
  }

  // 3️⃣ DEV ortamında localhost/127.0.0.1 için fallback (production'da asla yok!)
  if (!tenantDoc && process.env.NODE_ENV !== "production") {
    const normalizedHost = normalizeHost(
      req.hostname || (req.headers.host as string) || ""
    );
    if (
      normalizedHost === "localhost" ||
      normalizedHost === "127.0.0.1" ||
      normalizedHost.startsWith("localhost:") ||
      normalizedHost.startsWith("127.0.0.1:")
    ) {
      tenantDoc = await Tenants.findOne({ slug: "metahub" }).lean();
      logger.info(
        `[DEBUG] [TENANT] DEV fallback: localhost/127.0.0.1 için metahub kullanıldı. tenant: ${
          tenantDoc?.slug || "null"
        }, mongoUri: ${tenantDoc?.mongoUri}`
      );
    }
  }

  // 4️⃣ Final Sonuç: Tenant bulunduysa requeste ekle ve devam et
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
        mongoUri: tenantDoc.mongoUri,
      }
    );
    logger.info(
      `[DEBUG] [TENANT] FINAL tenant: ${tenantDoc.slug} mongoUri: ${tenantDoc.mongoUri}`
    );
    return next();
  }

  // 5️⃣ Tenant bulunamazsa her ortamda 404 ve log
  logger.warn(`[DEBUG] [TENANT] Tenant çözümlenemedi!`);
  return res.status(404).json({
    success: false,
    message: t("tenant.resolve.fail", locale, translations, {
      host: req.hostname || (req.headers.host as string),
      tenantHeader: tenantHeader,
    }),
    detail:
      process.env.NODE_ENV === "production"
        ? "Tenant slug not found on request object."
        : "Tenant slug not found in DEV environment. Please check your request and tenant setup.",
  });
};
