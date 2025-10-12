import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  adminListIndex, adminGetIndexById, adminDeleteIndex, adminRebuildIndex, adminUpsertIndex
} from "./admin.controller";
import { validateIndexListQuery, validateObjectId, validateRebuild, validateUpsertOne } from "./validation";

const router = express.Router();
router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateIndexListQuery, adminListIndex);
router.get("/:id", validateObjectId("id"), adminGetIndexById);
router.delete("/:id", validateObjectId("id"), adminDeleteIndex);
router.post("/rebuild", validateRebuild, adminRebuildIndex);
router.post("/upsert", validateUpsertOne, adminUpsertIndex);

export default router;
