import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { BikeCategory } from "@/modules/bikescategory";
import { isValidObjectId } from "@/core/utils/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";

// ✅ Create Bike Category
export const createBikeCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);

  let nameObj = req.body.name;
  // Her zaman objeye çevir ve fillAllLocales ile eksik dilleri tamamla
  nameObj = fillAllLocales(typeof nameObj === "string" ? JSON.parse(nameObj) : nameObj);

  // Tüm diller kontrolü (MetaHub standardı)
  if (!SUPPORTED_LOCALES.every((l) => nameObj?.[l] && nameObj[l].trim())) {
    res.status(400).json({ success: false, message: t("validation.missingLocales") });
    return;
  }

  const category = await BikeCategory.create({
    name: nameObj, // fillAllLocales garantisi ile eksik dil yok
    // slug model hook'unda otomatik oluşur!
  });

  logger.info(t("create.success"), {
    ...getRequestContext(req),
    module: "bikeCategory",
    event: "create"
  });

  res.status(201).json({
    success: true,
    message: t("create.success"),
    data: category,
  });
});

// ✅ Get All Bike Categories
export const getAllBikeCategories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);

  const categories = await BikeCategory.find().sort({ createdAt: -1 });

  logger.info(t("fetchAll.success"), {
    ...getRequestContext(req),
    module: "bikeCategory",
    event: "fetchAll"
  });

  res.status(200).json({
    success: true,
    message: t("fetchAll.success"),
    data: categories,
  });
});

// ✅ Get Single Bike Category
export const getBikeCategoryById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("error.invalidId") });
    return;
  }

  const category = await BikeCategory.findById(id);

  if (!category) {
    res.status(404).json({ success: false, message: t("error.notFound") });
    return;
  }

  logger.info(t("fetch.success"), {
    ...getRequestContext(req),
    module: "bikeCategory",
    event: "fetch",
    meta: { id }
  });

  res.status(200).json({
    success: true,
    message: t("fetch.success"),
    data: category,
  });
});

// ✅ Update Bike Category
export const updateBikeCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  let { name, isActive } = req.body;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("error.invalidId") });
    return;
  }

  const category = await BikeCategory.findById(id);
  if (!category) {
    res.status(404).json({ success: false, message: t("error.notFound") });
    return;
  }

  // Name güncellemesi (eksik diller otomatik tamamlanır)
  if (name) {
    name = fillAllLocales(typeof name === "string" ? JSON.parse(name) : name);
    // Tüm diller kontrolü (MetaHub standardı)
    if (!SUPPORTED_LOCALES.every((l) => name?.[l] && name[l].trim())) {
      res.status(400).json({ success: false, message: t("validation.missingLocales") });
      return;
    }
    category.name = name;
  }

  // isActive güncellemesi
  if (typeof isActive === "boolean") category.isActive = isActive;

  await category.save();

  logger.info(t("update.success"), {
    ...getRequestContext(req),
    module: "bikeCategory",
    event: "update",
    meta: { id }
  });

  res.status(200).json({
    success: true,
    message: t("update.success"),
    data: category,
  });
});

// ✅ Delete Bike Category
export const deleteBikeCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("error.invalidId") });
    return;
  }

  const deleted = await BikeCategory.findByIdAndDelete(id);

  if (!deleted) {
    res.status(404).json({ success: false, message: t("error.notFound") });
    return;
  }

  logger.info(t("delete.success"), {
    ...getRequestContext(req),
    module: "bikeCategory",
    event: "delete",
    meta: { id }
  });

  res.status(200).json({
    success: true,
    message: t("delete.success"),
  });
});
