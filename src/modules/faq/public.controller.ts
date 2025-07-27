import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { askWithOllama } from "@/scripts/faq/askWithOllama";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { hybridRetrieveFAQ } from "@/scripts/faq/hybridRetrieveFAQ";

// ✅ POST /faqs/ask
export const askFAQ = asyncHandler(async (req: Request, res: Response) => {
  const lang: SupportedLocale = req.body.language || getLogLocale();
  const tenant = req.tenant;
  const t = (key: string, params?: any) => translate(key, lang, translations, params);

  const { question } = req.body;

  if (!question || typeof question !== "string") {
    res.status(400).json({
      success: false,
      message: t("faqs.question_required"),
    });
    return;
  }

  try {
    // ✅ 1. Hybrid vector + string benzerliği ile en alakalı sonuçları al
    const topMatches = await hybridRetrieveFAQ(question, lang, tenant, 3);

    if (!topMatches.length) {
      res.status(404).json({
        success: false,
        message: t("faqs.no_similar_found"),
      });
      return;
    }

    // ✅ 2. LLM'e aktarılacak context formatı
    const context = topMatches
      .map((item, i) => `(${i + 1}) Q: ${item.question}\nA: ${item.answer}`)
      .join("\n\n");

    // ✅ 3. LLM ile yanıt üret
    const aiAnswer = await askWithOllama({
      question,
      context,
      lang,
    });

    res.status(200).json({
      success: true,
      message: t("faqs.answer_generated"),
      data: aiAnswer,
    });
  } catch (error: any) {
    logger.error("FAQ AI error", {
      ...getRequestContext(req),
      message: error?.message,
    });

    res.status(500).json({
      success: false,
      message: t("faqs.answer_failed"),
      error: error.message || "Unknown error.",
    });
  }
});

// ✅ GET /faqs?lang=en
export const getPublishedFAQs = asyncHandler(async (req: Request, res: Response) => {
  const lang: SupportedLocale = (req.query.lang as SupportedLocale) || getLogLocale();
  const t = (key: string, params?: any) => translate(key, lang, translations, params);

  const { FAQ } = await getTenantModels(req);

  const faqs = await FAQ.find({
    isActive: true,
    tenant: req.tenant,
    isPublished: true,
    [`question.${lang}`]: { $exists: true, $ne: "" },
    [`answer.${lang}`]: { $exists: true, $ne: "" },
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: t("faqs.retrieved_successfully"),
    data: faqs,
  });
});
