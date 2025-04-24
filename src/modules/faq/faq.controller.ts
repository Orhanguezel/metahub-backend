import { Response, Request as ExpressRequest } from "express";
import asyncHandler from "express-async-handler";
import FAQ, { IFAQ } from "./faq.models";
import { isValidObjectId } from "../../core/utils/validation";
import { pinecone } from "../../core/utils/pinecone";
import { askWithOllama } from "../../core/utils/askWithOllama";

// ✅ Custom genişletilmiş Request
type Request = ExpressRequest & {
  locale?: "tr" | "en" | "de";
  body: any;
  query: any;
  params: any;
  user?: {
    id: string;
    role: string;
    name?: string;
    email?: string;
  };
};
// 🌍 Çok dilli prompt şablonları

// 🌍 Çok dilli prompt şablonları
const languagePrompts: Record<string, string> = {
  tr: `
Kullanıcının sorusu: "{{question}}"

Aşağıda bazı örnek SSS içerikleri verilmiştir.
Lütfen bunları kullanarak kullanıcıya kısa, sade ve anlaşılır bir yanıt ver.

{{context}}
`,
  en: `
User question: "{{question}}"

Below are some related FAQ entries.
Please use this information to give a short, clear and helpful response.

{{context}}
`,
  de: `
Benutzerfrage: "{{question}}"

Unten findest du einige verwandte FAQ-Einträge.
Bitte verwende diese Informationen, um eine kurze, klare und hilfreiche Antwort zu geben.

{{context}}
`,
};

// Dummy embedding
function generateRandomVector(length = 1536): number[] {
  return Array.from({ length }, () => Math.random() * 2 - 1);
}

// ✅ AI destekli SSS yanıtı
export const askFAQ = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { question, language = "en" } = req.body;

    if (!question) {
      res.status(400).json({ message: "❗ Soru (question) zorunludur." });
      return;
    }

    try {
      const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);
      const queryEmbedding = generateRandomVector();

      const result = await index.namespace("default").query({
        vector: queryEmbedding,
        topK: 3,
        includeMetadata: true,
        filter: { language },
      });

      const matches = result.matches || [];

      if (matches.length === 0) {
        res.status(200).json({ answer: "Bu konuda elimde bilgi yok." });
        return;
      }

      const context = matches
        .map((m, i) => {
          const q = m.metadata?.question?.[language] || "";
          const a = m.metadata?.answer?.[language] || "";
          return `(${i + 1}) Soru: ${q}\nCevap: ${a}`;
        })
        .join("\n\n");

      const answer = await askWithOllama({
        question,
        context,
        lang: language,
      });

      res.status(200).json({ answer });
    } catch (error: any) {
      console.error("❌ askFAQ error:", error);
      res.status(500).json({
        message: "Cevap üretme sırasında bir hata oluştu.",
        error: error.message || "Bilinmeyen hata",
      });
    }
  }
);
// ➕ SSS Oluştur
export const createFAQ = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { question, answer, category, isPublished, isActive } = req.body;

    const langs: ("tr" | "en" | "de")[] = ["tr", "en", "de"];
    const isValid = langs.every((l) => question?.[l] && answer?.[l]);

    if (!isValid) {
      res.status(400).json({
        message:
          "Question and answer fields must be provided for all languages.",
      });
      return;
    }

    const newFAQ = await FAQ.create({
      question,
      answer,
      category,
      isPublished: isPublished ?? false,
      isActive: isActive ?? true,
    });

    res.status(201).json({
      success: true,
      message:
        req.locale === "de"
          ? "FAQ erfolgreich erstellt."
          : req.locale === "tr"
          ? "SSS başarıyla oluşturuldu."
          : "FAQ created successfully.",
      faq: newFAQ,
    });
  }
);

// 📄 Tüm aktif SSS'leri getir
export const getAllFAQs = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const lang = (req.query.lang as string) || req.locale || "en";

    const faqs = await FAQ.find({
      isActive: true,
      isPublished: true,
      [`question.${lang}`]: { $exists: true },
      [`answer.${lang}`]: { $exists: true },
    }).sort({ createdAt: -1 });

    res.status(200).json(faqs);
  }
);

// 🔄 SSS Güncelle
export const updateFAQ = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { question, answer, category, isActive, isPublished } = req.body;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid FAQ ID" });
      return;
    }

    const faq = await FAQ.findById(id);
    if (!faq) {
      res.status(404).json({ message: "FAQ not found" });
      return;
    }

    if (question) {
      faq.question.tr = question.tr || faq.question.tr;
      faq.question.en = question.en || faq.question.en;
      faq.question.de = question.de || faq.question.de;
    }

    if (answer) {
      faq.answer.tr = answer.tr || faq.answer.tr;
      faq.answer.en = answer.en || faq.answer.en;
      faq.answer.de = answer.de || faq.answer.de;
    }

    if (category !== undefined) faq.category = category;
    if (typeof isActive === "boolean") faq.isActive = isActive;
    if (typeof isPublished === "boolean") faq.isPublished = isPublished;

    await faq.save();

    res.status(200).json({
      message:
        req.locale === "de"
          ? "FAQ aktualisiert."
          : req.locale === "tr"
          ? "SSS güncellendi."
          : "FAQ updated.",
      faq,
    });
  }
);

// ❌ SSS Sil
export const deleteFAQ = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid FAQ ID" });
      return;
    }

    const faq = await FAQ.findByIdAndDelete(id);
    if (!faq) {
      res.status(404).json({ message: "FAQ not found" });
      return;
    }

    res.status(200).json({
      message:
        req.locale === "de"
          ? "FAQ gelöscht."
          : req.locale === "tr"
          ? "SSS silindi."
          : "FAQ deleted.",
    });
  }
);
