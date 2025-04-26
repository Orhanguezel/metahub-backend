import express from "express";
import { authenticate } from "@/core/middleware/authMiddleware";
import {
  createAddress,
  deleteAddress,
  getAddressById,
  getUserAddresses,
  updateAddress,
} from "./address.controller";
import {
  validateAddressCreation,
  validateAddressUpdate,
  validateAddressId,
} from "./address.validation";

const router = express.Router();


router.use(authenticate);


router.get("/", getUserAddresses);


router.post("/", validateAddressCreation, createAddress);


router.get("/:id", validateAddressId, getAddressById);


router.put("/:id", validateAddressId, validateAddressUpdate, updateAddress);


router.delete("/:id", validateAddressId, deleteAddress);

export default router;
