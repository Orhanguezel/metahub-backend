import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ CREATE: POST /admin/faqs
export const validateCreateFAQ = [
  body("question.tr").notEmpty().withMessage("Soru (TR) zorunludur."),
  body("question.en").notEmpty().withMessage("Question (EN) is required."),
  body("question.de").notEmpty().withMessage("Frage (DE) ist erforderlich."),
  body("answer.tr").notEmpty().withMessage("Cevap (TR) zorunludur."),
  body("answer.en").notEmpty().withMessage("Answer (EN) is required."),
  body("answer.de").notEmpty().withMessage("Antwort (DE) ist erforderlich."),
  validateRequest,
];

// ✅ UPDATE: PUT /admin/faqs/:id
export const validateUpdateFAQ = [
  param("id").isMongoId().withMessage("Geçersiz FAQ ID."),
  body("question.tr").optional().isString().notEmpty().withMessage("Soru (TR) boş olamaz."),
  body("question.en").optional().isString().notEmpty().withMessage("Question (EN) cannot be empty."),
  body("question.de").optional().isString().notEmpty().withMessage("Frage (DE) darf nicht leer sein."),
  body("answer.tr").optional().isString().notEmpty().withMessage("Cevap (TR) boş olamaz."),
  body("answer.en").optional().isString().notEmpty().withMessage("Answer (EN) cannot be empty."),
  body("answer.de").optional().isString().notEmpty().withMessage("Antwort (DE) darf nicht leer sein."),
  validateRequest,
];

// ✅ DELETE /admin/faqs/:id veya GET /admin/faqs/:id
export const validateFAQId = [
  param("id").isMongoId().withMessage("Geçersiz FAQ ID."),
  validateRequest,
];

// ✅ ASK: POST /faqs/ask (public)
export const validateAskFAQ = [
  body("question").notEmpty().withMessage("Question is required."),
  body("language").optional().isIn(["tr", "en", "de"]).withMessage("Invalid language."),
  validateRequest,
];
