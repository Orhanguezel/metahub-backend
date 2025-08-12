import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  createAccount,
  updateAccount,
  adminGetAccounts,
  adminGetAccountById,
  deleteAccount,
  createEntry,
  updateEntry,
  adminGetEntries,
  adminGetEntryById,
  deleteEntry,
  reconcileEntries,
  unreconcileById,
} from "./admin.controller";
import {
  validateObjectId,
  validateCreateAccount,
  validateUpdateAccount,
  validateCreateEntry,
  validateUpdateEntry,
  validateEntriesAdminQuery,
  validateReconcile,
} from "./validation";

const router = express.Router();

// guard
router.use(authenticate, authorizeRoles("admin", "moderator"));

// accounts
router.get("/accounts", adminGetAccounts);
router.get("/accounts/:id", validateObjectId("id"), adminGetAccountById);
router.post("/accounts", validateCreateAccount, createAccount);
router.put("/accounts/:id", validateObjectId("id"), validateUpdateAccount, updateAccount);
router.delete("/accounts/:id", validateObjectId("id"), deleteAccount);

// entries
router.get("/entries", validateEntriesAdminQuery, adminGetEntries);
router.get("/entries/:id", validateObjectId("id"), adminGetEntryById);
router.post("/entries", validateCreateEntry, createEntry);
router.put("/entries/:id", validateObjectId("id"), validateUpdateEntry, updateEntry);
router.delete("/entries/:id", validateObjectId("id"), deleteEntry);

// reconciliation
router.post("/reconcile", validateReconcile, reconcileEntries);
router.delete("/reconcile/:rid", unreconcileById);

export default router;
