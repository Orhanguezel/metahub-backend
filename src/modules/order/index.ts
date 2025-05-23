import express from "express";
import publicRoutes from "./order.routes";
import adminRoutes from "./admin.order.routes";
import  {Order} from "./order.models";
import * as orderController from "./order.controller";
import * as adminOrderController from "./admin.order.controller";
import * as orderValidation from "./order.validation";

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/", publicRoutes);


export { Order, orderController, adminOrderController, orderValidation };
export default router;
