import express from "express";
import {
  createEntry,
  getPublishedEntries,
  getAllEntries,
  togglePublishEntry,
  deleteEntry,
} from "./guestbook.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateGuestbookIdParam,
  validateCreateGuestbookEntry,
} from "./guestbook.validation";

const router = express.Router();

// Public
router.post("/", validateCreateGuestbookEntry, createEntry);
router.get("/", getPublishedEntries);

// Admin Routes
router.use(authenticate, authorizeRoles("admin"));

router.get("/admin", getAllEntries);
router.put("/:id/toggle", validateGuestbookIdParam, togglePublishEntry);
router.delete("/:id", validateGuestbookIdParam, deleteEntry);

export default router;
