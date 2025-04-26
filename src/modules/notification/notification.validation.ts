import { body, param } from "express-validator";

export const createNotificationValidator = [
  body("title.tr").notEmpty().withMessage("Title (tr) is required."),
  body("title.en").notEmpty().withMessage("Title (en) is required."),
  body("title.de").notEmpty().withMessage("Title (de) is required."),
  body("message.tr").notEmpty().withMessage("Message (tr) is required."),
  body("message.en").notEmpty().withMessage("Message (en) is required."),
  body("message.de").notEmpty().withMessage("Message (de) is required."),
  body("type")
    .notEmpty()
    .isIn(["info", "success", "warning", "error"])
    .withMessage("Type must be one of: info, success, warning, error."),
];

export const idParamValidator = [
  param("id")
    .notEmpty()
    .isMongoId()
    .withMessage("Invalid ID format."),
];
