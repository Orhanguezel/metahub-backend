import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateCreateTest } from "./test.validation";
import { createTest, getAllTest, updateTest, deleteTest } from "./test.controller";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin"));

// ➕ Create
router.post("/", validateCreateTest, createTest);

// 📝 Get All
router.get("/", getAllTest);

// ✏️ Update
router.put("/:id", validateCreateTest, updateTest);

// 🗑️ Delete
router.delete("/:id", deleteTest);

export default router;