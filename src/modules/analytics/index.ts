import express from "express";
import analyticsRoutes from "./analytics.routes";
import { Analytics } from "./analytics.models";
import * as analyticsController from "./analytics.controller";
import * as validation from "./analytics.validation";

const router = express.Router();


router.use("/", analyticsRoutes);


export {
  Analytics,
  analyticsController,
  validation,
};

export default router;
