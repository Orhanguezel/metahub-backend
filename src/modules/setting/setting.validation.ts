import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";

const SUPPORTED_LOCALES = ["tr", "en", "de", "fr", "es", "pl"];

// -- Her TranslatedLabel için recursive kontrol
function isTranslatedLabel(obj: any) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  return SUPPORTED_LOCALES.some((lang) => Object.prototype.hasOwnProperty.call(obj, lang));
}

function validateTranslatedLabel(obj: any, fieldName: string, locale: SupportedLocale, path: string[]) {
  if (!obj || typeof obj !== "object") {
    throw new Error(
      `${translate("setting.error.missingLocale", locale, translations)} (${[...path, fieldName].join(".")})`
    );
  }
  const filledLocales = SUPPORTED_LOCALES.filter((lang) => obj[lang] && obj[lang].trim());
  if (!filledLocales.length) {
    throw new Error(
      `${translate("setting.error.missingLocale", locale, translations)} (${[...path, fieldName].join(".")})`
    );
  }
  for (const lang of SUPPORTED_LOCALES) {
    if (obj[lang] && typeof obj[lang] !== "string") {
      throw new Error(
        `${translate("setting.error.localeType", locale, translations)} (${[...path, fieldName, lang].join(".")})`
      );
    }
  }
}

// -- Recursive olarak tüm alanlar için TranslatedLabel validasyonu uygula
function recursiveTranslatedLabelCheck(val: any, locale: SupportedLocale, path: string[] = []) {
  if (isTranslatedLabel(val)) {
    validateTranslatedLabel(val, "", locale, path);
    return;
  }
  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i++) {
      recursiveTranslatedLabelCheck(val[i], locale, [...path, `[${i}]`]);
    }
  } else if (typeof val === "object" && val !== null) {
    for (const [k, v] of Object.entries(val)) {
      recursiveTranslatedLabelCheck(v, locale, [...path, k]);
    }
  }
}

const t = (locale: string, key: string) => translate(key, locale as SupportedLocale, translations);

// -- Ana KEY validasyonu
const keyValidation = body("key")
  .isString().withMessage("Key must be a string.")
  .trim().notEmpty().withMessage("Key is required.")
  .isLength({ min: 2, max: 100 }).withMessage("Key must be between 2 and 100 characters.");

// -- VALUE validasyonu (future-proof, recursive, esnek!)
const valueValidation = body("value").custom((val, { req }) => {
  const key = req.body.key;
  const locale: SupportedLocale = req.locale || getLogLocale();

  // Tema kontrolü
  if (["site_template"].includes(key)) {
    if (typeof val !== "string" || !val.trim())
      throw new Error(t(locale, "setting.error.valueRequired"));
    return true;
  }
  if (key === "available_themes") {
    if (!Array.isArray(val))
      throw new Error(t(locale, "setting.error.arrayNotAllowed"));
    if (val.length === 0)
      throw new Error(t(locale, "setting.error.arrayEmpty"));
    if (!val.every((v) => typeof v === "string" && v.trim()))
      throw new Error(t(locale, "setting.error.arrayInvalidItems"));
    return true;
  }

  // Logo kontrolü
  if (["navbar_logos", "footer_logos"].includes(key)) {
    const { light, dark } = val || {};
    if (!light?.url || typeof light.url !== "string")
      throw new Error(t(locale, "setting.error.lightRequired"));
    if (dark && typeof dark.url !== "string")
      throw new Error(t(locale, "setting.error.darkInvalid"));
    return true;
  }

  // Geri kalan her key için recursive translated label kontrolü
  recursiveTranslatedLabelCheck(val, locale);

  return true;
});

// -- EXPORT
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
