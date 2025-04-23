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
export const askFAQ = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
      .map((m, i) => `(${i + 1}) Soru: ${m.metadata?.question}\nCevap: ${m.metadata?.answer}`)
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
});

// ➕ SSS Oluştur
export const createFAQ = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { question, answer, category, language }: Partial<IFAQ> = req.body;

  if (!question || !answer) {
    res.status(400).json({ message: "Question and answer are required." });
    return;
  }

  const faq = await FAQ.create({
    question: question.trim(),
    answer: answer.trim(),
    category: category?.trim(),
    language: language || req.locale || "en",
  });

  res.status(201).json({ message: "FAQ created successfully", faq });
});

// 📄 Tüm aktif SSS'leri getir
export const getAllFAQs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { lang } = req.query;
  const filter: any = { isActive: true };

  filter.language = lang || req.locale || "en";

  const faqs = await FAQ.find(filter).sort({ createdAt: -1 });
  res.status(200).json(faqs);
});

// 🔄 SSS Güncelle
export const updateFAQ = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { question, answer, category, isActive, language } = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid FAQ ID" });
    return;
  }

  const faq = await FAQ.findById(id);
  if (!faq) {
    res.status(404).json({ message: "FAQ not found" });
    return;
  }

  faq.question = question?.trim() ?? faq.question;
  faq.answer = answer?.trim() ?? faq.answer;
  faq.category = category?.trim() ?? faq.category;
  faq.language = language ?? faq.language ?? req.locale ?? "en";
  if (typeof isActive === "boolean") faq.isActive = isActive;

  await faq.save();
  res.status(200).json({ message: "FAQ updated successfully", faq });
});

// 🗑️ SSS Sil
export const deleteFAQ = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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

  res.status(200).json({ message: "FAQ deleted successfully" });
});
