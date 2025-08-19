import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import translations from "./i18n";

function t(req: any, key: string) {
  const locale = req.locale || "en";
  const keys = key.split(".");
  let result: any = translations;
  for (const k of keys) result = result?.[k];
  return result?.[locale] || result?.en || key;
}

export const validateManualMessage = [
  body("roomId")
    .notEmpty().withMessage((_: any, { req }: any) => t(req, "manualMessage.roomIdRequired"))
    .isString().withMessage((_: any, { req }: any) => t(req, "manualMessage.roomIdString")),
  body("message")
    .notEmpty().withMessage((_: any, { req }: any) => t(req, "manualMessage.messageRequired"))
    .isString().withMessage((_: any, { req }: any) => t(req, "manualMessage.messageString")),
  body("close").optional().isBoolean().withMessage((_: any, { req }: any) => t(req, "manualMessage.closeBoolean")),
  validateRequest,
];

export const validateBulkDelete = [
  body("ids").isArray({ min: 1 }).withMessage((_: any, { req }: any) => t(req, "bulkDelete.idsArray")),
  body("ids.*").isMongoId().withMessage((_: any, { req }: any) => t(req, "bulkDelete.idMongo")),
  validateRequest,
];

export const validateIdParam = [
  param("id").isMongoId().withMessage((_: any, { req }: any) => t(req, "singleId.invalid")),
  validateRequest,
];

export const validateRoomIdParam = [
  param("roomId")
    .notEmpty().withMessage((_: any, { req }: any) => t(req, "roomIdParam.required"))
    .isString().withMessage((_: any, { req }: any) => t(req, "roomIdParam.string")),
  validateRequest,
];

export const validateSendMessage = [
  body("roomId")
    .notEmpty().withMessage((_: any, { req }: any) => t(req, "manualMessage.roomIdRequired"))
    .isString().withMessage((_: any, { req }: any) => t(req, "manualMessage.roomIdString")),
  body("message")
    .notEmpty().withMessage((_: any, { req }: any) => t(req, "manualMessage.messageRequired"))
    .isString().withMessage((_: any, { req }: any) => t(req, "manualMessage.messageString")),
  validateRequest,
];
