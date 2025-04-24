// src/modules/invoice/invoice.routes.ts
import express from "express";
import {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  getUserInvoices,
  getInvoicePDF,
} from "./invoice.controller";
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

router
  .route("/")
  .get(authenticate, authorizeRoles("admin"), getAllInvoices)
  .post(authenticate, createInvoice);

router.get("/user", authenticate, getUserInvoices);
router.get("/:id", authenticate, getInvoiceById);
router.get("/:id/pdf", authenticate, getInvoicePDF);

export default router;
