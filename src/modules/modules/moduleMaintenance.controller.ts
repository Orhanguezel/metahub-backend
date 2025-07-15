// src/modules/modules/moduleMaintenance.controller.ts
import fs from "fs";
import path from "path";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import { ModuleMeta, ModuleSetting } from "./admin.models";
import { Tenants } from "@/modules/tenants/tenants.model";
import type { SupportedLocale } from "@/types/common";

/**
 * 1️⃣ Tüm modül-tenant matrix: hangi modül hangi tenant'ta var?
 */
export const getModuleTenantMatrix = asyncHandler(async (req, res) => {
  const modules = await ModuleMeta.find({}).lean();
  const tenants = await Tenants.find({ isActive: true }).lean();
  const matrix: Record<string, any> = {};

  for (const mod of modules) {
    matrix[mod.name] = {};
    for (const t of tenants) {
      const setting = await ModuleSetting.findOne({
        module: mod.name,
        tenant: t.slug,
      });
      matrix[mod.name][t.slug] = !!setting;
    }
  }
  res.status(200).json({ success: true, data: matrix });
});

/**
 * 2️⃣ Tek tenant'a tüm aktif modülleri assign et (eksik mapping’leri oluştur)
 */
export const assignAllModulesToTenant = asyncHandler(async (req, res) => {
  const { tenant } = req.body;
  if (!tenant) {
    res
      .status(400)
      .json({ success: false, message: "Tenant parametresi zorunlu." });
    return;
  }
  const modules = await ModuleMeta.find({ enabled: true }).lean();
  let count = 0;
  for (const mod of modules) {
    const exists = await ModuleSetting.findOne({ module: mod.name, tenant });
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
      });
      count++;
    }
  }
  logger.withReq.info(
    req,
    `[Maintenance] ${count} modül ${tenant} tenant'ına atandı.`
  );
  res.status(200).json({ success: true, message: `${count} modül atandı.` });
});

/**
 * 3️⃣ Tüm tenantlara yeni bir modül ekle (global onboarding)
 */
export const assignModuleToAllTenants = asyncHandler(async (req, res) => {
  const { module } = req.body;
  if (!module) {
    res.status(400).json({ success: false, message: "Modül adı zorunlu." });
    return;
  }
  const tenants = await Tenants.find({ isActive: true }).lean();
  let count = 0;
  for (const t of tenants) {
    const exists = await ModuleSetting.findOne({ module, tenant: t.slug });
    if (!exists) {
      await ModuleSetting.create({
        module,
        tenant: t.slug,
        enabled: true,
        visibleInSidebar: true,
        useAnalytics: false,
        showInDashboard: true,
        roles: ["admin"],
        order: 0,
      });
      count++;
    }
  }
  logger.withReq.info(
    req,
    `[Maintenance] ${module} modülü ${count} tenant’a atandı.`
  );
  res
    .status(200)
    .json({ success: true, message: `${count} tenant’a eklendi.` });
});

/**
 * 4️⃣ Tüm modül/setting health check (eksik mapping varsa tamamla)
 */
export const repairModuleSettings = asyncHandler(async (req, res) => {
  const modules = await ModuleMeta.find({ enabled: true });
  const tenants = await Tenants.find({ isActive: true }).lean();
  let repaired: any[] = [];
  for (const mod of modules) {
    for (const t of tenants) {
      const exists = await ModuleSetting.findOne({
        module: mod.name,
        tenant: t.slug,
      });
      if (!exists) {
        await ModuleSetting.create({
          module: mod.name,
          tenant: t.slug,
          enabled: mod.enabled ?? true,
          visibleInSidebar: true,
          useAnalytics: false,
          showInDashboard: true,
          roles: Array.isArray(mod.roles) ? mod.roles : ["admin"],
          order: typeof mod.order === "number" ? mod.order : 0,
        });
        repaired.push({ module: mod.name, tenant: t.slug });
      }
    }
  }
  logger.withReq.info(
    req,
    `[Maintenance] ${repaired.length} mapping tamir edildi.`
  );
  res.status(200).json({ success: true, repaired });
});

/**
 * 5️⃣ Bir tenant’taki tüm modül mappinglerini sil (tenant silinirse cleanup)
 */
export const removeAllModulesFromTenant = asyncHandler(async (req, res) => {
  const { tenant } = req.body;
  if (!tenant) {
    res.status(400).json({ success: false, message: "Tenant zorunlu." });
    return;
  }
  const result = await ModuleSetting.deleteMany({ tenant });
  logger.withReq.info(
    req,
    `[Maintenance] Tenant '${tenant}' mappingleri silindi (${result.deletedCount})`
  );
  res.status(200).json({ success: true, deletedCount: result.deletedCount });
});

/**
 * 6️⃣ Bir modülü tüm tenantlardan kaldır (cleanup)
 */
export const removeModuleFromAllTenants = asyncHandler(async (req, res) => {
  const { module } = req.body;
  if (!module) {
    res.status(400).json({ success: false, message: "Modül adı zorunlu." });
    return;
  }
  const result = await ModuleSetting.deleteMany({ module });
  logger.withReq.info(
    req,
    `[Maintenance] Modül '${module}' tüm tenantlardan silindi (${result.deletedCount})`
  );
  res.status(200).json({ success: true, deletedCount: result.deletedCount });
});

/**
 * 7️⃣ Orphan setting cleanup: meta kaydı olmayan mapping'leri bul ve sil
 */
export const cleanupOrphanModuleSettings = asyncHandler(async (req, res) => {
  const metaModules = (await ModuleMeta.find({})).map((m) => m.name);
  const orphans = await ModuleSetting.find({ module: { $nin: metaModules } });
  if (orphans.length) {
    await ModuleSetting.deleteMany({ module: { $nin: metaModules } });
  }
  logger.withReq.info(
    req,
    `[Maintenance] ${orphans.length} orphan mapping silindi.`
  );
  res
    .status(200)
    .json({ success: true, deletedCount: orphans.length, orphans });
});

/**
 * 8️⃣ Analitik info: tüm meta’larda useAnalytics alanı listesi
 */
export const getAllAnalyticsStatus = asyncHandler(async (req, res) => {
  const modules = await ModuleMeta.find({}).lean();
  const analyticsInfo = modules.map((mod) => ({
    name: mod.name,
    useAnalytics: (mod as any).useAnalytics, // Eski legacy field için as any (tercihen modelde olmasın)
  }));
  res.status(200).json({ success: true, analyticsInfo });
});

/**
 * 9️⃣ Batch update: Bir modülün tüm tenantlardaki mappinglerini topluca güncelle
 */
export const batchUpdateModuleSetting = asyncHandler(async (req, res) => {
  const { module, update } = req.body;
  if (!module || !update) {
    res.status(400).json({ success: false, message: "Parametreler eksik." });
    return;
  }
  const result = await ModuleSetting.updateMany({ module }, { $set: update });
  logger.withReq.info(
    req,
    `[Maintenance] '${module}' için batch update yapıldı (${result.modifiedCount})`
  );
  res.status(200).json({ success: true, modifiedCount: result.modifiedCount });
});
