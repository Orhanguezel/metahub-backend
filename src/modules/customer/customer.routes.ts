import express from "express";
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "./customer.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { analyticsLogger } from "@/core/middleware/analyticsLogger";
import {
  createCustomerValidator,
  updateCustomerValidator,
  validateCustomerIdParam,
} from "./customer.validation";

const router = express.Router();

// ✅ Admin Routes (all protected)
router.use(authenticate, authorizeRoles("admin"));

router.get("/", analyticsLogger, getAllCustomers);

router.get("/:id", validateCustomerIdParam, analyticsLogger, getCustomerById);

router.post("/", createCustomerValidator, createCustomer);

router.put(
  "/:id",
  validateCustomerIdParam,
  updateCustomerValidator,
  updateCustomer
);

router.delete("/:id", validateCustomerIdParam, deleteCustomer);

export default router;
