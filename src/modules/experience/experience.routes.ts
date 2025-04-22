import express from "express";
import { getAllExperiences, createExperience } from "./experience.controller";
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

router.get("/", getAllExperiences);
router.post("/", authenticate, authorizeRoles("admin"), createExperience);

export default router;
