// src/routes/appointment.routes.ts

import express from "express";
import {
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  deleteAppointment,
} from "./appointment.controller";

import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

// Public - create appointment
router.post("/", createAppointment);

// Admin routes
router.get("/", authenticate, authorizeRoles("admin"), getAllAppointments);
router.get("/:id", authenticate, authorizeRoles("admin"), getAppointmentById);
router.put(
  "/:id/status",
  authenticate,
  authorizeRoles("admin"),
  updateAppointmentStatus
);
router.delete("/:id", authenticate, authorizeRoles("admin"), deleteAppointment);

export default router;
