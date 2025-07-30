// utils/i18n/validationUtils.ts
import { body, param } from "express-validator";
import { SUPPORTED_LOCALES } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "@/templates/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { validateRequest } from "@/core/middleware/validateRequest";


export function validateMultilangField(field: string) {
  return body(field)
    .custom((value, { req }) => {
      if (!value || typeof value !== "object") return false;
      // En az bir locale dolu olmalı
      return SUPPORTED_LOCALES.some((lng) => value[lng] && value[lng].trim() !== "");
    })
    .withMessage((_, { req }) =>
      translate("validation.multilangFieldRequired", req.locale || getLogLocale(), translations, { field })
    );
}





// ✅ Notification Oluşturma Validasyonu
export const createNotificationValidator = [
  // Title (multi-lang, en az bir dilde dolu)
  validateMultilangField("title"),
  // Message (multi-lang, en az bir dilde dolu)
  validateMultilangField("message"),
  // Type kontrolü
  body("type")
    .notEmpty()
    .isIn(["info", "success", "warning", "error"])
    .withMessage((_, { req }) =>
      translate("validation.invalidNotificationType", req.locale || getLogLocale(), translations)
    ),
  // User opsiyonel, ama varsa ObjectId olmalı
  body("user").optional().isMongoId().withMessage("Invalid user id."),
  validateRequest,
];

// ✅ Notification ID Param Validasyonu
export const idParamValidator = [
  param("id")
    .notEmpty()
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.invalidNotificationId", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

