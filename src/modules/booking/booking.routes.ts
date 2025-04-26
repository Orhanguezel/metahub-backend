import { Router } from "express";
import {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking,
} from "./booking.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateCreateBooking, validateUpdateBookingStatus, validateObjectId } from "./booking.validation";

const router = Router();

router.post("/", validateCreateBooking, createBooking);

router.use(authenticate, authorizeRoles("admin"));

router.get("/", getAllBookings);
router.get("/:id", validateObjectId("id"), getBookingById);
router.put("/:id/status", validateObjectId("id"), validateUpdateBookingStatus, updateBookingStatus);
router.delete("/:id", validateObjectId("id"), deleteBooking);

export default router;
