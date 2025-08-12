// src/modules/modules/moduleSetting.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import type { SupportedLocale, TranslatedLabel } from "@/types/common";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

const ALLOWED_FIELDS: string[] = [
  "enabled",
  "visibleInSidebar",
  "useAnalytics",
  "showInDashboard",
  "roles",
  "order",
  "seoTitle",
  "seoDescription",
  "seoSummary",
  "seoOgImage",
];

const LOCALIZED_FIELDS: Array<"seoTitle" | "seoDescription" | "seoSummary"> = [
  "seoTitle",
  "seoDescription",
  "seoSummary",
];

const normalizeLocalized = (val: any): TranslatedLabel => {
  // string veya kısmi obje gelebilir -> full locale objesine tamamla
  return fillAllLocales(val || "");
};

const tr = (
  key: string,
  locale: SupportedLocale,
  params?: Record<string, any>
) => translate(key, locale, translations, params);

/**
 * PATCH /modules/setting
 * Tenant için tek module setting override (yalnızca izinli alanlar)
 * Body: { module: string, ...overrides }
 */
export const updateModuleSetting = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const tenant: string = req.tenant;
  const { module } = req.body as { module?: string; [k: string]: unknown };

  if (!tenant || !module) {
    logger.withReq.warn(req, "Tenant veya module eksik!", { module: "moduleSetting" });
    res.status(400).json({
      success: false,
      message: tr("admin.module.tenantRequired", locale),
    });
    return;
  }

  // Body'den gelen tenant'ı asla kullanma
  if ("tenant" in req.body) delete (req.body as any).tenant;

  const { ModuleMeta, ModuleSetting } = await getTenantModels(req);

  // Global (meta) enabled kontrolü
  const meta = await ModuleMeta.findOne({ name: module, tenant }).lean();
  if (!meta || !meta.enabled) {
    res.status(403).json({
      success: false,
      message: tr("admin.module.globalDisabled", locale),
    });
    return;
  }

  // Sadece izinli alanlar
  const updates = req.body as Record<string, unknown>;
  const updateObj: Record<string, unknown> = {};

  for (const key of ALLOWED_FIELDS) {
    if (updates[key] === undefined) continue;

    // localized alanları normalize et
    if (LOCALIZED_FIELDS.includes(key as any)) {
      updateObj[key] = normalizeLocalized(updates[key]);
      continue;
    }

    // roles: tek string ise diziye çevir
    if (key === "roles") {
      const roles = updates.roles;
      if (Array.isArray(roles)) {
        updateObj.roles = roles;
      } else if (typeof roles === "string") {
        updateObj.roles = [roles];
      }
      continue;
    }

    // order: sayılaştır
    if (key === "order") {
      const n = Number(updates.order);
      if (!Number.isNaN(n)) updateObj.order = n;
      continue;
    }

    // diğerleri
    updateObj[key] = updates[key];
  }

  if (Object.keys(updateObj).length === 0) {
    res.status(400).json({
      success: false,
      message: tr("admin.module.noChanges", locale),
    });
    return;
  }

  updateObj.updatedAt = new Date();

  // Upsert: yoksa oluştur, varsa güncelle
  const setting = await ModuleSetting.findOneAndUpdate(
    { module, tenant },
    {
      $setOnInsert: { module, tenant, createdAt: new Date() },
      $set: updateObj,
    },
    { new: true, upsert: true }
  ).lean();

  logger.withReq.info(req, `ModuleSetting upserted: ${module} (${tenant})`, {
    module: "moduleSetting",
    tenant,
  });

  res.status(200).json({
    success: true,
    message: tr("admin.module.updated", locale),
    data: setting,
  });
});

/**
 * GET /modules/setting
 * Tenant’a ait tüm module setting kayıtları
 */
export const getTenantModuleSettings = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const tenant: string = req.tenant;

  if (!tenant) {
    res.status(400).json({
      success: false,
      message: tr("admin.module.tenantRequired", locale),
    });
    return;
  }

  const { ModuleSetting } = await getTenantModels(req);
  const settings = await ModuleSetting.find({ tenant }).sort({ module: 1 }).lean();

  res.status(200).json({
    success: true,
    data: settings,
  });
});

/**
 * DELETE /modules/setting
 * Tenant için tek mapping siler
 * Body: { module: string }
 */
export const deleteModuleSetting = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const tenant: string = req.tenant;
  const { module } = req.body as { module?: string };

  if (!tenant || !module) {
    res.status(400).json({
      success: false,
      message: tr("admin.module.tenantRequired", locale),
    });
    return;
  }

  const { ModuleSetting } = await getTenantModels(req);
  const result = await ModuleSetting.deleteOne({ module, tenant });

  if (result.deletedCount === 0) {
    res.status(404).json({
      success: false,
      message: tr("admin.module.notFound", locale),
    });
    return;
  }

  logger.withReq.info(req, `ModuleSetting deleted: ${module} (${tenant})`, {
    module: "moduleSetting",
    tenant,
  });

  res.status(200).json({
    success: true,
    message: tr("admin.module.deleted", locale),
    deletedCount: result.deletedCount,
  });
});

/**
 * DELETE /modules/setting/tenant
 * Tenant için TÜM mapping’leri topluca siler
 */
export const deleteAllSettingsForTenant = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const tenant: string = req.tenant;

  if (!tenant) {
    res.status(400).json({
      success: false,
      message: tr("admin.module.tenantRequired", locale),
    });
    return;
  }

  const { ModuleSetting } = await getTenantModels(req);
  const result = await ModuleSetting.deleteMany({ tenant });

  logger.withReq.info(req, `All settings deleted for tenant: ${tenant}`, {
    module: "moduleSetting",
    tenant,
  });

  res.status(200).json({
    success: true,
    message: tr("admin.module.allSettingsDeleted", locale),
    deletedCount: result.deletedCount,
  });
});
