import express from "express";
import { getAllEducation, createEducation } from "./education.controller";
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

router.get("/", getAllEducation);
router.post("/", authenticate, authorizeRoles("admin"), createEducation);

export default router;
