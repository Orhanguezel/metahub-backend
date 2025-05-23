import { Response, Request } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import  {FAQ} from "@/modules/faq";

// ✅ GET /admin/faqs
export const getAllFAQs = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const faqs = await FAQ.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "FAQs retrieved successfully.",
      data: faqs,
    });
    return;
  }
);

// ✅ POST /admin/faqs
export const createFAQ = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { question, answer, category, isPublished, isActive } = req.body;

    // Çoklu dil kontrolü
    const langs: ("tr" | "en" | "de")[] = ["tr", "en", "de"];
    const isValid = langs.every((l) => question?.[l] && answer?.[l]);

    if (!isValid) {
      res.status(400).json({
        success: false,
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
      message: "FAQ created successfully.",
      data: newFAQ,
    });
    return;
  }
);

// ✅ PUT /admin/faqs/:id
export const updateFAQ = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid FAQ ID",
      });
      return;
    }

    const faq = await FAQ.findById(id);
    if (!faq) {
      res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
      return;
    }

    const { question, answer, category, isPublished, isActive } = req.body;

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
    if (typeof isPublished === "boolean") faq.isPublished = isPublished;
    if (typeof isActive === "boolean") faq.isActive = isActive;

    await faq.save();

    res.status(200).json({
      success: true,
      message: "FAQ updated successfully.",
      data: faq,
    });
    return;
  }
);

// ✅ DELETE /admin/faqs/:id
export const deleteFAQ = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid FAQ ID",
      });
      return;
    }

    const deleted = await FAQ.findByIdAndDelete(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "FAQ deleted successfully.",
    });
    return;
  }
);
