import { body } from "express-validator";
import { SUPPORTED_LOCALES } from "@/types/common";
import logger from "@/core/middleware/logger/logger";

// 🌐 Ortak yardımcı: Label geçerliliği kontrolü
const isValidTranslatedLabel = (value: any): boolean => {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "object" && value !== null) {
    return Object.values(value).some(
      (v) => typeof v === "string" && v.trim().length > 0
    );
  }

  return false;
};

// ➕ CREATE: Tek dil string veya object (en az biri dolu)
export const validateSectionCreate = [
  body("label")
    .custom((value, { req }) => {
      const isValid = isValidTranslatedLabel(value);
      if (!isValid) {
        logger.warn("section.validation.invalidLabel", {
          path: req.path,
          method: req.method,
          body: value,
          ip: req.ip,
        });
      }
      return isValid;
    })
    .withMessage("section.invalidLabel"),
];

// ✏️ UPDATE: Gönderilen label objesinde en az bir geçerli dil olmalı
export const validateSectionUpdate = [
  body("label")
    .optional()
    .custom((value, { req }) => {
      const isValid = isValidTranslatedLabel(value);
      if (!isValid) {
        logger.warn("section.validation.invalidLabel", {
          path: req.path,
          method: req.method,
          body: value,
          ip: req.ip,
        });
      }
      return isValid;
    })
    .withMessage("section.invalidLabel"),
];
