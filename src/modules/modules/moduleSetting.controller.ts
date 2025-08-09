// src/modules/modules/moduleSetting.controller.ts (FINAL)

import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import type { SupportedLocale } from "@/types/common";

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

/**
 * PATCH /modules/setting
 * Header’daki tenant için tek module setting override (yalnızca izinli alanlar)
 * Body: { module: string, ...overrides }
 * NOT: tenant asla body/path ile gelmez; yalnızca x-tenant header’dan çözülür.
 */
export const updateModuleSetting = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || "en";
  const tenant: string = req.tenant;
  const { module } = req.body as { module?: string; [k: string]: unknown };

  if (!tenant || !module) {
    logger.withReq.warn(req, "Tenant veya module eksik!", { module: "moduleSetting" });
    res.status(400).json({
      success: false,
      message: t("admin.module.tenantRequired", locale, translations),
    });
    return;
  }

  // Tenant alanı body’de gelse bile asla kullanılmaz
  if ("tenant" in req.body) {
    delete (req.body as any).tenant;
  }

  const { ModuleMeta, ModuleSetting } = await getTenantModels(req);

  // Global (meta) enabled kontrolü
  const meta = await ModuleMeta.findOne({ name: module, tenant });
  if (!meta || !meta.enabled) {
    res.status(403).json({
      success: false,
      message: t("admin.module.globalDisabled", locale, translations),
    });
    return;
  }

  // Sadece izin verilen alanlar güncellenir
  const updates = req.body as Record<string, unknown>;
  const updateObj: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (updates[key] !== undefined) updateObj[key] = updates[key];
  }
  if (Object.keys(updateObj).length === 0) {
    res.status(400).json({
      success: false,
      message: t("admin.module.noChanges", locale, translations),
    });
    return;
  }
  updateObj.updatedAt = new Date();

  const setting = await ModuleSetting.findOneAndUpdate(
    { module, tenant },
    { $set: updateObj },
    { new: true }
  );

  if (!setting) {
    logger.withReq.warn(req, "Module setting not found!", { module: "moduleSetting" });
    res.status(404).json({
      success: false,
      message: t("admin.module.notFound", locale, translations),
    });
    return;
  }

  logger.withReq.info(req, `ModuleSetting updated: ${module} (${tenant})`, {
    module: "moduleSetting",
    tenant,
  });

  res.status(200).json({
    success: true,
    message: t("admin.module.updated", locale, translations),
    data: setting,
  });
  return;
});

/**
 * GET /modules/setting
 * Header’daki tenant’a ait tüm module setting kayıtları
 */
export const getTenantModuleSettings = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || "en";
  const tenant: string = req.tenant;

  if (!tenant) {
    res.status(400).json({
      success: false,
      message: t("admin.module.tenantRequired", locale, translations),
    });
    return;
  }

  const { ModuleSetting } = await getTenantModels(req);
  const settings = await ModuleSetting.find({ tenant });

  res.status(200).json({
    success: true,
    data: settings,
  });
  return;
});

/**
 * DELETE /modules/setting
 * Header’daki tenant için tek mapping siler
 * Body: { module: string }
 */
export const deleteModuleSetting = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || "en";
  const tenant: string = req.tenant;
  const { module } = req.body as { module?: string };

  if (!tenant || !module) {
    res.status(400).json({
      success: false,
      message: t("admin.module.tenantRequired", locale, translations),
    });
    return;
  }

  const { ModuleSetting } = await getTenantModels(req);
  const result = await ModuleSetting.deleteOne({ module, tenant });

  logger.withReq.info(req, `ModuleSetting deleted: ${module} (${tenant})`, {
    module: "moduleSetting",
    tenant,
  });

  res.status(200).json({
    success: true,
    message: t("admin.module.deleted", locale, translations),
    deletedCount: result.deletedCount,
  });
  return;
});

/**
 * DELETE /modules/setting/tenant
 * Header’daki tenant için TÜM mappingleri topluca siler (tenant cleanup)
 */
export const deleteAllSettingsForTenant = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || "en";
  const tenant: string = req.tenant;

  if (!tenant) {
    res.status(400).json({
      success: false,
      message: t("admin.module.tenantRequired", locale, translations),
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
    message: t("admin.module.allSettingsDeleted", locale, translations),
    deletedCount: result.deletedCount,
  });
  return;
});
