import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

// --- TranslatedLabel için recursive kontrol
function isTranslatedLabel(obj: any) {
  return (
    obj &&
    typeof obj === "object" &&
    !Array.isArray(obj) &&
    SUPPORTED_LOCALES.some((lang) => Object.prototype.hasOwnProperty.call(obj, lang))
  );
}

function validateTranslatedLabel(
  obj: any,
  fieldName: string,
  locale: SupportedLocale,
  path: string[]
) {
  if (!obj || typeof obj !== "object") {
    throw new Error(
      `${translate("setting.error.missingLocale", locale, translations)} (${[...path, fieldName].filter(Boolean).join(".")})`
    );
  }
  // En az 1 locale dolu olmalı
  const filled = SUPPORTED_LOCALES.filter((lang) => obj[lang] && obj[lang].trim());
  if (!filled.length) {
    throw new Error(
      `${translate("setting.error.missingLocale", locale, translations)} (${[...path, fieldName].filter(Boolean).join(".")})`
    );
  }
  // Her locale string olmalı
  for (const lang of SUPPORTED_LOCALES) {
    if (obj[lang] && typeof obj[lang] !== "string") {
      throw new Error(
        `${translate("setting.error.localeType", locale, translations)} (${[...path, fieldName, lang].filter(Boolean).join(".")})`
      );
    }
  }
}

// --- Recursive tüm value kontrolü (deep-nested için)
function recursiveTranslatedLabelCheck(val: any, locale: SupportedLocale, path: string[] = []) {
  if (isTranslatedLabel(val)) {
    validateTranslatedLabel(val, "", locale, path);
    return;
  }
  if (Array.isArray(val)) {
    val.forEach((item, i) => recursiveTranslatedLabelCheck(item, locale, [...path, `[${i}]`]));
  } else if (typeof val === "object" && val !== null) {
    for (const [k, v] of Object.entries(val)) {
      recursiveTranslatedLabelCheck(v, locale, [...path, k]);
    }
  }
}

// --- Ana KEY validasyonu
const keyValidation = body("key")
  .isString().withMessage("Key must be a string.")
  .trim().notEmpty().withMessage("Key is required.")
  .isLength({ min: 2, max: 100 }).withMessage("Key must be between 2 and 100 characters.");

// --- VALUE validasyonu (her senaryo için future-proof)
const valueValidation = body("value").custom((val, { req }) => {
  const key = req.body.key;
  const locale: SupportedLocale = req.locale || getLogLocale();

  // Tema
  if (key === "site_template") {
    if (typeof val !== "string" || !val.trim())
      throw new Error(translate("setting.error.valueRequired", locale, translations));
    return true;
  }
  // Tema listesi
  if (key === "available_themes") {
    if (!Array.isArray(val))
      throw new Error(translate("setting.error.arrayNotAllowed", locale, translations));
    if (val.length === 0)
      throw new Error(translate("setting.error.arrayEmpty", locale, translations));
    if (!val.every((v) => typeof v === "string" && v.trim()))
      throw new Error(translate("setting.error.arrayInvalidItems", locale, translations));
    return true;
  }
  // Çoklu image alanı
  if (["footer_images", "navbar_images", "logo_images", "images"].includes(key)) {
    if (!Array.isArray(val))
      throw new Error(translate("setting.error.imagesArrayRequired", locale, translations));
    if (!val.every(
      (img) =>
        img &&
        typeof img === "object" &&
        typeof img.url === "string" &&
        typeof img.thumbnail === "string"
    )) {
      throw new Error(translate("setting.error.imagesInvalidFormat", locale, translations));
    }
    return true;
  }
  // Multi-lang veya diğer complex objeler
  recursiveTranslatedLabelCheck(val, locale);
  return true;
});

// --- Final export (Express middleware dizisi)
export const validateUpsertSetting = [
  keyValidation,
  valueValidation,
  validateRequest,
];

export const validateSettingKeyParam = [
  param("key")
    .isString().trim().notEmpty().withMessage("Key parameter is required."),
  validateRequest,
];
