import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import type { SupportedLocale, TranslatedLabel } from "@/types/common";
import { SUPPORTED_LOCALES } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// --- 🔓  Public (No Auth) Get All SectionMetas ---
export const getSectionMetas = asyncHandler(
  async (req: Request, res: Response) => {
    // locale zorunlu değil, public API'de hata çıkarmaz!
    const locale: SupportedLocale = req.locale || "en";
    const { SectionMeta } = await getTenantModels(req);
    const metas = await SectionMeta.find().sort({ defaultOrder: 1 });
    res.json({
      success: true,
      message: t("public.section.fetchedAll", locale, translations), // İstersen farklı bir mesaj sectionKey'i kullanabilirsin.
      data: metas,
    });
  }
);

// --- 1️⃣ Create SectionMeta ---
export const createSectionMeta = asyncHandler(
  async (req: Request, res: Response) => {
    const { SectionMeta } = await getTenantModels(req);
    const locale: SupportedLocale = req.locale || "en";
    const {
      sectionKey,
      label,
      description,
      icon = "MdViewModule",
      variant,
      required = false,
      defaultOrder = 0,
      defaultEnabled = true,
      params = {},
    } = req.body;

    // 1.1 Key kontrolü
    const existing = await SectionMeta.findOne({ sectionKey });
    if (existing) {
      res.status(409).json({
        success: false,
        message: t("admin.section.sectionKeyExists", locale, translations, { sectionKey }),
      });
      return;
    }

    // 1.2 Çoklu dil normalize
    const finalLabel: TranslatedLabel = fillAllLocales(label);
    const finalDescription: TranslatedLabel | undefined = description
      ? fillAllLocales(description)
      : undefined;

    // 1.3 Kaydı oluştur
    const section = await SectionMeta.create({
      sectionKey,
      label: finalLabel,
      description: finalDescription,
      icon,
      variant,
      required,
      defaultOrder,
      defaultEnabled,
      params,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 1.4 Log ve yanıt
    logger.withReq.info(req, `[SectionMeta] Created: ${sectionKey}`, {
      module: "sectionMeta",
      user: req.user?.name || req.user?.email || "system",
    });
    res.status(201).json({
      success: true,
      message: t("admin.section.created", locale, translations, { sectionKey }),
      data: section,
    });
    return;
  }
);

// --- 2️⃣ Update SectionMeta ---
export const updateSectionMeta = asyncHandler(
  async (req: Request, res: Response) => {
    const { sectionKey } = req.params;
    const locale: SupportedLocale = req.locale || "en";
    const updates = req.body;
    const { SectionMeta } = await getTenantModels(req);

    // Sadece belirli alanlara izin ver (modele sadık!)
    const allowed = [
      "label",
      "description",
      "icon",
      "variant",
      "required",
      "defaultOrder",
      "defaultEnabled",
      "params",
    ];
    for (const field of Object.keys(updates)) {
      if (!allowed.includes(field)) {
        res.status(400).json({
          success: false,
          message: `Field '${field}' is not allowed to update.`,
        });
        return;
      }
    }

    // Çoklu dil normalize
    if (updates.label) updates.label = fillAllLocales(updates.label);
    if (updates.description)
      updates.description = fillAllLocales(updates.description);

    updates.updatedAt = new Date();

    const meta = await SectionMeta.findOneAndUpdate({ sectionKey }, updates, {
      new: true,
    });
    if (!meta) {
      res.status(404).json({
        success: false,
        message: t("admin.section.notFound", locale, translations, { sectionKey }),
      });
      return;
    }

    logger.withReq.info(req, `[SectionMeta] Updated: ${sectionKey}`, {
      module: "sectionMeta",
      user: req.user?.name || req.user?.email || "system",
    });
    res.json({
      success: true,
      message: t("admin.section.updated", locale, translations, { sectionKey }),
      data: meta,
    });
    return;
  }
);

// --- 3️⃣ Get All SectionMetas ---
export const getAllSectionMetas = asyncHandler(
  async (req: Request, res: Response) => {
    const { SectionMeta } = await getTenantModels(req);
    const locale: SupportedLocale = req.locale || "en";
    const metas = await SectionMeta.find().sort({ defaultOrder: 1 });
    res.json({
      success: true,
      message: t("admin.section.fetchedAll", locale, translations),
      data: metas,
    });
    return;
  }
);

// --- 4️⃣ Delete SectionMeta ---
export const deleteSectionMeta = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || "en";
    const { SectionMeta } = await getTenantModels(req);
    const { sectionKey } = req.params;
    const deleted = await SectionMeta.findOneAndDelete({ sectionKey });
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: t("admin.section.notFound", locale, translations, { sectionKey }),
      });
      return;
    }
    logger.withReq.info(req, `[SectionMeta] Deleted: ${sectionKey}`, {
      module: "sectionMeta",
      user: req.user?.name || req.user?.email || "system",
    });
    res.json({
      success: true,
      message: t("admin.section.deleted", locale, translations, { sectionKey }),
    });
  }
);
