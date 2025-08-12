// src/modules/modules/moduleMeta.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import type { SupportedLocale, TranslatedLabel } from "@/types/common";
import { SUPPORTED_LOCALES } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

/** create */
export const createModuleMeta = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { ModuleMeta } = await getTenantModels(req);

  const {
    name,
    icon = "box",
    roles = ["admin"],
    enabled = true,
    language = "en",
    label,
    version = "1.0.0",
    order = 0,
    statsKey = "",
    routes = [],
  } = req.body;

  const tenant = req.tenant; // ❗ güvenli: body'den alma
  if (!name) {
    logger.withReq.warn(req, "Module name is required", { module: "moduleMeta" });
    res.status(400).json({ success: false, message: t("admin.module.nameRequired", { locale }) });
    return;
  }

  const existing = await ModuleMeta.findOne({ name, tenant });
  if (existing) {
    logger.withReq.warn(req, `Module '${name}' already exists.`, { module: "moduleMeta" });
    res.status(400).json({ success: false, message: t("admin.module.exists", { locale, name }) });
    return;
  }

  let finalLabel: TranslatedLabel;
  if (label && typeof label === "object") {
    finalLabel = fillAllLocales(label);
  } else if (typeof label === "string") {
    finalLabel = fillAllLocales(label);
  } else {
    finalLabel = SUPPORTED_LOCALES.reduce((acc, lng) => ({ ...acc, [lng]: name }), {} as TranslatedLabel);
  }

  const now = new Date();
  const userDisplayName = req.user?.name || req.user?.email || "system";

  const metaContent = {
    tenant,
    name,
    icon,
    roles,
    enabled,
    language,
    label: finalLabel,
    version,
    order,
    statsKey,
    history: [
      {
        version,
        by: userDisplayName,
        date: now,
        note: "Module created",
      },
    ],
    routes,
    createdAt: now,
    updatedAt: now,
  };

  const createdMeta = await ModuleMeta.create(metaContent);

  logger.withReq.info(req, t("admin.module.created", { name, locale }), {
    module: "moduleMeta",
    user: userDisplayName,
    locale,
  });

  res.status(201).json({
    success: true,
    message: t("admin.module.created", { locale, name }),
    data: createdMeta,
  });
});

/** update (history push sadece version değiştiyse) */
export const updateModuleMeta = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { name } = req.params;
  const bodyUpdates = { ...(req.body || {}) };

  const { ModuleMeta } = await getTenantModels(req);

  // yalnız şu alanlar
  const allowedFields = [
    "label",
    "icon",
    "roles",
    "enabled",
    "language",
    "order",
    "version",
    "statsKey",
    "routes",
  ];
  Object.keys(bodyUpdates).forEach((k) => {
    if (!allowedFields.includes(k)) delete (bodyUpdates as any)[k];
  });

  if (bodyUpdates.label) {
    bodyUpdates.label = fillAllLocales(bodyUpdates.label);
  }

  const tenant = req.tenant;
  const metaBefore = await ModuleMeta.findOne({ name, tenant });
  if (!metaBefore) {
    logger.withReq.warn(req, t("admin.module.notFound", { locale, name }), { module: "moduleMeta" });
    res.status(404).json({ success: false, message: t("admin.module.notFound", { locale, name }) });
    return;
  }

  const now = new Date();
  const userDisplayName = req.user?.name || req.user?.email || "system";

  const nextVersion =
    typeof bodyUpdates.version === "string" && bodyUpdates.version.trim()
      ? bodyUpdates.version.trim()
      : metaBefore.version;

  const pushHistory =
    typeof bodyUpdates.version === "string" &&
    bodyUpdates.version.trim() &&
    bodyUpdates.version.trim() !== metaBefore.version;

  const updateOps: any = {
    $set: { ...bodyUpdates, version: nextVersion, updatedAt: now },
  };
  if (pushHistory) {
    updateOps.$push = {
      history: {
        version: nextVersion,
        by: userDisplayName,
        date: now,
        note: t("admin.module.updated", { locale, name }),
      },
    };
  }

  const meta = await ModuleMeta.findOneAndUpdate({ _id: metaBefore._id }, updateOps, { new: true });

  logger.withReq.info(req, t("admin.module.updated", { locale, name }), {
    module: "moduleMeta",
    locale,
  });
  res.status(200).json({
    success: true,
    message: t("admin.module.updated", { locale, name }),
    data: meta,
  });
});

/** list */
export const getAllModuleMetas = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { ModuleMeta } = await getTenantModels(req);

  const metas = await ModuleMeta.find({ tenant: req.tenant }).sort({ order: 1, name: 1 });
  res.status(200).json({
    success: true,
    message: t("admin.module.allMetasRetrieved", { count: metas.length }),
    data: metas,
  });
});

/** get by name */
export const getModuleMetaByName = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { name } = req.params;
  const { ModuleMeta } = await getTenantModels(req);

  const meta = await ModuleMeta.findOne({ name, tenant: req.tenant });
  if (!meta) {
    res.status(404).json({ success: false, message: t("admin.module.notFound", { locale, name }) });
    return;
  }
  res.status(200).json({ success: true, data: meta });
});

/** delete */
export const deleteModuleMeta = asyncHandler(async (req, res) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { name } = req.params;
  const { ModuleMeta } = await getTenantModels(req);

  const meta = await ModuleMeta.findOne({ name, tenant: req.tenant });
  if (!meta) {
    res.status(404).json({ success: false, message: t("admin.module.notFound", { locale, name }) });
    return;
  }

  await ModuleMeta.deleteOne({ _id: meta._id });
  logger.withReq.info(req, t("admin.module.deleted", { locale, name }), { module: "moduleMeta" });
  res.status(200).json({ success: true, message: t("admin.module.deleted", { locale, name }) });
});

/** bulk import (tenant-locked, label normalize) */
export const importModuleMetas = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { metas } = req.body;
  const { ModuleMeta } = await getTenantModels(req);

  if (!Array.isArray(metas) || metas.length === 0) {
    res.status(400).json({ success: false, message: t("admin.module.noMetasProvided", { locale }) });
    return;
  }

  const createdOrUpserted: any[] = [];
  for (const metaData of metas) {
    if (!metaData?.name) continue;

    const finalLabel: TranslatedLabel =
      typeof metaData.label === "string" || typeof metaData.label === "object"
        ? fillAllLocales(metaData.label)
        : fillAllLocales(metaData.name);

    const now = new Date();
    const userDisplayName = req.user?.name || req.user?.email || "system";
    const version = metaData.version || "1.0.0";

    // upsert – duplicate risklerini azaltır
    const resUpsert = await ModuleMeta.updateOne(
      { tenant: req.tenant, name: metaData.name },
      {
        $setOnInsert: {
          tenant: req.tenant,
          name: metaData.name,
          label: finalLabel,
          icon: metaData.icon ?? "box",
          roles: metaData.roles ?? ["admin"],
          enabled: metaData.enabled ?? true,
          language: metaData.language ?? "en",
          version,
          order: metaData.order ?? 0,
          statsKey: metaData.statsKey ?? "",
          routes: metaData.routes ?? [],
          history: [
            { version, by: userDisplayName, date: now, note: "Module imported" },
          ],
          createdAt: now,
          updatedAt: now,
        },
        $set: {
          // import sırasında var olan kaydı güncellemek istersen buraya koy
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    if (resUpsert.upsertedCount) {
      const created = await ModuleMeta.findOne({ tenant: req.tenant, name: metaData.name });
      if (created) createdOrUpserted.push(created);
    }
  }

  res.status(201).json({
    success: true,
    message: t("admin.module.importSuccess", { locale }),
    data: createdOrUpserted,
  });
});
