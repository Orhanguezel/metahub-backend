// @/modules/bookingslot/index.ts

import express from "express";
import adminRoutes from "./admin.routes";
import publicRoutes from "./public.routes";
import {
  BookingSlotRule,
  BookingSlotOverride,
} from "./bookingslot.models";
import * as controller from "./bookingslot.controller";

const router = express.Router();

// 🔐 Admin Routes (Slot Rules & Overrides)
router.use("/admin", adminRoutes);

// 🌍 Public Routes (Slot Availability)
router.use("/", publicRoutes);

export {
  BookingSlotRule,
  BookingSlotOverride,
  controller,
};

export default router;
