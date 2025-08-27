import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { isValidObjectId } from "@/core/utils/validation";

const isURLish = (v: string) => /^https?:\/\//i.test(v || "");

// FE + BE eşleşmesi için event listesi (test için system.ping dâhil)
export const ALLOWED_EVENTS = [
  "order.created",
  "order.status.changed",
  "payment.created",
  "payment.refunded",
  "promotion.redeemed",
  "coupon.created",
  "coupon.updated",
  "menuitem.updated",
  "system.ping",
  "*",
];

const RESERVED_HEADERS = ["content-type","x-mh-signature","x-mh-timestamp","x-mh-event"];

const validateHeadersArray = body("headers").optional().isArray().custom((arr) => {
  if (!Array.isArray(arr)) return false;
  for (const kv of arr) {
    if (!kv || typeof kv.key !== "string") return false;
    const keyLc = kv.key.toLowerCase();
    if (RESERVED_HEADERS.includes(keyLc)) {
      throw new Error("webhooks.header.reserved");
    }
  }
  return true;
});

const validateEventsArray = (field = "events") =>
  body(field).optional().isArray().custom((arr) => {
    if (!Array.isArray(arr)) return false;
    for (const ev of arr) {
      if (typeof ev !== "string") return false;
      if (!ALLOWED_EVENTS.includes(ev)) throw new Error("webhooks.event.invalid");
    }
    return true;
  });

export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

export const validateCreateEndpoint = [
  body("name").isString().trim().notEmpty(),
  body("targetUrl").custom((v) => isURLish(v)).withMessage((_, { req }) =>
    translate("webhooks.invalidUrl", req.locale || getLogLocale(), translations)
  ),
  body("httpMethod").optional().isIn(["POST","PUT"]),
  validateEventsArray("events"),
  body("secret").optional().isString().isLength({ min: 8 }),
  validateHeadersArray,
  body("verifySSL").optional().toBoolean().isBoolean(),
  body("signing").optional().isObject(),
  body("retry").optional().isObject(),
  validateRequest,
];

export const validateUpdateEndpoint = [
  body("name").optional().isString().trim().notEmpty(),
  body("targetUrl").optional().custom((v) => isURLish(v)),
  body("httpMethod").optional().isIn(["POST","PUT"]),
  validateEventsArray("events"),
  validateHeadersArray,
  body("verifySSL").optional().toBoolean().isBoolean(),
  body("signing").optional().isObject(),
  body("retry").optional().isObject(),
  body("rotateSecret").optional().toBoolean().isBoolean(),
  validateRequest,
];

export const validateEndpointListQuery = [
  query("q").optional().isString(),
  query("isActive").optional().toBoolean().isBoolean(),
  query("event").optional().isString(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];

export const validateDeliveryListQuery = [
  query("endpointRef").optional().custom((v) => !v || isValidObjectId(v)),
  query("eventType").optional().isString(),
  query("success").optional().toBoolean().isBoolean(),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("includePayload").optional().toBoolean().isBoolean(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];

export const validateRetryDelivery = [
  param("id").isMongoId(),
  validateRequest,
];

export const validateTestSend = [
  body("endpointRef").optional().isMongoId(),
  body("targetUrl").optional().custom((v) => !v || isURLish(v)),
  body("eventType").optional().isString(),
  body().custom((val) => {
    if (!val.endpointRef && !val.targetUrl) throw new Error("endpointRef_or_targetUrl_required");
    return true;
  }),
  validateRequest,
];
