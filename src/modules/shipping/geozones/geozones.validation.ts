import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

const ISO2 = /^[A-Z]{2}$/;
const CODE = /^[a-z0-9._-]+$/;

export const vZoneId = [ param("id").isMongoId(), validateRequest ];

export const vListZones = [
  query("isActive").optional().toBoolean().isBoolean(),
  validateRequest,
];

export const vCreateZone = [
  body("code").isString().trim().matches(CODE),
  body("name").optional().isObject(),
  body("isActive").optional().toBoolean().isBoolean(),
  body("countries").optional().isArray(),
  body("countries.*").optional().isString().trim().toUpperCase().matches(ISO2),
  body("states").optional().isArray(),
  body("states.*").optional().isString().trim(),
  body("citiesInc").optional().isArray(),
  body("citiesExc").optional().isArray(),
  body("postalInc").optional().isArray(),
  body("postalExc").optional().isArray(),
  body("priority").optional().isInt({ min: 0, max: 10000 }),
  validateRequest,
];

export const vUpdateZone = [
  body("code").not().exists(), // code değişemez
  body("name").optional().isObject(),
  body("isActive").optional().toBoolean().isBoolean(),
  body("countries").optional().isArray(),
  body("countries.*").optional().isString().trim().toUpperCase().matches(ISO2),
  body("states").optional().isArray(),
  body("states.*").optional().isString().trim(),
  body("citiesInc").optional().isArray(),
  body("citiesExc").optional().isArray(),
  body("postalInc").optional().isArray(),
  body("postalExc").optional().isArray(),
  body("priority").optional().isInt({ min: 0, max: 10000 }),
  validateRequest,
];
