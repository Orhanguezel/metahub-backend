// src/modules/admin/admin.controller.ts (veya uygun modül path'in)
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
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// --- ENV/Config ---
const PROJECT_ENV = process.env.APP_ENV;
if (!PROJECT_ENV) {
  throw new Error(
    "❌ APP_ENV is not defined. Please set the environment before running the server."
  );
}

// Yardımcı: Büyük harf başlatıcı
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
// Yardımcı: Varsayılan çok dilli label
const generateDefaultLabel = (name: string): TranslatedLabel => ({
  tr: capitalize(name),
  en: capitalize(name),
  de: capitalize(name),
  pl: capitalize(name),
  fr: capitalize(name),
  es: capitalize(name),
});

// --- Yeni modül oluştur ---
export const createModule = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const locale: SupportedLocale = req.locale || "en";
    const tenant: string = req.tenant; // Tenant middleware'den gelmeli!
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

    try {
      const {
        name,
        icon = "box",
        roles = ["admin"],
        language = "en",
        visibleInSidebar = true,
        useAnalytics = false,
        tenant = req.tenant,
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

      // Aynı isimde var mı?
      const existing = await ModuleMeta.findOne({
        name,
        tenant: req.tenant,
      });
      if (existing) {
        logger.warn(`Module '${name}' already exists.`, {
          module: "admin",
          tenant: req.tenant,
        });
        res.status(400).json({
          success: false,
          message: t("admin.module.exists", locale, translations, { name }),
        });
        return;
      }

      // Kullanıcı ve commit bilgisi (audit)
      const username = await getGitUser();
      const commitHash = await getGitCommitHash();
      const now = new Date().toISOString();

      // Çoklu dil label normalizasyonu
      let finalLabel: TranslatedLabel;
      if (label && typeof label === "object") {
        finalLabel = fillAllLocales(label);
      } else if (typeof label === "string") {
        finalLabel = fillAllLocales(label);
      } else {
        finalLabel = generateDefaultLabel(name);
      }

      // --- Meta dosyasını oluştur ve versiyon logla
      const metaContent = updateMetaVersionLog(
        {
          name,
          tenant,
          icon,
          visibleInSidebar,
          useAnalytics,
          enabled,
          roles,
          language,
          label: finalLabel,
          routes: [],
          updatedBy: { username, commitHash },
          lastUpdatedAt: now,
          history: [],
          showInDashboard,
          order,
          statsKey,
        },
        t("meta.created", locale, translations, { name, tenant }), // note
        tenant
      );

      // Dosya yolları (tenant context ile)
      const { metaPath, modulePath } = getPaths(name, tenant);

      // --- Meta dosyasını yaz
      fs.mkdirSync(path.dirname(metaPath), { recursive: true });
      fs.writeFileSync(metaPath, JSON.stringify(metaContent, null, 2));

      // --- MongoDB kayıtları (tenant-aware)
      await ModuleMeta.create(metaContent);
      await ModuleSetting.create({
        tenant: req.tenant,
        project: PROJECT_ENV,
        module: name,
        enabled,
        visibleInSidebar,
        useAnalytics,
        roles,
        icon,
        label: finalLabel,
        language,
      });

      // --- Modül dosyalarını oluştur (tenant bağımsız)
      fs.mkdirSync(modulePath, { recursive: true });
      await writeModuleFiles(modulePath, name);

      logger.info(`Module created: ${name}`, {
        module: "admin",
        tenant,
        user: username,
        locale,
      });

      res.status(201).json({
        success: true,
        message: t("admin.module.created", locale, translations, { name }),
        data: metaContent,
      });
    } catch (error) {
      logger.error("Module create error:", {
        module: "admin",
        error,
        tenant,
        locale,
      });
      return next(error);
    }
  }
);

// --- Tüm modülleri getir (opsiyonel project query) ---
export const getModules = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const locale: SupportedLocale = req.locale || "en";

    try {
      const project = req.query.project as string | undefined;
      if (!project) {
        logger.warn("Project query param eksik.", { module: "admin" });
        res.status(400).json({
          success: false,
          message: t("admin.module.projectRequired", locale, translations),
        });
        return;
      }
      const { ModuleMeta, ModuleSetting } = await getTenantModels(req);

      const settings = await ModuleSetting.find({
        project,
        tenant: req.tenant,
      });
      if (!settings || settings.length === 0) {
        res.status(200).json({
          success: true,
          message: t("admin.module.noneForProject", locale, translations),
          data: [],
        });
        return;
      }

      const moduleNames = settings.map((s) => s.module);
      const modules = await ModuleMeta.find({
        name: { $in: moduleNames },
      }).sort({ name: 1 });

      logger.info(`Modules fetched for project: ${project}`, {
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

// --- Tek modül getir (by name) ---
export const getModuleByName = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const locale: SupportedLocale = req.locale || "en";
    const { ModuleMeta } = await getTenantModels(req);
    try {
      const { name } = req.params;
      const module = await ModuleMeta.findOne({ name, tenant: req.tenant });

      if (!module) {
        logger.warn(`Module not found: ${name}`, { module: "admin" });
        res.status(404).json({
          success: false,
          message: t("admin.module.notFound", locale, translations),
        });
        return;
      }

      logger.info(`Module fetched: ${name}`, { module: "admin", locale });
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

// --- Modül güncelle ---
export const updateModule = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const locale: SupportedLocale = req.locale || "en";
    const { ModuleMeta } = await getTenantModels(req);
    try {
      const { name } = req.params;
      const updates = req.body;

      // Label için fillAllLocales uygula (Partial destekler!)
      if (updates.label) {
        updates.label = fillAllLocales(updates.label);
      }

      const updated = await ModuleMeta.findOneAndUpdate(
        { name, tenant: req.tenant },
        { $set: updates },
        { new: true }
      );
      if (!updated) {
        logger.warn(`Module not found for update: ${name}`, {
          module: "admin",
        });
        res.status(404).json({
          success: false,
          message: t("admin.module.notFound", locale, translations),
        });
        return;
      }

      logger.info(`Module updated: ${name}`, { module: "admin", locale });
      res.status(200).json({
        success: true,
        message: t("admin.module.updated", locale, translations),
        data: updated,
      });
    } catch (error) {
      logger.error("Update module error:", { module: "admin", error, locale });
      next(error);
    }
  }
);

// --- Modül sil ---
export const deleteModule = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const locale: SupportedLocale = req.locale || "en";
    const { ModuleMeta } = await getTenantModels(req);
    try {
      const { name } = req.params;

      const deleted = await ModuleMeta.findOneAndDelete({
        name,
        tenant: req.tenant,
      });
      if (!deleted) {
        logger.warn(`Module not found for delete: ${name}`, {
          module: "admin",
        });
        res.status(404).json({
          success: false,
          message: t("admin.module.notFoundOrDeleted", locale, translations),
        });
        return;
      }

      // Meta dosyasını sil
      const metaPath = path.resolve(
        process.cwd(),
        "src/meta-configs",
        PROJECT_ENV,
        `${name}.meta.json`
      );
      if (fs.existsSync(metaPath)) {
        fs.unlinkSync(metaPath);
      }

      logger.info(`Module deleted: ${name}`, { module: "admin", locale });
      res.status(200).json({
        success: true,
        message: t("admin.module.deleted", locale, translations),
      });
    } catch (error) {
      logger.error("Delete module error:", { module: "admin", error, locale });
      next(error);
    }
  }
);

// --- Mevcut projeleri getir (dinamik DEFAULT_PROJECT ile) ---
export const getProjects = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ModuleSetting } = await getTenantModels(req);
      const distinctProjects = await ModuleSetting.distinct("project");
      const DEFAULT_PROJECT = process.env.DEFAULT_PROJECT;
      if (!DEFAULT_PROJECT)
        throw new Error("❌ DEFAULT_PROJECT env variable is not defined.");

      const projects =
        distinctProjects.length > 0 ? distinctProjects : [DEFAULT_PROJECT];
      logger.info(`Projects listed: ${projects.length}`);
      res.status(200).json({
        success: true,
        message: t("admin.module.projectsFetched", "en", translations), // Anahtar önerisi
        data: projects,
      });
    } catch (error) {
      logger.error("Get projects error:", { module: "admin", error });
      next(error);
    }
  }
);

// --- Enabled modules (public) ---
export const getEnabledModules = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || "en";
    const { ModuleSetting } = await getTenantModels(req);
    const project = req.query.project as string;

    if (!project) {
      res.status(400).json({
        success: false,
        message: t("admin.module.projectRequired", locale, translations),
      });
      return;
    }

    const settings = await ModuleSetting.find({
      project,
      enabled: true,
      tenant: req.tenant,
    });
    const moduleNames = settings.map((s) => s.module);

    logger.info(`Enabled modules listed for: ${project}`, {
      module: "admin",
      locale,
    });

    res.status(200).json({
      success: true,
      message: t("admin.module.enabledFetched", locale, translations),
      data: moduleNames,
    });
  }
);

// --- Analytics aktif modülleri getir (public) ---
export const getAnalyticsModules = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || "en";
    const { ModuleSetting } = await getTenantModels(req);
    const project = req.query.project as string;

    if (!project) {
      res.status(400).json({
        success: false,
        message: t("admin.module.projectRequired", locale, translations),
      });
      return;
    }

    const settings = await ModuleSetting.find({
      project,
      tenant: req.tenant,
      enabled: true,
      useAnalytics: true,
    });
    const moduleNames = settings.map((s) => s.module);

    logger.info(`Analytics modules listed for: ${project}`, {
      module: "admin",
      locale,
    });

    res.status(200).json({
      success: true,
      message: t("admin.module.analyticsFetched", locale, translations),
      data: moduleNames,
    });
  }
);

// --- useAnalytics toggle ---
export const toggleUseAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || "en";
    const { ModuleMeta, ModuleSetting } = await getTenantModels(req);
    const { name } = req.params;
    const { value, project } = req.body; // boolean + project

    if (typeof value !== "boolean" || !project) {
      res.status(400).json({
        success: false,
        message: t("admin.module.toggleAnalyticsInvalid", locale, translations),
      });
      return;
    }

    const setting = await ModuleSetting.findOneAndUpdate(
      { name, tenant: req.tenant, project },
      { $set: { useAnalytics: value } },
      { new: true }
    );

    const meta = await ModuleMeta.findOneAndUpdate(
      { name, tenant: req.tenant },
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

    logger.info(`Analytics toggled for '${name}' -> ${value}`, {
      module: "admin",
      locale,
    });

    res.status(200).json({
      success: true,
      message: t("admin.module.analyticsToggled", locale, translations),
      data: { setting, meta },
    });
  }
);
