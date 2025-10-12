import { body, param, query } from "express-validator";

/* Not: validateRequest router’da çağrılıyor. Burada sadece rule set’leri var. */
export const PROVIDERS = [
  "stripe","paypal","iyzico","paytr","papara","paycell","craftgate","manual",
] as const;

export const validateGatewayId = [
  param("id").isMongoId(),
];

export const validateGatewayCreate = [
  body("provider").notEmpty().isIn(PROVIDERS as unknown as string[]),
  body("title").optional().isString(),
  body("isActive").optional().isBoolean(),
  body("testMode").optional().isBoolean(),
  body("allowedMethods").optional().isArray(),
  body("credentials").optional().isObject(),
];

export const validateGatewayUpdate = [
  body("title").optional().isString(),
  body("isActive").optional().isBoolean(),
  body("testMode").optional().isBoolean(),
  body("mode").optional().isIn(["test","live"]),
  body("allowedMethods").optional().isArray(),
  body("credentials").optional().isObject(),
];

export const validateGatewayList = [
  query("provider").optional().isIn(PROVIDERS as unknown as string[]),
  query("isActive").optional().toBoolean().isBoolean(),
];

export const validateGatewayTest = [
  param("id").isMongoId(),
];
