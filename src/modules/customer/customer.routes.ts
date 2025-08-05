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
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  createCustomerValidator,
  updateCustomerValidator,
  validateCustomerIdParam,
  updateCustomerPublicValidator,
} from "./customer.validation";

const router = express.Router();

// PUBLIC (login müşteri)
router.get("/public/:id", authenticate, validateCustomerIdParam, getCustomerPublicById);
router.put("/public/:id", authenticate, validateCustomerIdParam, updateCustomerPublicValidator, updateCustomerPublic);

// ADMIN (admin)
router.get("/admin", authenticate, authorizeRoles("admin"), getAllCustomers);
router.get("/admin/:id", authenticate, authorizeRoles("admin"), validateCustomerIdParam, getCustomerById);
router.post("/admin", authenticate, authorizeRoles("admin"), createCustomerValidator, createCustomer);
router.put("/admin/:id", authenticate, authorizeRoles("admin"), validateCustomerIdParam, updateCustomerValidator, updateCustomer);
router.delete("/admin/:id", authenticate, authorizeRoles("admin"), validateCustomerIdParam, deleteCustomer);


export default router;
