import express from "express";
import routes from "./cart.routes";
import adminRoutes from "./admin.cart.routes";
import { Cart } from "./cart.models";
import * as cartController from "./cart.controller";
import * as adminCartController from "./admin.cart.controller";
import * as cartValidation from "./cart.validation";

const router = express.Router();


router.use("/admin", adminRoutes);
router.use("/", routes);


// ✅ Guard + Model Type (This module has been updated and is now standardized)
export {
  Cart,
  cartController,
  adminCartController,
  cartValidation,
};

export * from "./cart.validation";
export * from "./cart.models";
export * from "./cart.controller";
export * from "./admin.cart.controller";

export default router;
