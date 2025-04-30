import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateCreateDemo } from "./demo.validation";
import { createDemo, getAllDemo, updateDemo, deleteDemo } from "./demo.controller";
import { pingDemo } from "./demo.controller";
import { validateApiKey } from "@/core/middleware/validateApiKey";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin"));

router.post("/", validateCreateDemo, createDemo);
router.get("/", getAllDemo);
router.put("/:id", validateCreateDemo, updateDemo);
router.delete("/:id", deleteDemo);
// Public API key route
router.get("/ping", validateApiKey, pingDemo);

export default router;
