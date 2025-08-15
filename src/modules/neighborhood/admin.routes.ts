import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  createNeighborhood,
  adminGetNeighborhoods,
  adminGetNeighborhoodById,
  updateNeighborhood,
  deleteNeighborhood,
} from "./admin.controller";
import {
  validateObjectId,
  validateCreateNeighborhood,
  validateUpdateNeighborhood,
  validateNeighborhoodListQuery,
} from "./validation";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

/* Admin Auth */
router.use(authenticate, authorizeRoles("admin", "moderator"));

/* List & Get */
router.get("/", validateNeighborhoodListQuery, adminGetNeighborhoods);
router.get("/:id", validateObjectId("id"), adminGetNeighborhoodById);

/* Create */
router.post(
  "/",
  transformNestedFields(["name", "codes", "geo", "aliases", "tags"]),
  validateCreateNeighborhood,
  createNeighborhood
);

/* Update */
router.patch(
  "/:id",
  transformNestedFields(["name", "codes", "geo", "aliases", "tags"]),
  validateObjectId("id"),
  validateUpdateNeighborhood,
  updateNeighborhood
);

/* Delete */
router.delete("/:id", validateObjectId("id"), deleteNeighborhood);

export default router;
