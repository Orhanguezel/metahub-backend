import { body, param } from "express-validator";
import isURL from "validator/lib/isURL.js";
import { validateRequest } from "@/core/middleware/validateRequest";

/** /public/product/:id/report için validasyon */
export const validatePublicProductReport = [
  // :id
  param("id").isMongoId().withMessage("invalid_product_id"),

  // body.reason
  body("reason")
    .isIn(["wrong_info", "abuse", "fraud", "other"])
    .withMessage("invalid_reason"),

  // body.details
  body("details").optional().isString().isLength({ max: 2000 }),

  // contact (opsiyonel)
  body("name").optional().isString().isLength({ max: 120 }),
  body("email").optional().isEmail(),
  body("phone").optional().isString().isLength({ max: 40 }),

  // body.url — relative path veya tam URL (localhost/IP dahil)
  body("url")
    .optional()
    .custom((v) => {
      if (!v) return true;
      if (typeof v !== "string") throw new Error("invalid_url");
      if (v.startsWith("/")) return true; // relative kabul
      const ok = isURL(v, {
        require_protocol: true,
        require_tld: false, // localhost & IP destekle
        allow_protocol_relative_urls: true,
        allow_underscores: true,
        allow_trailing_dot: true,
        allow_fragments: true,
        allow_query_components: true,
      });
      if (!ok) throw new Error("invalid_url");
      return true;
    }),

  // hepsinin sonunda
  validateRequest,
];
