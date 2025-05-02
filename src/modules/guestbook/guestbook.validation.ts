import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Create entry validator
export const validateCreateGuestbookEntry = [
  body("name").notEmpty().withMessage("Name is required."),
  body("email").optional().isEmail().withMessage("Email must be valid."),
  body("message_tr").optional().isString(),
  body("message_en").optional().isString(),
  body("message_de").optional().isString(),
  body("parentId").optional().isMongoId().withMessage("Parent ID must be valid."),
  validateRequest,
];

// ✅ Param validator
export const validateGuestbookIdParam = [
  param("id").isMongoId().withMessage("Invalid guestbook entry ID."),
  validateRequest,
];
