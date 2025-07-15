import express from "express";
import adminRoutes from "./admin.routes";
import publicRoutes from "./public.routes";
import { BookingSlotRule, BookingSlotOverride } from "./bookingslot.models";
import * as controller from "./admin.bookingslot.controller";

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/", publicRoutes);

export { BookingSlotRule, BookingSlotOverride, controller };

export default router;
