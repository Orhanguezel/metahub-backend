// @/modules/booking/admin.routes.ts
import express from "express";
import {
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking,
} from "./admin.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateObjectId,
  validateUpdateBookingStatus,
} from "./booking.validation";

const router = express.Router();
router.use(authenticate, authorizeRoles("admin"));

router.get("/", getAllBookings);
router.get("/:id", validateObjectId("id"), getBookingById);
router.put("/:id/status", validateObjectId("id"), validateUpdateBookingStatus, updateBookingStatus);
router.delete("/:id", validateObjectId("id"), deleteBooking);

export default router;
