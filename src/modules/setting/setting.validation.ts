import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";

// ✅ Ortak çeviri fonksiyonu (string locale üzerinden)
const t = (locale: string, key: string) =>
  translate(key, locale as SupportedLocale, translations);

// ✅ Key doğrulaması
const keyValidation = body("key")
  .isString()
  .withMessage("Key must be a string.")
  .trim()
  .notEmpty()
  .withMessage("Key is required.")
  .isLength({ min: 2, max: 100 })
  .withMessage("Key must be between 2 and 100 characters.");

// ✅ Value doğrulama
const valueValidation = body("value").custom((val, { req }) => {
  const key = req.body.key;
  const locale: SupportedLocale = req.locale || getLogLocale();

  const validateTranslatedLabel = (obj: any, fieldName: string) => {
    const { tr, en, de } = obj || {};
    if (!tr && !en && !de) {
      throw new Error(
        t(locale, "setting.error.missingLocale") + ` (${fieldName})`
      );
    }
    for (const lang of ["tr", "en", "de"] as SupportedLocale[]) {
      if (obj?.[lang] && typeof obj[lang] !== "string") {
        throw new Error(
          t(locale, "setting.error.localeType") + ` (${fieldName}.${lang})`
        );
      }
    }
  };

  // 1️⃣ string
  if (typeof val === "string") {
    if (["available_themes", "site_template"].includes(key)) return true;
    if (!val.trim()) throw new Error(t(locale, "setting.error.valueRequired"));
    return true;
  }

  // 2️⃣ array
  if (Array.isArray(val)) {
    if (key !== "available_themes")
      throw new Error(t(locale, "setting.error.arrayNotAllowed"));
    if (val.length === 0)
      throw new Error(t(locale, "setting.error.arrayEmpty"));
    if (!val.every((v) => typeof v === "string" && v.trim())) {
      throw new Error(t(locale, "setting.error.arrayInvalidItems"));
    }
    return true;
  }

  // 3️⃣ object
  if (typeof val === "object" && val !== null) {
    const entries = Object.entries(val);

    // 🎯 Logo: { light, dark }
    if (["navbar_logos", "footer_logos"].includes(key)) {
      const { light, dark } = val;
      if (!light?.url || typeof light.url !== "string") {
        throw new Error(t(locale, "setting.error.lightRequired"));
      }
      if (dark && typeof dark.url !== "string") {
        throw new Error(t(locale, "setting.error.darkInvalid"));
      }
      return true;
    }

    // 🎯 LabeledLink: Record<string, { label: TranslatedLabel, href/url }>
    if (
      [
        "footer_about_links",
        "footer_services_links",
        "footer_contact",
        "navbar_main_links",
      ].includes(key)
    ) {
      if (entries.length === 0) {
        throw new Error(t(locale, "setting.error.objectEmpty") + ` (${key})`);
      }

      for (const [field, fieldVal] of entries) {
        if (typeof fieldVal !== "object" || !fieldVal) {
          throw new Error(
            t(locale, "setting.error.objectFormat") + ` (${field})`
          );
        }

        const label = (fieldVal as any).label;
        const href = (fieldVal as any).href;
        const url = (fieldVal as any).url;

        if (!label || typeof label !== "object") {
          throw new Error(
            t(locale, "setting.error.labelMissing") + ` (${field})`
          );
        }

        validateTranslatedLabel(label, `label in ${field}`);

        if (
          (!href && !url) ||
          (href && typeof href !== "string") ||
          (url && typeof url !== "string")
        ) {
          throw new Error(
            t(locale, "setting.error.hrefOrUrlMissing") + ` (${field})`
          );
        }
      }

      return true;
    }

    // 🎯 Social links
    if (["footer_social_links", "navbar_social_links"].includes(key)) {
      if (entries.length === 0) {
        throw new Error(t(locale, "setting.error.objectEmpty") + ` (${key})`);
      }

      for (const [field, fieldVal] of entries) {
        if (typeof fieldVal !== "object" || !fieldVal) {
          throw new Error(
            t(locale, "setting.error.objectFormat") + ` (${field})`
          );
        }

        const url = (fieldVal as any).url;
        const icon = (fieldVal as any).icon;

        if (!url || typeof url !== "string") {
          throw new Error(
            t(locale, "setting.error.urlMissing") + ` (${field})`
          );
        }
        if (!icon || typeof icon !== "string") {
          throw new Error(
            t(locale, "setting.error.iconMissing") + ` (${field})`
          );
        }
      }

      return true;
    }

    // 🎯 navbar_special_link: { href, icon }
    if (key === "navbar_special_link") {
      if (!val.href || typeof val.href !== "string") {
        throw new Error(t(locale, "setting.error.hrefRequired"));
      }
      if (!val.icon || typeof val.icon !== "string") {
        throw new Error(t(locale, "setting.error.iconMissing"));
      }
      return true;
    }

    // 🎯 navbar_contact: { phone }
    if (key === "navbar_contact") {
      if (!val.phone || typeof val.phone !== "string") {
        throw new Error(t(locale, "setting.error.phoneMissing"));
      }
      return true;
    }

    // 🎯 navbar_logo_text: { title, slogan }
    if (key === "navbar_logo_text") {
      if (
        !val.title ||
        typeof val.title !== "object" ||
        !val.slogan ||
        typeof val.slogan !== "object"
      ) {
        throw new Error(t(locale, "setting.error.titleOrSloganMissing"));
      }
      validateTranslatedLabel(val.title, "title");
      validateTranslatedLabel(val.slogan, "slogan");
      return true;
    }

    // 🎯 Default: TranslatedLabel
    validateTranslatedLabel(val, "value");
    return true;
  }

  // ❌ none matched
  throw new Error(t(locale, "setting.error.invalidValueType"));
});

// ✅ Export edilen middleware'ler
export const validateUpsertSetting = [
  keyValidation,
  valueValidation,
  validateRequest,
];

export const validateSettingKeyParam = [
  param("key")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Key parameter is required."),
  validateRequest,
];
