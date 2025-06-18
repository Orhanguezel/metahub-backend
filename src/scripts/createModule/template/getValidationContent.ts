export const getValidationContent = (CapName: string, moduleName: string) => `
import { body } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t, getLogLocale } from "@/core/utils/i18n/translate";
import translations from "./i18n";

export const validateCreate${CapName} = [
  body("name")
    .isString()
    .notEmpty()
    .withMessage((value, { req }) =>
      t("validation.nameRequired", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];
`;
