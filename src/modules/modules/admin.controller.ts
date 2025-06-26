import fs from "fs";
import path from "path";
import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import {
  getGitUser,
  getGitCommitHash,
} from "@/scripts/generateMeta/helpers/gitHelpers";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import type { SupportedLocale, TranslatedLabel } from "@/types/common";
import { SUPPORTED_LOCALES } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import type { IModuleMeta, IModuleSetting } from "@/modules/modules/types";

// --- Modül Oluştur ---
export const createModule = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const locale: SupportedLocale = req.locale || "en";
    const tenant: string = req.tenant;
    if (!tenant) {
      logger.error("Tenant bulunamadı (createModule)!", {
        module: "admin",
        event: "createModule",
        status: "fail",
        locale,
      });
      res.status(400).json({
        success: false,
        message: t("admin.module.tenantRequired", locale, translations),
      });
      return;
    }

    const { ModuleMeta, ModuleSetting } = await getTenantModels(req);
    const {
      name,
      icon = "box",
      roles = ["admin"],
      language = "en",
      visibleInSidebar = true,
      useAnalytics = false,
      enabled = true,
      label,
      showInDashboard = true,
      order = 0,
      statsKey = "",
    } = req.body;

    if (!name) {
      logger.warn("Modül adı girilmedi.", {
        module: "admin",
        fn: "createModule",
        tenant,
      });
      res.status(400).json({
        success: false,
        message: t("admin.module.nameRequired", locale, translations),
      });
      return;
    }

    const existing = await ModuleMeta.findOne({ name });
    if (existing) {
      logger.warn(`Module '${name}' already exists.`, {
        module: "admin",
        name,
      });
      res.status(400).json({
        success: false,
        message: t("admin.module.exists", locale, translations, { name }),
      });
      return;
    }

    // Çoklu dil label doldur
    let finalLabel: TranslatedLabel;
    if (label && typeof label === "object") {
      finalLabel = fillAllLocales(label);
    } else if (typeof label === "string") {
      finalLabel = fillAllLocales(label);
    } else {
      finalLabel = SUPPORTED_LOCALES.reduce(
        (acc, lng) => ({ ...acc, [lng]: name }),
        {} as TranslatedLabel
      );
    }

    // AUDIT ve GIT bilgileri
    const now = new Date().toISOString();
    const gitUser = await getGitUser();
    const commitHash = await getGitCommitHash();
    const userDisplayName =
      req.user?.name || req.user?.email || gitUser || "system";

    // --- Meta kaydını oluştur ---
    const metaContent = {
      name,
      icon,
      roles,
      language,
      visibleInSidebar,
      useAnalytics,
      enabled,
      label: finalLabel,
      showInDashboard,
      order,
      statsKey,
      history: [
        {
          version: "1.0.0",
          by: userDisplayName,
          gitUser,
          commitHash,
          date: now,
          note: "Module created",
        },
      ],
      createdBy: userDisplayName,
      gitUser,
      commitHash,
      createdAt: now,
      updatedAt: now,
      routes: [],
    };

    const createdMeta = await ModuleMeta.create(metaContent);

    // Tenant settings
    const settingsCreated: any[] = [];
    const tenants: string[] = [tenant];
    for (const tnt of tenants) {
      const settingData = {
        module: name,
        tenant: tnt,
        enabled,
        visibleInSidebar,
        useAnalytics,
        roles,
        createdAt: now,
        updatedAt: now,
        createdBy: userDisplayName,
      };
      const setting = await ModuleSetting.create(settingData);
      settingsCreated.push(setting);
    }

    logger.info(
      `Module '${name}' created for tenants: [${tenants.join(", ")}]`,
      { module: "admin", user: userDisplayName, locale, gitUser, commitHash }
    );

    res.status(201).json({
      success: true,
      message: t("admin.module.created", locale, translations, { name }),
      data: metaContent,
      db: createdMeta,
      settings: settingsCreated,
    });
    return;
  }
);

// --- Modül Güncelle (SADECE GLOBAL FIELDS!) ---
export const updateModule = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const locale: SupportedLocale = req.locale || "en";
    const { ModuleMeta, ModuleSetting } = await getTenantModels(req);

    try {
      const { name } = req.params;
      const updates = req.body;

      // --- YALNIZCA ŞU ALANLAR GÜNCELLENEBİLİR ---
      const allowedFields: (keyof IModuleMeta)[] = [
        "label",
        "icon",
        "roles",
        "enabled",
        "language",
        "order",
      ];
      Object.keys(updates).forEach((key) => {
        if (!allowedFields.includes(key as keyof IModuleMeta))
          delete updates[key];
      });

      // Çoklu dil label normalize
      if (updates.label) {
        updates.label = fillAllLocales(updates.label);
      }

      // --- Meta kaydı güncelle ---
      const meta = await ModuleMeta.findOne({ name });
      if (!meta) {
        logger.warn(`Module not found for update: ${name}`, {
          module: "admin",
        });
        res.status(404).json({
          success: false,
          message: t("admin.module.notFound", locale, translations),
        });
        return;
      }

      // --- Audit/History ---
      const now = new Date();
      const userDisplayName = req.user?.name || req.user?.email || "system";
      meta.history = meta.history || [];
      meta.history.push({
        version: meta.version || "1.0.0",
        by: userDisplayName,
        date: now.toISOString(),
        note: "Module updated",
      });

      // --- Sadece global field'lar güncelleniyor
      for (const key of allowedFields) {
        if (updates[key] !== undefined) (meta as any)[key] = updates[key];
      }
      meta.updatedAt = now;
      await meta.save();

      // Eğer enabled false ise, ilgili tüm tenantlarda da pasif yap!
      if ("enabled" in updates && updates.enabled === false) {
        await ModuleSetting.updateMany({ module: name }, { enabled: false });
      }

      logger.info(`Global module updated: ${name}`, {
        module: "admin",
        locale,
      });
      res.status(200).json({
        success: true,
        message: t("admin.module.updated", locale, translations),
        data: meta,
      });
    } catch (error) {
      logger.error("Update module error:", { module: "admin", error, locale });
      next(error);
    }
  }
);

// --- Tenant settings için PATCH endpoint (sidebar/analytics/dashb. için) ---
export const updateTenantModuleSetting = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || "en";
    const tenant: string = req.tenant;
    const { ModuleMeta, ModuleSetting } = await getTenantModels(req);

    // 🚩 DÜZELTME: Tip belirttik!
    const { module, ...fields }: { module: string } & Partial<IModuleSetting> =
      req.body;

    if (!tenant || !module) {
      res.status(400).json({
        success: false,
        message: t("admin.module.tenantRequired", locale, translations),
      });
      return;
    }

    // Global enabled kontrolü!
    const meta = await ModuleMeta.findOne({ name: module });
    if (!meta || !meta.enabled) {
      res.status(403).json({
        success: false,
        message: t("admin.module.globalDisabled", locale, translations),
      });
      return;
    }

    // Sadece şu alanlar güncellenebilir:
    const allowedFields: (keyof IModuleSetting)[] = [
      "enabled",
      "visibleInSidebar",
      "useAnalytics",
      "showInDashboard",
      "roles",
    ];
    const updateObj: Partial<Record<keyof IModuleSetting, any>> = {};
    for (const key of allowedFields) {
      if (fields[key] !== undefined) {
        updateObj[key] = fields[key];
      }
    }
    updateObj.updatedAt = new Date();

    const setting = await ModuleSetting.findOneAndUpdate(
      { module, tenant },
      { $set: updateObj },
      { new: true }
    );
    if (!setting) {
      res.status(404).json({
        success: false,
        message: t("admin.module.notFound", locale, translations),
      });
      return;
    }

    logger.info(`Tenant module setting updated: ${module} (${tenant})`, {
      module: "admin",
      locale,
    });
    res.status(200).json({
      success: true,
      message: t("admin.module.updated", locale, translations),
      data: setting,
    });
  }
);

// --- Tüm modülleri getir (aktif tenant context) ---
export const getModules = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || "en";
  const tenant: string = req.tenant;
  const { ModuleMeta, ModuleSetting } = await getTenantModels(req);

  if (!tenant) {
    res.status(400).json({
      success: false,
      message: t("admin.module.tenantRequired", locale, translations),
    });
    return;
  }

  const settings = await ModuleSetting.find({ tenant });
  const moduleNames = settings.map((s) => s.module);
  const metas = await ModuleMeta.find({ name: { $in: moduleNames } });

  const data = metas.map((meta) => {
    const setting = settings.find((s) => s.module === meta.name);
    return {
      ...meta.toObject(),
      enabled: setting?.enabled ?? meta.enabled,
      roles: setting?.roles ?? meta.roles,
      tenantSettingId: setting?._id,
    };
  });

  logger.info(`Modules listed for tenant: ${tenant}`, {
    module: "admin",
    locale,
  });
  res.status(200).json({ success: true, data });
});

// --- Tek modül getir (by name, aktif tenant için) ---
export const getModuleByName = asyncHandler(async (req, res, next) => {
  const locale: SupportedLocale = req.locale || "en";
  const tenant = req.tenant;
  const { name } = req.params;
  const { ModuleMeta, ModuleSetting } = await getTenantModels(req);

  if (!tenant) {
    logger.warn("Tenant context yok!", { module: "admin" });
    res.status(400).json({
      success: false,
      message: t("admin.module.tenantRequired", locale, translations),
    });
    return;
  }

  const meta = await ModuleMeta.findOne({ name });
  const setting = await ModuleSetting.findOne({ module: name, tenant });

  if (!meta || !setting) {
    logger.warn(`Module not found for tenant: ${name}`, { module: "admin" });
    res.status(404).json({
      success: false,
      message: t("admin.module.notFound", locale, translations),
    });
    return;
  }

  logger.info(`Module fetched: ${name} (tenant: ${tenant})`, {
    module: "admin",
    locale,
  });

  res.status(200).json({
    success: true,
    message: t("admin.module.fetched", locale, translations),
    data: {
      ...meta.toObject(),
      enabled: setting.enabled,
      visibleInSidebar: setting.visibleInSidebar,
      useAnalytics: setting.useAnalytics,
      roles: setting.roles,
    },
  });
});

// --- Modül sil (tenant-aware) ---
export const deleteModule = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || "en";
  const tenant: string = req.tenant;
  const { ModuleMeta, ModuleSetting } = await getTenantModels(req);
  const { name } = req.params;

  if (!tenant) {
    res.status(400).json({
      success: false,
      message: t("admin.module.tenantRequired", locale, translations),
    });
    return;
  }

  // Tenant-mapping’i sil
  await ModuleSetting.deleteOne({ module: name, tenant });

  // Başka mapping kalmadıysa meta kaydını da kaldır
  const mappingCount = await ModuleSetting.countDocuments({ module: name });
  if (mappingCount === 0) {
    await ModuleMeta.deleteOne({ name });
  }

  logger.info(`Module deleted from tenant: ${tenant} (${name})`, {
    module: "admin",
    locale,
  });
  res.status(200).json({
    success: true,
    message: t("admin.module.deleted", locale, translations),
  });
});

// --- Seçili tenant'ın aktif/görünür modüllerini getir ---
export const getTenantModules = asyncHandler(async (req, res) => {
  const { ModuleSetting } = await getTenantModels(req);
  const tenant = req.tenant;
  if (!tenant) {
    res.status(400).json({
      success: false,
      message: t("admin.module.tenantRequired", req.locale, translations),
    });
    return;
  }
  const modules = await ModuleSetting.find({ tenant, enabled: true });
  res.status(200).json({
    success: true,
    data: modules,
  });
});

// --- Aktif tenantlara göre benzersiz modül isimleri (opsiyonel) ---
export const getDistinctTenantModules = asyncHandler(async (req, res) => {
  const { ModuleSetting } = await getTenantModels(req);
  const tenant = req.tenant;
  if (!tenant) {
    res.status(400).json({
      success: false,
      message: t("admin.module.tenantRequired", req.locale, translations),
    });
    return;
  }
  const moduleNames = await ModuleSetting.distinct("module", { tenant });
  res.status(200).json({
    success: true,
    data: moduleNames,
  });
});

// --- Enabled Modules (tenant context, hem global hem tenant enabled kontrolüyle) ---
export const getEnabledModules = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || "en";
  const tenant = req.tenant;
  const { ModuleMeta, ModuleSetting } = await getTenantModels(req);

  if (!tenant) {
    res.status(400).json({
      success: false,
      message: t("admin.module.tenantRequired", locale, translations),
    });
    return;
  }

  // Önce global enabled modülleri bul
  const metas = await ModuleMeta.find({ enabled: true });
  const globalModuleNames = metas.map((m) => m.name);

  // Sadece global enabled modüller içinden tenant setting’lerini bul
  const filter: any = {
    tenant,
    module: { $in: globalModuleNames },
    enabled: true,
  };
  if (req.query.visibleInSidebar === "true") filter.visibleInSidebar = true;
  if (req.query.useAnalytics === "true") filter.useAnalytics = true;

  const settings = await ModuleSetting.find(filter).sort({
    order: 1,
    module: 1,
  });

  res.status(200).json({
    success: true,
    message: t("admin.module.enabledFetched", locale, translations),
    modules: settings.map((s) => s.module),
    data: settings,
  });
});

// --- Analytics aktif modülleri getir (public, tenant-aware) ---
export const getAnalyticsModules = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || "en";
  const tenant = req.tenant;
  const { ModuleSetting } = await getTenantModels(req);

  if (!tenant) {
    res.status(400).json({
      success: false,
      message: t("admin.module.tenantRequired", locale, translations),
    });
    return;
  }
  const onlySidebar = req.query.visibleInSidebar === "true";
  const filter: any = { tenant, enabled: true, useAnalytics: true };
  if (onlySidebar) filter.visibleInSidebar = true;

  const settings = await ModuleSetting.find(filter).sort({
    order: 1,
    module: 1,
  });
  const moduleNames = settings.map((s) => s.module);

  logger.info(`Analytics modules listed for tenant: ${tenant}`, {
    module: "admin",
    locale,
    visibleInSidebar: onlySidebar,
  });

  res.status(200).json({
    success: true,
    message: t("admin.module.analyticsFetched", locale, translations),
    modules: moduleNames,
    data: settings,
  });
});

// --- useAnalytics toggle (tenant + module bazlı) ---
export const toggleUseAnalytics = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || "en";
  const tenant = req.tenant;
  const { ModuleSetting } = await getTenantModels(req);

  const { module, value } = req.body;

  if (!tenant || !module || typeof value !== "boolean") {
    res.status(400).json({
      success: false,
      message: t("admin.module.toggleAnalyticsInvalid", locale, translations),
    });
    return;
  }

  const setting = await ModuleSetting.findOneAndUpdate(
    { module, tenant },
    { $set: { useAnalytics: value, updatedAt: new Date() } },
    { new: true }
  );

  if (!setting) {
    res.status(404).json({
      success: false,
      message: t("admin.module.notFound", locale, translations),
    });
    return;
  }

  logger.info(`Analytics toggled for '${module}' -> ${value}`, {
    module: "admin",
    tenant,
    locale,
  });

  res.status(200).json({
    success: true,
    message: t("admin.module.analyticsToggled", locale, translations),
    data: setting,
  });
});
