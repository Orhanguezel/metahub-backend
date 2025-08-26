// modules/invoicing/admin.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  createInvoice,
  updateInvoice,
  changeInvoiceStatus,
  adminGetInvoices,
  adminGetInvoiceById,
  deleteInvoice,
  createInvoiceFromOrder,   // <-- eklendi
} from "./admin.controller";
import {
  validateObjectId,
  validateCreateInvoice,
  validateUpdateInvoice,
  validateChangeInvoiceStatus,
  validateInvoiceListQuery,
} from "./validation";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// Admin auth
router.use(authenticate, authorizeRoles("admin", "moderator"));

// List & detail
router.get("/", validateInvoiceListQuery, adminGetInvoices);
router.get("/:id", validateObjectId("id"), adminGetInvoiceById);

// Create
router.post(
  "/",
  transformNestedFields([
    "seller",
    "buyer",
    "links",
    "items",
    "invoiceDiscount",
    "totals",
    "notes",
    "terms",
    "attachments",
  ]),
  validateCreateInvoice,
  createInvoice
);

// Create from order (MVP)
router.post("/from-order", createInvoiceFromOrder);

// Update (full/partial)
router.put(
  "/:id",
  transformNestedFields([
    "seller",
    "buyer",
    "links",
    "items",
    "invoiceDiscount",
    "totals",
    "notes",
    "terms",
    "attachments",
  ]),
  validateObjectId("id"),
  validateUpdateInvoice,
  updateInvoice
);

// Status change
router.patch(
  "/:id/status",
  validateObjectId("id"),
  validateChangeInvoiceStatus,
  changeInvoiceStatus
);

// Delete
router.delete("/:id", validateObjectId("id"), deleteInvoice);

export default router;
