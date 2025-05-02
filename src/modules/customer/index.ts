import express from "express";
import routes from "./customer.routes";
import { Customer } from "./customer.models";

const router = express.Router();
router.use("/", routes);

// ✅ Guard + Export (This module has been updated and is now standardized)
export { Customer };
export * from "./customer.controller";
export * from "./customer.validation";

export default router;
