// src/routes/customer.routes.ts
import express from "express";
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "./customer.controller";
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

router.get("/", authenticate, authorizeRoles("admin"), getAllCustomers);
router.get("/:id", authenticate, authorizeRoles("admin"), getCustomerById);
router.post("/", authenticate, authorizeRoles("admin"), createCustomer);
router.put("/:id", authenticate, authorizeRoles("admin"), updateCustomer);
router.delete("/:id", authenticate, authorizeRoles("admin"), deleteCustomer);

export default router;
