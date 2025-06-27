// src/modules/modules/moduleSetting.controller.ts
import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import { ModuleSetting, ModuleMeta } from "./admin.models";
import type { SupportedLocale } from "@/types/common";

/**
 * Tenant için bir modül setting'ini güncelle (sadece override alanlar)
 */
export const updateModuleSetting = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || "en";
    const tenant: string = req.tenant || req.body.tenant;
    const { module, ...fields } = req.body;
    const updates = req.body;

    if (!tenant || !module) {
      logger.warn("Tenant veya module eksik!", { module: "moduleSetting" });
      res.status(400).json({
        success: false,
        message: t("admin.module.tenantRequired", locale, translations),
      });
      return;
    }

    // Global enabled kontrolü
    const meta = await ModuleMeta.findOne({ name: module });
    if (!meta || !meta.enabled) {
      res.status(403).json({
        success: false,
        message: t("admin.module.globalDisabled", locale, translations),
      });
      return;
    }

    // Sadece override alanlar güncellenebilir:
    const allowedFields: string[] = [
      "enabled",
      "visibleInSidebar",
      "useAnalytics",
      "showInDashboard",
      "roles",
      "order",
    ];

    const updateObj: Record<string, any> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) updateObj[key] = updates[key];
    }
    updateObj.updatedAt = new Date();

    // Güncelleme yap ve güncel objeyi döndür
    const setting = await ModuleSetting.findOneAndUpdate(
      { module, tenant },
      { $set: updateObj },
      { new: true }
    );

    if (!setting) {
      logger.warn("Module setting not found!", { module: "moduleSetting" });
      res.status(404).json({
        success: false,
        message: t("admin.module.notFound", locale, translations),
      });
      return;
    }

    logger.info(`ModuleSetting updated: ${module} (${tenant})`, {
      module: "moduleSetting",
      tenant,
    });

    res.status(200).json({
      success: true,
      message: t("admin.module.updated", locale, translations),
      data: setting,
    });
  }
);

/**
 * Tenant’a ait tüm modül settinglerini getirir
 */
export const getTenantModuleSettings = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || "en";
  const tenant: string = req.tenant || req.params.tenant;
  if (!tenant) {
    res.status(400).json({
      success: false,
      message: t("admin.module.tenantRequired", locale, translations),
    });
    return;
  }
  const settings = await ModuleSetting.find({ tenant });
  res.status(200).json({
    success: true,
    data: settings,
  });
});

/**
 * Tenant için bir modül setting'ini siler (sadece mapping’i kaldırır)
 */
export const deleteModuleSetting = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || "en";
  const tenant: string = req.tenant;
  const { module } = req.body;
  if (!tenant || !module) {
    res.status(400).json({
      success: false,
      message: t("admin.module.tenantRequired", locale, translations),
    });
    return;
  }
  const result = await ModuleSetting.deleteOne({ module, tenant });
  logger.info(`ModuleSetting deleted: ${module} (${tenant})`, {
    module: "moduleSetting",
    tenant,
  });
  res.status(200).json({
    success: true,
    message: t("admin.module.deleted", locale, translations),
    deletedCount: result.deletedCount,
  });
});

/**
 * Bir tenant’taki tüm setting mappinglerini topluca sil (ör: tenant silindiğinde cleanup)
 */
export const deleteAllSettingsForTenant = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || "en";
  const tenant: string = req.tenant || req.body.tenant || req.params.tenant;
  if (!tenant) {
    res.status(400).json({
      success: false,
      message: t("admin.module.tenantRequired", locale, translations),
    });
    return;
  }
  const result = await ModuleSetting.deleteMany({ tenant });
  logger.info(`All settings deleted for tenant: ${tenant}`, {
    module: "moduleSetting",
    tenant,
  });
  res.status(200).json({
    success: true,
    message: t("admin.module.allSettingsDeleted", locale, translations),
    deletedCount: result.deletedCount,
  });
});
