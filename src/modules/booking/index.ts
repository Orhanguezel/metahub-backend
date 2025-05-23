// @/modules/booking/index.ts
import express from "express";
import  {Booking } from "./booking.models";
import * as adminController from "./admin.controller";
import * as publicController from "./public.controller";
import * as validation from "./booking.validation";
import adminRoutes from "./admin.routes";
import publicRoutes from "./public.routes";

// 📦 Express Router
const router = express.Router();

// 🔐 Admin Routes
router.use("/admin", adminRoutes);

// 🌍 Public Routes
router.use("/", publicRoutes);

// ✅ Named Exports
export { Booking, adminController, publicController, validation };
export { adminRoutes, publicRoutes };

// 🌐 Default Exports
export default router;
