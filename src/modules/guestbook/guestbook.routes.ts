// src/routes/guestbook.routes.ts

import express from "express";
import {
  createEntry,
  getPublishedEntries,
  getAllEntries,
  togglePublishEntry,
  deleteEntry,
} from "./guestbook.controller";
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

router.post("/", createEntry);
router.get("/", getPublishedEntries);

// Admin Routes
router.get("/admin", authenticate, authorizeRoles("admin"), getAllEntries);
router.put("/:id/toggle", authenticate, authorizeRoles("admin"), togglePublishEntry);
router.delete("/:id", authenticate, authorizeRoles("admin"), deleteEntry);

export default router;
