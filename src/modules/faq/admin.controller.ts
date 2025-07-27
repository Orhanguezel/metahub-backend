import { Response, Request } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { mergeLocalesForUpdate } from "@/core/utils/i18n/mergeLocalesForUpdate";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// JSON string ise parse et
const parseIfJson = (value: any) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

// ✅ GET /admin/faqs
export const getAllFAQs = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { FAQ } = await getTenantModels(req);

  const faqs = await FAQ.find({ tenant: req.tenant }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: t("faqs.retrieved_successfully"),
    data: faqs,
  });
});

// ✅ POST /admin/faqs
export const createFAQ = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { FAQ } = await getTenantModels(req);

  let { question, answer, category, isPublished, isActive } = req.body;

  question = fillAllLocales(parseIfJson(question));
  answer = fillAllLocales(parseIfJson(answer));
  category = parseIfJson(category);

  const isValid = [locale].every((l) => question?.[l] && answer?.[l]);
  if (!isValid) {
    res.status(400).json({
      success: false,
      message: t("faqs.validation_failed"),
    });
    return;
  }

  const newFAQ = await FAQ.create({
    question,
    answer,
    tenant: req.tenant,
    category,
    isPublished: isPublished ?? false,
    isActive: isActive ?? true,
  });

  res.status(201).json({
    success: true,
    message: t("faqs.created_successfully"),
    data: newFAQ,
  });
});

// ✅ PUT /admin/faqs/:id
export const updateFAQ = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { FAQ } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("faqs.invalid_id") });
    return;
  }

  const faq = await FAQ.findOne({ _id: id, tenant: req.tenant });
  if (!faq) {
    res.status(404).json({ success: false, message: t("faqs.not_found") });
    return;
  }

  const { question, answer, category, isPublished, isActive } = req.body;

  if (question) faq.question = mergeLocalesForUpdate(faq.question, parseIfJson(question));
  if (answer) faq.answer = mergeLocalesForUpdate(faq.answer, parseIfJson(answer));
  if (category !== undefined) faq.category = category;
  if (typeof isPublished === "boolean") faq.isPublished = isPublished;
  if (typeof isActive === "boolean") faq.isActive = isActive;

  await faq.save();

  res.status(200).json({
    success: true,
    message: t("faqs.updated_successfully"),
    data: faq,
  });
});

// ✅ DELETE /admin/faqs/:id
export const deleteFAQ = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { FAQ } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("faqs.invalid_id") });
    return;
  }

  const deleted = await FAQ.deleteOne({ _id: id, tenant: req.tenant });

  if (deleted.deletedCount === 0) {
    res.status(404).json({ success: false, message: t("faqs.not_found") });
    return;
  }

  res.status(200).json({
    success: true,
    message: t("faqs.deleted_successfully"),
  });
});
