import fs from "fs";
import path from "path";
import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import { updateMetaVersionLog } from "@/scripts/generateMeta/helpers/updateMetaVersion";
import {
  getGitUser,
  getGitCommitHash,
} from "@/scripts/generateMeta/helpers/gitHelpers";
import { writeModuleFiles } from "@/scripts/createModule/writeModuleFiles";
import { getPaths } from "@/scripts/createModule/utils";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import type { SupportedLocale, TranslatedLabel } from "@/types/common";
import { SUPPORTED_LOCALES } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import type { IModuleMeta, IModuleSetting } from "@/modules/modules/types";
import { Tenants } from "@/modules/tenants/tenants.model";

// 1. Tüm modül-tenant matrix: hangi modül, hangi tenant’ta aktif?
export const getModuleTenantMatrix = asyncHandler(async (req, res) => {
  const { ModuleMeta, ModuleSetting } = await getTenantModels(req);
  const modules = await ModuleMeta.find({}).lean();
  const tenants = await Tenants.find({ isActive: true }).lean();
  const matrix: Record<string, any> = {};
  for (const modRaw of modules) {
    const mod = modRaw as any;
    matrix[mod.name] = {};
    for (const t of tenants) {
      const setting = await ModuleSetting.findOne({
        module: mod.name,
        tenant: t.slug,
      });
      matrix[mod.name][t.slug] = setting || false;
    }
  }
  res.status(200).json({ success: true, data: matrix });
  return;
});

// 2. Tek tenant’a tüm modüllerin eklenmesi (batch onboarding)
export const assignAllModulesToTenant = asyncHandler(async (req, res) => {
  const { tenant } = req.body;
  if (!tenant) {
    res
      .status(400)
      .json({ success: false, message: "Tenant parametresi zorunlu." });
    return;
  }
  const { ModuleMeta, ModuleSetting } = await getTenantModels(req);
  const modules = await ModuleMeta.find({}).lean();
  let count = 0;
  for (const modRaw of modules) {
    const mod = modRaw as any;
    const exists = await ModuleSetting.findOne({ module: mod.name, tenant });
    if (!exists) {
      await ModuleSetting.create({
        module: mod.name,
        tenant,
        enabled: mod.enabled ?? true,
        visibleInSidebar: mod.visibleInSidebar ?? true,
        useAnalytics: mod.useAnalytics ?? false,
        showInDashboard: mod.showInDashboard ?? true,
        roles: Array.isArray(mod.roles) ? mod.roles : ["admin"],
      });
      count++;
    }
  }
  res.status(200).json({ success: true, message: `${count} modül atandı.` });
  return;
});

// 3. Tüm tenantlara yeni modül ekle (global onboarding)
export const assignModuleToAllTenants = asyncHandler(async (req, res) => {
  const { module } = req.body;
  if (!module) {
    res.status(400).json({ success: false, message: "Modül adı zorunlu." });
    return;
  }
  const tenants = await Tenants.find({ isActive: true }).lean();
  let count = 0;
  for (const t of tenants) {
    const { ModuleMeta, ModuleSetting } = await getTenantModels(req);
    const exists = await ModuleSetting.findOne({ module, tenant: t.slug });
    if (!exists) {
      await ModuleSetting.create({ module, tenant: t.slug });
      count++;
    }
  }
  res
    .status(200)
    .json({ success: true, message: `${count} tenant’a eklendi.` });
  return;
});

// 4. Tüm modül/setting health check (eksik varsa tamamlama)
export const repairModuleSettings = asyncHandler(async (req, res) => {
  const { ModuleMeta, ModuleSetting } = await getTenantModels(req);
  const modules = await ModuleMeta.find({});
  const tenants = await Tenants.find({ isActive: true }).lean();
  let repaired: any[] = [];
  for (const mod of modules) {
    for (const t of tenants) {
      const exists = await ModuleSetting.findOne({
        module: mod.name,
        tenant: t.slug,
      });
      if (!exists) {
        await ModuleSetting.create({ module: mod.name, tenant: t.slug });
        repaired.push({ module: mod.name, tenant: t.slug });
      }
    }
  }
  res.status(200).json({ success: true, repaired });
  return;
});

// 5. Bir tenant’taki tüm modül mappinglerini sil (cleanup)
export const removeAllModulesFromTenant = asyncHandler(async (req, res) => {
  const { tenant } = req.body;
  if (!tenant) {
    res.status(400).json({ success: false, message: "Tenant zorunlu." });
    return;
  }
  const { ModuleMeta, ModuleSetting } = await getTenantModels(req);
  const result = await ModuleSetting.deleteMany({ tenant });
  res.status(200).json({ success: true, deletedCount: result.deletedCount });
  return;
});

// 6. Bir modülü tüm tenantlardan kaldır (cleanup)
export const removeModuleFromAllTenants = asyncHandler(async (req, res) => {
  const { module } = req.body;
  if (!module) {
    res.status(400).json({ success: false, message: "Modül adı zorunlu." });
    return;
  }
  const { ModuleMeta, ModuleSetting } = await getTenantModels(req);
  const result = await ModuleSetting.deleteMany({ module });
  res.status(200).json({ success: true, deletedCount: result.deletedCount });
  return;
});

// 7. Settings’te orphan kalan (meta kaydı olmayan) modülleri bul/temizle
export const cleanupOrphanModuleSettings = asyncHandler(async (req, res) => {
  const { ModuleMeta, ModuleSetting } = await getTenantModels(req);
  const metaModules = (await ModuleMeta.find({})).map((m) => m.name);
  const orphans = await ModuleSetting.find({ module: { $nin: metaModules } });
  if (orphans.length) {
    await ModuleSetting.deleteMany({ module: { $nin: metaModules } });
  }
  res
    .status(200)
    .json({ success: true, deletedCount: orphans.length, orphans });
  return;
});

// 8. Tüm modül usage/analitik durumunu listele
export const getAllAnalyticsStatus = asyncHandler(async (req, res) => {
  const { ModuleMeta, ModuleSetting } = await getTenantModels(req);
  const modules = await ModuleMeta.find({}).lean(); // .lean() ekle, plain objeler gelsin
  // Burada map içinde as any ile garanti altına al
  const analyticsInfo = modules.map((mod) => ({
    name: (mod as any).name,
    useAnalytics: (mod as any).useAnalytics, // TS2339 hatası kalkar
  }));
  res.status(200).json({ success: true, analyticsInfo });
  return;
});

// 9. Batch update: Bir alanı tüm tenantlarda topluca güncelle
export const batchUpdateModuleSetting = asyncHandler(async (req, res) => {
  const { module, update } = req.body;
  if (!module || !update) {
    res.status(400).json({ success: false, message: "Parametreler eksik." });
    return;
  }
  const { ModuleMeta, ModuleSetting } = await getTenantModels(req);
  const result = await ModuleSetting.updateMany({ module }, { $set: update });
  res.status(200).json({ success: true, modifiedCount: result.modifiedCount });
  return;
});

// 10. Belirli bir tenant’ın sahip olduğu tüm modülleri ve ayarları getir
export const getTenantModuleSettings = asyncHandler(async (req, res) => {
  const { tenant } = req.params;
  if (!tenant) {
    res.status(400).json({ success: false, message: "Tenant zorunlu." });
    return;
  }
  const { ModuleMeta, ModuleSetting } = await getTenantModels(req);
  const modules = await ModuleSetting.find({ tenant });
  res.status(200).json({ success: true, data: modules });
  return;
});

// 11. Tenant silindiğinde ilgili tüm mapping/setting kayıtlarını temizle (otomatik/manual endpoint)
export const removeTenantMappingsOnDelete = asyncHandler(async (req, res) => {
  const { tenant } = req.body;
  if (!tenant) {
    res.status(400).json({ success: false, message: "Tenant zorunlu." });
    return;
  }
  const { ModuleMeta, ModuleSetting } = await getTenantModels(req);
  const result = await ModuleSetting.deleteMany({ tenant });
  res.status(200).json({ success: true, deletedCount: result.deletedCount });
  return;
});
