import express from "express";
import routes from "./demo.routes";
import { Demo, IDemo } from "./demo.models";

const router = express.Router();
router.use("/", routes);

export * from "./demo.controller";
export * from "./demo.validation";
export { Demo, IDemo };

export default router;
