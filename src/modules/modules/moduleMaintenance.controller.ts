// src/modules/modules/moduleMaintenance.controller.ts (FINAL — tenant-scoped only)

import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import type { SupportedLocale } from "@/types/common";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// Allowed override alanları
const ALLOWED_SETTING_FIELDS = [
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
] as const;

/**
 * 1) Module→bool matrisi (yalnız header’daki tenant)
 */
export const getModuleTenantMatrix = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const tenant = req.tenant;
  if (!tenant) {
    res.status(400).json({
      success: false,
      message: translate("admin.module.tenantRequired", locale, translations),
    });
    return;
  }

  const { ModuleMeta, ModuleSetting } = await getTenantModels(req);
  const metas = await ModuleMeta.find({}, { name: 1 }).lean();
  const matrix: Record<string, boolean> = {};

  for (const m of metas) {
    const exists = await ModuleSetting.exists({ module: m.name, tenant });
    matrix[m.name] = !!exists;
  }

  res.status(200).json({
    success: true,
    message: translate("admin.module.matrixFetched", locale, translations, {
      count: Object.keys(matrix).length,
    }),
    data: matrix,
  });
  return;
});

/**
 * 2) Header’daki tenant’a tüm aktif modülleri assign et (eksikleri oluştur)
 */
export const assignAllModulesToTenant = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const tenant = req.tenant;
  if (!tenant) {
    res.status(400).json({
      success: false,
      message: translate("admin.module.tenantRequired", locale, translations),
    });
    return;
  }

  const { ModuleMeta, ModuleSetting } = await getTenantModels(req);
  const modules = await ModuleMeta.find({ enabled: true }).lean();

  let count = 0;
  for (const mod of modules) {
    const exists = await ModuleSetting.exists({ module: mod.name, tenant });
    if (!exists) {
      await ModuleSetting.create({
        module: mod.name,
        tenant,
        enabled: mod.enabled ?? true,
        visibleInSidebar: true,
        useAnalytics: false,
        showInDashboard: true,
        roles: Array.isArray(mod.roles) ? mod.roles : ["admin"],
        order: typeof mod.order === "number" ? mod.order : 0,
        seoTitle: {},
        seoDescription: {},
        seoSummary: {},
        seoOgImage: "",
      });
      count++;
    }
  }

  logger.withReq.info(
    req,
    translate("admin.module.modulesAssigned", locale, translations, { tenant, count }),
    { module: "moduleMaintenance" }
  );

  res.status(200).json({
    success: true,
    message: translate("admin.module.modulesAssigned", locale, translations, {
      tenant,
      count,
    }),
  });
  return;
});

/**
 * 3) Header’daki tenant için health repair (eksik mapping’leri tamamla)
 */
export const repairModuleSettings = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const tenant = req.tenant;
  if (!tenant) {
    res.status(400).json({
      success: false,
      message: translate("admin.module.tenantRequired", locale, translations),
    });
    return;
  }

  const { ModuleMeta, ModuleSetting } = await getTenantModels(req);
  const modules = await ModuleMeta.find({ enabled: true }).lean();

  const repaired: Array<{ module: string; tenant: string }> = [];
  for (const mod of modules) {
    const exists = await ModuleSetting.exists({ module: mod.name, tenant });
    if (!exists) {
      await ModuleSetting.create({
        module: mod.name,
        tenant,
        enabled: mod.enabled ?? true,
        visibleInSidebar: true,
        useAnalytics: false,
        showInDashboard: true,
        roles: Array.isArray(mod.roles) ? mod.roles : ["admin"],
        order: typeof mod.order === "number" ? mod.order : 0,
        seoTitle: {},
        seoDescription: {},
        seoSummary: {},
        seoOgImage: "",
      });
      repaired.push({ module: mod.name, tenant });
    }
  }

  logger.withReq.info(
    req,
    translate("admin.module.settingsRepaired", locale, translations, { count: repaired.length }),
    { module: "moduleMaintenance" }
  );

  res.status(200).json({
    success: true,
    message: translate("admin.module.settingsRepaired", locale, translations, {
      count: repaired.length,
    }),
    repaired,
  });
  return;
});

/**
 * 4) Header’daki tenant’taki TÜM mappingleri sil (cleanup)
 */
export const removeAllModulesFromTenant = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const tenant = req.tenant;
  if (!tenant) {
    res.status(400).json({
      success: false,
      message: translate("admin.module.tenantRequired", locale, translations),
    });
    return;
  }

  const { ModuleSetting } = await getTenantModels(req);
  const result = await ModuleSetting.deleteMany({ tenant });

  logger.withReq.info(
    req,
    translate("admin.module.modulesRemoved", locale, translations, {
      tenant,
      count: result.deletedCount,
    }),
    { module: "moduleMaintenance" }
  );

  res.status(200).json({
    success: true,
    message: translate("admin.module.modulesRemoved", locale, translations, {
      tenant,
      count: result.deletedCount,
    }),
    deletedCount: result.deletedCount,
  });
  return;
});

/**
 * 5) Header’daki tenant’ta orphan mapping temizliği (meta’sı olmayan settings)
 */
export const cleanupOrphanModuleSettings = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const tenant = req.tenant;
  if (!tenant) {
    res.status(400).json({
      success: false,
      message: translate("admin.module.tenantRequired", locale, translations),
    });
    return;
  }

  const { ModuleMeta, ModuleSetting } = await getTenantModels(req);
  const metaModules = (await ModuleMeta.find({}, { name: 1 }).lean()).map((m: any) => m.name);

  const orphanDocs = await ModuleSetting.find(
    { tenant, module: { $nin: metaModules } },
    { module: 1 }
  ).lean();

  if (orphanDocs.length) {
    await ModuleSetting.deleteMany({ tenant, module: { $nin: metaModules } });
  }

  logger.withReq.info(
    req,
    translate("admin.module.orphanSettingsCleaned", locale, translations, { count: orphanDocs.length }),
    { module: "moduleMaintenance" }
  );

  res.status(200).json({
    success: true,
    message: translate("admin.module.orphanSettingsCleaned", locale, translations, {
      count: orphanDocs.length,
    }),
    deletedCount: orphanDocs.length,
    orphans: orphanDocs.map((o: any) => ({ tenant, module: o.module })),
  });
  return;
});

/**
 * 6) Analitik info (header’daki tenant için): meta → useAnalytics
 */
export const getAllAnalyticsStatus = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { ModuleMeta } = await getTenantModels(req);
  const modules = await ModuleMeta.find({}, { name: 1, useAnalytics: 1 }).lean();

  const analyticsInfo = modules.map((mod: any) => ({
    name: mod.name,
    useAnalytics: mod.useAnalytics,
  }));

  res.status(200).json({
    success: true,
    message: translate("admin.module.analyticsInfoRetrieved", locale, translations, {
      count: analyticsInfo.length,
    }),
    analyticsInfo,
  });
  return;
});

/**
 * 7) Batch update (header’daki tenant’ta tek module mapping’i güncelle)
 *    Body: { module, update }
 */
export const batchUpdateModuleSetting = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const tenant = req.tenant;
  const { module, update } = req.body as { module?: string; update?: Record<string, unknown> };

  if (!tenant || !module || !update) {
    res.status(400).json({
      success: false,
      message: translate("admin.module.parametersMissing", locale, translations),
    });
    return;
  }

  // Allowed alanları filtrele
  const filteredUpdate: Record<string, unknown> = {};
  for (const key of ALLOWED_SETTING_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(update, key)) {
      filteredUpdate[key] = (update as any)[key];
    }
  }
  if (Object.keys(filteredUpdate).length === 0) {
    res.status(400).json({
      success: false,
      message: translate("admin.module.noChanges", locale, translations),
    });
    return;
  }
  filteredUpdate.updatedAt = new Date();

  const { ModuleSetting } = await getTenantModels(req);
  const result = await ModuleSetting.updateOne({ module, tenant }, { $set: filteredUpdate });

  logger.withReq.info(
    req,
    translate("admin.module.batchUpdate", locale, translations, {
      module,
      count: result.modifiedCount || 0,
    }),
    { module: "moduleMaintenance" }
  );

  res.status(200).json({
    success: true,
    message: translate("admin.module.batchUpdate", locale, translations, {
      module,
      count: result.modifiedCount || 0,
    }),
    modifiedCount: result.modifiedCount || 0,
  });
  return;
});
