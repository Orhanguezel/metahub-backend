import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { Section } from "@/modules/section";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// --- CREATE ---
export const createSection = asyncHandler(
  async (req: Request, res: Response) => {
    const { Section } = await getTenantModels(req);
    const locale: SupportedLocale = (req.locale as SupportedLocale) || "tr";
    const t = (key: string, params?: Record<string, any>) =>
      translate(key, locale, translations, params);

    try {
      let {
        label,
        description,
        icon,
        order,
        isActive,
        visibleInSidebar,
        useAnalytics,
        roles,
      } = req.body;

      if (!label) {
        throw new Error("Label is required.");
      }
      label = fillAllLocales(label);
      description = description ? fillAllLocales(description) : undefined;

      // Zorunlu: tüm dillerde label dolu mu?
      if (!SUPPORTED_LOCALES.every((l) => label[l] && label[l].trim())) {
        logger.warn(t("section.create.labelMissing"), getRequestContext(req));
        res
          .status(400)
          .json({ success: false, message: t("section.create.labelMissing") });
        return;
      }

      const section = await Section.create({
        label,
        tenant: req.tenant,
        description,
        icon,
        order,
        isActive,
        visibleInSidebar,
        useAnalytics,
        roles,
      });

      logger.info(t("section.create.success", { name: label[locale] }), {
        ...getRequestContext(req),
        event: "section.create",
        module: "section",
        status: "success",
      });

      res.status(201).json({
        success: true,
        data: section,
        message: t("section.create.success", { name: label[locale] }),
      });
    } catch (err: any) {
      logger.error(t("section.create.error"), {
        ...getRequestContext(req),
        event: "section.create",
        module: "section",
        status: "fail",
        error: err.message,
      });
      res
        .status(500)
        .json({ success: false, message: t("section.create.error") });
    }
  }
);

// --- GET ALL ---
export const getAllSection = asyncHandler(
  async (req: Request, res: Response) => {
    const { Section } = await getTenantModels(req);
    const locale: SupportedLocale = (req.locale as SupportedLocale) || "tr";
    const t = (key: string, params?: Record<string, any>) =>
      translate(key, locale, translations, params);

    try {
      const sections = await Section.find({ tenant: req.tenant });
      logger.info(t("section.list.success"), {
        ...getRequestContext(req),
        event: "section.list",
        module: "section",
        resultCount: sections.length,
      });
      res.json({
        success: true,
        data: sections,
        message: t("section.list.success"),
      });
    } catch (err: any) {
      logger.error(t("section.list.error"), {
        ...getRequestContext(req),
        event: "section.list",
        module: "section",
        status: "fail",
        error: err.message,
      });
      res
        .status(500)
        .json({ success: false, message: t("section.list.error") });
    }
  }
);

// --- UPDATE ---
export const updateSection = asyncHandler(
  async (req: Request, res: Response) => {
    const { Section } = await getTenantModels(req);
    const locale: SupportedLocale = (req.locale as SupportedLocale) || "tr";
    const t = (key: string, params?: Record<string, any>) =>
      translate(key, locale, translations, params);

    const { id } = req.params;
    let updates = req.body;

    try {
      const section = await Section.findOne({ _id: id, tenant: req.tenant });
      if (!section) {
        logger.warn(t("section.update.notFound"), getRequestContext(req));
        res
          .status(404)
          .json({ success: false, message: t("section.update.notFound") });
        return;
      }

      // Güncellenen label varsa: mevcutla birleştir
      if (updates.label) {
        updates.label = { ...section.label, ...fillAllLocales(updates.label) };
      }
      // Güncellenen description varsa: mevcutla birleştir
      if (updates.description) {
        updates.description = {
          ...section.description,
          ...fillAllLocales(updates.description),
        };
      }

      const updated = await Section.findByIdAndUpdate(
        { _id: id, tenant: req.tenant },
        updates,
        {
          new: true,
        }
      );

      logger.info(
        t("section.update.success", { name: updated?.label[locale] }),
        {
          ...getRequestContext(req),
          event: "section.update",
          module: "section",
          status: "success",
        }
      );

      res.json({
        success: true,
        data: updated,
        message: t("section.update.success", { name: updated?.label[locale] }),
      });
    } catch (err: any) {
      logger.error(t("section.update.error"), {
        ...getRequestContext(req),
        event: "section.update",
        module: "section",
        status: "fail",
        error: err.message,
      });
      res
        .status(500)
        .json({ success: false, message: t("section.update.error") });
    }
  }
);

// --- DELETE ---
export const deleteSection = asyncHandler(
  async (req: Request, res: Response) => {
    const { Section } = await getTenantModels(req);
    const locale: SupportedLocale = (req.locale as SupportedLocale) || "tr";
    const t = (key: string, params?: Record<string, any>) =>
      translate(key, locale, translations, params);

    const { id } = req.params;

    try {
      const deleted = await Section.findOne({ _id: id, tenant: req.tenant });
      if (!deleted) {
        logger.warn(t("section.delete.notFound"), getRequestContext(req));
        res
          .status(404)
          .json({ success: false, message: t("section.delete.notFound") });
        return;
      }

      logger.info(
        t("section.delete.success", { name: deleted.label[locale] }),
        {
          ...getRequestContext(req),
          event: "section.delete",
          module: "section",
          status: "success",
        }
      );

      res.json({
        success: true,
        message: t("section.delete.success", { name: deleted.label[locale] }),
      });
    } catch (err: any) {
      logger.error(t("section.delete.error"), {
        ...getRequestContext(req),
        event: "section.delete",
        module: "section",
        status: "fail",
        error: err.message,
      });
      res
        .status(500)
        .json({ success: false, message: t("section.delete.error") });
    }
  }
);
