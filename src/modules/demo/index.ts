import express from "express";
import routes from "./demo.routes";

import { Demo, IDemo } from "./demo.models";
import * as demoController from "./demo.controller";

const router = express.Router();
router.use("/", routes);

export {
  Demo,
  IDemo,
  demoController,
};

export * from "./demo.validation";
export default router;
