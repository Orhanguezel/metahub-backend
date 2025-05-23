import express from "express";
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "./customer.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  createCustomerValidator,
  updateCustomerValidator,
  validateCustomerIdParam,
} from "./customer.validation";

const router = express.Router();

// ✅ Admin Routes (all protected)
router.use(authenticate, authorizeRoles("admin"));

router.get("/", getAllCustomers);

router.get("/:id", validateCustomerIdParam, getCustomerById);

router.post("/", createCustomerValidator, createCustomer);

router.put(
  "/:id",
  validateCustomerIdParam,
  updateCustomerValidator,
  updateCustomer
);

router.delete("/:id", validateCustomerIdParam, deleteCustomer);

export default router;
