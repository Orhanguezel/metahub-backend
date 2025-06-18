import tenants from "./tenants.json";
import logger from "../logger/logger";
import translations from "./i18n"; // Modülün i18n'i (ör: tenant/i18n)
import { t } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { getRequestContext } from "../logger/logRequestContext";

const ALLOWED_LOCAL_TENANTS = Object.values(tenants).map((t) =>
  typeof t === "string" ? t.toLowerCase() : t
);

function normalizeHost(hostname: string) {
  return hostname
    .replace(/^www\./, "")
    .trim()
    .toLowerCase();
}

export const resolveTenantFromRequest = (req) => {
  const locale = req.locale || getLogLocale();
  const tenantHeader = req.headers["x-tenant"];

  // Superadmin ise header ile override edebilir
  if (
    tenantHeader &&
    typeof tenantHeader === "string" &&
    tenantHeader.trim() !== ""
  ) {
    const th = tenantHeader.trim().toLowerCase();
    if (req.user && (req.user.role === "superadmin" || req.user.isSuperAdmin)) {
      if (ALLOWED_LOCAL_TENANTS.includes(th)) {
        logger.info(
          t("tenant.override.success", locale, translations, {
            userId: req.user?.id,
            tenant: th,
          }),
          {
            ...getRequestContext(req),
            tenant: th,
            module: "tenant",
            event: "tenant.override",
            status: "success",
            userId: req.user?.id,
          }
        );
        return th;
      } else {
        logger.error(
          t("tenant.override.not_found", locale, translations, { tenant: th }),
          {
            ...getRequestContext(req),
            tenant: th,
            module: "tenant",
            event: "tenant.override",
            status: "fail",
            userId: req.user?.id,
          }
        );
        throw new Error(
          t("tenant.override.not_found", locale, translations, { tenant: th })
        );
      }
    } else {
      // Superadmin değilse override DENIED
      logger.warn(
        t("tenant.override.denied", locale, translations, {
          userId: req.user?.id,
          tenant: th,
        }),
        {
          ...getRequestContext(req),
          tenant: th,
          module: "tenant",
          event: "tenant.override",
          status: "fail",
          userId: req.user?.id,
          userRole: req.user?.role,
        }
      );
      // override YOK, devamında host/domain mapping'e geç!
    }
  }

  // Hostname/domain mapping
  const normalized = normalizeHost(req.hostname || req.headers.host || "");
  for (const [domain, tenant] of Object.entries(tenants)) {
    const domainNorm = normalizeHost(domain);
    if (normalized === domainNorm || normalized.endsWith(`.${domainNorm}`)) {
      logger.info(
        t("tenant.resolve.success", locale, translations, {
          domain: normalized,
          tenant,
        }),
        {
          ...getRequestContext(req),
          tenant,
          module: "tenant",
          event: "tenant.resolve",
          status: "success",
          domain: normalized,
        }
      );
      return tenant;
    }
  }

  logger.error(
    t("tenant.resolve.fail", locale, translations, {
      host: normalized,
      tenantHeader: req.headers["x-tenant"],
    }),
    {
      ...getRequestContext(req),
      tenant: "unknown",
      module: "tenant",
      event: "tenant.resolve",
      status: "fail",
      host: normalized,
      tenantHeader: req.headers["x-tenant"],
    }
  );

  throw new Error(
    t("tenant.resolve.fail", locale, translations, {
      host: normalized,
      tenantHeader: req.headers["x-tenant"],
    })
  );
};
