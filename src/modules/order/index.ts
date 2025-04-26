import express from "express";
import publicRoutes from "./order.routes";
import adminRoutes from "./admin.order.routes";
import Order  from "./order.models";
import * as orderController from "./order.controller";
import * as adminOrderController from "./admin.order.controller";

const router = express.Router();

router.use("/", publicRoutes);

router.use("/admin", adminRoutes);

export { Order, orderController, adminOrderController };
export default router;
