import express from "express";
import publicRoutes from "./public.routes";
import adminRoutes from "./admin.routes";
import { sellerProductRoutes } from "./seller/seller.routes";

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/seller", sellerProductRoutes);
router.use("/", publicRoutes);

export default router;
