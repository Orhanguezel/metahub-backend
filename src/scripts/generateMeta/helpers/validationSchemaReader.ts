import { ValidationChain } from "express-validator";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

/**
 * Her yerde kullanılacak dil helper'ı
 */
function getLang(): SupportedLocale {
  return getLogLocale();
}

/**
 * Dinamik validation dosyasını bulur ve JSON Schema'ya çevirir.
 * Tüm loglar tenant-aware ve i18n ile yazılır.
 *
 * @param moduleName Modül ismi
 * @param routePath Endpoint yolu
 * @param method HTTP metodu (varsayılan: post)
 * @param tenant Tenant context (opsiyonel, loglarda zorunlu)
 */
export async function getValidationBodySchema(
  moduleName: string,
  routePath: string,
  method: string = "post",
  tenant: string = process.env.TENANT_NAME || "global"
): Promise<any | null> {
  const lang = getLang();

  try {
    // Dinamik validation import
    let validationModule: any;
    try {
      validationModule = await import(
        `@/modules/${moduleName}/${moduleName}.validation`
      );
    } catch (err: any) {
      logger.debug(
        `[Meta] No validation file found for module "${moduleName}"`,
        { tenant }
      );
      return null;
    }

    if (!validationModule || Object.keys(validationModule).length === 0) {
      logger.warn(
        t("meta.validation.empty", lang, translations, {
          mod: moduleName,
          tenant,
        }),
        { tenant }
      );
      return null;
    }

    // Eşleşen validation bul
    const matchedValidation = findMatchingValidation(
      validationModule,
      routePath
    );
    const methodLower = method.toLowerCase();

    if (!matchedValidation) {
      if (!["get", "delete"].includes(methodLower)) {
        logger.info(
          t("meta.validation.notFound", lang, translations, {
            mod: moduleName,
            route: routePath,
            tenant,
          }),
          { tenant }
        );
      }
      return null;
    }

    if (!Array.isArray(matchedValidation)) {
      logger.debug(
        `[Meta] Validation found for ${moduleName} ${routePath}, but not iterable/array. Skipping.`,
        { tenant }
      );
      return null;
    }

    // JSON Schema'ya dönüştür
    const schema = transformExpressValidatorToJsonSchema(matchedValidation);
    logger.info(
      t("meta.validation.schemaGenerated", lang, translations, {
        mod: moduleName,
        route: routePath,
        tenant,
      }),
      { tenant }
    );
    return schema;
  } catch (err: any) {
    logger.error(
      t("meta.validation.importFail", lang, translations, {
        mod: moduleName,
        error: err.message,
        tenant,
      }),
      { tenant }
    );
    return null;
  }
}

function findMatchingValidation(validationModule: any, routePath: string) {
  const keys = Object.keys(validationModule);

  const normalize = (str: string) =>
    str.toLowerCase().replace(/[:/]/g, "").replace(/-/g, "");

  const normalizedRoute = normalize(routePath);

  for (const key of keys) {
    const normalizedKey = normalize(key);

    // Tam eşleşme
    if (normalizedRoute === normalizedKey) return validationModule[key];

    // Parçalı eşleşme (örn: forgotpassword vs /forgot-password)
    if (
      normalizedRoute.includes(normalizedKey) ||
      normalizedKey.includes(normalizedRoute)
    )
      return validationModule[key];

    // create / update fallback
    if (normalizedKey.includes("create") && routePath === "/")
      return validationModule[key];
    if (normalizedKey.includes("update") && routePath === "/:id")
      return validationModule[key];
  }
  return null;
}

function transformExpressValidatorToJsonSchema(
  validationArray: ValidationChain[]
): any {
  const properties: Record<string, any> = {};

  for (const rule of validationArray) {
    // @ts-ignore güvenli erişim
    const context = (rule as any)._context;
    if (!context || !context.fields || context.fields.length === 0) continue;
    const field = context.fields[0];
    if (!field) continue;

    let type = "string";
    const validators = context.stack?.map((v: any) => v.validator.name) || [];

    if (validators.includes("isBoolean")) type = "boolean";
    else if (
      validators.includes("isNumeric") ||
      validators.includes("isInt") ||
      validators.includes("isFloat")
    )
      type = "number";
    else if (validators.includes("isArray")) type = "array";

    properties[field] = { type };
  }

  return {
    type: "object",
    properties,
  };
}
