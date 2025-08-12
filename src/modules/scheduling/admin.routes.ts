import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllSchedulePlan,
  adminGetSchedulePlanById,
  createSchedulePlan,
  updateSchedulePlan,
  deleteSchedulePlan,
} from "./admin.controller";
import {
  validateObjectId,
  validateCreateSchedulePlan,
  validateUpdateSchedulePlan,
  validateAdminQuery,
} from "./validation";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

/* Admin guard */
router.use(authenticate, authorizeRoles("admin", "moderator"));

/* List */
router.get("/", validateAdminQuery, adminGetAllSchedulePlan);

/* Detail */
router.get("/:id", validateObjectId("id"), adminGetSchedulePlanById);

/* Create */
router.post(
  "/",
  // form-data desteği (opsiyonel)
  transformNestedFields([
    "title",
    "description",
    "anchor",
    "pattern",
    "window",
    "policy",
    "skipDates",
    "blackouts",
    "tags",
  ]),
  validateCreateSchedulePlan,
  createSchedulePlan
);

/* Update */
router.put(
  "/:id",
  transformNestedFields([
    "title",
    "description",
    "anchor",
    "pattern",
    "window",
    "policy",
    "skipDates",
    "blackouts",
    "tags",
  ]),
  validateObjectId("id"),
  validateUpdateSchedulePlan,
  updateSchedulePlan
);

/* Delete */
router.delete("/:id", validateObjectId("id"), deleteSchedulePlan);

export default router;
