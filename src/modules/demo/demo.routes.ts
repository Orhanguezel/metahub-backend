// src/modules/demo/demo.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateRequest } from "@/core/middleware/validateRequest";
import { validateCreateDemo, validateDemoIdParam } from "./demo.validation";
import {
  createDemo,
  getAllDemo,
  updateDemo,
  deleteDemo,
  pingDemo,
} from "./demo.controller";
import { validateApiKey } from "@/core/middleware/validateApiKey";

const router = express.Router();

// 🔐 Admin routes
router.use(authenticate, authorizeRoles("admin"));

router.post("/", validateCreateDemo, createDemo);
router.get("/", getAllDemo);
router.put("/:id", validateDemoIdParam, validateCreateDemo, updateDemo);
router.delete("/:id", validateDemoIdParam, deleteDemo);

// 🌐 Public API key route
router.get("/ping", validateApiKey, pingDemo);

export default router;
