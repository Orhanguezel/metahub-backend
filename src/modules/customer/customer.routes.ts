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

// Tüm rotalar admin ve authenticated kullanıcıya özel
router.use(authenticate, authorizeRoles("admin"));

// Tüm müşterileri getir
router.get("/", getAllCustomers);

// Tek müşteri getir (ID ile)
router.get("/:id", validateCustomerIdParam, getCustomerById);

// Müşteri oluştur
router.post("/", createCustomerValidator, createCustomer);

// Müşteri güncelle
router.put("/:id", validateCustomerIdParam, updateCustomerValidator, updateCustomer);

// Müşteri sil
router.delete("/:id", validateCustomerIdParam, deleteCustomer);

export default router;
