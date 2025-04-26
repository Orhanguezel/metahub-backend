import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateCreateOrhan } from "./orhan.validation";
import { createOrhan, getAllOrhan, updateOrhan, deleteOrhan } from "./orhan.controller";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin"));

// ➕ Create
router.post("/", validateCreateOrhan, createOrhan);

// 📝 Get All
router.get("/", getAllOrhan);

// ✏️ Update
router.put("/:id", validateCreateOrhan, updateOrhan);

// 🗑️ Delete
router.delete("/:id", deleteOrhan);

export default router;
