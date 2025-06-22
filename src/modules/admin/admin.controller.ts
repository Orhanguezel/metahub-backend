import fs from "fs";
import path from "path";
import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/admin/i18n";
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

// --- Modül Oluştur (dosya+DB zorunlu, çok tenantlı, audit tam) ---
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
      tenants = [tenant], // Dizi!
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

    // Aynı isim ve tenantlardan biri için var mı?
    const existing = await ModuleMeta.findOne({
      name,
      tenants: { $in: tenants },
    });
    if (existing) {
      logger.warn(`Module '${name}' already exists for these tenants.`, {
        module: "admin",
        tenants,
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

    // --- Meta dosyası ve versiyon logu oluştur ---
    // Tüm tenants için bir meta dosyası, tenant ismiyle (ilk tenant) path belirle!
    const mainTenant = tenants[0];
    const metaContent = updateMetaVersionLog(
      {
        name,
        tenants,
        icon,
        visibleInSidebar,
        useAnalytics,
        enabled,
        roles,
        language,
        label: finalLabel,
        routes: [],
        updatedBy: { username: userDisplayName, commitHash },
        lastUpdatedAt: now,
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
        showInDashboard,
        order,
        statsKey,
        createdBy: userDisplayName,
        gitUser,
        commitHash,
        createdAt: now,
        updatedAt: now,
      },
      t("meta.created", locale, translations, { name, tenant: mainTenant }),
      mainTenant
    );

    // Dosya yolları (ilk tenant context ile - dizi olabilir, path içinde ilk tenant kullanılabilir)
    const { metaPath, modulePath } = getPaths(name, mainTenant);

    // Meta dosyasını oluştur (JSON, zorunlu)
    fs.mkdirSync(path.dirname(metaPath), { recursive: true });
    fs.writeFileSync(metaPath, JSON.stringify(metaContent, null, 2));

    // Modül dizini oluştur (isteğe bağlı)
    fs.mkdirSync(modulePath, { recursive: true });
    await writeModuleFiles(modulePath, name);

    // MongoDB kayıtları (Meta + Settings)
    const createdMeta = await ModuleMeta.create(metaContent);

    // Her tenant için ayar satırı oluştur (tenant alanı zorunlu)
    const settingsCreated: any[] = [];
    for (const tnt of tenants) {
      const settingData = {
        module: name,
        enabled,
        visibleInSidebar,
        useAnalytics,
        roles,
        icon,
        label: finalLabel,
        language,
        tenant: tnt,
        createdBy: userDisplayName,
        gitUser,
        commitHash,
      };
      const setting = await ModuleSetting.create(settingData);
      settingsCreated.push(setting);
    }

    logger.info(
      `Module '${name}' created for tenants: [${tenants.join(", ")}]`,
      {
        module: "admin",
        user: userDisplayName,
        locale,
        gitUser,
        commitHash,
      }
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

// --- Modül güncelle ---
export const updateModule = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const locale: SupportedLocale = req.locale || "en";
    const { ModuleMeta, ModuleSetting } = await getTenantModels(req);

    try {
      const { name } = req.params;
      const updates = req.body;

      // --- Label normalize
      if (updates.label) {
        updates.label = fillAllLocales(updates.label);
      }

      let updatedTenants: string[] | undefined;
      if (updates.tenants && Array.isArray(updates.tenants)) {
        updatedTenants = updates.tenants;
      }

      // --- Ana Meta kaydı güncelle
      const meta = await ModuleMeta.findOne({
        name,
        tenants: { $in: updatedTenants || [] },
      });

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

      // --- Git bilgilerini al
      const now = new Date().toISOString();
      const userDisplayName = req.user?.name || req.user?.email || "system";
      meta.history = meta.history || [];
      meta.history.push({
        version: meta.version || "1.0.0",
        by: userDisplayName,
        date: now,
        note: "Module updated",
      });

      // --- Meta kaydını güncelle
      Object.entries(updates).forEach(([key, value]) => {
        if (key !== "tenants") meta[key] = value;
      });
      if (updatedTenants) {
        meta.tenants = updatedTenants;
      }
      meta.version = meta.version ? `${meta.version}-updated` : "1.0.0-updated";
      await meta.save();

      // --- Her tenant için ayarları güncelle (veya oluştur)
      const tenantsToUpdate = updatedTenants || meta.tenants || [];
      const updateSettingFields = {
        enabled: updates.enabled,
        visibleInSidebar: updates.visibleInSidebar,
        useAnalytics: updates.useAnalytics,
        roles: updates.roles,
        icon: updates.icon,
        label: updates.label,
        language: updates.language,
      };

      // Mevcut ayarları güncelle
      for (const tnt of tenantsToUpdate) {
        const existingSetting = await ModuleSetting.findOne({
          module: name,
          tenant: tnt,
        });

        if (existingSetting) {
          // Yalnızca gelen alanlar güncellenir (boş ise eskiyi koru)
          Object.entries(updateSettingFields).forEach(([key, value]) => {
            if (value !== undefined) existingSetting[key] = value;
          });
          await existingSetting.save();
        } else {
          // Eğer yeni tenant eklenmişse, ayarı oluştur
          await ModuleSetting.create({
            module: name,
            tenant: tnt,
            ...updateSettingFields,
          });
        }
      }

      // Silinen tenant’lardan ayarı sil (opsiyonel, burada bırakabilirsin)
      if (updatedTenants) {
        const tenantsToRemove = (meta.tenants as string[]).filter(
          (oldTnt) => !updatedTenants!.includes(oldTnt)
        );
        if (tenantsToRemove.length) {
          await ModuleSetting.deleteMany({
            module: name,
            tenant: { $in: tenantsToRemove },
          });
        }
      }

      logger.info(`Module updated: ${name}`, { module: "admin", locale });
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

// --- Tüm modülleri getir (aktif tenant context) ---
export const getModules = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const locale: SupportedLocale = req.locale || "en";
    const { ModuleMeta, ModuleSetting } = await getTenantModels(req);

    try {
      const tenant = req.tenant;
      if (!tenant) {
        logger.warn("Tenant context yok!", { module: "admin" });
        res.status(400).json({
          success: false,
          message: t("admin.module.tenantRequired", locale, translations),
        });
        return;
      }

      // Bu tenant için aktif/görünür tüm ayarları getir
      const settings = await ModuleSetting.find({
        tenant,
        enabled: true,
        visibleInSidebar: true,
      });

      if (!settings || settings.length === 0) {
        res.status(200).json({
          success: true,
          message: t("admin.module.noneForTenant", locale, translations),
          data: [],
        });
        return;
      }

      // Ayarlardaki modül isimleriyle meta datası çek
      const moduleNames = settings.map((s) => s.module);
      const modules = await ModuleMeta.find({
        name: { $in: moduleNames },
        tenants: tenant, // Tenant array'inde bu tenant atanmış mı?
        enabled: true,
        visibleInSidebar: true,
      }).sort({ order: 1, name: 1 });

      logger.info(`Modules fetched for tenant: ${tenant}`, {
        module: "admin",
        locale,
      });
      res.status(200).json({
        success: true,
        message: t("admin.module.fetchedAll", locale, translations),
        data: modules,
      });
    } catch (error) {
      logger.error("Get modules error:", { module: "admin", error, locale });
      next(error);
    }
  }
);

// --- Tek modül getir (by name, aktif tenant için) ---
export const getModuleByName = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const locale: SupportedLocale = req.locale || "en";
    const { ModuleMeta } = await getTenantModels(req);

    try {
      const { name } = req.params;
      const tenant = req.tenant;
      if (!tenant) {
        logger.warn("Tenant context yok!", { module: "admin" });
        res.status(400).json({
          success: false,
          message: t("admin.module.tenantRequired", locale, translations),
        });
        return;
      }

      const module = await ModuleMeta.findOne({
        name,
        tenants: tenant,
        enabled: true,
      });

      if (!module) {
        logger.warn(`Module not found for tenant: ${name}`, {
          module: "admin",
        });
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
        data: module,
      });
    } catch (error) {
      logger.error("Get module by name error:", {
        module: "admin",
        error,
        locale,
      });
      next(error);
    }
  }
);

// --- Modül sil (tenant-aware) ---
export const deleteModule = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const locale: SupportedLocale = req.locale || "en";
    const tenant = req.tenant;
    const { ModuleMeta, ModuleSetting } = await getTenantModels(req);

    try {
      const { name } = req.params;
      if (!tenant) {
        res.status(400).json({
          success: false,
          message: t("admin.module.tenantRequired", locale, translations),
        });
        return;
      }

      // 1. ModuleMeta: tenants dizisinden çıkar
      const meta = await ModuleMeta.findOne({ name });
      if (!meta) {
        logger.warn(`Module not found for delete: ${name}`, {
          module: "admin",
        });
        res.status(404).json({
          success: false,
          message: t("admin.module.notFoundOrDeleted", locale, translations),
        });
        return;
      }

      // Tenants dizisinden ilgili tenantı çıkar
      meta.tenants = (meta.tenants || []).filter(
        (tnt: string) => tnt !== tenant
      );

      if (meta.tenants.length === 0) {
        // Hiç tenant kalmadıysa meta kaydını sil + meta dosyasını sil
        await ModuleMeta.deleteOne({ name });
        // JSON meta dosyasını da sil
        const metaPath = path.resolve(
          process.cwd(),
          "src/meta-configs",
          process.env.APP_ENV || "default",
          `${name}.meta.json`
        );
        if (fs.existsSync(metaPath)) {
          fs.unlinkSync(metaPath);
        }
      } else {
        // Tenant listesini güncelle
        await meta.save();
      }

      // 2. ModuleSetting: Bu tenant ve modül için olan ayarı sil
      await ModuleSetting.deleteOne({ module: name, tenant });

      logger.info(`Module deleted from tenant: ${tenant} (${name})`, {
        module: "admin",
        locale,
      });
      res.status(200).json({
        success: true,
        message: t("admin.module.deleted", locale, translations),
      });
      return;
    } catch (error) {
      logger.error("Delete module error:", { module: "admin", error, locale });
      next(error);
    }
  }
);

// --- Seçili tenant'ın aktif/görünür modüllerini getir ---
export const getTenantModules = asyncHandler(
  async (req: Request, res: Response) => {
    const { ModuleSetting } = await getTenantModels(req);
    const tenant = req.tenant;
    if (!tenant) {
      res.status(400).json({
        success: false,
        message: t("admin.module.tenantRequired", req.locale, translations),
      });
      return;
    }
    // Tüm ayarları veya filtreli (örn. sadece enabled) modülleri getir
    const modules = await ModuleSetting.find({ tenant, enabled: true });
    res.status(200).json({
      success: true,
      data: modules,
    });
  }
);

// --- Aktif tenantlara göre benzersiz modül isimleri (opsiyonel) ---
export const getDistinctTenantModules = asyncHandler(
  async (req: Request, res: Response) => {
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
  }
);

// --- Enabled & Sidebar & Analytics modules (public, tenant-aware) ---
export const getEnabledModules = asyncHandler(
  async (req: Request, res: Response) => {
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

    // Query string ile filtre desteği (opsiyonel)
    const onlySidebar = req.query.visibleInSidebar === "true";
    const onlyAnalytics = req.query.useAnalytics === "true";

    // Dinamik filtre objesi
    const filter: any = { tenant, enabled: true };
    if (onlySidebar) filter.visibleInSidebar = true;
    if (onlyAnalytics) filter.useAnalytics = true;

    // Tüm tenant'a atanmış ve filtreye uyan modüller
    const settings = await ModuleSetting.find(filter).sort({
      order: 1,
      module: 1,
    });

    // Modül isimleri (kısa array)
    const moduleNames = settings.map((s) => s.module);

    logger.info(`Enabled modules listed for tenant: ${tenant}`, {
      module: "admin",
      locale,
      visibleInSidebar: onlySidebar,
      useAnalytics: onlyAnalytics,
    });

    res.status(200).json({
      success: true,
      message: t("admin.module.enabledFetched", locale, translations),
      modules: moduleNames,
      data: settings, // Her biri: { module, label, icon, ... }
    });
  }
);

// --- Analytics aktif modülleri getir (public, tenant-aware) ---
export const getAnalyticsModules = asyncHandler(
  async (req: Request, res: Response) => {
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

    // İsteğe bağlı: visibleInSidebar filtresi de query’den alınabilir
    const onlySidebar = req.query.visibleInSidebar === "true";

    // Filtre objesi
    const filter: any = {
      tenant,
      enabled: true,
      useAnalytics: true,
    };
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
      data: settings, // Modül ayarlarının tamamı
    });
  }
);

// --- useAnalytics toggle (tenant + module bazlı) ---
export const toggleUseAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || "en";
    const tenant = req.tenant;
    const { ModuleMeta, ModuleSetting } = await getTenantModels(req);

    const { module, value } = req.body; // module adı ve yeni boolean value

    if (!tenant || !module || typeof value !== "boolean") {
      res.status(400).json({
        success: false,
        message: t("admin.module.toggleAnalyticsInvalid", locale, translations),
      });
      return;
    }

    // ModuleSetting update
    const setting = await ModuleSetting.findOneAndUpdate(
      { module, tenant },
      { $set: { useAnalytics: value } },
      { new: true }
    );

    // ModuleMeta update (tenants içinde varsa günceller)
    const meta = await ModuleMeta.findOneAndUpdate(
      { name: module, tenants: tenant },
      { $set: { useAnalytics: value } },
      { new: true }
    );

    if (!setting || !meta) {
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
      data: { setting, meta },
    });
  }
);
