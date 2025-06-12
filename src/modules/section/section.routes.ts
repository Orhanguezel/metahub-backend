import express from "express";
import {
  createSection,
  getAllSection,
  updateSection,
  deleteSection,
} from "./section.controller";
import {
  validateSectionCreate,
  validateSectionUpdate,
} from "./section.validation";
import { validateRequest } from "@/core/middleware/validateRequest";

const router = express.Router();

// ➕ Section oluştur
router.post("/", validateSectionCreate, validateRequest, createSection);

// 📝 Tüm Sectionları getir
router.get("/", getAllSection);

// ✏️ Section güncelle (sadece gönderilen diller)
router.put("/:id", validateSectionUpdate, validateRequest, updateSection);

// 🗑️ Section sil
router.delete("/:id", deleteSection);

export default router;
