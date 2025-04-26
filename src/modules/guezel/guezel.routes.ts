import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateCreateGuezel } from "./guezel.validation";
import { createGuezel, getAllGuezel, updateGuezel, deleteGuezel } from "./guezel.controller";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin"));

// ➕ Create
router.post("/", validateCreateGuezel, createGuezel);

// 📝 Get All
router.get("/", getAllGuezel);

// ✏️ Update
router.put("/:id", validateCreateGuezel, updateGuezel);

// 🗑️ Delete
router.delete("/:id", deleteGuezel);

export default router;