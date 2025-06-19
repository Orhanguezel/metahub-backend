// src/modules/tenants/helpers.ts
import { SUPPORTED_LOCALES } from "@/types/common";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";

export function normalizeTenantI18nFields(tenantObj: any) {
  if (!tenantObj) return tenantObj;
  const i18nFields = [
    "name",
    "description",
    "metaTitle",
    "metaDescription",
    "address",
  ];
  for (const field of i18nFields) {
    if (tenantObj[field]) {
      tenantObj[field] = fillAllLocales(tenantObj[field]);
    }
  }
  return tenantObj;
}
