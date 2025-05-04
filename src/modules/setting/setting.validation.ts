import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// 🎯 Common key validation
const keyValidation = body("key")
  .isString()
  .withMessage("Key must be a string.")
  .trim()
  .notEmpty()
  .withMessage("Key is required.")
  .isLength({ min: 2, max: 100 })
  .withMessage("Key must be between 2 and 100 characters.");

// 🎯 Simplified value validation
const valueValidation = body("value").custom((val, { req }) => {
  const key = req.body.key;

  // ✅ 1️⃣ String değerler
  if (typeof val === "string") {
    if (["available_themes", "site_template"].includes(key)) return true;
    if (val.trim().length === 0) {
      throw new Error("Value must be a non-empty string.");
    }
    return true;
  }

  // ✅ 2️⃣ Array değerler (sadece available_themes için)
  if (Array.isArray(val)) {
    if (key === "available_themes") {
      if (val.length === 0) {
        throw new Error("available_themes array must not be empty.");
      }
      if (!val.every((v) => typeof v === "string" && v.trim().length > 0)) {
        throw new Error(
          "Each item in available_themes must be a non-empty string."
        );
      }
      return true;
    }
    throw new Error("Array is only allowed for 'available_themes'.");
  }

  // ✅ 3️⃣ Object değerler
  if (typeof val === "object" && val !== null) {
    const entries = Object.entries(val);

    // 🔥 ✅ navbar_logos ve footer_logos (light & dark yapı)
    if (["navbar_logos", "footer_logos"].includes(key)) {
      const { light, dark } = val as any;
      if (!light || typeof light !== "string" || !light.trim()) {
        throw new Error("'light' field must be a non-empty string.");
      }
      if (dark && (typeof dark !== "string" || !dark.trim())) {
        throw new Error("'dark' field must be a string if provided.");
      }
      return true;
    }

    // 🔥 footer_about_links, footer_services_links, footer_contact, navbar_main_links (nested)
    if (
      [
        "footer_about_links",
        "footer_services_links",
        "footer_contact",
        "navbar_main_links",
      ].includes(key)
    ) {
      if (entries.length === 0) {
        throw new Error(`${key} must have at least one field.`);
      }
      for (const [field, fieldVal] of entries) {
        if (typeof fieldVal !== "object" || fieldVal === null) {
          throw new Error(
            `Each field in ${key} must be an object containing 'label' and 'href' (or 'url'). Problem at '${field}'.`
          );
        }

        const { label, href, url } = fieldVal as any;

        if (!label || typeof label !== "object") {
          throw new Error(
            `'label' field must be an object (tr/en/de) in '${field}'.`
          );
        }

        const { tr, en, de } = label;
        if (!tr && !en && !de) {
          throw new Error(
            `At least one of tr, en, or de must be provided in '${field}'.`
          );
        }
        if (
          (tr && typeof tr !== "string") ||
          (en && typeof en !== "string") ||
          (de && typeof de !== "string")
        ) {
          throw new Error(
            `'label' values in '${field}' must be strings (tr/en/de).`
          );
        }

        if (
          (!href && !url) ||
          (href && typeof href !== "string") ||
          (url && typeof url !== "string")
        ) {
          throw new Error(
            `'href' or 'url' field must be a non-empty string in '${field}'.`
          );
        }
      }
      return true;
    }

    // 🔥 footer_social_links & navbar_social_links
    if (["footer_social_links", "navbar_social_links"].includes(key)) {
      if (entries.length === 0) {
        throw new Error(`${key} must have at least one field.`);
      }
      for (const [field, fieldVal] of entries) {
        if (typeof fieldVal !== "object" || fieldVal === null) {
          throw new Error(
            `Each field in ${key} must be an object with 'url' and 'icon'. Problem at '${field}'.`
          );
        }

        const { url, icon } = fieldVal as any;

        if (!url || typeof url !== "string") {
          throw new Error(`'url' must be a non-empty string in '${field}'.`);
        }
        if (!icon || typeof icon !== "string") {
          throw new Error(`'icon' must be a non-empty string in '${field}'.`);
        }
      }
      return true;
    }

    // 🔥 navbar_special_link
    if (key === "navbar_special_link") {
      const { href, icon } = val as any;
      if (!href || typeof href !== "string") {
        throw new Error("'href' must be a non-empty string.");
      }
      if (!icon || typeof icon !== "string") {
        throw new Error("'icon' must be a non-empty string.");
      }
      return true;
    }

    // 🔥 navbar_contact
    if (key === "navbar_contact") {
      const { phone } = val as any;
      if (!phone || typeof phone !== "string") {
        throw new Error("'phone' must be a non-empty string.");
      }
      return true;
    }

    // 🔥 navbar_logo_text
    if (key === "navbar_logo_text") {
      const { title, slogan } = val as any;
      if (!title || typeof title !== "object" || !slogan || typeof slogan !== "object") {
        throw new Error("'title' and 'slogan' must be objects (tr/en/de).");
      }
      const checkLang = (obj: any, fieldName: string) => {
        const { tr, en, de } = obj;
        if (!tr && !en && !de) {
          throw new Error(
            `At least one of tr, en, or de must be provided in '${fieldName}'.`
          );
        }
        if (
          (tr && typeof tr !== "string") ||
          (en && typeof en !== "string") ||
          (de && typeof de !== "string")
        ) {
          throw new Error(
            `'${fieldName}' values must be strings (tr/en/de).`
          );
        }
      };
      checkLang(title, "title");
      checkLang(slogan, "slogan");
      return true;
    }

    // ✅ Default MultiLang object { tr, en, de }
    const { tr, en, de } = val as any;
    if (!tr && !en && !de) {
      throw new Error(
        "At least one of tr, en, or de must be provided in value."
      );
    }
    if (
      (tr && typeof tr !== "string") ||
      (en && typeof en !== "string") ||
      (de && typeof de !== "string")
    ) {
      throw new Error("Values of tr, en, de must be strings.");
    }
    return true;
  }

  // ❌ Hiçbir şeye uymuyorsa
  throw new Error(
    "Invalid value type. Must be: string, string[], { tr, en, de } object, or nested object (e.g., footer_xxx, navbar_xxx)."
  );
});

export const validateUpsertSetting = [
  keyValidation,
  valueValidation,
  validateRequest,
];

// 🎯 Param validation
export const validateSettingKeyParam = [
  param("key")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Key parameter is required."),
  validateRequest,
];
