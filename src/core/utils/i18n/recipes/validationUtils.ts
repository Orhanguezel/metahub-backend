// src/core/utils/i18n/validationUtils.ts
import { SUPPORTED_LOCALES } from "@/types/recipes/common";
import { body } from "express-validator";

export const validateMultilangField = (field: string) =>
  body(field).custom((value) => {
    const obj = typeof value === "string" ? JSON.parse(value) : value;
    if (!obj || typeof obj !== "object")
      throw new Error(`${field} must be an object with at least one language.`);
    const hasOne = SUPPORTED_LOCALES.some(
      (lang) => obj[lang] && obj[lang].trim()
    );
    if (!hasOne)
      throw new Error(`At least one language must be provided in ${field}.`);
    return true;
  });
