import express from "express";
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerPublicById,
  updateCustomerPublic,
} from "./customer.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  createCustomerValidator,
  updateCustomerValidator,
  validateCustomerIdParam,
  updateCustomerPublicValidator,
  customersAdminQueryValidator,
} from "./validation";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

/* PUBLIC (login müşteri) */
router.get("/public/:id", authenticate, validateCustomerIdParam, getCustomerPublicById);
router.put(
  "/public/:id",
  authenticate,
  validateCustomerIdParam,
  updateCustomerPublicValidator,
  updateCustomerPublic
);

/* ADMIN */
router.get(
  "/admin",
  authenticate,
  authorizeRoles("admin"),
  customersAdminQueryValidator,
  getAllCustomers
);
router.get(
  "/admin/:id",
  authenticate,
  authorizeRoles("admin"),
  validateCustomerIdParam,
  getCustomerById
);

router.post(
  "/admin",
  authenticate,
  authorizeRoles("admin"),
  transformNestedFields(["addresses", "billing", "tags"]),
  createCustomerValidator,
  createCustomer
);

router.put(
  "/admin/:id",
  authenticate,
  authorizeRoles("admin"),
  validateCustomerIdParam,
  transformNestedFields(["addresses", "billing", "tags"]),
  updateCustomerValidator,
  updateCustomer
);

router.delete(
  "/admin/:id",
  authenticate,
  authorizeRoles("admin"),
  validateCustomerIdParam,
  deleteCustomer
);

export default router;
