// modules/notifications/notification.validation.ts
import { body, param, query } from "express-validator";
import { SUPPORTED_LOCALES } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n"; // ← modül i18n
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { validateRequest } from "@/core/middleware/validateRequest";

// ortak — çok dilliyi doğrula
const validateMultilangField = (field: string) =>
  body(field)
    .custom((value) => {
      if (!value || typeof value !== "object") return false;
      return SUPPORTED_LOCALES.some(
        (lng) => value[lng] && String(value[lng]).trim() !== ""
      );
    })
    .withMessage((_, { req }) =>
      translate(
        "validation.multilangFieldRequired",
        (req as any).locale || getLogLocale(),
        translations,
        { field }
      )
    );

// küçük yardımcılar
const jsonOrUndefined = (v: any) => {
  try {
    if (typeof v === "string") {
      const parsed = JSON.parse(v);
      return parsed ?? undefined;
    }
    return v ?? undefined;
  } catch {
    return undefined;
  }
};

// --- CREATE ---
export const createNotificationValidator = [
  // i18n alanlar
  validateMultilangField("title"),
  validateMultilangField("message"),

  // tip
  body("type")
    .notEmpty()
    .isIn(["info", "success", "warning", "error"])
    .withMessage((_, { req }) =>
      translate(
        "validation.invalidNotificationType",
        (req as any).locale || getLogLocale(),
        translations
      )
    ),

  // opsiyoneller
  body("user").optional().isMongoId(),

  // target: { users?: ObjectId[], roles?: string[], allTenant?: boolean }
  body("target")
    .optional()
    .customSanitizer(jsonOrUndefined)
    .custom((target) => {
      if (!target) return true;
      if (typeof target !== "object") return false;
      if (target.users) {
        if (!Array.isArray(target.users)) return false;
        const allOk = target.users.every(
          (id: any) => typeof id === "string" && id.match(/^[a-fA-F0-9]{24}$/)
        );
        if (!allOk) return false;
      }
      if (target.roles && !Array.isArray(target.roles)) return false;
      if (
        typeof target.allTenant !== "undefined" &&
        typeof target.allTenant !== "boolean"
      )
        return false;
      return true;
    }),

  // link: { url?: string, label?: TranslatedLabel }
  body("link")
    .optional()
    .customSanitizer(jsonOrUndefined)
    .custom((link) => {
      if (!link) return true;
      if (typeof link !== "object") return false;
      if (link.url && typeof link.url !== "string") return false;
      if (link.label && typeof link.label !== "object") return false;
      return true;
    }),

  // actions: [{ key?, label?, url?, method? }]
  body("actions")
    .optional()
    .customSanitizer(jsonOrUndefined)
    .isArray()
    .withMessage("actions must be an array")
    .bail()
    .custom((arr) =>
      arr.every((a: any) => {
        if (typeof a !== "object") return false;
        if (a.url && typeof a.url !== "string") return false;
        if (a.method && typeof a.method !== "string") return false;
        if (a.label && typeof a.label !== "object") return false;
        return true;
      })
    ),

  // channels
  body("channels")
    .optional()
    .isArray()
    .custom((chs) =>
      chs.every((c: any) =>
        ["inapp", "email", "sms", "push", "webhook"].includes(c)
      )
    ),

  // priority 1..5
  body("priority").optional().isInt({ min: 1, max: 5 }),

  // tarih alanları
  body("scheduleAt").optional().isISO8601().toDate(),
  body("notBefore").optional().isISO8601().toDate(),
  body("expireAt").optional().isISO8601().toDate(),

  // dedupe
  body("dedupeKey").optional().isString().isLength({ max: 120 }),
  body("dedupeWindowMin").optional().isInt({ min: 0, max: 10080 }),

  // source, tags, isActive
  body("source").optional().customSanitizer(jsonOrUndefined),
  body("tags")
    .optional()
    .customSanitizer(jsonOrUndefined)
    .isArray()
    .custom((tags) => tags.every((t: any) => typeof t === "string")),
  body("isActive").optional().isBoolean(),

  validateRequest,
];

// --- :id param ---
export const idParamValidator = [
  param("id")
    .notEmpty()
    .isMongoId()
    .withMessage((_, { req }) =>
      translate(
        "validation.invalidNotificationId",
        (req as any).locale || getLogLocale(),
        translations
      )
    ),
  validateRequest,
];

// --- LIST (admin) query ---
export const listQueryValidator = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 200 }).toInt(),
  query("type").optional().isIn(["info", "success", "warning", "error"]),
  query("isRead").optional().isBoolean().toBoolean(),
  query("user").optional().isMongoId(),
  query("channel")
    .optional()
    .isIn(["inapp", "email", "sms", "push", "webhook"]),
  query("tag").optional().isString(),
  query("active").optional().isBoolean().toBoolean(),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("q").optional().isString(),
  query("sort").optional().isString(),
  validateRequest,
];

// --- MY feed query ---
export const myQueryValidator = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 200 }).toInt(),
  query("isRead").optional().isBoolean().toBoolean(),
  query("q").optional().isString(),
  validateRequest,
];

// --- unread count query ---
export const unreadCountQueryValidator = [
  query("user").optional().isMongoId(),
  validateRequest,
];

// --- mark-all-read query ---
export const markAllQueryValidator = [
  query("onlyMine").optional().isBoolean().toBoolean(),
  validateRequest,
];
