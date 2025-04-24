// src/modules/invoice/index.ts
import express from "express";
import routes from "./cart.routes";

const router = express.Router();
router.use("/", routes);

export * from "./cart.controller";
export { default as Cart, ICart} from "./cart.models";
export default router;
