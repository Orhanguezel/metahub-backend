import express from "express";
import { publicGetBranches, publicGetBranchAvailability } from "./public.controller";
import { validatePublicQuery, validateObjectId } from "./validation";

const router = express.Router();

// Public list (aktif şubeler)
router.get("/", validatePublicQuery, publicGetBranches);

// Availability
router.get("/:id/availability", validateObjectId("id"), publicGetBranchAvailability);

export default router;
