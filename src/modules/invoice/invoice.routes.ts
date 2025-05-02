import express from "express";
import {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  getUserInvoices,
  getInvoicePDF,
} from "./invoice.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateCreateInvoice, validateInvoiceIdParam } from "./invoice.validation";

const router = express.Router();

// 🔐 Admin: get all invoices
router.get("/", authenticate, authorizeRoles("admin"), getAllInvoices);

// 🔐 User: create invoice
router.post("/", authenticate, validateCreateInvoice, createInvoice);

// 🔐 User: own invoices
router.get("/user", authenticate, getUserInvoices);

// 🔐 Get single invoice + PDF
router.get("/:id", authenticate, validateInvoiceIdParam, getInvoiceById);
router.get("/:id/pdf", authenticate, validateInvoiceIdParam, getInvoicePDF);

export default router;
