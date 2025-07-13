// src/modules/modules/moduleMeta.controller.ts
import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import type { SupportedLocale, TranslatedLabel } from "@/types/common";
import { SUPPORTED_LOCALES } from "@/types/common";
import { ModuleMeta } from "./admin.models";

/**
 * Modül Meta Kaydı Oluştur (Sadece GLOBAL alanlar)
 */
export const createModuleMeta = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || "en";
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

    if (!name) {
      logger.warn("Modül adı girilmedi.", { module: "moduleMeta" });
      res.status(400).json({
        success: false,
        message: t("admin.module.nameRequired", locale, translations),
      });
      return;
    }

    const existing = await ModuleMeta.findOne({ name });
    if (existing) {
      logger.warn(`Module '${name}' already exists.`, { module: "moduleMeta" });
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

    // AUDIT
    const now = new Date();
    const userDisplayName = req.user?.name || req.user?.email || "system";

    // Meta kaydını oluştur
    const metaContent = {
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
          date: now.toISOString(),
          note: "Module created",
        },
      ],
      routes,
      createdAt: now,
      updatedAt: now,
    };

    const createdMeta = await ModuleMeta.create(metaContent);

    logger.info(`ModuleMeta '${name}' created.`, {
      module: "moduleMeta",
      user: userDisplayName,
      locale,
    });

    res.status(201).json({
      success: true,
      message: t("admin.module.created", locale, translations, { name }),
      data: createdMeta,
    });
  }
);

/**
 * Modül Meta Güncelle (Sadece GLOBAL alanlar)
 */
export const updateModuleMeta = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || "en";
    const { name } = req.params;
    const updates = req.body;

    // Sadece şu alanlar güncellenebilir
    const allowedFields = [
      "label", "icon", "roles", "enabled", "language", "order", "version", "statsKey", "routes"
    ];
    Object.keys(updates).forEach((key) => {
      if (!allowedFields.includes(key)) delete updates[key];
    });

    // Çoklu dil label normalize
    if (updates.label) {
      updates.label = fillAllLocales(updates.label);
    }

    // Audit/History hazırlığı
    const now = new Date();
    const userDisplayName = req.user?.name || req.user?.email || "system";
    const newHistoryEntry = {
      version: updates.version,
      by: userDisplayName,
      date: now.toISOString(),
      note: "Module meta updated",
    };

    // --- EN TEMİZ: findOneAndUpdate ile atomik güncelleme ---
    // History'yi push et, diğer alanları set et
    const meta = await ModuleMeta.findOneAndUpdate(
      { name },
      {
        $set: {
          ...updates,
          updatedAt: now,
        },
        $push: { history: newHistoryEntry }
      },
      { new: true }
    );

    if (!meta) {
      logger.warn(`Module not found for update: ${name}`, { module: "moduleMeta" });
       res.status(404).json({
        success: false,
        message: t("admin.module.notFound", locale, translations),
      });return;
    }

    logger.info(`Global moduleMeta updated: ${name}`, {
      module: "moduleMeta",
      locale,
    });
    res.status(200).json({
      success: true,
      message: t("admin.module.updated", locale, translations),
      data: meta,
    });
  }
);


/**
 * Tüm Modül Meta Kayıtlarını Listele (Global)
 */
export const getAllModuleMetas = asyncHandler(async (req, res) => {
  const metas = await ModuleMeta.find({});
  res.status(200).json({
    success: true,
    data: metas,
  });
});

/**
 * Tek Modül Meta Kaydını Getir (Global)
 */
export const getModuleMetaByName = asyncHandler(async (req, res) => {
  const { name } = req.params;
  const meta = await ModuleMeta.findOne({ name });
  if (!meta) {
    res.status(404).json({
      success: false,
      message: "Module meta not found",
    });
    return;
  }
  res.status(200).json({
    success: true,
    data: meta,
  });
});

/**
 * Modül Meta Sil (Global)
 * DİKKAT: Tüm tenantlarda ayarı silinirse orphan setting cleanup ayrıca yapılmalı!
 */
export const deleteModuleMeta = asyncHandler(async (req, res) => {
  const { name } = req.params;
  const meta = await ModuleMeta.findOne({ name });
  if (!meta) {
    res.status(404).json({
      success: false,
      message: "Module meta not found",
    });
    return;
  }
  await ModuleMeta.deleteOne({ name });
  logger.info(`ModuleMeta deleted: ${name}`, {
    module: "moduleMeta",
  });
  res.status(200).json({
    success: true,
    message: "Module meta deleted",
  });
});

export const importModuleMetas = asyncHandler(
  async (req: Request, res: Response) => {
    const { metas } = req.body;

    if (!Array.isArray(metas) || metas.length === 0) {
      res.status(400).json({
        success: false,
        message: "No module metas provided for import",
      });
      return;
    }

    const createdMetas = [];
    for (const metaData of metas) {
      const existing = await ModuleMeta.findOne({ name: metaData.name });
      if (existing) {
        logger.warn(
          `Module '${metaData.name}' already exists. Skipping import.`
        );
        continue;
      }
      const newMeta = await ModuleMeta.create(metaData);
      createdMetas.push(newMeta);
    }

    res.status(201).json({
      success: true,
      message: "Module metas imported successfully",
      data: createdMetas,
    });
  }
);
