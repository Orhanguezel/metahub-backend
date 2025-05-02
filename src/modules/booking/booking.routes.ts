import { Router, Request, Response, NextFunction } from "express";
import {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking,
} from "./booking.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateCreateBooking, validateUpdateBookingStatus, validateObjectId } from "./booking.validation";
import { analyticsLogger } from "@/core/middleware/analyticsLogger";

const router = Router();

// ✅ Public booking create
router.post("/", analyticsLogger, validateCreateBooking, createBooking);

// ✅ Admin routes
router.use(authenticate, authorizeRoles("admin"), analyticsLogger);

router.get("/", getAllBookings);
router.get("/:id", validateObjectId("id"), getBookingById);
router.put("/:id/status", validateObjectId("id"), validateUpdateBookingStatus, updateBookingStatus);
router.delete("/:id", validateObjectId("id"), deleteBooking);

export default router;
