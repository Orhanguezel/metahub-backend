import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { pinecone } from "@/scripts/faq/pinecone";
import { askWithOllama } from "@/scripts/faq/askWithOllama";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ GET /faqs?lang=en
export const getPublishedFAQs = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const lang = (req.query.lang as string) || "en";
    const { FAQ } = await getTenantModels(req);

    const faqs = await FAQ.find({
      isActive: true,
      tenant: req.tenant,
      isPublished: true,
      [`question.${lang}`]: { $exists: true },
      [`answer.${lang}`]: { $exists: true },
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Public FAQs fetched successfully.",
      data: faqs,
    });
    return;
  }
);

// ✅ POST /faqs/ask
export const askFAQ = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { question, language = "en" } = req.body;

    if (!question || typeof question !== "string") {
      res.status(400).json({
        success: false,
        message: "Question is required.",
      });
      return;
    }

    try {
      const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

      // 👉 Şimdilik dummy vector kullanılıyor
      const queryEmbedding = Array.from(
        { length: 1536 },
        () => Math.random() * 2 - 1
      );

      const result = await index.namespace("default").query({
        vector: queryEmbedding,
        topK: 3,
        includeMetadata: true,
        filter: { language },
      });

      const context = (result.matches || [])
        .map((match, i) => {
          const q = match.metadata?.question?.[language] || "";
          const a = match.metadata?.answer?.[language] || "";
          return `(${i + 1}) Q: ${q}\nA: ${a}`;
        })
        .join("\n\n");

      const aiAnswer = await askWithOllama({
        question,
        context,
        lang: language,
      });

      res.status(200).json({
        success: true,
        message: "Answer generated successfully.",
        data: aiAnswer,
      });
      return;
    } catch (error: any) {
      console.error("❌ askFAQ error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while generating the answer.",
        error: error.message || "Unknown error.",
      });
      return;
    }
  }
);
